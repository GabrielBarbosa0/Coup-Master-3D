import { ROLE_DEFINITIONS, SETTINGS } from './ranked-3d-actions.js';
import { getRanked3dPlayers } from './ranked-3d-engine.js';
import {
  createRanked3dTableLayout,
  getRankedCoinId,
  getRankedCoinType,
  getRankedCardRotation as getRankedSeatCardRotation,
  getRankedPlayerAngle
} from './ranked-3d-table-layout.js';

const TABLE_PLAYER_COUNT = SETTINGS.maxPlayers;
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
  const activeUid = rankedState?.status === 'active'
    ? rankedState?.turnOrder?.[rankedState?.turnIndex] || null
    : null;
  const activePlayer = activeUid ? rankedState?.players?.[activeUid] : null;
  const cards = [];
  const deck = createRankedDeckCards(rankedState);
  const tablePlayers = createTablePlayers(players);
  const cemeteryInfluences = getCemeteryInfluences(players);
  const layout = createRanked3dTableLayout({ cemeteryCount: cemeteryInfluences.length });

  players.forEach((player) => {
    const influences = Array.isArray(player.influences) ? player.influences : [];
    influences.forEach((influence, index) => {
      const cemeteryIndex = influence.revealed
        ? cemeteryInfluences.findIndex((entry) => entry.influence.id === influence.id)
        : -1;
      const card = createRankedInfluenceCard(player, influence, index, localUid, layout, cemeteryIndex);
      if (!card) return;

      const playerEntry = tablePlayers[player.seat - 1];
      if (playerEntry && card.data.owner) {
        playerEntry.cards.push(card.data);
      }
      cards.push(card);
    });
  });

  const exchangeCards = createRankedExchangeCards(rankedState, localUid, layout);
  cards.push(...exchangeCards);
  const examineCard = createRankedExamineCard(rankedState, localUid, players, layout);
  if (examineCard) cards.push(examineCard);

  return {
    version: 1,
    mode: 'ranked',
    deckConfig: createRankedDeckConfig(rankedState),
    alternativeRuleDraw: null,
    deck,
    deckTransform: createDeckTransform(layout.deck),
    objectId: 1,
    stackId: 1,
    players: tablePlayers,
    tableCards: cards
      .map((entry) => entry.data)
      .filter((data) => data.location === 'table'),
    cards,
    objects: createRankedCoinObjects(players, layout),
    stacks: createCemeteryStack(cards, layout.cemetery),
    ranked3d: {
      status: rankedState?.status || null,
      phase: rankedState?.phase || null,
      turnNumber: Number(rankedState?.turnNumber) || 0,
      turnIndex: Number(rankedState?.turnIndex) || 0,
      activeUid,
      activeSeat: Number(activePlayer?.seat) || null,
      winnerUid: rankedState?.winnerUid || null,
      updatedAt: Number(rankedState?.updatedAt) || null,
      coinBalances: tablePlayers.map((player) => player.coinCount),
      publicReveals: createRankedPublicReveals(rankedState, players),
      exchange: createRankedExchangePresentation(rankedState, localUid, players),
      examine: createRankedExaminePresentation(rankedState, localUid, players),
      layout
    }
  };
}

// Projeta somente para o dono as opcoes privadas de uma troca ativa.
function createRankedExchangePresentation(rankedState, localUid, players) {
  const pending = rankedState?.pendingExchange;
  if (!pending || pending.playerUid !== localUid) return null;
  const player = players.find((entry) => entry.uid === pending.playerUid);
  if (!player?.seat) return null;

  const options = (pending.options || []).map((card) => ({ id: card.id, role: card.role }));
  return {
    key: `${pending.playerUid}:${Number(pending.keepCount) || 0}:${options.map((card) => card.id).join('|')}`,
    seat: player.seat,
    keepCount: Number(pending.keepCount) || 0,
    options
  };
}

// Mantem a carta investigada privada para o inquisidor, inclusive na apresentacao 3D.
function createRankedExaminePresentation(rankedState, localUid, players) {
  const pending = rankedState?.pendingExamine;
  if (!pending || pending.actorUid !== localUid) return null;
  const target = players.find((entry) => entry.uid === pending.targetUid);
  if (!target?.seat || !pending.cardId || !pending.role) return null;

  return {
    actorUid: pending.actorUid,
    targetUid: pending.targetUid,
    targetSeat: target.seat,
    cardId: pending.cardId,
    role: pending.role
  };
}

// Coloca as cartas temporarias da troca numa area privada entre a mao e o centro da mesa.
function createRankedExchangeCards(rankedState, localUid, layout) {
  const exchange = createRankedExchangePresentation(rankedState, localUid, getRanked3dPlayers(rankedState));
  if (!exchange) return [];
  const anchor = layout.seats[exchange.seat - 1]?.exchange;
  if (!anchor) return [];

  return exchange.options.map((card, index) => ({
    data: {
      id: `ranked-${card.id}`,
      type: card.role,
      folder: 'base',
      faceUp: true,
      location: 'table',
      owner: null,
      rankedExchange: true,
      rankedOwnerSeat: exchange.seat,
      rankedOwnerUid: localUid,
      rankedCardId: card.id,
      rankedRole: card.role,
      rankedRevealed: false
    },
    position: getRankedExchangeCardPosition(anchor, exchange.seat, index, exchange.options.length),
    quaternion: quaternionFromRotationY(getRankedHandCardRotation(exchange.seat, index, exchange.options.length))
  }));
}

// Cria uma copia temporaria e privada da influencia examinada na area de revelacao do alvo.
function createRankedExamineCard(rankedState, localUid, players, layout) {
  const examine = createRankedExaminePresentation(rankedState, localUid, players);
  if (!examine) return null;
  const reveal = layout.seats[examine.targetSeat - 1]?.reveal;
  if (!reveal) return null;

  return {
    data: {
      id: `ranked-examine-${examine.cardId}`,
      type: examine.role,
      folder: 'base',
      faceUp: true,
      location: 'table',
      owner: null,
      rankedExamine: true,
      rankedOwnerSeat: examine.targetSeat,
      rankedOwnerUid: examine.targetUid,
      rankedCardId: examine.cardId,
      rankedRole: examine.role,
      rankedRevealed: false
    },
    position: { x: reveal.x, y: reveal.y, z: reveal.z },
    quaternion: quaternionFromRotationY(reveal.rotationY)
  };
}

// Acrescenta o assento aos eventos publicos que acionam a apresentacao em mesa.
function createRankedPublicReveals(rankedState, players) {
  const seatsByUid = new Map(players.map((player) => [player.uid, player.seat]));
  return (rankedState?.publicReveals || [])
    .map((reveal) => ({
      sequence: Number(reveal?.sequence) || 0,
      playerUid: reveal?.playerUid || null,
      playerName: reveal?.playerName || '',
      seat: Number(seatsByUid.get(reveal?.playerUid)) || null,
      role: reveal?.role || null,
      cardId: reveal?.cardId || null,
      replacementCardId: reveal?.replacementCardId || null,
      kind: reveal?.kind || 'reveal'
    }))
    .filter((reveal) => reveal.sequence > 0 && reveal.seat && reveal.role && reveal.cardId)
    .sort((left, right) => left.sequence - right.sequence);
}

// Cria uma moeda visivel por unidade do saldo, posicionada perto do dono.
function createRankedCoinObjects(players, layout) {
  return players.flatMap((player) => {
    const coinSlots = layout.seats[player.seat - 1]?.coinArea?.slots || [];
    const coinCount = Math.min(Math.max(0, Number(player.coins) || 0), coinSlots.length);

    return coinSlots.slice(0, coinCount).map((slot, index) => ({
      id: getRankedCoinId(player.seat, index),
      kind: `${getRankedCoinType(index)}-coin`,
      position: { x: slot.x, y: slot.y, z: slot.z },
      quaternion: quaternionFromRotationY(index * 0.43),
      rankedLocked: false,
      rankedCoinSeat: player.seat
    }));
  });
}

// Lista influencias eliminadas na ordem estavel da mesa para formar o cemiterio.
function getCemeteryInfluences(players) {
  return players.flatMap((player) => (player.influences || [])
    .filter((influence) => influence.revealed)
    .map((influence) => ({ player, influence })));
}

// Cria a transformacao fixa do deck para o centro sozinho ou compartilhado.
function createDeckTransform(point) {
  return {
    position: { x: point.x, y: point.y, z: point.z },
    quaternion: quaternionFromRotationY(point.rotationY)
  };
}

// Agrupa cartas eliminadas em uma pilha publica com hover e inspecao nativos.
function createCemeteryStack(cards, cemetery) {
  const discarded = cards
    .filter((entry) => entry.data.rankedRevealed)
    .map((entry) => entry.data.id);

  if (discarded.length === 0) return [];
  return [{
    id: 'ranked-cemetery',
    faceUp: true,
    cards: discarded,
    position: { x: cemetery.x, y: cemetery.y, z: cemetery.z },
    rotationY: cemetery.rotationY
  }];
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
function createRankedInfluenceCard(player, influence, index, localUid, layout, cemeteryIndex) {
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
    position: isRevealed
      ? getCemeteryCardPosition(layout.cemetery, cemeteryIndex)
      : getRankedCardPosition(player.seat, index, player.influences?.length || 1),
    quaternion: quaternionFromRotationY(getRankedHandCardRotation(player.seat, index, player.influences?.length || 1))
  };
}

// Aproxima a posicao das cartas usando o mesmo anel de maos do tabuleiro 3D.
function getRankedCardPosition(playerSeat, cardIndex, handCount) {
  const angle = getRankedPlayerAngle(playerSeat);
  const rotation = getRankedHandCardRotation(playerSeat);
  const localX = rotateVector2(1, 0, rotation);
  const localZ = rotateVector2(0, 1, rotation);
  const radial = { x: Math.cos(angle), z: Math.sin(angle) };
  const centerIndex = (Math.max(handCount, 1) - 1) / 2;
  const offset = cardIndex - centerIndex;
  const handOffset = 0.1;

  return {
    x: Math.cos(angle) * HAND_RADIUS
      + localX.x * offset * HAND_LADDER_SPACING
      + localZ.x * offset * HAND_LADDER_DEPTH
      + radial.x * handOffset,
    y: CARD_REST_Y + cardIndex * HAND_LADDER_LIFT,
    z: Math.sin(angle) * HAND_RADIUS
      + localX.z * offset * HAND_LADDER_SPACING
      + localZ.z * offset * HAND_LADDER_DEPTH
      + radial.z * handOffset
  };
}

// Mantem a carta eliminada no ponto do cemiterio ate a pilha ser organizada pela mesa.
function getCemeteryCardPosition(cemetery, index) {
  return {
    x: cemetery.x,
    y: cemetery.y + Math.max(index, 0) * HAND_LADDER_LIFT,
    z: cemetery.z
  };
}

// Espalha as opcoes em leque pequeno para que a escolha visual acompanhe o painel privado.
function getRankedExchangeCardPosition(anchor, playerSeat, cardIndex, cardCount) {
  const rotation = getRankedSeatCardRotation(playerSeat);
  const localX = rotateVector2(1, 0, rotation);
  const centerIndex = (Math.max(cardCount, 1) - 1) / 2;
  const offset = cardIndex - centerIndex;
  return {
    x: anchor.x + localX.x * offset * HAND_LADDER_SPACING,
    y: CARD_REST_Y + cardIndex * HAND_LADDER_LIFT,
    z: anchor.z + localX.z * offset * HAND_LADDER_SPACING
  };
}

// Mantem a rotacao das cartas alinhada ao assento.
function getRankedHandCardRotation(playerSeat, cardIndex = null, handCount = null) {
  const baseRotation = getRankedSeatCardRotation(playerSeat);
  if (cardIndex === null || handCount === null || handCount <= 1) return baseRotation;

  const centerIndex = (handCount - 1) / 2;
  return baseRotation + (cardIndex - centerIndex) * HAND_LADDER_ROTATION;
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
