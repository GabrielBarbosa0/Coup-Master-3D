export const GAME_MODE_IDS = Object.freeze({
  CASUAL_3D: 'casual',
  RANKED_3D: 'ranked',
  PERSONALIZED_3D: 'personalized',
  TRAINING_3D: 'training'
});

export const GAME_MODES = Object.freeze({
  [GAME_MODE_IDS.CASUAL_3D]: Object.freeze({
    id: GAME_MODE_IDS.CASUAL_3D,
    status: 'enabled',
    requiresGoogleAccount: false,
    maxPlayers: 8,
    route: 'index.html',
    stateKey: 'tableState',
    docs: 'docs/modos-de-jogo/modo-casual-3d.md'
  }),
  [GAME_MODE_IDS.RANKED_3D]: Object.freeze({
    id: GAME_MODE_IDS.RANKED_3D,
    status: 'enabled',
    requiresGoogleAccount: false,
    maxPlayers: 6,
    route: 'ranked-waiting.html',
    stateKey: 'ranked3dState',
    docs: 'docs/modos-de-jogo/modo-ranqueado-3d.md'
  }),
  [GAME_MODE_IDS.PERSONALIZED_3D]: Object.freeze({
    id: GAME_MODE_IDS.PERSONALIZED_3D,
    status: 'planned',
    requiresGoogleAccount: true,
    maxPlayers: 6,
    route: null,
    stateKey: 'personalized3dState',
    docs: 'docs/modos-de-jogo/modo-personalizado-3d.md'
  }),
  [GAME_MODE_IDS.TRAINING_3D]: Object.freeze({
    id: GAME_MODE_IDS.TRAINING_3D,
    status: 'planned',
    requiresGoogleAccount: false,
    maxPlayers: 1,
    route: null,
    stateKey: 'training3dState',
    docs: 'docs/modos-de-jogo/modo-treinamento-3d.md'
  })
});

export const DEFAULT_GAME_MODE = GAME_MODE_IDS.CASUAL_3D;

// Normaliza ids recebidos do lobby ou do banco sem quebrar salas antigas.
export function normalizeGameMode(mode) {
  const value = String(mode || '').toLowerCase();
  return GAME_MODES[value]?.id || DEFAULT_GAME_MODE;
}

// Resolve o modo salvo na sala, tratando salas antigas como casual 3D.
export function getRoomGameMode(roomData) {
  return normalizeGameMode(roomData?.mode || roomData?.gameMode || roomData?.tableState?.mode);
}

// Indica se o modo ja pode ser criado pelo lobby atual.
export function canCreateGameMode(mode, user = null) {
  const config = GAME_MODES[normalizeGameMode(mode)];
  if (!config || config.status !== 'enabled') return false;
  if (config.requiresGoogleAccount && (!user || user.isAnonymous)) return false;
  return true;
}

export function isAutomatedGameMode(mode) {
  const normalized = normalizeGameMode(mode);
  return normalized === GAME_MODE_IDS.RANKED_3D || normalized === GAME_MODE_IDS.PERSONALIZED_3D;
}

export function isSandboxGameMode(mode) {
  return normalizeGameMode(mode) === GAME_MODE_IDS.CASUAL_3D;
}

export function getGameModeConfig(mode) {
  return GAME_MODES[normalizeGameMode(mode)];
}
