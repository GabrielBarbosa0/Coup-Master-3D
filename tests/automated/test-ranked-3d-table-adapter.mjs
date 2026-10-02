import assert from 'node:assert/strict';
import { ROLES } from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';
import { createRanked3dTableState } from '../../js/gamemode/ranked-3d/ranked-3d-table-adapter.js';

const rankedState = {
  status: 'active',
  phase: 'turn',
  updatedAt: 5000,
  exchangeRole: ROLES.INQUISITOR,
  turnOrder: ['u1', 'u2'],
  turnIndex: 0,
  turnNumber: 3,
  deck: [
    { id: 'deck-1', role: ROLES.DUKE },
    { id: 'deck-2', role: ROLES.CAPTAIN }
  ],
  players: {
    u1: {
      uid: 'u1',
      name: 'Alice',
      photo: 'alice.png',
      seat: 1,
      connected: true,
      coins: 4,
      influences: [
        { id: 'alice-1', role: ROLES.DUKE, revealed: false },
        { id: 'alice-2', role: ROLES.ASSASSIN, revealed: false }
      ]
    },
    u2: {
      uid: 'u2',
      name: 'Bruno',
      photo: 'bruno.png',
      seat: 2,
      connected: true,
      coins: 1,
      influences: [
        { id: 'bruno-1', role: ROLES.CAPTAIN, revealed: false },
        { id: 'bruno-2', role: ROLES.CONTESSA, revealed: true }
      ]
    }
  }
};

const tableState = createRanked3dTableState(rankedState, { localUid: 'u1' });

assert.equal(tableState.version, 1);
assert.equal(tableState.mode, 'ranked');
assert.equal(tableState.players.length, 6);
assert.equal(tableState.players[0].coinCount, 4);
assert.equal(tableState.players[1].coinCount, 1);
assert.equal(tableState.deck.length, 2);
assert.equal(tableState.deckConfig.inquisidor, 5);
assert.equal(tableState.deckConfig.embaixador, 0);
assert.equal(tableState.ranked3d.activeUid, 'u1');
assert.equal(tableState.ranked3d.activeSeat, 1);

const localHiddenCard = tableState.cards.find((entry) => entry.data.rankedCardId === 'alice-1');
assert.equal(localHiddenCard.data.owner, 1);
assert.equal(localHiddenCard.data.faceUp, true);
assert.equal(localHiddenCard.data.location, 'player-1');

const opponentHiddenCard = tableState.cards.find((entry) => entry.data.rankedCardId === 'bruno-1');
assert.equal(opponentHiddenCard.data.owner, 2);
assert.equal(opponentHiddenCard.data.faceUp, false);
assert.equal(opponentHiddenCard.data.location, 'player-2');

const revealedOpponentCard = tableState.cards.find((entry) => entry.data.rankedCardId === 'bruno-2');
assert.equal(revealedOpponentCard.data.owner, null);
assert.equal(revealedOpponentCard.data.faceUp, true);
assert.equal(revealedOpponentCard.data.location, 'table');
assert.equal(tableState.tableCards.length, 1);

console.log('ranked-3d-table-adapter: ranked state projection passed');
