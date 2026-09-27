import { requireAuth, signOutUser } from './auth-service.js';
import { createRoom, joinRoom, normalizeRoomCode } from './room-service.js';

const user = await requireAuth('login.html');
const createRoomBtn = document.getElementById('create-room-btn') || document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomCodeInput = document.getElementById('room-code-input') || document.getElementById('roomCodeInput');
const signOutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
const userInfoEl = document.getElementById('user-info');
const roomActionsEl = document.getElementById('room-actions');
const userNameEl = document.getElementById('user-name') || document.getElementById('userName');
const userAvatarEl = document.getElementById('user-photo') || document.getElementById('userAvatar');
const lobbyStatusEl = document.getElementById('lobbyStatus');
const logoutConfirmModal = document.getElementById('logoutConfirmModal');
const closeLogoutConfirmModalBtn = document.getElementById('closeLogoutConfirmModalBtn');
const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
const loader = document.getElementById('font-loader');
const loaderMessage = document.getElementById('loader-message');
let loaderHideTimer = null;

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

if (user) {
  const playerName = user.displayName || t('common.player', {}, 'Jogador');
  if (userNameEl) userNameEl.textContent = playerName.toUpperCase();
  if (userAvatarEl) {
    userAvatarEl.src = user.photoURL || 'assets/img/icons/ghost.svg';
    userAvatarEl.classList.toggle('is-system-avatar', !user.photoURL);
  }
  if (userInfoEl) userInfoEl.style.display = 'block';
  if (roomActionsEl) roomActionsEl.style.display = 'block';
  if (signOutBtn) signOutBtn.hidden = false;
}

// Atualiza feedback do lobby mantendo a tela simples para o MVP online.
function setStatus(message) {
  if (lobbyStatusEl) lobbyStatusEl.textContent = message;
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

Promise.all([
  window.CoupLanguage?.ready || Promise.resolve(),
  document.fonts?.ready?.catch?.(() => null) || Promise.resolve()
]).then(hideLoader);

// Entra direto na mesa casual depois que a sala foi validada.
function openCasualRoom(roomCode) {
  localStorage.setItem('coupMaster3dRoom', roomCode);
  location.assign(`index.html?room=${encodeURIComponent(roomCode)}`);
}

createRoomBtn?.addEventListener('click', async () => {
  createRoomBtn.disabled = true;
  const message = t('lobby.creatingRoom', {}, 'Criando sala...');
  setStatus(message);
  showLoader(message);

  try {
    const roomCode = await createRoom(user);
    setStatus(t('lobby.roomCreated', {}, 'Sala criada. Abrindo mesa...'));
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || t('lobby.createRoomError', {}, 'Nao foi possivel criar a sala.'));
    hideLoader();
  } finally {
    createRoomBtn.disabled = false;
  }
});

async function joinCurrentRoom() {
  const roomCode = normalizeRoomCode(roomCodeInput.value);
  const message = t('lobby.joiningRoom', {}, 'Entrando na sala...');
  setStatus(message);
  showLoader(message);

  try {
    await joinRoom(roomCode, user);
    setStatus(t('lobby.joinedRoom', {}, 'Voce entrou na sala. Abrindo mesa...'));
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || t('lobby.joinRoomError', {}, 'Nao foi possivel entrar na sala.'));
    hideLoader();
  }
}

joinRoomForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await joinCurrentRoom();
});

joinRoomBtn?.addEventListener('click', joinCurrentRoom);

roomCodeInput?.addEventListener('input', () => {
  roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
});

// Abre o modal de confirmacao antes de encerrar a sessao do jogador.
function openLogoutConfirmModal() {
  if (!logoutConfirmModal) return;
  logoutConfirmModal.style.display = 'flex';
  confirmLogoutBtn?.focus();
}

// Fecha o modal de confirmacao sem alterar a sessao.
function closeLogoutConfirmModal() {
  if (!logoutConfirmModal) return;
  logoutConfirmModal.style.display = 'none';
  signOutBtn?.focus();
}

signOutBtn?.addEventListener('click', () => {
  openLogoutConfirmModal();
});

closeLogoutConfirmModalBtn?.addEventListener('click', closeLogoutConfirmModal);
cancelLogoutBtn?.addEventListener('click', closeLogoutConfirmModal);
logoutConfirmModal?.addEventListener('click', (event) => {
  if (event.target === logoutConfirmModal) closeLogoutConfirmModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && logoutConfirmModal?.style.display === 'flex') {
    closeLogoutConfirmModal();
  }
});

confirmLogoutBtn?.addEventListener('click', async () => {
  confirmLogoutBtn.disabled = true;
  await signOutUser();
  location.replace('login.html');
});
