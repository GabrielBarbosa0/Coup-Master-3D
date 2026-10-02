import assert from 'node:assert/strict';
import {
  advanceRankedRoomState,
  createRankedRoomRecord,
  joinRankedRoomState,
  RANKED_3D_ROOM_MODE,
  toggleRankedRoomReadyState
} from '../../js/gamemode/ranked-3d/ranked-3d-room-state.js';
import { PHASES } from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';

const host = {
  uid: 'host-1',
  displayName: 'Gabriel Barbosa',
  photoURL: 'host.png'
};

const guest = {
  uid: 'guest-1',
  displayName: 'Jogador Dois',
  photoURL: 'guest.png'
};

function testCreateRankedRoomRecord() {
  const room = createRankedRoomRecord('R4NK', host, { now: 1000 });

  assert.equal(room.code, 'R4NK');
  assert.equal(room.mode, RANKED_3D_ROOM_MODE);
  assert.equal(room.adminUid, host.uid);
  assert.equal(room.status, 'ranked-lobby');
  assert.equal(room.ranked3dState.status, PHASES.WAITING);
  assert.equal(room.ranked3dState.players[host.uid].name, host.displayName);
  assert.equal(room.ranked3dState.players[host.uid].seat, 1);
}

function testJoinAndReadyFlow() {
  const room = createRankedRoomRecord('R4NK', host, { now: 1000 });
  const joined = joinRankedRoomState(room.ranked3dState, guest, 1100);

  assert.equal(Object.keys(joined.state.players).length, 2);
  assert.equal(joined.state.players[guest.uid].seat, 2);
  assert.equal(joined.state.players[guest.uid].ready, false);

  const hostReady = toggleRankedRoomReadyState(joined.state, host, 1200, () => 0);
  assert.equal(hostReady.state.players[host.uid].ready, true);
  assert.equal(hostReady.state.deadline, null);

  const guestReady = toggleRankedRoomReadyState(hostReady.state, guest, 1300, () => 0);
  assert.equal(guestReady.state.players[guest.uid].ready, true);
  assert.ok(guestReady.state.deadline > 1300);

  const started = advanceRankedRoomState(guestReady.state, guestReady.state.deadline + 1, () => 0);
  assert.equal(started.changed, true);
  assert.equal(started.state.status, 'active');
  assert.equal(started.state.phase, PHASES.STARTER_DRAW);
  assert.equal(started.state.turnOrder.length, 2);
}

testCreateRankedRoomRecord();
testJoinAndReadyFlow();

console.log('ranked-room-state: firebase bridge helpers passed');
