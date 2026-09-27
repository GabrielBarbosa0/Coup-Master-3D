// Verifica se uma pilha tem cartas suficientes para acoes de grupo.
function hasStackGroup(stack) {
  return Boolean(stack && stack.cards.length > 1);
}

// Retorna o ID da carta no topo da pilha.
function getTopStackCardId(stack) {
  if (!stack?.cards.length) return null;
  return stack.cards[stack.cards.length - 1];
}

// Decide o que acontece quando uma pilha arrastada e solta.
function resolveStackDropAction({ stack, isOverDeck, targetStack }) {
  if (isOverDeck && !stack.faceUp) return 'return-to-deck';
  if (isOverDeck && stack.faceUp) return 'restore-origin';
  if (targetStack) return 'merge';
  return 'layout';
}

// Limpa qualquer timer pendente relacionado a uma pilha.
function clearStackTimer(stack, timers, clearTimeoutFn = window.clearTimeout) {
  if (!stack) return false;

  const timer = timers.get(stack.id);
  if (!timer) return false;

  clearTimeoutFn(timer);
  timers.delete(stack.id);
  return true;
}

// Cria uma copia estavel dos IDs de uma pilha antes de remover/embaralhar.
function getStackCardIds(stack) {
  return Array.isArray(stack?.cards) ? stack.cards.slice() : [];
}

// Embaralha uma pilha garantindo que a ordem mude quando possivel.
function getNextShuffledStackOrder(stack, shuffleFn) {
  const currentOrder = getStackCardIds(stack);
  if (currentOrder.length <= 1) return currentOrder;

  const nextOrder = shuffleFn(currentOrder.slice());
  if (nextOrder.every((id, index) => id === currentOrder[index])) {
    nextOrder.push(nextOrder.shift());
  }

  return nextOrder;
}

// Remove uma carta da pilha e retorna se a pilha deve ser dissolvida.
function removeCardIdFromStack(stack, cardId) {
  if (!stack) return false;

  stack.cards = stack.cards.filter(id => id !== cardId);
  return stack.cards.length <= 1;
}

// Valida se uma pilha pode virar em grupo.
function canFlipStack(stack, cards) {
  return hasStackGroup(stack) && !cards.some(card => card.flip);
}

// Calcula a proxima orientacao comum da pilha.
function getNextStackFaceUp(stack) {
  return !stack.faceUp;
}

export {
  canFlipStack,
  clearStackTimer,
  getNextShuffledStackOrder,
  getNextStackFaceUp,
  getStackCardIds,
  getTopStackCardId,
  hasStackGroup,
  removeCardIdFromStack,
  resolveStackDropAction
};
