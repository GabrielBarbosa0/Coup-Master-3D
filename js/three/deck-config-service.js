import {
  applyDeckConfigBtn,
  closeConfigModalBtn,
  configModal,
  openDeckConfigBtn,
  settingsModal
} from './dom.js';
import {
  CARD_LIBRARY,
  DEFAULT_DECK_CONFIG
} from './config.js';
import { closeModal, openModal } from './modal-service.js';

const deckConfigState = {
  getDeckConfig: () => ({ ...DEFAULT_DECK_CONFIG }),
  setDeckConfig: () => {},
  canEdit: () => false,
  onApply: () => {}
};

// Configura o modal de baralho, leitura dos inputs e presets rapidos.
function setupDeckConfigService(options = {}) {
  deckConfigState.getDeckConfig = options.getDeckConfig || deckConfigState.getDeckConfig;
  deckConfigState.setDeckConfig = options.setDeckConfig || deckConfigState.setDeckConfig;
  deckConfigState.canEdit = options.canEdit || deckConfigState.canEdit;
  deckConfigState.onApply = options.onApply || deckConfigState.onApply;

  syncDeckConfigInputs();

  openDeckConfigBtn?.addEventListener('click', () => {
    syncDeckConfigInputs();
    closeModal(settingsModal);
    openModal(configModal);
  });

  closeConfigModalBtn?.addEventListener('click', () => {
    closeModal(configModal);
    openModal(settingsModal);
  });

  applyDeckConfigBtn?.addEventListener('click', () => {
    if (!deckConfigState.canEdit()) return;
    deckConfigState.setDeckConfig(readDeckConfigInputs());
    closeModal(configModal);
    deckConfigState.onApply();
  });

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (!deckConfigState.canEdit()) return;
      applyDeckPreset(button.dataset.preset);
    });
  });
}

// Atualiza os inputs do modal com a configuracao ativa.
function syncDeckConfigInputs() {
  const deckConfig = deckConfigState.getDeckConfig() || DEFAULT_DECK_CONFIG;
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    const cardType = input.dataset.card;
    input.value = deckConfig[cardType] ?? 0;
  });
}

// Atualiza controles de baralho conforme permissao do host.
function syncDeckConfigControls(canEdit = deckConfigState.canEdit()) {
  if (openDeckConfigBtn) {
    openDeckConfigBtn.disabled = false;
    openDeckConfigBtn.hidden = false;
    openDeckConfigBtn.removeAttribute('aria-hidden');
  }

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.disabled = !canEdit;
    button.title = canEdit ? '' : 'Apenas o host pode alterar presets.';
  });

  document.querySelectorAll('.card-config-item input').forEach((input) => {
    input.disabled = !canEdit;
    input.title = canEdit ? '' : 'Apenas o host pode editar.';
  });

  if (applyDeckConfigBtn) {
    applyDeckConfigBtn.disabled = !canEdit;
    applyDeckConfigBtn.textContent = canEdit ? 'Aplicar e Resetar Jogo' : 'Apenas o host pode aplicar';
    applyDeckConfigBtn.title = canEdit ? '' : 'Apenas o host pode aplicar esta configuracao.';
  }

  const permissionNote = document.getElementById('deckConfigPermissionNote');
  if (permissionNote) permissionNote.hidden = canEdit;
}

// Limita a quantidade de copias por carta ao intervalo aceito pelo modal.
function clampDeckCopyCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 10);
}

// Le o formulario e devolve uma configuracao normalizada.
function readDeckConfigInputs() {
  const config = { ...DEFAULT_DECK_CONFIG };
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    config[input.dataset.card] = clampDeckCopyCount(input.value);
  });
  return config;
}

// Aplica presets rapidos no modal sem reiniciar a partida imediatamente.
function applyDeckPreset(preset) {
  const baseCards = CARD_LIBRARY.filter(card => card.folder === 'base').map(card => card.type);
  const promoCards = CARD_LIBRARY.filter(card => card.folder === 'promo').map(card => card.type);
  const dlc1Cards = CARD_LIBRARY.filter(card => card.folder === 'dlc1').map(card => card.type);
  const dlc2Cards = CARD_LIBRARY.filter(card => card.folder === 'dlc2').map(card => card.type);

  document.querySelectorAll('.card-config-item input').forEach((input) => {
    const card = input.dataset.card;
    if (preset === 'clear') {
      input.value = 0;
    } else if (preset === 'test') {
      input.value = 1;
    } else if (preset === 'base_promo') {
      input.value = baseCards.includes(card) || promoCards.includes(card) ? 5 : 0;
    } else if (preset === 'base_dlc1') {
      input.value = baseCards.includes(card) || dlc1Cards.includes(card) ? 5 : 0;
    } else if (preset === 'base_dlc2') {
      input.value = baseCards.includes(card) || dlc2Cards.includes(card) ? 5 : 0;
    } else {
      input.value = baseCards.includes(card) ? 5 : 0;
    }
  });
}

export {
  clampDeckCopyCount,
  setupDeckConfigService,
  syncDeckConfigControls,
  syncDeckConfigInputs
};
