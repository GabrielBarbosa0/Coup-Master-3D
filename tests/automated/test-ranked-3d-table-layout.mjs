import assert from 'node:assert/strict';
import { createRanked3dTableLayout } from '../../js/gamemode/ranked-3d/ranked-3d-table-layout.js';

const emptyLayout = createRanked3dTableLayout();
assert.equal(emptyLayout.usesSharedCenter, false);
assert.equal(emptyLayout.deck.x, 0);
assert.equal(emptyLayout.seats.length, 6);
assert.equal(emptyLayout.seats[0].coinArea.slots.length, 12);
assert.notEqual(emptyLayout.seats[0].coinArea.z, emptyLayout.seats[0].reveal.z);

const cemeteryLayout = createRanked3dTableLayout({ cemeteryCount: 1 });
assert.equal(cemeteryLayout.usesSharedCenter, true);
assert.ok(cemeteryLayout.cemetery.x < 0);
assert.ok(cemeteryLayout.deck.x > 0);
assert.equal(Math.abs(cemeteryLayout.cemetery.x), cemeteryLayout.deck.x);

console.log('ranked-3d-table-layout: fixed table anchors passed');
