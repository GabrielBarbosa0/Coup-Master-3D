import {
  get,
  off,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { database } from './firebase-config.js';
import {
  generateRoomCode,
  normalizeRoomCode
} from './room-service.js';
import {
  advanceRankedRoomBotState,
  advanceRankedRoomState,
  challengeRankedRoomActionState,
  challengeRankedRoomBlockState,
  completeRankedRoomExamineState,
  completeRankedRoomExchangeState,
  createRankedRoomRecord,
  declareRankedRoomBlockState,
  joinRankedRoomState,
  leaveRankedRoomState,
  loseRankedRoomInfluenceState,
  passRankedRoomResponseState,
  performRankedRoomActionState,
  revealRankedRoomChallengeState,
  RANKED_3D_ROOM_MODE,
  RANKED_3D_STATE_KEY,
  setRankedRoomPlayerConnected,
  toggleRankedRoomReadyState
} from '../gamemode/ranked-3d/ranked-3d-room-state.js';
import {
  buildRanked3dResultRecord,
  normalizeRanked3dStats
} from '../gamemode/ranked-3d/ranked-3d-results.js';

const ROOM_CODE_LENGTH = 4;

// Cria uma sala ranqueada nova e inicializa o motor ranqueado no Firebase.
export async function createRankedRoom(user, options = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = generateRoomCode();
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) continue;

    const roomRecord = createRankedRoomRecord(roomCode, user, {
      now: Date.now(),
      matchmaking: options.matchmaking
    });

    await set(roomRef, {
      ...roomRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return roomCode;
  }

  throw new Error('Nao foi possivel gerar um codigo de sala ranqueada livre.');
}

// Entra em uma sala ranqueada existente e registra o jogador no motor.
export async function joinRankedRoom(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  await transactRankedState(code, user, (state, now) => joinRankedRoomState(state, user, now));
  return code;
}

// Atualiza a presenca do jogador ranqueado ao abrir a sala.
export async function markRankedPlayerConnected(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    setRankedRoomPlayerConnected(state, user, true, now)
  ));
}

// Marca o jogador como desconectado ou remove da espera quando a partida ainda nao comecou.
export async function leaveRankedRoom(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    leaveRankedRoomState(state, user, now)
  ));
}

// Alterna prontidao do jogador na sala ranqueada.
export async function toggleRankedReady(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    toggleRankedRoomReadyState(state, user, now)
  ));
}

// Avanca matchmaking e deadlines automaticos do motor ranqueado.
export async function advanceRankedRoom(roomCode, user = null) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => advanceRankedRoomState(state, now));
}

// Executa a proxima decisao de IA pendente no motor ranqueado.
export async function advanceRankedBotDecision(roomCode, user = null) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => advanceRankedRoomBotState(state, now));
}

// Executa uma acao de turno na partida ranqueada.
export async function performRankedAction(roomCode, user, actionType, targetUid = null) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    performRankedRoomActionState(state, user, actionType, targetUid, now)
  ));
}

// Passa a janela de resposta atual.
export async function passRankedResponse(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    passRankedRoomResponseState(state, user, now)
  ));
}

// Contesta a acao pendente.
export async function challengeRankedAction(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    challengeRankedRoomActionState(state, user, now)
  ));
}

// Declara um bloqueio contra a acao pendente.
export async function declareRankedBlock(roomCode, user, blockRole) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    declareRankedRoomBlockState(state, user, blockRole, now)
  ));
}

// Contesta o bloqueio pendente.
export async function challengeRankedBlock(roomCode, user) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    challengeRankedRoomBlockState(state, user, now)
  ));
}

// Revela uma influencia para resolver desafio.
export async function revealRankedChallenge(roomCode, user, cardId) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    revealRankedRoomChallengeState(state, user, cardId, now)
  ));
}

// Escolhe a influencia perdida pelo jogador.
export async function loseRankedInfluence(roomCode, user, cardId) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    loseRankedRoomInfluenceState(state, user, cardId, now)
  ));
}

// Conclui uma troca escolhendo as cartas mantidas.
export async function completeRankedExchange(roomCode, user, keptCardIds) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    completeRankedRoomExchangeState(state, user, keptCardIds, now)
  ));
}

// Conclui uma investigacao do Inquisidor.
export async function completeRankedExamine(roomCode, user, shouldSwap) {
  const code = await assertRankedRoom(roomCode);
  return transactRankedState(code, user, (state, now) => (
    completeRankedRoomExamineState(state, user, shouldSwap, now)
  ));
}

// Persiste o resultado final e acumula as estatisticas ranqueadas do jogador autenticado.
export async function persistRankedMatchResult(roomCode, user, stateSnapshot = null) {
  const code = await assertRankedRoom(roomCode);
  const state = stateSnapshot || await getRankedRoomState(code);
  const now = Date.now();
  const resultRecord = buildRanked3dResultRecord(code, state, user?.uid || null, now);
  if (!resultRecord) {
    return { changed: false, result: null, stats: null };
  }

  let resultCreated = false;
  const resultTransaction = await runTransaction(
    ref(database, `rankedResults/${resultRecord.resultKey}`),
    (current) => {
      if (current) {
        resultCreated = false;
        return current;
      }
      resultCreated = true;
      return resultRecord;
    }
  );
  const savedResult = resultTransaction.snapshot.val() || resultRecord;
  const playerResult = user?.uid ? savedResult.players?.[user.uid] : null;
  let stats = null;

  if (playerResult) {
    const statsTransaction = await runTransaction(
      ref(database, `rankedStats/${user.uid}`),
      (current) => normalizeRanked3dStats(current, playerResult, savedResult, now)
    );
    stats = statsTransaction.snapshot.val();
    await update(ref(database, `rankedResults/${savedResult.resultKey}/players/${user.uid}`), {
      achievementUnlocks: stats.latestUnlockedAchievements || {},
      achievementUnlockKeys: stats.latestUnlockedAchievementKeys || [],
      achievementUnlockCount: (stats.latestUnlockedAchievementKeys || []).length,
      totalUnlockedAchievements: Object.keys(stats.unlockedAchievements || {}).length,
      rankScoreAfter: stats.rankScore || 0,
      statsUpdatedAt: serverTimestamp()
    });
  }

  await update(ref(database, `rooms/${code}`), {
    rankedResultKey: savedResult.resultKey,
    rankedResultPersistedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    changed: resultCreated,
    result: savedResult,
    stats
  };
}

// Le o snapshot atual do motor ranqueado.
export async function getRankedRoomState(roomCode) {
  const code = normalizeRoomCode(roomCode);
  const snapshot = await get(ref(database, `rooms/${code}/${RANKED_3D_STATE_KEY}`));
  return snapshot.val();
}

// Escuta alteracoes do estado ranqueado da sala.
export function subscribeRankedRoomState(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const stateRef = ref(database, `rooms/${code}/${RANKED_3D_STATE_KEY}`);

  onValue(stateRef, (snapshot) => {
    callback(snapshot.val());
  });

  return () => off(stateRef);
}

// Escuta estatisticas ranqueadas para uma lista de jogadores visiveis na mesa.
export function subscribeRankedStatsForPlayers(uids = [], callback) {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  const statsByUid = {};
  const unsubscribers = uniqueUids.map((uid) => {
    const statsRef = ref(database, `rankedStats/${uid}`);
    onValue(statsRef, (snapshot) => {
      statsByUid[uid] = snapshot.val() || null;
      callback({ ...statsByUid });
    });
    return () => off(statsRef);
  });

  callback(statsByUid);
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

// Garante que o codigo aponta para uma sala ranqueada valida.
async function assertRankedRoom(roomCode) {
  const code = normalizeRoomCode(roomCode);
  if (code.length !== ROOM_CODE_LENGTH) {
    throw new Error('Codigo de sala ranqueada invalido.');
  }

  const roomSnapshot = await get(ref(database, `rooms/${code}`));
  if (!roomSnapshot.exists()) {
    throw new Error('Sala ranqueada nao encontrada.');
  }

  if (roomSnapshot.val()?.mode !== RANKED_3D_ROOM_MODE) {
    throw new Error('Esta sala nao e ranqueada.');
  }

  return code;
}

// Persiste alteracoes do motor por transacao para proteger contra acoes concorrentes.
async function transactRankedState(roomCode, user, operation) {
  const stateRef = ref(database, `rooms/${roomCode}/${RANKED_3D_STATE_KEY}`);
  let transactionError = null;
  let changed = true;

  const result = await runTransaction(stateRef, (currentState) => {
    try {
      const now = Date.now();
      const next = operation(currentState, now);
      changed = next.changed;
      return {
        ...next.state,
        serverUpdatedAt: serverTimestamp(),
        updatedBy: user?.uid || 'system'
      };
    } catch (error) {
      transactionError = error;
      return;
    }
  });

  if (transactionError) throw transactionError;
  if (!result.committed) {
    throw new Error('Nao foi possivel atualizar o estado ranqueado.');
  }

  await update(ref(database, `rooms/${roomCode}`), {
    status: result.snapshot.val()?.status || 'ranked-lobby',
    updatedAt: serverTimestamp()
  });

  return {
    changed,
    state: result.snapshot.val()
  };
}
