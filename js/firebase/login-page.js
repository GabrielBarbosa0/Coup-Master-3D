import { observeAuth, resolveRedirectSignIn, signInAsGuest, signInWithGoogle } from './auth-service.js';

const loginButton = document.getElementById('googleLoginBtn');
const guestLoginButton = document.getElementById('guestLoginBtn');
const statusEl = document.getElementById('loginStatus');

const params = new URLSearchParams(location.search);
const nextPath = params.get('next') || 'lobby.html';

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
  setStatus('Abrindo login do Google...');

  try {
    await signInWithGoogle();
  } catch (error) {
    console.error(error);
    loginButton.disabled = false;
    setStatus('Nao foi possivel entrar. Tente novamente.');
  }
});

guestLoginButton?.addEventListener('click', async () => {
  guestLoginButton.disabled = true;
  setStatus('Entrando como visitante...');

  try {
    await signInAsGuest();
  } catch (error) {
    console.error(error);
    guestLoginButton.disabled = false;
    setStatus('Nao foi possivel entrar como visitante.');
  }
});
