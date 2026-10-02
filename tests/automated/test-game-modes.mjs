import assert from 'node:assert/strict';
import {
  DEFAULT_GAME_MODE,
  GAME_MODE_IDS,
  canCreateGameMode,
  getGameModeConfig,
  getRoomGameMode,
  isAutomatedGameMode,
  isSandboxGameMode,
  normalizeGameMode
} from '../../js/gamemode/game-modes.js';

assert.equal(DEFAULT_GAME_MODE, GAME_MODE_IDS.CASUAL_3D);

assert.equal(normalizeGameMode('ranked'), GAME_MODE_IDS.RANKED_3D);
assert.equal(normalizeGameMode('RANKED'), GAME_MODE_IDS.RANKED_3D);
assert.equal(normalizeGameMode('unknown'), GAME_MODE_IDS.CASUAL_3D);
assert.equal(normalizeGameMode(null), GAME_MODE_IDS.CASUAL_3D);

assert.equal(getRoomGameMode({ mode: 'ranked' }), GAME_MODE_IDS.RANKED_3D);
assert.equal(getRoomGameMode({ gameMode: 'training' }), GAME_MODE_IDS.TRAINING_3D);
assert.equal(getRoomGameMode({ tableState: { mode: 'personalized' } }), GAME_MODE_IDS.PERSONALIZED_3D);
assert.equal(getRoomGameMode({}), GAME_MODE_IDS.CASUAL_3D);

assert.equal(canCreateGameMode('casual', null), true);
assert.equal(canCreateGameMode('ranked', null), true);
assert.equal(canCreateGameMode('ranked', { uid: 'u1', isAnonymous: false }), true);
assert.equal(canCreateGameMode('ranked', { uid: 'u1', isAnonymous: true }), true);
assert.equal(canCreateGameMode('training', { uid: 'u1', isAnonymous: false }), false);

assert.equal(isAutomatedGameMode('ranked'), true);
assert.equal(isAutomatedGameMode('personalized'), true);
assert.equal(isAutomatedGameMode('casual'), false);
assert.equal(isSandboxGameMode('casual'), true);
assert.equal(isSandboxGameMode('ranked'), false);

const rankedConfig = getGameModeConfig('ranked');
assert.equal(rankedConfig.route, 'ranked-waiting.html');
assert.equal(rankedConfig.stateKey, 'ranked3dState');
assert.equal(rankedConfig.maxPlayers, 8);

console.log('game-modes: mode registry layer passed');
