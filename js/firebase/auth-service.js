import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// Aguarda o Firebase resolver a sessao local antes de decidir redirecionamentos.
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Observa mudancas de login para telas que precisam reagir em tempo real.
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Inicia login Google, com redirect como fallback para navegadores que bloqueiam popup.
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/operation-not-supported-in-this-environment'].includes(error.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

// Completa o retorno do login por redirect quando ele foi usado.
export async function resolveRedirectSignIn() {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error('Falha ao concluir login por redirect.', error);
    return null;
  }
}

// Exige usuario autenticado e manda para a tela de login quando necessario.
export async function requireAuth(redirectTo = 'login.html') {
  const user = await waitForAuth();
  if (!user) {
    const next = `${location.pathname.split('/').pop() || 'index.html'}${location.search || ''}`;
    location.replace(`${redirectTo}?next=${encodeURIComponent(next)}`);
    return null;
  }
  return user;
}

// Sai da conta Google usada na sessao atual.
export function signOutUser() {
  return signOut(auth);
}
