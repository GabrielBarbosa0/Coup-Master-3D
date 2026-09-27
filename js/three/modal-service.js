import { fullscreenBtn } from './dom.js';

// Mostra um modal usando o layout flexivel do HUD 3D.
export function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

// Esconde um modal mantendo a marcação pronta para ser reaberta.
export function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

// Fecha todos os modais abertos no momento.
export function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(closeModal);
}

// Informa se algum modal está aberto e deve capturar os atalhos do tabuleiro.
export function isAnyModalOpen() {
  return Array.from(document.querySelectorAll('.modal-overlay')).some((modal) => {
    return modal.style.display !== 'none';
  });
}

// Fecha modais ao clicar no fundo, exceto aqueles que exigem uma resposta explicita.
export function setupModalOverlayDismiss(options = {}) {
  const ignoredModals = new Set(options.ignoredModals || []);
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (ignoredModals.has(overlay)) return;
      if (event.target === overlay) closeModal(overlay);
    });
  });
}

// Liga o botao de tela cheia e mantém seu rótulo acessível sincronizado.
export function setupFullscreenControl() {
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  syncFullscreenButton();
}

// Alterna a página 3D entre tela cheia e modo normal.
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// Atualiza o rótulo acessível do botão de tela cheia.
function syncFullscreenButton() {
  if (!fullscreenBtn) return;
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
  fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Sair da tela cheia' : 'Tela cheia');
  fullscreenBtn.title = isFullscreen ? 'Sair da tela cheia' : 'Tela cheia';
}
