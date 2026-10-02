import * as THREE from 'three';
import {
  HAND_RADIUS,
  PLAYER_AVATAR_SIZE,
  PLAYER_BADGE_HEIGHT,
  PLAYER_BADGE_RADIAL_OFFSET,
  PLAYER_NAME_HEIGHT,
  PLAYER_NAME_WIDTH,
  getRuntimePlayerCount
} from './config.js';

const badgeState = {
  badges: new Map(),
  getScene: () => null,
  getCamera: () => null,
  getPlayers: () => [],
  getViewPlayer: () => 1,
  loadTexture: () => null,
  disposeObject3D: () => {}
};

// Recebe as dependencias do app principal usadas pelos badges 3D.
function setupPlayerBadges(options = {}) {
  badgeState.getScene = options.getScene || badgeState.getScene;
  badgeState.getCamera = options.getCamera || badgeState.getCamera;
  badgeState.getPlayers = options.getPlayers || badgeState.getPlayers;
  badgeState.getViewPlayer = options.getViewPlayer || badgeState.getViewPlayer;
  badgeState.loadTexture = options.loadTexture || badgeState.loadTexture;
  badgeState.disposeObject3D = options.disposeObject3D || badgeState.disposeObject3D;
}

// Cria os nomes e avatares flutuantes de cada jogador ao redor da mesa.
function createPlayerBadges() {
  const scene = badgeState.getScene();
  if (!scene) return;

  badgeState.badges.forEach((badge) => {
    scene.remove(badge.group);
    badgeState.disposeObject3D(badge.group);
  });
  badgeState.badges.clear();

  getPlayers().forEach((player) => {
    const group = new THREE.Group();
    group.name = `player-badge-${player.id}`;
    group.userData.playerBadge = true;
    group.position.copy(getPlayerBadgePosition(player.id));

    const avatar = createPlayerAvatarMesh(player);
    avatar.position.set(0, 0.26, 0);
    group.add(avatar);

    const label = createPlayerNameMesh(player.name, player.id === badgeState.getViewPlayer());
    label.position.set(0, -0.04, 0.01);
    group.add(label);

    scene.add(group);
    badgeState.badges.set(player.id, { group, avatar, label });
  });

  updatePlayerBadges();
}

// Recria os materiais do badge quando nome, avatar ou destaque mudam.
function refreshPlayerBadge(playerId) {
  const player = getPlayerById(playerId);
  const badge = badgeState.badges.get(playerId);
  if (!player || !badge) return;

  const nextAvatar = createPlayerAvatarMesh(player);
  nextAvatar.position.copy(badge.avatar.position);
  badge.group.remove(badge.avatar);
  badgeState.disposeObject3D(badge.avatar);
  badge.group.add(nextAvatar);
  badge.avatar = nextAvatar;

  const nextLabel = createPlayerNameMesh(player.name, playerId === badgeState.getViewPlayer());
  nextLabel.position.copy(badge.label.position);
  badge.group.remove(badge.label);
  badgeState.disposeObject3D(badge.label);
  badge.group.add(nextLabel);
  badge.label = nextLabel;
}

// Mantem placas de jogador posicionadas e sempre voltadas para a camera.
function updatePlayerBadges() {
  const camera = badgeState.getCamera();
  if (!camera) return;

  badgeState.badges.forEach((badge, playerId) => {
    const player = getPlayerById(playerId);
    badge.group.visible = Boolean(player?.isReserved) && playerId !== badgeState.getViewPlayer();
    badge.group.position.copy(getPlayerBadgePosition(playerId));
    badge.group.lookAt(camera.position);
  });
}

// Cria a placa de texto do nome do jogador como textura transparente.
function createPlayerNameMesh(name, active = false) {
  const texture = createPlayerNameTexture(name, active);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLAYER_NAME_WIDTH, PLAYER_NAME_HEIGHT), material);
  mesh.renderOrder = 30;
  return mesh;
}

// Desenha o nome do jogador com contorno para ficar legivel sobre a mesa.
function createPlayerNameTexture(name, active = false) {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 512;
  canvasEl.height = 128;
  const ctx = canvasEl.getContext('2d');
  const displayName = String(name || 'Jogador').slice(0, 22);

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.font = '700 52px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.strokeText(displayName, canvasEl.width / 2, canvasEl.height / 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = active ? 'rgba(24, 242, 138, 0.9)' : 'rgba(255, 255, 255, 0.55)';
  ctx.strokeText(displayName, canvasEl.width / 2, canvasEl.height / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayName, canvasEl.width / 2, canvasEl.height / 2);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Cria o avatar do jogador; sem foto externa, usa um placeholder com iniciais.
function createPlayerAvatarMesh(player) {
  const texture = player.avatarUrl
    ? badgeState.loadTexture(player.avatarUrl)
    : createPlayerAvatarTexture(player);
  if (player.avatarUrl && texture) texture.userData.cached = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLAYER_AVATAR_SIZE, PLAYER_AVATAR_SIZE), material);
  mesh.renderOrder = 31;
  return mesh;
}

// Desenha um avatar circular local com as iniciais do jogador.
function createPlayerAvatarTexture(player) {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 256;
  canvasEl.height = 256;
  const ctx = canvasEl.getContext('2d');
  const initials = getPlayerInitials(player.name || `P${player.id}`);
  const hue = (player.id * 43) % 360;

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.clip();

  const gradient = ctx.createLinearGradient(34, 28, 222, 230);
  gradient.addColorStop(0, `hsl(${hue}, 72%, 56%)`);
  gradient.addColorStop(1, `hsl(${(hue + 58) % 360}, 64%, 30%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.arc(80, 68, 68, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 76px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 128, 136);
  ctx.restore();

  ctx.lineWidth = 10;
  ctx.strokeStyle = player.id === badgeState.getViewPlayer() ? '#18f28a' : '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Extrai iniciais curtas do nome do jogador.
function getPlayerInitials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'P';
}

// Retorna a posicao flutuante do nome/avatar de um jogador.
function getPlayerBadgePosition(playerId) {
  const angle = getPlayerAngle(playerId);
  const radius = HAND_RADIUS + PLAYER_BADGE_RADIAL_OFFSET;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    PLAYER_BADGE_HEIGHT,
    Math.sin(angle) * radius
  );
}

// Calcula o angulo radial de um jogador na mesa do modo atual.
function getPlayerAngle(playerId) {
  return -Math.PI / 2 + ((playerId - 1) / getRuntimePlayerCount()) * Math.PI * 2;
}

// Retorna a lista atual de jogadores mantida pelo app principal.
function getPlayers() {
  return badgeState.getPlayers() || [];
}

// Localiza um jogador pelo assento.
function getPlayerById(playerId) {
  return getPlayers()[playerId - 1] || null;
}

export {
  createPlayerBadges,
  refreshPlayerBadge,
  setupPlayerBadges,
  updatePlayerBadges
};
