import assert from 'node:assert/strict';
import { PHASES, ROLES } from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';
import { getRanked3dResultsModalModel } from '../../js/gamemode/ranked-3d/ranked-3d-results-modal.js';

function createPlayer(uid, name, seat, coins, role, revealed = false) {
  return {
    uid,
    name,
    seat,
    coins,
    eliminated: revealed,
    influences: [
      { id: `${uid}-1`, role, revealed },
      { id: `${uid}-2`, role, revealed }
    ]
  };
}

const state = {
  status: PHASES.FINISHED,
  phase: PHASES.FINISHED,
  matchId: 99,
  winnerUid: 'winner',
  finishedAt: 1234,
  turnNumber: 5,
  players: {
    winner: createPlayer('winner', 'Gabriel Barbosa', 1, 4, ROLES.DUKE),
    loser: createPlayer('loser', 'Nadia', 2, 0, ROLES.CAPTAIN, true)
  },
  turnOrder: ['winner', 'loser'],
  matchStats: {
    winner: { actions: 3, bluffs: 1, eliminatedUids: ['loser'], claimedRoles: {} },
    loser: { actions: 1, eliminatedUids: [], claimedRoles: {} }
  }
};

const model = getRanked3dResultsModalModel(state, { now: 1300 });
assert.equal(model.visible, true);
assert.equal(model.title, 'Gabriel Barbosa venceu');
assert.equal(model.best.uid, 'winner');
assert.equal(model.players.length, 2);
assert.equal(model.players[0].position, 1);
assert.equal(model.players[0].won, true);
assert.equal(model.players[1].eliminated, true);

const hiddenModel = getRanked3dResultsModalModel({ status: 'active' });
assert.equal(hiddenModel.visible, false);

console.log('ranked-3d-results-modal: final result model passed');
