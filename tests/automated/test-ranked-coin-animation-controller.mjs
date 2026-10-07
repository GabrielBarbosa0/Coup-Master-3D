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

testFiveSilverConsolidatesIntoGold();
testGoldBreakPaysTheTargetAndReturnsChange();

function testFiveSilverConsolidatesIntoGold() {
  const conversionCalls = [];
  const goldCoin = createCoin('ranked-coin-1-1');
  const conversionCoins = new Map([[goldCoin.id, goldCoin]]);
  const conversionController = createRankedCoinAnimationController({
    createTransientCoin: (type, position, id) => {
      conversionCalls.push({ type, position });
      return createCoin(`transient-${id}`, position);
    },
    getObjectById: (id) => conversionCoins.get(id) || null,
    removeTableObject: () => {},
    setCoinKinematic: () => {},
    releaseCoinPhysics: () => {}
  });

  conversionController.transition({
    previousBalances: [4],
    nextBalances: [5],
    layout: createLayout()
  });

  assert.equal(conversionCalls.length, 5);
  assert.ok(conversionCalls.every((call) => call.type === 'silver'));
  assert.deepEqual(goldCoin.body.translationCalls[0], { x: -1, y: 0.068, z: 0 });
}

function testGoldBreakPaysTheTargetAndReturnsChange() {
  const created = [];
  const objects = new Map([
    ...Array.from({ length: 4 }, (_, index) => [`ranked-coin-1-${index + 1}`, createCoin(`ranked-coin-1-${index + 1}`)]),
    ['ranked-coin-2-3', createCoin('ranked-coin-2-3')],
    ['ranked-coin-2-4', createCoin('ranked-coin-2-4')]
  ]);
  const controller = createRankedCoinAnimationController({
    createTransientCoin: (type, position, id) => {
      created.push(type);
      return createCoin(`transient-${id}`, position);
    },
    getObjectById: (id) => objects.get(id) || null,
    removeTableObject: () => {},
    setCoinKinematic: () => {},
    releaseCoinPhysics: () => {}
  });

  controller.transition({
    previousBalances: [6, 2],
    nextBalances: [3, 4],
    layout: createLayout()
  });

  assert.deepEqual(created, ['gold', 'silver']);
  assert.deepEqual(objects.get('ranked-coin-1-1').body.translationCalls[0], { x: -1, y: 0.068, z: 0 });
  assert.deepEqual(objects.get('ranked-coin-2-3').body.translationCalls[0], { x: -1, y: 0.068, z: 0 });
  assert.deepEqual(objects.get('ranked-coin-2-4').body.translationCalls[0], { x: -1, y: 0.068, z: 0 });
}

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
