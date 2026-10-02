import { requireAuth } from './auth-service.js';
import {
  advanceRankedRoom,
  getRankedRoomState,
  joinRankedRoom,
  leaveRankedRoom,
  subscribeRankedRoomState,
  toggleRankedReady
} from './ranked-room-service.js';
import { normalizeRoomCode } from './room-service.js';
import {
  ROOM_LAUNCH_STORAGE_KEY,
  createRoomLaunchToken
} from '../navigation/entry-routing.js';
import { PHASES, SETTINGS } from '../gamemode/ranked-3d/ranked-3d-actions.js';
import { getRanked3dPlayers } from '../gamemode/ranked-3d/ranked-3d-engine.js';

const MATCHMAKING_TICK_MS = 750;
const QR_CODE_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';

const params = new URLSearchParams(location.search);
const roomCode = normalizeRoomCode(params.get('room') || '');
const user = await requireAuth('login.html');

const loadingEl = document.getElementById('rankLoading');
const loadingMessageEl = document.getElementById('rankLoadingMessage');
const connectionStatusEl = document.getElementById('rankConnectionStatus');
const phaseTitleEl = document.getElementById('rankPhaseTitle');
const phaseDescriptionEl = document.getElementById('rankPhaseDescription');
const interactionEl = document.getElementById('rankInteraction');
const playersEl = document.getElementById('rankPlayers');
const leaveBtn = document.getElementById('leaveRankBtn');
const roomCodeBtn = document.getElementById('rankRoomCode');
const roomQrImg = document.getElementById('rankRoomQr');
const errorModal = document.getElementById('rankErrorModal');
const errorTextEl = document.getElementById('rankErrorText');
const errorConfirmBtn = document.getElementById('rankErrorConfirm');

let rankedState = null;
let unsubscribeState = null;
let matchmakingTimer = null;
let countdownTimer = null;
let busy = false;
let openingRankedTable = false;

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

// Mantem a tela de carregamento no mesmo padrao usado pelo lobby.
function setLoading(message) {
  if (loadingMessageEl && message) loadingMessageEl.textContent = message;
  if (loadingEl) {
    loadingEl.style.display = 'flex';
    loadingEl.classList.remove('hidden');
  }
}

function hideLoading() {
  if (!loadingEl) return;
  loadingEl.classList.add('hidden');
  window.setTimeout(() => {
    if (loadingEl.classList.contains('hidden')) loadingEl.style.display = 'none';
  }, 520);
}

function setConnectionStatus(message, isOnline = true) {
  if (!connectionStatusEl) return;
  connectionStatusEl.textContent = message;
  connectionStatusEl.classList.toggle('is-offline', !isOnline);
}

function showError(message) {
  if (errorTextEl) errorTextEl.textContent = message;
  if (errorModal) errorModal.hidden = false;
}

function closeError() {
  if (errorModal) errorModal.hidden = true;
}

function getRankedRoomUrl() {
  const url = new URL('ranked-waiting.html', location.href);
  url.searchParams.set('room', roomCode);
  return url.href;
}

async function copyText(text) {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function setupInvite() {
  if (roomCodeBtn) roomCodeBtn.textContent = t('rankedWaiting.roomCode', { code: roomCode }, `Sala: ${roomCode}`);
  if (roomQrImg) {
    roomQrImg.src = `${QR_CODE_ENDPOINT}?size=164x164&margin=8&data=${encodeURIComponent(getRankedRoomUrl())}`;
  }
}

function formatCountdown(deadline) {
  if (!deadline) return t('rankedWaiting.waitingReady', {}, 'Aguardando prontidão');
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return remaining > 0
    ? t('rankedWaiting.startsIn', { seconds: remaining }, `Começa em ${remaining}s`)
    : t('rankedWaiting.starting', {}, 'Iniciando...');
}

function getPlayerStateLabel(player) {
  if (rankedState?.status !== PHASES.WAITING) {
    if (player.eliminated) return t('rankedWaiting.eliminated', {}, 'Eliminado');
    return player.connected === false
      ? t('common.offline', {}, 'Offline')
      : t('common.online', {}, 'Online');
  }

  if (player.ready) return t('rankedWaiting.ready', {}, 'Pronto');
  if (player.ai) return t('rankedWaiting.searching', {}, 'Entrando...');
  return t('rankedWaiting.notReady', {}, 'Aguardando');
}

function renderPlayers() {
  if (!playersEl) return;
  const players = rankedState ? getRanked3dPlayers(rankedState) : [];
  const maxPlayers = SETTINGS.maxPlayers || 6;
  const slots = [];

  for (let index = 0; index < maxPlayers; index += 1) {
    const player = players[index] || null;
    if (!player) {
      slots.push(`
        <article class="rank-player-slot is-empty">
          <span>${t('rankedWaiting.searchingSlot', {}, 'Procurando jogador')}</span>
        </article>
      `);
      continue;
    }

    const safeName = escapeHtml(player.name || t('common.player', {}, 'Jogador'));
    const photo = player.photo || (player.ai ? 'assets/img/icons/ghost.svg' : 'assets/img/logo/favicon-coup-master.png');
    const isCurrentPlayer = player.uid === user.uid;
    slots.push(`
      <article class="rank-player-slot${isCurrentPlayer ? ' is-active' : ''}">
        <div class="rank-player-header">
          <img class="rank-player-avatar${player.ai ? ' is-ai-avatar' : ''}" src="${escapeAttribute(photo)}" alt="">
          <div>
            <div class="rank-player-name${player.ai ? ' is-ai' : ''}">${safeName}</div>
            <div class="rank-player-state">${escapeHtml(getPlayerStateLabel(player))}</div>
          </div>
        </div>
      </article>
    `);
  }

  playersEl.innerHTML = slots.join('');
}

function renderInteraction() {
  if (!interactionEl || !rankedState) return;
  const players = getRanked3dPlayers(rankedState);
  const readyPlayers = players.filter((player) => player.ready).length;
  const localPlayer = rankedState.players?.[user.uid];
  const isWaiting = rankedState.status === PHASES.WAITING;

  if (!isWaiting) {
    interactionEl.innerHTML = `
      <div class="rank-waiting-summary">
        <span class="rank-waiting-counter">${t('rankedWaiting.playersFound', { count: players.length, max: SETTINGS.maxPlayers }, `${players.length}/${SETTINGS.maxPlayers} jogadores`)}</span>
        <span class="rank-waiting-countdown">${t('rankedWaiting.matchReady', {}, 'Partida pronta')}</span>
      </div>
      <button class="rank-primary-btn" type="button" disabled>${t('rankedWaiting.gameUiSoon', {}, 'Mesa ranqueada em preparação')}</button>
    `;
    return;
  }

  interactionEl.innerHTML = `
    <div class="rank-waiting-summary">
      <span class="rank-waiting-counter">${t('rankedWaiting.playersReady', { ready: readyPlayers, count: players.length }, `${readyPlayers}/${players.length} prontos`)}</span>
      <span class="rank-waiting-countdown">${escapeHtml(formatCountdown(rankedState.deadline))}</span>
    </div>
    <button id="rankReadyBtn" class="rank-primary-btn" type="button">
      ${localPlayer?.ready ? t('rankedWaiting.cancelReady', {}, 'Cancelar prontidão') : t('rankedWaiting.readyAction', {}, 'Estou pronto')}
    </button>
  `;

  document.getElementById('rankReadyBtn')?.addEventListener('click', toggleReadyState);
}

function renderState() {
  if (!rankedState) return;
  const isWaiting = rankedState.status === PHASES.WAITING;

  if (phaseTitleEl) {
    phaseTitleEl.textContent = isWaiting
      ? t('rankedWaiting.searchingTitle', {}, 'Procurando partida')
      : t('rankedWaiting.readyTitle', {}, 'Partida encontrada');
  }
  if (phaseDescriptionEl) {
    phaseDescriptionEl.textContent = isWaiting
      ? t('rankedWaiting.searchingDescription', {}, 'O sistema preenche a mesa com oponentes IA e inicia quando todos confirmarem prontidão.')
      : t('rankedWaiting.readyDescription', {}, 'O motor ranqueado iniciou a partida. Abrindo a mesa 3D...');
  }

  renderInteraction();
  renderPlayers();
  if (!isWaiting) openRankedTable();
}

async function toggleReadyState() {
  if (busy) return;
  busy = true;
  try {
    await toggleRankedReady(roomCode, user);
  } catch (error) {
    showError(error.message || t('rankedWaiting.readyError', {}, 'Não foi possível alterar prontidão.'));
  } finally {
    busy = false;
  }
}

async function leaveRankedWaitingRoom() {
  if (busy) return;
  busy = true;
  setLoading(t('rankedWaiting.leaving', {}, 'Saindo da sala ranqueada...'));
  try {
    await leaveRankedRoom(roomCode, user);
  } catch (error) {
    console.error(error);
  } finally {
    location.assign('lobby.html');
  }
}

function startTimers() {
  stopTimers();
  matchmakingTimer = window.setInterval(async () => {
    if (!rankedState || rankedState.status !== PHASES.WAITING) return;
    try {
      await advanceRankedRoom(roomCode, user);
    } catch (error) {
      console.warn('Nao foi possivel avancar matchmaking ranqueado.', error);
    }
  }, MATCHMAKING_TICK_MS);

  countdownTimer = window.setInterval(() => {
    if (rankedState?.status === PHASES.WAITING && rankedState.deadline) renderInteraction();
  }, 250);
}

function stopTimers() {
  if (matchmakingTimer) window.clearInterval(matchmakingTimer);
  if (countdownTimer) window.clearInterval(countdownTimer);
  matchmakingTimer = null;
  countdownTimer = null;
}

// Abre a mesa 3D com uma autorizacao curta gerada pela tela de espera.
function openRankedTable() {
  if (openingRankedTable) return;
  openingRankedTable = true;
  stopTimers();
  unsubscribeState?.();
  sessionStorage.setItem(ROOM_LAUNCH_STORAGE_KEY, createRoomLaunchToken(roomCode));
  const url = new URL('index.html', location.href);
  url.searchParams.set('room', roomCode);
  url.searchParams.set('mode', 'ranked');
  location.assign(url.href);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

async function boot() {
  if (!user) return;
  if (!roomCode) {
    location.replace('lobby.html');
    return;
  }

  setupInvite();
  setLoading(t('rankedWaiting.loading', {}, 'Entrando na sala ranqueada...'));

  try {
    await joinRankedRoom(roomCode, user);
    rankedState = await getRankedRoomState(roomCode);
    setConnectionStatus(t('rankedWaiting.connected', {}, 'Sincronizado'));
    renderState();
    hideLoading();

    unsubscribeState = subscribeRankedRoomState(roomCode, (state) => {
      rankedState = state;
      setConnectionStatus(t('rankedWaiting.connected', {}, 'Sincronizado'));
      renderState();
    });
    startTimers();
  } catch (error) {
    console.error(error);
    hideLoading();
    setConnectionStatus(t('rankedWaiting.noConnection', {}, 'Sem conexão'), false);
    showError(error.message || t('rankedWaiting.joinError', {}, 'Não foi possível entrar na sala ranqueada.'));
  }
}

leaveBtn?.addEventListener('click', leaveRankedWaitingRoom);
errorConfirmBtn?.addEventListener('click', () => {
  closeError();
  if (!rankedState) location.assign('lobby.html');
});
roomCodeBtn?.addEventListener('click', async () => {
  if (await copyText(roomCode)) {
    roomCodeBtn.classList.add('is-copied');
    roomCodeBtn.textContent = t('rankedWaiting.codeCopied', {}, 'Código copiado!');
    window.setTimeout(() => {
      roomCodeBtn.classList.remove('is-copied');
      roomCodeBtn.textContent = t('rankedWaiting.roomCode', { code: roomCode }, `Sala: ${roomCode}`);
    }, 1300);
  }
});
roomQrImg?.addEventListener('click', async () => {
  await copyText(getRankedRoomUrl());
});
window.addEventListener('beforeunload', () => {
  unsubscribeState?.();
  stopTimers();
});

Promise.all([
  window.CoupLanguage?.ready || Promise.resolve(),
  document.fonts?.ready?.catch?.(() => null) || Promise.resolve()
]).then(boot);
