import assert from 'node:assert/strict';
import { createRankedCoinAnimationController } from '../../js/three/ranked-coin-animation-controller.js';

const calls = [];
const targetCoin = createCoin('ranked-coin-2-2');
const coins = new Map([[targetCoin.id, targetCoin]]);
const controller = createRankedCoinAnimationController({
  createTransientCoin: (type, position, id) => {
    const coin = createCoin(`transient-${id}`);
    coins.set(coin.id, coin);
    return coin;
  },
  getObjectById: (id) => coins.get(id) || null,
  removeTableObject: (coin, options) => calls.push({ id: coin.id, options }),
  setCoinKinematic: (coin) => coin.body.bodyTypeCalls.push('kinematic'),
  releaseCoinPhysics: (coin) => coin.body.bodyTypeCalls.push('dynamic')
});

controller.transition({
  previousBalances: [2, 1],
  nextBalances: [1, 2],
  layout: createLayout()
});

assert.deepEqual(targetCoin.body.translationCalls[0], { x: 1, y: 0.068, z: 0 });
controller.update(1);
assert.deepEqual(targetCoin.body.translationCalls.at(-1), { x: 3, y: 0.31, z: 0 });
assert.deepEqual(targetCoin.collider.sensorCalls, [true, false]);
assert.deepEqual(targetCoin.body.bodyTypeCalls, ['kinematic', 'dynamic']);
assert.deepEqual(calls, []);

console.log('ranked-coin-animation-controller: ranked coin arc passed');

function createCoin(id, position = { x: 3, y: 0.31, z: 0 }) {
  return {
    id,
    body: {
      translationCalls: [],
      nextTranslationCalls: [],
      bodyTypeCalls: [],
      position,
      setTranslation(position) {
        this.translationCalls.push({ x: position.x, y: position.y, z: position.z });
      },
      setNextKinematicTranslation(position) {
        this.nextTranslationCalls.push({ x: position.x, y: position.y, z: position.z });
      },
      translation() {
        return this.position;
      }
    },
    collider: {
      sensorCalls: [],
      setSensor(value) {
        this.sensorCalls.push(value);
      }
    }
  };
}

function createLayout() {
  return {
    treasury: { x: -1, y: 0.068, z: 0 },
    seats: [
      { coinArea: { slots: [{ x: 0, y: 0.068, z: 0 }, { x: 1, y: 0.068, z: 0 }] } },
      { coinArea: { slots: [{ x: 2, y: 0.068, z: 0 }, { x: 3, y: 0.068, z: 0 }] } }
    ]
  };
}
