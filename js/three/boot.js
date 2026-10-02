import { requireAuth } from '../firebase/auth-service.js';
import {
  ROOM_LAUNCH_STORAGE_KEY,
  getLobbyUrlForRoom,
  isValidRoomLaunchToken
} from '../navigation/entry-routing.js';
import { preloadThreeAssets } from './asset-preloader.js';
import {
  clearSpectatorRequest,
  drawRoomCard,
  getRoomInfo,
  getRoomTableState,
  leaveRoom,
  markPlayerConnected,
  normalizeRoomCode,
  removeRoomPlayer,
  refreshPlayerPresence,
  respondSpectatorRequest,
  roomExists,
  sendRoomTableAction,
  sendSpectatorRequest,
  subscribeSpectatorRequests,
  sendRoomChatMessage,
  subscribeRoomChatMessages,
  subscribeRoomTableActions,
  subscribeRoomPlayers,
  subscribeRoomTableState,
  writeRoomTableState
} from '../firebase/room-service.js';
import {
  advanceRankedBotDecision,
  advanceRankedRoom,
  challengeRankedAction,
  challengeRankedBlock,
  completeRankedExamine,
  completeRankedExchange,
  declareRankedBlock,
  getRankedRoomState,
  leaveRankedRoom,
  loseRankedInfluence,
  markRankedPlayerConnected,
  passRankedResponse,
  persistRankedMatchResult,
  performRankedAction,
  revealRankedChallenge,
  subscribeRankedStatsForPlayers,
  subscribeRankedRoomState
} from '../firebase/ranked-room-service.js';
import { GAME_MODE_IDS, getRoomGameMode } from '../gamemode/game-modes.js';
import { PHASES, SETTINGS } from '../gamemode/ranked-3d/ranked-3d-actions.js';
import { createRanked3dActionPanel } from '../gamemode/ranked-3d/ranked-3d-action-panel.js';
import { createRanked3dHud } from '../gamemode/ranked-3d/ranked-3d-hud.js';
import {
  getRanked3dBotDecisionDelay,
  hasPendingRanked3dBotDecision
} from '../gamemode/ranked-3d/ranked-3d-bot-intelligence.js';
import { getRanked3dPlayers } from '../gamemode/ranked-3d/ranked-3d-engine.js';
import { createRanked3dTableState } from '../gamemode/ranked-3d/ranked-3d-table-adapter.js';

const params = new URLSearchParams(location.search);
const requestedRoom = normalizeRoomCode(params.get('room') || '');
const launchToken = sessionStorage.getItem(ROOM_LAUNCH_STORAGE_KEY);
sessionStorage.removeItem(ROOM_LAUNCH_STORAGE_KEY);
const canOpenRequestedRoom = isValidRoomLaunchToken(launchToken, requestedRoom);
const lobbyRedirectUrl = getLobbyUrlForRoom(requestedRoom);
const user = await requireAuth('login.html', lobbyRedirectUrl);

// Mostra a mesa apenas depois que autenticacao, sala e estado inicial estiverem prontos.
function revealTable() {
  const loadingOverlay = document.getElementById('bootLoadingOverlay');
  document.body.classList.remove('is-booting');
  document.body.classList.add('is-ready');

  if (!loadingOverlay) return;
  loadingOverlay.classList.add('hidden');
  window.setTimeout(() => {
    if (loadingOverlay.classList.contains('hidden')) {
      loadingOverlay.style.display = 'none';
    }
  }, 520);
}

if (!user) {
  throw new Error('Login obrigatorio para abrir a mesa.');
}

if (!canOpenRequestedRoom) {
  location.replace(lobbyRedirectUrl);
  throw new Error('A mesa deve ser aberta pelo lobby.');
}

if (!requestedRoom || !(await roomExists(requestedRoom))) {
  location.replace('lobby.html');
  throw new Error('Sala obrigatoria para abrir a mesa.');
}

const assetPreloadPromise = preloadThreeAssets({
  messageElement: '#bootLoadingMessage'
});

const roomInfo = await getRoomInfo(requestedRoom);
const roomMode = getRoomGameMode(roomInfo);
const isRankedRoom = roomMode === GAME_MODE_IDS.RANKED_3D;
const isAdmin = !isRankedRoom && roomInfo?.adminUid === user.uid;
let rankedState = null;
let playerSeat = 1;
let rankedBotDecisionTimer = null;
let rankedBotDecisionPending = false;
let rankedDeadlineTimer = null;
let rankedDeadlinePending = false;
let rankedResultPersistPending = false;
let lastPersistedRankedResultKey = null;
let rankedStatsByUid = {};
let rankedStatsSubscription = null;
let rankedStatsSubscriptionKey = '';
let casualRoomPlayers = [];

localStorage.setItem('coupMaster3dRoom', requestedRoom);

if (isRankedRoom) {
  const presence = await markRankedPlayerConnected(requestedRoom, user);
  rankedState = presence?.state || await getRankedRoomState(requestedRoom);
  playerSeat = rankedState?.players?.[user.uid]?.seat || 1;
} else {
  playerSeat = await markPlayerConnected(requestedRoom, user);
}

window.CoupMaster3DOnline = {
  mode: roomMode,
  roomCode: requestedRoom,
  adminUid: roomInfo?.adminUid || null,
  isAdmin,
  playerSeat,
  user,
  rankedActions: isRankedRoom ? createRankedActionBridge() : null,
  removePlayerFromRoom: isRankedRoom
    ? () => Promise.resolve(false)
    : (targetPlayer) => removeRoomPlayer(requestedRoom, user, targetPlayer),
  requestSpectate: isRankedRoom
    ? () => Promise.resolve(null)
    : (targetPlayer) => sendSpectatorRequest(requestedRoom, user, targetPlayer),
  respondSpectateRequest: isRankedRoom
    ? () => Promise.resolve(null)
    : (requestId, status) => respondSpectatorRequest(requestedRoom, requestId, status),
  sendChatMessage: isRankedRoom
    ? () => Promise.resolve(null)
    : (message) => sendRoomChatMessage(requestedRoom, user, {
      ...message,
      actorSeat: window.CoupMaster3DOnline?.playerSeat || playerSeat
    })
};

const presenceTimer = window.setInterval(() => {
  const task = isRankedRoom
    ? markRankedPlayerConnected(requestedRoom, user)
    : refreshPlayerPresence(requestedRoom, user);
  task.catch((error) => {
    console.error('Falha ao atualizar presenca.', error);
  });
}, 20_000);

const leaveRoomBtn = document.getElementById('leaveRoomBtn3d');
leaveRoomBtn?.addEventListener('click', async () => {
  leaveRoomBtn.disabled = true;
  window.clearInterval(presenceTimer);
  window.clearTimeout(rankedBotDecisionTimer);
  window.clearTimeout(rankedDeadlineTimer);
  rankedStatsSubscription?.();
  rankedHud?.destroy?.();
  if (isRankedRoom) {
    await leaveRankedRoom(requestedRoom, user);
  } else {
    await leaveRoom(requestedRoom, user);
  }
  localStorage.removeItem('coupMaster3dRoom');
  location.assign('lobby.html');
});

await import('./app.js');
window.CoupMaster3D?.setAdminRole?.(isAdmin);
window.CoupMaster3D?.setLocalPlayerSeat?.(playerSeat);
const rankedActionPanel = isRankedRoom
  ? createRanked3dActionPanel({
    getActions: () => window.CoupMaster3DOnline?.rankedActions,
    getLocalUid: () => user.uid
  })
  : null;
const rankedHud = isRankedRoom
  ? createRanked3dHud({
    getLocalUid: () => user.uid,
    getRoomCode: () => requestedRoom
  })
  : null;

let syncReady = false;
window.CoupMaster3DOnline.publishTableState = (tableState, baseTableState = null) => {
  if (isRankedRoom) return Promise.resolve(null);
  if (!syncReady) return Promise.resolve(null);
  return writeRoomTableState(requestedRoom, user, tableState, baseTableState).catch((error) => {
    console.error('Falha ao sincronizar mesa.', error);
    throw error;
  });
};
window.CoupMaster3DOnline.publishTableAction = (action) => {
  if (isRankedRoom) return null;
  if (!syncReady) return null;
  return sendRoomTableAction(requestedRoom, user, action).catch((error) => {
    console.error('Falha ao sincronizar acao de mesa.', error);
    return null;
  });
};
window.CoupMaster3DOnline.drawCard = (playerId, drawActionId) => {
  if (isRankedRoom) return Promise.resolve(null);
  if (!syncReady) return Promise.resolve(null);
  return drawRoomCard(requestedRoom, user, playerId, drawActionId).catch((error) => {
    console.error('Falha ao reservar carta do deck.', error);
    throw error;
  });
};

if (isRankedRoom) {
  applyRankedStateToTable(rankedState);
  scheduleRankedAutomation(rankedState);
  persistFinishedRankedResult(rankedState);
  await assetPreloadPromise;
  revealTable();

  subscribeRankedRoomState(requestedRoom, (nextRankedState) => {
    rankedState = nextRankedState;
    applyRankedStateToTable(rankedState);
    scheduleRankedAutomation(rankedState);
    persistFinishedRankedResult(rankedState);
  });
} else {
  const initialTableState = await getRoomTableState(requestedRoom);
  if (initialTableState) {
    window.CoupMaster3D?.applyTableState?.(initialTableState);
  } else {
    const createdTableState = await writeRoomTableState(
      requestedRoom,
      user,
      window.CoupMaster3D?.getTableState?.()
    );
    window.CoupMaster3D?.applyTableState?.(createdTableState);
  }
  await assetPreloadPromise;
  syncReady = true;
  revealTable();

  // Aplica estados finais publicados por outros jogadores.
  subscribeRoomTableState(requestedRoom, (tableState) => {
    if (!tableState || tableState.updatedBy === user.uid) return;
    window.CoupMaster3D?.receiveTableState?.(tableState);
  });

  const tableActionSubscriptionStartedAt = Date.now();
  const seenTableActionIds = new Set();
  let tableActionsInitialized = false;

  // Aplica acoes discretas para animar compras, distribuicoes e devolucoes.
  subscribeRoomTableActions(requestedRoom, (actions) => {
    actions.forEach((action) => {
      if (!action?.id || seenTableActionIds.has(action.id)) return;
      seenTableActionIds.add(action.id);
      if (!action || action.actorUid === user.uid) return;
      if (!tableActionsInitialized && (action.createdAt || 0) < tableActionSubscriptionStartedAt) return;
      window.CoupMaster3D?.applyTableAction?.(action);
    });
    tableActionsInitialized = true;
  });

  // Liga jogadores com slot reservado aos badges locais e mantem o assento da conta atual.
  subscribeRoomPlayers(requestedRoom, (players) => {
    const seatedPlayers = players
      .sort((a, b) => (a.seat || 99) - (b.seat || 99));
    casualRoomPlayers = seatedPlayers;
    subscribeVisibleRankedStats(seatedPlayers.map((player) => player.uid), () => {
      applyCasualPlayerProfiles(casualRoomPlayers);
    });
    const localPlayer = seatedPlayers.find((player) => player.uid === user.uid);

    if (!localPlayer) {
      window.clearInterval(presenceTimer);
      localStorage.removeItem('coupMaster3dRoom');
      location.assign('lobby.html');
      return;
    }

    if (localPlayer?.seat && localPlayer.seat !== window.CoupMaster3DOnline.playerSeat) {
      window.CoupMaster3DOnline.playerSeat = localPlayer.seat;
      window.CoupMaster3D?.setLocalPlayerSeat?.(localPlayer.seat);
    }

    applyCasualPlayerProfiles(seatedPlayers);
  });

  // Mantem o chat casual da sala em tempo real sem interferir no estado da mesa.
  subscribeRoomChatMessages(requestedRoom, (messages) => {
    window.CoupMaster3D?.setChatMessages?.(messages);
  });

  const shownSpectatorRequests = new Set();

  // Coordena pedidos de espectador entre solicitante e jogador alvo.
  subscribeSpectatorRequests(requestedRoom, user, (requests) => {
    requests.forEach((request) => {
      if (request.targetUid === user.uid && request.status === 'pending') {
        if (shownSpectatorRequests.has(request.id)) return;
        shownSpectatorRequests.add(request.id);
        window.CoupMaster3D?.showSpectatorRequest?.(request);
        return;
      }

      if (request.requesterUid !== user.uid || request.status === 'pending') return;
      if (request.status === 'accepted') {
        window.CoupMaster3D?.startSpectatingPlayer?.(request);
      }
      if (request.status === 'declined') {
        window.CoupMaster3D?.showSpectatorResponse?.('Pedido recusado.');
      }
      clearSpectatorRequest(requestedRoom, request.id).catch((error) => {
        console.error('Falha ao limpar pedido de espectador.', error);
      });
    });
  });
}

// Assina estatisticas ranqueadas dos jogadores visiveis e reaplica os perfis quando mudam.
function subscribeVisibleRankedStats(uids, onStatsChanged) {
  const key = [...new Set((uids || []).filter(Boolean))].sort().join('|');
  if (key === rankedStatsSubscriptionKey) return;

  rankedStatsSubscription?.();
  rankedStatsSubscription = null;
  rankedStatsSubscriptionKey = key;
  rankedStatsByUid = {};

  if (!key) {
    onStatsChanged?.();
    return;
  }

  rankedStatsSubscription = subscribeRankedStatsForPlayers(key.split('|'), (stats) => {
    rankedStatsByUid = stats || {};
    onStatsChanged?.();
    if (isRankedRoom) {
      rankedHud?.update(rankedState, { statsByUid: rankedStatsByUid });
    }
  });
}

// Atualiza perfis da sala casual com estatisticas ranqueadas globais.
function applyCasualPlayerProfiles(seatedPlayers = []) {
  window.CoupMaster3D?.setOnlinePlayerProfiles?.(
    seatedPlayers.slice(0, 8).map((player, index) => ({
      seat: player.seat || index + 1,
      uid: player.uid,
      displayName: player.displayName,
      photoURL: player.photoURL,
      connected: Boolean(player.connected),
      rankedStats: rankedStatsByUid[player.uid] || null
    }))
  );
}

// Atualiza perfis da partida ranqueada com estatisticas persistidas.
function applyRankedPlayerProfiles(nextRankedState) {
  if (!nextRankedState) return;
  const rankedPlayers = getRanked3dPlayers(nextRankedState);
  subscribeVisibleRankedStats(rankedPlayers.map((player) => player.uid), () => {
    applyRankedPlayerProfiles(rankedState);
  });
  window.CoupMaster3D?.setOnlinePlayerProfiles?.(rankedPlayers.slice(0, SETTINGS.maxPlayers).map((player) => ({
    seat: player.seat,
    uid: player.uid,
    displayName: player.name,
    photoURL: player.photo,
    connected: player.connected !== false,
    rankedStats: rankedStatsByUid[player.uid] || null
  })));
}

// Aplica o estado do motor ranqueado como representacao visual local na mesa.
function applyRankedStateToTable(nextRankedState) {
  if (!nextRankedState) return;
  const localPlayer = nextRankedState.players?.[user.uid];
  if (!localPlayer) {
    window.clearInterval(presenceTimer);
    localStorage.removeItem('coupMaster3dRoom');
    location.assign('lobby.html');
    return;
  }

  if (localPlayer.seat && localPlayer.seat !== window.CoupMaster3DOnline.playerSeat) {
    window.CoupMaster3DOnline.playerSeat = localPlayer.seat;
    window.CoupMaster3D?.setLocalPlayerSeat?.(localPlayer.seat);
  }

  applyRankedPlayerProfiles(nextRankedState);
  window.CoupMaster3D?.applyTableState?.(createRanked3dTableState(nextRankedState, {
    localUid: user.uid
  }));
  window.CoupMaster3D?.setOfficialLogEntries?.(nextRankedState.log || []);
  rankedHud?.update(nextRankedState, { statsByUid: rankedStatsByUid });
  rankedActionPanel?.update(nextRankedState);
}

// Mantem timers do motor ranqueado ativos enquanto a mesa 3D esta aberta.
function scheduleRankedAutomation(nextRankedState) {
  if (!isRankedRoom || !nextRankedState) return;
  scheduleRankedDeadlineAdvance(nextRankedState);
  scheduleRankedBotDecision(nextRankedState);
}

// Avanca fases temporizadas como distribuicao inicial, animacoes e janelas expiradas.
function scheduleRankedDeadlineAdvance(nextRankedState) {
  window.clearTimeout(rankedDeadlineTimer);
  const deadline = Number(nextRankedState.deadline || 0);
  if (!deadline) return;

  const delay = Math.max(120, deadline - Date.now() + 80);
  rankedDeadlineTimer = window.setTimeout(() => {
    if (rankedDeadlinePending) return;
    rankedDeadlinePending = true;
    advanceRankedRoom(requestedRoom, user)
      .catch((error) => {
        console.error('Falha ao avancar prazo ranqueado.', error);
      })
      .finally(() => {
        rankedDeadlinePending = false;
        if (rankedState?.deadline) scheduleRankedDeadlineAdvance(rankedState);
      });
  }, delay);
}

// Dispara a proxima decisao de IA pelo mesmo motor estrategico do Coup Master original.
function scheduleRankedBotDecision(nextRankedState) {
  if (!hasPendingRanked3dBotDecision(nextRankedState)) {
    window.clearTimeout(rankedBotDecisionTimer);
    return;
  }
  if (rankedBotDecisionPending) return;
  window.clearTimeout(rankedBotDecisionTimer);
  const delay = getRanked3dBotDecisionDelay(nextRankedState);
  rankedBotDecisionTimer = window.setTimeout(() => {
    if (rankedBotDecisionPending) return;
    rankedBotDecisionPending = true;
    advanceRankedBotDecision(requestedRoom, user)
      .catch((error) => {
        console.error('Falha ao executar decisao de IA ranqueada.', error);
      })
      .finally(() => {
        rankedBotDecisionPending = false;
        if (hasPendingRanked3dBotDecision(rankedState)) scheduleRankedBotDecision(rankedState);
      });
  }, delay);
}

// Grava rankedResults e rankedStats uma vez quando o motor sinaliza fim de partida.
function persistFinishedRankedResult(nextRankedState) {
  if (!isRankedRoom || rankedResultPersistPending) return;
  if (nextRankedState?.status !== PHASES.FINISHED || !nextRankedState.winnerUid) return;
  const resultKey = `${requestedRoom}_${nextRankedState.matchId || nextRankedState.finishedAt || 'finished'}`;
  if (lastPersistedRankedResultKey === resultKey) return;

  rankedResultPersistPending = true;
  persistRankedMatchResult(requestedRoom, user, nextRankedState)
    .then(() => {
      lastPersistedRankedResultKey = resultKey;
    })
    .catch((error) => {
      console.error('Falha ao persistir resultado ranqueado.', error);
    })
    .finally(() => {
      rankedResultPersistPending = false;
    });
}

// Disponibiliza acoes do motor ranqueado para a futura UI de turno na mesa.
function createRankedActionBridge() {
  return {
    performAction: (actionType, targetUid = null) => performRankedAction(requestedRoom, user, actionType, targetUid),
    passResponse: () => passRankedResponse(requestedRoom, user),
    challengeAction: () => challengeRankedAction(requestedRoom, user),
    declareBlock: (blockRole) => declareRankedBlock(requestedRoom, user, blockRole),
    challengeBlock: () => challengeRankedBlock(requestedRoom, user),
    revealChallenge: (cardId) => revealRankedChallenge(requestedRoom, user, cardId),
    loseInfluence: (cardId) => loseRankedInfluence(requestedRoom, user, cardId),
    completeExchange: (keptCardIds) => completeRankedExchange(requestedRoom, user, keptCardIds),
    completeExamine: (shouldSwap) => completeRankedExamine(requestedRoom, user, shouldSwap)
  };
}
