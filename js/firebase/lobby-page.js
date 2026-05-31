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

if (user) {
  userNameEl.textContent = user.displayName || 'Jogador';
  if (user.photoURL) userAvatarEl.src = user.photoURL;
}

// Atualiza feedback do lobby mantendo a tela simples para o MVP online.
function setStatus(message) {
  lobbyStatusEl.textContent = message;
}

// Entra direto na mesa casual depois que a sala foi validada.
function openCasualRoom(roomCode) {
  localStorage.setItem('coupMaster3dRoom', roomCode);
  location.assign(`3d.html?room=${encodeURIComponent(roomCode)}`);
}

createRoomBtn?.addEventListener('click', async () => {
  createRoomBtn.disabled = true;
  setStatus('Criando sala...');

  try {
    const roomCode = await createRoom(user);
    setStatus('Sala criada. Abrindo mesa...');
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Nao foi possivel criar a sala.');
  } finally {
    createRoomBtn.disabled = false;
  }
});

joinRoomForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const roomCode = normalizeRoomCode(roomCodeInput.value);
  setStatus('Entrando na sala...');

  try {
    await joinRoom(roomCode, user);
    setStatus('Voce entrou na sala. Abrindo mesa...');
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Nao foi possivel entrar na sala.');
  }
});

roomCodeInput?.addEventListener('input', () => {
  roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
});

signOutBtn?.addEventListener('click', async () => {
  await signOutUser();
  location.replace('login.html');
});
