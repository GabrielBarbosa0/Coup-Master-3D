import { requireAuth } from '../firebase/auth-service.js';
import {
  clearSpectatorRequest,
  getRoomInfo,
  getRoomTableState,
  leaveRoom,
  markPlayerConnected,
  normalizeRoomCode,
  refreshPlayerPresence,
  respondSpectatorRequest,
  roomExists,
  sendRoomTableAction,
  sendSpectatorRequest,
  subscribeSpectatorRequests,
  subscribeRoomTableActions,
  subscribeRoomPlayers,
  subscribeRoomTableState,
  writeRoomTableState
} from '../firebase/room-service.js';

const params = new URLSearchParams(location.search);
const requestedRoom = normalizeRoomCode(params.get('room') || localStorage.getItem('coupMaster3dRoom') || '');
const user = await requireAuth('login.html');

if (!user) {
  throw new Error('Login obrigatorio para abrir a mesa.');
}

if (!requestedRoom || !(await roomExists(requestedRoom))) {
  location.replace('lobby.html');
  throw new Error('Sala obrigatoria para abrir a mesa.');
}

const roomInfo = await getRoomInfo(requestedRoom);
const isAdmin = roomInfo?.adminUid === user.uid;
localStorage.setItem('coupMaster3dRoom', requestedRoom);
const playerSeat = await markPlayerConnected(requestedRoom, user);
window.CoupMaster3DOnline = {
  roomCode: requestedRoom,
  adminUid: roomInfo?.adminUid || null,
  isAdmin,
  playerSeat,
  user,
  requestSpectate: (targetPlayer) => sendSpectatorRequest(requestedRoom, user, targetPlayer),
  respondSpectateRequest: (requestId, status) => respondSpectatorRequest(requestedRoom, requestId, status)
};
const presenceTimer = window.setInterval(() => {
  refreshPlayerPresence(requestedRoom, user).catch((error) => {
    console.error('Falha ao atualizar presenca.', error);
  });
}, 20_000);

const leaveRoomBtn = document.getElementById('leaveRoomBtn3d');
leaveRoomBtn?.addEventListener('click', async () => {
  leaveRoomBtn.disabled = true;
  window.clearInterval(presenceTimer);
  await leaveRoom(requestedRoom, user);
  localStorage.removeItem('coupMaster3dRoom');
  location.assign('lobby.html');
});

await import('./app.js');
window.CoupMaster3D?.setAdminRole?.(isAdmin);

let syncReady = false;
window.CoupMaster3DOnline.publishTableState = (tableState) => {
  if (!syncReady) return;
  writeRoomTableState(requestedRoom, user, tableState).catch((error) => {
    console.error('Falha ao sincronizar mesa.', error);
  });
};
window.CoupMaster3DOnline.publishTableAction = (action) => {
  if (!syncReady) return null;
  return sendRoomTableAction(requestedRoom, user, action).catch((error) => {
    console.error('Falha ao sincronizar acao de mesa.', error);
    return null;
  });
};

const initialTableState = await getRoomTableState(requestedRoom);
if (initialTableState) {
  window.CoupMaster3D?.applyTableState?.(initialTableState);
} else {
  await writeRoomTableState(requestedRoom, user, window.CoupMaster3D?.getTableState?.());
}
syncReady = true;

// Aplica estados finais publicados por outros jogadores.
subscribeRoomTableState(requestedRoom, (tableState) => {
  if (!tableState || tableState.updatedBy === user.uid) return;
  window.CoupMaster3D?.applyTableState?.(tableState);
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
  const localPlayer = seatedPlayers.find((player) => player.uid === user.uid);

  if (localPlayer?.seat && localPlayer.seat !== window.CoupMaster3DOnline.playerSeat) {
    window.CoupMaster3DOnline.playerSeat = localPlayer.seat;
    window.CoupMaster3D?.setLocalPlayerSeat?.(localPlayer.seat);
  }

  window.CoupMaster3D?.setOnlinePlayerProfiles?.(
    seatedPlayers.slice(0, 8).map((player, index) => ({
      seat: player.seat || index + 1,
      uid: player.uid,
      displayName: player.displayName,
      photoURL: player.photoURL,
      connected: Boolean(player.connected)
    }))
  );
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
