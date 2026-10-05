import assert from 'node:assert/strict';
import { createRankedRevealAnimationController } from '../../js/three/ranked-reveal-animation-controller.js';

testEliminatedInfluenceMovesToCemetery();
testProvenInfluenceReturnsToDeck();
testReplacementLeavesDeckAfterProof();

console.log('ranked-reveal-animation-controller: reveal paths passed');

function testEliminatedInfluenceMovesToCemetery() {
  const calls = createCallLog();
  const finalCard = createCard('ranked-card-1', { rankedRevealed: true, faceUp: true });
  const controller = createController(calls, finalCard);

  controller.transition({
    previousSequence: 2,
    reveals: [createReveal(3, 'card-1', 'challengeLoss')],
    layout: createLayout()
  });

  assert.deepEqual(calls.tosses.map((entry) => entry.target), [
    { x: 0, y: 0.068, z: -1.7 },
    { x: -0.5, y: 0.068, z: 0 }
  ]);
  assert.equal(calls.removed.length, 0);
  assert.equal(finalCard.data.faceUp, true);
}

function testProvenInfluenceReturnsToDeck() {
  const calls = createCallLog();
  const controller = createController(calls, null);

  controller.transition({
    previousSequence: 4,
    reveals: [createReveal(5, 'card-proof', 'proof')],
    layout: createLayout()
  });

  assert.deepEqual(calls.tosses.map((entry) => entry.target), [
    { x: 0, y: 0.068, z: -1.7 },
    { x: 0, y: 0.1, z: 0 }
  ]);
  assert.deepEqual(calls.removed, ['ranked-reveal-5']);
}

function testReplacementLeavesDeckAfterProof() {
  const calls = createCallLog();
  const replacementCard = createCard('ranked-replacement', { owner: 1, location: 'player-1', faceUp: false });
  const controller = createController(calls, null, replacementCard);

  controller.transition({
    previousSequence: 5,
    reveals: [createReveal(6, 'card-proof', 'proof', 'replacement')],
    layout: createLayout()
  });

  assert.deepEqual(calls.tosses.map((entry) => entry.target), [
    { x: 0, y: 0.068, z: -1.7 },
    { x: 0, y: 0.1, z: 0 },
    { x: 4, y: 0.068, z: 0 }
  ]);
  assert.deepEqual(calls.visibility, [
    { id: 'ranked-replacement', visible: false },
    { id: 'ranked-replacement', visible: true }
  ]);
  assert.deepEqual(calls.removed, ['ranked-reveal-6']);
}

function createController(calls, finalCard, replacementCard = null) {
  return createRankedRevealAnimationController({
    createTransientCard: (reveal) => createCard(`ranked-reveal-${reveal.sequence}`, { faceUp: false }),
    getCardById: (id) => id === finalCard?.id ? finalCard : id === replacementCard?.id ? replacementCard : null,
    getCardPose: () => ({ position: { x: 4, y: 0.068, z: 0 }, rotationY: 0 }),
    getDeckPose: () => ({ position: { x: 0, y: 0.1, z: 0 }, rotationY: 0 }),
    placeCard: (card, position, rotationY) => calls.placements.push({ id: card.id, position, rotationY }),
    refreshCardMaterial: (card) => calls.refreshes.push(card.id),
    removeTransientCard: (card) => calls.removed.push(card.id),
    setCardVisible: (card, visible) => calls.visibility.push({ id: card.id, visible }),
    startCardFlip: (card, faceUp, restoreDynamic, onComplete, shouldSync) => {
      calls.flips.push({ id: card.id, faceUp, restoreDynamic, shouldSync });
      card.data.faceUp = faceUp;
      onComplete();
    },
    tossTo: (card, target, rotationY, lift, onComplete) => {
      calls.tosses.push({ id: card.id, target: { x: target.x, y: target.y, z: target.z }, rotationY, lift });
      onComplete();
    }
  });
}

function createCallLog() {
  return { flips: [], placements: [], refreshes: [], removed: [], tosses: [], visibility: [] };
}

function createCard(id, data) {
  return { id, data: { id, type: 'duque', location: 'table', owner: null, ...data } };
}

function createReveal(sequence, cardId, kind, replacementCardId = null) {
  return { sequence, cardId, role: 'duque', seat: 1, kind, replacementCardId };
}

function createLayout() {
  return {
    cemetery: { x: -0.5, y: 0.068, z: 0, rotationY: 0 },
    seats: [{
      hand: { x: 0, y: 0.068, z: -3, rotationY: 0 },
      reveal: { x: 0, y: 0.068, z: -1.7, rotationY: 0 }
    }]
  };
}
