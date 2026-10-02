import assert from 'node:assert/strict';
import {
  ACTIONS,
  PHASES,
  ROLES,
  SETTINGS,
  createRanked3dDeck,
  getRanked3dAction,
  isRanked3dActionAvailable,
  isRanked3dRoleAvailable,
  shuffleRanked3dItems
} from '../../js/gamemode/ranked-3d/ranked-3d.js';

function constantRandom(value) {
  return () => value;
}

assert.equal(PHASES.TURN, 'turn');
assert.equal(SETTINGS.maxPlayers, 6);
assert.equal(getRanked3dAction(ACTIONS.TAX).claim, ROLES.DUKE);
assert.equal(getRanked3dAction(ACTIONS.STEAL).requiresTarget, true);
assert.equal(getRanked3dAction('missing'), null);

assert.equal(isRanked3dRoleAvailable({}, ROLES.AMBASSADOR), true);
assert.equal(isRanked3dRoleAvailable({ exchangeRole: ROLES.AMBASSADOR }, ROLES.AMBASSADOR), true);
assert.equal(isRanked3dRoleAvailable({ exchangeRole: ROLES.AMBASSADOR }, ROLES.INQUISITOR), false);
assert.equal(isRanked3dActionAvailable({ exchangeRole: ROLES.AMBASSADOR }, ACTIONS.EXCHANGE_AMBASSADOR), true);
assert.equal(isRanked3dActionAvailable({ exchangeRole: ROLES.AMBASSADOR }, ACTIONS.EXCHANGE_INQUISITOR), false);

const baseDeck = createRanked3dDeck(constantRandom(0), null);
assert.equal(baseDeck.length, SETTINGS.cardsPerRole * 6);
assert.equal(baseDeck.filter((card) => card.role === ROLES.AMBASSADOR).length, SETTINGS.cardsPerRole);
assert.equal(baseDeck.filter((card) => card.role === ROLES.INQUISITOR).length, SETTINGS.cardsPerRole);

const ambassadorDeck = createRanked3dDeck(constantRandom(0), ROLES.AMBASSADOR);
assert.equal(ambassadorDeck.length, SETTINGS.cardsPerRole * 5);
assert.equal(ambassadorDeck.some((card) => card.role === ROLES.AMBASSADOR), true);
assert.equal(ambassadorDeck.some((card) => card.role === ROLES.INQUISITOR), false);

const shuffled = shuffleRanked3dItems(['a', 'b', 'c'], constantRandom(0));
assert.deepEqual(shuffled, ['b', 'c', 'a']);

console.log('ranked-3d-actions: rules layer passed');
