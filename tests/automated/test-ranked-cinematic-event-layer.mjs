import assert from 'node:assert/strict';
import { createRankedCinematicEvents } from '../../js/three/ranked-cinematic-events.js';
import { createRankedCinematicEventLayer } from '../../js/three/ranked-cinematic-event-layer.js';

testEventProjection();
testSerializedPlayback();

console.log('ranked-cinematic-event-layer: ranked event queue passed');

function testEventProjection() {
  const previous = createSnapshot({
    coinBalances: [2, 2],
    publicReveals: [{ sequence: 1 }]
  });
  const next = createSnapshot({
    coinBalances: [1, 3],
    publicReveals: [{ sequence: 1 }, { sequence: 2, cardId: 'card-2' }],
    exchange: { key: 'u1:2:a|b', seat: 1 },
    examine: { actorUid: 'u1', targetUid: 'u2', cardId: 'card-3' }
  });

  const events = createRankedCinematicEvents(previous, next);
  assert.deepEqual(events.map((event) => event.type), ['coins', 'reveals', 'exchange', 'examine']);
  assert.deepEqual(events[0].previousBalances, [2, 2]);
  assert.deepEqual(events[0].nextBalances, [1, 3]);
  assert.equal(events[1].previousSequence, 1);
  assert.equal(events[1].reveals[0].sequence, 2);
  assert.equal(events[2].state, 'opened');
  assert.equal(events[3].state, 'opened');
}

function testSerializedPlayback() {
  const started = [];
  const finished = [];
  const coins = createMockController();
  const reveals = createMockController();
  const layer = createRankedCinematicEventLayer({
    coinAnimations: coins,
    revealAnimations: reveals,
    onEvent: ({ phase, event }) => (phase === 'started' ? started : finished).push(event.type)
  });

  layer.transition(
    createSnapshot({ coinBalances: [2], publicReveals: [] }),
    createSnapshot({ coinBalances: [3], publicReveals: [{ sequence: 1, cardId: 'card-1' }] })
  );
  assert.deepEqual(started, ['coins']);
  assert.equal(coins.transitions.length, 1);
  assert.equal(reveals.transitions.length, 0);

  coins.active = false;
  layer.update(0.1);
  assert.deepEqual(finished, ['coins']);
  assert.deepEqual(started, ['coins', 'reveals']);
  assert.equal(reveals.transitions.length, 1);

  reveals.active = false;
  layer.update(0.1);
  assert.deepEqual(finished, ['coins', 'reveals']);
  assert.equal(layer.isActive(), false);
}

function createMockController() {
  return {
    active: false,
    transitions: [],
    updateCalls: 0,
    transition(event) {
      this.transitions.push(event);
      this.active = true;
    },
    update() {
      this.updateCalls += 1;
    },
    cancel() {
      this.active = false;
    },
    isActive() {
      return this.active;
    }
  };
}

function createSnapshot({ coinBalances, publicReveals, exchange = null, examine = null }) {
  return {
    version: 1,
    mode: 'ranked',
    ranked3d: {
      updatedAt: 100,
      turnNumber: 1,
      turnIndex: 0,
      layout: { deck: { x: 0, y: 0, z: 0 } },
      coinBalances,
      publicReveals,
      exchange,
      examine
    }
  };
}
