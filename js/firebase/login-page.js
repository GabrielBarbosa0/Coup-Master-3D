import { observeAuth, resolveRedirectSignIn, signInAsGuest, signInWithGoogle } from './auth-service.js';

const loginButton = document.getElementById('googleLoginBtn');
const guestLoginButton = document.getElementById('guestLoginBtn');
const statusEl = document.getElementById('loginStatus');

const params = new URLSearchParams(location.search);
const nextPath = params.get('next') || 'lobby.html';

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

// Mostra mensagens curtas sem vazar detalhes tecnicos para o jogador.
function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

await resolveRedirectSignIn();

observeAuth((user) => {
  if (user) {
    location.replace(nextPath);
  }
});

loginButton?.addEventListener('click', async () => {
  loginButton.disabled = true;
  setStatus(t('login.openingGoogle', {}, 'Abrindo login do Google...'));

  try {
    await signInWithGoogle();
  } catch (error) {
    console.error(error);
    loginButton.disabled = false;
    setStatus(t('login.googleError', {}, 'Nao foi possivel entrar. Tente novamente.'));
  }
});

guestLoginButton?.addEventListener('click', async () => {
  guestLoginButton.disabled = true;
  setStatus(t('login.enteringGuest', {}, 'Entrando como visitante...'));

  try {
    await signInAsGuest();
  } catch (error) {
    console.error(error);
    guestLoginButton.disabled = false;
    setStatus(t('login.guestError', {}, 'Nao foi possivel entrar como visitante.'));
  }
});
