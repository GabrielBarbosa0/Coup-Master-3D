import {
  CARD_RETURN_COOLDOWN_MS,
  OBJECT_ROTATION_STEP
} from './config.js';

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

export {
  canReturnCardNow,
  canReturnCardToDeck,
  createDrawCardActionPayload,
  createReturnCardActionPayload,
  getRotationDelta,
  getRotationTarget,
  getSelectedFlipTarget,
  resolveActionPlayerId
};
