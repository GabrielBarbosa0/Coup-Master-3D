import * as THREE from 'three';
import {
  CARD_D,
  CARD_REST_Y,
  TABLE_STACK_GAP,
  TABLE_STACK_MERGE_RADIUS,
  TABLE_STACK_RADIUS
} from './config.js';

const stackSystem = {
  getStacks: null,
  setStacks: null,
  getCards: null,
  getTableCards: null,
  createStackId: null
};

// Configura acessos ao estado vivo de pilhas sem acoplar o modulo ao app inteiro.
export function setupStackSystem(options) {
  stackSystem.getStacks = options.getStacks;
  stackSystem.setStacks = options.setStacks;
  stackSystem.getCards = options.getCards;
  stackSystem.getTableCards = options.getTableCards;
  stackSystem.createStackId = options.createStackId;
}

// Retorna a pilha a que uma carta pertence, se houver.
export function getCardStack(card) {
  if (!card?.data.stackId) return null;
  return getStacks().find(stack => stack.id === card.data.stackId) || null;
}

// Resolve qual carta esta no topo de uma pilha.
export function getTopStackCard(card) {
  const stack = getCardStack(card);
  if (!stack || stack.cards.length === 0) return card;
  return getCards().get(stack.cards[stack.cards.length - 1]) || card;
}

// Procura uma pilha de mesa ja existente com mesmo lado visivel e proximidade.
export function findExistingCompatibleTableStack(card, position) {
  if (card.data.specialCard) return null;

  return getStacks().find((stack) => {
    if (stack.faceUp !== card.data.faceUp) return false;
    return getPlanarDistance(stack.position, position) < TABLE_STACK_RADIUS;
  }) || null;
}

// Procura uma carta solta compativel para iniciar uma nova pilha.
export function findCompatibleLooseStackBaseCard(card, position) {
  if (card.data.specialCard) return null;

  const targetData = getTableCards().find((data) => {
    if (data.id === card.id || data.stackId || data.faceUp !== card.data.faceUp) return false;
    if (data.specialCard) return false;

    const target = getCards().get(data.id);
    if (!target) return false;
    return getPlanarDistance(target.mesh.position, position) < TABLE_STACK_RADIUS;
  });

  return targetData ? getCards().get(targetData.id) : null;
}

// Cria o registro logico de uma nova pilha a partir de uma carta base.
export function createTableStack(baseCard) {
  const stack = {
    id: stackSystem.createStackId(),
    faceUp: baseCard.data.faceUp,
    cards: [baseCard.id],
    position: baseCard.mesh.position.clone(),
    rotationY: baseCard.mesh.rotation.y
  };

  baseCard.data.stackId = stack.id;
  getStacks().push(stack);
  return stack;
}

// Procura outra pilha com mesma orientacao para receber a pilha arrastada.
export function findCompatibleTableStackForStack(sourceStack) {
  if (!sourceStack) return null;

  return getStacks().find((stack) => {
    if (stack.id === sourceStack.id) return false;
    if (stack.faceUp !== sourceStack.faceUp) return false;
    return getPlanarDistance(stack.position, sourceStack.position) < TABLE_STACK_MERGE_RADIUS;
  }) || null;
}

// Remove uma pilha do estado compartilhado.
export function removeTableStack(stack) {
  setStacks(getStacks().filter(item => item.id !== stack.id));
}

// Remove cartas inexistentes do registro de pilha.
export function pruneStackCards(stack) {
  stack.cards = stack.cards.filter(id => getCards().has(id));
  return stack.cards;
}

// Retorna a posicao de uma carta em uma camada da pilha.
export function getStackCardPosition(stack, index, extraY = 0) {
  return new THREE.Vector3(
    stack.position.x,
    getStackCardY(index, extraY),
    stack.position.z
  );
}

// Retorna a translacao kinematica para uma carta em uma camada da pilha.
export function getStackCardTranslation(stack, index) {
  return {
    x: stack.position.x,
    y: getStackCardY(index),
    z: stack.position.z
  };
}

// Resume uma pilha aberta por quantidade de personagens.
export function getStackHoverLabel(stack, labels) {
  const counts = new Map();
  stack.cards.forEach((id) => {
    const card = getCards().get(id);
    if (!card) return;
    const label = labels[card.data.type] || card.data.type;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, count]) => `${label} ${count}`)
    .join('\n');
}

// Verifica se uma pilha tem cartas suficientes para acoes de grupo.
export function hasStackGroup(stack) {
  return Boolean(stack && stack.cards.length > 1);
}

// Retorna o ID da carta no topo da pilha.
export function getTopStackCardId(stack) {
  if (!stack?.cards.length) return null;
  return stack.cards[stack.cards.length - 1];
}

// Decide o que acontece quando uma pilha arrastada e solta.
export function resolveStackDropAction({ stack, isOverDeck, targetStack }) {
  if (isOverDeck && !stack.faceUp) return 'return-to-deck';
  if (isOverDeck && stack.faceUp) return 'restore-origin';
  if (targetStack) return 'merge';
  return 'layout';
}

// Limpa qualquer timer pendente relacionado a uma pilha.
export function clearStackTimer(stack, timers, clearTimeoutFn = window.clearTimeout) {
  if (!stack) return false;

  const timer = timers.get(stack.id);
  if (!timer) return false;

  clearTimeoutFn(timer);
  timers.delete(stack.id);
  return true;
}

// Cria uma copia estavel dos IDs de uma pilha antes de remover/embaralhar.
export function getStackCardIds(stack) {
  return Array.isArray(stack?.cards) ? stack.cards.slice() : [];
}

// Embaralha uma pilha garantindo que a ordem mude quando possivel.
export function getNextShuffledStackOrder(stack, shuffleFn) {
  const currentOrder = getStackCardIds(stack);
  if (currentOrder.length <= 1) return currentOrder;

  const nextOrder = shuffleFn(currentOrder.slice());
  if (nextOrder.every((id, index) => id === currentOrder[index])) {
    nextOrder.push(nextOrder.shift());
  }

  return nextOrder;
}

// Remove uma carta da pilha e retorna se a pilha deve ser dissolvida.
export function removeCardIdFromStack(stack, cardId) {
  if (!stack) return false;

  stack.cards = stack.cards.filter(id => id !== cardId);
  return stack.cards.length <= 1;
}

// Valida se uma pilha pode virar em grupo.
export function canFlipStack(stack, cards) {
  return hasStackGroup(stack) && !cards.some(card => card.flip);
}

// Calcula a proxima orientacao comum da pilha.
export function getNextStackFaceUp(stack) {
  return !stack.faceUp;
}

// Retorna a distancia no plano XZ entre dois pontos.
function getPlanarDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Calcula a altura de uma camada dentro de uma pilha.
function getStackCardY(index, extraY = 0) {
  return CARD_REST_Y + index * (CARD_D + TABLE_STACK_GAP) + extraY;
}

function getStacks() {
  return stackSystem.getStacks();
}

function setStacks(stacks) {
  stackSystem.setStacks(stacks);
}

function getCards() {
  return stackSystem.getCards();
}

function getTableCards() {
  return stackSystem.getTableCards();
}
