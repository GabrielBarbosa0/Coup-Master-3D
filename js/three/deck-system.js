import {
  CARD_D,
  CARD_LIBRARY,
  DECK_STACK_GAP
} from './config.js';

// Monta e embaralha o baralho a partir da configuracao atual.
function buildDeck(deckConfig, clampDeckCopyCount) {
  const cards = [];
  let id = 1;

  CARD_LIBRARY.forEach((def) => {
    const totalCopies = clampDeckCopyCount(deckConfig[def.type]);
    for (let copy = 0; copy < totalCopies; copy++) {
      cards.push({
        id: `card-${id++}`,
        type: def.type,
        folder: def.folder,
        faceUp: false,
        location: 'deck',
        owner: null
      });
    }
  });

  return shuffle(cards);
}

// Retira do deck a carta solicitada pelo evento ou a carta do topo local.
function takeDeckCard(deck, cardData = null, hasRuntimeCard = () => false, cloneCardData = data => data) {
  if (cardData?.id) {
    const deckIndex = deck.findIndex(data => data.id === cardData.id);
    if (deckIndex >= 0) return deck.splice(deckIndex, 1)[0];
    if (hasRuntimeCard(cardData.id)) return null;
    return cloneCardData(cardData);
  }

  return deck.pop() || null;
}

// Embaralha a ordem interna do deck.
function shuffleDeck(deck) {
  return shuffle(deck);
}

// Retorna a altura visual/fisica atual do deck real.
function getDeckHeight(deck) {
  const layerCount = getVisibleDeckLayerCount(deck);
  if (layerCount <= 1) return CARD_D;
  return layerCount * CARD_D + (layerCount - 1) * DECK_STACK_GAP;
}

// Retorna o espacamento vertical entre cartas reais do deck.
function getDeckLayerStep() {
  return CARD_D + DECK_STACK_GAP;
}

// Limita a altura visual do deck sem alterar a quantidade real de cartas.
function getVisibleDeckLayerCount(deck) {
  return Math.min(deck.length, 8);
}

// Embaralha uma lista usando Fisher-Yates.
function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export {
  buildDeck,
  getDeckHeight,
  getDeckLayerStep,
  getVisibleDeckLayerCount,
  shuffle,
  shuffleDeck,
  takeDeckCard
};
