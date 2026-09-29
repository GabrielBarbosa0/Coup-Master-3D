import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  beginAggregateDrag
} from './interaction-drag-controller.js';
import {
  clearStackTimer,
  getNextShuffledStackOrder,
  getStackCardIds,
  getTopStackCardId,
  hasStackGroup,
  removeCardIdFromStack,
  resolveStackDropAction
} from './stack-system.js';

const tableStack = {
  app: null,
  state: null,
  autoShuffleDeckAfterReturn: null,
  beginDrag: null,
  clearPointerHover: null,
  createTableStackRecord: null,
  findCompatibleLooseStackBaseCard: null,
  findCompatibleTableStackForStack: null,
  findExistingCompatibleTableStack: null,
  getStackCardPosition: null,
  getStackCardTranslation: null,
  isStackOverDeck: null,
  placeCard: null,
  pruneStackCards: null,
  random: null,
  rayToPlane: null,
  refreshCardMaterial: null,
  removeTableStack: null,
  scheduleTableSync: null,
  setPieceSensor: null,
  shuffle: null,
  tossTo: null,
  updateHud: null
};

// Configura dependencias usadas pelas pilhas de cartas da mesa.
function setupTableStackController(options) {
  Object.assign(tableStack, options);
}

// Retira a carta do topo de uma pilha para arrastar.
function startTableStackTopCardDrag(event) {
  const {
    app,
    beginDrag,
    setPieceSensor
  } = tableStack;

  const stack = getPendingTableStack();
  if (!stack) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  const card = app.cards.get(getTopStackCardId(stack));
  if (!card) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  removeCardFromTableStack(card);
  setPieceSensor(card, true);
  beginDrag(event, card, 'card');
  app.selectedCard = card;
  app.hasDragged = true;
  app.dragOrigin = {
    owner: null,
    location: 'table'
  };
  app.pendingStackDrag = null;
}

// Inicia o arrasto de uma pilha inteira de cartas.
function startTableStackDrag(event) {
  const {
    app,
    rayToPlane,
    setPieceSensor
  } = tableStack;

  const stack = getPendingTableStack();
  if (!stack) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  app.pendingStackDrag = null;
  app.dragOrigin = {
    location: 'stack',
    position: stack.position.clone()
  };

  stack.cards.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;
    card.target = null;
    card.flip = null;
    setPieceSensor(card, true);
    card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });

  beginAggregateDrag(event, stack, 'stack', {
    controls: app.controls,
    state: app,
    rayToPlane,
    getPosition: item => item.position
  });
}

// Finaliza o arrasto de pilha, juntando pilhas fechadas ao deck ou pilhas compativeis.
function finishTableStackDrag(stack, event) {
  const {
    app,
    findCompatibleTableStackForStack,
    isStackOverDeck,
    scheduleTableSync,
    setPieceSensor
  } = tableStack;

  const origin = app.dragOrigin;
  app.dragOrigin = null;
  const targetStack = findCompatibleTableStackForStack(stack);
  const action = resolveStackDropAction({
    stack,
    isOverDeck: isStackOverDeck(stack, event),
    targetStack
  });

  if (action === 'return-to-deck') {
    returnTableStackToDeck(stack);
    return;
  }

  if (action === 'restore-origin') {
    if (origin?.position) {
      moveTableStack(stack, origin.position.x, origin.position.z);
    }
  }

  if (action === 'merge') {
    mergeTableStacks(stack, targetStack);
    return;
  }

  stack.cards.forEach((id) => setPieceSensor(app.cards.get(id), false));
  layoutTableStack(stack, false);
  scheduleTableSync();
}

// Busca a pilha associada ao gesto pendente atual.
function getPendingTableStack() {
  const { app } = tableStack;
  if (!app.pendingStackDrag) return null;
  return app.tableStacks.find(stack => stack.id === app.pendingStackDrag.stackId) || null;
}

// Devolve uma pilha fechada inteira ao deck sem revelar suas cartas.
function returnTableStackToDeck(stack) {
  const {
    app,
    autoShuffleDeckAfterReturn,
    clearPointerHover,
    removeTableStack,
    setPieceSensor,
    state,
    updateHud
  } = tableStack;

  clearPointerHover();
  clearStackTimer(stack, app.stackShuffleTimers);

  const ids = getStackCardIds(stack);
  ids.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;

    setPieceSensor(card, false);
    card.target = null;
    card.flip = null;
    card.data.stackId = null;
    card.data.owner = null;
    card.data.location = 'deck';
    card.data.faceUp = false;
    state.deck.push(card.data);

    app.scene.remove(card.mesh);
    app.world.removeRigidBody(card.body);
    app.cards.delete(card.id);
  });

  state.tableCards = state.tableCards.filter(data => !ids.includes(data.id));
  removeTableStack(stack);
  if (app.selectedCard && ids.includes(app.selectedCard.id)) app.selectedCard = null;
  autoShuffleDeckAfterReturn();
  updateHud();
}

// Procura uma pilha de mesa com mesmo lado visivel e proximidade.
function findCompatibleTableStack(card, position) {
  const {
    findCompatibleLooseStackBaseCard,
    findExistingCompatibleTableStack
  } = tableStack;

  const existingStack = findExistingCompatibleTableStack(card, position);
  if (existingStack) return existingStack;

  const baseCard = findCompatibleLooseStackBaseCard(card, position);
  return baseCard ? createTableStack(baseCard) : null;
}

// Cria uma nova pilha de mesa a partir de uma carta base.
function createTableStack(baseCard) {
  const {
    app,
    createTableStackRecord
  } = tableStack;

  const stack = createTableStackRecord(baseCard);
  app.stackId += 1;
  layoutTableStack(stack);
  return stack;
}

// Adiciona carta a uma pilha e realinha o conjunto.
function addCardToTableStack(card, stack) {
  const {
    refreshCardMaterial,
    setPieceSensor,
    state
  } = tableStack;

  setPieceSensor(card, false);
  removeCardFromTableStack(card);
  card.data.stackId = stack.id;
  card.data.owner = null;
  card.data.location = 'table';
  card.data.faceUp = stack.faceUp;
  refreshCardMaterial(card);
  if (!state.tableCards.some(data => data.id === card.id)) {
    state.tableCards.push(card.data);
  }

  if (!stack.cards.includes(card.id)) {
    stack.cards.push(card.id);
  }

  layoutTableStack(stack);
}

// Une duas pilhas de cartas mantendo a pilha solta no topo da pilha alvo.
function mergeTableStacks(sourceStack, targetStack) {
  const {
    app,
    refreshCardMaterial,
    removeTableStack,
    scheduleTableSync,
    setPieceSensor,
    updateHud
  } = tableStack;

  clearStackTimer(sourceStack, app.stackShuffleTimers);

  sourceStack.cards.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;

    setPieceSensor(card, false);
    card.target = null;
    card.flip = null;
    card.data.stackId = targetStack.id;
    card.data.owner = null;
    card.data.location = 'table';
    card.data.faceUp = targetStack.faceUp;
    refreshCardMaterial(card);

    if (!targetStack.cards.includes(id)) {
      targetStack.cards.push(id);
    }
  });

  removeTableStack(sourceStack);
  layoutTableStack(targetStack, true);
  updateHud();
  scheduleTableSync();
}

// Embaralha a ordem de uma pilha de mesa com uma pequena animacao visual.
function shuffleTableStack(stack) {
  const {
    app,
    getStackCardPosition,
    random,
    scheduleTableSync,
    shuffle,
    tossTo,
    updateHud
  } = tableStack;

  if (!hasStackGroup(stack)) return;

  clearStackTimer(stack, app.stackShuffleTimers);

  const currentOrder = getStackCardIds(stack);
  const nextOrder = getNextShuffledStackOrder(stack, shuffle);

  currentOrder.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    const angle = (index / currentOrder.length) * Math.PI * 2 + random(-0.25, 0.25);
    const radius = random(0.05, 0.16);
    const position = getStackCardPosition(stack, index, 0.03);
    position.x += Math.cos(angle) * radius;
    position.z += Math.sin(angle) * radius;

    tossTo(card, position, stack.rotationY + random(-0.35, 0.35), 0.1);
  });

  const timer = window.setTimeout(() => {
    stack.cards = nextOrder;
    layoutTableStack(stack, true);
    app.stackShuffleTimers.delete(stack.id);
    updateHud();
    scheduleTableSync();
  }, 190);

  app.stackShuffleTimers.set(stack.id, timer);
}

// Remove carta de uma pilha e desfaz pilhas com uma carta so.
function removeCardFromTableStack(card) {
  const {
    app,
    removeTableStack,
    setPieceSensor
  } = tableStack;

  setPieceSensor(card, false);
  const stackId = card.data.stackId;
  if (!stackId) return;

  const stack = app.tableStacks.find(item => item.id === stackId);
  card.data.stackId = null;
  if (!stack) return;

  if (removeCardIdFromStack(stack, card.id)) {
    clearStackTimer(stack, app.stackShuffleTimers);
    const remaining = app.cards.get(stack.cards[0]);
    if (remaining) {
      remaining.data.stackId = null;
      remaining.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      remaining.body.setLinvel({ x: 0, y: -0.04, z: 0 }, true);
      remaining.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    removeTableStack(stack);
    return;
  }

  layoutTableStack(stack);
}

// Reposiciona as cartas de uma pilha em camadas.
function layoutTableStack(stack, animateLayout = true) {
  const {
    app,
    getStackCardPosition,
    placeCard,
    tossTo
  } = tableStack;

  tableStack.pruneStackCards(stack);
  stack.cards.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    const position = getStackCardPosition(stack, index);
    if (animateLayout) {
      tossTo(card, position, stack.rotationY, 0.06);
    } else {
      placeCard(card, position, stack.rotationY, false);
    }
  });
}

// Move todas as cartas de uma pilha durante o arrasto.
function moveTableStack(stack, x, z) {
  const {
    app,
    getStackCardTranslation
  } = tableStack;

  stack.position.x = x;
  stack.position.z = z;
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, stack.rotationY, 0));

  stack.cards.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    card.body.setNextKinematicTranslation(getStackCardTranslation(stack, index));
    card.body.setNextKinematicRotation(quat);
  });
}

export {
  addCardToTableStack,
  findCompatibleTableStack,
  finishTableStackDrag,
  getPendingTableStack,
  layoutTableStack,
  mergeTableStacks,
  moveTableStack,
  removeCardFromTableStack,
  returnTableStackToDeck,
  setupTableStackController,
  shuffleTableStack,
  startTableStackDrag,
  startTableStackTopCardDrag
};
