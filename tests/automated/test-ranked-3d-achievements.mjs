import assert from 'node:assert/strict';
import {
  RANKED_3D_ACHIEVEMENT_KEYS,
  evaluateRanked3dAchievements
} from '../../js/gamemode/ranked-3d/ranked-3d-achievements.js';

const qualifyingStats = {
  wins: 1,
  games: 100,
  honestGames: 1,
  honestWins: 5,
  bluffs: 50,
  perfectBluffWins: 1,
  bestWinStreak: 10,
  comebackWins: 1,
  finalInfluenceWins: 1,
  perfectWins: 1,
  coups: 50,
  assassinations: 50,
  contestedAssassinsWon: 1,
  steals: 10,
  coinsStolen: 25,
  successfulChallenges: 25,
  challenges: 10,
  challengeAccuracy: 0.7,
  failedChallenges: 10,
  doubleContessaWins: 1,
  condessaBlocks: 10,
  falseCondessaBluffs: 1,
  ambassadorExchanges: 10,
  inquisitorInspections: 10,
  actions: 100,
  rankScore: 500,
  dukeTaxes: 25,
  foreignAidBlocks: 10,
  taxBluffs: 10,
  captainBlocks: 10,
  ambassadorBlocks: 10,
  forcedCoups: 5,
  winsAsFirstPlayer: 1,
  winsAgainstFivePlayers: 1,
  winsWithNoCoins: 1,
  fastestWins: 1,
  longestGamesWon: 1,
  revengeWins: 1,
  flawlessChallenges: 1,
  allRolesClaimedWins: 1
};

const unlocked = evaluateRanked3dAchievements(qualifyingStats);
assert.equal(RANKED_3D_ACHIEVEMENT_KEYS.length, 50);
RANKED_3D_ACHIEVEMENT_KEYS.forEach((key) => assert.equal(unlocked[key], true, key));

const first = evaluateRanked3dAchievements({ rankScore: 500, challenges: 10, challengeAccuracy: 0.7 });
const later = evaluateRanked3dAchievements({
  rankScore: 100,
  challenges: 20,
  challengeAccuracy: 0.4,
  unlockedAchievements: first
});
assert.equal(later.nobleScore, true);
assert.equal(later.preciseAccuser, true);

assert.equal(evaluateRanked3dAchievements({ honestGames: 20, honestWins: 4 }).unlikelySaint, undefined);
assert.equal(evaluateRanked3dAchievements({ honestWins: 5 }).unlikelySaint, true);

console.log('ranked-3d-achievements: checks passed');
