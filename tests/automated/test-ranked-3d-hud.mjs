import assert from 'node:assert/strict';
import {
  PHASES,
  getRanked3dHudModel,
  formatRanked3dCountdown
} from '../../js/gamemode/ranked-3d/ranked-3d.js';

const now = Date.now();

function createPlayer(uid, name, overrides = {}) {
  return {
    uid,
    name,
    seat: overrides.seat || 1,
    coins: overrides.coins ?? 2,
    connected: true,
    eliminated: false,
    influences: [
      { id: `${uid}-duke`, role: 'duke', revealed: false },
      { id: `${uid}-captain`, role: 'captain', revealed: false }
    ],
    ...overrides
  };
}

function createState(overrides = {}) {
  const local = createPlayer('local', 'Gabriel Barbosa', { seat: 1, coins: 5 });
  const rival = createPlayer('rival', 'Bot Um', { seat: 2, coins: 3 });
  return {
    status: 'active',
    phase: PHASES.TURN,
    turnNumber: 4,
    turnIndex: 0,
    turnOrder: ['local', 'rival'],
    deadline: now + 15_000,
    players: {
      local,
      rival
    },
    log: [],
    ...overrides
  };
}

{
  const model = getRanked3dHudModel(createState(), 'local', {
    roomCode: 'R1A2',
    statsByUid: {}
  });
  assert.equal(model.visible, true);
  assert.equal(model.title, 'Seu turno ranqueado');
  assert.equal(model.meta.includes('Sala R1A2'), false);
  assert.equal(model.meta.includes('Turno 4'), true);
  assert.equal(model.players.length, 2);
  assert.equal(model.players[0].isLocal, true);
  assert.equal(model.players[0].isActive, true);
  assert.equal(model.players[0].coins, 5);
}

{
  const state = createState({
    phase: PHASES.RESPONSE,
    pendingAction: {
      actorUid: 'rival',
      targetUid: 'local',
      type: 'steal'
    }
  });
  const model = getRanked3dHudModel(state, 'local');
  assert.equal(model.title, 'Resposta aberta');
  assert.equal(model.tone, 'warning');
  assert.match(model.description, /Bot Um/);
}

{
  const state = createState({
    status: PHASES.FINISHED,
    phase: PHASES.FINISHED,
    winnerUid: 'local',
    matchStats: {
      local: { performanceScore: 42 }
    },
    players: {
      local: createPlayer('local', 'Gabriel Barbosa', {
        seat: 1,
        performanceScore: 42
      }),
      rival: createPlayer('rival', 'Bot Um', {
        seat: 2,
        eliminated: true,
        influences: [
          { id: 'rival-duke', role: 'duke', revealed: true },
          { id: 'rival-captain', role: 'captain', revealed: true }
        ]
      })
    }
  });
  const model = getRanked3dHudModel(state, 'local', {
    statsByUid: {
      local: {
        rankScore: 73,
        latestUnlockedAchievementKeys: ['primeira-vitoria']
      }
    }
  });
  assert.equal(model.tone, 'success');
  assert.equal(model.result.title, 'Vitoria registrada');
  assert.equal(model.result.score, 42);
  assert.equal(model.result.rankScore, 73);
  assert.deepEqual(model.result.achievements, ['primeira-vitoria']);
}

assert.equal(formatRanked3dCountdown(now + 61_000, now), '01:01');
assert.equal(formatRanked3dCountdown(now - 1_000, now), '00:00');

console.log('ranked-3d-hud: status, countdown and result model passed');
