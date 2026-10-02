import {
  cancelRemovePlayerBtn,
  closePlayerInfoBtn,
  confirmRemovePlayerBtn,
  playerInfoAvatar,
  playerInfoGames,
  playerInfoLosses,
  playerInfoModal,
  playerInfoName,
  playerInfoNote,
  playerInfoPoints,
  playerInfoRankedSummary,
  playerInfoWinRate,
  playerInfoWins,
  playerRemoveConfirm,
  removePlayerBtn,
  roomPlayerList
} from './dom.js';
import { closeModal, openModal } from './modal-service.js';

const roomPlayersState = {
  getPlayers: () => [],
  isAdmin: () => false,
  selectedRoomPlayer: null
};

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

function getPlayerFallbackName(playerId = '') {
  return `${t('common.player', {}, 'Jogador')} ${playerId}`.trim();
}

// Configura a lista lateral de jogadores e o modal de informacoes do perfil.
function setupRoomPlayerList(options = {}) {
  roomPlayersState.getPlayers = options.getPlayers || roomPlayersState.getPlayers;
  roomPlayersState.isAdmin = options.isAdmin || roomPlayersState.isAdmin;

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
    const playerName = player.name || getPlayerFallbackName(player.id);
    button.textContent = playerName;
    button.title = `${playerName} · P${player.id}`;
    button.addEventListener('click', () => openPlayerInfoModal(player.id));

    row.append(button);
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
  const playerName = player.name || getPlayerFallbackName(player.id);
  const rankedStats = getPlayerRankedStats(player);

  if (playerInfoName) playerInfoName.textContent = playerName;
  if (playerInfoRankedSummary) {
    playerInfoRankedSummary.textContent = t(
      'three.rankedGamesRegistered',
      { count: rankedStats.games },
      `${rankedStats.games} jogo(s) ranqueado(s) registrados.`
    );
  }
  if (playerInfoGames) playerInfoGames.textContent = String(rankedStats.games);
  if (playerInfoWins) playerInfoWins.textContent = String(rankedStats.wins);
  if (playerInfoLosses) playerInfoLosses.textContent = String(rankedStats.losses);
  if (playerInfoWinRate) playerInfoWinRate.textContent = `${rankedStats.winRate}%`;
  if (playerInfoPoints) {
    playerInfoPoints.textContent = t('three.rankedPointsValue', { points: rankedStats.points }, `${rankedStats.points} PTS`);
  }
  renderPlayerAvatar(player, playerName);

  if (removePlayerBtn) {
    removePlayerBtn.hidden = !canRemove || isConfirmingRemoval;
    removePlayerBtn.disabled = !canRemove;
  }

  if (playerInfoNote) {
    if (!roomPlayersState.isAdmin()) {
      playerInfoNote.textContent = t('three.hostOnlyRemove', {}, 'Apenas o host pode remover jogadores.');
      playerInfoNote.hidden = false;
    } else if (player.uid === localUid) {
      playerInfoNote.textContent = t('three.cannotRemoveSelf', {}, 'Voce nao pode remover a si mesmo.');
      playerInfoNote.hidden = false;
    } else {
      playerInfoNote.textContent = '';
      playerInfoNote.hidden = true;
    }
  }
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
    playerInfoNote.textContent = t('three.removingPlayer', {}, 'Removendo jogador...');
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
      playerInfoNote.textContent = error?.message || t('three.removePlayerError', {}, 'Nao foi possivel remover o jogador.');
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

// Normaliza estatisticas ranqueadas persistidas para exibicao no modal de jogador.
function getPlayerRankedStats(player) {
  const stats = player?.rankedStats || {};
  const games = Math.max(0, Number(stats.games) || 0);
  const wins = Math.max(0, Number(stats.wins) || 0);
  const losses = Math.max(0, Number(stats.losses) || 0);
  const points = Math.max(0, Number(stats.rankScore ?? stats.points) || 0);
  const persistedWinRate = Number(stats.winRate);
  const winRate = Number.isFinite(persistedWinRate) && persistedWinRate > 0
    ? Math.round(persistedWinRate * 100)
    : (games > 0 ? Math.round((wins / games) * 100) : 0);
  return { games, wins, losses, points, winRate };
}

// Preenche avatar com foto do provedor ou iniciais quando ainda nao ha imagem.
function renderPlayerAvatar(player, playerName) {
  if (!playerInfoAvatar) return;

  playerInfoAvatar.textContent = getPlayerInitials(playerName);
  playerInfoAvatar.style.backgroundImage = player.avatarUrl
    ? `url(${JSON.stringify(player.avatarUrl)})`
    : '';
  playerInfoAvatar.classList.toggle('has-photo', Boolean(player.avatarUrl));
  playerInfoAvatar.setAttribute('aria-label', playerName);
}

function getPlayerInitials(playerName = '') {
  const parts = String(playerName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts.slice(0, 2).map(part => part[0]).join('');
  return (initials || 'J').toUpperCase();
}

export {
  refreshOpenPlayerInfoModal,
  renderRoomPlayerList,
  setupRoomPlayerList
};
