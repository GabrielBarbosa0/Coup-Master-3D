import { ROLE_DEFINITIONS, SETTINGS } from './ranked-3d-actions.js';
import { getRanked3dPlayers } from './ranked-3d-engine.js';

const TABLE_PLAYER_COUNT = 8;
const HAND_RADIUS = 3.08;
const CARD_REST_Y = 0.068;
const HAND_LADDER_SPACING = 0.36;
const HAND_LADDER_DEPTH = 0.075;
const HAND_LADDER_LIFT = 0.012;
const HAND_LADDER_ROTATION = 0.035;

const RANKED_DECK_CONFIG = Object.freeze(
  Object.fromEntries(Object.keys(ROLE_DEFINITIONS).map((role) => [
    role,
    role === 'embaixador' || role === 'inquisidor' ? 0 : SETTINGS.cardsPerRole
  ]))
);

// Converte o estado do motor ranqueado em um snapshot aceito pela mesa 3D.
export function createRanked3dTableState(rankedState, options = {}) {
  const players = getRanked3dPlayers(rankedState);
  const localUid = options.localUid || null;
  const cards = [];
  const deck = createRankedDeckCards(rankedState);
  const tablePlayers = createTablePlayers(players);

  players.forEach((player) => {
    const influences = Array.isArray(player.influences) ? player.influences : [];
    influences.forEach((influence, index) => {
      const card = createRankedInfluenceCard(player, influence, index, localUid);
      if (!card) return;

      const playerEntry = tablePlayers[player.seat - 1];
      if (playerEntry && card.data.owner) {
        playerEntry.cards.push(card.data);
      }
      cards.push(card);
    });
  });

  return {
    version: 1,
    mode: 'ranked',
    deckConfig: createRankedDeckConfig(rankedState),
    alternativeRuleDraw: null,
    deck,
    deckTransform: null,
    objectId: 1,
    stackId: 1,
    players: tablePlayers,
    tableCards: cards
      .map((entry) => entry.data)
      .filter((data) => data.location === 'table'),
    cards,
    objects: [],
    stacks: [],
    ranked3d: {
      status: rankedState?.status || null,
      phase: rankedState?.phase || null,
      turnNumber: Number(rankedState?.turnNumber) || 0,
      turnIndex: Number(rankedState?.turnIndex) || 0,
      activeUid: rankedState?.turnOrder?.[rankedState?.turnIndex] || null,
      winnerUid: rankedState?.winnerUid || null,
      updatedAt: Number(rankedState?.updatedAt) || null
    }
  };
}

// Cria slots da mesa com moedas do estado ranqueado.
function createTablePlayers(rankedPlayers) {
  const bySeat = new Map(rankedPlayers.map((player) => [player.seat, player]));
  return Array.from({ length: TABLE_PLAYER_COUNT }, (_, index) => {
    const seat = index + 1;
    const player = bySeat.get(seat);
    return {
      id: seat,
      coinCount: Math.max(0, Number(player?.coins) || 0),
      cards: []
    };
  });
}

// Mantem no deck visual apenas cartas fechadas que ainda estao no baralho.
function createRankedDeckCards(rankedState) {
  return (rankedState?.deck || []).map((card, index) => ({
    id: `ranked-deck-${card.id || index + 1}`,
    type: card.role || 'duque',
    folder: 'base',
    faceUp: false,
    location: 'deck',
    owner: null,
    rankedCardId: card.id || null,
    rankedRole: card.role || null
  }));
}

// Reflete qual variante de troca foi sorteada pelo motor.
function createRankedDeckConfig(rankedState) {
  const config = { ...RANKED_DECK_CONFIG };
  if (rankedState?.exchangeRole === 'embaixador') {
    config.embaixador = SETTINGS.cardsPerRole;
  } else if (rankedState?.exchangeRole === 'inquisidor') {
    config.inquisidor = SETTINGS.cardsPerRole;
  }
  return config;
}

// Cria uma carta de influencia para a mao do dono ou mesa publica quando revelada.
function createRankedInfluenceCard(player, influence, index, localUid) {
  if (!player?.seat || !influence?.id || !influence?.role) return null;

  const isRevealed = Boolean(influence.revealed);
  const isLocalPlayer = Boolean(localUid && player.uid === localUid);
  const isPrivateVisible = isLocalPlayer && !isRevealed;
  const owner = isRevealed ? null : player.seat;
  const location = isRevealed ? 'table' : `player-${player.seat}`;

  const data = {
    id: `ranked-${influence.id}`,
    type: influence.role,
    folder: 'base',
    faceUp: isRevealed || isPrivateVisible,
    location,
    owner,
    rankedOwnerSeat: player.seat,
    rankedOwnerUid: player.uid,
    rankedCardId: influence.id,
    rankedRole: influence.role,
    rankedRevealed: isRevealed
  };

  return {
    data,
    position: getRankedCardPosition(player.seat, index, player.influences?.length || 1, isRevealed),
    quaternion: quaternionFromRotationY(getRankedCardRotation(player.seat, index, player.influences?.length || 1))
  };
}

// Aproxima a posicao das cartas usando o mesmo anel de maos do tabuleiro 3D.
function getRankedCardPosition(playerSeat, cardIndex, handCount, isRevealed) {
  const angle = getPlayerAngle(playerSeat);
  const rotation = getRankedCardRotation(playerSeat);
  const localX = rotateVector2(1, 0, rotation);
  const localZ = rotateVector2(0, 1, rotation);
  const radial = { x: Math.cos(angle), z: Math.sin(angle) };
  const centerIndex = (Math.max(handCount, 1) - 1) / 2;
  const offset = cardIndex - centerIndex;
  const revealOffset = isRevealed ? 0.38 : 0.1;

  return {
    x: Math.cos(angle) * HAND_RADIUS
      + localX.x * offset * HAND_LADDER_SPACING
      + localZ.x * offset * HAND_LADDER_DEPTH
      + radial.x * revealOffset,
    y: CARD_REST_Y + cardIndex * HAND_LADDER_LIFT,
    z: Math.sin(angle) * HAND_RADIUS
      + localX.z * offset * HAND_LADDER_SPACING
      + localZ.z * offset * HAND_LADDER_DEPTH
      + radial.z * revealOffset
  };
}

// Mantem a rotacao das cartas alinhada ao assento.
function getRankedCardRotation(playerSeat, cardIndex = null, handCount = null) {
  const baseRotation = -getPlayerAngle(playerSeat) - Math.PI / 2;
  if (cardIndex === null || handCount === null || handCount <= 1) return baseRotation;

  const centerIndex = (handCount - 1) / 2;
  return baseRotation + (cardIndex - centerIndex) * HAND_LADDER_ROTATION;
}

function getPlayerAngle(playerSeat) {
  return -Math.PI / 2 + ((playerSeat - 1) / TABLE_PLAYER_COUNT) * Math.PI * 2;
}

function rotateVector2(x, z, rotationY) {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    x: x * cos + z * sin,
    z: -x * sin + z * cos
  };
}

function quaternionFromRotationY(rotationY) {
  const half = rotationY / 2;
  return {
    x: 0,
    y: Math.sin(half),
    z: 0,
    w: Math.cos(half)
  };
}
