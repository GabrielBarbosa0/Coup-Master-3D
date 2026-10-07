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
  publicReveals: [
    { sequence: 4, playerUid: 'u2', playerName: 'Bruno', role: ROLES.CONTESSA, cardId: 'bruno-2', kind: 'challengeLoss' }
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
assert.equal(tableState.objects.length, 5);
assert.equal(tableState.objects.filter((object) => object.rankedCoinSeat === 1).length, 4);
assert.equal(tableState.objects.filter((object) => object.rankedCoinSeat === 2).length, 1);
assert.ok(tableState.objects.every((object) => !object.rankedLocked));
assert.ok(tableState.objects.every((object) => object.position.y === 0.068));
assert.equal(tableState.deck.length, 2);
assert.equal(tableState.deckConfig.inquisidor, 5);
assert.equal(tableState.deckConfig.embaixador, 0);
assert.equal(tableState.ranked3d.activeUid, 'u1');
assert.equal(tableState.ranked3d.activeSeat, 1);
assert.deepEqual(tableState.ranked3d.coinBalances, [4, 1, 0, 0, 0, 0]);
assert.deepEqual(tableState.ranked3d.publicReveals, [{
  sequence: 4,
  playerUid: 'u2',
  playerName: 'Bruno',
  seat: 2,
  role: ROLES.CONTESSA,
  cardId: 'bruno-2',
  replacementCardId: null,
  kind: 'challengeLoss'
}]);

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
assert.equal(tableState.stacks.length, 1);
assert.equal(tableState.stacks[0].id, 'ranked-cemetery');
assert.equal(tableState.stacks[0].cards[0], revealedOpponentCard.data.id);
assert.equal(tableState.ranked3d.layout.usesSharedCenter, true);
assert.ok(tableState.deckTransform.position.x > 0);
assert.ok(tableState.ranked3d.layout.cemetery.x < 0);

const fiveCoinState = structuredClone(rankedState);
fiveCoinState.players.u1.coins = 5;
const fiveCoinTable = createRanked3dTableState(fiveCoinState, { localUid: 'u1' });
const aliceCoins = fiveCoinTable.objects.filter((object) => object.rankedCoinSeat === 1);
assert.equal(aliceCoins.length, 1);
assert.equal(aliceCoins[0].kind, 'gold-coin');

const dealingState = structuredClone(rankedState);
dealingState.phase = 'dealing';
const dealingTable = createRanked3dTableState(dealingState, { localUid: 'u1' });
assert.deepEqual(
  dealingTable.ranked3d.initialDeal.deals.map(({ seat, cardId, order }) => ({ seat, cardId, order })),
  [
    { seat: 1, cardId: 'alice-1', order: 0 },
    { seat: 2, cardId: 'bruno-1', order: 0 },
    { seat: 1, cardId: 'alice-2', order: 1 }
  ]
);
assert.ok(dealingTable.ranked3d.initialDeal.deals[0].openingPose);
assert.equal(dealingTable.ranked3d.initialDeal.deals[2].openingPose, null);
assert.equal(dealingTable.cards.find((entry) => entry.data.rankedCardId === 'alice-2').data.rankedInfluenceIndex, 1);

const exchangeState = structuredClone(rankedState);
exchangeState.phase = 'exchange';
exchangeState.players.u1.influences = [];
exchangeState.pendingExchange = {
  playerUid: 'u1',
  keepCount: 2,
  options: [
    { id: 'alice-1', role: ROLES.DUKE },
    { id: 'alice-2', role: ROLES.ASSASSIN },
    { id: 'deck-1', role: ROLES.CAPTAIN },
    { id: 'deck-2', role: ROLES.CONTESSA }
  ]
};
const ownerExchangeTable = createRanked3dTableState(exchangeState, { localUid: 'u1' });
assert.equal(ownerExchangeTable.ranked3d.exchange.seat, 1);
assert.equal(ownerExchangeTable.ranked3d.exchange.options.length, 4);
assert.equal(ownerExchangeTable.cards.filter((entry) => entry.data.rankedExchange).length, 4);
assert.ok(ownerExchangeTable.cards.filter((entry) => entry.data.rankedExchange).every((entry) => entry.data.faceUp));

const observerExchangeTable = createRanked3dTableState(exchangeState, { localUid: 'u2' });
assert.equal(observerExchangeTable.ranked3d.exchange, null);
assert.equal(observerExchangeTable.cards.filter((entry) => entry.data.rankedExchange).length, 0);

const examineState = structuredClone(rankedState);
examineState.phase = 'examine';
examineState.pendingExamine = {
  actorUid: 'u1',
  targetUid: 'u2',
  cardId: 'bruno-1',
  role: ROLES.CAPTAIN
};
const ownerExamineTable = createRanked3dTableState(examineState, { localUid: 'u1' });
assert.equal(ownerExamineTable.ranked3d.examine.targetSeat, 2);
assert.equal(ownerExamineTable.cards.filter((entry) => entry.data.rankedExamine).length, 1);
assert.equal(ownerExamineTable.cards.find((entry) => entry.data.rankedExamine).data.faceUp, true);

const observerExamineTable = createRanked3dTableState(examineState, { localUid: 'u2' });
assert.equal(observerExamineTable.ranked3d.examine, null);
assert.equal(observerExamineTable.cards.filter((entry) => entry.data.rankedExamine).length, 0);

console.log('ranked-3d-table-adapter: ranked state projection passed');
