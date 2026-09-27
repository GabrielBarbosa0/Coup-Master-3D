import {
  cancelRemovePlayerBtn,
  closePlayerInfoBtn,
  confirmRemovePlayerBtn,
  playerInfoModal,
  playerInfoName,
  playerInfoNote,
  playerInfoRole,
  playerInfoSeat,
  playerInfoStatus,
  playerRemoveConfirm,
  removePlayerBtn,
  roomPlayerList
} from './dom.js';
import { playVfx } from './audio-service.js';
import { closeModal, openModal } from './modal-service.js';

const roomPlayersState = {
  getPlayers: () => [],
  isAdmin: () => false,
  onCoinCountChange: () => {},
  selectedRoomPlayer: null
};

// Configura a lista lateral de jogadores e o modal de informacoes do perfil.
function setupRoomPlayerList(options = {}) {
  roomPlayersState.getPlayers = options.getPlayers || roomPlayersState.getPlayers;
  roomPlayersState.isAdmin = options.isAdmin || roomPlayersState.isAdmin;
  roomPlayersState.onCoinCountChange = options.onCoinCountChange || roomPlayersState.onCoinCountChange;

  closePlayerInfoBtn?.addEventListener('click', closePlayerInfoModal);
  removePlayerBtn?.addEventListener('click', showPlayerRemoveConfirmation);
  cancelRemovePlayerBtn?.addEventListener('click', hidePlayerRemoveConfirmation);
  confirmRemovePlayerBtn?.addEventListener('click', removeSelectedRoomPlayer);
  renderRoomPlayerList();
}

// Desenha jogadores reservados no HUD lateral esquerdo.
function renderRoomPlayerList() {
  if (!roomPlayerList) return;
  roomPlayerList.innerHTML = '';

  getReservedPlayers().forEach((player) => {
    const row = document.createElement('div');
    row.className = 'room-player-row';
    if (!player.isOnline) row.classList.add('is-offline');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'room-player-btn';
    button.textContent = player.name || `Jogador ${player.id}`;
    button.title = `${player.name || `Jogador ${player.id}`} · P${player.id}`;
    button.addEventListener('click', () => openPlayerInfoModal(player.id));

    const coinControls = document.createElement('div');
    coinControls.className = 'room-player-coins';
    coinControls.setAttribute('aria-label', `Moedas de ${player.name || `Jogador ${player.id}`}`);

    const removeBtn = createPlayerCoinButton(player.id, -1, '-', 'Remover moeda');
    const count = document.createElement('span');
    count.className = 'room-player-coin-count';
    count.textContent = String(player.coinCount || 0);
    const addBtn = createPlayerCoinButton(player.id, 1, '+', 'Adicionar moeda');

    coinControls.append(removeBtn, count, addBtn);
    row.append(button, coinControls);
    roomPlayerList.append(row);
  });
}

// Atualiza o modal aberto quando a lista de jogadores muda.
function refreshOpenPlayerInfoModal() {
  if (!playerInfoModal || playerInfoModal.style.display === 'none') return;
  const player = roomPlayersState.selectedRoomPlayer
    ? getPlayerById(roomPlayersState.selectedRoomPlayer.id)
    : null;

  if (!player?.uid) {
    closePlayerInfoModal();
    return;
  }

  roomPlayersState.selectedRoomPlayer = player;
  renderPlayerInfoModal(player);
}

// Cria um botao circular para ajustar o contador manual de moedas.
function createPlayerCoinButton(playerId, delta, label, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'room-player-coin-btn';
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', `${title} do P${playerId}`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    adjustPlayerCoinCount(playerId, delta);
  });
  return button;
}

// Atualiza o contador manual de moedas do jogador e sincroniza a mesa.
function adjustPlayerCoinCount(playerId, delta) {
  const player = getPlayerById(playerId);
  if (!player?.isReserved) return;

  const current = Number(player.coinCount) || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === current) return;

  player.coinCount = next;
  playVfx('falling-coin');
  renderRoomPlayerList();
  roomPlayersState.onCoinCountChange(player);
}

// Retorna somente os assentos realmente reservados por jogadores da sala.
function getReservedPlayers() {
  return getPlayers().filter(player => player.uid && player.isReserved);
}

// Abre o modal com informacoes do jogador escolhido.
function openPlayerInfoModal(playerId) {
  const player = getPlayerById(playerId);
  if (!player?.uid) return;
  roomPlayersState.selectedRoomPlayer = player;
  hidePlayerRemoveConfirmation();
  renderPlayerInfoModal(player);
  openModal(playerInfoModal);
}

// Preenche dados e permissao de remocao do modal de jogador.
function renderPlayerInfoModal(player) {
  const localUid = window.CoupMaster3DOnline?.user?.uid;
  const canRemove = Boolean(roomPlayersState.isAdmin() && player.uid && player.uid !== localUid);
  const isConfirmingRemoval = Boolean(playerRemoveConfirm && !playerRemoveConfirm.hidden);

  if (playerInfoName) playerInfoName.textContent = player.name || `Jogador ${player.id}`;
  if (playerInfoSeat) playerInfoSeat.textContent = `P${player.id}`;
  if (playerInfoStatus) playerInfoStatus.textContent = player.isOnline ? 'Online' : 'Offline';
  if (playerInfoRole) playerInfoRole.textContent = getPlayerRoomRole(player);

  if (removePlayerBtn) {
    removePlayerBtn.hidden = !canRemove || isConfirmingRemoval;
    removePlayerBtn.disabled = !canRemove;
  }

  if (playerInfoNote) {
    if (!roomPlayersState.isAdmin()) {
      playerInfoNote.textContent = 'Apenas o host pode remover jogadores.';
      playerInfoNote.hidden = false;
    } else if (player.uid === localUid) {
      playerInfoNote.textContent = 'Voce nao pode remover a si mesmo.';
      playerInfoNote.hidden = false;
    } else {
      playerInfoNote.textContent = '';
      playerInfoNote.hidden = true;
    }
  }
}

// Mostra se o perfil pertence ao host permanente da sala.
function getPlayerRoomRole(player) {
  const adminUid = window.CoupMaster3DOnline?.adminUid;
  return player.uid && adminUid && player.uid === adminUid ? 'Host' : 'Jogador';
}

// Fecha o modal e limpa estados temporarios de remocao.
function closePlayerInfoModal() {
  roomPlayersState.selectedRoomPlayer = null;
  hidePlayerRemoveConfirmation();
  closeModal(playerInfoModal);
}

// Exibe a confirmacao antes da acao destrutiva do host.
function showPlayerRemoveConfirmation() {
  if (!roomPlayersState.selectedRoomPlayer || !roomPlayersState.isAdmin()) return;
  if (playerRemoveConfirm) playerRemoveConfirm.hidden = false;
  if (removePlayerBtn) removePlayerBtn.hidden = true;
}

// Volta ao estado normal do modal de jogador.
function hidePlayerRemoveConfirmation() {
  if (playerRemoveConfirm) playerRemoveConfirm.hidden = true;
  if (removePlayerBtn && roomPlayersState.selectedRoomPlayer) {
    const localUid = window.CoupMaster3DOnline?.user?.uid;
    removePlayerBtn.hidden = !(roomPlayersState.isAdmin() && roomPlayersState.selectedRoomPlayer.uid !== localUid);
  }
}

// Remove um jogador da sala atraves do servico online, liberando o assento.
async function removeSelectedRoomPlayer() {
  const player = roomPlayersState.selectedRoomPlayer;
  if (!player?.uid || !roomPlayersState.isAdmin() || !window.CoupMaster3DOnline?.removePlayerFromRoom) return;

  if (confirmRemovePlayerBtn) confirmRemovePlayerBtn.disabled = true;
  if (cancelRemovePlayerBtn) cancelRemovePlayerBtn.disabled = true;
  if (playerInfoNote) {
    playerInfoNote.textContent = 'Removendo jogador...';
    playerInfoNote.hidden = false;
  }

  try {
    await window.CoupMaster3DOnline.removePlayerFromRoom({
      uid: player.uid,
      seat: player.id,
      displayName: player.name
    });
    closePlayerInfoModal();
  } catch (error) {
    console.error('Falha ao remover jogador.', error);
    if (playerInfoNote) {
      playerInfoNote.textContent = error?.message || 'Nao foi possivel remover o jogador.';
      playerInfoNote.hidden = false;
    }
  } finally {
    if (confirmRemovePlayerBtn) confirmRemovePlayerBtn.disabled = false;
    if (cancelRemovePlayerBtn) cancelRemovePlayerBtn.disabled = false;
  }
}

// Retorna a lista atual de jogadores mantida pelo app principal.
function getPlayers() {
  return roomPlayersState.getPlayers() || [];
}

// Localiza um jogador pelo assento.
function getPlayerById(playerId) {
  return getPlayers()[playerId - 1] || null;
}

export {
  refreshOpenPlayerInfoModal,
  renderRoomPlayerList,
  setupRoomPlayerList
};
