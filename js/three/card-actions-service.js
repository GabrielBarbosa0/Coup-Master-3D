import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CARD_REST_Y,
  CARD_RETURN_COOLDOWN_MS,
  HAND_LADDER_DEPTH,
  HAND_LADDER_LIFT,
  HAND_LADDER_ROTATION,
  HAND_LADDER_SPACING,
  OBJECT_ROTATION_STEP
} from './config.js';

const cardActions = {
  app: null,
  state: null,
  addCardToTableStack: null,
  autoShuffleDeckAfterReturn: null,
  clearPointerHover: null,
  findCompatibleTableStack: null,
  getDeckReturnPosition: null,
  getPlayerAngle: null,
  getPlayerSeatPosition: null,
  isPublicSlotCard: null,
  placeCard: null,
  playVfx: null,
  random: null,
  refreshCardMaterial: null,
  removeCardFromTableStack: null,
  scheduleTableSync: null,
  setPieceSensor: null,
  tossTo: null,
  updateHud: null
};

// Configura dependencias usadas pelas acoes e movimentos de cartas.
function setupCardActionsService(options) {
  Object.assign(cardActions, options);
}

// Normaliza um assento para eventos locais ou remotos de cartas.
function resolveActionPlayerId(playerId, activePlayer, playerCount) {
  const id = Number(playerId);
  if (Number.isInteger(id) && id >= 1 && id <= playerCount) return id;
  return activePlayer;
}

// Monta o payload sincronizavel para uma compra de carta.
function createDrawCardActionPayload(playerId, cardData, animateDraw, cloneCardData) {
  return {
    playerId,
    card: cloneCardData(cardData),
    animateDraw: Boolean(animateDraw)
  };
}

// Verifica se uma carta comum pode tentar voltar para o baralho.
function canReturnCardToDeck(card) {
  return Boolean(card && card.data.location !== 'deck' && !card.data.specialCard);
}

// Aplica o cooldown compartilhado da devolucao de cartas.
function canReturnCardNow(card, lastReturnAt, now = performance.now()) {
  if (!canReturnCardToDeck(card)) return false;
  return now - lastReturnAt >= CARD_RETURN_COOLDOWN_MS;
}

// Monta o payload sincronizavel para devolucao animada ao baralho.
function createReturnCardActionPayload(card, cloneCardData) {
  return {
    cardId: card.id,
    card: cloneCardData(card.data)
  };
}

// Resolve se a carta selecionada deve virar sozinha ou como pilha.
function getSelectedFlipTarget(card, getCardStack) {
  if (!card || card.data.location === 'deck') return null;

  const stack = getCardStack(card);
  if (stack && stack.cards.length > 1) {
    return {
      type: 'stack',
      stack
    };
  }

  return {
    type: 'card',
    card
  };
}

// Converte a direcao do atalho/botao no delta padrao de rotacao.
function getRotationDelta(direction) {
  return direction * OBJECT_ROTATION_STEP;
}

// Classifica o alvo de rotacao sem executar efeitos de cena/fisica.
function getRotationTarget(piece) {
  if (!piece) return null;
  if (piece.kind === 'deck') return { type: 'deck', piece };
  if (piece.data) return { type: 'card', piece };
  if (piece.body && piece.mesh) return { type: 'object', piece };
  return null;
}

// Cancela arrasto e devolve a carta ao local de origem.
function restoreDraggedCard(card) {
  const { app, setPieceSensor } = cardActions;
  setPieceSensor(card, false);

  const origin = app.dragOrigin;
  if (!origin) {
    moveCardToTable(card);
    return;
  }

  if (origin.owner) {
    layoutPlayerHand(origin.owner, 0.12);
    return;
  }

  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setLinvel({ x: 0, y: -0.15, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// Move uma carta para a mao de um jogador.
function moveCardToPlayer(card, playerId) {
  const {
    isPublicSlotCard,
    refreshCardMaterial,
    scheduleTableSync,
    setPieceSensor,
    state,
    updateHud
  } = cardActions;

  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = playerId;
  card.data.location = `player-${playerId}`;
  if (!isPublicSlotCard(card.data)) {
    card.data.faceUp = true;
  }
  state.players[playerId - 1].cards.push(card.data);
  refreshCardMaterial(card);

  if (oldOwner && oldOwner !== playerId) layoutPlayerHand(oldOwner, 0.12);
  layoutPlayerHand(playerId, 0.22);
  updateHud();
  scheduleTableSync();
}

// Solta a carta na mesa ou agrupa em pilha compativel.
function moveCardToTable(card) {
  const {
    addCardToTableStack,
    findCompatibleTableStack,
    random,
    refreshCardMaterial,
    scheduleTableSync,
    setPieceSensor,
    state,
    updateHud
  } = cardActions;

  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'table';
  state.tableCards.push(card.data);
  refreshCardMaterial(card);

  const pos = card.mesh.position.clone();
  const stack = findCompatibleTableStack(card, pos);
  if (stack) {
    addCardToTableStack(card, stack);
    if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
    updateHud();
    scheduleTableSync();
    return;
  }

  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setTranslation({ x: pos.x, y: 0.28, z: pos.z }, true);
  card.body.setRotation(card.mesh.quaternion, true);
  card.body.setLinvel({ x: random(-0.25, 0.25), y: -0.4, z: random(-0.25, 0.25) }, true);
  card.body.setAngvel({ x: random(-0.2, 0.2), y: random(-0.55, 0.55), z: random(-0.2, 0.2) }, true);
  card.target = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
  updateHud();
  scheduleTableSync();
}

// Remove a carta da cena e devolve seus dados ao deck.
function returnCardToDeck(card) {
  const {
    app,
    autoShuffleDeckAfterReturn,
    clearPointerHover,
    scheduleTableSync,
    setPieceSensor,
    state,
    updateHud
  } = cardActions;

  clearPointerHover();
  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'deck';
  card.data.faceUp = false;
  state.deck.push(card.data);

  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
  autoShuffleDeckAfterReturn();
  updateHud();
  scheduleTableSync();
}

// Anima uma carta voltando ao deck antes de inseri-la no baralho.
function animateCardReturnToDeck(card) {
  const {
    app,
    clearPointerHover,
    getDeckReturnPosition,
    playVfx,
    refreshCardMaterial,
    setPieceSensor,
    tossTo,
    updateHud
  } = cardActions;

  if (!app.deckMesh) {
    returnCardToDeck(card);
    return;
  }

  clearPointerHover();
  setPieceSensor(card, true);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'returning-deck';
  card.data.faceUp = false;
  refreshCardMaterial(card);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);

  const target = getDeckReturnPosition();
  playVfx('card-whoosh');
  tossTo(card, target, app.deckMesh.rotation.y, 0.42, () => {
    finalizeAnimatedCardReturn(card);
  });
  updateHud();
}

// Conclui a devolucao animada, removendo a carta visual e atualizando o deck.
function finalizeAnimatedCardReturn(card) {
  const {
    app,
    autoShuffleDeckAfterReturn,
    scheduleTableSync,
    setPieceSensor,
    state,
    updateHud
  } = cardActions;

  if (!app.cards.has(card.id)) return;

  setPieceSensor(card, false);
  card.data.owner = null;
  card.data.location = 'deck';
  card.data.faceUp = false;
  state.deck.push(card.data);

  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  autoShuffleDeckAfterReturn();
  updateHud();
  scheduleTableSync();
}

// Remove a carta de maos, mesa e pilhas antes de mover.
function removeCardFromCollections(card) {
  const {
    removeCardFromTableStack,
    state
  } = cardActions;

  removeCardFromTableStack(card);
  state.tableCards = state.tableCards.filter(data => data.id !== card.id);
  state.players.forEach((player) => {
    player.cards = player.cards.filter(data => data.id !== card.id);
  });
}

// Remove cartas auxiliares da mesa, como Asilo e Religiao.
function removeSpecialCard(card) {
  const {
    app,
    clearPointerHover,
    scheduleTableSync,
    updateHud
  } = cardActions;

  if (!card?.data.specialCard) return;

  clearPointerHover();
  removeCardFromCollections(card);
  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  updateHud();
  scheduleTableSync();
}

// Organiza e anima as cartas da mao de um jogador.
function layoutPlayerHand(playerId, lift = 0.16) {
  const {
    app,
    placeCard,
    state,
    tossTo
  } = cardActions;

  const player = state.players[playerId - 1];
  if (!player) return;

  player.cards.forEach((data, index) => {
    const card = app.cards.get(data.id);
    if (!card) return;

    const target = getHandCardPosition(playerId, index, player.cards.length);
    const rotationY = getHandRotation(playerId, index, player.cards.length);
    if (lift <= 0) {
      placeCard(card, target, rotationY, false);
      return;
    }

    tossTo(card, target, rotationY, lift);
  });
}

// Calcula a posicao de uma carta dentro da mao.
function getHandCardPosition(playerId, cardIndex, handCount = null) {
  const {
    getPlayerAngle,
    getPlayerSeatPosition,
    state
  } = cardActions;

  const seat = getPlayerSeatPosition(playerId);
  const player = state.players[playerId - 1];
  const count = Math.max(handCount ?? player.cards.length, 1);
  const angle = getPlayerAngle(playerId);
  const rotation = getHandRotation(playerId);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0));
  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
  const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const centerIndex = (count - 1) / 2;
  const offset = cardIndex - centerIndex;
  const base = new THREE.Vector3(seat.x, CARD_REST_Y, seat.z);

  base.add(localX.multiplyScalar(offset * HAND_LADDER_SPACING));
  base.add(localZ.multiplyScalar(offset * HAND_LADDER_DEPTH));
  base.add(radial.multiplyScalar(0.1));
  base.y += cardIndex * HAND_LADDER_LIFT;

  return base;
}

// Calcula a rotacao de uma carta na mao do jogador.
function getHandRotation(playerId, cardIndex = null, handCount = null) {
  const baseRotation = -cardActions.getPlayerAngle(playerId) - Math.PI / 2;
  if (cardIndex === null || handCount === null || handCount <= 1) return baseRotation;

  const centerIndex = (handCount - 1) / 2;
  return baseRotation + (cardIndex - centerIndex) * HAND_LADDER_ROTATION;
}

export {
  animateCardReturnToDeck,
  canReturnCardNow,
  canReturnCardToDeck,
  createDrawCardActionPayload,
  createReturnCardActionPayload,
  finalizeAnimatedCardReturn,
  getHandCardPosition,
  getHandRotation,
  getRotationDelta,
  getRotationTarget,
  getSelectedFlipTarget,
  layoutPlayerHand,
  moveCardToPlayer,
  moveCardToTable,
  removeCardFromCollections,
  removeSpecialCard,
  restoreDraggedCard,
  returnCardToDeck,
  resolveActionPlayerId,
  setupCardActionsService
};
