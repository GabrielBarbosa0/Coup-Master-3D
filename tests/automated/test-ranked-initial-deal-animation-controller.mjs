import assert from 'node:assert/strict';
import { createRankedInitialDealAnimationController } from '../../js/three/ranked-initial-deal-animation-controller.js';

const cards = new Map(['one', 'two', 'three'].map((id, index) => [`ranked-${id}`, createCard(id, index)]));
const placements = [];
const tosses = [];
const scheduled = [];
const controller = createRankedInitialDealAnimationController({
  getCardById: (id) => cards.get(id) || null,
  getCardPose: (card) => ({ position: { x: card.index, y: 0.068, z: card.index + 1 }, rotationY: card.index }),
  getDeckPose: () => ({ position: { x: 0, y: 0.1, z: 0 }, rotationY: 0 }),
  placeCard: (card, position, rotationY) => placements.push({ id: card.id, position, rotationY }),
  setCardVisible: (card, visible) => {
    card.visible = visible;
  },
  tossTo: (card, target, rotationY, lift, onComplete) => {
    tosses.push({ id: card.id, target, rotationY, lift });
    onComplete?.();
  },
  schedule: (callback, delay) => {
    scheduled.push({ callback, delay });
    return scheduled.length;
  },
  cancelSchedule: () => {}
});

controller.transition({
  deals: [
    { cardId: 'one', seat: 1, openingPose: { position: { x: 10, y: 0.068, z: 0 }, rotationY: 0 } },
    { cardId: 'two', seat: 2, openingPose: { position: { x: 20, y: 0.068, z: 0 }, rotationY: 0 } },
    { cardId: 'three', seat: 1, openingPose: null }
  ]
});

assert.deepEqual(scheduled.map((entry) => entry.delay), [0, 140, 280]);
assert.ok([...cards.values()].every((card) => card.visible === false));
scheduled.forEach((entry) => entry.callback());
assert.equal(placements.length, 3);
assert.deepEqual(placements.map((entry) => entry.rotationY), [0, 0, 2]);
assert.deepEqual(tosses.map((entry) => entry.id), ['one', 'two', 'one', 'three']);
assert.deepEqual(tosses.slice(0, 2).map((entry) => entry.target.x), [10, 20]);
assert.equal(tosses[2].target.x, 0);
assert.ok(tosses.every((entry) => entry.lift === 0.34));
assert.ok([...cards.values()].every((card) => card.visible === true));
assert.equal(controller.isActive(), false);

console.log('ranked-initial-deal-animation-controller: casual deal timing passed');

function createCard(id, index) {
  return { id, index, visible: true };
}
