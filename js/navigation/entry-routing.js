const DEFAULT_LOBBY_PATH = 'lobby.html';
const ROOM_LAUNCH_TOKEN_TTL_MS = 15_000;
const ROOM_LAUNCH_STORAGE_KEY = 'coupMaster3dRoomLaunch';

// Normaliza codigos de sala sem depender do Firebase.
function normalizeEntryRoomCode(roomCode) {
  return String(roomCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

// Monta a URL do lobby preservando o codigo da sala apenas para preenchimento manual.
function getLobbyUrlForRoom(roomCode) {
  const code = normalizeEntryRoomCode(roomCode);
  return code ? `${DEFAULT_LOBBY_PATH}?room=${encodeURIComponent(code)}` : DEFAULT_LOBBY_PATH;
}

// Cria uma autorizacao curta para abrir a mesa depois de clicar pelo lobby.
function createRoomLaunchToken(roomCode, now = Date.now()) {
  return JSON.stringify({
    room: normalizeEntryRoomCode(roomCode),
    createdAt: now
  });
}

// Confere se a abertura da mesa foi iniciada pelo lobby nesta mesma aba.
function isValidRoomLaunchToken(token, roomCode, now = Date.now()) {
  if (!token) return false;

  try {
    const parsed = JSON.parse(token);
    const room = normalizeEntryRoomCode(parsed?.room);
    const requestedRoom = normalizeEntryRoomCode(roomCode);
    const createdAt = Number(parsed?.createdAt) || 0;

    return Boolean(
      room
      && requestedRoom
      && room === requestedRoom
      && now - createdAt >= 0
      && now - createdAt <= ROOM_LAUNCH_TOKEN_TTL_MS
    );
  } catch {
    return false;
  }
}

// Permite recarregar somente a sala que este navegador ja abriu pelo fluxo valido.
function isStoredRoomResume(storedRoomCode, requestedRoomCode) {
  const storedRoom = normalizeEntryRoomCode(storedRoomCode);
  const requestedRoom = normalizeEntryRoomCode(requestedRoomCode);
  return Boolean(storedRoom && requestedRoom && storedRoom === requestedRoom);
}

// Evita que o login redirecione direto para a mesa por links externos ou URLs antigas.
function getSafeLoginNextPath(rawNext, currentHref = globalThis.location?.href || 'https://coupmaster.com.br/login.html') {
  if (!rawNext) return DEFAULT_LOBBY_PATH;

  try {
    const url = new URL(rawNext, currentHref);
    const currentUrl = new URL(currentHref);
    if (url.origin !== currentUrl.origin) return DEFAULT_LOBBY_PATH;

    const page = url.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html') {
      return getLobbyUrlForRoom(url.searchParams.get('room'));
    }
    if (page === 'login.html') return DEFAULT_LOBBY_PATH;

    return `${page}${url.search || ''}${url.hash || ''}`;
  } catch {
    return DEFAULT_LOBBY_PATH;
  }
}

export {
  ROOM_LAUNCH_STORAGE_KEY,
  createRoomLaunchToken,
  getLobbyUrlForRoom,
  getSafeLoginNextPath,
  isStoredRoomResume,
  isValidRoomLaunchToken,
  normalizeEntryRoomCode
};
