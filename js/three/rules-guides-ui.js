import {
  altRuleCounter,
  altRuleFlipCard,
  altRulesBtn,
  altRulesModal,
  applyRuleSelectionBtn,
  closeAltRulesBtn,
  closeRuleCardsBtn,
  closeRuleDrawBtn,
  infoBtn,
  resetRuleSelectionBtn,
  ruleCardsCounter,
  ruleCardsModal,
  ruleDrawBtn,
  ruleDrawModal,
  ruleDrawSetup,
  ruleFlipCard,
  ruleSelectionCount,
  ruleSelectionList,
  ruleSelectionStatus,
  settingsModal,
  startRuleDrawBtn
} from './dom.js';
import { playVfx } from './audio-service.js';
import { closeModal, openModal } from './modal-service.js';
import {
  ALTERNATIVE_RULES,
  buildAlternativeRulePages,
  clampRuleCount,
  createAlternativeRuleDraw,
  getAlternativeRuleText,
  pickRandomAlternativeRules,
  renderAlternativeRulePage,
  validAlternativeRuleIds
} from './alternative-rules-service.js';
import {
  buildDynamicGuidePages,
  renderDynamicGuidePage
} from './rules-guide-builder.js';

const DEFAULT_RULE_DRAW_COUNT = 5;
const RULE_CARD_BACK_MARKUP = '<img class="rule-guide-card-back" src="assets/img/cards/base/back.png" alt="">';

const guideState = {
  getDeckConfig: () => ({}),
  getAlternativeRuleDraw: () => null,
  setAlternativeRuleDraw: () => {},
  canEditAlternativeRules: () => false,
  onAlternativeRuleDrawChange: () => {},
  getPlayerName: () => 'Host',
  rulePages: [],
  rulePageIndex: 0,
  altRulePages: [],
  altRuleIndex: 0,
  selectedRuleDrawCount: DEFAULT_RULE_DRAW_COUNT,
  selectedRuleIds: [],
  pinnedRuleIds: [],
  savingRules: false
};

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

// Liga os modais de guias, regras alternativas e sorteio aos botoes do HUD.
export function setupRulesGuidesUi(options = {}) {
  if (typeof options.getDeckConfig === 'function') {
    guideState.getDeckConfig = options.getDeckConfig;
  }
  if (typeof options.getAlternativeRuleDraw === 'function') {
    guideState.getAlternativeRuleDraw = options.getAlternativeRuleDraw;
  }
  if (typeof options.setAlternativeRuleDraw === 'function') {
    guideState.setAlternativeRuleDraw = options.setAlternativeRuleDraw;
  }
  if (typeof options.canEditAlternativeRules === 'function') {
    guideState.canEditAlternativeRules = options.canEditAlternativeRules;
  }
  if (typeof options.onAlternativeRuleDrawChange === 'function') {
    guideState.onAlternativeRuleDrawChange = options.onAlternativeRuleDrawChange;
  }
  if (typeof options.getPlayerName === 'function') {
    guideState.getPlayerName = options.getPlayerName;
  }

  infoBtn?.addEventListener('click', openRuleCardsModal);
  altRulesBtn?.addEventListener('click', openAltRulesModal);
  ruleDrawBtn?.addEventListener('click', openRuleDrawModal);

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

  closeRuleDrawBtn?.addEventListener('click', closeRuleDrawModal);
  startRuleDrawBtn?.addEventListener('click', () => publishRuleDraw('random'));
  applyRuleSelectionBtn?.addEventListener('click', () => publishRuleDraw('manual'));
  resetRuleSelectionBtn?.addEventListener('click', () => publishRuleDraw('reset'));
  ruleDrawSetup?.addEventListener('click', handleRuleDrawSetupClick);
  ruleSelectionList?.addEventListener('change', handleRuleSelectionChange);

  window.addEventListener('coup:languagechange', refreshOpenRulesUi);
}

// Abre o modal com todas as regras ou com a selecao sorteada da sala.
function openAltRulesModal() {
  refreshAlternativeRulePages();
  guideState.altRuleIndex = 0;
  altRuleFlipCard?.classList.remove('is-flipped');
  syncAltRuleFaces();
  openModal(altRulesModal);
}

// Avanca o carrossel usando o mesmo efeito de carta girando dos guias.
function stepAltRuleCard(direction) {
  if (!guideState.altRulePages.length) return;
  guideState.altRuleIndex = (
    guideState.altRuleIndex
    + direction
    + guideState.altRulePages.length
  ) % guideState.altRulePages.length;
  playVfx('card-whoosh');
  altRuleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncAltRuleFaces, 260);
}

// Recalcula as paginas das regras alternativas a partir do estado atual da sala.
function refreshAlternativeRulePages() {
  guideState.altRulePages = buildAlternativeRulePages(guideState.getAlternativeRuleDraw());
}

// Mantem frente, verso e contador do modal de regras alternativas sincronizados.
function syncAltRuleFaces() {
  if (!guideState.altRulePages.length || !altRuleFlipCard) return;

  const frontFace = altRuleFlipCard.querySelector('.rule-flip-card-front');
  const backFace = altRuleFlipCard.querySelector('.rule-flip-card-back');
  const currentPage = guideState.altRulePages[guideState.altRuleIndex];
  const nextPage = guideState.altRulePages[(guideState.altRuleIndex + 1) % guideState.altRulePages.length];
  const currentMarkup = renderAlternativeRulePage(currentPage);
  const nextMarkup = renderAlternativeRulePage(nextPage);

  if (guideState.altRulePages.length === 1) {
    if (frontFace) frontFace.innerHTML = currentMarkup;
    if (backFace) backFace.innerHTML = RULE_CARD_BACK_MARKUP;
    if (altRuleCounter) {
      altRuleCounter.textContent = '1 / 1';
    }
    return;
  }

  if (altRuleFlipCard.classList.contains('is-flipped')) {
    if (backFace) backFace.innerHTML = currentMarkup;
    if (frontFace) frontFace.innerHTML = nextMarkup;
  } else {
    if (frontFace) frontFace.innerHTML = currentMarkup;
    if (backFace) backFace.innerHTML = nextMarkup;
  }

  if (altRuleCounter) {
    altRuleCounter.textContent = `${guideState.altRuleIndex + 1} / ${guideState.altRulePages.length}`;
  }
}

// Abre o modal de variações com as cartas calculadas pela configuração do baralho.
function openRuleCardsModal() {
  guideState.rulePages = buildDynamicGuidePages(
    guideState.getDeckConfig(),
    guideState.getAlternativeRuleDraw()
  );
  guideState.rulePageIndex = 0;
  ruleFlipCard?.classList.remove('is-flipped');
  syncRuleCardFaces();
  openModal(ruleCardsModal);
}

// Avança ou volta no carrossel de cartas de regra.
function stepRuleCard(direction) {
  if (!guideState.rulePages.length) return;
  guideState.rulePageIndex = (
    guideState.rulePageIndex
    + direction
    + guideState.rulePages.length
  ) % guideState.rulePages.length;
  playVfx('card-whoosh');
  ruleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncRuleCardFaces, 260);
}

// Mantém frente, verso e contador coerentes com a posição atual do carrossel.
function syncRuleCardFaces() {
  if (!guideState.rulePages.length || !ruleFlipCard) return;

  const frontFace = ruleFlipCard.querySelector('.rule-flip-card-front');
  const backFace = ruleFlipCard.querySelector('.rule-flip-card-back');
  const currentPage = guideState.rulePages[guideState.rulePageIndex];
  const nextPage = guideState.rulePages[(guideState.rulePageIndex + 1) % guideState.rulePages.length];
  const currentMarkup = renderDynamicGuidePage(currentPage);
  const nextMarkup = renderDynamicGuidePage(nextPage);

  if (guideState.rulePages.length === 1) {
    if (frontFace) frontFace.innerHTML = currentMarkup;
    if (backFace) backFace.innerHTML = RULE_CARD_BACK_MARKUP;
    if (ruleCardsCounter) {
      ruleCardsCounter.textContent = '1 / 1';
    }
    return;
  }

  if (ruleFlipCard.classList.contains('is-flipped')) {
    if (backFace) backFace.innerHTML = currentMarkup;
    if (frontFace) frontFace.innerHTML = nextMarkup;
  } else {
    if (frontFace) frontFace.innerHTML = currentMarkup;
    if (backFace) backFace.innerHTML = nextMarkup;
  }

  if (ruleCardsCounter) {
    ruleCardsCounter.textContent = `${guideState.rulePageIndex + 1} / ${guideState.rulePages.length}`;
  }
}

// Abre o sorteador reaproveitando a selecao atual como ponto de partida.
function openRuleDrawModal() {
  const currentDraw = guideState.getAlternativeRuleDraw();
  const currentRuleIds = validAlternativeRuleIds(currentDraw?.ruleIds);
  guideState.selectedRuleIds = currentRuleIds;
  guideState.pinnedRuleIds = validAlternativeRuleIds(currentDraw?.pinnedRuleIds).filter(id => currentRuleIds.includes(id));
  guideState.selectedRuleDrawCount = clampRuleCount(currentDraw?.count || currentRuleIds.length || DEFAULT_RULE_DRAW_COUNT);
  guideState.savingRules = false;

  closeModal(settingsModal);
  renderRuleSelection();
  openModal(ruleDrawModal);
}

// Fecha o sorteador e volta para o modal de configuracoes.
function closeRuleDrawModal() {
  closeModal(ruleDrawModal);
  openModal(settingsModal);
}

// Trata cliques nos botoes de quantidade de regras.
function handleRuleDrawSetupClick(event) {
  const countButton = event.target.closest('[data-rule-count]');
  if (!countButton || !guideState.canEditAlternativeRules()) return;

  guideState.selectedRuleDrawCount = clampRuleCount(countButton.dataset.ruleCount);
  guideState.selectedRuleIds = guideState.selectedRuleIds.slice(0, guideState.selectedRuleDrawCount);
  guideState.pinnedRuleIds = guideState.pinnedRuleIds.filter(id => guideState.selectedRuleIds.includes(id));
  renderRuleSelection();
}

// Mantem a selecao manual e as regras fixadas consistentes.
function handleRuleSelectionChange(event) {
  if (!guideState.canEditAlternativeRules()) return;

  const target = event.target;
  const ruleId = target?.dataset?.selectRule || target?.dataset?.pinRule;
  if (!ruleId) return;

  if (target.dataset.selectRule) {
    if (target.checked) {
      guideState.selectedRuleIds = validAlternativeRuleIds([
        ...guideState.selectedRuleIds,
        ruleId
      ]).slice(0, guideState.selectedRuleDrawCount);
    } else {
      guideState.selectedRuleIds = guideState.selectedRuleIds.filter(id => id !== ruleId);
      guideState.pinnedRuleIds = guideState.pinnedRuleIds.filter(id => id !== ruleId);
    }
  }

  if (target.dataset.pinRule) {
    if (target.checked && guideState.selectedRuleIds.includes(ruleId)) {
      guideState.pinnedRuleIds = validAlternativeRuleIds([
        ...guideState.pinnedRuleIds,
        ruleId
      ]);
    } else {
      guideState.pinnedRuleIds = guideState.pinnedRuleIds.filter(id => id !== ruleId);
    }
  }

  renderRuleSelection();
}

// Renderiza a lista completa de regras para escolha manual e sorteio.
function renderRuleSelection() {
  const canEdit = guideState.canEditAlternativeRules();
  const selectedSet = new Set(guideState.selectedRuleIds);
  const pinnedSet = new Set(guideState.pinnedRuleIds);
  const selectedCount = selectedSet.size;
  const selectedLimitReached = selectedCount >= guideState.selectedRuleDrawCount;

  ruleDrawSetup?.querySelectorAll('[data-rule-count]').forEach((button) => {
    const isActive = Number(button.dataset.ruleCount) === guideState.selectedRuleDrawCount;
    button.classList.toggle('is-selected', isActive);
    button.disabled = !canEdit || guideState.savingRules;
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (ruleSelectionList) {
    ruleSelectionList.innerHTML = ALTERNATIVE_RULES.map((rule) => {
      const copy = getAlternativeRuleText(rule.id);
      const isSelected = selectedSet.has(rule.id);
      const isPinned = pinnedSet.has(rule.id);
      const selectDisabled = !canEdit || guideState.savingRules || (!isSelected && selectedLimitReached);
      const pinDisabled = !canEdit || guideState.savingRules || !isSelected;

      return `
        <div class="rule-selection-row${isSelected ? ' is-selected' : ''}" data-rule-id="${escapeHtml(rule.id)}">
          <label>
            <input
              type="checkbox"
              data-select-rule="${escapeHtml(rule.id)}"
              ${isSelected ? 'checked' : ''}
              ${selectDisabled ? 'disabled' : ''}
            >
            <span>
              <strong>${escapeHtml(copy.title)}</strong>
              <span class="rule-selection-description">${escapeHtml(copy.description)}</span>
            </span>
          </label>
          <label class="rule-selection-pin">
            <input
              type="checkbox"
              data-pin-rule="${escapeHtml(rule.id)}"
              ${isPinned ? 'checked' : ''}
              ${pinDisabled ? 'disabled' : ''}
            >
            ${escapeHtml(t('three.pin', {}, 'Fixar'))}
          </label>
        </div>
      `;
    }).join('');
  }

  if (ruleSelectionCount) {
    ruleSelectionCount.textContent = t(
      'three.selectedRulesStatus',
      {
        selected: selectedCount,
        count: guideState.selectedRuleDrawCount,
        pinned: pinnedSet.size
      },
      `${selectedCount}/${guideState.selectedRuleDrawCount} selecionadas · ${pinnedSet.size} fixadas`
    );
  }

  const requiresManualSelection = selectedCount !== guideState.selectedRuleDrawCount;
  if (ruleSelectionStatus) {
    ruleSelectionStatus.textContent = canEdit
      ? ''
      : t('three.hostOnlyDrawRules', {}, 'Apenas o host pode sortear regras alternativas.');
  }

  if (startRuleDrawBtn) startRuleDrawBtn.disabled = !canEdit || guideState.savingRules;
  if (applyRuleSelectionBtn) {
    applyRuleSelectionBtn.disabled = !canEdit || guideState.savingRules || requiresManualSelection;
  }
  if (resetRuleSelectionBtn) resetRuleSelectionBtn.disabled = !canEdit || guideState.savingRules;
}

// Publica uma selecao manual, sorteada ou restaura o modo padrao da sala.
function publishRuleDraw(mode) {
  if (!guideState.canEditAlternativeRules() || guideState.savingRules) return;

  let nextDraw = null;
  if (mode === 'random') {
    const ids = pickRandomAlternativeRules(guideState.selectedRuleDrawCount, guideState.pinnedRuleIds);
    nextDraw = createAlternativeRuleDraw(ids, guideState.pinnedRuleIds, guideState.getPlayerName());
    guideState.selectedRuleIds = ids;
    guideState.pinnedRuleIds = guideState.pinnedRuleIds.filter(id => ids.includes(id));
  } else if (mode === 'manual') {
    const ids = validAlternativeRuleIds(guideState.selectedRuleIds).slice(0, guideState.selectedRuleDrawCount);
    if (ids.length !== guideState.selectedRuleDrawCount) {
      renderRuleSelection();
      return;
    }
    nextDraw = createAlternativeRuleDraw(ids, guideState.pinnedRuleIds, guideState.getPlayerName());
  } else if (mode !== 'reset') {
    return;
  }

  guideState.savingRules = true;
  guideState.setAlternativeRuleDraw(nextDraw);
  guideState.onAlternativeRuleDrawChange(nextDraw);
  playVfx('card-whoosh');
  guideState.savingRules = false;

  if (!nextDraw) {
    guideState.selectedRuleIds = [];
    guideState.pinnedRuleIds = [];
    guideState.selectedRuleDrawCount = DEFAULT_RULE_DRAW_COUNT;
  }
  refreshAlternativeRulePages();
  renderRuleSelection();

  if (ruleSelectionStatus) {
    ruleSelectionStatus.textContent = nextDraw
      ? t('three.rulesApplied', {}, 'Regras alternativas aplicadas.')
      : t('three.defaultRulesRestored', {}, 'Regras alternativas restauradas para o padrão.');
  }
}

// Atualiza modais abertos quando o idioma muda.
function refreshOpenRulesUi() {
  if (isModalOpen(ruleCardsModal)) {
    openRuleCardsModal();
  }
  if (isModalOpen(altRulesModal)) {
    openAltRulesModal();
  }
  if (isModalOpen(ruleDrawModal)) {
    renderRuleSelection();
  }
}

function isModalOpen(modal) {
  return Boolean(modal) && modal.style.display !== 'none';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
