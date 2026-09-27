import { observeAuth, resolveRedirectSignIn, signInAsGuest, signInWithGoogle } from './auth-service.js';

const loginButton = document.getElementById('google-login-btn') || document.getElementById('googleLoginBtn');
const guestLoginButton = document.getElementById('anonymous-login-btn') || document.getElementById('guestLoginBtn');
const statusEl = document.getElementById('loginStatus');
const loader = document.getElementById('font-loader');
const loaderMessage = document.getElementById('loader-message');
let loaderHideTimer = null;

const params = new URLSearchParams(location.search);
const nextPath = params.get('next') || 'lobby.html';

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

// Mostra mensagens curtas sem vazar detalhes tecnicos para o jogador.
function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function showLoader(message) {
  if (loaderHideTimer) window.clearTimeout(loaderHideTimer);
  if (loaderMessage && message) loaderMessage.textContent = message;
  if (!loader) return;
  loader.style.display = 'flex';
  loader.classList.remove('hidden');
}

function hideLoader() {
  if (!loader) return;
  loader.classList.add('hidden');
  loaderHideTimer = window.setTimeout(() => {
    if (loader.classList.contains('hidden')) loader.style.display = 'none';
    loaderHideTimer = null;
  }, 520);
}

async function waitForInitialUi() {
  await Promise.all([
    window.CoupLanguage?.ready || Promise.resolve(),
    document.fonts?.ready?.catch?.(() => null) || Promise.resolve()
  ]);
}

await resolveRedirectSignIn();

[loginButton, guestLoginButton].forEach((button) => {
  if (button) button.disabled = false;
});

observeAuth((user) => {
  if (user) {
    location.replace(nextPath);
    return;
  }

  waitForInitialUi().then(hideLoader);
});

loginButton?.addEventListener('click', async () => {
  loginButton.disabled = true;
  const message = t('login.openingGoogle', {}, 'Abrindo login do Google...');
  setStatus(message);
  showLoader(message);

  try {
    await signInWithGoogle();
  } catch (error) {
    console.error(error);
    loginButton.disabled = false;
    setStatus(t('login.googleError', {}, 'Nao foi possivel entrar. Tente novamente.'));
    hideLoader();
  }
});

guestLoginButton?.addEventListener('click', async () => {
  guestLoginButton.disabled = true;
  const message = t('login.enteringGuest', {}, 'Entrando como visitante...');
  setStatus(message);
  showLoader(message);

  try {
    await signInAsGuest();
  } catch (error) {
    console.error(error);
    guestLoginButton.disabled = false;
    setStatus(t('login.guestError', {}, 'Nao foi possivel entrar como visitante.'));
    hideLoader();
  }
});
