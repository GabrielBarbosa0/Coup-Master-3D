const installButton = document.querySelector('[data-pwa-install]');
const installStatus = document.querySelector('[data-pwa-status]');
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

let deferredInstallPrompt = null;
let installStatusTimer = null;

// Registra o service worker apenas em contextos seguros suportados pelo navegador.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('Nao foi possivel registrar a PWA.', error);
    });
  });
}

// Exibe o botao quando o navegador disponibiliza a instalacao nativa.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

// Limpa a interface depois que o aplicativo for instalado.
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallButton();
  setInstallStatus('Coup Master instalado.');
});

if (!isStandalone && isIos) {
  showInstallButton();
}

installButton?.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    installButton.disabled = true;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.disabled = false;
    hideInstallButton();
    return;
  }

  if (isIos) {
    setInstallStatus('No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.');
  }
});

// Torna a acao de instalacao visivel sem ocupar espaco antes de ser necessaria.
function showInstallButton() {
  if (!installButton || isStandalone) return;
  installButton.hidden = false;
}

// Oculta o botao quando a instalacao nao esta mais disponivel.
function hideInstallButton() {
  if (installButton) installButton.hidden = true;
}

// Mostra orientacao curta de instalacao sem reutilizar mensagens de login ou lobby.
function setInstallStatus(message) {
  if (!installStatus) return;

  window.clearTimeout(installStatusTimer);
  installStatus.textContent = message;

  if (message) {
    installStatusTimer = window.setTimeout(() => {
      installStatus.textContent = '';
    }, 4000);
  }
}
