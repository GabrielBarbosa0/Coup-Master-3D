import {
  child,
  get,
  limitToLast,
  off,
  onValue,
  push,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { database } from './firebase-config.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 4;
const SEAT_ORDER = [1, 5, 3, 7, 4, 6, 2, 8];

// Define nome padrao para contas Google ou visitantes anonimos.
function getPlayerDisplayName(user) {
  return user.displayName || (user.isAnonymous ? 'Visitante' : 'Jogador');
}

// Resolve o UID do administrador permanente da sala.
function getRoomAdminUid(room) {
  return room?.adminUid || room?.createdBy || null;
}

// Normaliza codigo digitado para o formato curto usado nas URLs e no banco.
export function normalizeRoomCode(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

// Cria um codigo curto evitando caracteres visualmente ambiguos.
export function generateRoomCode() {
  const cryptoApi = window.crypto || window.msCrypto;
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

// Cria uma sala nova e registra o criador como primeiro jogador.
export async function createRoom(user) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = generateRoomCode();
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) continue;

    await set(roomRef, {
      code: roomCode,
      adminUid: user.uid,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      status: 'lobby'
    });
    await joinRoom(roomCode, user);
    return roomCode;
  }

  throw new Error('Nao foi possivel gerar um codigo de sala livre.');
}

// Reserva um assento P1-P8 para a conta logada dentro da sala.
async function assignPlayerSeat(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  const playerSnapshot = await get(ref(database, `rooms/${code}/players/${user.uid}`));
  const currentSeat = playerSnapshot.val()?.seat;
  if (currentSeat) {
    const currentSeatSnapshot = await get(ref(database, `rooms/${code}/seats/${currentSeat}`));
    if (currentSeatSnapshot.val() === user.uid) return currentSeat;
  }

  for (const seat of SEAT_ORDER) {
    const seatRef = ref(database, `rooms/${code}/seats/${seat}`);
    const result = await runTransaction(seatRef, (currentUid) => {
      if (currentUid == null || currentUid === user.uid) return user.uid;
      return;
    });
    if (result.committed && result.snapshot.val() === user.uid) return seat;
  }

  throw new Error('Sala cheia.');
}

// Entra em uma sala existente e salva o jogador em rooms/{roomCode}/players/{uid}.
export async function joinRoom(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  if (code.length !== ROOM_CODE_LENGTH) {
    throw new Error('Codigo de sala invalido.');
  }

  const roomRef = ref(database, `rooms/${code}`);
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) {
    throw new Error('Sala nao encontrada.');
  }

  const room = roomSnapshot.val();
  const isAdmin = getRoomAdminUid(room) === user.uid;
  const seat = await assignPlayerSeat(code, user);
  const playerRef = child(roomRef, `players/${user.uid}`);
  const playerData = {
    uid: user.uid,
    seat,
    role: isAdmin ? 'admin' : 'player',
    isAdmin,
    displayName: getPlayerDisplayName(user),
    photoURL: user.photoURL || '',
    connected: true,
    joinedAt: Date.now(),
    lastSeen: Date.now()
  };

  await set(playerRef, playerData);

  return code;
}

// Atualiza a presenca do jogador ao abrir a mesa de uma sala.
export async function markPlayerConnected(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  const seat = await assignPlayerSeat(code, user);
  const roomSnapshot = await get(ref(database, `rooms/${code}`));
  const isAdmin = getRoomAdminUid(roomSnapshot.val()) === user.uid;
  const playerRef = ref(database, `rooms/${code}/players/${user.uid}`);
  await update(playerRef, {
    seat,
    role: isAdmin ? 'admin' : 'player',
    isAdmin,
    displayName: getPlayerDisplayName(user),
    photoURL: user.photoURL || '',
    connected: true,
    lastSeen: Date.now()
  });

  const latestPlayer = await get(playerRef);
  return latestPlayer.val()?.seat || seat;
}

// Mantem a presenca viva sem liberar o slot ao fechar ou minimizar a aba.
export async function refreshPlayerPresence(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !user) return;

  await update(ref(database, `rooms/${code}/players/${user.uid}`), {
    connected: true,
    lastSeen: Date.now()
  });
}

// Marca o jogador como fora da sala casual sem encerrar a sessao Google.
export async function leaveRoom(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !user) return;

  await update(ref(database, `rooms/${code}/players/${user.uid}`), {
    connected: false,
    lastSeen: Date.now()
  });
}

// Remove explicitamente um jogador da sala e libera o assento reservado.
export async function removeRoomPlayer(roomCode, user, targetPlayer) {
  const code = normalizeRoomCode(roomCode);
  const targetUid = targetPlayer?.uid;
  if (!code || !user || !targetUid) {
    throw new Error('Jogador invalido.');
  }

  if (targetUid === user.uid) {
    throw new Error('O host nao pode remover a si mesmo.');
  }

  const roomRef = ref(database, `rooms/${code}`);
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) {
    throw new Error('Sala nao encontrada.');
  }

  if (getRoomAdminUid(roomSnapshot.val()) !== user.uid) {
    throw new Error('Apenas o host pode remover jogadores.');
  }

  const playerSnapshot = await get(child(roomRef, `players/${targetUid}`));
  const player = playerSnapshot.val();
  const seat = targetPlayer.seat || player?.seat || null;
  const updates = {
    [`players/${targetUid}`]: null
  };

  if (seat) {
    updates[`seats/${seat}`] = null;
  }

  await update(roomRef, updates);
}

// Escuta jogadores com assento reservado na sala.
export function subscribeRoomPlayers(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const playersRef = ref(database, `rooms/${code}/players`);

  onValue(playersRef, (snapshot) => {
    const players = [];
    snapshot.forEach((childSnapshot) => {
      const player = childSnapshot.val();
      if (player?.seat) players.push(player);
    });
    callback(players.sort((a, b) => (a.seat || 99) - (b.seat || 99)));
  });

  return () => off(playersRef);
}

// Le a sala uma vez para validar entrada direta por URL.
export async function roomExists(roomCode) {
  const code = normalizeRoomCode(roomCode);
  if (code.length !== ROOM_CODE_LENGTH) return false;
  const snapshot = await get(ref(database, `rooms/${code}`));
  return snapshot.exists();
}

// Le metadados permanentes da sala, incluindo o administrador criador.
export async function getRoomInfo(roomCode) {
  const code = normalizeRoomCode(roomCode);
  if (code.length !== ROOM_CODE_LENGTH) return null;
  const snapshot = await get(ref(database, `rooms/${code}`));
  if (!snapshot.exists()) return null;
  const room = snapshot.val();
  return {
    code,
    adminUid: getRoomAdminUid(room),
    createdBy: room.createdBy || null,
    status: room.status || 'lobby'
  };
}

// Le o snapshot compartilhado da mesa casual.
export async function getRoomTableState(roomCode) {
  const code = normalizeRoomCode(roomCode);
  const snapshot = await get(ref(database, `rooms/${code}/tableState`));
  return snapshot.val();
}

// Publica o estado final de uma acao na mesa casual.
export async function writeRoomTableState(roomCode, user, tableState) {
  const code = normalizeRoomCode(roomCode);
  await set(ref(database, `rooms/${code}/tableState`), {
    ...tableState,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid
  });
}

// Escuta snapshots de mesa publicados por outros jogadores.
export function subscribeRoomTableState(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const tableStateRef = ref(database, `rooms/${code}/tableState`);

  onValue(tableStateRef, (snapshot) => {
    callback(snapshot.val());
  });

  return () => off(tableStateRef);
}

// Publica uma acao discreta de mesa para que outros clientes animem localmente.
export async function sendRoomTableAction(roomCode, user, action) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !user || !action?.type) return null;

  const actionId = action.id || push(ref(database, `rooms/${code}/tableActions`)).key;
  const actionRef = ref(database, `rooms/${code}/tableActions/${actionId}`);
  await set(actionRef, {
    ...action,
    id: actionId,
    actorUid: user.uid,
    actorName: getPlayerDisplayName(user),
    createdAt: action.createdAt || Date.now(),
    serverCreatedAt: serverTimestamp()
  });
  return actionId;
}

// Escuta as ultimas acoes discretas publicadas na mesa casual.
export function subscribeRoomTableActions(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const actionsRef = query(ref(database, `rooms/${code}/tableActions`), limitToLast(40));

  onValue(actionsRef, (snapshot) => {
    const actions = [];
    snapshot.forEach((childSnapshot) => {
      const action = childSnapshot.val();
      if (action?.type) actions.push({ ...action, id: action.id || childSnapshot.key });
    });
    callback(actions.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
  });

  return () => off(actionsRef);
}

// Envia uma mensagem de chat casual para a sala.
export async function sendRoomChatMessage(roomCode, user, message) {
  const code = normalizeRoomCode(roomCode);
  const text = String(message?.text || '').trim().slice(0, 240);
  if (!code || !user || !text) return null;

  const messageRef = push(ref(database, `rooms/${code}/chatMessages`));
  const chatMessage = {
    id: messageRef.key,
    type: message.type || 'text',
    text,
    actorUid: user.uid,
    actorName: getPlayerDisplayName(user),
    actorPhotoURL: user.photoURL || '',
    actorSeat: message.actorSeat || null,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp()
  };

  await set(messageRef, chatMessage);
  return chatMessage;
}

// Escuta as ultimas mensagens de chat da sala.
export function subscribeRoomChatMessages(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const messagesRef = query(ref(database, `rooms/${code}/chatMessages`), limitToLast(60));

  onValue(messagesRef, (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message?.text) messages.push({ ...message, id: message.id || childSnapshot.key });
    });
    callback(messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
  });

  return () => off(messagesRef);
}

// Envia um pedido para espectar a mao de outro jogador.
export async function sendSpectatorRequest(roomCode, user, targetPlayer) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !user || !targetPlayer?.uid) return null;

  const requestRef = push(ref(database, `rooms/${code}/spectatorRequests`));
  const request = {
    id: requestRef.key,
    requesterUid: user.uid,
    requesterName: getPlayerDisplayName(user),
    requesterPhotoURL: user.photoURL || '',
    targetUid: targetPlayer.uid,
    targetSeat: targetPlayer.seat || null,
    targetName: targetPlayer.displayName || targetPlayer.name || 'Jogador',
    status: 'pending',
    createdAt: Date.now()
  };

  await set(requestRef, request);
  return request;
}

// Responde um pedido recebido pelo jogador alvo.
export async function respondSpectatorRequest(roomCode, requestId, status) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !requestId) return;

  await update(ref(database, `rooms/${code}/spectatorRequests/${requestId}`), {
    status,
    respondedAt: Date.now()
  });
}

// Remove um pedido ja consumido para manter a sala leve.
export async function clearSpectatorRequest(roomCode, requestId) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !requestId) return;
  await set(ref(database, `rooms/${code}/spectatorRequests/${requestId}`), null);
}

// Escuta pedidos de espectador relevantes para o usuario local.
export function subscribeSpectatorRequests(roomCode, user, callback) {
  const code = normalizeRoomCode(roomCode);
  const requestsRef = ref(database, `rooms/${code}/spectatorRequests`);

  onValue(requestsRef, (snapshot) => {
    const requests = [];
    snapshot.forEach((childSnapshot) => {
      const request = childSnapshot.val();
      if (!request) return;
      if (request.targetUid === user.uid || request.requesterUid === user.uid) {
        requests.push({ ...request, id: request.id || childSnapshot.key });
      }
    });
    callback(requests);
  });

  return () => off(requestsRef);
}
