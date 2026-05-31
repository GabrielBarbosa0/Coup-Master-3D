import { requireAuth } from '../firebase/auth-service.js';
import {
  leaveRoom,
  markPlayerConnected,
  normalizeRoomCode,
  roomExists,
  subscribeRoomPlayers
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

const leaveRoomBtn = document.getElementById('leaveRoomBtn3d');
leaveRoomBtn?.addEventListener('click', async () => {
  leaveRoomBtn.disabled = true;
  await leaveRoom(requestedRoom, user);
  localStorage.removeItem('coupMaster3dRoom');
  location.assign('lobby.html');
});

await import('./app.js');

// Liga os jogadores online aos badges locais, sem sincronizar cartas ou objetos.
subscribeRoomPlayers(requestedRoom, (players) => {
  players
    .filter((player) => player.connected)
    .sort((a, b) => (a.seat || 99) - (b.seat || 99))
    .slice(0, 8)
    .forEach((player, index) => {
      const seat = player.seat || index + 1;
      window.CoupMaster3D?.setPlayerProfile(seat, {
        displayName: player.displayName,
        photoURL: player.photoURL
      });
    });
});
