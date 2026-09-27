import { requireAuth, signOutUser } from './auth-service.js';
import { createRoom, joinRoom, normalizeRoomCode } from './room-service.js';

const user = await requireAuth('login.html');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomCodeInput = document.getElementById('roomCodeInput');
const signOutBtn = document.getElementById('signOutBtn');
const userNameEl = document.getElementById('userName');
const userAvatarEl = document.getElementById('userAvatar');
const lobbyStatusEl = document.getElementById('lobbyStatus');

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

if (user) {
  userNameEl.textContent = user.displayName || t('common.player', {}, 'Jogador');
  if (user.photoURL) userAvatarEl.src = user.photoURL;
}

// Atualiza feedback do lobby mantendo a tela simples para o MVP online.
function setStatus(message) {
  lobbyStatusEl.textContent = message;
}

// Entra direto na mesa casual depois que a sala foi validada.
function openCasualRoom(roomCode) {
  localStorage.setItem('coupMaster3dRoom', roomCode);
  location.assign(`index.html?room=${encodeURIComponent(roomCode)}`);
}

createRoomBtn?.addEventListener('click', async () => {
  createRoomBtn.disabled = true;
  setStatus(t('lobby.creatingRoom', {}, 'Criando sala...'));

  try {
    const roomCode = await createRoom(user);
    setStatus(t('lobby.roomCreated', {}, 'Sala criada. Abrindo mesa...'));
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || t('lobby.createRoomError', {}, 'Nao foi possivel criar a sala.'));
  } finally {
    createRoomBtn.disabled = false;
  }
});

joinRoomForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const roomCode = normalizeRoomCode(roomCodeInput.value);
  setStatus(t('lobby.joiningRoom', {}, 'Entrando na sala...'));

  try {
    await joinRoom(roomCode, user);
    setStatus(t('lobby.joinedRoom', {}, 'Voce entrou na sala. Abrindo mesa...'));
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || t('lobby.joinRoomError', {}, 'Nao foi possivel entrar na sala.'));
  }
});

roomCodeInput?.addEventListener('input', () => {
  roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
});

signOutBtn?.addEventListener('click', async () => {
  await signOutUser();
  location.replace('login.html');
});
