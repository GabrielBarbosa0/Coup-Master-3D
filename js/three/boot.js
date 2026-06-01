import { requireAuth } from '../firebase/auth-service.js';
import {
  getRoomTableState,
  leaveRoom,
  markPlayerConnected,
  normalizeRoomCode,
  refreshPlayerPresence,
  roomExists,
  subscribeRoomPlayers,
  subscribeRoomTableState,
  writeRoomTableState
} from '../firebase/room-service.js';

const params = new URLSearchParams(location.search);
const requestedRoom = normalizeRoomCode(params.get('room') || localStorage.getItem('coupMaster3dRoom') || '');
const user = await requireAuth('login.html');

if (!user) {
  throw new Error('Login obrigatorio para abrir a mesa.');
}

if (!requestedRoom || !(await roomExists(requestedRoom))) {
  location.replace('lobby.html');
  throw new Error('Sala obrigatoria para abrir a mesa.');
}

localStorage.setItem('coupMaster3dRoom', requestedRoom);
const playerSeat = await markPlayerConnected(requestedRoom, user);
window.CoupMaster3DOnline = {
  roomCode: requestedRoom,
  playerSeat,
  user
};
const presenceTimer = window.setInterval(() => {
  refreshPlayerPresence(requestedRoom, user).catch((error) => {
    console.error('Falha ao atualizar presenca.', error);
  });
}, 20_000);

const leaveRoomBtn = document.getElementById('leaveRoomBtn3d');
leaveRoomBtn?.addEventListener('click', async () => {
  leaveRoomBtn.disabled = true;
  window.clearInterval(presenceTimer);
  await leaveRoom(requestedRoom, user);
  localStorage.removeItem('coupMaster3dRoom');
  location.assign('lobby.html');
});

await import('./app.js');

let syncReady = false;
window.CoupMaster3DOnline.publishTableState = (tableState) => {
  if (!syncReady) return;
  writeRoomTableState(requestedRoom, user, tableState).catch((error) => {
    console.error('Falha ao sincronizar mesa.', error);
  });
};

const initialTableState = await getRoomTableState(requestedRoom);
if (initialTableState) {
  window.CoupMaster3D?.applyTableState?.(initialTableState);
} else {
  await writeRoomTableState(requestedRoom, user, window.CoupMaster3D?.getTableState?.());
}
syncReady = true;

// Aplica estados finais publicados por outros jogadores.
subscribeRoomTableState(requestedRoom, (tableState) => {
  if (!tableState || tableState.updatedBy === user.uid) return;
  window.CoupMaster3D?.applyTableState?.(tableState);
});

// Liga jogadores online aos badges locais e mantem o assento da conta atual.
subscribeRoomPlayers(requestedRoom, (players) => {
  const connectedPlayers = players
    .filter((player) => player.connected)
    .sort((a, b) => (a.seat || 99) - (b.seat || 99));
  const localPlayer = connectedPlayers.find((player) => player.uid === user.uid);

  if (localPlayer?.seat && localPlayer.seat !== window.CoupMaster3DOnline.playerSeat) {
    window.CoupMaster3DOnline.playerSeat = localPlayer.seat;
    window.CoupMaster3D?.setLocalPlayerSeat?.(localPlayer.seat);
  }

  window.CoupMaster3D?.setOnlinePlayerProfiles?.(
    connectedPlayers.slice(0, 8).map((player, index) => ({
      seat: player.seat || index + 1,
      displayName: player.displayName,
      photoURL: player.photoURL
    }))
  );
});
