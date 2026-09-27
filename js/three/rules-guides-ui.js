import { ALT_RULE_IMAGES, RULE_CARD_GROUPS } from './config.js';
import {
  altRuleBackImg,
  altRuleCounter,
  altRuleFlipCard,
  altRuleFrontImg,
  altRulesBtn,
  altRulesModal,
  closeAltRulesBtn,
  closeRuleCardsBtn,
  infoBtn,
  ruleBackImg,
  ruleCardsCounter,
  ruleCardsModal,
  ruleFlipCard,
  ruleFrontImg
} from './dom.js';
import { playVfx } from './audio-service.js';
import { closeModal, openModal } from './modal-service.js';

const guideState = {
  getDeckConfig: () => ({}),
  ruleImages: [],
  ruleImageIndex: 0,
  altRuleIndex: 0
};

// Liga os modais de guias e regras alternativas aos botoes do HUD.
export function setupRulesGuidesUi(options = {}) {
  if (typeof options.getDeckConfig === 'function') {
    guideState.getDeckConfig = options.getDeckConfig;
  }

  infoBtn?.addEventListener('click', openRuleCardsModal);
  altRulesBtn?.addEventListener('click', openAltRulesModal);

  closeRuleCardsBtn?.addEventListener('click', () => {
    closeModal(ruleCardsModal);
  });
  ruleFlipCard?.addEventListener('click', () => stepRuleCard(1));
  ruleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepRuleCard(1);
    }
  });

  closeAltRulesBtn?.addEventListener('click', () => closeModal(altRulesModal));
  altRuleFlipCard?.addEventListener('click', () => stepAltRuleCard(1));
  altRuleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepAltRuleCard(1);
    }
  });
}

// Abre o modal com o carrossel de regras alternativas.
function openAltRulesModal() {
  guideState.altRuleIndex = 0;
  altRuleFlipCard?.classList.remove('is-flipped');
  syncAltRuleImages();
  openModal(altRulesModal);
}

// Avança ou volta no carrossel das regras alternativas.
function stepAltRuleCard(direction) {
  guideState.altRuleIndex = (guideState.altRuleIndex + direction + ALT_RULE_IMAGES.length) % ALT_RULE_IMAGES.length;
  playVfx('card-whoosh');
  altRuleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncAltRuleImages, 260);
}

// Mantém a carta alternativa atual, a próxima face e o contador sincronizados.
function syncAltRuleImages() {
  const currentImage = ALT_RULE_IMAGES[guideState.altRuleIndex];
  const nextImage = ALT_RULE_IMAGES[(guideState.altRuleIndex + 1) % ALT_RULE_IMAGES.length];
  const currentAlt = `Regra alternativa ${guideState.altRuleIndex + 1}`;
  const nextAlt = `Regra alternativa ${(guideState.altRuleIndex + 1) % ALT_RULE_IMAGES.length + 1}`;

  if (altRuleFlipCard?.classList.contains('is-flipped')) {
    if (altRuleBackImg) {
      altRuleBackImg.src = currentImage;
      altRuleBackImg.alt = currentAlt;
    }
    if (altRuleFrontImg) {
      altRuleFrontImg.src = nextImage;
      altRuleFrontImg.alt = nextAlt;
    }
  } else {
    if (altRuleFrontImg) {
      altRuleFrontImg.src = currentImage;
      altRuleFrontImg.alt = currentAlt;
    }
    if (altRuleBackImg) {
      altRuleBackImg.src = nextImage;
      altRuleBackImg.alt = nextAlt;
    }
  }

  if (altRuleCounter) {
    altRuleCounter.textContent = `${guideState.altRuleIndex + 1} / ${ALT_RULE_IMAGES.length}`;
  }
}

// Abre o modal de variações com as cartas calculadas pela configuração do baralho.
function openRuleCardsModal() {
  guideState.ruleImages = calculateRuleImages();
  guideState.ruleImageIndex = 0;
  ruleFlipCard?.classList.remove('is-flipped');
  syncRuleCardImages();
  openModal(ruleCardsModal);
}

// Avança ou volta no carrossel de cartas de regra.
function stepRuleCard(direction) {
  if (!guideState.ruleImages.length) return;
  guideState.ruleImageIndex = (
    guideState.ruleImageIndex
    + direction
    + guideState.ruleImages.length
  ) % guideState.ruleImages.length;
  playVfx('card-whoosh');
  ruleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncRuleCardImages, 260);
}

// Mantém frente, verso e contador coerentes com a posição atual do carrossel.
function syncRuleCardImages() {
  if (!guideState.ruleImages.length) return;

  const currentImage = guideState.ruleImages[guideState.ruleImageIndex];
  const nextImage = guideState.ruleImages[(guideState.ruleImageIndex + 1) % guideState.ruleImages.length];
  const currentAlt = getRuleCardAlt(currentImage);
  const nextAlt = getRuleCardAlt(nextImage);

  if (ruleFlipCard?.classList.contains('is-flipped')) {
    if (ruleBackImg) {
      ruleBackImg.src = currentImage;
      ruleBackImg.alt = currentAlt;
    }
    if (ruleFrontImg) {
      ruleFrontImg.src = nextImage;
      ruleFrontImg.alt = nextAlt;
    }
  } else {
    if (ruleFrontImg) {
      ruleFrontImg.src = currentImage;
      ruleFrontImg.alt = currentAlt;
    }
    if (ruleBackImg) {
      ruleBackImg.src = nextImage;
      ruleBackImg.alt = nextAlt;
    }
  }

  if (ruleCardsCounter) {
    ruleCardsCounter.textContent = `${guideState.ruleImageIndex + 1} / ${guideState.ruleImages.length}`;
  }
}

// Escolhe as cartas de regra apenas para os grupos ativos no baralho.
function calculateRuleImages() {
  const hasBase = hasConfiguredCards(RULE_CARD_GROUPS.base);
  const hasPromo = hasConfiguredCards(RULE_CARD_GROUPS.promo);
  const hasRevolution = hasConfiguredCards(RULE_CARD_GROUPS.revolution);
  const hasShadows = hasConfiguredCards(RULE_CARD_GROUPS.shadows);

  const images = [];
  if (hasBase) {
    images.push(hasRevolution
      ? 'assets/img/guides/front-actions-alternative.png'
      : 'assets/img/guides/front-actions.png');
  }

  if (hasPromo) images.push('assets/img/guides/dlc-actions.png');
  if (hasRevolution) images.push('assets/img/guides/dlc2-actions.png');
  if (hasShadows) images.push('assets/img/guides/dlc3-actions.png');

  images.push('assets/img/guides/back-actions.png');
  return images;
}

// Verifica se pelo menos uma carta de um grupo está ativa na configuração.
function hasConfiguredCards(cards) {
  const deckConfig = guideState.getDeckConfig() || {};
  return cards.some(card => (deckConfig[card] || 0) > 0);
}

// Cria um texto acessível para a carta de regra exibida.
function getRuleCardAlt(path) {
  if (path.includes('front-actions-alternative')) return 'Regras alternativas dos personagens base';
  if (path.includes('front-actions')) return 'Regras dos personagens base';
  if (path.includes('dlc-actions')) return 'Regras de Sombras do Palácio';
  if (path.includes('dlc2-actions')) return 'Regras da Revolução';
  if (path.includes('dlc3-actions')) return 'Regras de Sombras do Asilo';
  return 'Resumo de turno';
}
