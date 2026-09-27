const QR_CODE_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';

let copyResetTimer = null;
let lastCopyTarget = null;

// Configura o modal de compartilhamento da sala casual 3D.
export function setupShareRoomService(options = {}) {
  const {
    shareRoomBtn,
    shareRoomModal,
    closeShareRoomBtn,
    shareRoomCodeCopy,
    shareRoomCode,
    shareRoomLinkCopy,
    shareRoomQr,
    shareRoomCopyStatus,
    openModal,
    closeModal,
    getRoomCode,
    t = fallbackTranslate
  } = options;

  const state = {
    shareRoomModal,
    shareRoomCodeCopy,
    shareRoomCode,
    shareRoomLinkCopy,
    shareRoomQr,
    shareRoomCopyStatus,
    closeModal,
    getRoomCode,
    t
  };

  shareRoomBtn?.addEventListener('click', () => {
    if (!getRoomCode?.()) return;
    renderShareRoomModal(state);
    openModal?.(shareRoomModal);
  });

  closeShareRoomBtn?.addEventListener('click', () => closeModal?.(shareRoomModal));
  shareRoomModal?.addEventListener('click', (event) => {
    if (event.target === shareRoomModal) closeModal?.(shareRoomModal);
  });

  shareRoomCodeCopy?.addEventListener('click', () => copyShareRoomCode(state));
  shareRoomCodeCopy?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    copyShareRoomCode(state);
  });
  shareRoomLinkCopy?.addEventListener('click', () => copyShareRoomLink(state));

  renderShareRoomModal(state);
}

// Atualiza codigo e QR Code quando o estado da sala muda.
export function renderShareRoomModal(options = {}) {
  const { shareRoomCode, shareRoomQr, getRoomCode, t } = options;
  const roomCode = getRoomCode?.() || '';
  const roomUrl = getRoomUrl(roomCode);

  if (shareRoomCode) shareRoomCode.textContent = roomCode || '...';

  if (shareRoomQr) {
    shareRoomQr.src = getQrCodeUrl(roomUrl);
    shareRoomQr.alt = roomCode
      ? t('three.roomQrWithCode', { room: roomCode }, `QR Code da sala ${roomCode}`)
      : t('three.roomQr', {}, 'QR Code da sala');
  }
}

function fallbackTranslate(_key, _params, fallback = '') {
  return fallback;
}

function getRoomUrl(roomCode) {
  if (!roomCode) return '';
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomCode);
  url.hash = '';
  return url.toString();
}

function getQrCodeUrl(roomUrl) {
  if (!roomUrl) return '';
  const params = new URLSearchParams({
    size: '220x220',
    margin: '12',
    data: roomUrl
  });
  return `${QR_CODE_ENDPOINT}?${params.toString()}`;
}

async function copyShareRoomCode(state) {
  const roomCode = state.getRoomCode?.() || '';
  await copyText(
    roomCode,
    state.shareRoomCodeCopy,
    state.t('three.roomCodeLabel', {}, 'Código da sala'),
    state.t('three.codeCopied', {}, 'Código copiado!'),
    state.t('three.copyCodeHint', {}, 'Clique para copiar o código da sala'),
    state
  );
}

async function copyShareRoomLink(state) {
  const roomUrl = getRoomUrl(state.getRoomCode?.() || '');
  await copyText(
    roomUrl,
    state.shareRoomLinkCopy,
    state.t('three.roomLink', {}, 'Link da sala'),
    state.t('three.linkCopied', {}, 'Link copiado!'),
    state.t('three.copyLinkHint', {}, 'Clique no QR Code para copiar o link da sala'),
    state
  );
}

async function copyText(value, target, fallbackLabel, successMessage, defaultTitle, state) {
  if (!value) return;

  if (await writeClipboardText(value)) {
    notifyShareCopied(target, successMessage, defaultTitle, state);
    return;
  }

  window.alert?.(`${fallbackLabel}: ${value}`);
}

async function writeClipboardText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn('Clipboard API indisponivel; tentando copia alternativa.', error);
    }
  }

  return copyWithSelection(value);
}

function copyWithSelection(value) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.setAttribute('aria-hidden', 'true');
  textArea.style.position = 'fixed';
  textArea.style.inset = '-9999px auto auto -9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    console.warn('Copia alternativa indisponivel:', error);
  } finally {
    textArea.remove();
  }

  return copied;
}

function notifyShareCopied(target, message, defaultTitle, state) {
  if (!target) return;

  if (lastCopyTarget && lastCopyTarget !== target) {
    lastCopyTarget.classList.remove('copied');
    lastCopyTarget.title = lastCopyTarget.dataset.defaultCopyTitle || '';
  }

  target.dataset.defaultCopyTitle = defaultTitle;
  target.classList.remove('copied');
  void target.offsetWidth;
  target.classList.add('copied');
  target.title = message;
  lastCopyTarget = target;

  if (state.shareRoomCopyStatus) {
    state.shareRoomCopyStatus.textContent = message;
    state.shareRoomCopyStatus.classList.add('copied');
  }

  if (copyResetTimer) window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    target.classList.remove('copied');
    target.title = defaultTitle;
    if (state.shareRoomCopyStatus) {
      state.shareRoomCopyStatus.textContent = state.t('three.scanToJoin', {}, 'Escaneie para entrar');
      state.shareRoomCopyStatus.classList.remove('copied');
    }
    copyResetTimer = null;
    lastCopyTarget = null;
  }, 1200);
}
