import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import * as config from './config.js';
import * as dom from './dom.js';

const {
  acceptSpectatorBtn,
  altRuleBackImg,
  altRuleCounter,
  altRuleFlipCard,
  altRuleFrontImg,
  altRulesBtn,
  altRulesModal,
  applyDeckConfigBtn,
  asylumCardBtn,
  bgmAudio,
  cameraDebugEl,
  canvas,
  chatBtn,
  chatForm,
  chatInput,
  chatMessagesList,
  chatModal,
  chatQuickMessages,
  chatStatusText,
  clearObjectsBtn,
  closeChatBtn,
  closeAltRulesBtn,
  closeConfigModalBtn,
  closeFeedbackBtn,
  closePlayerInfoBtn,
  closeRuleCardsBtn,
  closeSettingsBtn,
  closeSpectatorBtn,
  configModal,
  confirmRemovePlayerBtn,
  dealBtn,
  deckCountEl,
  deleteSelectionBtn,
  declineSpectatorBtn,
  diceBtn,
  drawBtn,
  feedbackBtn,
  feedbackModal,
  flipSelectionBtn,
  focusCameraBtn,
  fullscreenBtn,
  goldCoinBtn,
  hoverTooltipEl,
  infoBtn,
  musicBtn,
  objectCountEl,
  openDeckConfigBtn,
  cancelRemovePlayerBtn,
  religionCardBtn,
  removePlayerBtn,
  resetBtn,
  resetVfxAudio,
  rollBtn,
  rotateLeftBtn,
  rotateRightBtn,
  roomCodeStatusBtn,
  roomPlayerList,
  ruleBackImg,
  ruleCardsCounter,
  ruleCardsModal,
  ruleFlipCard,
  ruleFrontImg,
  sendChatBtn,
  settingsBtn,
  settingsModal,
  shuffleBtn,
  silverCoinBtn,
  spectatorBtn,
  spectatorModal,
  spectatorPlayerList,
  spectatorRequestModal,
  spectatorRequestText,
  spectatorStatusText,
  playerInfoModal,
  playerInfoName,
  playerInfoNote,
  playerInfoRole,
  playerInfoSeat,
  playerInfoStatus,
  playerRemoveConfirm,
  tableCountEl,
  vfxVolumeSlider,
  volumeSlider
} = dom;

const {
  ALT_RULE_IMAGES,
  ASYLUM_CARD_AREA_SCALE,
  ASYLUM_CARD_ASPECT,
  CARD_D,
  CARD_H,
  CARD_LABELS,
  CARD_LIBRARY,
  CARD_RADIUS,
  CARD_REST_Y,
  CARD_RETURN_COOLDOWN_MS,
  CARD_W,
  COIN_HEIGHT,
  COIN_TEXTURES,
  DECK_BASE_HEIGHT,
  DECK_DRAG_HOLD_MS,
  DECK_ROTATION_Y,
  DECK_STACK_GAP,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_HEIGHT,
  DEFAULT_CAMERA_TARGET,
  DEFAULT_DECK_CONFIG,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_VFX_VOLUME,
  DIE_SIZE,
  FELT_RADIUS,
  GOLD_COIN_RADIUS,
  HAND_LADDER_DEPTH,
  HAND_LADDER_LIFT,
  HAND_LADDER_ROTATION,
  HAND_LADDER_SPACING,
  HAND_RADIUS,
  LIMBO_RADIUS,
  LIMBO_Y,
  OBJECT_ROTATION_STEP,
  PLAYER_AVATAR_SIZE,
  PLAYER_BADGE_HEIGHT,
  PLAYER_BADGE_RADIAL_OFFSET,
  PLAYER_COUNT,
  PLAYER_NAME_HEIGHT,
  PLAYER_NAME_WIDTH,
  PLAY_RADIUS,
  RELIGION_CARD_ASPECT,
  RELIGION_CARD_HEIGHT_SCALE,
  RULE_CARD_GROUPS,
  SILVER_COIN_RADIUS,
  SPECIAL_CARD_LABELS,
  SPECIAL_CARD_TEXTURES,
  TABLE_PHYSICS_RADIUS,
  TABLE_RADIUS,
  TABLE_STACK_GAP,
  TABLE_STACK_MERGE_RADIUS,
  TABLE_STACK_RADIUS,
  TABLE_TEXTURES
} = config;

const state = {
  activePlayer: 1,
  viewPlayer: 1,
  deckConfig: { ...DEFAULT_DECK_CONFIG },
  deck: [],
  tableCards: [],
  players: Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    id: index + 1,
    uid: null,
    name: `Jogador ${index + 1}`,
    avatarUrl: null,
    isReserved: false,
    isOnline: false,
    coinCount: 0,
    cards: []
  }))
};

const DRAW_ACTION_SYNC_DELAY_MS = 560;
const RETURN_ACTION_SYNC_DELAY_MS = 620;
const DEAL_CARD_DELAY_MS = 140;
const CHAT_MESSAGE_MAX_LENGTH = 240;
const QUICK_CHAT_MESSAGES = [
  'Sou o Duque',
  'Sou o Capitão',
  'Sou a Condessa',
  'Taxar',
  'Extorquir',
  'Assassinar',
  'Trocar',
  'Investigar',
  'Contesto',
  'Bloqueio'
];

const app = {
  renderer: null,
  scene: null,
  inspectScene: null,
  inspectCamera: null,
  inspectGroup: null,
  inspectClone: null,
  inspectedPiece: null,
  inspectedPieceKey: null,
  inspectAltDown: false,
  lastCameraDebugText: '',
  camera: null,
  controls: null,
  world: null,
  table: null,
  deckMesh: null,
  deckBody: null,
  deckRim: null,
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12),
  dragPoint: new THREE.Vector3(),
  dragOffset: new THREE.Vector3(),
  dragged: null,
  dragMode: null,
  dragQuat: null,
  dragOrigin: null,
  dragStart: null,
  pendingDeckDrag: null,
  pendingStackDrag: null,
  hasDragged: false,
  selectedRoomPlayer: null,
  lastCardClick: null,
  lastCardReturnAt: 0,
  selectedCard: null,
  selectedObject: null,
  hoveredDrop: null,
  hoveredPiece: null,
  hoverOutline: null,
  cameraFocus: null,
  spectatorRequest: null,
  deckShuffle: null,
  deckVisualCount: -1,
  deckHitHeight: 0,
  stackShuffleTimers: new Map(),
  ruleImages: [],
  ruleImageIndex: 0,
  altRuleIndex: 0,
  cards: new Map(),
  objects: new Map(),
  playerBadges: new Map(),
  tableStacks: [],
  dropZones: [],
  objectId: 1,
  stackId: 1,
  isDealing: false,
  musicStarted: false,
  musicMuted: false,
  resumeMusicWhenVisible: false,
  vfxVolume: DEFAULT_VFX_VOLUME,
  lastResetVfxAt: 0,
  vfx: new Map(),
  syncTimer: null,
  tableSyncSuppressCount: 0,
  isApplyingRemoteState: false,
  isAdmin: Boolean(window.CoupMaster3DOnline?.isAdmin),
  appliedTableActions: new Set(),
  chatMessages: [],
  chatMessagesInitialized: false,
  roomCodeFeedbackTimer: null,
  lastTime: performance.now(),
  textures: {}
};

await RAPIER.init();
init();
resetMvp();
animate();

// Inicializa renderer, cena, camera, controles, fisica e eventos principais.
function init() {
  app.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  app.renderer.shadowMap.enabled = true;
  app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  app.scene = new THREE.Scene();
  app.scene.background = new THREE.Color(0x171d26);

  app.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 80);
  app.camera.position.copy(getPlayerCameraPosition(state.viewPlayer));
  createInspectOverlay();

  app.controls = new OrbitControls(app.camera, canvas);
  app.controls.target.copy(DEFAULT_CAMERA_TARGET);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.08;
  app.controls.minDistance = 5;
  app.controls.maxDistance = 24;
  app.controls.maxPolarAngle = Math.PI * 0.48;
  app.controls.minPolarAngle = Math.PI * 0.19;
  app.controls.screenSpacePanning = false;
  app.controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: null
  };

  app.world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
  app.world.timestep = 1 / 60;

  createLights();
  createTable();
  createBoundaries();
  createDropZones();
  createPlayerBadges();
  createDeck();
  setupSettingsModal();
  setupChatPanel();
  setupRoomPlayerList();
  setupMusicControls();
  window.CoupMaster3D = {
    ...(window.CoupMaster3D || {}),
    applyTableState,
    getTableState,
    setAdminRole,
    setLocalPlayerSeat,
    setOnlinePlayerProfiles,
    showSpectatorRequest,
    showSpectatorResponse,
    startSpectatingPlayer,
    applyTableAction,
    setChatMessages,
    setPlayerProfile
  };
  syncAdminControls();

  drawBtn.addEventListener('click', () => drawCardToPlayer(state.activePlayer));
  goldCoinBtn.addEventListener('click', () => spawnCoin('gold'));
  silverCoinBtn.addEventListener('click', () => spawnCoin('silver'));
  asylumCardBtn.addEventListener('click', () => spawnSpecialCard('asilo'));
  religionCardBtn.addEventListener('click', () => spawnSpecialCard('religiao'));
  diceBtn.addEventListener('click', () => spawnDie());
  rollBtn.addEventListener('click', rollDice);
  clearObjectsBtn?.addEventListener('click', clearTableObjects);
  shuffleBtn.addEventListener('click', shuffleDeck);
  dealBtn.addEventListener('click', dealInitialHands);
  flipSelectionBtn.addEventListener('click', flipSelectedCards);
  rotateLeftBtn.addEventListener('click', () => rotateSelectedPiece(1));
  rotateRightBtn.addEventListener('click', () => rotateSelectedPiece(-1));
  deleteSelectionBtn.addEventListener('click', deleteSelectedPiece);
  focusCameraBtn.addEventListener('click', focusTableCamera);
  resetBtn.addEventListener('pointerdown', playResetSoundFromButton);
  resetBtn.addEventListener('click', triggerResetFromButton);
  roomCodeStatusBtn?.addEventListener('click', copyRoomCodeFromHud);
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', hideInspectOverlay);
  canvas.addEventListener('dblclick', onDoubleClick);
}

// Cria a iluminacao global e os pontos de destaque da mesa.
function createLights() {
  const ambient = new THREE.HemisphereLight(0xb8d4ff, 0x151a22, 1.75);
  app.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xf3f8ff, 2.55);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  app.scene.add(key);

  const rim = new THREE.PointLight(0x4aa6ff, 28, 12);
  rim.position.set(3.8, 2.2, -3.2);
  app.scene.add(rim);
}

// Cria a cena usada para inspecionar objetos de perto com Alt.
function createInspectOverlay() {
  app.inspectScene = new THREE.Scene();
  app.inspectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  app.inspectCamera.position.set(0, 8, 0);
  app.inspectCamera.up.set(0, 0, -1);
  app.inspectCamera.lookAt(0, 0, 0);

  app.inspectGroup = new THREE.Group();
  app.inspectGroup.visible = false;
  app.inspectScene.add(app.inspectGroup);

  app.inspectScene.add(new THREE.AmbientLight(0xffffff, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2.2, 5, 2.8);
  app.inspectScene.add(key);
  resizeInspectOverlay();
}

// Mantem o overlay ortografico proporcional ao viewport atual.
function resizeInspectOverlay() {
  if (!app.inspectCamera) return;
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  const view = 1.28;
  app.inspectCamera.left = -view * aspect;
  app.inspectCamera.right = view * aspect;
  app.inspectCamera.top = view;
  app.inspectCamera.bottom = -view;
  app.inspectCamera.updateProjectionMatrix();
}

// Monta a mesa visual, o feltro, o chao do limbo e o collider do tampo.
function createTable() {
  const tableGeo = new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.34, 8, 1, false, Math.PI / 8);
  const tableMat = new THREE.MeshStandardMaterial({
    map: makeRepeatingTexture(TABLE_TEXTURES.wood, 4, 4),
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04
  });
  app.table = new THREE.Mesh(tableGeo, tableMat);
  app.table.position.y = -0.17;
  app.table.receiveShadow = true;
  app.scene.add(app.table);

  const feltGeo = new THREE.CylinderGeometry(FELT_RADIUS, FELT_RADIUS, 0.045, 8, 1, false, Math.PI / 8);
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x15202a,
    roughness: 0.92,
    metalness: 0.02
  });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 0.005;
  felt.receiveShadow = true;
  app.scene.add(felt);

  const floorGeo = new THREE.PlaneGeometry(45, 45);
  // cor do quadrado menor
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x171d26 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  app.scene.add(floor);

  const groundBody = app.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.005, 0));
  const groundCollider = RAPIER.ColliderDesc.cylinder(0.05, TABLE_PHYSICS_RADIUS);
  groundCollider.setFriction(1.25);
  groundCollider.setRestitution(0.12);
  app.world.createCollider(groundCollider, groundBody);
}

// Carrega uma textura de mesa com repeticao para evitar esticamento visual.
function makeRepeatingTexture(path, repeatX, repeatY) {
  const texture = loadTexture(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// Adiciona paredes fisicas invisiveis ao redor da mesa octogonal.
function createBoundaries() {
  const wallHeight = 0.08;
  const wallY = -0.01;
  const wallThickness = 0.18;
  const sideLength = 2 * TABLE_RADIUS * Math.sin(Math.PI / 8);
  const apothem = TABLE_RADIUS * Math.cos(Math.PI / 8);

  for (let i = 0; i < PLAYER_COUNT; i++) {
    const angle = Math.PI / 8 + (i * Math.PI * 2) / PLAYER_COUNT;
    const x = Math.cos(angle) * apothem;
    const z = Math.sin(angle) * apothem;
    const body = app.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, wallY, z)
        .setRotation(rapierQuatFromEuler(0, -angle, 0))
    );
    const collider = RAPIER.ColliderDesc.cuboid(sideLength / 2, wallHeight / 2, wallThickness / 2);
    collider.setFriction(0.7);
    collider.setRestitution(0.28);
    app.world.createCollider(collider, body);
  }
}

// Cria as areas visuais onde cartas podem ser soltas.
function createDropZones() {
  app.dropZones = [];

  const tableZone = makeOctagonZone('table', 0, 0, PLAY_RADIUS * 1.38 * 0.45, 0x1d5d8f, 0.08);
  app.dropZones.push(tableZone);

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const pos = getPlayerSeatPosition(i);
    const zone = makeZone(`player-${i}`, pos.x, pos.z, 1.90, 1.25, i === state.viewPlayer ? 0x18f28a : 0x3da3ff, 0.16);
    zone.userData.playerId = i;
    zone.rotation.z = -getPlayerAngle(i) + Math.PI / 2;
    app.dropZones.push(zone);
  }
}

// Cria uma zona retangular de drop para a mao de um jogador.
function makeZone(id, x, z, width, depth, color, opacity) {
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const zone = new THREE.Mesh(geo, mat);
  zone.name = id;
  zone.userData.dropZone = true;
  zone.userData.baseOpacity = opacity;
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(x, 0.03, z);
  app.scene.add(zone);
  return zone;
}

// Cria a zona central octogonal de drop da mesa.
function makeOctagonZone(id, x, z, radius, color, opacity) {
  const geo = new THREE.CircleGeometry(radius, 8);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const zone = new THREE.Mesh(geo, mat);
  zone.name = id;
  zone.userData.dropZone = true;
  zone.userData.baseOpacity = opacity;
  zone.rotation.x = -Math.PI / 2;
  zone.rotation.z = Math.PI / 8;
  zone.position.set(x, 0.031, z);
  app.scene.add(zone);
  return zone;
}

// Cria os nomes e avatares flutuantes de cada jogador ao redor da mesa.
function createPlayerBadges() {
  app.playerBadges.forEach((badge) => {
    app.scene.remove(badge.group);
    disposeObject3D(badge.group);
  });
  app.playerBadges.clear();

  state.players.forEach((player) => {
    const group = new THREE.Group();
    group.name = `player-badge-${player.id}`;
    group.userData.playerBadge = true;
    group.position.copy(getPlayerBadgePosition(player.id));

    const avatar = createPlayerAvatarMesh(player);
    avatar.position.set(0, 0.26, 0);
    group.add(avatar);

    const label = createPlayerNameMesh(player.name, player.id === state.viewPlayer);
    label.position.set(0, -0.04, 0.01);
    group.add(label);

    app.scene.add(group);
    app.playerBadges.set(player.id, { group, avatar, label });
  });

  updatePlayerBadges();
}

// Atualiza um perfil local de jogador; futuramente recebe displayName/photoURL do Google.
function setPlayerProfile(playerId, profile = {}) {
  const player = state.players[playerId - 1];
  if (!player) return;

  player.name = profile.name || profile.displayName || player.name || `Jogador ${playerId}`;
  player.uid = profile.uid || player.uid || null;
  player.avatarUrl = profile.avatarUrl || profile.photoURL || player.avatarUrl || null;
  player.isReserved = true;
  player.isOnline = profile.connected !== false;
  refreshPlayerBadge(playerId);
  renderRoomPlayerList();
}

// Reaplica jogadores com assento reservado e limpa slots removidos pelo host.
function setOnlinePlayerProfiles(profiles = []) {
  const reservedSeats = new Set(profiles.map(profile => profile.seat).filter(Boolean));

  profiles.forEach((profile) => {
    setPlayerProfile(profile.seat, profile);
  });

  state.players.forEach((player) => {
    if (reservedSeats.has(player.id)) return;
    player.name = `Jogador ${player.id}`;
    player.uid = null;
    player.avatarUrl = null;
    player.isReserved = false;
    player.isOnline = false;
    player.coinCount = 0;
  });

  state.players.forEach(player => refreshPlayerBadge(player.id));
  updatePlayerBadges();
  renderRoomPlayerList();
  refreshOpenPlayerInfoModal();
}

// Recria os materiais do badge quando nome, avatar ou destaque mudam.
function refreshPlayerBadge(playerId) {
  const player = state.players[playerId - 1];
  const badge = app.playerBadges.get(playerId);
  if (!player || !badge) return;

  const nextAvatar = createPlayerAvatarMesh(player);
  nextAvatar.position.copy(badge.avatar.position);
  badge.group.remove(badge.avatar);
  disposeObject3D(badge.avatar);
  badge.group.add(nextAvatar);
  badge.avatar = nextAvatar;

  const nextLabel = createPlayerNameMesh(player.name, playerId === state.viewPlayer);
  nextLabel.position.copy(badge.label.position);
  badge.group.remove(badge.label);
  disposeObject3D(badge.label);
  badge.group.add(nextLabel);
  badge.label = nextLabel;
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
    ? loadTexture(player.avatarUrl)
    : createPlayerAvatarTexture(player);
  if (player.avatarUrl) texture.userData.cached = true;
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
  ctx.strokeStyle = player.id === state.viewPlayer ? '#18f28a' : '#ffffff';
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

// Cria o deck visual central e prepara sua borda e collider.
function createDeck() {
  const geo = createRoundedCardGeometry(CARD_W, CARD_H, DECK_BASE_HEIGHT, CARD_RADIUS);
  const materials = makeDeckHitMaterials();
  app.deckMesh = new THREE.Mesh(geo, materials);
  app.deckMesh.position.set(0, CARD_REST_Y + getDeckHeight() / 2, 0);
  app.deckMesh.rotation.y = DECK_ROTATION_Y;
  app.deckMesh.castShadow = false;
  app.deckMesh.receiveShadow = false;
  app.deckMesh.name = 'deck';
  app.deckMesh.userData.deck = true;
  syncDeckHitboxGeometry();
  updateDeckVisualLayers();
  app.scene.add(app.deckMesh);
  createDeckRim();
  updateDeckCollider();
}

// Recria a pilha visual do deck com uma camada para cada carta real.
function updateDeckVisualLayers(force = false) {
  if (!app.deckMesh) return;
  const layerCount = getVisibleDeckLayerCount();
  if (!force && app.deckVisualCount === layerCount) return;

  clearDeckVisualLayers();
  app.deckVisualCount = layerCount;
  if (layerCount <= 0) return;

  const layerGeo = createRoundedCardGeometry(CARD_W, CARD_H, CARD_D, CARD_RADIUS);
  const deckHeight = getDeckHeight();

  for (let i = 0; i < layerCount; i++) {
    const layer = new THREE.Mesh(layerGeo, makeDeckLayerMaterials(i === layerCount - 1));
    layer.position.y = -deckHeight / 2 + CARD_D / 2 + i * getDeckLayerStep();
    layer.castShadow = i === layerCount - 1;
    layer.receiveShadow = true;
    layer.name = `deck-layer-${i + 1}`;
    app.deckMesh.add(layer);
  }
}

// Remove camadas visuais antigas do deck antes de reconstruir.
function clearDeckVisualLayers() {
  if (!app.deckMesh) return;

  while (app.deckMesh.children.length > 0) {
    const child = app.deckMesh.children.pop();
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach(material => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  }
}

// Libera geometrias, materiais e texturas de um objeto visual removido da cena.
function disposeObject3D(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material].filter(Boolean);
    materials.forEach((material) => {
      if (material.map && !material.map.userData?.cached) {
        material.map.dispose();
      }
      material.dispose?.();
    });
  });
}

// Adiciona o aro branco superior que destaca a borda do deck.
function createDeckRim() {
  const outer = createRoundedRectShape(CARD_W, CARD_H, CARD_RADIUS);
  const inner = createRoundedRectShape(CARD_W - 0.07, CARD_H - 0.07, Math.max(0.01, CARD_RADIUS - 0.035));
  const rimShape = outer;
  rimShape.holes.push(inner);

  const geo = new THREE.ShapeGeometry(rimShape, 14);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf4f7ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94,
    depthWrite: false
  });

  app.deckRim = new THREE.Mesh(geo, mat);
  app.deckRim.name = 'deck-rim';
  app.scene.add(app.deckRim);
  syncDeckRim();
}

// Retorna o deck para o centro e ressincroniza seus auxiliares.
function resetDeckPosition() {
  if (!app.deckMesh) return;

  syncDeckHitboxGeometry();
  app.deckMesh.position.set(0, CARD_REST_Y + getDeckHeight() / 2, 0);
  app.deckMesh.rotation.y = DECK_ROTATION_Y;
  syncDeckRim();
  updateDeckCollider();
}

// Configura o chat casual da sala e as mensagens rapidas.
function setupChatPanel() {
  chatBtn?.addEventListener('click', openChatModal);
  closeChatBtn?.addEventListener('click', () => closeModal(chatModal));

  chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChatMessage(chatInput?.value || '');
  });

  renderQuickChatButtons();
  renderChatMessages();
}

// Abre o painel de chat e remove o indicador de mensagens novas.
function openChatModal() {
  chatBtn?.classList.remove('chat-btn-has-unread');
  openModal(chatModal);
  renderChatMessages();
  window.setTimeout(() => chatInput?.focus(), 60);
}

// Cria chips de mensagens comuns para partidas sem chamada de voz.
function renderQuickChatButtons() {
  if (!chatQuickMessages) return;
  chatQuickMessages.innerHTML = '';

  QUICK_CHAT_MESSAGES.forEach((message) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-quick-btn';
    button.textContent = message;
    button.addEventListener('click', () => sendChatMessage(message, 'quick'));
    chatQuickMessages.append(button);
  });
}

// Envia texto livre ou chip rapido para o Firebase.
async function sendChatMessage(text, type = 'text') {
  const messageText = String(text || '').trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
  if (!messageText) return;

  if (!window.CoupMaster3DOnline?.sendChatMessage) {
    if (chatStatusText) chatStatusText.textContent = 'Chat online indisponivel.';
    return;
  }

  if (sendChatBtn) sendChatBtn.disabled = true;
  try {
    await window.CoupMaster3DOnline.sendChatMessage({ text: messageText, type });
    if (chatInput && type === 'text') chatInput.value = '';
    if (chatStatusText) chatStatusText.textContent = 'Converse com a sala.';
  } catch (error) {
    console.error('Falha ao enviar mensagem.', error);
    if (chatStatusText) chatStatusText.textContent = 'Nao foi possivel enviar a mensagem.';
  } finally {
    if (sendChatBtn) sendChatBtn.disabled = false;
    chatInput?.focus();
  }
}

// Recebe mensagens sincronizadas pelo bootstrap online.
function setChatMessages(messages = []) {
  const previousLastId = app.chatMessages.at(-1)?.id || null;
  app.chatMessages = messages.slice(-60);
  const latest = app.chatMessages.at(-1);
  const localUid = window.CoupMaster3DOnline?.user?.uid;

  if (
    app.chatMessagesInitialized &&
    latest?.id &&
    latest.id !== previousLastId &&
    latest.actorUid !== localUid &&
    chatModal?.style.display === 'none'
  ) {
    chatBtn?.classList.add('chat-btn-has-unread');
  }

  app.chatMessagesInitialized = true;
  renderChatMessages();
}

// Desenha a lista de mensagens preservando texto como conteudo seguro.
function renderChatMessages() {
  if (!chatMessagesList) return;
  chatMessagesList.innerHTML = '';

  if (app.chatMessages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chat-empty-message';
    empty.textContent = 'Nenhuma mensagem ainda.';
    chatMessagesList.append(empty);
    return;
  }

  const localUid = window.CoupMaster3DOnline?.user?.uid;
  app.chatMessages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'chat-message';
    if (message.actorUid === localUid) item.classList.add('is-own');
    if (message.type === 'quick') item.classList.add('is-quick');

    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';

    const author = document.createElement('span');
    author.textContent = getChatAuthor(message);

    const time = document.createElement('span');
    time.textContent = formatChatTime(message.createdAt);

    const text = document.createElement('div');
    text.className = 'chat-message-text';
    text.textContent = message.text;

    meta.append(author, time);
    item.append(meta, text);
    chatMessagesList.append(item);
  });

  chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

// Formata o nome do autor com assento quando houver esse dado.
function getChatAuthor(message) {
  const name = message.actorName || 'Jogador';
  return message.actorSeat ? `${name} · P${message.actorSeat}` : name;
}

// Mostra horario curto das mensagens no padrao local.
function formatChatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Configura a lista lateral de jogadores e o modal de informacoes do perfil.
function setupRoomPlayerList() {
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
    button.textContent = player.name || `Jogador ${player.id}`;
    button.title = `${player.name || `Jogador ${player.id}`} · P${player.id}`;
    button.addEventListener('click', () => openPlayerInfoModal(player.id));

    const coinControls = document.createElement('div');
    coinControls.className = 'room-player-coins';
    coinControls.setAttribute('aria-label', `Moedas de ${player.name || `Jogador ${player.id}`}`);

    const removeBtn = createPlayerCoinButton(player.id, -1, '-', 'Remover moeda');
    const count = document.createElement('span');
    count.className = 'room-player-coin-count';
    count.textContent = String(player.coinCount || 0);
    const addBtn = createPlayerCoinButton(player.id, 1, '+', 'Adicionar moeda');

    coinControls.append(removeBtn, count, addBtn);
    row.append(button, coinControls);
    roomPlayerList.append(row);
  });
}

// Cria um botao circular para ajustar o contador manual de moedas.
function createPlayerCoinButton(playerId, delta, label, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'room-player-coin-btn';
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', `${title} do P${playerId}`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    adjustPlayerCoinCount(playerId, delta);
  });
  return button;
}

// Atualiza o contador manual de moedas do jogador e sincroniza a mesa.
function adjustPlayerCoinCount(playerId, delta) {
  const player = state.players[playerId - 1];
  if (!player?.isReserved) return;

  const current = Number(player.coinCount) || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === current) return;

  player.coinCount = next;
  playVfx('falling-coin');
  renderRoomPlayerList();
  scheduleTableSync();
}

// Retorna somente os assentos realmente reservados por jogadores da sala.
function getReservedPlayers() {
  return state.players.filter(player => player.uid && player.isReserved);
}

// Abre o modal com informacoes do jogador escolhido.
function openPlayerInfoModal(playerId) {
  const player = state.players[playerId - 1];
  if (!player?.uid) return;
  app.selectedRoomPlayer = player;
  hidePlayerRemoveConfirmation();
  renderPlayerInfoModal(player);
  openModal(playerInfoModal);
}

// Atualiza o modal aberto quando a lista de jogadores muda.
function refreshOpenPlayerInfoModal() {
  if (!playerInfoModal || playerInfoModal.style.display === 'none') return;
  const player = app.selectedRoomPlayer
    ? state.players[app.selectedRoomPlayer.id - 1]
    : null;

  if (!player?.uid) {
    closePlayerInfoModal();
    return;
  }

  app.selectedRoomPlayer = player;
  renderPlayerInfoModal(player);
}

// Preenche dados e permissao de remocao do modal de jogador.
function renderPlayerInfoModal(player) {
  const localUid = window.CoupMaster3DOnline?.user?.uid;
  const canRemove = Boolean(app.isAdmin && player.uid && player.uid !== localUid);
  const isConfirmingRemoval = Boolean(playerRemoveConfirm && !playerRemoveConfirm.hidden);

  if (playerInfoName) playerInfoName.textContent = player.name || `Jogador ${player.id}`;
  if (playerInfoSeat) playerInfoSeat.textContent = `P${player.id}`;
  if (playerInfoStatus) playerInfoStatus.textContent = player.isOnline ? 'Online' : 'Offline';
  if (playerInfoRole) playerInfoRole.textContent = getPlayerRoomRole(player);

  if (removePlayerBtn) {
    removePlayerBtn.hidden = !canRemove || isConfirmingRemoval;
    removePlayerBtn.disabled = !canRemove;
  }

  if (playerInfoNote) {
    if (!app.isAdmin) {
      playerInfoNote.textContent = 'Apenas o host pode remover jogadores.';
      playerInfoNote.hidden = false;
    } else if (player.uid === localUid) {
      playerInfoNote.textContent = 'Voce nao pode remover a si mesmo.';
      playerInfoNote.hidden = false;
    } else {
      playerInfoNote.textContent = '';
      playerInfoNote.hidden = true;
    }
  }
}

// Mostra se o perfil pertence ao host permanente da sala.
function getPlayerRoomRole(player) {
  const adminUid = window.CoupMaster3DOnline?.adminUid;
  return player.uid && adminUid && player.uid === adminUid ? 'Host' : 'Jogador';
}

// Fecha o modal e limpa estados temporarios de remocao.
function closePlayerInfoModal() {
  app.selectedRoomPlayer = null;
  hidePlayerRemoveConfirmation();
  closeModal(playerInfoModal);
}

// Exibe a confirmacao antes da acao destrutiva do host.
function showPlayerRemoveConfirmation() {
  if (!app.selectedRoomPlayer || !app.isAdmin) return;
  if (playerRemoveConfirm) playerRemoveConfirm.hidden = false;
  if (removePlayerBtn) removePlayerBtn.hidden = true;
}

// Volta ao estado normal do modal de jogador.
function hidePlayerRemoveConfirmation() {
  if (playerRemoveConfirm) playerRemoveConfirm.hidden = true;
  if (removePlayerBtn && app.selectedRoomPlayer) {
    const localUid = window.CoupMaster3DOnline?.user?.uid;
    removePlayerBtn.hidden = !(app.isAdmin && app.selectedRoomPlayer.uid !== localUid);
  }
}

// Remove um jogador da sala atraves do servico online, liberando o assento.
async function removeSelectedRoomPlayer() {
  const player = app.selectedRoomPlayer;
  if (!player?.uid || !app.isAdmin || !window.CoupMaster3DOnline?.removePlayerFromRoom) return;

  if (confirmRemovePlayerBtn) confirmRemovePlayerBtn.disabled = true;
  if (cancelRemovePlayerBtn) cancelRemovePlayerBtn.disabled = true;
  if (playerInfoNote) {
    playerInfoNote.textContent = 'Removendo jogador...';
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
      playerInfoNote.textContent = error?.message || 'Nao foi possivel remover o jogador.';
      playerInfoNote.hidden = false;
    }
  } finally {
    if (confirmRemovePlayerBtn) confirmRemovePlayerBtn.disabled = false;
    if (cancelRemovePlayerBtn) cancelRemovePlayerBtn.disabled = false;
  }
}

// Configura a abertura dos modais de configurações, feedback e baralho.
function setupSettingsModal() {
  syncDeckConfigInputs();

  settingsBtn?.addEventListener('click', () => {
    openModal(settingsModal);
  });

  closeSettingsBtn?.addEventListener('click', () => closeModal(settingsModal));
  feedbackBtn?.addEventListener('click', () => openModal(feedbackModal));
  closeFeedbackBtn?.addEventListener('click', () => closeModal(feedbackModal));
  infoBtn?.addEventListener('click', openRuleCardsModal);
  altRulesBtn?.addEventListener('click', openAltRulesModal);
  spectatorBtn?.addEventListener('click', openSpectatorModal);
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  syncFullscreenButton();

  closeRuleCardsBtn?.addEventListener('click', () => {
    closeModal(ruleCardsModal);
  });
  ruleFlipCard?.addEventListener('click', () => stepRuleCard(1));
  ruleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepRuleCard(1);
    }
  });
  closeAltRulesBtn?.addEventListener('click', () => closeModal(altRulesModal));
  altRuleFlipCard?.addEventListener('click', () => stepAltRuleCard(1));
  altRuleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepAltRuleCard(1);
    }
  });

  closeSpectatorBtn?.addEventListener('click', () => closeModal(spectatorModal));
  acceptSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('accepted'));
  declineSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('declined'));

  openDeckConfigBtn?.addEventListener('click', () => {
    syncDeckConfigInputs();
    closeModal(settingsModal);
    openModal(configModal);
  });

  closeConfigModalBtn?.addEventListener('click', () => {
    closeModal(configModal);
    openModal(settingsModal);
  });

  applyDeckConfigBtn?.addEventListener('click', () => {
    if (!app.isAdmin) return;
    state.deckConfig = readDeckConfigInputs();
    closeModal(configModal);
    resetMvp();
  });

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (!app.isAdmin) return;
      applyDeckPreset(button.dataset.preset);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (overlay === spectatorRequestModal) return;
      if (event.target === overlay) closeModal(overlay);
    });
  });
}

// Atualiza a permissao local de administrador e os controles exclusivos.
function setAdminRole(isAdmin) {
  app.isAdmin = Boolean(isAdmin);
  syncAdminControls();
}

// Esconde reset e deixa a configuracao do baralho em leitura para jogadores comuns.
function syncAdminControls() {
  if (resetBtn) {
    resetBtn.disabled = !app.isAdmin;
    resetBtn.hidden = !app.isAdmin;
    resetBtn.style.display = app.isAdmin ? '' : 'none';
    resetBtn.setAttribute('aria-hidden', String(!app.isAdmin));
  }

  if (openDeckConfigBtn) {
    openDeckConfigBtn.disabled = false;
    openDeckConfigBtn.hidden = false;
    openDeckConfigBtn.removeAttribute('aria-hidden');
  }

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.disabled = !app.isAdmin;
    button.title = app.isAdmin ? '' : 'Apenas o host pode alterar presets.';
  });

  document.querySelectorAll('.card-config-item input').forEach((input) => {
    input.disabled = !app.isAdmin;
    input.title = app.isAdmin ? '' : 'Apenas o host pode editar.';
  });

  if (applyDeckConfigBtn) {
    applyDeckConfigBtn.disabled = !app.isAdmin;
    applyDeckConfigBtn.textContent = app.isAdmin ? 'Aplicar e Resetar Jogo' : 'Apenas o host pode aplicar';
    applyDeckConfigBtn.title = app.isAdmin ? '' : 'Apenas o host pode aplicar esta configuracao.';
  }

  const permissionNote = document.getElementById('deckConfigPermissionNote');
  if (permissionNote) permissionNote.hidden = app.isAdmin;

  refreshOpenPlayerInfoModal();
}

// Abre a lista de jogadores conectados que podem autorizar espectador.
function openSpectatorModal() {
  renderSpectatorTargets();
  openModal(spectatorModal);
  spectatorBtn?.blur();
}

// Atualiza a lista de alvos disponiveis para espectar.
function renderSpectatorTargets(statusText = 'Escolha um jogador.') {
  if (!spectatorPlayerList || !spectatorStatusText) return;

  const localUid = window.CoupMaster3DOnline?.user?.uid;
  const targets = state.players.filter((player) => {
    return player.uid && player.uid !== localUid && player.isOnline;
  });

  spectatorPlayerList.innerHTML = '';
  if (targets.length === 0) {
    spectatorStatusText.textContent = 'Nao ha nenhum jogador para espectar.';
    return;
  }

  spectatorStatusText.textContent = statusText;
  targets.forEach((player) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spectator-player-btn';
    button.innerHTML = `${player.name}<span>P${player.id}</span>`;
    button.addEventListener('click', () => requestSpectatorTarget(player));
    spectatorPlayerList.append(button);
  });
}

// Envia o pedido ao jogador escolhido na sala.
async function requestSpectatorTarget(player) {
  if (!window.CoupMaster3DOnline?.requestSpectate) return;
  spectatorStatusText.textContent = `Pedido enviado para ${player.name}.`;
  spectatorPlayerList.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
  try {
    await window.CoupMaster3DOnline.requestSpectate({
      uid: player.uid,
      seat: player.id,
      displayName: player.name,
      photoURL: player.avatarUrl || ''
    });
  } catch (error) {
    console.error('Falha ao pedir espectador.', error);
    renderSpectatorTargets('Nao foi possivel enviar o pedido.');
  }
}

// Mostra o pedido recebido pelo dono do slot.
function showSpectatorRequest(request) {
  app.spectatorRequest = request;
  if (spectatorRequestText) {
    spectatorRequestText.textContent = `${request.requesterName || 'Um jogador'} quer espectar sua mao.`;
  }
  openModal(spectatorRequestModal);
}

// Responde o pedido atualmente exibido.
async function respondCurrentSpectatorRequest(status) {
  if (!app.spectatorRequest || !window.CoupMaster3DOnline?.respondSpectateRequest) return;
  const request = app.spectatorRequest;
  app.spectatorRequest = null;
  closeModal(spectatorRequestModal);
  await window.CoupMaster3DOnline.respondSpectateRequest(request.id, status);
}

// Muda a visao local para o slot autorizado pelo jogador alvo.
function startSpectatingPlayer(request) {
  if (!request?.targetSeat) return;
  setObservedPlayerSeat(request.targetSeat, { focus: true });
  if (spectatorStatusText) {
    spectatorStatusText.textContent = `Espectando ${request.targetName || 'jogador'}.`;
    spectatorPlayerList.innerHTML = '';
    openModal(spectatorModal);
  }
}

// Mostra retorno de pedido recusado ou expirado.
function showSpectatorResponse(message) {
  if (!spectatorStatusText || !spectatorPlayerList) return;
  spectatorStatusText.textContent = message;
  spectatorPlayerList.innerHTML = '';
  openModal(spectatorModal);
}

// Alterna a página 3D entre tela cheia e modo normal.
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// Atualiza o rótulo acessível do botão de tela cheia.
function syncFullscreenButton() {
  if (!fullscreenBtn) return;
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
  fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Sair da tela cheia' : 'Tela cheia');
  fullscreenBtn.title = isFullscreen ? 'Sair da tela cheia' : 'Tela cheia';
}

// Liga a trilha de fundo ao primeiro gesto do jogador e aos controles de volume.
function setupMusicControls() {
  if (!bgmAudio) return;

  if (volumeSlider) volumeSlider.value = String(DEFAULT_MUSIC_VOLUME);
  if (vfxVolumeSlider) vfxVolumeSlider.value = String(DEFAULT_VFX_VOLUME);
  bgmAudio.volume = DEFAULT_MUSIC_VOLUME;
  bgmAudio.muted = app.musicMuted;
  app.vfxVolume = DEFAULT_VFX_VOLUME;
  preloadVfxAudio();
  setupBackgroundMediaSession();
  syncMusicButton();

  musicBtn?.addEventListener('click', () => {
    app.musicMuted = !app.musicMuted;
    bgmAudio.muted = app.musicMuted;
    if (app.musicMuted) {
      pauseBackgroundMusic(false);
    } else {
      startBackgroundMusic();
    }
    syncMusicButton();
  });

  volumeSlider?.addEventListener('input', () => {
    bgmAudio.volume = clampAudioVolume(volumeSlider.value, DEFAULT_MUSIC_VOLUME);
    if (bgmAudio.volume > 0 && app.musicMuted) {
      app.musicMuted = false;
      bgmAudio.muted = false;
      startBackgroundMusic();
      syncMusicButton();
    }
  });

  vfxVolumeSlider?.addEventListener('input', () => {
    app.vfxVolume = clampAudioVolume(vfxVolumeSlider.value, DEFAULT_VFX_VOLUME);
  });

  window.addEventListener('pointerdown', startBackgroundMusic, { once: true });
  window.addEventListener('keydown', startBackgroundMusic, { once: true });
  document.addEventListener('visibilitychange', handleMusicVisibilityChange);
  window.addEventListener('pagehide', () => pauseBackgroundMusic(false));
}

// Tenta iniciar a música respeitando o bloqueio de autoplay dos navegadores.
function startBackgroundMusic() {
  if (!bgmAudio || app.musicMuted || document.hidden || !bgmAudio.paused) return;
  bgmAudio.volume = clampAudioVolume(volumeSlider?.value, DEFAULT_MUSIC_VOLUME);
  bgmAudio.play()
    .then(() => {
      app.musicStarted = true;
      setMediaSessionPlaybackState('playing');
    })
    .catch(() => {});
}

// Pausa a trilha quando o jogo deixa de estar visivel.
function handleMusicVisibilityChange() {
  if (document.hidden) {
    pauseBackgroundMusic(true);
    return;
  }

  if (!app.resumeMusicWhenVisible || app.musicMuted) return;
  app.resumeMusicWhenVisible = false;
  startBackgroundMusic();
}

// Pausa o BGM e registra se ele deve voltar quando a pagina ficar visivel.
function pauseBackgroundMusic(resumeWhenVisible) {
  if (!bgmAudio) return;
  app.resumeMusicWhenVisible = Boolean(
    resumeWhenVisible
    && !app.musicMuted
    && !bgmAudio.paused
  );
  bgmAudio.pause();
  setMediaSessionPlaybackState('none');
}

// Restringe controles externos de faixa e impede retomada com o jogo oculto.
function setupBackgroundMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;
  const ignoredActions = [
    'pause',
    'stop',
    'seekbackward',
    'seekforward',
    'seekto',
    'previoustrack',
    'nexttrack'
  ];

  ignoredActions.forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, () => {});
    } catch {}
  });

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      if (!document.hidden && !app.musicMuted) startBackgroundMusic();
    });
  } catch {}
}

// Atualiza o estado exposto ao sistema operacional quando suportado.
function setMediaSessionPlaybackState(playbackState) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playbackState;
  } catch {}
}

// Toca um efeito sonoro respeitando o volume global de VFX.
function playVfx(name) {
  const audio = getVfxAudio(name);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = app.vfxVolume;
  audio.play().catch(() => {});
}

// Toca o feedback do reset dentro do clique e reinicia a mesa logo depois.
function triggerResetFromButton(event) {
  event?.stopPropagation();
  if (!app.isAdmin) return;
  playResetSoundOnce();
  window.setTimeout(resetMvp, 90);
}

// Dispara o som no primeiro evento do clique para garantir ativacao de audio.
function playResetSoundFromButton(event) {
  event.stopPropagation();
  if (!app.isAdmin) return;
  playResetSoundOnce();
}

// Evita repetir o efeito quando pointerdown e click chegam juntos.
function playResetSoundOnce() {
  const now = performance.now();
  if (now - app.lastResetVfxAt < 250) return;
  app.lastResetVfxAt = now;
  playVfx('reset-game');
}

// Copia o codigo da sala exibido no HUD.
async function copyRoomCodeFromHud(event) {
  event?.stopPropagation();
  const roomCode = window.CoupMaster3DOnline?.roomCode;
  if (!roomCode) return;

  try {
    await navigator.clipboard?.writeText(roomCode);
    showRoomCodeCopyFeedback('Copiado!');
  } catch {
    showRoomCodeCopyFeedback(`Sala: ${roomCode}`);
  }
}

// Mostra feedback curto sem esconder o codigo por muito tempo.
function showRoomCodeCopyFeedback(message) {
  if (!roomCodeStatusBtn) return;
  roomCodeStatusBtn.textContent = message;
  window.clearTimeout(app.roomCodeFeedbackTimer);
  app.roomCodeFeedbackTimer = window.setTimeout(updateRoomCodeStatus, 900);
}

// Prepara efeitos usados pela interface para evitar atraso no primeiro clique.
function preloadVfxAudio() {
  if (resetVfxAudio) {
    resetVfxAudio.volume = app.vfxVolume;
    app.vfx.set('reset-game', resetVfxAudio);
  }
  getVfxAudio('card-whoosh');
  getVfxAudio('falling-coin');
}

// Cria e reaproveita instâncias de áudio dos efeitos sonoros.
function getVfxAudio(name) {
  if (app.vfx.has(name)) return app.vfx.get(name);

  const audio = new Audio(`assets/sounds/vfx/${name}.mp3`);
  audio.preload = 'auto';
  audio.volume = app.vfxVolume;
  app.vfx.set(name, audio);
  return audio;
}

// Normaliza controles de áudio para o intervalo aceito pelo navegador.
function clampAudioVolume(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 1);
}

// Atualiza o estado visual e acessível do botão de música.
function syncMusicButton() {
  if (!musicBtn) return;
  musicBtn.classList.toggle('is-muted', app.musicMuted);
  musicBtn.setAttribute('aria-pressed', String(app.musicMuted));
  musicBtn.setAttribute('aria-label', app.musicMuted ? 'Ativar música' : 'Mutar música');
  musicBtn.title = app.musicMuted ? 'Ativar música' : 'Mutar música';
}

// Abre o modal com o carrossel de regras alternativas.
function openAltRulesModal() {
  app.altRuleIndex = 0;
  altRuleFlipCard?.classList.remove('is-flipped');
  syncAltRuleImages();
  openModal(altRulesModal);
}

// Avança ou volta no carrossel das regras alternativas.
function stepAltRuleCard(direction) {
  app.altRuleIndex = (app.altRuleIndex + direction + ALT_RULE_IMAGES.length) % ALT_RULE_IMAGES.length;
  playVfx('card-whoosh');
  altRuleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncAltRuleImages, 260);
}

// Mantém a carta alternativa atual, a próxima face e o contador sincronizados.
function syncAltRuleImages() {
  const currentImage = ALT_RULE_IMAGES[app.altRuleIndex];
  const nextImage = ALT_RULE_IMAGES[(app.altRuleIndex + 1) % ALT_RULE_IMAGES.length];
  const currentAlt = `Regra alternativa ${app.altRuleIndex + 1}`;
  const nextAlt = `Regra alternativa ${(app.altRuleIndex + 1) % ALT_RULE_IMAGES.length + 1}`;

  if (altRuleFlipCard?.classList.contains('is-flipped')) {
    if (altRuleBackImg) {
      altRuleBackImg.src = currentImage;
      altRuleBackImg.alt = currentAlt;
    }
    if (altRuleFrontImg) {
      altRuleFrontImg.src = nextImage;
      altRuleFrontImg.alt = nextAlt;
    }
  } else {
    if (altRuleFrontImg) {
      altRuleFrontImg.src = currentImage;
      altRuleFrontImg.alt = currentAlt;
    }
    if (altRuleBackImg) {
      altRuleBackImg.src = nextImage;
      altRuleBackImg.alt = nextAlt;
    }
  }

  if (altRuleCounter) {
    altRuleCounter.textContent = `${app.altRuleIndex + 1} / ${ALT_RULE_IMAGES.length}`;
  }
}

// Abre o modal de variações com as cartas calculadas pela configuração do baralho.
function openRuleCardsModal() {
  app.ruleImages = calculateRuleImages();
  app.ruleImageIndex = 0;
  ruleFlipCard?.classList.remove('is-flipped');
  syncRuleCardImages();
  openModal(ruleCardsModal);
}

// Avança ou volta no carrossel de cartas de regra.
function stepRuleCard(direction) {
  if (!app.ruleImages.length) return;
  app.ruleImageIndex = (app.ruleImageIndex + direction + app.ruleImages.length) % app.ruleImages.length;
  playVfx('card-whoosh');
  ruleFlipCard?.classList.toggle('is-flipped');
  window.setTimeout(syncRuleCardImages, 260);
}

// Mantém frente, verso e contador coerentes com a posição atual do carrossel.
function syncRuleCardImages() {
  if (!app.ruleImages.length) return;

  const currentImage = app.ruleImages[app.ruleImageIndex];
  const nextImage = app.ruleImages[(app.ruleImageIndex + 1) % app.ruleImages.length];
  const currentAlt = getRuleCardAlt(currentImage);
  const nextAlt = getRuleCardAlt(nextImage);

  if (ruleFlipCard?.classList.contains('is-flipped')) {
    if (ruleBackImg) {
      ruleBackImg.src = currentImage;
      ruleBackImg.alt = currentAlt;
    }
    if (ruleFrontImg) {
      ruleFrontImg.src = nextImage;
      ruleFrontImg.alt = nextAlt;
    }
  } else {
    if (ruleFrontImg) {
      ruleFrontImg.src = currentImage;
      ruleFrontImg.alt = currentAlt;
    }
    if (ruleBackImg) {
      ruleBackImg.src = nextImage;
      ruleBackImg.alt = nextAlt;
    }
  }

  if (ruleCardsCounter) {
    ruleCardsCounter.textContent = `${app.ruleImageIndex + 1} / ${app.ruleImages.length}`;
  }
}

// Escolhe as cartas de regra apenas para os grupos ativos no baralho.
function calculateRuleImages() {
  const hasBase = hasConfiguredCards(RULE_CARD_GROUPS.base);
  const hasPromo = hasConfiguredCards(RULE_CARD_GROUPS.promo);
  const hasRevolution = hasConfiguredCards(RULE_CARD_GROUPS.revolution);
  const hasShadows = hasConfiguredCards(RULE_CARD_GROUPS.shadows);

  const images = [];
  if (hasBase) {
    images.push(hasRevolution
      ? 'assets/img/guides/front-actions-alternative.png'
      : 'assets/img/guides/front-actions.png');
  }

  if (hasPromo) images.push('assets/img/guides/dlc-actions.png');
  if (hasRevolution) images.push('assets/img/guides/dlc2-actions.png');
  if (hasShadows) images.push('assets/img/guides/dlc3-actions.png');

  images.push('assets/img/guides/back-actions.png');
  return images;
}

// Verifica se pelo menos uma carta de um grupo está ativa na configuração.
function hasConfiguredCards(cards) {
  return cards.some(card => (state.deckConfig[card] || 0) > 0);
}

// Cria um texto acessível para a carta de regra exibida.
function getRuleCardAlt(path) {
  if (path.includes('front-actions-alternative')) return 'Regras alternativas dos personagens base';
  if (path.includes('front-actions')) return 'Regras dos personagens base';
  if (path.includes('dlc-actions')) return 'Regras de Sombras do Palácio';
  if (path.includes('dlc2-actions')) return 'Regras da Revolução';
  if (path.includes('dlc3-actions')) return 'Regras de Sombras do Asilo';
  return 'Resumo de turno';
}

// Mostra um modal usando o mesmo layout flexível do Coup Master 2D.
function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

// Esconde um modal mantendo a marcação pronta para ser reaberta.
function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

// Informa se algum modal está aberto e deve capturar os atalhos do tabuleiro.
function isAnyModalOpen() {
  return Array.from(document.querySelectorAll('.modal-overlay')).some((modal) => {
    return modal.style.display !== 'none';
  });
}

// Copia a configuração ativa do deck para os campos do modal.
function syncDeckConfigInputs() {
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    const cardType = input.dataset.card;
    input.value = state.deckConfig[cardType] ?? 0;
  });
}

// Lê os campos do modal e devolve uma configuração normalizada do deck.
function readDeckConfigInputs() {
  const config = { ...DEFAULT_DECK_CONFIG };
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    config[input.dataset.card] = clampDeckCopyCount(input.value);
  });
  return config;
}

// Limita a quantidade de cópias por carta ao intervalo aceito pelo modal.
function clampDeckCopyCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 10);
}

// Aplica presets rápidos no modal sem reiniciar a partida imediatamente.
function applyDeckPreset(preset) {
  const baseCards = ['assassino', 'capitao', 'condessa', 'duque', 'embaixador', 'inquisidor'];
  const promoCards = ['benfeitor', 'bufao', 'burgues', 'burocrata'];
  const dlc1Cards = ['bispo', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'];
  const dlc2Cards = ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'];

  document.querySelectorAll('.card-config-item input').forEach((input) => {
    const card = input.dataset.card;
    if (preset === 'clear') {
      input.value = 0;
    } else if (preset === 'test') {
      input.value = 1;
    } else if (preset === 'base_promo') {
      input.value = baseCards.includes(card) || promoCards.includes(card) ? 5 : 0;
    } else if (preset === 'base_dlc1') {
      input.value = baseCards.includes(card) || dlc1Cards.includes(card) ? 5 : 0;
    } else if (preset === 'base_dlc2') {
      input.value = baseCards.includes(card) || dlc2Cards.includes(card) ? 5 : 0;
    } else {
      input.value = baseCards.includes(card) ? 5 : 0;
    }
  });
}

// Reinicia o estado do MVP 3D sem distribuir cartas automaticamente.
function resetMvp() {
  app.isDealing = false;
  app.deckShuffle = null;
  app.pendingDeckDrag = null;
  app.pendingStackDrag = null;
  app.stackShuffleTimers.forEach(timer => window.clearTimeout(timer));
  app.stackShuffleTimers.clear();
  dealBtn.disabled = false;
  shuffleBtn.disabled = false;

  app.cards.forEach((card) => {
    app.scene.remove(card.mesh);
    app.world.removeRigidBody(card.body);
  });
  app.cards.clear();
  app.tableStacks = [];
  clearTableObjects(false);

  state.deck = buildDeck();
  state.tableCards = [];
  state.players.forEach(player => {
    player.cards = [];
    player.coinCount = 0;
  });
  resetDeckPosition();

  setLocalPlayerSeat(getLocalPlayerSeat(), { instant: true });
  renderRoomPlayerList();
  updateHud();
}

// Monta e embaralha o baralho usado pelo modo 3D a partir da configuração atual.
function buildDeck() {
  const cards = [];
  let id = 1;

  CARD_LIBRARY.forEach((def) => {
    const totalCopies = clampDeckCopyCount(state.deckConfig[def.type]);
    for (let copy = 0; copy < totalCopies; copy++) {
      cards.push({
        id: `card-${id++}`,
        type: def.type,
        folder: def.folder,
        faceUp: false,
        location: 'deck',
        owner: null
      });
    }
  });

  return shuffle(cards);
}

// Compra uma carta do deck e anima ate a mao do jogador.
function drawCardToPlayer(playerId, animateDraw = true, options = {}) {
  const targetPlayerId = normalizePlayerId(playerId);
  const data = takeDeckCard(options.cardData);
  if (!data) {
    updateHud();
    return false;
  }

  const action = options.publishAction === false
    ? null
    : publishTableAction('draw-card', {
      playerId: targetPlayerId,
      card: cloneCardData(data),
      animateDraw: Boolean(animateDraw)
    });
  const runDraw = () => animateDrawnCardToPlayer(data, targetPlayerId, animateDraw);

  if (action) {
    runWithTableSyncSuppressed(DRAW_ACTION_SYNC_DELAY_MS, runDraw, scheduleTableSync);
  } else {
    runDraw();
  }

  return true;
}

// Retira do deck a carta solicitada pelo evento ou a carta do topo local.
function takeDeckCard(cardData = null) {
  if (cardData?.id) {
    const deckIndex = state.deck.findIndex(data => data.id === cardData.id);
    if (deckIndex >= 0) return state.deck.splice(deckIndex, 1)[0];
    if (app.cards.has(cardData.id)) return null;
    return cloneCardData(cardData);
  }

  return state.deck.pop() || null;
}

// Anima uma carta ja retirada do deck ate a mao de um jogador.
function animateDrawnCardToPlayer(data, playerId, animateDraw = true) {
  const player = state.players[playerId - 1];
  if (!data || !player || app.cards.has(data.id)) return false;

  playVfx('card-whoosh');
  data.owner = playerId;
  data.location = `player-${playerId}`;
  data.faceUp = true;
  player.cards = player.cards.filter(card => card.id !== data.id);
  player.cards.push(data);

  const card = createCardObject(data);
  const target = getHandCardPosition(playerId, player.cards.length - 1);
  const start = animateDraw ? getDeckDrawPosition(1.0) : target.clone().add(new THREE.Vector3(0, 0.35, 0));
  placeCard(card, start, getHandRotation(playerId), false);
  layoutPlayerHand(playerId, animateDraw ? 0.34 : 0);
  updateHud();
  return true;
}

// Distribui ate duas cartas para cada assento com animacao sequencial.
function dealInitialHands(options = {}) {
  if (app.isDealing) return false;

  const deals = Array.isArray(options.deals)
    ? prepareDealsFromPayload(options.deals)
    : prepareInitialDeals();
  if (deals.length === 0) return false;

  const action = options.publishAction === false
    ? null
    : publishTableAction('deal-initial-hands', {
      deals: deals.map(serializeDeal)
    });
  const runDeal = () => runDealSequence(deals);
  const duration = getDealActionDuration(deals.length);

  if (action) {
    runWithTableSyncSuppressed(duration, runDeal, scheduleTableSync);
  } else {
    runDeal();
  }

  return true;
}

// Prepara a fila local de distribuicao removendo cartas do deck uma unica vez.
function prepareInitialDeals() {
  const dealQueue = getInitialDealQueue();
  const totalCards = Math.min(dealQueue.length, state.deck.length);
  const deals = [];

  dealQueue.slice(0, totalCards).forEach((playerId) => {
    const card = takeDeckCard();
    if (card) deals.push({ playerId, card });
  });

  return deals;
}

// Recria a fila recebida pela rede removendo as mesmas cartas do deck local.
function prepareDealsFromPayload(deals) {
  return deals
    .map((deal) => {
      if (!deal) return null;
      const card = takeDeckCard(deal.card);
      if (!card) return null;
      return {
        playerId: normalizePlayerId(deal.playerId),
        card
      };
    })
    .filter(Boolean);
}

// Executa a animacao sequencial de distribuicao ja preparada.
function runDealSequence(deals) {
  app.isDealing = true;
  dealBtn.disabled = true;

  let completed = 0;
  deals.forEach((deal, index) => {
    window.setTimeout(() => {
      animateDrawnCardToPlayer(deal.card, deal.playerId, true);
      completed += 1;

      if (completed >= deals.length) {
        app.isDealing = false;
        dealBtn.disabled = false;
      }
    }, index * DEAL_CARD_DELAY_MS);
  });
}

// Serializa uma entrada de distribuicao para publicar no Firebase.
function serializeDeal(deal) {
  return {
    playerId: deal.playerId,
    card: cloneCardData(deal.card)
  };
}

// Calcula a janela minima para evitar tableState antes do fim da animacao.
function getDealActionDuration(cardCount) {
  return Math.max(RETURN_ACTION_SYNC_DELAY_MS, (Math.max(cardCount, 1) - 1) * DEAL_CARD_DELAY_MS + DRAW_ACTION_SYNC_DELAY_MS);
}

// Embaralha a ordem interna do deck e dispara a animacao visual.
function shuffleDeck() {
  if (state.deck.length <= 1) return;

  state.deck = shuffle(state.deck);
  updateHud();
}

// Embaralha o deck ou a pilha de cartas atualmente sob o mouse.
function shuffleHoveredCards() {
  const piece = app.hoveredPiece;
  if (!piece) return false;

  if (piece.kind === 'deck') {
    if (state.deck.length <= 1) return false;
    shuffleDeck();
    return true;
  }

  if (!piece.data) return false;
  const stack = getCardStack(piece);
  if (!stack || stack.cards.length <= 1) return false;

  shuffleTableStack(stack);
  return true;
}

// Calcula quais jogadores ainda precisam receber cartas iniciais.
function getInitialDealQueue() {
  const queue = [];
  let seatedPlayers = state.players
    .filter(player => player.isReserved)
    .map(player => player.id);
  if (seatedPlayers.length === 0) seatedPlayers = [state.activePlayer];

  for (let round = 0; round < 2; round++) {
    seatedPlayers.forEach((playerId) => {
      if (state.players[playerId - 1].cards.length <= round) {
        queue.push(playerId);
      }
    });
  }

  return queue;
}

// Retorna a posicao atual de origem para cartas saindo do deck.
function getDeckDrawPosition(yOffset = 0.2) {
  if (!app.deckMesh) return new THREE.Vector3(0, yOffset, 0);

  return new THREE.Vector3(
    app.deckMesh.position.x,
    app.deckMesh.position.y + yOffset,
    app.deckMesh.position.z
  );
}

// Retorna o topo atual do deck para cartas voltando em animacao.
function getDeckReturnPosition() {
  if (!app.deckMesh) return new THREE.Vector3(0, CARD_REST_Y + CARD_D, 0);

  return new THREE.Vector3(
    app.deckMesh.position.x,
    app.deckMesh.position.y + getDeckHeight() / 2 + CARD_D,
    app.deckMesh.position.z
  );
}

// Cria mesh, corpo fisico e dados de runtime para uma carta.
function createCardObject(data) {
  const texturePaths = getCardTexturePaths(data);
  const dimensions = getCardDimensions(data);
  const radius = CARD_RADIUS * Math.min(dimensions.width / CARD_W, dimensions.height / CARD_H);
  const geo = createRoundedCardGeometry(dimensions.width, dimensions.height, CARD_D, radius);
  const mesh = new THREE.Mesh(geo, makeCardMaterials(
    texturePaths.front,
    canRevealCardFace(data),
    null,
    texturePaths.back,
    isPrivateSlotCardHidden(data)
  ));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = data.id;
  mesh.userData.cardId = data.id;
  mesh.userData.card = data;

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, 1, 0)
    .setLinearDamping(4.2)
    .setAngularDamping(7.2);
  const body = app.world.createRigidBody(bodyDesc);
  const collider = RAPIER.ColliderDesc.cuboid(dimensions.width / 2, CARD_D / 2, dimensions.height / 2);
  collider.setDensity(0.36);
  collider.setFriction(1.6);
  collider.setRestitution(0.08);
  const bodyCollider = app.world.createCollider(collider, body);

  app.scene.add(mesh);

  const card = {
    id: data.id,
    data,
    mesh,
    body,
    collider: bodyCollider,
    target: null,
    targetQuat: null,
    flip: null
  };

  app.cards.set(data.id, card);
  return card;
}

// Resolve texturas de frente e verso para cartas comuns e cartas especiais.
function getCardTexturePaths(data) {
  const special = SPECIAL_CARD_TEXTURES[data.type];
  if (special) return special;

  return {
    front: `assets/img/cards/${data.folder}/${data.type}.png`,
    back: 'assets/img/cards/base/back.png'
  };
}

// Retorna dimensoes especiais para cartas auxiliares que nao seguem o padrao.
function getCardDimensions(data) {
  if (data.type === 'asilo') {
    const area = CARD_W * CARD_H * ASYLUM_CARD_AREA_SCALE;
    return {
      width: Math.sqrt(area * ASYLUM_CARD_ASPECT),
      height: Math.sqrt(area / ASYLUM_CARD_ASPECT)
    };
  }

  if (data.type === 'religiao') {
    const height = CARD_H * RELIGION_CARD_HEIGHT_SCALE;
    return {
      width: height * RELIGION_CARD_ASPECT,
      height
    };
  }

  return {
    width: CARD_W,
    height: CARD_H
  };
}

// Gera a geometria extrudada da carta com cantos arredondados reais.
function createRoundedCardGeometry(width, height, depth, radius, segments = 10) {
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  const points = createRoundedRectPoints(width, height, radius, segments);

  const triangles = THREE.ShapeUtils.triangulateShape(points, []);
  const positions = [];
  const normals = [];
  const uvs = [];
  const groups = [];

  const pushVertex = (point, y, normal) => {
    positions.push(point.x, y, point.y);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(1 - ((point.x + halfW) / width), (point.y + halfH) / height);
  };

  const pushTriangle = (a, b, c, y, normal, materialIndex) => {
    const start = positions.length / 3;
    pushVertex(points[a], y, normal);
    pushVertex(points[b], y, normal);
    pushVertex(points[c], y, normal);
    groups.push({ start, count: 3, materialIndex });
  };

  triangles.forEach(([a, b, c]) => {
    pushTriangle(c, b, a, halfD, new THREE.Vector3(0, 1, 0), 1);
    pushTriangle(a, b, c, -halfD, new THREE.Vector3(0, -1, 0), 2);
  });

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const edgeX = next.x - point.x;
    const edgeZ = next.y - point.y;
    const normal = new THREE.Vector3(edgeZ, 0, -edgeX).normalize();
    const start = positions.length / 3;

    positions.push(point.x, halfD, point.y, point.x, -halfD, point.y, next.x, -halfD, next.y);
    positions.push(point.x, halfD, point.y, next.x, -halfD, next.y, next.x, halfD, next.y);

    for (let i = 0; i < 6; i++) {
      normals.push(normal.x, normal.y, normal.z);
    }

    uvs.push(0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1);
    groups.push({ start, count: 6, materialIndex: 0 });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  groups.forEach(group => geometry.addGroup(group.start, group.count, group.materialIndex));
  geometry.computeBoundingSphere();

  return geometry;
}

// Cria uma shape 2D de retangulo arredondado para geometrias planas.
function createRoundedRectShape(width, height, radius) {
  const points = createRoundedRectPoints(width, height, radius, 12);
  const shape = new THREE.Shape();

  points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    } else {
      shape.lineTo(point.x, point.y);
    }
  });

  return shape;
}

// Calcula os pontos de arco usados nos cantos arredondados.
function createRoundedRectPoints(width, height, radius, cornerSegments) {
  const halfW = width / 2;
  const halfH = height / 2;
  const r = Math.min(radius, halfW, halfH);
  const points = [];
  const corners = [
    { x: halfW - r, y: -halfH + r, start: -Math.PI / 2, end: 0 },
    { x: halfW - r, y: halfH - r, start: 0, end: Math.PI / 2 },
    { x: -halfW + r, y: halfH - r, start: Math.PI / 2, end: Math.PI },
    { x: -halfW + r, y: -halfH + r, start: Math.PI, end: Math.PI * 1.5 }
  ];

  corners.forEach((corner, cornerIndex) => {
    for (let i = 0; i <= cornerSegments; i++) {
      if (cornerIndex > 0 && i === 0) continue;

      const t = i / cornerSegments;
      const angle = corner.start + (corner.end - corner.start) * t;
      points.push(new THREE.Vector2(
        corner.x + Math.cos(angle) * r,
        corner.y + Math.sin(angle) * r
      ));
    }
  });

  return points;
}

// Cria uma moeda fisica de ouro ou prata na mesa.
function spawnCoin(type = 'gold', options = {}) {
  const id = options.id || `coin-${app.objectId++}`;
  bumpObjectIdFrom(id);
  const isGold = type === 'gold';
  const radius = isGold ? GOLD_COIN_RADIUS : SILVER_COIN_RADIUS;
  const geo = new THREE.CylinderGeometry(radius, radius, COIN_HEIGHT, 40);
  const mat = makeCoinMaterials(isGold ? 'gold' : 'silver');
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = id;
  mesh.userData.objectId = id;
  mesh.userData.kind = isGold ? 'gold-coin' : 'silver-coin';
  const spawnPlayer = options.playerId || state.activePlayer;
  const initialPosition = vectorFromSnapshot(options.position, getCoinSpawnPosition(spawnPlayer));
  const initialQuaternion = quaternionFromSnapshot(
    options.quaternion,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(random(-0.3, 0.3), random(0, Math.PI * 2), random(-0.3, 0.3)))
  );
  mesh.position.copy(initialPosition);
  mesh.quaternion.copy(initialQuaternion);

  const body = app.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(initialPosition.x, initialPosition.y, initialPosition.z)
      .setRotation(initialQuaternion)
      .setLinearDamping(1.65)
      .setAngularDamping(1.95)
  );
  const collider = RAPIER.ColliderDesc.cylinder(COIN_HEIGHT / 2, radius);
  collider.setDensity(1.2);
  collider.setFriction(1.4);
  collider.setRestitution(0.18);
  const bodyCollider = app.world.createCollider(collider, body);

  app.scene.add(mesh);
  app.objects.set(id, { id, kind: mesh.userData.kind, mesh, body, collider: bodyCollider });
  if (!options.silent) playVfx('falling-coin');
  updateHud();
}

// Cria uma carta especial da DLC de religião diretamente na mesa.
function spawnSpecialCard(type, options = {}) {
  const data = {
    id: options.id || `special-${type}-${app.objectId++}`,
    type,
    folder: 'religion',
    faceUp: options.faceUp ?? true,
    location: 'table',
    owner: null,
    specialCard: true
  };
  bumpObjectIdFrom(data.id);
  state.tableCards.push(data);

  const card = createCardObject(data);
  const defaultPosition = getSpecialCardSpawnPosition(state.activePlayer);
  const position = vectorFromSnapshot(options.position, defaultPosition);
  const rotationY = options.rotationY ?? getHandRotation(state.activePlayer) + random(-0.12, 0.12);
  placeCard(card, position, rotationY, true);
  if (!options.silent) playVfx('card-whoosh');
  updateHud();
}

// Calcula uma posicao em um anel interno proximo ao slot de um jogador.
function getNearbyPlayerSpawnPosition(playerId, y, innerOffset, tangentJitter) {
  const angle = getPlayerAngle(playerId);
  const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const radius = HAND_RADIUS - innerOffset + random(-0.06, 0.06);

  return radial
    .multiplyScalar(radius)
    .add(tangent.multiplyScalar(random(-tangentJitter, tangentJitter)))
    .setY(y);
}

// Posiciona moedas no espaco de mesa mais proximo do jogador que pediu.
function getCoinSpawnPosition(playerId) {
  return getNearbyPlayerSpawnPosition(playerId, 1.2, 0.78, 0.24);
}

// Posiciona cartas especiais em um anel interno proximo ao slot do jogador.
function getSpecialCardSpawnPosition(playerId) {
  return getNearbyPlayerSpawnPosition(playerId, 0.42, 0.74, 0.18);
}

// Cria lateral metalica e textura igual na frente e no verso da moeda.
function makeCoinMaterials(type) {
  const isGold = type === 'gold';
  const texture = loadTexture(COIN_TEXTURES[type]);
  const side = new THREE.MeshStandardMaterial({
    color: isGold ? 0xc99024 : 0xaebbc8,
    roughness: isGold ? 0.36 : 0.34,
    metalness: isGold ? 0.78 : 0.84
  });
  const face = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: isGold ? 0.42 : 0.38,
    metalness: isGold ? 0.38 : 0.45
  });

  return [side, face, face];
}

// Cria um dado fisico e inicia uma rolagem curta.
function spawnDie(options = {}) {
  const id = options.id || `die-${app.objectId++}`;
  bumpObjectIdFrom(id);
  const geo = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  const mesh = new THREE.Mesh(geo, makeDieMaterials());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = id;
  mesh.userData.objectId = id;
  mesh.userData.kind = 'die';
  const initialPosition = vectorFromSnapshot(options.position, new THREE.Vector3(random(-0.55, 0.55), 1.55, random(-0.55, 0.55)));
  const initialQuaternion = quaternionFromSnapshot(
    options.quaternion,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)))
  );
  mesh.position.copy(initialPosition);
  mesh.quaternion.copy(initialQuaternion);

  const body = app.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(initialPosition.x, initialPosition.y, initialPosition.z)
      .setRotation(initialQuaternion)
      .setLinearDamping(0.75)
      .setAngularDamping(0.85)
  );
  const collider = RAPIER.ColliderDesc.cuboid(DIE_SIZE / 2, DIE_SIZE / 2, DIE_SIZE / 2);
  collider.setDensity(0.7);
  collider.setFriction(0.82);
  collider.setRestitution(0.42);
  const bodyCollider = app.world.createCollider(collider, body);

  app.scene.add(mesh);
  app.objects.set(id, { id, kind: 'die', mesh, body, collider: bodyCollider });
  if (!options.silent) rollSingleDie(app.objects.get(id), 0.75);
  updateHud();
}

// Cria os seis materiais texturizados das faces do dado.
function makeDieMaterials() {
  return [1, 6, 2, 5, 3, 4].map((value) => new THREE.MeshStandardMaterial({
    map: makeDieFaceTexture(value),
    roughness: 0.48,
    metalness: 0.02
  }));
}

// Desenha em canvas uma textura de face de dado.
function makeDieFaceTexture(value) {
  const key = `die-face-${value}`;
  if (app.textures[key]) return app.textures[key];

  const dieCanvas = document.createElement('canvas');
  dieCanvas.width = 256;
  dieCanvas.height = 256;
  const ctx = dieCanvas.getContext('2d');
  ctx.fillStyle = '#f5f1e9';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#c7b79b';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.fillStyle = '#10151c';

  const pipMap = {
    1: [[128, 128]],
    2: [[76, 76], [180, 180]],
    3: [[76, 76], [128, 128], [180, 180]],
    4: [[76, 76], [180, 76], [76, 180], [180, 180]],
    5: [[76, 76], [180, 76], [128, 128], [76, 180], [180, 180]],
    6: [[76, 68], [180, 68], [76, 128], [180, 128], [76, 188], [180, 188]]
  };

  pipMap[value].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(dieCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(app.renderer.capabilities.getMaxAnisotropy(), 8);
  app.textures[key] = texture;
  return texture;
}

// Cria materiais da lateral, frente e verso de uma carta.
function makeCardMaterials(frontPath, faceUp, edgeColor = null, backPath = 'assets/img/cards/base/back.png', hideFront = false) {
  const frontTexture = loadTexture(frontPath);
  const backTexture = loadTexture(backPath);
  const faceTexture = hideFront ? backTexture : (faceUp ? frontTexture : backTexture);
  const backFaceTexture = hideFront ? backTexture : (faceUp ? backTexture : frontTexture);
  const edge = new THREE.MeshStandardMaterial({
    color: edgeColor ?? (faceUp ? 0x161d28 : 0x0e1420),
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const face = new THREE.MeshStandardMaterial({
    map: faceTexture,
    roughness: 0.58,
    metalness: 0.02
  });
  const back = new THREE.MeshStandardMaterial({
    map: backFaceTexture,
    roughness: 0.66,
    metalness: 0.02
  });

  return [edge, face, back];
}

// Cria materiais invisiveis para o hitbox clicavel do deck.
function makeDeckHitMaterials() {
  const hit = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false
  });

  return [hit, hit, hit];
}

// Cria materiais de uma camada individual visivel do deck.
function makeDeckLayerMaterials(showBack) {
  const backTexture = loadTexture('assets/img/cards/base/back.png');
  const edge = new THREE.MeshStandardMaterial({
    color: 0xf2f6ff,
    roughness: 0.62,
    metalness: 0.03,
    side: THREE.DoubleSide
  });
  const top = new THREE.MeshStandardMaterial({
    map: showBack ? backTexture : null,
    color: showBack ? 0xffffff : 0xf8fbff,
    roughness: 0.62,
    metalness: 0.02
  });
  const bottom = new THREE.MeshStandardMaterial({
    color: 0xe4ecf8,
    roughness: 0.66,
    metalness: 0.03,
    side: THREE.DoubleSide
  });

  return [edge, top, bottom];
}

// Carrega e reaproveita texturas com cache.
function loadTexture(path) {
  if (app.textures[path]) return app.textures[path];

  const texture = new THREE.TextureLoader().load(
    path,
    undefined,
    undefined,
    () => {
      texture.image = makeFallbackTextureImage();
      texture.needsUpdate = true;
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(app.renderer.capabilities.getMaxAnisotropy(), 8);
  texture.userData.cached = true;
  app.textures[path] = texture;
  return texture;
}

// Cria uma imagem minima para texturas que falharem ao carregar.
function makeFallbackTextureImage() {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 1;
  canvasEl.height = 1;
  return canvasEl;
}

// Atualiza jogador ativo, zonas de destaque e materiais visiveis das maos.
function setActivePlayer(playerId) {
  state.activePlayer = playerId;
  state.viewPlayer = playerId;

  syncPlayerView(playerId);
}

// Atualiza destaque, badges e materiais para o assento atualmente observado.
function syncPlayerView(playerId) {
  state.viewPlayer = playerId;
  app.dropZones.forEach((zone) => {
    if (!zone.userData.playerId) return;
    const active = zone.userData.playerId === playerId;
    zone.material.color.set(active ? 0x18f28a : 0x3da3ff);
    zone.material.opacity = active ? 0.24 : zone.userData.baseOpacity;
  });

  state.players.forEach(player => refreshPlayerBadge(player.id));
  updatePlayerBadges();

  app.cards.forEach(refreshCardMaterial);

  updateHud();
}

// Atualiza o assento da conta local sem expor troca manual de jogadores.
function setLocalPlayerSeat(playerId, options = {}) {
  const seat = playerId || 1;
  state.activePlayer = seat;
  syncPlayerView(options.preserveView ? state.viewPlayer || seat : seat);

  if (options.instant) {
    snapCameraToPlayer(state.viewPlayer);
    return;
  }

  if (options.focus !== false) {
    focusTableCamera();
  }
}

// Retorna o assento online do jogador local, ou P1 quando estiver em modo isolado.
function getLocalPlayerSeat() {
  return window.CoupMaster3DOnline?.playerSeat || 1;
}

// Normaliza um assento para garantir que eventos remotos nao apontem fora da mesa.
function normalizePlayerId(playerId) {
  const id = Number(playerId);
  if (Number.isInteger(id) && id >= 1 && id <= PLAYER_COUNT) return id;
  return state.activePlayer;
}

// Troca apenas a visao local sem mudar o assento real do jogador.
function setObservedPlayerSeat(playerId, options = {}) {
  const seat = playerId || state.activePlayer;
  syncPlayerView(seat);

  if (options.instant) {
    snapCameraToPlayer(seat);
    return;
  }

  if (options.focus !== false) {
    focusTableCamera();
  }
}

// Publica uma acao discreta para outros clientes reproduzirem a animacao.
function publishTableAction(type, payload = {}) {
  if (!window.CoupMaster3DOnline?.publishTableAction) return null;

  const action = {
    id: createTableActionId(),
    type,
    payload,
    actorSeat: state.activePlayer,
    createdAt: Date.now()
  };
  app.appliedTableActions.add(action.id);
  window.CoupMaster3DOnline.publishTableAction(action);
  return action;
}

// Cria IDs locais estaveis o bastante para deduplicar eventos recebidos.
function createTableActionId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `action-${Date.now()}-${randomPart}`;
}

// Bloqueia publicacao de tableState ate uma animacao discreta terminar.
function runWithTableSyncSuppressed(durationMs, actionFn, onComplete = null) {
  app.tableSyncSuppressCount += 1;

  try {
    actionFn();
  } finally {
    window.setTimeout(() => {
      app.tableSyncSuppressCount = Math.max(0, app.tableSyncSuppressCount - 1);
      onComplete?.();
    }, durationMs);
  }
}

// Aplica uma acao de mesa recebida pela rede sem reemitir eco.
function applyTableAction(action) {
  if (!action?.id || app.appliedTableActions.has(action.id)) return;
  if (action.actorUid && action.actorUid === window.CoupMaster3DOnline?.user?.uid) return;

  app.appliedTableActions.add(action.id);
  const payload = action.payload || {};

  if (action.type === 'draw-card') {
    runWithTableSyncSuppressed(DRAW_ACTION_SYNC_DELAY_MS, () => {
      drawCardToPlayer(payload.playerId, payload.animateDraw !== false, {
        cardData: payload.card,
        publishAction: false
      });
    });
    return;
  }

  if (action.type === 'deal-initial-hands') {
    const deals = Array.isArray(payload.deals) ? payload.deals : [];
    runWithTableSyncSuppressed(getDealActionDuration(deals.length), () => {
      dealInitialHands({
        deals,
        publishAction: false
      });
    });
    return;
  }

  if (action.type === 'return-card-to-deck') {
    const card = app.cards.get(payload.cardId);
    if (!card || card.data.specialCard || card.data.location === 'deck') return;

    runWithTableSyncSuppressed(RETURN_ACTION_SYNC_DELAY_MS, () => {
      animateCardReturnToDeck(card);
    });
  }
}

// Define cartas que continuam publicas mesmo quando estao em um slot de jogador.
function isPublicSlotCard(data) {
  return data?.type === 'religiao';
}

// Identifica carta privada de outro slot que nao pode revelar textura nem durante flip.
function isPrivateSlotCardHidden(data) {
  return Boolean(data?.owner) && data.owner !== state.viewPlayer && !isPublicSlotCard(data);
}

// Define se a face da carta pode ser mostrada nesta tela.
function canRevealCardFace(data) {
  if (isPublicSlotCard(data)) return Boolean(data?.faceUp);
  if (!data?.owner) return Boolean(data?.faceUp);
  return data.owner === state.viewPlayer && Boolean(data.faceUp);
}

// Atualiza o material da carta quando ela vira, muda de dono ou troca a visao local.
function refreshCardMaterial(card) {
  const texturePaths = getCardTexturePaths(card.data);
  card.mesh.material = makeCardMaterials(
    texturePaths.front,
    canRevealCardFace(card.data),
    null,
    texturePaths.back,
    isPrivateSlotCardHidden(card.data)
  );
}

// Resolve clique inicial em deck, carta, pilha ou objeto.
function onPointerDown(event) {
  setPointer(event);

  const hits = getIntersections([app.deckMesh, ...getCardMeshes(), ...getObjectMeshes()]);
  const hit = hits[0];
  if (!hit) return;

  if (hit.object.userData.deck) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    app.controls.enabled = false;
    app.pendingDeckDrag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now()
    };
    return;
  }

  const hitCard = app.cards.get(hit.object.userData.cardId);
  if (hitCard) {
    const stack = getCardStack(hitCard);
    let card = stack ? getTopStackCard(hitCard) : hitCard;

    if (!isCardOverDeckGesture(card, event) && isCardDoubleClick(card, event)) {
      event.preventDefault();
      app.lastCardClick = null;
      tryReturnCardToDeck(card, true);
      return;
    }

    if (stack) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      app.controls.enabled = false;
      app.selectedCard = card;
      app.pendingStackDrag = {
        pointerId: event.pointerId,
        stackId: stack.id,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now()
      };
      return;
    }

    event.preventDefault();
    removeCardFromTableStack(card);
    beginDrag(event, card, 'card');
    app.selectedCard = card;
    app.dragOrigin = {
      owner: card.data.owner,
      location: card.data.location
    };
    return;
  }

  const object = app.objects.get(hit.object.userData.objectId);
  if (!object) return;

  event.preventDefault();
  beginDrag(event, object, 'object');
  app.selectedObject = object;
}

// Detecta duplo clique proprio para devolver cartas ao deck.
function isCardDoubleClick(card, event) {
  const now = performance.now();
  const previous = app.lastCardClick;
  app.lastCardClick = {
    cardId: card.id,
    time: now,
    x: event.clientX,
    y: event.clientY
  };

  if (!previous) return false;
  if (previous.cardId !== card.id) return false;
  if (now - previous.time > 340) return false;

  return Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 18;
}

// Atualiza tooltip e outline do objeto sob o mouse.
function updatePointerHover(event) {
  setPointer(event);
  const hit = getIntersections([app.deckMesh, ...getCardMeshes(), ...getObjectMeshes()])[0];
  if (!hit) {
    clearPointerHover();
    return;
  }

  const piece = getHoverPiece(hit.object);
  const label = getHoverLabel(piece);
  if (!piece || !label) {
    clearPointerHover();
    return;
  }

  if (app.hoveredPiece !== piece) {
    setHoverOutline(piece);
  }

  app.hoveredPiece = piece;
  selectHoveredPiece(piece);
  showHoverTooltip(label, event.clientX, event.clientY);
  updateInspectOverlay();
}

// Converte o mesh atingido pelo raycast no objeto logico correto.
function getHoverPiece(mesh) {
  if (mesh.userData.deck) return { mesh: app.deckMesh, kind: 'deck' };

  const card = app.cards.get(mesh.userData.cardId);
  if (card) return getTopStackCard(card);

  const object = app.objects.get(mesh.userData.objectId);
  return object || null;
}

// Define o texto acessivel exibido no tooltip de hover.
function getHoverLabel(piece) {
  if (!piece) return '';
  if (piece.kind === 'deck') return 'Baralho';
  if (piece.kind === 'gold-coin') return 'Moeda de ouro';
  if (piece.kind === 'silver-coin') return 'Moeda de prata';
  if (piece.kind === 'die') return 'Dado';
  if (piece.data) return getCardHoverLabel(piece);
  return '';
}

// Monta o texto de hover para carta solta ou pilha aberta.
function getCardHoverLabel(card) {
  if (card.data.specialCard) {
    const labels = SPECIAL_CARD_LABELS[card.data.type];
    return canRevealCardFace(card.data) ? labels?.front : labels?.back;
  }

  if (!canRevealCardFace(card.data)) return 'Carta fechada';

  const stack = getCardStack(card);
  if (!stack || stack.cards.length <= 1) {
    return CARD_LABELS[card.data.type] || card.data.type;
  }

  return getStackHoverLabel(stack);
}

// Resume uma pilha aberta por quantidade de personagens.
function getStackHoverLabel(stack) {
  const counts = new Map();
  stack.cards.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;
    const label = CARD_LABELS[card.data.type] || card.data.type;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, count]) => `${label} ${count}`)
    .join('\n');
}

// Cria a malha de outline branca ao redor do objeto em hover.
function setHoverOutline(piece) {
  clearHoverOutline();
  if (piece.kind === 'deck' && state.deck.length <= 0) return;

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(piece.mesh.geometry, 18),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    })
  );
  outline.renderOrder = 20;
  app.scene.add(outline);
  app.hoverOutline = outline;
  syncHoverOutline();
}

// Mantem a outline alinhada com o objeto em movimento.
function syncHoverOutline() {
  if (!app.hoverOutline || !app.hoveredPiece) return;
  app.hoverOutline.position.copy(app.hoveredPiece.mesh.position);
  app.hoverOutline.quaternion.copy(app.hoveredPiece.mesh.quaternion);
  app.hoverOutline.scale.copy(app.hoveredPiece.mesh.scale).multiplyScalar(1.018);
}

// Remove estado visual de hover e tooltip.
function clearPointerHover() {
  app.hoveredPiece = null;
  clearHoverOutline();
  clearInspectClone();
  hideHoverTooltip();
}

// Seleciona automaticamente o objeto sob o mouse para atalhos de teclado.
function selectHoveredPiece(piece) {
  if (piece?.data) {
    app.selectedCard = piece;
    app.selectedObject = null;
    return;
  }

  if (piece?.kind && piece.kind !== 'deck') {
    app.selectedObject = piece;
    app.selectedCard = null;
  }
}

// Descarta a geometria e material da outline atual.
function clearHoverOutline() {
  if (!app.hoverOutline) return;
  app.scene.remove(app.hoverOutline);
  app.hoverOutline.geometry.dispose();
  app.hoverOutline.material.dispose();
  app.hoverOutline = null;
}

// Mostra o tooltip perto do cursor.
function showHoverTooltip(label, x, y) {
  hoverTooltipEl.textContent = label;
  hoverTooltipEl.style.display = 'block';
  hoverTooltipEl.style.left = `${x}px`;
  hoverTooltipEl.style.top = `${y}px`;
}

// Oculta o tooltip de hover.
function hideHoverTooltip() {
  hoverTooltipEl.style.display = 'none';
}

// Atualiza a visualizacao ampliada quando Alt esta pressionado.
function updateInspectOverlay() {
  if (!app.inspectAltDown || app.dragged || !app.hoveredPiece) {
    clearInspectClone();
    return;
  }

  showInspectOverlay(app.hoveredPiece);
}

// Exibe uma copia ampliada do objeto sob hover, sem interferir na fisica.
function showInspectOverlay(piece) {
  const key = getInspectPieceKey(piece);
  if (!piece?.mesh || !key || app.inspectedPieceKey === key) return;

  clearInspectClone();
  app.inspectedPiece = piece;
  app.inspectedPieceKey = key;

  const clone = piece.mesh.clone(true);
  normalizeInspectCloneOrientation(clone, piece);
  clone.position.set(0, 0, 0);
  clone.updateMatrixWorld(true);
  app.inspectGroup.add(clone);
  app.inspectClone = clone;

  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  clone.position.sub(center);

  const fitSize = Math.max(size.x, size.z, size.y * 0.8, 0.1);
  const scale = THREE.MathUtils.clamp(1.55 / fitSize, 1.1, 5.8);
  app.inspectGroup.scale.setScalar(scale);
  app.inspectGroup.position.set(0, 0, 0);
  app.inspectGroup.visible = true;
  hideHoverTooltip();
}

// Ajusta a copia inspecionada para leitura, ignorando a orientacao da mesa.
function normalizeInspectCloneOrientation(clone, piece) {
  clone.quaternion.identity();
  clone.rotation.set(0, 0, 0);

  if (piece.kind === 'deck' || piece.data?.id) {
    clone.rotation.y = Math.PI;
  }

  if (piece.kind === 'gold-coin' || piece.kind === 'silver-coin') {
    clone.rotation.y = Math.PI / 2;
  }

  if (piece.kind === 'die') {
    clone.rotation.set(-0.42, 0.56, 0.18);
  }

  clone.updateMatrixWorld(true);
}

// Gera uma chave estavel para nao recriar o clone a cada frame.
function getInspectPieceKey(piece) {
  if (piece.kind === 'deck') return 'deck';
  if (piece.data?.id) return `card:${piece.data.id}`;
  if (piece.id) return `object:${piece.id}`;
  return piece.mesh?.uuid || null;
}

// Oculta a visualizacao ampliada do Alt.
function hideInspectOverlay({ resetAlt = true } = {}) {
  if (resetAlt) app.inspectAltDown = false;
  clearInspectClone();
}

// Remove o clone usado pela visualizacao ampliada sem descartar materiais compartilhados.
function clearInspectClone() {
  if (app.inspectClone) {
    app.inspectGroup?.remove(app.inspectClone);
  }
  app.inspectClone = null;
  app.inspectedPiece = null;
  app.inspectedPieceKey = null;
  if (app.inspectGroup) app.inspectGroup.visible = false;
}

// Prepara uma peca para arrasto cinematico sem empurrar outros objetos.
function beginDrag(event, piece, mode) {
  event.preventDefault();
  hideInspectOverlay();
  clearPointerHover();
  canvas.setPointerCapture(event.pointerId);
  app.controls.enabled = false;
  app.dragged = piece;
  app.dragMode = mode;
  app.dragQuat = piece.mesh.quaternion.clone();
  app.dragStart = { x: event.clientX, y: event.clientY };
  app.hasDragged = false;

  setPieceSensor(piece, true);
  piece.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  piece.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  piece.body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  if (rayToPlane(event, app.dragPoint)) {
    const pos = piece.mesh.position;
    app.dragOffset.copy(pos).sub(app.dragPoint);
    app.dragOffset.y = 0.5;
  } else {
    app.dragOffset.set(0, 0.5, 0);
  }
}

// Atualiza gestos pendentes, arrastos e hover durante movimento do mouse.
function onPointerMove(event) {
  if (app.pendingDeckDrag && !app.dragged) {
    const dx = event.clientX - app.pendingDeckDrag.x;
    const dy = event.clientY - app.pendingDeckDrag.y;
    if (Math.hypot(dx, dy) <= 6) return;
    if (performance.now() - app.pendingDeckDrag.startedAt >= DECK_DRAG_HOLD_MS) {
      startDeckDrag(event);
    } else {
      startDeckCardDrag(event);
    }
  }

  if (app.pendingStackDrag && !app.dragged) {
    const dx = event.clientX - app.pendingStackDrag.x;
    const dy = event.clientY - app.pendingStackDrag.y;
    if (Math.hypot(dx, dy) <= 6) return;
    if (performance.now() - app.pendingStackDrag.startedAt >= DECK_DRAG_HOLD_MS) {
      startTableStackDrag(event);
    } else {
      startTableStackTopCardDrag(event);
    }
  }

  if (!app.dragged) {
    updatePointerHover(event);
    return;
  }

  event.preventDefault();
  clearPointerHover();
  if (app.dragStart) {
    const dx = event.clientX - app.dragStart.x;
    const dy = event.clientY - app.dragStart.y;
    if (Math.hypot(dx, dy) > 6) app.hasDragged = true;
  }

  if (!rayToPlane(event, app.dragPoint)) return;

  const next = app.dragPoint.clone().add(app.dragOffset);
  const distance = Math.hypot(next.x, next.z);
  if (distance > PLAY_RADIUS) {
    next.multiplyScalar(PLAY_RADIUS / distance);
  }

  if (app.dragMode === 'deck') {
    app.deckMesh.position.x = next.x;
    app.deckMesh.position.z = next.z;
    syncDeckRim();
    updateDeckCollider();
    return;
  }

  if (app.dragMode === 'stack') {
    moveTableStack(app.dragged, next.x, next.z);
    return;
  }

  next.y = 0.42;

  const quat = app.dragMode === 'card'
    ? app.dragQuat
    : new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, app.dragged.mesh.rotation.y, 0.08));
  app.dragged.body.setNextKinematicTranslation(next);
  app.dragged.body.setNextKinematicRotation(quat);
  updateHoveredDrop(event);
}

// Finaliza clique, arrasto de objeto, deck, pilha ou carta.
function onPointerUp(event) {
  if (app.pendingDeckDrag && !app.dragged) {
    canvas.releasePointerCapture?.(event.pointerId);
    app.controls.enabled = true;
    app.pendingDeckDrag = null;
    drawCardToPlayer(state.activePlayer);
    return;
  }

  if (app.pendingStackDrag && !app.dragged) {
    canvas.releasePointerCapture?.(event.pointerId);
    app.controls.enabled = true;
    app.pendingStackDrag = null;
    return;
  }

  if (!app.dragged) return;

  const piece = app.dragged;
  const mode = app.dragMode;
  const wasDragged = app.hasDragged;
  app.dragged = null;
  app.dragMode = null;
  app.dragQuat = null;
  app.dragStart = null;
  app.hasDragged = false;
  app.controls.enabled = true;

  canvas.releasePointerCapture?.(event.pointerId);
  clearDropHover();

  if (mode === 'object') {
    finishObjectDrag(piece, wasDragged);
    return;
  }

  if (mode === 'deck') {
    finishDeckDrag();
    return;
  }

  if (mode === 'stack') {
    finishTableStackDrag(piece, event);
    return;
  }

  const card = piece;
  if (!wasDragged) {
    restoreDraggedCard(card);
    app.dragOrigin = null;
    return;
  }

  if (isPointerOverDeck(event)) {
    if (!card.data.faceUp) {
      returnCardToDeck(card);
    } else {
      restoreDraggedCard(card);
    }
    app.dragOrigin = null;
    return;
  }

  const drop = findDropZoneAtPointer(event);
  if (drop?.userData.playerId) {
    moveCardToPlayer(card, drop.userData.playerId);
    app.dragOrigin = null;
    return;
  }

  moveCardToTable(card);
  app.dragOrigin = null;
}

// Retira uma carta do deck para arrastar rapidamente.
function startDeckCardDrag(event) {
  const data = state.deck.pop();
  if (!data) {
    app.pendingDeckDrag = null;
    app.controls.enabled = true;
    return;
  }

  data.owner = null;
  data.location = 'deck';
  data.faceUp = false;

  const card = createCardObject(data);
  updateHud();
  const deckTopY = app.deckMesh.position.y + getDeckHeight() / 2 + CARD_D;
  placeCard(card, new THREE.Vector3(app.deckMesh.position.x, deckTopY, app.deckMesh.position.z), app.deckMesh.rotation.y, false);

  beginDrag(event, card, 'card');
  app.selectedCard = card;
  app.hasDragged = true;
  app.dragOrigin = {
    owner: null,
    location: 'deck'
  };
  app.pendingDeckDrag = null;
}

// Inicia o arrasto do deck inteiro apos segurar o clique.
function startDeckDrag(event) {
  app.pendingDeckDrag = null;
  event.preventDefault();
  app.controls.enabled = false;
  app.dragged = app.deckMesh;
  app.dragMode = 'deck';
  app.dragStart = { x: event.clientX, y: event.clientY };
  app.hasDragged = true;

  if (rayToPlane(event, app.dragPoint)) {
    app.dragOffset.copy(app.deckMesh.position).sub(app.dragPoint);
    app.dragOffset.y = 0;
  } else {
    app.dragOffset.set(0, 0, 0);
  }
  app.dragOffset.y = 0;
}

// Finaliza o arrasto do deck e atualiza seu collider.
function finishDeckDrag() {
  app.dragOrigin = null;
  syncDeckRim();
  updateDeckCollider();
  scheduleTableSync();
}

// Retira a carta do topo de uma pilha para arrastar.
function startTableStackTopCardDrag(event) {
  const stack = getPendingTableStack();
  if (!stack) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  const card = app.cards.get(stack.cards[stack.cards.length - 1]);
  if (!card) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  removeCardFromTableStack(card);
  beginDrag(event, card, 'card');
  app.selectedCard = card;
  app.hasDragged = true;
  app.dragOrigin = {
    owner: null,
    location: 'table'
  };
  app.pendingStackDrag = null;
}

// Inicia o arrasto de uma pilha inteira de cartas.
function startTableStackDrag(event) {
  const stack = getPendingTableStack();
  if (!stack) {
    app.pendingStackDrag = null;
    app.controls.enabled = true;
    return;
  }

  app.pendingStackDrag = null;
  event.preventDefault();
  app.controls.enabled = false;
  app.dragged = stack;
  app.dragMode = 'stack';
  app.dragStart = { x: event.clientX, y: event.clientY };
  app.dragOrigin = {
    location: 'stack',
    position: stack.position.clone()
  };
  app.hasDragged = true;

  stack.cards.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;
    card.target = null;
    card.flip = null;
    setPieceSensor(card, true);
    card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });

  if (rayToPlane(event, app.dragPoint)) {
    app.dragOffset.copy(stack.position).sub(app.dragPoint);
    app.dragOffset.y = 0;
  } else {
    app.dragOffset.set(0, 0, 0);
  }
}

// Finaliza o arrasto de pilha, juntando pilhas fechadas ao deck ou pilhas compativeis.
function finishTableStackDrag(stack, event) {
  const origin = app.dragOrigin;
  app.dragOrigin = null;

  if (isStackOverDeck(stack, event)) {
    if (!stack.faceUp) {
      returnTableStackToDeck(stack);
      return;
    }

    if (origin?.position) {
      moveTableStack(stack, origin.position.x, origin.position.z);
    }
  }

  const targetStack = findCompatibleTableStackForStack(stack);
  if (targetStack) {
    mergeTableStacks(stack, targetStack);
    return;
  }

  stack.cards.forEach((id) => setPieceSensor(app.cards.get(id), false));
  layoutTableStack(stack, false);
  scheduleTableSync();
}

// Busca a pilha associada ao gesto pendente atual.
function getPendingTableStack() {
  if (!app.pendingStackDrag) return null;
  return app.tableStacks.find(stack => stack.id === app.pendingStackDrag.stackId) || null;
}

// Liga ou desliga colisao fisica durante o arrasto de uma peca.
function setPieceSensor(piece, enabled) {
  piece?.collider?.setSensor?.(enabled);
}

// Devolve moeda ou dado ao modo fisico depois do arrasto.
function finishObjectDrag(object, wasDragged) {
  setPieceSensor(object, false);
  object.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  object.body.setTranslation(object.mesh.position, true);
  object.body.setRotation(object.mesh.quaternion, true);

  if (wasDragged) {
    object.body.setLinvel({ x: random(-0.2, 0.2), y: -0.2, z: random(-0.2, 0.2) }, true);
    object.body.setAngvel({ x: random(-0.3, 0.3), y: random(-0.45, 0.45), z: random(-0.3, 0.3) }, true);
  }
  scheduleTableSync();
}

// Fallback de duplo clique nativo para remover moedas ou devolver carta ao deck.
function onDoubleClick(event) {
  setPointer(event);
  if (isPointerOverDeck(event)) return;

  const objectHit = getIntersections(getObjectMeshes())[0];
  const object = objectHit ? app.objects.get(objectHit.object.userData.objectId) : null;
  if (isCoinObject(object)) {
    removeTableObject(object);
    return;
  }

  const hits = getIntersections(getCardMeshes());
  const hit = hits[0];
  if (!hit) return;

  const card = app.cards.get(hit.object.userData.cardId);
  if (card && !card.target) tryReturnCardToDeck(card, true);
}

// Identifica moedas que podem ser descartadas por duplo clique.
function isCoinObject(object) {
  return object?.kind === 'gold-coin' || object?.kind === 'silver-coin';
}

// Evita que cliques no deck atinjam cartas recém-compradas ainda em trânsito.
function isCardOverDeckGesture(card, event) {
  return Boolean(card?.target) && isPointerOverDeck(event);
}

// Devolve carta ao deck respeitando cooldown contra cliques duplicados.
function tryReturnCardToDeck(card, animated = false, options = {}) {
  if (!card || card.data.location === 'deck') return false;
  if (card.data.specialCard) return false;

  const now = performance.now();
  if (now - app.lastCardReturnAt < CARD_RETURN_COOLDOWN_MS) return false;

  app.lastCardReturnAt = now;
  const action = animated && options.publishAction !== false
    ? publishTableAction('return-card-to-deck', {
      cardId: card.id,
      card: cloneCardData(card.data)
    })
    : null;
  const runReturn = () => {
    if (animated) {
      animateCardReturnToDeck(card);
    } else {
      returnCardToDeck(card);
    }
  };

  if (action) {
    runWithTableSyncSuppressed(RETURN_ACTION_SYNC_DELAY_MS, runReturn, scheduleTableSync);
    return true;
  }

  runReturn();
  return true;
}

// Centraliza camera, remove objetos ou vira carta via teclado.
function onKeyDown(event) {
  if (event.key === 'Alt') {
    if (!isAnyModalOpen()) {
      event.preventDefault();
      app.inspectAltDown = true;
      updateInspectOverlay();
    }
    return;
  }

  if (isAnyModalOpen()) {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(closeModal);
    }
    return;
  }

  if (event.key.toLowerCase() === 'c') {
    event.preventDefault();
    openChatModal();
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    focusTableCamera();
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!deleteSelectedPiece()) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === 'r') {
    if (!shuffleHoveredCards()) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === 'q' || event.key.toLowerCase() === 'e') {
    const direction = event.key.toLowerCase() === 'q' ? 1 : -1;
    if (!rotateSelectedPiece(direction)) return;
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() !== 'f') return;
  if (!flipSelectedCards()) return;
  event.preventDefault();
}

// Encerra atalhos temporarios acionados enquanto a tecla estava pressionada.
function onKeyUp(event) {
  if (event.key !== 'Alt') return;
  event.preventDefault();
  hideInspectOverlay();
}

// Remove o objeto ou carta especial selecionada, como o atalho Delete/Backspace.
function deleteSelectedPiece() {
  if (app.selectedCard?.data.specialCard) {
    removeSpecialCard(app.selectedCard);
    return true;
  }

  if (!app.selectedObject) return false;
  removeTableObject(app.selectedObject);
  return true;
}

// Vira a carta ou pilha selecionada, como o atalho F.
function flipSelectedCards() {
  if (!app.selectedCard) return false;
  if (app.selectedCard.data.location === 'deck') return false;

  const stack = getCardStack(app.selectedCard);
  if (stack && stack.cards.length > 1) {
    flipTableStack(stack);
  } else {
    flipCard(app.selectedCard);
  }
  return true;
}

// Inicia animacao de foco da camera para o jogador ativo.
function focusTableCamera() {
  app.cameraFocus = {
    progress: 0,
    startPosition: app.camera.position.clone(),
    startTarget: app.controls.target.clone(),
    endPosition: getPlayerCameraPosition(state.viewPlayer),
    endTarget: DEFAULT_CAMERA_TARGET.clone()
  };
}

// Coloca a camera diretamente na vista padrao de um assento.
function snapCameraToPlayer(playerId) {
  app.cameraFocus = null;
  app.camera.position.copy(getPlayerCameraPosition(playerId));
  app.controls.target.copy(DEFAULT_CAMERA_TARGET);
  app.controls.update();
}

// Calcula a posicao padrao da camera para um jogador.
function getPlayerCameraPosition(playerId) {
  const angle = getPlayerAngle(playerId);
  return DEFAULT_CAMERA_TARGET.clone().add(new THREE.Vector3(
    Math.cos(angle) * DEFAULT_CAMERA_DISTANCE,
    DEFAULT_CAMERA_HEIGHT,
    Math.sin(angle) * DEFAULT_CAMERA_DISTANCE
  ));
}

// Gira o objeto sob o mouse ou selecionado com os atalhos Q/E.
function rotateSelectedPiece(direction) {
  const piece = app.hoveredPiece || app.selectedCard || app.selectedObject;
  if (!piece) return false;
  const delta = direction * OBJECT_ROTATION_STEP;

  if (piece.kind === 'deck') {
    rotateDeck(delta);
    return true;
  }

  if (piece.data) {
    rotateCardPiece(piece, delta);
    return true;
  }

  if (piece.body && piece.mesh) {
    rotatePhysicsObject(piece, delta);
    scheduleTableSync();
    return true;
  }

  return false;
}

// Rotaciona o deck e mantém aro/collider sincronizados.
function rotateDeck(delta) {
  if (!app.deckMesh) return;
  app.deckMesh.rotation.y += delta;
  syncDeckRim();
  updateDeckCollider();
  scheduleTableSync();
}

// Rotaciona uma carta individual ou a pilha inteira a que ela pertence.
function rotateCardPiece(card, delta) {
  if (card.target || card.flip || card.data.location === 'deck') return;

  const stack = getCardStack(card);
  if (stack && stack.cards.length > 1) {
    stack.rotationY += delta;
    layoutTableStack(stack, false);
    scheduleTableSync();
    return;
  }

  rotatePhysicsObject(card, delta);
  scheduleTableSync();
}

// Aplica uma rotação horizontal mantendo posição e física estáveis.
function rotatePhysicsObject(piece, delta) {
  const yaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, delta, 0));
  const quat = yaw.multiply(piece.mesh.quaternion.clone());
  piece.mesh.quaternion.copy(quat);
  piece.body.setRotation(quat, true);
  piece.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// Anima a carta virando horizontalmente e troca a face no meio.
function flipCard(card) {
  if (card.flip) return;
  removeCardFromTableStack(card);
  startCardFlip(card, !card.data.faceUp, !card.data.owner && card.data.location === 'table');
}

// Vira todas as cartas de uma pilha como uma unica orientacao de grupo.
function flipTableStack(stack) {
  if (!stack || stack.cards.length <= 1) return;
  const cards = stack.cards.map(id => app.cards.get(id)).filter(Boolean);
  if (cards.some(card => card.flip)) return;

  const nextFaceUp = !stack.faceUp;
  stack.faceUp = nextFaceUp;
  cards.forEach((card) => {
    startCardFlip(card, nextFaceUp, false);
  });
}

// Inicia a animacao de flip de uma carta sem decidir sua origem.
function startCardFlip(card, nextFaceUp, restoreDynamic) {
  const startPosition = card.mesh.position.clone();
  const startQuat = card.mesh.quaternion.clone();
  const liftPosition = startPosition.clone();
  liftPosition.y += 0.24;
  const liftQuat = startQuat.clone().multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.92)
  );

  card.target = null;
  card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  card.flip = {
    progress: 0,
    startPosition,
    liftPosition,
    startQuat,
    liftQuat,
    nextFaceUp,
    swapped: false,
    restoreDynamic
  };
}

// Cancela arrasto e devolve a carta ao local de origem.
function restoreDraggedCard(card) {
  setPieceSensor(card, false);
  const origin = app.dragOrigin;
  if (!origin) {
    moveCardToTable(card);
    return;
  }

  if (origin.owner) {
    layoutPlayerHand(origin.owner, 0.12);
    return;
  }

  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setLinvel({ x: 0, y: -0.15, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// Move uma carta para a mao de um jogador.
function moveCardToPlayer(card, playerId) {
  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = playerId;
  card.data.location = `player-${playerId}`;
  if (!isPublicSlotCard(card.data)) {
    card.data.faceUp = true;
  }
  state.players[playerId - 1].cards.push(card.data);
  refreshCardMaterial(card);

  if (oldOwner && oldOwner !== playerId) layoutPlayerHand(oldOwner, 0.12);
  layoutPlayerHand(playerId, 0.22);
  updateHud();
}

// Solta a carta na mesa ou agrupa em pilha compativel.
function moveCardToTable(card) {
  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'table';
  state.tableCards.push(card.data);
  refreshCardMaterial(card);

  const pos = card.mesh.position.clone();
  const stack = findCompatibleTableStack(card, pos);
  if (stack) {
    addCardToTableStack(card, stack);
    if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
    updateHud();
    return;
  }

  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setTranslation({ x: pos.x, y: 0.28, z: pos.z }, true);
  card.body.setRotation(card.mesh.quaternion, true);
  card.body.setLinvel({ x: random(-0.25, 0.25), y: -0.4, z: random(-0.25, 0.25) }, true);
  card.body.setAngvel({ x: random(-0.2, 0.2), y: random(-0.55, 0.55), z: random(-0.2, 0.2) }, true);
  card.target = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
  updateHud();
}

// Remove a carta da cena e devolve seus dados ao deck.
function returnCardToDeck(card) {
  clearPointerHover();
  setPieceSensor(card, false);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'deck';
  card.data.faceUp = false;
  state.deck.push(card.data);

  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
  autoShuffleDeckAfterReturn();
  updateHud();
}

// Anima uma carta voltando ao deck antes de inseri-la no baralho.
function animateCardReturnToDeck(card) {
  if (!app.deckMesh) {
    returnCardToDeck(card);
    return;
  }

  clearPointerHover();
  setPieceSensor(card, true);
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'returning-deck';
  card.data.faceUp = false;
  refreshCardMaterial(card);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);

  const target = getDeckReturnPosition();
  playVfx('card-whoosh');
  tossTo(card, target, app.deckMesh.rotation.y, 0.42, () => {
    finalizeAnimatedCardReturn(card);
  });
  updateHud();
}

// Conclui a devolução animada, removendo a carta visual e atualizando o deck.
function finalizeAnimatedCardReturn(card) {
  if (!app.cards.has(card.id)) return;

  setPieceSensor(card, false);
  card.data.owner = null;
  card.data.location = 'deck';
  card.data.faceUp = false;
  state.deck.push(card.data);

  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  autoShuffleDeckAfterReturn();
  updateHud();
}

// Devolve uma pilha fechada inteira ao deck sem revelar suas cartas.
function returnTableStackToDeck(stack) {
  clearPointerHover();
  const timer = app.stackShuffleTimers.get(stack.id);
  if (timer) {
    window.clearTimeout(timer);
    app.stackShuffleTimers.delete(stack.id);
  }

  const ids = stack.cards.slice();
  ids.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;

    setPieceSensor(card, false);
    card.target = null;
    card.flip = null;
    card.data.stackId = null;
    card.data.owner = null;
    card.data.location = 'deck';
    card.data.faceUp = false;
    state.deck.push(card.data);

    app.scene.remove(card.mesh);
    app.world.removeRigidBody(card.body);
    app.cards.delete(card.id);
  });

  state.tableCards = state.tableCards.filter(data => !ids.includes(data.id));
  app.tableStacks = app.tableStacks.filter(item => item.id !== stack.id);
  if (app.selectedCard && ids.includes(app.selectedCard.id)) app.selectedCard = null;
  autoShuffleDeckAfterReturn();
  updateHud();
}

// Embaralha automaticamente sempre que cartas fechadas voltam para o deck.
function autoShuffleDeckAfterReturn() {
  if (state.deck.length === 0) return;
  if (state.deck.length > 1) shuffleDeck();
}

// Remove a carta de maos, mesa e pilhas antes de mover.
function removeCardFromCollections(card) {
  removeCardFromTableStack(card);
  state.tableCards = state.tableCards.filter(data => data.id !== card.id);
  state.players.forEach((player) => {
    player.cards = player.cards.filter(data => data.id !== card.id);
  });
}

// Retorna a pilha a que uma carta pertence, se houver.
function getCardStack(card) {
  if (!card?.data.stackId) return null;
  return app.tableStacks.find(stack => stack.id === card.data.stackId) || null;
}

// Procura uma pilha de mesa com mesmo lado visivel e proximidade.
function findCompatibleTableStack(card, position) {
  if (card.data.specialCard) return null;

  const existingStack = app.tableStacks.find((stack) => {
    if (stack.faceUp !== card.data.faceUp) return false;
    return Math.hypot(stack.position.x - position.x, stack.position.z - position.z) < TABLE_STACK_RADIUS;
  });
  if (existingStack) return existingStack;

  const targetData = state.tableCards.find((data) => {
    if (data.id === card.id || data.stackId || data.faceUp !== card.data.faceUp) return false;
    if (data.specialCard) return false;

    const target = app.cards.get(data.id);
    if (!target) return false;
    return Math.hypot(target.mesh.position.x - position.x, target.mesh.position.z - position.z) < TABLE_STACK_RADIUS;
  });

  if (!targetData) return null;
  return createTableStack(app.cards.get(targetData.id));
}

// Cria uma nova pilha de mesa a partir de uma carta base.
function createTableStack(baseCard) {
  const stack = {
    id: `stack-${app.stackId++}`,
    faceUp: baseCard.data.faceUp,
    cards: [baseCard.id],
    position: baseCard.mesh.position.clone(),
    rotationY: baseCard.mesh.rotation.y
  };

  baseCard.data.stackId = stack.id;
  app.tableStacks.push(stack);
  layoutTableStack(stack);
  return stack;
}

// Adiciona carta a uma pilha e realinha o conjunto.
function addCardToTableStack(card, stack) {
  setPieceSensor(card, false);
  removeCardFromTableStack(card);
  card.data.stackId = stack.id;
  card.data.owner = null;
  card.data.location = 'table';
  card.data.faceUp = stack.faceUp;
  refreshCardMaterial(card);
  if (!state.tableCards.some(data => data.id === card.id)) {
    state.tableCards.push(card.data);
  }

  if (!stack.cards.includes(card.id)) {
    stack.cards.push(card.id);
  }

  layoutTableStack(stack);
}

// Procura outra pilha com mesma orientacao para receber a pilha arrastada.
function findCompatibleTableStackForStack(sourceStack) {
  if (!sourceStack) return null;

  return app.tableStacks.find((stack) => {
    if (stack.id === sourceStack.id) return false;
    if (stack.faceUp !== sourceStack.faceUp) return false;
    return Math.hypot(
      stack.position.x - sourceStack.position.x,
      stack.position.z - sourceStack.position.z
    ) < TABLE_STACK_MERGE_RADIUS;
  }) || null;
}

// Une duas pilhas de cartas mantendo a pilha solta no topo da pilha alvo.
function mergeTableStacks(sourceStack, targetStack) {
  const sourceTimer = app.stackShuffleTimers.get(sourceStack.id);
  if (sourceTimer) {
    window.clearTimeout(sourceTimer);
    app.stackShuffleTimers.delete(sourceStack.id);
  }

  sourceStack.cards.forEach((id) => {
    const card = app.cards.get(id);
    if (!card) return;

    setPieceSensor(card, false);
    card.target = null;
    card.flip = null;
    card.data.stackId = targetStack.id;
    card.data.owner = null;
    card.data.location = 'table';
    card.data.faceUp = targetStack.faceUp;
    refreshCardMaterial(card);

    if (!targetStack.cards.includes(id)) {
      targetStack.cards.push(id);
    }
  });

  app.tableStacks = app.tableStacks.filter(stack => stack.id !== sourceStack.id);
  layoutTableStack(targetStack, true);
  updateHud();
}

// Embaralha a ordem de uma pilha de mesa com uma pequena animacao visual.
function shuffleTableStack(stack) {
  if (!stack || stack.cards.length <= 1) return;

  const existingTimer = app.stackShuffleTimers.get(stack.id);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    app.stackShuffleTimers.delete(stack.id);
  }

  const currentOrder = stack.cards.slice();
  const nextOrder = shuffle(currentOrder.slice());
  if (nextOrder.every((id, index) => id === currentOrder[index])) {
    nextOrder.push(nextOrder.shift());
  }

  currentOrder.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    const angle = (index / currentOrder.length) * Math.PI * 2 + random(-0.25, 0.25);
    const radius = random(0.05, 0.16);
    const position = new THREE.Vector3(
      stack.position.x + Math.cos(angle) * radius,
      CARD_REST_Y + index * (CARD_D + TABLE_STACK_GAP) + 0.03,
      stack.position.z + Math.sin(angle) * radius
    );

    tossTo(card, position, stack.rotationY + random(-0.35, 0.35), 0.1);
  });

  const timer = window.setTimeout(() => {
    stack.cards = nextOrder;
    layoutTableStack(stack, true);
    app.stackShuffleTimers.delete(stack.id);
    updateHud();
  }, 190);

  app.stackShuffleTimers.set(stack.id, timer);
}

// Remove carta de uma pilha e desfaz pilhas com uma carta so.
function removeCardFromTableStack(card) {
  setPieceSensor(card, false);
  const stackId = card.data.stackId;
  if (!stackId) return;

  const stack = app.tableStacks.find(item => item.id === stackId);
  card.data.stackId = null;
  if (!stack) return;

  stack.cards = stack.cards.filter(id => id !== card.id);
  if (stack.cards.length <= 1) {
    const timer = app.stackShuffleTimers.get(stack.id);
    if (timer) {
      window.clearTimeout(timer);
      app.stackShuffleTimers.delete(stack.id);
    }

    const remaining = app.cards.get(stack.cards[0]);
    if (remaining) {
      remaining.data.stackId = null;
      remaining.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      remaining.body.setLinvel({ x: 0, y: -0.04, z: 0 }, true);
      remaining.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    app.tableStacks = app.tableStacks.filter(item => item.id !== stack.id);
    return;
  }

  layoutTableStack(stack);
}

// Reposiciona as cartas de uma pilha em camadas.
function layoutTableStack(stack, animateLayout = true) {
  stack.cards = stack.cards.filter(id => app.cards.has(id));
  stack.cards.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    const position = new THREE.Vector3(
      stack.position.x,
      CARD_REST_Y + index * (CARD_D + TABLE_STACK_GAP),
      stack.position.z
    );
    if (animateLayout) {
      tossTo(card, position, stack.rotationY, 0.06);
    } else {
      placeCard(card, position, stack.rotationY, false);
    }
  });
}

// Move todas as cartas de uma pilha durante o arrasto.
function moveTableStack(stack, x, z) {
  stack.position.x = x;
  stack.position.z = z;
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, stack.rotationY, 0));

  stack.cards.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    card.body.setNextKinematicTranslation({
      x,
      y: CARD_REST_Y + index * (CARD_D + TABLE_STACK_GAP),
      z
    });
    card.body.setNextKinematicRotation(quat);
  });
}

// Resolve qual carta esta no topo de uma pilha.
function getTopStackCard(card) {
  const stackId = card.data.stackId;
  if (!stackId) return card;

  const stack = app.tableStacks.find(item => item.id === stackId);
  if (!stack || stack.cards.length === 0) return card;

  return app.cards.get(stack.cards[stack.cards.length - 1]) || card;
}

// Rola todos os dados existentes ou cria um dado se nao houver nenhum.
function rollDice() {
  const dice = [...app.objects.values()].filter(object => object.kind === 'die');
  if (dice.length === 0) {
    spawnDie();
    return;
  }

  dice.forEach((die, index) => rollSingleDie(die, index * 0.12));
}

// Aplica impulso e rotacao aleatoria a um dado.
function rollSingleDie(die, delay = 0) {
  window.setTimeout(() => {
    const angle = random(0, Math.PI * 2);
    const radius = random(0.35, 0.9);
    const position = {
      x: Math.cos(angle) * radius,
      y: 1.15 + random(0, 0.4),
      z: Math.sin(angle) * radius
    };

    die.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    die.body.setTranslation(position, true);
    die.body.setRotation(rapierQuatFromEuler(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)), true);
    die.body.setLinvel({ x: random(-1.2, 1.2), y: random(1.0, 1.8), z: random(-1.2, 1.2) }, true);
    die.body.setAngvel({ x: random(-10, 10), y: random(-10, 10), z: random(-10, 10) }, true);
  }, delay * 1000);
}

// Remove moedas e dados da mesa.
function clearTableObjects(update = true) {
  clearPointerHover();
  app.objects.forEach((object) => {
    app.scene.remove(object.mesh);
    app.world.removeRigidBody(object.body);
  });
  app.objects.clear();
  app.selectedObject = null;
  if (update) updateHud();
}

// Remove um objeto solto especifico da mesa.
function removeTableObject(object) {
  clearPointerHover();
  app.scene.remove(object.mesh);
  app.world.removeRigidBody(object.body);
  app.objects.delete(object.id);
  if (app.selectedObject?.id === object.id) app.selectedObject = null;
  updateHud();
}

// Remove cartas auxiliares da mesa, como Asilo e Religião.
function removeSpecialCard(card) {
  if (!card?.data.specialCard) return;

  clearPointerHover();
  removeCardFromCollections(card);
  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
  if (app.selectedCard?.id === card.id) app.selectedCard = null;
  updateHud();
}

// Anima uma carta em arco ate uma posicao alvo.
function tossTo(card, target, rotationY, lift = 0.25, onComplete = null) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  const start = card.mesh.position.clone();
  const high = start.clone().lerp(target, 0.45);
  high.y += lift;

  card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  card.target = { start, high, end: target.clone(), progress: 0, onComplete };
  card.targetQuat = quat;
}

// Posiciona uma carta imediatamente no mundo fisico e visual.
function placeCard(card, position, rotationY, dynamic = true) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  card.mesh.position.copy(position);
  card.mesh.quaternion.copy(quat);
  card.body.setTranslation(position, true);
  card.body.setRotation(quat, true);
  card.body.setBodyType(dynamic ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
}

// Organiza e anima as cartas da mao de um jogador.
function layoutPlayerHand(playerId, lift = 0.16) {
  const player = state.players[playerId - 1];
  if (!player) return;

  player.cards.forEach((data, index) => {
    const card = app.cards.get(data.id);
    if (!card) return;

    const target = getHandCardPosition(playerId, index, player.cards.length);
    const rotationY = getHandRotation(playerId, index, player.cards.length);
    if (lift <= 0) {
      placeCard(card, target, rotationY, false);
      return;
    }

    tossTo(card, target, rotationY, lift);
  });
}

// Calcula a posicao de uma carta dentro da mao.
function getHandCardPosition(playerId, cardIndex, handCount = null) {
  const seat = getPlayerSeatPosition(playerId);
  const player = state.players[playerId - 1];
  const count = Math.max(handCount ?? player.cards.length, 1);
  const angle = getPlayerAngle(playerId);
  const rotation = getHandRotation(playerId);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0));
  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
  const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const centerIndex = (count - 1) / 2;
  const offset = cardIndex - centerIndex;
  const base = new THREE.Vector3(seat.x, CARD_REST_Y, seat.z);

  base.add(localX.multiplyScalar(offset * HAND_LADDER_SPACING));
  base.add(localZ.multiplyScalar(offset * HAND_LADDER_DEPTH));
  base.add(radial.multiplyScalar(0.1));
  base.y += cardIndex * HAND_LADDER_LIFT;

  return base;
}

// Calcula a rotacao de uma carta na mao do jogador.
function getHandRotation(playerId, cardIndex = null, handCount = null) {
  const baseRotation = -getPlayerAngle(playerId) - Math.PI / 2;
  if (cardIndex === null || handCount === null || handCount <= 1) return baseRotation;

  const centerIndex = (handCount - 1) / 2;
  return baseRotation + (cardIndex - centerIndex) * HAND_LADDER_ROTATION;
}

// Retorna a posicao do assento de um jogador na mesa.
function getPlayerSeatPosition(playerId) {
  const angle = getPlayerAngle(playerId);
  return {
    x: Math.cos(angle) * HAND_RADIUS,
    z: Math.sin(angle) * HAND_RADIUS
  };
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

// Calcula o angulo radial de um jogador no octogono.
function getPlayerAngle(playerId) {
  return -Math.PI / 2 + ((playerId - 1) / PLAYER_COUNT) * Math.PI * 2;
}

// Atualiza destaque visual de zona de drop sob o cursor.
function updateHoveredDrop(event) {
  const drop = findDropZoneAtPointer(event);
  if (drop === app.hoveredDrop) return;

  clearDropHover();
  app.hoveredDrop = drop;
  if (app.hoveredDrop) {
    app.hoveredDrop.material.opacity = Math.min(0.38, app.hoveredDrop.material.opacity + 0.16);
  }
}

// Remove destaque visual da zona de drop atual.
function clearDropHover() {
  if (!app.hoveredDrop) return;
  app.hoveredDrop.material.opacity = app.hoveredDrop.userData.playerId === state.viewPlayer
    ? 0.24
    : app.hoveredDrop.userData.baseOpacity;
  app.hoveredDrop = null;
}

// Encontra a zona de jogador sob o ponteiro.
function findDropZoneAtPointer(event) {
  setPointer(event);
  const hits = getIntersections(app.dropZones.filter(zone => zone.name !== 'table'));
  return hits[0]?.object || null;
}

// Verifica se o ponteiro esta sobre o deck central.
function isPointerOverDeck(event) {
  if (!app.deckMesh) return false;

  setPointer(event);
  if (getIntersections([app.deckMesh]).length > 0) return true;

  const point = new THREE.Vector3();
  if (!rayToPlane(event, point)) return false;

  return Math.hypot(point.x - app.deckMesh.position.x, point.z - app.deckMesh.position.z) < 0.95;
}

// Verifica se uma pilha esta sobre o deck pelo ponteiro ou pela posicao do conjunto.
function isStackOverDeck(stack, event) {
  if (!app.deckMesh || !stack) return false;
  if (event && isPointerOverDeck(event)) return true;
  return Math.hypot(stack.position.x - app.deckMesh.position.x, stack.position.z - app.deckMesh.position.z) < 0.72;
}

// Projeta o raio do mouse no plano de arrasto da mesa.
function rayToPlane(event, out) {
  setPointer(event);
  app.raycaster.setFromCamera(app.pointer, app.camera);
  return app.raycaster.ray.intersectPlane(app.dragPlane, out);
}

// Executa raycast contra uma lista de objetos 3D.
function getIntersections(objects) {
  app.raycaster.setFromCamera(app.pointer, app.camera);
  return app.raycaster.intersectObjects(objects, false);
}

// Lista os meshes de todas as cartas ativas.
function getCardMeshes() {
  return [...app.cards.values()].map(card => card.mesh);
}

// Lista os meshes de moedas e dados ativos.
function getObjectMeshes() {
  return [...app.objects.values()].map(object => object.mesh);
}

// Converte coordenadas de tela em coordenadas normalizadas para raycast.
function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  app.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  app.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Loop principal de animacao, fisica e renderizacao.
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - app.lastTime) / 1000, 0.033);
  app.lastTime = now;

  updateCardTweens(dt);
  updateFlipTweens(dt);
  updateCameraFocus(dt);
  updateDeckShuffle(dt);
  rescueLimboPieces();
  app.world.step();
  syncPhysicsMeshes();
  app.controls.update();
  updateCameraDebug();
  updatePlayerBadges();
  app.renderer.render(app.scene, app.camera);
  renderInspectOverlay();
}

// Renderiza a inspecao ampliada por cima da mesa atual.
function renderInspectOverlay() {
  if (!app.inspectGroup?.visible || !app.inspectCamera || !app.inspectScene) return;
  const previousAutoClear = app.renderer.autoClear;
  app.renderer.autoClear = false;
  app.renderer.clearDepth();
  app.renderer.render(app.inspectScene, app.inspectCamera);
  app.renderer.autoClear = previousAutoClear;
}

// Atualiza o painel de leitura dos parametros atuais da camera.
function updateCameraDebug() {
  if (!cameraDebugEl || !app.camera || !app.controls) return;

  const position = app.camera.position;
  const target = app.controls.target;
  const offset = position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const distance = offset.length();
  const polar = THREE.MathUtils.radToDeg(spherical.phi);
  const azimuth = normalizeDebugAngle(THREE.MathUtils.radToDeg(spherical.theta));
  const text = [
    'CAMERA',
    `pos: ${formatDebugVector(position)}`,
    `target: ${formatDebugVector(target)}`,
    `dist: ${formatDebugNumber(distance)} | polar: ${formatDebugNumber(polar)}°`,
    `azim: ${formatDebugNumber(azimuth)}° | fov: ${formatDebugNumber(app.camera.fov)}°`
  ].join('\n');

  if (text === app.lastCameraDebugText) return;
  app.lastCameraDebugText = text;
  cameraDebugEl.textContent = text;
}

// Normaliza angulos para ficarem mais faceis de copiar e comparar.
function normalizeDebugAngle(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

// Formata vetores de camera com precisao suficiente para reproduzir a vista.
function formatDebugVector(vector) {
  return `${formatDebugNumber(vector.x)}, ${formatDebugNumber(vector.y)}, ${formatDebugNumber(vector.z)}`;
}

// Padroniza numeros do painel de camera.
function formatDebugNumber(value) {
  return Number(value).toFixed(2);
}

// Atualiza animacoes de cartas em movimento.
function updateCardTweens(dt) {
  app.cards.forEach((card) => {
    if (!card.target) return;

    card.target.progress = Math.min(1, card.target.progress + dt * 4.2);
    const t = easeOutCubic(card.target.progress);
    const a = card.target.start.clone().lerp(card.target.high, Math.min(t * 2, 1));
    const b = card.target.high.clone().lerp(card.target.end, Math.max((t - 0.5) * 2, 0));
    const pos = t < 0.5 ? a : b;

    card.body.setNextKinematicTranslation(pos);
    card.body.setNextKinematicRotation(card.targetQuat);

    if (card.target.progress >= 1) {
      card.body.setNextKinematicTranslation(card.target.end);
      card.body.setNextKinematicRotation(card.targetQuat);
      const onComplete = card.target.onComplete;
      card.target = null;
      onComplete?.();
      scheduleTableSync();
    }
  });
}

// Sincroniza meshes visuais com corpos fisicos.
function syncPhysicsMeshes() {
  app.cards.forEach((card) => {
    const pos = card.body.translation();
    const rot = card.body.rotation();
    card.mesh.position.set(pos.x, pos.y, pos.z);
    card.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  });

  app.objects.forEach((object) => {
    const pos = object.body.translation();
    const rot = object.body.rotation();
    object.mesh.position.set(pos.x, pos.y, pos.z);
    object.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  });

  syncHoverOutline();
}

// Mantem placas de jogador posicionadas e sempre voltadas para a camera.
function updatePlayerBadges() {
  if (!app.camera) return;

  app.playerBadges.forEach((badge, playerId) => {
    const player = state.players[playerId - 1];
    badge.group.visible = Boolean(player?.isReserved) && playerId !== state.viewPlayer;
    badge.group.position.copy(getPlayerBadgePosition(playerId));
    badge.group.lookAt(app.camera.position);
  });
}

// Atualiza animacoes de flip das cartas.
function updateFlipTweens(dt) {
  app.cards.forEach((card) => {
    if (!card.flip) return;

    const flip = card.flip;
    flip.progress = Math.min(1, flip.progress + dt * 3.8);
    const t = easeInOutCubic(flip.progress);
    const rising = t < 0.5;
    const localT = rising ? t * 2 : (t - 0.5) * 2;
    const pos = rising
      ? flip.startPosition.clone().lerp(flip.liftPosition, localT)
      : flip.liftPosition.clone().lerp(flip.startPosition, localT);
    const quat = rising
      ? flip.startQuat.clone().slerp(flip.liftQuat, localT)
      : flip.liftQuat.clone().slerp(flip.startQuat, localT);

    if (!flip.swapped && flip.progress >= 0.5) {
      card.data.faceUp = flip.nextFaceUp;
      refreshCardMaterial(card);
      flip.swapped = true;
    }

    card.body.setNextKinematicTranslation(pos);
    card.body.setNextKinematicRotation(quat);

    if (flip.progress >= 1) {
      card.body.setNextKinematicTranslation(flip.startPosition);
      card.body.setNextKinematicRotation(flip.startQuat);
      card.flip = null;

      if (flip.restoreDynamic) {
        card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
        card.body.setLinvel({ x: 0, y: -0.08, z: 0 }, true);
        card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      scheduleTableSync();
    }
  });
}

// Interpola a camera ate a vista padrao do jogador ativo.
function updateCameraFocus(dt) {
  if (!app.cameraFocus) return;

  const focus = app.cameraFocus;
  focus.progress = Math.min(1, focus.progress + dt * 2.4);
  const t = easeInOutCubic(focus.progress);

  app.camera.position.copy(focus.startPosition).lerp(focus.endPosition, t);
  app.controls.target.copy(focus.startTarget).lerp(focus.endTarget, t);

  if (focus.progress >= 1) {
    app.camera.position.copy(focus.endPosition);
    app.controls.target.copy(focus.endTarget);
    app.cameraFocus = null;
  }
}

// Atualiza a animacao visual de embaralhar o deck.
function updateDeckShuffle(dt) {
  if (!app.deckShuffle || !app.deckMesh) return;

  const shuffleState = app.deckShuffle;
  shuffleState.progress = Math.min(1, shuffleState.progress + dt * 2.8);
  const t = shuffleState.progress;
  const shake = Math.sin(t * Math.PI * 14) * (1 - t);
  const wobble = Math.sin(t * Math.PI * 22) * (1 - t);

  app.deckMesh.rotation.y = shuffleState.startRotation + t * Math.PI * 2 + wobble * 0.16;
  app.deckMesh.position.x = shuffleState.startPosition.x + shake * 0.08;
  app.deckMesh.position.z = shuffleState.startPosition.z + Math.cos(t * Math.PI * 12) * (1 - t) * 0.05;
  syncDeckRim();
  updateDeckCollider();

  if (t >= 1) {
    app.deckMesh.rotation.y = shuffleState.startRotation;
    app.deckMesh.position.copy(shuffleState.startPosition);
    app.deckShuffle = null;
    shuffleBtn.disabled = false;
    syncDeckRim();
    updateDeckCollider();
  }
}

// Resgata cartas e objetos que caem fora da mesa.
function rescueLimboPieces() {
  app.cards.forEach((card) => {
    if (card.target || card.flip) return;
    const pos = card.body.translation();
    if (!isInLimbo(pos)) return;
    resetPieceToTable(card, 0.34);
  });

  app.objects.forEach((object) => {
    const pos = object.body.translation();
    if (!isInLimbo(pos)) return;
    resetPieceToTable(object, object.kind.includes('coin') ? 0.28 : 0.48);
  });
}

// Detecta se uma peca caiu abaixo ou longe demais da mesa.
function isInLimbo(pos) {
  return pos.y < LIMBO_Y || Math.hypot(pos.x, pos.z) > LIMBO_RADIUS;
}

// Reposiciona uma peca perdida de volta ao centro da mesa.
function resetPieceToTable(piece, y) {
  const angle = random(0, Math.PI * 2);
  const radius = random(0, 0.55);
  const position = {
    x: Math.cos(angle) * radius,
    y,
    z: Math.sin(angle) * radius
  };

  piece.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  piece.body.setTranslation(position, true);
  piece.body.setRotation(rapierQuatFromEuler(0, random(0, Math.PI * 2), 0), true);
  piece.body.setLinvel({ x: random(-0.08, 0.08), y: 0, z: random(-0.08, 0.08) }, true);
  piece.body.setAngvel({ x: 0, y: random(-0.25, 0.25), z: 0 }, true);
}

// Ajusta camera e renderer quando a janela muda de tamanho.
function resize() {
  app.camera.aspect = window.innerWidth / window.innerHeight;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  resizeInspectOverlay();
}

// Agenda sincronizacao do estado final da mesa sem transmitir animacoes.
function scheduleTableSync() {
  if (app.isApplyingRemoteState) return;
  if (app.tableSyncSuppressCount > 0) return;
  if (!window.CoupMaster3DOnline?.publishTableState) return;

  window.clearTimeout(app.syncTimer);
  app.syncTimer = window.setTimeout(() => {
    window.CoupMaster3DOnline.publishTableState(getTableState());
  }, 180);
}

// Serializa o estado atual da mesa para o Firebase.
function getTableState() {
  return {
    version: 1,
    deckConfig: { ...state.deckConfig },
    deck: state.deck.map(cloneCardData),
    deckTransform: serializeTransform(app.deckMesh),
    objectId: app.objectId,
    stackId: app.stackId,
    players: state.players.map(player => ({
      id: player.id,
      coinCount: Number(player.coinCount) || 0,
      cards: player.cards.map(cloneCardData)
    })),
    tableCards: state.tableCards.map(cloneCardData),
    cards: [...app.cards.values()].map(card => ({
      data: cloneCardData(card.data),
      position: serializeBodyPosition(card),
      quaternion: serializeBodyRotation(card)
    })),
    objects: [...app.objects.values()].map(object => ({
      id: object.id,
      kind: object.kind,
      position: serializeBodyPosition(object),
      quaternion: serializeBodyRotation(object)
    })),
    stacks: app.tableStacks.map(stack => ({
      id: stack.id,
      faceUp: stack.faceUp,
      cards: stack.cards.slice(),
      position: serializeVector(stack.position),
      rotationY: stack.rotationY
    }))
  };
}

// Aplica o estado final publicado por outro jogador, sem reemitir eco.
function applyTableState(snapshot) {
  if (!snapshot || snapshot.version !== 1) return;

  app.isApplyingRemoteState = true;
  window.clearTimeout(app.syncTimer);
  clearPointerHover();
  clearDropHover();
  app.dragged = null;
  app.dragMode = null;
  app.pendingDeckDrag = null;
  app.pendingStackDrag = null;
  app.controls.enabled = true;

  app.stackShuffleTimers.forEach(timer => window.clearTimeout(timer));
  app.stackShuffleTimers.clear();
  clearCardsForSnapshot();
  clearTableObjects(false);

  state.deckConfig = { ...DEFAULT_DECK_CONFIG, ...(snapshot.deckConfig || {}) };
  state.deck = (snapshot.deck || []).map(cloneCardData).filter(Boolean);
  state.tableCards = [];
  state.players.forEach(player => {
    player.cards = [];
    player.coinCount = 0;
  });
  (snapshot.players || []).forEach((snapshotPlayer) => {
    const player = state.players[(Number(snapshotPlayer?.id) || 0) - 1];
    if (!player) return;
    player.coinCount = Math.max(0, Math.min(99, Number(snapshotPlayer.coinCount) || 0));
  });
  app.tableStacks = [];
  app.objectId = Math.max(Number(snapshot.objectId) || 1, 1);
  app.stackId = Math.max(Number(snapshot.stackId) || 1, 1);

  syncDeckConfigInputs();
  applyDeckTransform(snapshot.deckTransform);

  (snapshot.cards || []).forEach((entry) => {
    const data = cloneCardData(entry.data);
    if (!data || data.location === 'deck') return;
    addCardDataToCollections(data);

    const card = createCardObject(data);
    placeCardFromSnapshot(card, entry);
    bumpObjectIdFrom(data.id);
  });

  app.tableStacks = (snapshot.stacks || []).map(stack => {
    bumpStackIdFrom(stack.id);
    return {
      id: stack.id,
      faceUp: Boolean(stack.faceUp),
      cards: Array.isArray(stack.cards) ? stack.cards.slice() : [],
      position: vectorFromSnapshot(stack.position, new THREE.Vector3()),
      rotationY: Number(stack.rotationY) || 0
    };
  });

  app.tableStacks.forEach(stack => {
    stack.cards.forEach((id) => {
      const card = app.cards.get(id);
      if (card) card.data.stackId = stack.id;
    });
    layoutTableStack(stack, false);
  });

  (snapshot.objects || []).forEach((object) => {
    if (object.kind === 'gold-coin' || object.kind === 'silver-coin') {
      spawnCoin(object.kind === 'gold-coin' ? 'gold' : 'silver', {
        id: object.id,
        position: object.position,
        quaternion: object.quaternion,
        silent: true
      });
    } else if (object.kind === 'die') {
      spawnDie({
        id: object.id,
        position: object.position,
        quaternion: object.quaternion,
        silent: true
      });
    }
  });

  state.players.forEach(player => layoutPlayerHand(player.id, 0));
  renderRoomPlayerList();
  setLocalPlayerSeat(getLocalPlayerSeat(), { focus: false, preserveView: true });
  updateHud();
  app.isApplyingRemoteState = false;
}

// Remove cartas atuais antes de aplicar um snapshot remoto.
function clearCardsForSnapshot() {
  app.cards.forEach((card) => {
    app.scene.remove(card.mesh);
    app.world.removeRigidBody(card.body);
  });
  app.cards.clear();
  app.selectedCard = null;
}

// Insere uma carta restaurada na colecao correspondente.
function addCardDataToCollections(data) {
  if (data.owner) {
    const player = state.players[data.owner - 1];
    if (player) player.cards.push(data);
    return;
  }

  if (data.location === 'table') {
    state.tableCards.push(data);
  }
}

// Posiciona carta restaurada diretamente sem animacao.
function placeCardFromSnapshot(card, entry) {
  const position = vectorFromSnapshot(entry.position, new THREE.Vector3(0, 0.42, 0));
  const quaternion = quaternionFromSnapshot(entry.quaternion, new THREE.Quaternion());
  card.mesh.position.copy(position);
  card.mesh.quaternion.copy(quaternion);
  card.body.setTranslation(position, true);
  card.body.setRotation(quaternion, true);
  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// Aplica posicao/rotacao do deck compartilhado.
function applyDeckTransform(transform) {
  resetDeckPosition();
  if (!app.deckMesh || !transform) return;

  const position = vectorFromSnapshot(transform.position, app.deckMesh.position);
  const quaternion = quaternionFromSnapshot(transform.quaternion, app.deckMesh.quaternion);
  app.deckMesh.position.copy(position);
  app.deckMesh.quaternion.copy(quaternion);
  syncDeckRim();
  updateDeckCollider();
}

// Serializa transform de mesh para objeto simples.
function serializeTransform(mesh) {
  if (!mesh) return null;
  return {
    position: serializeVector(mesh.position),
    quaternion: serializeQuaternion(mesh.quaternion)
  };
}

// Serializa posicao do corpo fisico, caindo para mesh quando necessario.
function serializeBodyPosition(piece) {
  const position = piece.body?.translation?.();
  return serializeVector(position || piece.mesh?.position);
}

// Serializa rotacao do corpo fisico, caindo para mesh quando necessario.
function serializeBodyRotation(piece) {
  const rotation = piece.body?.rotation?.();
  return serializeQuaternion(rotation || piece.mesh?.quaternion);
}

// Serializa um vetor em objeto aceito pelo Firebase.
function serializeVector(vector) {
  return {
    x: Number(vector?.x) || 0,
    y: Number(vector?.y) || 0,
    z: Number(vector?.z) || 0
  };
}

// Serializa um quaternion em objeto aceito pelo Firebase.
function serializeQuaternion(quaternion) {
  return {
    x: Number(quaternion?.x) || 0,
    y: Number(quaternion?.y) || 0,
    z: Number(quaternion?.z) || 0,
    w: Number(quaternion?.w) || 1
  };
}

// Recria um Vector3 a partir de dados simples.
function vectorFromSnapshot(value, fallback) {
  return new THREE.Vector3(
    Number(value?.x ?? fallback?.x ?? 0),
    Number(value?.y ?? fallback?.y ?? 0),
    Number(value?.z ?? fallback?.z ?? 0)
  );
}

// Recria um Quaternion a partir de dados simples.
function quaternionFromSnapshot(value, fallback) {
  return new THREE.Quaternion(
    Number(value?.x ?? fallback?.x ?? 0),
    Number(value?.y ?? fallback?.y ?? 0),
    Number(value?.z ?? fallback?.z ?? 0),
    Number(value?.w ?? fallback?.w ?? 1)
  );
}

// Clona dados de carta para evitar referencias mutaveis.
function cloneCardData(data) {
  return data ? JSON.parse(JSON.stringify(data)) : null;
}

// Mantem o contador de objetos acima dos IDs restaurados.
function bumpObjectIdFrom(id) {
  const number = Number(String(id).match(/(\d+)$/)?.[1]);
  if (!Number.isNaN(number)) app.objectId = Math.max(app.objectId, number + 1);
}

// Mantem o contador de pilhas acima dos IDs restaurados.
function bumpStackIdFrom(id) {
  const number = Number(String(id).match(/(\d+)$/)?.[1]);
  if (!Number.isNaN(number)) app.stackId = Math.max(app.stackId, number + 1);
}

// Atualiza contadores e visibilidade do deck no HUD.
function updateHud() {
  updateRoomCodeStatus();
  deckCountEl.textContent = `Deck: ${state.deck.length}`;
  tableCountEl.textContent = `Mesa: ${state.tableCards.length}`;
  objectCountEl.textContent = `Objetos: ${app.objects.size}`;

  if (app.deckMesh) {
    app.deckMesh.visible = true;
    syncDeckHitboxGeometry();
    app.deckMesh.position.y = CARD_REST_Y + getDeckHeight() / 2;
    updateDeckVisualLayers();
    syncDeckRim();
    updateDeckCollider();
  }

  scheduleTableSync();
}

// Mantem o codigo da sala clicavel ao lado dos contadores.
function updateRoomCodeStatus() {
  if (!roomCodeStatusBtn) return;
  const roomCode = window.CoupMaster3DOnline?.roomCode || '----';
  roomCodeStatusBtn.textContent = `Sala: ${roomCode}`;
  roomCodeStatusBtn.title = roomCode === '----' ? 'Código da sala indisponível' : `Copiar sala ${roomCode}`;
}

// Retorna a altura visual/fisica atual do deck real.
function getDeckHeight() {
  const layerCount = getVisibleDeckLayerCount();
  if (layerCount <= 1) return CARD_D;
  return layerCount * CARD_D + (layerCount - 1) * DECK_STACK_GAP;
}

// Retorna o espacamento vertical entre cartas reais do deck.
function getDeckLayerStep() {
  return CARD_D + DECK_STACK_GAP;
}

// Limita a altura visual do deck sem alterar a quantidade real de cartas.
function getVisibleDeckLayerCount() {
  return Math.min(state.deck.length, 8);
}

// Mantem o hitbox invisivel do deck com a mesma altura da pilha real.
function syncDeckHitboxGeometry() {
  if (!app.deckMesh) return;
  const deckHeight = getDeckHeight();
  if (Math.abs(app.deckHitHeight - deckHeight) < 0.0001) return;

  app.deckMesh.geometry.dispose();
  app.deckMesh.geometry = createRoundedCardGeometry(CARD_W, CARD_H, deckHeight, CARD_RADIUS);
  app.deckHitHeight = deckHeight;
}

// Mantem o aro visual do deck alinhado ao deck.
function syncDeckRim() {
  if (!app.deckRim || !app.deckMesh) return;

  const deckHeight = getDeckHeight();
  app.deckRim.position.set(
    app.deckMesh.position.x,
    app.deckMesh.position.y + deckHeight / 2 + 0.004,
    app.deckMesh.position.z
  );
  app.deckRim.rotation.set(0, app.deckMesh.rotation.y, 0);
  app.deckRim.visible = state.deck.length > 0;
}

// Recria o collider fisico fixo do deck.
function updateDeckCollider() {
  if (app.deckBody) {
    app.world.removeRigidBody(app.deckBody);
    app.deckBody = null;
  }

  if (!app.deckMesh || state.deck.length <= 0) return;

  const deckHeight = getDeckHeight();
  app.deckBody = app.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(app.deckMesh.position.x, app.deckMesh.position.y, app.deckMesh.position.z)
      .setRotation(rapierQuatFromEuler(0, app.deckMesh.rotation.y, 0))
  );

  const collider = RAPIER.ColliderDesc.cuboid(CARD_W / 2, deckHeight / 2, CARD_H / 2);
  collider.setFriction(1.35);
  collider.setRestitution(0.08);
  app.world.createCollider(collider, app.deckBody);
}

// Embaralha uma lista usando Fisher-Yates.
function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Retorna numero aleatorio entre minimo e maximo.
function random(min, max) {
  return min + Math.random() * (max - min);
}

// Aplica easing de desaceleracao para animacoes.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Aplica easing suave de entrada e saida.
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Converte rotacao Euler do Three.js para quaternion do Rapier.
function rapierQuatFromEuler(x, y, z) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}
