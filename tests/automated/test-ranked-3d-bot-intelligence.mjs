import assert from 'node:assert/strict';
import {
  advanceRankedRoomBotState
} from '../../js/gamemode/ranked-3d/ranked-3d-room-state.js';
import {
  ACTIONS,
  PHASES,
  ROLES
} from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';
import {
  advanceExpired,
  createState,
  joinPlayer,
  performAction,
  toggleReady
} from '../../js/gamemode/ranked-3d/ranked-3d-engine.js';
import {
  applyNextRanked3dBotDecision,
  chooseRanked3dBotAction,
  chooseRanked3dBotBlockClaim,
  hasPendingRanked3dBotDecision
} from '../../js/gamemode/ranked-3d/ranked-3d-bot-intelligence.js';

function createStartedState() {
  const state = createState(1000);
  joinPlayer(state, { uid: 'human', name: 'Alice', photo: '' }, 1001);
  joinPlayer(state, { uid: 'bot', name: 'Augusto', photo: '' }, 1002);
  state.players.bot.ai = true;
  state.players.bot.personality = { honesty: 50, skepticism: 50, vengefulness: 50 };
  toggleReady(state, 'human', 1003, () => 0);
  toggleReady(state, 'bot', 1004, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);
  state.turnOrder = ['bot', 'human'];
  state.turnIndex = 0;
  state.turnNumber = 1;
  state.phase = PHASES.TURN;
  return state;
}

function testForcedCoupChoice() {
  const state = createStartedState();
  state.players.bot.coins = 10;
  const action = chooseRanked3dBotAction(state, state.players.bot, () => 0.5);

  assert.equal(action.type, ACTIONS.COUP);
  assert.equal(action.targetUid, 'human');
}

function testForeignAidBlockChoiceAndDecision() {
  const state = createStartedState();
  state.turnOrder = ['human', 'bot'];
  state.turnIndex = 0;
  state.players.bot.influences[0].role = ROLES.DUKE;
  performAction(state, 'human', ACTIONS.FOREIGN_AID, null, 2000);

  assert.equal(chooseRanked3dBotBlockClaim(state, state.players.bot, () => 0.5), ROLES.DUKE);
  assert.equal(hasPendingRanked3dBotDecision(state, 2100), true);
  assert.equal(applyNextRanked3dBotDecision(state, 2100, () => 0.5), true);
  assert.equal(state.phase, PHASES.BLOCK_CHALLENGE);
  assert.equal(state.pendingAction.block.uid, 'bot');
  assert.equal(state.pendingAction.block.claim, ROLES.DUKE);
}

function testBotLosesLowestValueInfluence() {
  const state = createStartedState();
  state.players.bot.influences = [
    { id: 'bot-ambassador', role: ROLES.AMBASSADOR, revealed: false },
    { id: 'bot-contessa', role: ROLES.CONTESSA, revealed: false }
  ];
  state.phase = PHASES.INFLUENCE_LOSS;
  state.pendingLoss = {
    playerUid: 'bot',
    reason: 'test',
    sourceUid: 'human'
  };

  assert.equal(applyNextRanked3dBotDecision(state, 2200, () => 0.5), true);
  assert.equal(state.players.bot.influences[0].revealed, true);
  assert.equal(state.players.bot.influences[1].revealed, false);
}

function testRoomStateBotBridge() {
  const state = createStartedState();
  state.players.bot.coins = 10;
  const result = advanceRankedRoomBotState(state, 2300, () => 0.5);

  assert.equal(result.changed, true);
  assert.equal(result.state.phase, PHASES.ANIMATING);
  assert.equal(result.state.pendingAction.type, ACTIONS.COUP);
  assert.equal(result.state.pendingAction.targetUid, 'human');
  assert.equal(result.state.pendingAction.forcedCoup, true);
}

testForcedCoupChoice();
testForeignAidBlockChoiceAndDecision();
testBotLosesLowestValueInfluence();
testRoomStateBotBridge();

console.log('ranked-3d-bot-intelligence: bot strategy helpers passed');
