import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

const canvas = document.getElementById('threeCanvas');
const deckCountEl = document.getElementById('deckCount');
const tableCountEl = document.getElementById('tableCount');
const objectCountEl = document.getElementById('objectCount');
const hoverTooltipEl = document.getElementById('hoverTooltip');
const playerTabsEl = document.getElementById('playerTabs');
const drawBtn = document.getElementById('drawBtn');
const goldCoinBtn = document.getElementById('goldCoinBtn');
const silverCoinBtn = document.getElementById('silverCoinBtn');
const asylumCardBtn = document.getElementById('asylumCardBtn');
const religionCardBtn = document.getElementById('religionCardBtn');
const diceBtn = document.getElementById('diceBtn');
const rollBtn = document.getElementById('rollBtn');
const clearObjectsBtn = document.getElementById('clearObjectsBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const dealBtn = document.getElementById('dealBtn');
const resetBtn = document.getElementById('resetBtn3d');
const infoBtn = document.getElementById('infoBtn3d');
const altRulesBtn = document.getElementById('altRulesBtn3d');
const spectatorBtn = document.getElementById('spectatorBtn3d');
const fullscreenBtn = document.getElementById('fullscreenBtn3d');
const settingsBtn = document.getElementById('settingsBtn3d');
const musicBtn = document.getElementById('musicBtn3d');
const feedbackBtn = document.getElementById('feedbackBtn3d');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const feedbackModal = document.getElementById('feedbackModal');
const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
const ruleCardsModal = document.getElementById('ruleCardsModal');
const closeRuleCardsBtn = document.getElementById('closeRuleCardsBtn');
const ruleFlipCard = document.getElementById('ruleFlipCard');
const ruleFrontImg = document.getElementById('ruleFrontImg');
const ruleBackImg = document.getElementById('ruleBackImg');
const rulePrevBtn = document.getElementById('rulePrevBtn');
const ruleNextBtn = document.getElementById('ruleNextBtn');
const ruleCardsCounter = document.getElementById('ruleCardsCounter');
const altRulesModal = document.getElementById('altRulesModal');
const closeAltRulesBtn = document.getElementById('closeAltRulesBtn');
const altRuleFlipCard = document.getElementById('altRuleFlipCard');
const altRuleFrontImg = document.getElementById('altRuleFrontImg');
const altRuleBackImg = document.getElementById('altRuleBackImg');
const altRulePrevBtn = document.getElementById('altRulePrevBtn');
const altRuleNextBtn = document.getElementById('altRuleNextBtn');
const altRuleCounter = document.getElementById('altRuleCounter');
const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
const configModal = document.getElementById('configModal');
const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
const applyDeckConfigBtn = document.getElementById('applyDeckConfigBtn');
const volumeSlider = document.getElementById('volumeSlider');
const vfxVolumeSlider = document.getElementById('vfxVolumeSlider');
const bgmAudio = document.getElementById('bgmAudio');
const resetVfxAudio = document.getElementById('resetVfxAudio');

const CARD_W = 0.72;
const CARD_H = 1.04;
const CARD_D = (0.035 / 5) * 0.9 * 0.95 * 0.9;
const CARD_RADIUS = 0.055;
const TABLE_RADIUS = 4.65;
const FELT_RADIUS = 4.18;
const PLAY_RADIUS = 3.62;
const TABLE_PHYSICS_RADIUS = TABLE_RADIUS * Math.cos(Math.PI / 8);
const PLAYER_COUNT = 8;
const HAND_RADIUS = 3.08;
const CARD_REST_Y = 0.068;
const DECK_BASE_HEIGHT = 0.38 * 0.4;
const HAND_LADDER_SPACING = 0.36;
const HAND_LADDER_DEPTH = 0.075;
const HAND_LADDER_LIFT = 0.012;
const HAND_LADDER_ROTATION = 0.035;
const GOLD_COIN_RADIUS = 0.16 * 1.1;
const SILVER_COIN_RADIUS = GOLD_COIN_RADIUS * (940 / 1280);
const COIN_HEIGHT = 0.055 / 3;
const COIN_TEXTURES = {
  gold: 'assets/img/coins/moeda-ouro.png',
  silver: 'assets/img/coins/moeda-prata.png'
};
const SPECIAL_CARD_TEXTURES = {
  asilo: {
    front: 'assets/img/cards/religion/asilo-frente.png',
    back: 'assets/img/cards/religion/asilo-verso.png'
  },
  religiao: {
    front: 'assets/img/cards/religion/catolico.png',
    back: 'assets/img/cards/religion/protestante.png'
  }
};
const ASYLUM_CARD_AREA_SCALE = 2;
const ASYLUM_CARD_ASPECT = 1024 / 736;
const RELIGION_CARD_HEIGHT_SCALE = 0.7;
const RELIGION_CARD_ASPECT = 880 / 1200;
const DIE_SIZE = 0.42;
const DECK_DRAG_HOLD_MS = 260;
const CARD_RETURN_COOLDOWN_MS = 300;
const LIMBO_Y = -2.2;
const LIMBO_RADIUS = TABLE_RADIUS + 2.2;
const TABLE_STACK_RADIUS = 0.58;
const TABLE_STACK_GAP = 0.012;
const DECK_STACK_GAP = TABLE_STACK_GAP;
const DECK_ROTATION_Y = 0;
const OBJECT_ROTATION_STEP = Math.PI / 12;
const DEFAULT_CAMERA_HEIGHT = 7.6;
const DEFAULT_CAMERA_DISTANCE = 7.8;
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const DEFAULT_MUSIC_VOLUME = 0.1;
const DEFAULT_VFX_VOLUME = 0.5;

const CARD_LIBRARY = [
  { type: 'duque', folder: 'base' },
  { type: 'capitao', folder: 'base' },
  { type: 'assassino', folder: 'base' },
  { type: 'condessa', folder: 'base' },
  { type: 'embaixador', folder: 'base' },
  { type: 'inquisidor', folder: 'base' },
  { type: 'bufao', folder: 'promo' },
  { type: 'burocrata', folder: 'promo' },
  { type: 'benfeitor', folder: 'promo' },
  { type: 'burgues', folder: 'promo' },
  { type: 'marionetista', folder: 'dlc1' },
  { type: 'diplomata', folder: 'dlc1' },
  { type: 'mercenario', folder: 'dlc1' },
  { type: 'bispo', folder: 'dlc1' },
  { type: 'tesoureiro', folder: 'dlc1' },
  { type: 'vigilante', folder: 'dlc1' },
  { type: 'pistoleiro', folder: 'dlc2' },
  { type: 'magnata', folder: 'dlc2' },
  { type: 'estrategista', folder: 'dlc2' },
  { type: 'ladrao', folder: 'dlc2' },
  { type: 'vigarista', folder: 'dlc2' },
  { type: 'xerife', folder: 'dlc2' }
];

const CARD_LABELS = {
  assassino: 'Assassino',
  benfeitor: 'Benfeitor',
  bispo: 'Bispo',
  bufao: 'Bufão',
  burocrata: 'Burocrata',
  burgues: 'Burguês',
  capitao: 'Capitão',
  condessa: 'Condessa',
  diplomata: 'Diplomata',
  duque: 'Duque',
  embaixador: 'Embaixador',
  estrategista: 'Estrategista',
  inquisidor: 'Inquisidor',
  ladrao: 'Ladrão',
  magnata: 'Magnata',
  marionetista: 'Marionetista',
  mercenario: 'Mercenário',
  pistoleiro: 'Pistoleiro',
  tesoureiro: 'Tesoureiro',
  vigarista: 'Vigarista',
  vigilante: 'Vigilante',
  xerife: 'Xerife',
  asilo: 'Asilo',
  religiao: 'Religião'
};

const SPECIAL_CARD_LABELS = {
  asilo: {
    front: 'Asilo',
    back: 'Asilo'
  },
  religiao: {
    front: 'Católico',
    back: 'Protestante'
  }
};

const DEFAULT_DECK_CONFIG = Object.fromEntries(
  CARD_LIBRARY.map(({ type, folder }) => [type, folder === 'base' ? 5 : 0])
);

const RULE_CARD_GROUPS = {
  promo: ['bufao', 'benfeitor', 'burgues', 'burocrata'],
  revolution: ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'],
  shadows: ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife']
};

const ALT_RULE_IMAGES = [
  'assets/img/guides/alternative-rules1.png',
  'assets/img/guides/alternative-rules2.png',
  'assets/img/guides/alternative-rules3.png',
  'assets/img/guides/alternative-rules4.png'
];

const state = {
  activePlayer: 1,
  deckConfig: { ...DEFAULT_DECK_CONFIG },
  deck: [],
  tableCards: [],
  players: Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    id: index + 1,
    cards: []
  }))
};

const app = {
  renderer: null,
  scene: null,
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
  lastCardClick: null,
  lastCardReturnAt: 0,
  selectedCard: null,
  selectedObject: null,
  hoveredDrop: null,
  hoveredPiece: null,
  hoverOutline: null,
  cameraFocus: null,
  deckShuffle: null,
  deckVisualCount: -1,
  deckHitHeight: 0,
  stackShuffleTimers: new Map(),
  ruleImages: [],
  ruleImageIndex: 0,
  altRuleIndex: 0,
  cards: new Map(),
  objects: new Map(),
  tableStacks: [],
  dropZones: [],
  objectId: 1,
  stackId: 1,
  isDealing: false,
  musicStarted: false,
  musicMuted: false,
  vfxVolume: DEFAULT_VFX_VOLUME,
  lastResetVfxAt: 0,
  vfx: new Map(),
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
  app.scene.fog = new THREE.Fog(0x171d26, 18, 32);

  app.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 80);
  app.camera.position.copy(getPlayerCameraPosition(state.activePlayer));

  app.controls = new OrbitControls(app.camera, canvas);
  app.controls.target.copy(DEFAULT_CAMERA_TARGET);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.08;
  app.controls.minDistance = 5;
  app.controls.maxDistance = 13;
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
  createDeck();
  createPlayerTabs();
  setupSettingsModal();
  setupMusicControls();

  drawBtn.addEventListener('click', () => drawCardToPlayer(state.activePlayer));
  goldCoinBtn.addEventListener('click', () => spawnCoin('gold'));
  silverCoinBtn.addEventListener('click', () => spawnCoin('silver'));
  asylumCardBtn.addEventListener('click', () => spawnSpecialCard('asilo'));
  religionCardBtn.addEventListener('click', () => spawnSpecialCard('religiao'));
  diceBtn.addEventListener('click', () => spawnDie());
  rollBtn.addEventListener('click', rollDice);
  clearObjectsBtn.addEventListener('click', clearTableObjects);
  shuffleBtn.addEventListener('click', shuffleDeck);
  dealBtn.addEventListener('click', dealInitialHands);
  resetBtn.addEventListener('pointerdown', playResetSoundFromButton);
  resetBtn.addEventListener('click', triggerResetFromButton);
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
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

// Monta a mesa visual, o feltro, o chao do limbo e o collider do tampo.
function createTable() {
  const tableGeo = new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.34, 8, 1, false, Math.PI / 8);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x26130b,
    roughness: 0.58,
    metalness: 0.18
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
    const zone = makeZone(`player-${i}`, pos.x, pos.z, 1.90, 1.25, i === state.activePlayer ? 0x18f28a : 0x3da3ff, 0.16);
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

// Monta os botoes de selecao dos jogadores.
function createPlayerTabs() {
  playerTabsEl.innerHTML = '';

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `P${i}`;
    btn.dataset.player = i;
    btn.addEventListener('click', () => setActivePlayer(i));
    playerTabsEl.appendChild(btn);
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
  spectatorBtn?.addEventListener('click', () => {
    spectatorBtn.blur();
  });
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  syncFullscreenButton();

  closeRuleCardsBtn?.addEventListener('click', () => {
    closeModal(ruleCardsModal);
  });
  rulePrevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    stepRuleCard(-1);
  });
  ruleNextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    stepRuleCard(1);
  });
  ruleFlipCard?.addEventListener('click', () => stepRuleCard(1));
  ruleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepRuleCard(1);
    }
  });
  closeAltRulesBtn?.addEventListener('click', () => closeModal(altRulesModal));
  altRulePrevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    stepAltRuleCard(-1);
  });
  altRuleNextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    stepAltRuleCard(1);
  });
  altRuleFlipCard?.addEventListener('click', () => stepAltRuleCard(1));
  altRuleFlipCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stepAltRuleCard(1);
    }
  });

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
    state.deckConfig = readDeckConfigInputs();
    closeModal(configModal);
    resetMvp();
  });

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.addEventListener('click', () => applyDeckPreset(button.dataset.preset));
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal(overlay);
    });
  });
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
  syncMusicButton();

  musicBtn?.addEventListener('click', () => {
    app.musicMuted = !app.musicMuted;
    bgmAudio.muted = app.musicMuted;
    if (!app.musicMuted) startBackgroundMusic();
    syncMusicButton();
  });

  volumeSlider?.addEventListener('input', () => {
    bgmAudio.volume = clampAudioVolume(volumeSlider.value, DEFAULT_MUSIC_VOLUME);
    if (bgmAudio.volume > 0 && app.musicMuted) {
      app.musicMuted = false;
      bgmAudio.muted = false;
      syncMusicButton();
    }
  });

  vfxVolumeSlider?.addEventListener('input', () => {
    app.vfxVolume = clampAudioVolume(vfxVolumeSlider.value, DEFAULT_VFX_VOLUME);
  });

  window.addEventListener('pointerdown', startBackgroundMusic, { once: true });
  window.addEventListener('keydown', startBackgroundMusic, { once: true });
}

// Tenta iniciar a música respeitando o bloqueio de autoplay dos navegadores.
function startBackgroundMusic() {
  if (!bgmAudio || app.musicMuted || app.musicStarted) return;
  bgmAudio.volume = clampAudioVolume(volumeSlider?.value, DEFAULT_MUSIC_VOLUME);
  bgmAudio.play()
    .then(() => {
      app.musicStarted = true;
    })
    .catch(() => {});
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
  playResetSoundOnce();
  window.setTimeout(resetMvp, 90);
}

// Dispara o som no primeiro evento do clique para garantir ativacao de audio.
function playResetSoundFromButton(event) {
  event.stopPropagation();
  playResetSoundOnce();
}

// Evita repetir o efeito quando pointerdown e click chegam juntos.
function playResetSoundOnce() {
  const now = performance.now();
  if (now - app.lastResetVfxAt < 250) return;
  app.lastResetVfxAt = now;
  playVfx('reset-game');
}

// Prepara efeitos usados pela interface para evitar atraso no primeiro clique.
function preloadVfxAudio() {
  if (resetVfxAudio) {
    resetVfxAudio.volume = app.vfxVolume;
    app.vfx.set('reset-game', resetVfxAudio);
  }
  getVfxAudio('card-whoosh');
  getVfxAudio('shuffle');
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

// Escolhe as cartas de regra seguindo a mesma condicional do Coup Master 2D.
function calculateRuleImages() {
  const hasPromo = hasConfiguredCards(RULE_CARD_GROUPS.promo);
  const hasRevolution = hasConfiguredCards(RULE_CARD_GROUPS.revolution);
  const hasShadows = hasConfiguredCards(RULE_CARD_GROUPS.shadows);
  const images = [
    hasRevolution
      ? 'assets/img/guides/front-actions-alternative.png'
      : 'assets/img/guides/front-actions.png'
  ];

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
  });
  resetDeckPosition();

  setActivePlayer(1);
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
function drawCardToPlayer(playerId, animateDraw = true) {
  const data = state.deck.pop();
  if (!data) {
    updateHud();
    return;
  }
  playVfx('card-whoosh');

  data.owner = playerId;
  data.location = `player-${playerId}`;
  data.faceUp = playerId === state.activePlayer;
  state.players[playerId - 1].cards.push(data);

  const card = createCardObject(data);
  const target = getHandCardPosition(playerId, state.players[playerId - 1].cards.length - 1);
  const start = animateDraw ? getDeckDrawPosition(1.0) : target.clone().add(new THREE.Vector3(0, 0.35, 0));
  placeCard(card, start, getHandRotation(playerId), false);
  layoutPlayerHand(playerId, animateDraw ? 0.34 : 0);
  updateHud();
}

// Distribui ate duas cartas para cada assento com animacao sequencial.
function dealInitialHands() {
  if (app.isDealing) return;

  const dealQueue = getInitialDealQueue();
  if (dealQueue.length === 0 || state.deck.length === 0) return;

  app.isDealing = true;
  dealBtn.disabled = true;

  const totalCards = Math.min(dealQueue.length, state.deck.length);
  let completed = 0;
  dealQueue.forEach((playerId, index) => {
    window.setTimeout(() => {
      drawCardToPlayer(playerId, true);
      completed += 1;

      if (completed >= totalCards) {
        app.isDealing = false;
        dealBtn.disabled = false;
      }
    }, index * 140);
  });
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
  const seatedPlayers = state.players.map(player => player.id);

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
  const mesh = new THREE.Mesh(geo, makeCardMaterials(texturePaths.front, data.faceUp, null, texturePaths.back));
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
function spawnCoin(type = 'gold') {
  const id = `coin-${app.objectId++}`;
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

  const body = app.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(random(-0.5, 0.5), 1.2, random(-0.5, 0.5))
      .setRotation(rapierQuatFromEuler(random(-0.3, 0.3), random(0, Math.PI * 2), random(-0.3, 0.3)))
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
  playVfx('falling-coin');
  updateHud();
}

// Cria uma carta especial da DLC de religião diretamente na mesa.
function spawnSpecialCard(type) {
  const data = {
    id: `special-${type}-${app.objectId++}`,
    type,
    folder: 'religion',
    faceUp: true,
    location: 'table',
    owner: null,
    specialCard: true
  };
  state.tableCards.push(data);

  const card = createCardObject(data);
  const position = new THREE.Vector3(random(-0.45, 0.45), 0.42, random(-0.45, 0.45));
  placeCard(card, position, random(-0.22, 0.22), true);
  playVfx('card-whoosh');
  updateHud();
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
function spawnDie() {
  const id = `die-${app.objectId++}`;
  const geo = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  const mesh = new THREE.Mesh(geo, makeDieMaterials());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = id;
  mesh.userData.objectId = id;
  mesh.userData.kind = 'die';

  const body = app.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(random(-0.55, 0.55), 1.55, random(-0.55, 0.55))
      .setRotation(rapierQuatFromEuler(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)))
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
  rollSingleDie(app.objects.get(id), 0.75);
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
function makeCardMaterials(frontPath, faceUp, edgeColor = null, backPath = 'assets/img/cards/base/back.png') {
  const frontTexture = loadTexture(frontPath);
  const backTexture = loadTexture(backPath);
  const edge = new THREE.MeshStandardMaterial({
    color: edgeColor ?? (faceUp ? 0x161d28 : 0x0e1420),
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const face = new THREE.MeshStandardMaterial({
    map: faceUp ? frontTexture : backTexture,
    roughness: 0.58,
    metalness: 0.02
  });
  const back = new THREE.MeshStandardMaterial({
    map: faceUp ? backTexture : frontTexture,
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

  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(app.renderer.capabilities.getMaxAnisotropy(), 8);
  app.textures[path] = texture;
  return texture;
}

// Atualiza jogador ativo, zonas de destaque e visibilidade das maos.
function setActivePlayer(playerId) {
  state.activePlayer = playerId;

  [...playerTabsEl.children].forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.player) === playerId);
  });

  app.dropZones.forEach((zone) => {
    if (!zone.userData.playerId) return;
    const active = zone.userData.playerId === playerId;
    zone.material.color.set(active ? 0x18f28a : 0x3da3ff);
    zone.material.opacity = active ? 0.24 : zone.userData.baseOpacity;
  });

  app.cards.forEach((card) => {
    if (!card.data.owner) return;
    const shouldFaceUp = card.data.owner === playerId;
    if (card.data.faceUp !== shouldFaceUp) {
      card.data.faceUp = shouldFaceUp;
      refreshCardMaterial(card);
    }
  });

  updateHud();
}

// Atualiza o material da carta quando ela vira ou muda de dono.
function refreshCardMaterial(card) {
  const texturePaths = getCardTexturePaths(card.data);
  card.mesh.material = makeCardMaterials(texturePaths.front, card.data.faceUp, null, texturePaths.back);
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
    return card.data.faceUp ? labels?.front : labels?.back;
  }

  if (!card.data.faceUp) return 'Carta fechada';

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

// Prepara uma peca para arrasto cinematico sem empurrar outros objetos.
function beginDrag(event, piece, mode) {
  event.preventDefault();
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

// Finaliza o arrasto de pilha, juntando pilhas fechadas ao deck quando cabivel.
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

  stack.cards.forEach((id) => setPieceSensor(app.cards.get(id), false));
  layoutTableStack(stack, false);
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
}

// Fallback de duplo clique nativo para devolver carta ao deck.
function onDoubleClick(event) {
  setPointer(event);
  if (isPointerOverDeck(event)) return;

  const hits = getIntersections(getCardMeshes());
  const hit = hits[0];
  if (!hit) return;

  const card = app.cards.get(hit.object.userData.cardId);
  if (card && !card.target) tryReturnCardToDeck(card, true);
}

// Evita que cliques no deck atinjam cartas recém-compradas ainda em trânsito.
function isCardOverDeckGesture(card, event) {
  return Boolean(card?.target) && isPointerOverDeck(event);
}

// Devolve carta ao deck respeitando cooldown contra cliques duplicados.
function tryReturnCardToDeck(card, animated = false) {
  if (!card || card.data.location === 'deck') return false;
  if (card.data.specialCard) return false;

  const now = performance.now();
  if (now - app.lastCardReturnAt < CARD_RETURN_COOLDOWN_MS) return false;

  app.lastCardReturnAt = now;
  if (animated) {
    animateCardReturnToDeck(card);
  } else {
    returnCardToDeck(card);
  }
  return true;
}

// Centraliza camera, remove objetos ou vira carta via teclado.
function onKeyDown(event) {
  if (isAnyModalOpen()) {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(closeModal);
    }
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    focusTableCamera();
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (app.selectedCard?.data.specialCard) {
      event.preventDefault();
      removeSpecialCard(app.selectedCard);
      return;
    }

    if (!app.selectedObject) return;
    event.preventDefault();
    removeTableObject(app.selectedObject);
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
  if (!app.selectedCard) return;
  if (app.selectedCard.data.location === 'deck') return;

  event.preventDefault();
  const stack = getCardStack(app.selectedCard);
  if (stack && stack.cards.length > 1) {
    flipTableStack(stack);
  } else {
    flipCard(app.selectedCard);
  }
}

// Inicia animacao de foco da camera para o jogador ativo.
function focusTableCamera() {
  app.cameraFocus = {
    progress: 0,
    startPosition: app.camera.position.clone(),
    startTarget: app.controls.target.clone(),
    endPosition: getPlayerCameraPosition(state.activePlayer),
    endTarget: DEFAULT_CAMERA_TARGET.clone()
  };
}

// Calcula a posicao padrao da camera para um jogador.
function getPlayerCameraPosition(playerId) {
  const angle = getPlayerAngle(playerId);
  return new THREE.Vector3(
    Math.cos(angle) * DEFAULT_CAMERA_DISTANCE,
    DEFAULT_CAMERA_HEIGHT,
    Math.sin(angle) * DEFAULT_CAMERA_DISTANCE
  );
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
}

// Rotaciona uma carta individual ou a pilha inteira a que ela pertence.
function rotateCardPiece(card, delta) {
  if (card.target || card.flip || card.data.location === 'deck') return;

  const stack = getCardStack(card);
  if (stack && stack.cards.length > 1) {
    stack.rotationY += delta;
    layoutTableStack(stack, false);
    return;
  }

  rotatePhysicsObject(card, delta);
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
  card.data.faceUp = playerId === state.activePlayer;
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
  playVfx('shuffle');
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
    tossTo(card, target, getHandRotation(playerId, index, player.cards.length), lift);
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
  app.hoveredDrop.material.opacity = app.hoveredDrop.userData.playerId === state.activePlayer
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
  app.renderer.render(app.scene, app.camera);
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
}

// Atualiza contadores e visibilidade do deck no HUD.
function updateHud() {
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
