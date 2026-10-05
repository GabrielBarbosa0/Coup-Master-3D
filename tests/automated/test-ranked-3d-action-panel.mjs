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
  assert.equal(model.title, 'Responder');
  assert.equal(model.stage, 'response');
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
  assert.equal(model.title, 'Responder');
  assert.equal(model.stage, 'response');
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

function testExchangeKeepsChoicesPrivateAndExact() {
  const state = createBaseState();
  state.phase = PHASES.EXCHANGE;
  state.pendingExchange = {
    playerUid: 'u1',
    keepCount: 2,
    options: [
      { id: 'u1-1', role: ROLES.DUKE },
      { id: 'u1-2', role: ROLES.ASSASSIN },
      { id: 'deck-1', role: ROLES.CAPTAIN },
      { id: 'deck-2', role: ROLES.CONTESSA }
    ]
  };

  const ownerModel = getRanked3dActionPanelModel(state, 'u1');
  assert.equal(ownerModel.title, 'Escolha as influências');
  assert.equal(ownerModel.stage, 'exchange');
  assert.equal(ownerModel.exchange.keepCount, 2);
  assert.deepEqual(ownerModel.exchange.options.map((card) => card.id), ['u1-1', 'u1-2', 'deck-1', 'deck-2']);
  assert.deepEqual(controlTypes(ownerModel), ['complete-exchange']);

  const observerModel = getRanked3dActionPanelModel(state, 'u2');
  assert.equal(observerModel.title, 'Troca em andamento');
  assert.equal(observerModel.exchange, undefined);
}

function testExamineOnlyShowsCardToInquisitor() {
  const state = createBaseState();
  state.phase = PHASES.EXAMINE;
  state.pendingExamine = {
    actorUid: 'u1',
    targetUid: 'u2',
    cardId: 'u2-1',
    role: ROLES.CAPTAIN
  };

  const ownerModel = getRanked3dActionPanelModel(state, 'u1');
  assert.equal(ownerModel.title, 'Investigar');
  assert.equal(ownerModel.examine.role, ROLES.CAPTAIN);
  assert.deepEqual(controlTypes(ownerModel), ['complete-examine', 'complete-examine']);
  assert.equal(ownerModel.controls[1].replace, true);

  const observerModel = getRanked3dActionPanelModel(state, 'u2');
  assert.equal(observerModel.title, 'Investigação em andamento');
  assert.equal(observerModel.examine, undefined);
}

testResponseOffersChallengeBlockAndPass();
testBlockChallengeOffersContestOrAccept();
testChallengeRevealChoosesHiddenInfluence();
testInfluenceLossChoosesHiddenInfluence();
testExchangeKeepsChoicesPrivateAndExact();
testExamineOnlyShowsCardToInquisitor();

console.log('ranked-3d-action-panel: challenge/block/reveal flow passed');
