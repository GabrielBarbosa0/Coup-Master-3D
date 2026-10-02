import {
  evaluateRanked3dAchievements,
  getNewlyUnlockedRanked3dAchievements
} from './ranked-3d-achievements.js';
import { buildMatchResults } from './ranked-3d-engine.js';
import { PHASES } from './ranked-3d-actions.js';

// Calcula o limite inferior de Wilson para pontuar ranking com confianca estatistica.
export function calculateRanked3dWilsonLowerBound(wins, games) {
  if (!games) return 0;
  const z = 1.96;
  const ratio = wins / games;
  const denominator = 1 + ((z * z) / games);
  const center = ratio + ((z * z) / (2 * games));
  const margin = z * Math.sqrt((ratio * (1 - ratio) + ((z * z) / (4 * games))) / games);
  return Math.max(0, (center - margin) / denominator);
}

// Monta o registro persistido em rankedResults usando o mesmo contrato do Coup Master original.
export function buildRanked3dResultRecord(roomCode, state, committedBy, now = Date.now()) {
  if (!roomCode || state?.status !== PHASES.FINISHED || !state.winnerUid) return null;
  return {
    ...buildMatchResults(state, now),
    roomCode,
    resultKey: `${roomCode}_${state.matchId || state.finishedAt || now}`,
    committedBy: committedBy || null,
    committedAt: now
  };
}

// Acumula as estatisticas de uma partida no perfil ranqueado do jogador.
export function normalizeRanked3dStats(current, player, result, now = Date.now()) {
  const previous = current && typeof current === 'object' ? current : {};
  const countedRooms = previous.countedRooms && typeof previous.countedRooms === 'object'
    ? { ...previous.countedRooms }
    : {};
  const roomCode = result?.roomCode || previous.lastRoomCode || '';
  const resultKey = result?.resultKey || `${roomCode}_${result?.matchId || result?.endedAt || now}`;

  if (countedRooms[resultKey] || (!result?.matchId && roomCode && countedRooms[roomCode])) {
    return {
      ...previous,
      name: player?.name || previous.name || 'Jogador',
      photo: player?.photo || previous.photo || 'assets/img/icons/ghost.svg',
      updatedAt: now
    };
  }

  const match = player?.matchStats || {};
  const matchScore = Number(player?.performanceScore || 0);
  const hadPreviousGames = Number(previous.games || 0) > 0;
  const games = Number(previous.games || 0) + 1;
  const wins = Number(previous.wins || 0) + (player?.won ? 1 : 0);
  const losses = Number(previous.losses || 0) + (player?.won ? 0 : 1);
  const currentWinStreak = player?.won ? Number(previous.currentWinStreak || 0) + 1 : 0;
  const bestWinStreak = Math.max(Number(previous.bestWinStreak || 0), currentWinStreak);
  const successfulChallenges = Number(previous.successfulChallenges || 0) + Number(match.successfulChallenges || 0);
  const challenges = Number(previous.challenges || 0) + Number(match.challenges || 0);
  const winRate = games ? wins / games : 0;
  const challengeAccuracy = challenges ? successfulChallenges / challenges : 0;
  const wilsonScore = calculateRanked3dWilsonLowerBound(wins, games);
  const abandonmentPenaltyPoints = Math.max(0, Number(previous.abandonmentPenaltyPoints || 0));
  const abandonedRooms = previous.abandonedRooms && typeof previous.abandonedRooms === 'object'
    ? { ...previous.abandonedRooms }
    : {};
  countedRooms[resultKey] = result?.endedAt || now;

  const normalized = {
    schemaVersion: 1,
    uid: player?.uid,
    name: player?.name || previous.name || 'Jogador',
    photo: player?.photo || previous.photo || 'assets/img/icons/ghost.svg',
    games,
    wins,
    losses,
    winRate,
    currentWinStreak,
    bestWinStreak,
    rankScore: Math.max(0, Math.round(wilsonScore * 1000) - abandonmentPenaltyPoints),
    confidenceLowerBound: wilsonScore,
    abandonmentPenaltyPoints,
    abandonedMatches: Math.max(0, Number(previous.abandonedMatches || 0)),
    abandonedRooms,
    performancePoints: Number(previous.performancePoints || 0) + matchScore,
    bestMatchScore: hadPreviousGames ? Math.max(Number(previous.bestMatchScore || 0), matchScore) : matchScore,
    worstMatchScore: hadPreviousGames ? Math.min(Number(previous.worstMatchScore || 0), matchScore) : matchScore,
    actions: Number(previous.actions || 0) + Number(match.actions || 0),
    bluffs: Number(previous.bluffs || 0) + Number(match.bluffs || 0),
    provenBluffs: Number(previous.provenBluffs || 0) + Number(match.provenBluffs || 0),
    blockedActions: Number(previous.blockedActions || 0) + Number(match.blockedActions || 0),
    honestGames: Number(previous.honestGames || 0) + (Number(match.bluffs || 0) === 0 ? 1 : 0),
    honestWins: Number(previous.honestWins || 0) + (player?.won && Number(match.bluffs || 0) === 0 ? 1 : 0),
    challenges,
    successfulChallenges,
    failedChallenges: Number(previous.failedChallenges || 0) + Number(match.failedChallenges || 0),
    challengeAccuracy,
    coups: Number(previous.coups || 0) + Number(match.coups || 0),
    assassinations: Number(previous.assassinations || 0) + Number(match.assassinations || 0),
    steals: Number(previous.steals || 0) + Number(match.steals || 0),
    coinsStolen: Number(previous.coinsStolen || 0) + Number(match.coinsStolen || 0),
    perfectBluffWins: Number(previous.perfectBluffWins || 0) + Number(match.perfectBluffWins || 0),
    comebackWins: Number(previous.comebackWins || 0) + Number(match.comebackWins || 0),
    finalInfluenceWins: Number(previous.finalInfluenceWins || 0) + Number(match.finalInfluenceWins || 0),
    perfectWins: Number(previous.perfectWins || 0) + Number(match.perfectWins || 0),
    contestedAssassinsWon: Number(previous.contestedAssassinsWon || 0) + Number(match.contestedAssassinsWon || 0),
    doubleContessaWins: Number(previous.doubleContessaWins || 0) + Number(match.doubleContessaWins || 0),
    condessaBlocks: Number(previous.condessaBlocks || 0) + Number(match.condessaBlocks || 0),
    falseCondessaBluffs: Number(previous.falseCondessaBluffs || 0) + Number(match.falseCondessaBluffs || 0),
    ambassadorExchanges: Number(previous.ambassadorExchanges || 0) + Number(match.ambassadorExchanges || 0),
    inquisitorInspections: Number(previous.inquisitorInspections || 0) + Number(match.inquisitorInspections || 0),
    dukeTaxes: Number(previous.dukeTaxes || 0) + Number(match.dukeTaxes || 0),
    foreignAidBlocks: Number(previous.foreignAidBlocks || 0) + Number(match.foreignAidBlocks || 0),
    taxBluffs: Number(previous.taxBluffs || 0) + Number(match.taxBluffs || 0),
    captainBlocks: Number(previous.captainBlocks || 0) + Number(match.captainBlocks || 0),
    ambassadorBlocks: Number(previous.ambassadorBlocks || 0) + Number(match.ambassadorBlocks || 0),
    forcedCoups: Number(previous.forcedCoups || 0) + Number(match.forcedCoups || 0),
    winsAsFirstPlayer: Number(previous.winsAsFirstPlayer || 0) + Number(match.winsAsFirstPlayer || 0),
    winsAgainstFivePlayers: Number(previous.winsAgainstFivePlayers || 0) + Number(match.winsAgainstFivePlayers || 0),
    winsWithNoCoins: Number(previous.winsWithNoCoins || 0) + Number(match.winsWithNoCoins || 0),
    fastestWins: Number(previous.fastestWins || 0) + Number(match.fastestWins || 0),
    longestGamesWon: Number(previous.longestGamesWon || 0) + Number(match.longestGamesWon || 0),
    revengeWins: Number(previous.revengeWins || 0) + Number(match.revengeWins || 0),
    flawlessChallenges: Number(previous.flawlessChallenges || 0) + Number(match.flawlessChallenges || 0),
    allRolesClaimedWins: Number(previous.allRolesClaimedWins || 0) + Number(match.allRolesClaimedWins || 0),
    lastRoomCode: roomCode,
    lastMatchAt: result?.endedAt || now,
    countedRooms,
    updatedAt: now
  };

  const previousUnlocked = previous.unlockedAchievements || {};
  normalized.unlockedAchievements = evaluateRanked3dAchievements({
    ...normalized,
    unlockedAchievements: previousUnlocked
  });
  normalized.latestResultKey = resultKey;
  normalized.latestUnlockedAchievementKeys = getNewlyUnlockedRanked3dAchievements(
    previousUnlocked,
    normalized.unlockedAchievements
  );
  normalized.latestUnlockedAchievements = Object.fromEntries(
    normalized.latestUnlockedAchievementKeys.map((key) => [key, true])
  );
  if (normalized.latestUnlockedAchievementKeys.length) normalized.latestUnlockedAt = now;
  return normalized;
}
