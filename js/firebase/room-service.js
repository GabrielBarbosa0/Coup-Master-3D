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
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp()
  };

  await set(playerRef, playerData);
  await onDisconnect(playerRef).update({
    connected: false,
    lastSeen: serverTimestamp()
  });

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
  return seat;
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
