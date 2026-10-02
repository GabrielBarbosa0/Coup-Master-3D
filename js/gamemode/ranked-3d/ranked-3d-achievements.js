const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const RANKED_3D_ACHIEVEMENT_REQUIREMENTS = Object.freeze({
  firstWin: (stats) => toNumber(stats.wins) >= 1,
  courtEntry: (stats) => toNumber(stats.games) >= 1,
  knownName: (stats) => toNumber(stats.games) >= 5,
  intrigueVeteran: (stats) => toNumber(stats.games) >= 25,
  tableLegend: (stats) => toNumber(stats.games) >= 100,
  honestPlayer: (stats) => toNumber(stats.honestGames) >= 1,
  unlikelySaint: (stats) => toNumber(stats.honestWins) >= 5,
  cleverLiar: (stats) => toNumber(stats.bluffs) >= 10,
  lieGod: (stats) => toNumber(stats.bluffs) >= 50,
  perfectBluff: (stats) => toNumber(stats.perfectBluffWins) >= 1,
  royalStreak: (stats) => toNumber(stats.bestWinStreak) >= 3,
  marchingDynasty: (stats) => toNumber(stats.bestWinStreak) >= 5,
  undefeatedCrown: (stats) => toNumber(stats.bestWinStreak) >= 10,
  comeback: (stats) => toNumber(stats.comebackWins) >= 1,
  lastInfluence: (stats) => toNumber(stats.finalInfluenceWins) >= 1,
  flawlessWin: (stats) => toNumber(stats.perfectWins) >= 1,
  heavyHand: (stats) => toNumber(stats.coups) >= 10,
  takenThrone: (stats) => toNumber(stats.coups) >= 25,
  officialRegicide: (stats) => toNumber(stats.coups) >= 50,
  courtShadow: (stats) => toNumber(stats.assassinations) >= 10,
  ruthlessAssassin: (stats) => toNumber(stats.assassinations) >= 25,
  noWitnesses: (stats) => toNumber(stats.assassinations) >= 50,
  contestedBlade: (stats) => toNumber(stats.contestedAssassinsWon) >= 1,
  portlessCaptain: (stats) => toNumber(stats.steals) >= 10,
  lootedTreasury: (stats) => toNumber(stats.coinsStolen) >= 25,
  bluffHunterAchievement: (stats) => toNumber(stats.successfulChallenges) >= 10,
  inquisitorEyes: (stats) => toNumber(stats.successfulChallenges) >= 25,
  preciseAccuser: (stats) => toNumber(stats.challenges) >= 10 && toNumber(stats.challengeAccuracy) >= 0.7,
  falseProphet: (stats) => toNumber(stats.failedChallenges) >= 10,
  twoContessas: (stats) => toNumber(stats.doubleContessaWins) >= 1,
  contessaWall: (stats) => toNumber(stats.condessaBlocks) >= 10,
  fakeContessa: (stats) => toNumber(stats.falseCondessaBluffs) >= 1,
  tirelessAmbassador: (stats) => toNumber(stats.ambassadorExchanges) >= 10,
  attentiveInquisitor: (stats) => toNumber(stats.inquisitorInspections) >= 10,
  movingCourt: (stats) => toNumber(stats.actions) >= 100,
  nobleScore: (stats) => toNumber(stats.rankScore) >= 500,
  declaredDuke: (stats) => toNumber(stats.dukeTaxes) >= 25,
  closedGates: (stats) => toNumber(stats.foreignAidBlocks) >= 10,
  imaginaryDuke: (stats) => toNumber(stats.taxBluffs) >= 10,
  captainPatrol: (stats) => toNumber(stats.captainBlocks) >= 10,
  alertDiplomat: (stats) => toNumber(stats.ambassadorBlocks) >= 10,
  heavySevenCoins: (stats) => toNumber(stats.forcedCoups) >= 5,
  firstVoice: (stats) => toNumber(stats.winsAsFirstPlayer) >= 1,
  fullTableThrone: (stats) => toNumber(stats.winsAgainstFivePlayers) >= 1,
  noCoinsNoFear: (stats) => toNumber(stats.winsWithNoCoins) >= 1,
  lightningCoup: (stats) => toNumber(stats.fastestWins) >= 1,
  courtMarathon: (stats) => toNumber(stats.longestGamesWon) >= 1,
  coldRevenge: (stats) => toNumber(stats.revengeWins) >= 1,
  perfectJudgment: (stats) => toNumber(stats.flawlessChallenges) >= 1,
  courtMasks: (stats) => toNumber(stats.allRolesClaimedWins) >= 1
});

export const RANKED_3D_ACHIEVEMENT_KEYS = Object.freeze(
  Object.keys(RANKED_3D_ACHIEVEMENT_REQUIREMENTS)
);

// Mantem conquistas ja desbloqueadas e aplica novos requisitos sobre rankedStats.
export function evaluateRanked3dAchievements(stats = {}) {
  const unlocked = { ...(stats.unlockedAchievements || {}) };
  Object.entries(RANKED_3D_ACHIEVEMENT_REQUIREMENTS).forEach(([key, requirement]) => {
    if (unlocked[key] || requirement(stats)) unlocked[key] = true;
  });
  return unlocked;
}

export function countUnlockedRanked3dAchievements(stats = {}) {
  const unlocked = evaluateRanked3dAchievements(stats);
  return RANKED_3D_ACHIEVEMENT_KEYS.filter((key) => unlocked[key]).length;
}

// Retorna somente conquistas que passaram de bloqueadas para desbloqueadas nesta atualizacao.
export function getNewlyUnlockedRanked3dAchievements(previousUnlocked = {}, nextUnlocked = {}) {
  return RANKED_3D_ACHIEVEMENT_KEYS.filter((key) => (
    nextUnlocked[key] && !previousUnlocked[key]
  ));
}
