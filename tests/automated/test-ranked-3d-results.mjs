import assert from 'node:assert/strict';
import {
  PHASES,
  ROLES
} from '../../js/gamemode/ranked-3d/ranked-3d-actions.js';
import {
  createState,
  joinPlayer,
  toggleReady,
  advanceExpired
} from '../../js/gamemode/ranked-3d/ranked-3d-engine.js';
import {
  buildRanked3dResultRecord,
  calculateRanked3dWilsonLowerBound,
  normalizeRanked3dStats
} from '../../js/gamemode/ranked-3d/ranked-3d-results.js';

function createFinishedState() {
  const state = createState(1000);
  joinPlayer(state, { uid: 'winner', name: 'Alice', photo: 'alice.png' }, 1001);
  joinPlayer(state, { uid: 'loser', name: 'Bruno', photo: 'bruno.png' }, 1002);
  toggleReady(state, 'winner', 1003, () => 0);
  toggleReady(state, 'loser', 1004, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);
  advanceExpired(state, state.deadline + 1, () => 0);

  state.status = PHASES.FINISHED;
  state.phase = PHASES.FINISHED;
  state.winnerUid = 'winner';
  state.finishedAt = 5000;
  state.matchId = 1000;
  state.turnNumber = 4;
  state.players.winner.influences[0].role = ROLES.DUKE;
  state.players.winner.influences[1].role = ROLES.CAPTAIN;
  state.players.winner.coins = 0;
  state.matchStats.winner = {
    ...state.matchStats.winner,
    actions: 3,
    bluffs: 0,
    coups: 1,
    successfulChallenges: 1,
    challenges: 1,
    forcedCoups: 1,
    coinsStolen: 4
  };
  state.matchStats.loser = {
    ...state.matchStats.loser,
    actions: 2,
    bluffs: 1,
    provenBluffs: 1,
    failedChallenges: 1,
    challenges: 1
  };
  return state;
}

function testBuildResultRecord() {
  const result = buildRanked3dResultRecord('R4NK', createFinishedState(), 'winner', 7000);

  assert.equal(result.resultKey, 'R4NK_1000');
  assert.equal(result.roomCode, 'R4NK');
  assert.equal(result.committedBy, 'winner');
  assert.equal(result.winnerUid, 'winner');
  assert.equal(result.players.winner.won, true);
  assert.equal(result.players.winner.matchStats.winsWithNoCoins, 1);
  assert.equal(result.players.winner.matchStats.honestGames, undefined);
}

function testNormalizeStatsAndIdempotency() {
  const result = buildRanked3dResultRecord('R4NK', createFinishedState(), 'winner', 7000);
  const stats = normalizeRanked3dStats(null, result.players.winner, result, 7100);

  assert.equal(stats.uid, 'winner');
  assert.equal(stats.games, 1);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 0);
  assert.equal(stats.currentWinStreak, 1);
  assert.equal(stats.bestWinStreak, 1);
  assert.equal(stats.coups, 1);
  assert.equal(stats.successfulChallenges, 1);
  assert.equal(stats.challengeAccuracy, 1);
  assert.equal(stats.countedRooms.R4NK_1000, 5000);
  assert.equal(stats.unlockedAchievements.firstWin, true);
  assert.equal(stats.unlockedAchievements.courtEntry, true);
  assert.deepEqual(stats.latestUnlockedAchievements, {
    firstWin: true,
    courtEntry: true,
    honestPlayer: true,
    flawlessWin: true,
    firstVoice: true,
    noCoinsNoFear: true,
    lightningCoup: true,
    perfectJudgment: true
  });
  assert.deepEqual(stats.latestUnlockedAchievementKeys, [
    'firstWin',
    'courtEntry',
    'honestPlayer',
    'flawlessWin',
    'firstVoice',
    'noCoinsNoFear',
    'lightningCoup',
    'perfectJudgment'
  ]);
  assert.equal(stats.latestResultKey, 'R4NK_1000');
  assert.equal(stats.latestUnlockedAt, 7100);

  const duplicate = normalizeRanked3dStats(stats, result.players.winner, result, 7200);
  assert.equal(duplicate.games, 1);
  assert.equal(duplicate.wins, 1);
  assert.equal(duplicate.updatedAt, 7200);
}

function testPreservesUnlockedAchievements() {
  const result = buildRanked3dResultRecord('R4NK', createFinishedState(), 'winner', 7000);
  const previous = {
    games: 2,
    wins: 0,
    losses: 2,
    countedRooms: {},
    unlockedAchievements: { nobleScore: true }
  };
  const stats = normalizeRanked3dStats(previous, result.players.loser, result, 7300);

  assert.equal(stats.games, 3);
  assert.equal(stats.losses, 3);
  assert.equal(stats.unlockedAchievements.nobleScore, true);
  assert.equal(stats.latestUnlockedAchievements.courtEntry, true);
  assert.equal(stats.latestUnlockedAchievements.nobleScore, undefined);
}

function testWilsonScore() {
  assert.equal(calculateRanked3dWilsonLowerBound(0, 0), 0);
  assert.ok(calculateRanked3dWilsonLowerBound(5, 10) > 0);
  assert.ok(calculateRanked3dWilsonLowerBound(10, 10) > calculateRanked3dWilsonLowerBound(5, 10));
}

testBuildResultRecord();
testNormalizeStatsAndIdempotency();
testPreservesUnlockedAchievements();
testWilsonScore();

console.log('ranked-3d-results: result persistence helpers passed');
