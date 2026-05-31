import {
  child,
  get,
  off,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { database } from './firebase-config.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 5;
const SEAT_LAYOUTS = {
  1: [1],
  2: [1, 5],
  3: [1, 4, 7],
  4: [1, 3, 5, 7],
  5: [1, 3, 4, 6, 8],
  6: [1, 2, 4, 5, 6, 8],
  7: [1, 2, 3, 4, 6, 7, 8],
  8: [1, 2, 3, 4, 5, 6, 7, 8]
};

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

  for (let seat = 1; seat <= 8; seat += 1) {
    const seatRef = ref(database, `rooms/${code}/seats/${seat}`);
    const result = await runTransaction(seatRef, (currentUid) => {
      if (currentUid == null || currentUid === user.uid) return user.uid;
      return;
    });
    if (result.committed && result.snapshot.val() === user.uid) return seat;
  }

  throw new Error('Sala cheia.');
}

// Reorganiza assentos conectados para ficarem espalhados ao redor da mesa.
async function rebalanceRoomSeats(roomCode) {
  const code = normalizeRoomCode(roomCode);
  const playersRef = ref(database, `rooms/${code}/players`);
  const snapshot = await get(playersRef);
  const players = [];

  snapshot.forEach((childSnapshot) => {
    const player = childSnapshot.val();
    if (player?.connected) players.push(player);
  });

  players.sort((a, b) => {
    const joinedA = Number(a.joinedAt) || 0;
    const joinedB = Number(b.joinedAt) || 0;
    if (joinedA !== joinedB) return joinedA - joinedB;
    return String(a.uid).localeCompare(String(b.uid));
  });

  const layout = SEAT_LAYOUTS[Math.min(players.length, 8)] || SEAT_LAYOUTS[8];
  const nextSeats = {};

  const updates = players.slice(0, 8).map((player, index) => {
    const seat = layout[index];
    nextSeats[seat] = player.uid;
    return update(child(playersRef, `${player.uid}`), { seat });
  });

  await Promise.all(updates);
  await set(ref(database, `rooms/${code}/seats`), nextSeats);
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

  const seat = await assignPlayerSeat(code, user);
  const playerRef = child(roomRef, `players/${user.uid}`);
  const playerData = {
    uid: user.uid,
    seat,
    displayName: user.displayName || 'Jogador',
    photoURL: user.photoURL || '',
    connected: true,
    joinedAt: Date.now(),
    lastSeen: serverTimestamp()
  };

  await set(playerRef, playerData);
  await onDisconnect(playerRef).update({
    connected: false,
    lastSeen: serverTimestamp()
  });
  await rebalanceRoomSeats(code);

  return code;
}

// Atualiza a presenca do jogador ao abrir a mesa de uma sala.
export async function markPlayerConnected(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  const seat = await assignPlayerSeat(code, user);
  const playerRef = ref(database, `rooms/${code}/players/${user.uid}`);
  await update(playerRef, {
    seat,
    displayName: user.displayName || 'Jogador',
    photoURL: user.photoURL || '',
    connected: true,
    lastSeen: serverTimestamp()
  });
  await onDisconnect(playerRef).update({
    connected: false,
    lastSeen: serverTimestamp()
  });
  await rebalanceRoomSeats(code);

  const latestPlayer = await get(playerRef);
  return latestPlayer.val()?.seat || seat;
}

// Marca o jogador como fora da sala casual sem encerrar a sessao Google.
export async function leaveRoom(roomCode, user) {
  const code = normalizeRoomCode(roomCode);
  if (!code || !user) return;

  const playerRef = ref(database, `rooms/${code}/players/${user.uid}`);
  const playerSnapshot = await get(playerRef);
  const seat = playerSnapshot.val()?.seat;
  await update(playerRef, {
    connected: false,
    lastSeen: serverTimestamp()
  });
  if (seat) {
    await set(ref(database, `rooms/${code}/seats/${seat}`), null);
  }
  await rebalanceRoomSeats(code);
}

// Escuta a lista de jogadores da sala, sem sincronizar componentes da mesa.
export function subscribeRoomPlayers(roomCode, callback) {
  const code = normalizeRoomCode(roomCode);
  const playersRef = ref(database, `rooms/${code}/players`);

  onValue(playersRef, (snapshot) => {
    const players = [];
    snapshot.forEach((childSnapshot) => {
      players.push(childSnapshot.val());
    });
    callback(players);
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
