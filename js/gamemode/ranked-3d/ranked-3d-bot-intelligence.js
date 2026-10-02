import {
  ACTIONS,
  PHASES,
  ROLES,
  SETTINGS,
  getAction,
  isActionAvailable,
  isRoleAvailable
} from './ranked-3d-actions.js';
import {
  challengeAction,
  challengeBlock,
  completeExamine,
  completeExchange,
  countInfluences,
  declareBlock,
  getActionTargets,
  getActiveUid,
  getAlivePlayers,
  getBlockClaimsForPlayer,
  getPlayer,
  getPlayers,
  getResponseUids,
  loseInfluence,
  normalizeState,
  passResponse,
  performAction,
  revealChallenge
} from './ranked-3d-engine.js';

const BOT_DECISION_MIN_DELAY_MS = 3060;
const BOT_DECISION_RANDOM_DELAY_MS = 1020;
const BOT_RESPONSE_MIN_DELAY_MS = 1200;
const BOT_RESPONSE_RANDOM_DELAY_MS = 1400;
const BOT_RESPONSE_DEADLINE_BUFFER_MS = 650;
const OPENING_ROUND_CHALLENGE_MULTIPLIER = 0.12;

// Porta a estrategia de IA do Coup Master original para o motor ranqueado 3D.
export function applyNextRanked3dBotDecision(state, now = Date.now(), random = Math.random) {
  normalizeState(state);
  if (state.status !== 'active') return false;

  if (state.phase === PHASES.TURN) {
    const bot = getPlayer(state, getActiveUid(state));
    if (!bot?.ai || bot.eliminated) return false;
    const action = chooseRanked3dBotAction(state, bot, random);
    if (!action?.type) return false;
    performAction(state, bot.uid, action.type, action.targetUid, now);
    return true;
  }

  if (state.phase === PHASES.RESPONSE) {
    const pending = state.pendingAction;
    const responseUids = getResponseUids(state);
    const bots = getAlivePlayers(state).filter((player) => (
      player.ai && responseUids.includes(player.uid)
    ));
    const bot = chooseRandomResponder(bots, random);
    if (!bot) return false;

    const blockClaim = chooseRanked3dBotBlockClaim(state, bot, random);
    if (blockClaim) {
      declareBlock(state, bot.uid, blockClaim, now);
      return true;
    }

    const isSelfTarget = pending?.targetUid === bot.uid;
    if (pending?.claim && !pending.claimConfirmed
      && shouldChallengeClaim(state, bot, pending.claim, pending.actorUid, isSelfTarget, random)) {
      challengeAction(state, bot.uid, now);
      return true;
    }

    passResponse(state, bot.uid, now);
    return true;
  }

  if (state.phase === PHASES.BLOCK_CHALLENGE) {
    const pending = state.pendingAction;
    const blockerUid = pending?.block?.uid;
    const bots = getAlivePlayers(state).filter((player) => (
      player.ai && player.uid !== blockerUid && !pending?.passes?.[player.uid]
    ));
    const bot = chooseRandomResponder(bots, random);
    if (!bot) return false;

    if (shouldChallengeClaim(state, bot, pending.block.claim, blockerUid, pending.actorUid === bot.uid, random)) {
      challengeBlock(state, bot.uid, now);
    } else {
      passResponse(state, bot.uid, now);
    }
    return true;
  }

  if (state.phase === PHASES.CHALLENGE_REVEAL) {
    const challenge = state.pendingAction?.challenge;
    const bot = getPlayer(state, challenge?.playerUid);
    if (!bot?.ai || now < challenge.revealAfter) return false;
    const card = bot.influences.find((item) => !item.revealed && item.role === challenge.claim)
      || chooseInfluenceToLose(bot);
    if (!card) return false;
    revealChallenge(state, bot.uid, card.id, now);
    return true;
  }

  if (state.phase === PHASES.INFLUENCE_LOSS) {
    const bot = getPlayer(state, state.pendingLoss?.playerUid);
    const card = bot?.ai ? chooseInfluenceToLose(bot) : null;
    if (!card) return false;
    loseInfluence(state, bot.uid, card.id, now);
    return true;
  }

  if (state.phase === PHASES.EXCHANGE) {
    const bot = getPlayer(state, state.pendingExchange?.playerUid);
    if (!bot?.ai) return false;
    completeExchange(state, bot.uid, chooseExchangeCards(state.pendingExchange), now);
    return true;
  }

  if (state.phase === PHASES.EXAMINE) {
    const bot = getPlayer(state, state.pendingExamine?.actorUid);
    if (!bot?.ai) return false;
    const { skepticism } = getBotPersonality(bot);
    const strongRole = [ROLES.ASSASSIN, ROLES.CAPTAIN, ROLES.DUKE].includes(state.pendingExamine.role);
    completeExamine(state, bot.uid, strongRole && random() < 0.45 + skepticism * 0.35, now);
    return true;
  }

  return false;
}

export function hasPendingRanked3dBotDecision(state, now = Date.now()) {
  if (!state || state.status !== 'active') return false;
  if (now < (state.revealPresentation?.endsAt || 0)) return false;
  if (state.phase === PHASES.TURN) return Boolean(getPlayer(state, getActiveUid(state))?.ai);
  if (state.phase === PHASES.RESPONSE) {
    const responseUids = getResponseUids(state);
    return getAlivePlayers(state).some((player) => (
      player.ai && responseUids.includes(player.uid)
    ));
  }
  if (state.phase === PHASES.BLOCK_CHALLENGE) {
    const pending = state.pendingAction;
    const blockerUid = pending?.block?.uid;
    return getAlivePlayers(state).some((player) => (
      player.ai && player.uid !== blockerUid && !pending?.passes?.[player.uid]
    ));
  }
  if (state.phase === PHASES.CHALLENGE_REVEAL) return Boolean(getPlayer(state, state.pendingAction?.challenge?.playerUid)?.ai);
  if (state.phase === PHASES.INFLUENCE_LOSS) return Boolean(getPlayer(state, state.pendingLoss?.playerUid)?.ai);
  if (state.phase === PHASES.EXCHANGE) return Boolean(getPlayer(state, state.pendingExchange?.playerUid)?.ai);
  if (state.phase === PHASES.EXAMINE) return Boolean(getPlayer(state, state.pendingExamine?.actorUid)?.ai);
  return false;
}

export function getRanked3dBotDecisionDelay(state, now = Date.now(), random = Math.random) {
  if (state?.phase === PHASES.CHALLENGE_REVEAL) {
    return Math.max(0, Number(state.pendingAction?.challenge?.revealAfter || now) - now);
  }
  if ([PHASES.RESPONSE, PHASES.BLOCK_CHALLENGE].includes(state?.phase)) {
    const randomizedDelay = BOT_RESPONSE_MIN_DELAY_MS
      + Math.floor(random() * BOT_RESPONSE_RANDOM_DELAY_MS);
    const availableTime = Number(state.deadline || 0) - now - BOT_RESPONSE_DEADLINE_BUFFER_MS;
    return Math.max(100, Math.min(randomizedDelay, availableTime));
  }
  return BOT_DECISION_MIN_DELAY_MS + Math.floor(random() * BOT_DECISION_RANDOM_DELAY_MS);
}

export function chooseRanked3dBotAction(state, bot, random = Math.random) {
  const stealTarget = chooseTarget(state, bot, 'steal', random);
  const attackTarget = chooseTarget(state, bot, 'assassinate', random);

  if (bot.coins >= SETTINGS.mandatoryCoupCoins) {
    return { type: ACTIONS.COUP, targetUid: attackTarget?.uid || stealTarget?.uid || null };
  }

  if (bot.coins >= 7 && attackTarget && random() < 0.48) {
    return { type: ACTIONS.COUP, targetUid: attackTarget.uid };
  }

  const bluff = chooseProfitableBluff(state, bot, stealTarget, attackTarget, random);
  if (bluff) return bluff;
  if (shouldClaimRole(state, bot, ROLES.DUKE, 1.2, random)) return { type: ACTIONS.TAX, targetUid: null };

  if (stealTarget && shouldClaimRole(state, bot, ROLES.CAPTAIN, 1, random)) {
    return { type: ACTIONS.STEAL, targetUid: stealTarget.uid };
  }

  if (bot.coins >= 3 && attackTarget && shouldClaimRole(state, bot, ROLES.ASSASSIN, 0.85, random)) {
    return { type: ACTIONS.ASSASSINATE, targetUid: attackTarget.uid };
  }

  if (isActionAvailable(state, ACTIONS.EXAMINE)
    && shouldClaimRole(state, bot, ROLES.INQUISITOR, 0.7, random) && attackTarget && random() < 0.45) {
    return { type: ACTIONS.EXAMINE, targetUid: attackTarget.uid };
  }

  if (isActionAvailable(state, ACTIONS.EXCHANGE_AMBASSADOR)
    && shouldClaimRole(state, bot, ROLES.AMBASSADOR, 0.7, random)) {
    return { type: ACTIONS.EXCHANGE_AMBASSADOR, targetUid: null };
  }

  if (isActionAvailable(state, ACTIONS.EXCHANGE_INQUISITOR)
    && shouldClaimRole(state, bot, ROLES.INQUISITOR, 0.55, random)) {
    return { type: ACTIONS.EXCHANGE_INQUISITOR, targetUid: null };
  }

  const knownDukes = getKnownRoleCount(state, ROLES.DUKE);
  const { skepticism } = getBotPersonality(bot);
  if (knownDukes >= SETTINGS.cardsPerRole || random() > (0.32 + skepticism * 0.22)) {
    return { type: ACTIONS.FOREIGN_AID, targetUid: null };
  }

  return { type: ACTIONS.INCOME, targetUid: null };
}

export function chooseRanked3dBotBlockClaim(state, bot, random = Math.random) {
  const claims = getBlockClaimsForPlayer(state, bot.uid);
  if (!claims.length) return null;
  if (isHandKnownByOpponent(state, bot)) {
    return claims.find((claim) => hasRole(bot, claim)) || null;
  }
  if (shouldStayOutOfConflict(state, bot)) {
    if (state.pendingAction.type !== ACTIONS.STEAL || !claims.includes(ROLES.CAPTAIN)) return null;
    const favors = getFavorStrength(state, bot);
    const ownedCaptain = hasRole(bot, ROLES.CAPTAIN);
    const { honesty } = getBotPersonality(bot);
    const caution = countInfluences(bot) === 1 ? 0.35 : 1;
    const chance = ownedCaptain
      ? Math.min(0.7, 0.06 + favors * 0.24)
      : (0.005 + favors * 0.035) * (1 - honesty);
    return random() < chance * caution ? ROLES.CAPTAIN : null;
  }
  const owned = claims.find((role) => hasRole(bot, role));
  const facingAssassination = state.pendingAction?.type === ACTIONS.ASSASSINATE
    && state.pendingAction.targetUid === bot.uid;
  if (facingAssassination && owned === ROLES.CONTESSA) return owned;
  if (owned && random() > 0.08) return owned;
  const { honesty } = getBotPersonality(bot);
  if (facingAssassination && hiddenInfluences(bot).length > 1) {
    const attackerStats = state.matchStats?.[state.pendingAction.actorUid] || {};
    const challenges = Math.min(8, Math.max(0, Number(attackerStats.challenges) || 0));
    const chance = 0.18 * ((1 - honesty) ** 0.9) / (1 + challenges * 0.3);
    return random() < chance ? ROLES.CONTESSA : null;
  }
  const defenseWeight = facingAssassination && hiddenInfluences(bot).length === 1 ? 0.9 : 0.7;
  const bluffChance = ((1 - honesty) ** 0.9) * defenseWeight;
  return random() < bluffChance ? claims[Math.floor(random() * claims.length)] : null;
}

function getBotPersonality(player) {
  const personality = player?.personality || {};
  return {
    vengefulness: Math.max(0, Math.min(100, Number(personality.vengefulness ?? 50))) / 100,
    honesty: Math.max(0, Math.min(100, Number(personality.honesty ?? 50))) / 100,
    skepticism: Math.max(0, Math.min(100, Number(personality.skepticism ?? 50))) / 100
  };
}

function hiddenInfluences(player) {
  return (player?.influences || []).filter((card) => !card.revealed);
}

function hasRole(player, role) {
  return hiddenInfluences(player).some((card) => card.role === role);
}

function isHandKnownByOpponent(state, player) {
  const hidden = hiddenInfluences(player);
  if (!hidden.length) return false;
  if (hidden.length > 1 && new Set(hidden.map((card) => card.role)).size < hidden.length) return false;
  return Object.entries(player.investigationExposure || {}).some(([observerUid, exposure]) => {
    const observer = getPlayer(state, observerUid);
    return observer && !observer.eliminated && hidden.every((card) => exposure?.[card.id] === card.role);
  });
}

function getKnownRoleCount(state, role) {
  const discarded = (state.discard || []).filter((card) => card.role === role).length;
  const revealed = getPlayers(state).reduce((total, player) => (
    total + (player.influences || []).filter((card) => card.revealed && card.role === role).length
  ), 0);
  return discarded + revealed;
}

function shouldClaimRole(state, player, role, multiplier = 1, random = Math.random) {
  if (hasRole(player, role)) return random() > 0.08;
  if (isHandKnownByOpponent(state, player)) return false;
  const { honesty } = getBotPersonality(player);
  const bluffChance = ((1 - honesty) ** 1.5) * 0.38 * multiplier;
  return random() < bluffChance;
}

function getTargetScore(bot, target, purpose = 'default', random = Math.random) {
  const { vengefulness, skepticism } = getBotPersonality(bot);
  const grudge = Number(bot.grudges?.[target.uid] || 0) * vengefulness * 4;
  const danger = hiddenInfluences(target).length * 3 + Number(target.coins || 0);
  const coinValue = purpose === 'steal' ? Number(target.coins || 0) * 3 : 0;
  const contessaRisk = purpose === 'assassinate' && skepticism < 0.5 ? -2 : 0;
  return danger + grudge + coinValue + contessaRisk + random() * 2;
}

function chooseTarget(state, bot, purpose, random = Math.random) {
  const candidates = getActionTargets(state, bot.uid, purpose === 'steal' ? ACTIONS.STEAL : null);
  if (!candidates.length) return null;
  return candidates
    .map((target) => ({ target, score: getTargetScore(bot, target, purpose, random) }))
    .sort((left, right) => right.score - left.score)[0].target;
}

function chooseProfitableBluff(state, bot, stealTarget, attackTarget, random = Math.random) {
  if (isHandKnownByOpponent(state, bot)) return null;
  const { honesty } = getBotPersonality(bot);
  const caution = hiddenInfluences(bot).length === 1 ? 0.85 : 1;
  if (random() >= 0.65 * ((1 - honesty) ** 0.85) * caution) return null;
  const candidates = [
    { type: ACTIONS.TAX, targetUid: null, weight: 3 },
    ...(stealTarget ? [{ type: ACTIONS.STEAL, targetUid: stealTarget.uid, weight: 3 }] : []),
    ...(bot.coins >= 3 && attackTarget ? [{
      type: ACTIONS.ASSASSINATE,
      targetUid: attackTarget.uid,
      weight: hiddenInfluences(attackTarget).length === 1 ? 4 : 2
    }] : [])
  ].filter((action) => isActionAvailable(state, action.type)
    && !hasRole(bot, getAction(action.type).claim));
  let draw = random() * candidates.reduce((sum, action) => sum + action.weight, 0);
  for (const action of candidates) {
    draw -= action.weight;
    if (draw < 0) return { type: action.type, targetUid: action.targetUid };
  }
  return null;
}

function shouldStayOutOfConflict(state, bot) {
  const pending = state.pendingAction;
  return Boolean(pending?.targetUid && pending.targetUid !== bot.uid && pending.actorUid !== bot.uid);
}

function getFavorStrength(state, bot) {
  return Math.min(3, Math.max(0, Number(bot.favors?.[state.pendingAction?.targetUid]) || 0));
}

function getChallengeCautionMultiplier(state, claim) {
  const openingTurnCount = Math.max(1, state.turnOrder?.length || getAlivePlayers(state).length);
  const isOpeningRound = Number(state.turnNumber || 0) <= openingTurnCount;
  if (!isOpeningRound) return 1;
  const ambassadorCannotBeInAnInitialHand = claim === ROLES.AMBASSADOR
    && isRoleAvailable(state, claim)
    && !state.hasPostDealCardDraw;
  return ambassadorCannotBeInAnInitialHand ? 1 : OPENING_ROUND_CHALLENGE_MULTIPLIER;
}

function shouldChallengeClaim(state, bot, claim, actorUid, isSelfTarget = false, random = Math.random) {
  if (!claim || !actorUid) return false;
  if (!isRoleAvailable(state, claim)) return true;
  const openingCaution = getChallengeCautionMultiplier(state, claim);
  if (shouldStayOutOfConflict(state, bot)) {
    if (state.phase === PHASES.BLOCK_CHALLENGE) return false;
    const caution = countInfluences(bot) === 1 ? 0.25 : 1;
    return random() < (0.015 + getFavorStrength(state, bot) * 0.04) * caution * openingCaution;
  }
  const facingAssassination = state.phase === PHASES.RESPONSE
    && state.pendingAction?.type === ACTIONS.ASSASSINATE
    && state.pendingAction.targetUid === bot.uid && actorUid === state.pendingAction.actorUid;
  if (facingAssassination && hiddenInfluences(bot).length > 1) {
    if (hasRole(bot, ROLES.CONTESSA)) return false;
    const known = new Set([
      ...(state.discard || []),
      ...getPlayers(state).flatMap((player) => (player.influences || [])
        .filter((card) => card.revealed || player.uid === bot.uid))
    ].filter((card) => card.role === claim).map((card) => card.id));
    if (known.size >= SETTINGS.cardsPerRole) return true;
    const { skepticism } = getBotPersonality(bot);
    const publicStats = state.matchStats?.[actorUid] || {};
    const exposedBluffs = Math.min(3, Math.max(0, Number(publicStats.provenBluffs) || 0));
    const successfulAttacks = Math.min(4, Math.max(0, Number(publicStats.assassinations) || 0));
    const chance = (0.03 + skepticism * 0.07 + exposedBluffs * 0.025)
      / (1 + successfulAttacks * 0.25);
    return random() < chance * openingCaution;
  }
  if (getKnownRoleCount(state, claim) >= SETTINGS.cardsPerRole) return true;
  const { skepticism } = getBotPersonality(bot);
  const actor = getPlayer(state, actorUid);
  const grudge = Number(bot.grudges?.[actorUid] || 0) * 0.025;
  const pressure = isSelfTarget ? 0.28 : 0.08;
  const actorIsRich = actor?.coins >= SETTINGS.mandatoryCoupCoins ? -0.08 : 0;
  const chance = (skepticism ** 2) * 0.42 + pressure + grudge + actorIsRich;
  return random() < Math.max(0.02, Math.min(0.82, chance)) * openingCaution;
}

function chooseInfluenceToLose(player) {
  const roleValue = {
    [ROLES.AMBASSADOR]: 1,
    [ROLES.INQUISITOR]: 2,
    [ROLES.DUKE]: 3,
    [ROLES.CAPTAIN]: 4,
    [ROLES.ASSASSIN]: 4,
    [ROLES.CONTESSA]: 5
  };
  return hiddenInfluences(player)
    .map((card) => ({ card, value: roleValue[card.role] || 1 }))
    .sort((left, right) => left.value - right.value)[0]?.card || null;
}

function chooseExchangeCards(pending) {
  const roleValue = {
    [ROLES.CONTESSA]: 6,
    [ROLES.ASSASSIN]: 5,
    [ROLES.CAPTAIN]: 4,
    [ROLES.DUKE]: 4,
    [ROLES.INQUISITOR]: 3,
    [ROLES.AMBASSADOR]: 2
  };
  return (pending.options || [])
    .slice()
    .sort((left, right) => (roleValue[right.role] || 1) - (roleValue[left.role] || 1))
    .slice(0, pending.keepCount)
    .map((card) => card.id);
}

function chooseRandomResponder(players, random = Math.random) {
  if (!players.length) return null;
  return players[Math.floor(random() * players.length)];
}
