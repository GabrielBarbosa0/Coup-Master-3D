import { requireAuth, signOutUser } from './auth-service.js';
import { createRoom, joinRoom, normalizeRoomCode } from './room-service.js';

const user = await requireAuth('login.html');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomForm = document.getElementById('joinRoomForm');
const joinRoomBtn = joinRoomForm?.querySelector('button[type="submit"]');
const roomCodeInput = document.getElementById('roomCodeInput');
const signOutBtn = document.getElementById('signOutBtn');
const dialogUserNameEl = document.getElementById('dialogUserName');
const userAvatarEl = document.getElementById('userAvatar');
const lobbyStatusEl = document.getElementById('lobbyStatus');
const menuStatusEl = document.getElementById('menuStatus');
const optionsMenuStatusEl = document.getElementById('optionsMenuStatus');

if (user) {
  dialogUserNameEl.textContent = user.displayName || 'Jogador';
  if (user.photoURL) userAvatarEl.src = user.photoURL;
}

// Atualiza o feedback do modal de salas.
function setStatus(message) {
  lobbyStatusEl.textContent = message;
}

// Abre os modais do menu e move o foco para a primeira acao util.
function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  dialog.showModal();
  window.requestAnimationFrame(() => {
    dialog.querySelector('button:not([data-dialog-close]), input')?.focus();
  });
}

// Fecha o modal e limpa mensagens temporarias da entrada em sala.
function closeDialog(dialog) {
  if (!dialog?.open) return;
  dialog.close();
  if (dialog.id === 'roomDialog') setStatus('');
}

// Entra direto na mesa casual depois que a sala foi validada.
function openCasualRoom(roomCode) {
  localStorage.setItem('coupMaster3dRoom', roomCode);
  location.assign(`index.html?room=${encodeURIComponent(roomCode)}`);
}

document.querySelectorAll('[data-dialog-open]').forEach((button) => {
  button.addEventListener('click', () => {
    openDialog(document.getElementById(button.dataset.dialogOpen));
  });
});

document.querySelectorAll('[data-dialog-close]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(button.closest('dialog')));
});

// Mostra o estado inicial das futuras areas sem transformar o menu em uma tela sem resposta.
document.querySelectorAll('[data-options-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const messages = {
      settings: 'Configurações de áudio e mesa ficam disponíveis durante a partida.',
      statistics: 'As estatísticas serão adicionadas em uma próxima etapa.',
      credits: 'Coup Master é um projeto criado por Gabriel Barbosa.'
    };
    optionsMenuStatusEl.textContent = messages[button.dataset.optionsAction] || '';
  });
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    if (dialog.id === 'roomDialog') setStatus('');
    if (dialog.id === 'optionsDialog') optionsMenuStatusEl.textContent = '';
  });
});

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
  joinRoomBtn.disabled = true;
  setStatus('Entrando na sala...');

  try {
    await joinRoom(roomCode, user);
    setStatus('Voce entrou na sala. Abrindo mesa...');
    openCasualRoom(roomCode);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Nao foi possivel entrar na sala.');
  } finally {
    joinRoomBtn.disabled = false;
  }
});

roomCodeInput?.addEventListener('input', () => {
  roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
});

signOutBtn?.addEventListener('click', async () => {
  signOutBtn.disabled = true;
  menuStatusEl.textContent = 'Voltando para o login...';

  try {
    await signOutUser();
    localStorage.removeItem('coupMaster3dRoom');
    location.replace('login.html');
  } catch (error) {
    console.error(error);
    signOutBtn.disabled = false;
    menuStatusEl.textContent = 'Não foi possível sair. Tente novamente.';
  }
});
