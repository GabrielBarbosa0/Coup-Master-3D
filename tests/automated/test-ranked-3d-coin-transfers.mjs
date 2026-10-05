import assert from 'node:assert/strict';
import { createRankedCoinTransferPlan } from '../../js/gamemode/ranked-3d/ranked-3d-coin-transfers.js';

assert.deepEqual(
  createRankedCoinTransferPlan([2, 3, 0], [1, 4, 2]),
  [
    { fromSeat: 1, toSeat: 2 },
    { fromSeat: null, toSeat: 3 },
    { fromSeat: null, toSeat: 3 }
  ]
);

assert.deepEqual(
  createRankedCoinTransferPlan([3, 2], [0, 0]),
  [
    { fromSeat: 1, toSeat: null },
    { fromSeat: 1, toSeat: null },
    { fromSeat: 1, toSeat: null },
    { fromSeat: 2, toSeat: null },
    { fromSeat: 2, toSeat: null }
  ]
);

assert.deepEqual(createRankedCoinTransferPlan([2, 2], [2, 2]), []);

console.log('ranked-3d-coin-transfers: transfer planning passed');
