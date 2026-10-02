import assert from 'node:assert/strict';
import { ACTIONS, PHASES, ROLES } from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';
import { getRanked3dActionPanelModel } from '../../js/gamemode/ranked-3d/ranked-3d-action-panel.js';

function createBaseState() {
  return {
    status: 'active',
    phase: PHASES.TURN,
    turnOrder: ['u1', 'u2', 'u3'],
    turnIndex: 0,
    players: {
      u1: createPlayer('u1', 'Alice', 1, 2, ROLES.DUKE, ROLES.ASSASSIN),
      u2: createPlayer('u2', 'Bruno', 2, 2, ROLES.CAPTAIN, ROLES.CONTESSA),
      u3: createPlayer('u3', 'Celia', 3, 2, ROLES.AMBASSADOR, ROLES.INQUISITOR)
    },
    pendingAction: null,
    pendingLoss: null
  };
}

function createPlayer(uid, name, seat, coins, firstRole, secondRole) {
  return {
    uid,
    name,
    seat,
    coins,
    eliminated: false,
    influences: [
      { id: `${uid}-1`, role: firstRole, revealed: false },
      { id: `${uid}-2`, role: secondRole, revealed: false }
    ]
  };
}

function controlTypes(model) {
  return model.controls.map((control) => control.type);
}

function testResponseOffersChallengeBlockAndPass() {
  const state = createBaseState();
  state.phase = PHASES.RESPONSE;
  state.pendingAction = {
    type: ACTIONS.FOREIGN_AID,
    actorUid: 'u1',
    targetUid: null,
    claim: null,
    claimConfirmed: true,
    passes: {},
    block: null
  };

  const model = getRanked3dActionPanelModel(state, 'u2');
  assert.equal(model.title, 'Responder ação');
  assert.deepEqual(controlTypes(model), ['declare-block', 'pass-response']);
  assert.equal(model.controls[0].role, ROLES.DUKE);

  state.pendingAction.type = ACTIONS.TAX;
  state.pendingAction.claim = ROLES.DUKE;
  state.pendingAction.claimConfirmed = false;
  const challengeModel = getRanked3dActionPanelModel(state, 'u2');
  assert.deepEqual(controlTypes(challengeModel), ['challenge-action', 'pass-response']);
}

function testBlockChallengeOffersContestOrAccept() {
  const state = createBaseState();
  state.phase = PHASES.BLOCK_CHALLENGE;
  state.pendingAction = {
    type: ACTIONS.FOREIGN_AID,
    actorUid: 'u1',
    targetUid: null,
    claim: null,
    claimConfirmed: true,
    passes: {},
    block: { uid: 'u2', claim: ROLES.DUKE }
  };

  const model = getRanked3dActionPanelModel(state, 'u3');
  assert.equal(model.title, 'Responder bloqueio');
  assert.deepEqual(controlTypes(model), ['challenge-block', 'pass-response']);
}

function testChallengeRevealChoosesHiddenInfluence() {
  const state = createBaseState();
  state.phase = PHASES.CHALLENGE_REVEAL;
  state.pendingAction = {
    type: ACTIONS.TAX,
    actorUid: 'u1',
    passes: {},
    challenge: {
      playerUid: 'u1',
      challengerUid: 'u2',
      claim: ROLES.DUKE,
      isBlock: false
    }
  };

  const model = getRanked3dActionPanelModel(state, 'u1');
  assert.equal(model.title, 'Revelar influência');
  assert.deepEqual(controlTypes(model), ['reveal-challenge', 'reveal-challenge']);
  assert.equal(model.controls[0].cardId, 'u1-1');
}

function testInfluenceLossChoosesHiddenInfluence() {
  const state = createBaseState();
  state.phase = PHASES.INFLUENCE_LOSS;
  state.pendingLoss = {
    playerUid: 'u2',
    reason: 'Contestação incorreta.',
    count: 1
  };

  const model = getRanked3dActionPanelModel(state, 'u2');
  assert.equal(model.title, 'Perder influência');
  assert.deepEqual(controlTypes(model), ['lose-influence', 'lose-influence']);
  assert.equal(model.controls[1].cardId, 'u2-2');
}

testResponseOffersChallengeBlockAndPass();
testBlockChallengeOffersContestOrAccept();
testChallengeRevealChoosesHiddenInfluence();
testInfluenceLossChoosesHiddenInfluence();

console.log('ranked-3d-action-panel: challenge/block/reveal flow passed');
