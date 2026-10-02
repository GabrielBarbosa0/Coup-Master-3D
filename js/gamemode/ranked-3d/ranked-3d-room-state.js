import {
  advanceExpired,
  advanceMatchmaking,
  challengeAction,
  challengeBlock,
  completeExamine,
  completeExchange,
  createState,
  declareBlock,
  joinPlayer,
  leaveWaitingRoom,
  loseInfluence,
  normalizeState,
  passResponse,
  performAction,
  revealChallenge,
  setConnected,
  toggleReady
} from './ranked-3d-engine.js';
import { applyNextRanked3dBotDecision } from './ranked-3d-bot-intelligence.js';

export const RANKED_3D_ROOM_MODE = 'ranked';
export const RANKED_3D_STATE_KEY = 'ranked3dState';

// Converte a conta autenticada para o formato esperado pelo motor ranqueado.
export function createRankedPlayerProfile(user) {
  if (!user?.uid) throw new Error('Usuario invalido.');
  return {
    uid: user.uid,
    name: user.displayName || (user.isAnonymous ? 'Visitante' : 'Jogador'),
    photo: user.photoURL || ''
  };
}

// Cria o snapshot inicial de uma sala ranqueada com o criador ja registrado.
export function createRankedRoomRecord(roomCode, user, options = {}) {
  const now = options.now || Date.now();
  const rankedState = createState(now);
  if (options.matchmaking?.enabled) {
    rankedState.matchmaking = {
      enabled: true,
      targetPlayers: options.matchmaking.targetPlayers || null,
      startedAt: now,
      nextBotAt: null,
      nextReadyAt: null,
      botReadyAt: {},
      filledAt: null
    };
  }

  joinPlayer(rankedState, createRankedPlayerProfile(user), now);

  return {
    code: roomCode,
    mode: RANKED_3D_ROOM_MODE,
    adminUid: user.uid,
    createdBy: user.uid,
    status: 'ranked-lobby',
    ranked3dState: rankedState
  };
}

// Normaliza um estado vindo do Firebase ou cria um novo estado quando a sala ainda nao tem partida.
export function ensureRankedRoomState(currentState, now = Date.now()) {
  const state = currentState && typeof currentState === 'object'
    ? structuredClone(currentState)
    : createState(now);
  normalizeState(state);
  return state;
}

// Aplica uma mutacao do motor e devolve um snapshot pronto para persistencia.
export function applyRankedRoomOperation(currentState, operation, now = Date.now()) {
  const state = ensureRankedRoomState(currentState, now);
  const changed = operation(state, now);
  normalizeState(state);
  state.updatedAt = state.updatedAt || now;
  return {
    state,
    changed: changed !== false
  };
}

// Registra ou reconecta o jogador no estado ranqueado da sala.
export function joinRankedRoomState(currentState, user, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    joinPlayer(state, createRankedPlayerProfile(user), now);
  }, now);
}

// Marca presenca do jogador sem alterar sua prontidao.
export function setRankedRoomPlayerConnected(currentState, user, connected, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    setConnected(state, user.uid, connected, now);
  }, now);
}

// Remove o jogador da espera ranqueada quando a partida ainda nao comecou.
export function leaveRankedRoomState(currentState, user, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    leaveWaitingRoom(state, user.uid, now);
  }, now);
}

// Alterna prontidao do jogador e atualiza a contagem regressiva do motor.
export function toggleRankedRoomReadyState(currentState, user, now = Date.now(), random = Math.random) {
  return applyRankedRoomOperation(currentState, (state) => {
    toggleReady(state, user.uid, now, random);
  }, now);
}

// Avanca matchmaking, deadlines e transicoes automaticas do motor ranqueado.
export function advanceRankedRoomState(currentState, now = Date.now(), random = Math.random) {
  return applyRankedRoomOperation(currentState, (state) => {
    const matchmakingChanged = state.matchmaking?.enabled
      ? advanceMatchmaking(state, now, random)
      : false;
    const deadlineChanged = advanceExpired(state, now, random);
    return matchmakingChanged || deadlineChanged;
  }, now);
}

// Executa uma acao de turno no estado ranqueado.
export function performRankedRoomActionState(currentState, user, actionType, targetUid = null, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    performAction(state, user.uid, actionType, targetUid, now);
  }, now);
}

// Registra uma resposta de passar durante uma janela de reacao.
export function passRankedRoomResponseState(currentState, user, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    passResponse(state, user.uid, now);
  }, now);
}

// Registra uma contestacao contra a acao pendente.
export function challengeRankedRoomActionState(currentState, user, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    challengeAction(state, user.uid, now);
  }, now);
}

// Declara um bloqueio usando uma influencia possivel.
export function declareRankedRoomBlockState(currentState, user, blockRole, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    declareBlock(state, user.uid, blockRole, now);
  }, now);
}

// Contesta o bloqueio pendente.
export function challengeRankedRoomBlockState(currentState, user, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    challengeBlock(state, user.uid, now);
  }, now);
}

// Revela uma carta para resolver uma contestacao.
export function revealRankedRoomChallengeState(currentState, user, cardId, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    revealChallenge(state, user.uid, cardId, now);
  }, now);
}

// Escolhe a influencia perdida em uma penalidade ou golpe.
export function loseRankedRoomInfluenceState(currentState, user, cardId, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    loseInfluence(state, user.uid, cardId, now);
  }, now);
}

// Conclui troca de cartas com os IDs mantidos pelo jogador.
export function completeRankedRoomExchangeState(currentState, user, keptCardIds, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    completeExchange(state, user.uid, keptCardIds, now);
  }, now);
}

// Conclui a investigacao do Inquisidor.
export function completeRankedRoomExamineState(currentState, user, shouldSwap, now = Date.now()) {
  return applyRankedRoomOperation(currentState, (state) => {
    completeExamine(state, user.uid, shouldSwap, now);
  }, now);
}

// Executa a proxima decisao pendente de IA usando a mesma estrategia do Coup Master original.
export function advanceRankedRoomBotState(currentState, now = Date.now(), random = Math.random) {
  return applyRankedRoomOperation(currentState, (state) => (
    applyNextRanked3dBotDecision(state, now, random)
  ), now);
}
