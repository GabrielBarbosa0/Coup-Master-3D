import * as THREE from 'three';
import {
  ALT_RULE_IMAGES,
  CARD_LABELS,
  CARD_LIBRARY,
  DEFAULT_DECK_CONFIG,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_VFX_VOLUME,
  PLAYER_COUNT,
  RULE_CARD_GROUPS
} from './config.js';
import * as dom from './dom.js';

const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 9;
const CARD_WIDTH = 0.78;
const CARD_HEIGHT = 1.12;
const SLOT_WIDTH = 3.62;
const SLOT_HEIGHT = 2.08;
const SLOT_AVATAR_SIZE = 0.27;
const SLOT_RELIGION_SIZE = 0.27;
const COIN_CONTROL_RADIUS = 0.092;
const CARD_DRAG_THRESHOLD = 5;
const SYNC_DELAY_MS = 160;
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

const LANDSCAPE_SLOT_LAYOUT = [
  { seat: 3, x: -5.72, y: 2.55 },
  { seat: 4, x: -1.91, y: 2.55 },
  { seat: 5, x: 1.91, y: 2.55 },
  { seat: 6, x: 5.72, y: 2.55 },
  { seat: 2, x: -5.72, y: -2.55 },
  { seat: 1, x: -1.91, y: -2.55 },
  { seat: 8, x: 1.91, y: -2.55 },
  { seat: 7, x: 5.72, y: -2.55 }
];

const PORTRAIT_SLOT_LAYOUT = [
  { seat: 4, x: -2.15, y: 5.9 },
  { seat: 5, x: 2.15, y: 5.9 },
  { seat: 3, x: -2.15, y: 3.2 },
  { seat: 6, x: 2.15, y: 3.2 },
  { seat: 2, x: -2.15, y: -3.2 },
  { seat: 7, x: 2.15, y: -3.2 },
  { seat: 1, x: -2.15, y: -5.9 },
  { seat: 8, x: 2.15, y: -5.9 }
];

const LANDSCAPE_ZONES = {
  asylum: { x: -6.18, y: 0, width: 2.25, height: 1.9 },
  cemetery: { x: 0, y: 0, width: 9.55, height: 1.9 },
  deck: { x: 6.18, y: 0, width: 2.25, height: 1.9 }
};

const PORTRAIT_ZONES = {
  asylum: { x: -3.34, y: 0, width: 1.82, height: 1.9 },
  cemetery: { x: 0, y: 0, width: 4.35, height: 1.9 },
  deck: { x: 3.34, y: 0, width: 1.82, height: 1.9 }
};

const state = {
  activePlayer: 1,
  viewPlayer: 1,
  deckConfig: { ...DEFAULT_DECK_CONFIG },
  deck: [],
  tableCards: [],
  objects: createDefaultObjects(),
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

const app = {
  renderer: null,
  scene: null,
  camera: null,
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  pointerWorld: new THREE.Vector3(),
  dragPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -2),
  clock: new THREE.Clock(),
  textureLoader: new THREE.TextureLoader(),
  textureCache: new Map(),
  backdrop: null,
  cards: new Map(),
  slots: new Map(),
  interactives: [],
  deckGroup: null,
  deckCountSprite: null,
  cemeteryGroup: null,
  asylumGroup: null,
  asylumCountSprite: null,
  hoveredCard: null,
  selectedCard: null,
  draggedCard: null,
  pressedAction: null,
  dragOffset: new THREE.Vector3(),
  pointerDown: new THREE.Vector2(),
  hasDragged: false,
  isAdmin: Boolean(window.CoupMaster3DOnline?.isAdmin),
  observedSeat: null,
  selectedRoomPlayer: null,
  spectatorRequest: null,
  ruleImages: [],
  ruleImageIndex: 0,
  altRuleIndex: 0,
  musicStarted: false,
  musicMuted: false,
  resumeMusicWhenVisible: false,
  vfxVolume: DEFAULT_VFX_VOLUME,
  vfx: new Map(),
  chatMessages: [],
  chatMessagesInitialized: false,
  appliedTableActions: new Set(),
  syncTimer: null,
  syncGeneration: 0,
  lastAppliedTableState: null,
  pendingRemoteState: null,
  isApplyingRemoteState: false,
  roomCodeFeedbackTimer: null,
  entityCounter: 1,
  isPortraitLayout: false
};

init();
resetLocalGame();
animate();
document.fonts?.ready?.then(() => {
  app.scene.traverse((object) => {
    if (object.userData?.textCanvas) {
      updateTextSprite(object, object.userData.textValue || '');
    }
  });
});

// Inicializa a cena ortográfica, o tabuleiro e os controles de interface.
function init() {
  app.renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  app.renderer.outputColorSpace = THREE.SRGBColorSpace;

  app.scene = new THREE.Scene();
  app.scene.background = new THREE.Color(0x0b1017);
  app.camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 50);
  app.camera.position.set(0, 0, 20);
  app.camera.lookAt(0, 0, 0);

  createBackdrop();
  createCentralZones();
  createPlayerSlots();
  setupUi();
  setupPointerEvents();
  resize();

  window.CoupMaster3D = {
    ...(window.CoupMaster3D || {}),
    applyTableAction,
    applyTableState,
    getTableState,
    receiveTableState,
    setAdminRole,
    setChatMessages,
    setLocalPlayerSeat,
    setOnlinePlayerProfiles,
    setPlayerProfile,
    showSpectatorRequest,
    showSpectatorResponse,
    startSpectatingPlayer
  };
}

// Desenha o fundo escuro com gradientes, grade e símbolos de naipe discretos.
function createBackdrop() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1600;
  textureCanvas.height = 900;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 1600, 900);
  gradient.addColorStop(0, '#241a29');
  gradient.addColorStop(0.42, '#102031');
  gradient.addColorStop(1, '#111b24');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1600, 900);

  const glow = context.createRadialGradient(800, 420, 0, 800, 420, 760);
  glow.addColorStop(0, 'rgba(24, 103, 151, 0.18)');
  glow.addColorStop(1, 'rgba(6, 10, 16, 0.72)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 1600, 900);

  context.strokeStyle = 'rgba(111, 166, 199, 0.035)';
  context.lineWidth = 1;
  for (let x = 0; x <= 1600; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 900);
    context.stroke();
  }
  for (let y = 0; y <= 900; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(1600, y);
    context.stroke();
  }

  context.fillStyle = 'rgba(126, 72, 108, 0.08)';
  context.font = 'bold 360px Georgia';
  context.fillText('♠', 35, 360);
  context.save();
  context.translate(1600, 900);
  context.rotate(Math.PI);
  context.fillText('♦', 35, 360);
  context.restore();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  mesh.position.z = -5;
  app.backdrop = mesh;
  app.scene.add(mesh);
}

// Cria cemitério, asilo e deck no centro da mesa.
function createCentralZones() {
  app.cemeteryGroup = createZonePanel(
    LANDSCAPE_ZONES.cemetery,
    null,
    0x18212c,
    0x516172,
    null
  );
  app.asylumGroup = createZonePanel(
    LANDSCAPE_ZONES.asylum,
    'ASILO',
    0x20232a,
    0xd8832d,
    'assets/img/cards/religion/asilo.png'
  );
  app.deckGroup = createZonePanel(
    LANDSCAPE_ZONES.deck,
    'BARALHO',
    0x172536,
    0x2ca8ee,
    null
  );

  app.asylumCountSprite = createTextSprite('0', {
    width: 0.36,
    height: 0.18,
    fontSize: 38,
    color: '#ffffff'
  });
  app.asylumCountSprite.position.set(0, -0.73, 1.4);
  app.asylumGroup.add(app.asylumCountSprite);
  addCircleControl(app.asylumGroup, -0.55, -0.72, '−', {
    type: 'asylum-coin',
    delta: -1
  });
  addCircleControl(app.asylumGroup, 0.55, -0.72, '+', {
    type: 'asylum-coin',
    delta: 1
  });

  createDeckStack();
}

// Cria um painel arredondado reutilizável para uma área central.
function createZonePanel(zone, label, color, borderColor, iconPath) {
  const group = new THREE.Group();
  group.position.set(zone.x, zone.y, 0);
  app.scene.add(group);

  const shadow = createRoundedMesh(zone.width, zone.height, 0.14, 0x05080d, 0.7);
  shadow.position.set(0.08, -0.1, -0.1);
  group.add(shadow);

  const border = createRoundedMesh(zone.width, zone.height, 0.14, borderColor, 1);
  border.position.z = 0;
  group.add(border);

  const panel = createRoundedMesh(zone.width - 0.08, zone.height - 0.08, 0.12, color, 1);
  panel.position.z = 0.1;
  group.add(panel);
  group.userData.panelParts = { shadow, border, panel };

  if (label) {
    const title = createTextSprite(label, {
      width: Math.min(zone.width - 0.3, 2.5),
      height: 0.18,
      fontSize: 29,
      color: '#c3ccd7'
    });
    title.position.set(0, zone.height / 2 - 0.28, 1);
    group.add(title);
  }

  if (iconPath) {
    const iconTexture = loadTexture(iconPath);
    const iconMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      color: 0xffffff,
      transparent: true,
      depthTest: false
    });
    const icon = new THREE.Sprite(iconMaterial);
    const isCard = iconPath.includes('/cards/');
    icon.scale.set(isCard ? 0.84 : 0.54, isCard ? 0.84 : 0.54, 1);
    icon.position.set(0, 0.08, 1.1);
    group.add(icon);
  }

  return group;
}

// Cria a pilha visual do deck e sua área clicável.
function createDeckStack() {
  const stack = new THREE.Group();
  stack.position.set(0, -0.06, 1.2);
  app.deckGroup.add(stack);

  for (let index = 0; index < 5; index += 1) {
    const layer = createCardFaceMesh('assets/img/cards/base/back.png');
    layer.position.set(index * 0.035 - 0.07, index * 0.028 - 0.056, index * 0.03);
    layer.scale.set(0.94, 0.94, 1);
    stack.add(layer);
  }

  const hitbox = createHitbox(CARD_WIDTH * 1.12, CARD_HEIGHT * 1.08, {
    type: 'draw-card'
  });
  hitbox.position.set(0, -0.04, 2);
  app.deckGroup.add(hitbox);
  app.interactives.push(hitbox);

  app.deckCountSprite = createTextSprite('0', {
    width: 0.9,
    height: 0.28,
    fontSize: 54,
    color: '#ffffff'
  });
  app.deckCountSprite.position.set(0.64, -0.72, 1.5);
  app.deckGroup.add(app.deckCountSprite);
}

// Cria os oito slots de jogador ao redor da área central.
function createPlayerSlots() {
  LANDSCAPE_SLOT_LAYOUT.forEach((layout) => {
    const group = new THREE.Group();
    group.position.set(layout.x, layout.y, 0);
    app.scene.add(group);

    const shadow = createRoundedMesh(SLOT_WIDTH, SLOT_HEIGHT, 0.16, 0x03070c, 0.68);
    shadow.position.set(0.08, -0.09, -0.1);
    group.add(shadow);

    const border = createRoundedMesh(SLOT_WIDTH, SLOT_HEIGHT, 0.16, 0x3b4655, 1);
    group.add(border);

    const panel = createRoundedMesh(SLOT_WIDTH - 0.08, SLOT_HEIGHT - 0.08, 0.14, 0x151e29, 1);
    panel.position.z = 0.1;
    group.add(panel);

    const slot = {
      seat: layout.seat,
      group,
      border,
      panel,
      shadow,
      nameSprite: createTextSprite('', {
        width: 1.72,
        height: 0.22,
        fontSize: 31,
        color: '#eef6ff',
        align: 'center'
      }),
      coinSprite: createTextSprite('0', {
        width: 0.28,
        height: 0.2,
        fontSize: 42,
        color: '#ffffff'
      }),
      religionMesh: null,
      religionBorder: null,
      avatarSprite: null,
      avatarKey: null,
      playerHitbox: null
    };

    slot.nameSprite.position.set(0.04, 0.69, 1.2);
    slot.coinSprite.position.set(0, 0.22, 1.2);
    slot.religionBorder = new THREE.Mesh(
      new THREE.CircleGeometry(SLOT_RELIGION_SIZE / 2, 32),
      new THREE.MeshBasicMaterial({ color: 0x2ca8ee })
    );
    slot.religionBorder.position.set(1.035, 0.68, 1.3);
    slot.religionMesh = new THREE.Mesh(
      new THREE.CircleGeometry(SLOT_RELIGION_SIZE / 2 - 0.012, 32),
      new THREE.MeshBasicMaterial({
        map: loadTexture('assets/img/cards/religion/catolico-quadrado.png'),
        color: 0xffffff,
        transparent: true
      })
    );
    slot.religionMesh.position.set(1.035, 0.68, 1.5);
    group.add(slot.religionBorder, slot.religionMesh);
    group.add(slot.nameSprite, slot.coinSprite);

    addCircleControl(group, -0.42, 0.22, '−', {
      type: 'player-coin',
      seat: layout.seat,
      delta: -1
    });
    addCircleControl(group, 0.42, 0.22, '+', {
      type: 'player-coin',
      seat: layout.seat,
      delta: 1
    });

    const religionHitbox = createHitbox(0.46, 0.46, {
      type: 'toggle-religion',
      seat: layout.seat
    });
    religionHitbox.position.set(1.035, 0.68, 2);
    group.add(religionHitbox);
    app.interactives.push(religionHitbox);

    const playerHitbox = createHitbox(SLOT_WIDTH - 0.15, 0.62, {
      type: 'open-player',
      seat: layout.seat
    });
    playerHitbox.position.set(0, 0.7, 1.8);
    group.add(playerHitbox);
    app.interactives.push(playerHitbox);
    slot.playerHitbox = playerHitbox;

    app.slots.set(layout.seat, slot);
    refreshPlayerSlot(layout.seat);
  });
}

// Adiciona um controle circular renderizado dentro do canvas.
function addCircleControl(parent, x, y, label, action, radius = COIN_CONTROL_RADIUS) {
  const circle = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color: 0xf4bd00 })
  );
  circle.position.set(x, y, 1.4);
  parent.add(circle);

  const text = createTextSprite(label, {
    width: radius * 1.6,
    height: radius * 1.6,
    fontSize: 82,
    color: '#17202a',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 900
  });
  text.position.set(x, y - 0.005, 1.7);
  parent.add(text);

  const hitboxSize = Math.max(radius * 2.3, 0.34);
  const hitbox = createHitbox(hitboxSize, hitboxSize, action);
  hitbox.position.set(x, y, 2);
  parent.add(hitbox);
  app.interactives.push(hitbox);
}

// Atualiza os textos, cores e avatar de um slot.
function refreshPlayerSlot(seat) {
  const slot = app.slots.get(seat);
  const player = state.players[seat - 1];
  if (!slot || !player) return;

  const isLocal = seat === getLocalPlayerSeat();
  const isObserved = seat === app.observedSeat;
  const borderColor = isLocal
    ? 0x28a9f3
    : isObserved
      ? 0xf1bd3c
      : player.isReserved
        ? 0x465364
        : 0x2d3744;
  slot.border.material.color.setHex(borderColor);
  slot.panel.material.color.setHex(player.isReserved ? 0x172330 : 0x121a24);

  updateTextSprite(slot.nameSprite, truncateLabel(player.name || `Jogador ${seat}`, 19));
  updateTextSprite(slot.coinSprite, String(player.coinCount || 0));
  const religion = getPlayerReligion(seat);
  slot.religionMesh.material.map = loadTexture(
    `assets/img/cards/religion/${religion}-quadrado.png`
  );
  slot.religionMesh.material.needsUpdate = true;

  const avatarKey = `${player.avatarUrl || ''}|${player.name || ''}|${player.isReserved}`;
  if (slot.avatarKey !== avatarKey) {
    slot.avatarKey = avatarKey;
    if (slot.avatarSprite) {
      slot.group.remove(slot.avatarSprite);
      disposeSprite(slot.avatarSprite);
    }
    slot.avatarSprite = createAvatarSprite(player);
    slot.avatarSprite.position.set(-0.995, 0.68, 1.5);
    slot.group.add(slot.avatarSprite);
  }
}

// Cria um avatar circular e tenta substituir as iniciais pela foto remota.
function createAvatarSprite(player) {
  const avatarCanvas = document.createElement('canvas');
  avatarCanvas.width = 512;
  avatarCanvas.height = 512;
  const context = avatarCanvas.getContext('2d');
  drawAvatarFallback(context, player);

  const texture = new THREE.CanvasTexture(avatarCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  }));
  sprite.scale.set(SLOT_AVATAR_SIZE, SLOT_AVATAR_SIZE, 1);

  if (player.avatarUrl) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      context.clearRect(0, 0, avatarCanvas.width, avatarCanvas.height);
      context.save();
      context.beginPath();
      context.arc(256, 256, 216, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, 40, 40, 432, 432);
      context.restore();
      context.strokeStyle = '#39aef4';
      context.lineWidth = 24;
      context.beginPath();
      context.arc(256, 256, 224, 0, Math.PI * 2);
      context.stroke();
      texture.needsUpdate = true;
    };
    image.src = player.avatarUrl;
  }

  return sprite;
}

// Desenha o fallback do avatar com as iniciais do jogador.
function drawAvatarFallback(context, player) {
  context.clearRect(0, 0, 512, 512);
  context.fillStyle = '#253445';
  context.beginPath();
  context.arc(256, 256, 224, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#39aef4';
  context.lineWidth = 24;
  context.stroke();
  context.fillStyle = '#f4f7fb';
  context.font = 'bold 148px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const label = getInitials(player.name || `Jogador ${player.id}`);
  context.fillText(label, 256, 264);
}

// Constrói o baralho configurado e embaralha as cartas localmente.
function buildDeck() {
  const deck = [];
  CARD_LIBRARY.forEach(({ type, folder }) => {
    const count = clampDeckCopyCount(state.deckConfig[type]);
    for (let copy = 0; copy < count; copy += 1) {
      deck.push({
        id: createEntityId('card'),
        type,
        folder,
        faceUp: false,
        owner: null,
        location: 'deck',
        rotation: 0
      });
    }
  });
  state.deck = shuffle(deck);
}

// Restaura o estado inicial sem publicar antes de o boot online estar pronto.
function resetLocalGame() {
  clearCardVisuals();
  state.players.forEach((player) => {
    player.coinCount = 0;
    player.cards = [];
  });
  state.tableCards = [];
  state.objects = createDefaultObjects();
  buildDeck();
  refreshBoard();
}

// Reseta o jogo e publica o novo estado quando o host confirma a ação.
function resetGame() {
  if (!app.isAdmin) return;
  dom.resetVfxAudio?.play().catch(() => {});
  resetLocalGame();
  scheduleTableSync();
}

// Cria uma carta visual com frente, verso, sombra e contorno.
function createCardVisual(data) {
  const group = new THREE.Group();
  group.userData.cardId = data.id;

  const shadow = createRoundedMesh(CARD_WIDTH * 1.04, CARD_HEIGHT * 1.04, 0.075, 0x020305, 0.7);
  shadow.position.set(0.045, -0.055, -0.06);
  group.add(shadow);

  const outline = createRoundedMesh(CARD_WIDTH * 1.09, CARD_HEIGHT * 1.07, 0.075, 0x42b9ff, 1);
  outline.position.z = -0.035;
  outline.visible = false;
  group.add(outline);

  const front = createCardFaceMesh(getCardTexturePath(data));
  front.position.z = 0.02;
  group.add(front);

  const back = createCardFaceMesh('assets/img/cards/base/back.png');
  back.position.z = -0.02;
  back.rotation.y = Math.PI;
  group.add(back);

  const visual = {
    id: data.id,
    data,
    group,
    front,
    back,
    outline,
    targetPosition: new THREE.Vector3(),
    targetRotation: Number(data.rotation) || 0,
    targetFlip: shouldDisplayCardFace(data) ? 0 : Math.PI,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    targetScale: 1,
    motion: null
  };

  front.userData.cardId = data.id;
  back.userData.cardId = data.id;
  app.cards.set(data.id, visual);
  app.interactives.push(front, back);
  app.scene.add(group);
  return visual;
}

// Retorna a textura frontal correspondente aos dados da carta.
function getCardTexturePath(data) {
  return `assets/img/cards/${data.folder || 'base'}/${data.type}.png`;
}

// Cria uma face de carta com UVs previsiveis para exibir a textura completa.
function createCardFaceMesh(path) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
    new THREE.MeshBasicMaterial({
      map: loadTexture(path),
      color: 0xffffff,
      transparent: true,
      side: THREE.FrontSide
    })
  );
}

// Define se a frente pode ser vista pelo cliente atual.
function shouldDisplayCardFace(data) {
  if (!data.faceUp) return false;
  if (!data.owner) return true;
  return Number(data.owner) === Number(getObservedSeat());
}

// Atualiza a orientação visual depois de flip, espectador ou troca de dono.
function refreshCardFace(visual) {
  visual.targetFlip = shouldDisplayCardFace(visual.data) ? 0 : Math.PI;
}

// Recalcula o destino de todas as cartas nas mãos e no cemitério.
function layoutAllCards() {
  state.players.forEach((player) => {
    const cards = player.cards
      .map(data => app.cards.get(data.id))
      .filter(Boolean);
    cards.forEach((visual, index) => {
      layoutPlayerCard(visual, player.id, index, cards.length);
    });
  });

  const tableVisuals = state.tableCards
    .map(data => app.cards.get(data.id))
    .filter(Boolean);
  tableVisuals.forEach((visual, index) => {
    layoutCemeteryCard(visual, index, tableVisuals.length);
  });
}

// Posiciona uma carta dentro do slot de um jogador.
function layoutPlayerCard(visual, seat, index, count) {
  if (app.draggedCard === visual) return;
  const slot = app.slots.get(seat);
  if (!slot) return;
  const visibleCount = Math.min(count, 6);
  const spacing = visibleCount <= 3 ? 0.72 : Math.max(0.31, 2.25 / Math.max(visibleCount - 1, 1));
  const center = (count - 1) / 2;
  const offset = (index - center) * spacing;
  visual.targetPosition.set(
    slot.group.position.x + offset,
    slot.group.position.y - 0.36,
    2 + index * 0.015
  );
  visual.targetRotation = THREE.MathUtils.clamp(offset * -0.045, -0.13, 0.13);
  visual.data.rotation = visual.targetRotation;
}

// Posiciona uma carta pública dentro do cemitério.
function layoutCemeteryCard(visual, index, count) {
  if (app.draggedCard === visual) return;
  const zone = getZone('cemetery');
  const minX = zone.x - zone.width / 2 + 0.42;
  const maxX = zone.x + zone.width / 2 - 0.42;
  const minY = zone.y - zone.height / 2 + 0.36;
  const maxY = zone.y + zone.height / 2 - 0.36;
  const saved = visual.data.boardPosition;
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    visual.targetPosition.set(
      THREE.MathUtils.clamp(saved.x, minX, maxX),
      THREE.MathUtils.clamp(saved.y, minY, maxY),
      2 + index * 0.015
    );
  } else {
    const availableWidth = Math.max(zone.width - 0.9, 0.8);
    const spacing = count <= 4
      ? Math.min(0.9, availableWidth / Math.max(count, 1))
      : Math.max(0.28, availableWidth / Math.max(count - 1, 1));
    const x = zone.x + (index - (count - 1) / 2) * spacing;
    const y = zone.y - 0.06;
    visual.data.boardPosition = { x, y };
    visual.targetPosition.set(x, y, 2 + index * 0.015);
  }
  visual.targetRotation = Number(visual.data.rotation) || 0;
}

// Compra uma carta para um jogador usando a reserva atômica da sala quando disponível.
async function drawCardToPlayer(seat = getLocalPlayerSeat(), options = {}) {
  if (state.deck.length === 0) return null;
  const onlineDraw = window.CoupMaster3DOnline?.drawCard;
  const drawActionId = createEntityId('draw');

  if (onlineDraw && options.authoritative !== false) {
    const result = await onlineDraw(seat, drawActionId);
    if (!result?.card || !result.tableState) return null;
    applyTableState(result.tableState);
    const visual = app.cards.get(result.card.id);
    animateCardFromDeck(visual);
    publishTableAction('draw-card', { cardId: result.card.id, playerId: seat });
    return visual;
  }

  const data = state.deck.pop();
  if (!data) return null;
  data.owner = seat;
  data.location = `player-${seat}`;
  data.faceUp = true;
  const visual = createCardVisual(data);
  rebuildLogicalCollections();
  layoutAllCards();
  animateCardFromDeck(visual);
  scheduleTableSync();
  return visual;
}

// Distribui duas cartas para cada assento ocupado.
// Anima uma carta saindo da posição do baralho até seu destino.
function animateCardFromDeck(visual) {
  if (!visual) return;
  const end = visual.targetPosition.clone();
  const deckZone = getZone('deck');
  visual.group.position.set(deckZone.x, deckZone.y, 3);
  visual.motion = {
    start: visual.group.position.clone(),
    end,
    progress: 0
  };
  playVfx('card-whoosh');
}

// Retorna uma carta fechada ao deck.
function returnCardToDeck(visual) {
  if (!visual || visual.data.faceUp) {
    showTooltipMessage('Vire a carta antes de devolvê-la ao baralho.');
    layoutAllCards();
    return;
  }
  removeCardVisual(visual);
  const data = { ...visual.data, owner: null, location: 'deck', boardPosition: null };
  state.deck.push(data);
  shuffle(state.deck);
  rebuildLogicalCollections();
  refreshBoard();
  scheduleTableSync();
  playVfx('card-whoosh');
}

// Move uma carta para o slot ou cemitério correspondente ao ponto de soltura.
function finishCardDrop(visual, point) {
  const slot = findSlotAtPoint(point);
  if (slot) {
    visual.data.owner = slot.seat;
    visual.data.location = `player-${slot.seat}`;
    visual.data.faceUp = true;
    visual.data.boardPosition = null;
    refreshCardFace(visual);
    rebuildLogicalCollections();
    layoutAllCards();
    scheduleTableSync();
    return;
  }

  const cemeteryZone = getZone('cemetery');
  if (pointInZone(point, cemeteryZone)) {
    visual.data.owner = null;
    visual.data.location = 'table';
    visual.data.faceUp = true;
    visual.data.boardPosition = {
      x: THREE.MathUtils.clamp(
        point.x,
        cemeteryZone.x - cemeteryZone.width / 2 + 0.42,
        cemeteryZone.x + cemeteryZone.width / 2 - 0.42
      ),
      y: THREE.MathUtils.clamp(
        point.y,
        cemeteryZone.y - cemeteryZone.height / 2 + 0.36,
        cemeteryZone.y + cemeteryZone.height / 2 - 0.36
      )
    };
    refreshCardFace(visual);
    rebuildLogicalCollections();
    layoutAllCards();
    scheduleTableSync();
    return;
  }

  if (pointInZone(point, getZone('deck'))) {
    returnCardToDeck(visual);
    return;
  }

  layoutAllCards();
}

// Vira a carta selecionada com uma transição curta.
function flipSelectedCard() {
  if (!app.selectedCard) return;
  app.selectedCard.data.faceUp = !app.selectedCard.data.faceUp;
  refreshCardFace(app.selectedCard);
  scheduleTableSync();
  playVfx('card-whoosh');
}

// Remove a carta da cena, do raycast e do mapa visual.
function removeCardVisual(visual) {
  if (!visual) return;
  app.scene.remove(visual.group);
  app.interactives = app.interactives.filter(item => item.parent !== visual.group);
  visual.group.traverse(disposeObject3D);
  app.cards.delete(visual.id);
  if (app.selectedCard === visual) app.selectedCard = null;
  if (app.hoveredCard === visual) app.hoveredCard = null;
}

// Recria as coleções lógicas de mãos e cemitério a partir das cartas visuais.
function rebuildLogicalCollections() {
  state.players.forEach(player => {
    player.cards = [];
  });
  state.tableCards = [];

  app.cards.forEach((visual) => {
    const data = visual.data;
    if (data.owner) {
      state.players[Number(data.owner) - 1]?.cards.push(data);
    } else if (data.location === 'table') {
      state.tableCards.push(data);
    }
  });
  updateHud();
}

// Atualiza contadores, slots e posicionamento das cartas.
function refreshBoard() {
  state.players.forEach(player => refreshPlayerSlot(player.id));
  refreshCardFaces();
  layoutAllCards();
  updateHud();
}

// Reavalia quais frentes de carta podem ser vistas.
function refreshCardFaces() {
  app.cards.forEach(refreshCardFace);
}

// Conecta pointer events para hover, tilt, clique e arraste em mouse ou toque.
function setupPointerEvents() {
  dom.canvas.addEventListener('pointerdown', onPointerDown);
  dom.canvas.addEventListener('pointermove', onPointerMove);
  dom.canvas.addEventListener('pointerup', onPointerUp);
  dom.canvas.addEventListener('pointercancel', onPointerUp);
  dom.canvas.addEventListener('pointerleave', clearHover);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
}

// Inicia uma ação ou o arraste de uma carta sob o ponteiro.
function onPointerDown(event) {
  if (event.button !== 0 || isAnyModalOpen()) return;
  setPointer(event);
  const intersection = getFirstIntersection();
  if (!intersection) {
    selectCard(null);
    return;
  }

  const visual = getCardFromObject(intersection.object);
  if (visual) {
    selectCard(visual);
    app.draggedCard = visual;
    app.pointerDown.set(event.clientX, event.clientY);
    app.hasDragged = false;
    const point = rayToBoard();
    if (point) app.dragOffset.copy(visual.group.position).sub(point);
    visual.group.position.z = 6;
    dom.canvas.setPointerCapture?.(event.pointerId);
    return;
  }

  app.pressedAction = intersection.object.userData.action || null;
  app.pointerDown.set(event.clientX, event.clientY);
}

// Atualiza o tilt da carta em hover ou a posição da carta arrastada.
function onPointerMove(event) {
  setPointer(event);

  if (app.draggedCard) {
    const distance = app.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (distance > CARD_DRAG_THRESHOLD) app.hasDragged = true;
    const point = rayToBoard();
    if (!point) return;
    app.draggedCard.group.position.set(
      THREE.MathUtils.clamp(point.x + app.dragOffset.x, -7.45, 7.45),
      THREE.MathUtils.clamp(point.y + app.dragOffset.y, -4.12, 4.12),
      6
    );
    app.draggedCard.targetTiltX = 0;
    app.draggedCard.targetTiltY = 0;
    return;
  }

  const intersection = getFirstIntersection();
  const visual = intersection ? getCardFromObject(intersection.object) : null;
  setHoveredCard(visual, intersection, event);
  dom.canvas.style.cursor = intersection ? (visual ? 'grab' : 'pointer') : 'default';
}

// Finaliza o arraste ou executa a ação clicada.
function onPointerUp(event) {
  if (app.draggedCard) {
    const visual = app.draggedCard;
    app.draggedCard = null;
    dom.canvas.releasePointerCapture?.(event.pointerId);
    const point = rayToBoard();
    if (app.hasDragged && point) {
      finishCardDrop(visual, point);
      playVfx('card-whoosh');
    } else {
      layoutAllCards();
    }
    app.hasDragged = false;
    return;
  }

  if (app.pressedAction) {
    const action = app.pressedAction;
    app.pressedAction = null;
    executeBoardAction(action);
  }
}

// Executa controles integrados ao canvas.
function executeBoardAction(action) {
  if (!action?.type) return;
  if (action.type === 'draw-card') drawCardToPlayer(getLocalPlayerSeat());
  if (action.type === 'player-coin') adjustPlayerCoinCount(action.seat, action.delta);
  if (action.type === 'asylum-coin') adjustAsylumCoinCount(action.delta);
  if (action.type === 'toggle-religion') togglePlayerReligion(action.seat);
  if (action.type === 'open-player') openPlayerInfoModal(action.seat);
}

// Mantém seleção e destaque visual sincronizados.
function selectCard(visual) {
  if (app.selectedCard) app.selectedCard.outline.visible = false;
  app.selectedCard = visual;
  if (visual) visual.outline.visible = true;
}

// Define a carta em hover e calcula a inclinação pela posição interna do ponteiro.
function setHoveredCard(visual, intersection, event) {
  if (app.hoveredCard && app.hoveredCard !== visual) {
    app.hoveredCard.targetTiltX = 0;
    app.hoveredCard.targetTiltY = 0;
    app.hoveredCard.targetScale = 1;
  }
  app.hoveredCard = visual;
  if (!visual || !intersection) {
    hideTooltip();
    return;
  }

  const local = visual.group.worldToLocal(intersection.point.clone());
  visual.targetTiltX = THREE.MathUtils.clamp(-local.y / CARD_HEIGHT * 0.22, -0.13, 0.13);
  visual.targetTiltY = THREE.MathUtils.clamp(local.x / CARD_WIDTH * 0.28, -0.16, 0.16);
  visual.targetScale = 1.08;
  showTooltip(CARD_LABELS[visual.data.type] || visual.data.type, event.clientX, event.clientY);
}

// Limpa o hover quando o ponteiro deixa o canvas.
function clearHover() {
  if (app.hoveredCard) {
    app.hoveredCard.targetTiltX = 0;
    app.hoveredCard.targetTiltY = 0;
    app.hoveredCard.targetScale = 1;
  }
  app.hoveredCard = null;
  hideTooltip();
}

// Converte o ponteiro em coordenadas normalizadas do raycaster.
function setPointer(event) {
  const rect = dom.canvas.getBoundingClientRect();
  app.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  app.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  app.raycaster.setFromCamera(app.pointer, app.camera);
}

// Retorna o primeiro item interativo sob o ponteiro.
function getFirstIntersection() {
  return app.raycaster.intersectObjects(app.interactives, false)[0] || null;
}

// Encontra a carta associada a uma face intersectada.
function getCardFromObject(object) {
  const cardId = object?.userData?.cardId;
  return cardId ? app.cards.get(cardId) || null : null;
}

// Projeta o raycaster sobre o plano 2D da mesa.
function rayToBoard() {
  return app.raycaster.ray.intersectPlane(app.dragPlane, app.pointerWorld)
    ? app.pointerWorld.clone()
    : null;
}

// Encontra um slot que contenha o ponto de soltura.
function findSlotAtPoint(point) {
  const dimensions = getSlotDimensions();
  return getSlotLayout().find(layout => (
    Math.abs(point.x - layout.x) <= dimensions.width / 2
    && Math.abs(point.y - layout.y) <= dimensions.height / 2
  )) || null;
}

// Verifica se um ponto está dentro de uma área retangular.
function pointInZone(point, zone) {
  return Math.abs(point.x - zone.x) <= zone.width / 2
    && Math.abs(point.y - zone.y) <= zone.height / 2;
}

// Trata atalhos simples que continuam úteis no novo tabuleiro.
function onKeyDown(event) {
  if (isAnyModalOpen()) {
    if (event.key === 'Escape') closeAllModals();
    return;
  }
  if (event.key.toLowerCase() === 'c') openChatModal();
  if (event.key.toLowerCase() === 'f') flipSelectedCard();
}

// Atualiza animações suaves e renderiza a cena.
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(app.clock.getDelta(), 0.05);
  updateCardAnimations(delta);
  app.renderer.render(app.scene, app.camera);
}

// Interpola movimento, elevação, inclinação e flip das cartas.
function updateCardAnimations(delta) {
  const smoothing = 1 - Math.pow(0.001, delta);
  app.cards.forEach((visual) => {
    if (visual.motion) {
      visual.motion.progress = Math.min(1, visual.motion.progress + delta * 3.2);
      const t = easeOutCubic(visual.motion.progress);
      visual.group.position.lerpVectors(visual.motion.start, visual.motion.end, t);
      visual.group.position.z += Math.sin(t * Math.PI) * 1.1;
      if (visual.motion.progress >= 1) visual.motion = null;
    } else if (app.draggedCard !== visual) {
      visual.group.position.lerp(visual.targetPosition, smoothing);
    }

    visual.tiltX = THREE.MathUtils.lerp(visual.tiltX, visual.targetTiltX, smoothing);
    visual.tiltY = THREE.MathUtils.lerp(visual.tiltY, visual.targetTiltY, smoothing);
    visual.group.rotation.x = visual.tiltX;
    visual.group.rotation.y = THREE.MathUtils.lerp(
      visual.group.rotation.y,
      visual.targetFlip + visual.tiltY,
      smoothing
    );
    visual.group.rotation.z = THREE.MathUtils.lerp(
      visual.group.rotation.z,
      visual.targetRotation,
      smoothing
    );
    const selectedScale = app.selectedCard === visual ? 1.045 : 1;
    const scale = Math.max(visual.targetScale, selectedScale);
    visual.group.scale.lerp(new THREE.Vector3(scale, scale, 1), smoothing);
    visual.outline.visible = app.selectedCard === visual || app.hoveredCard === visual;
  });
}

// Ajusta câmera ortográfica e renderer sem alterar a proporção do tabuleiro.
function resize() {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const viewportAspect = width / height;
  const usePortraitLayout = viewportAspect < 0.75;
  if (app.isPortraitLayout !== usePortraitLayout) {
    app.isPortraitLayout = usePortraitLayout;
    applyBoardLayout();
  }
  const boardWidth = app.isPortraitLayout ? 9 : BOARD_WIDTH;
  const boardHeight = app.isPortraitLayout ? 16 : BOARD_HEIGHT;
  const boardAspect = boardWidth / boardHeight;

  if (viewportAspect >= boardAspect) {
    const viewWidth = boardHeight * viewportAspect;
    app.camera.left = -viewWidth / 2;
    app.camera.right = viewWidth / 2;
    app.camera.top = boardHeight / 2;
    app.camera.bottom = -boardHeight / 2;
  } else {
    const viewHeight = boardWidth / viewportAspect;
    app.camera.left = -boardWidth / 2;
    app.camera.right = boardWidth / 2;
    app.camera.top = viewHeight / 2;
    app.camera.bottom = -viewHeight / 2;
  }

  app.camera.updateProjectionMatrix();
  app.renderer.setSize(width, height, false);
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}

// Reposiciona slots e áreas centrais ao alternar entre paisagem e retrato.
function applyBoardLayout() {
  const slotDimensions = getSlotDimensions();
  getSlotLayout().forEach((layout) => {
    const slot = app.slots.get(layout.seat);
    if (!slot) return;
    slot.group.position.set(layout.x, layout.y, 0);
    slot.group.scale.set(1, 1, 1);
    const scaleX = slotDimensions.width / SLOT_WIDTH;
    const scaleY = slotDimensions.height / SLOT_HEIGHT;
    slot.shadow.scale.set(scaleX, scaleY, 1);
    slot.border.scale.set(scaleX, scaleY, 1);
    slot.panel.scale.set(scaleX, scaleY, 1);
    slot.playerHitbox?.scale.set(scaleX, 1, 1);
  });

  const zoneGroups = {
    asylum: app.asylumGroup,
    cemetery: app.cemeteryGroup,
    deck: app.deckGroup
  };
  Object.entries(zoneGroups).forEach(([name, group]) => {
    if (!group) return;
    const current = getZone(name);
    const base = LANDSCAPE_ZONES[name];
    group.position.set(current.x, current.y, 0);
    group.scale.set(1, 1, 1);
    const scaleX = current.width / base.width;
    const scaleY = current.height / base.height;
    const parts = group.userData.panelParts;
    parts?.shadow?.scale.set(scaleX, scaleY, 1);
    parts?.border?.scale.set(scaleX, scaleY, 1);
    parts?.panel?.scale.set(scaleX, scaleY, 1);
  });

  if (app.backdrop) {
    app.backdrop.scale.set(
      app.isPortraitLayout ? 9 / BOARD_WIDTH : 1,
      app.isPortraitLayout ? 16 / BOARD_HEIGHT : 1,
      1
    );
  }
  layoutAllCards();
}

// Ajusta o contador manual de moedas de um jogador.
function adjustPlayerCoinCount(seat, delta) {
  const player = state.players[Number(seat) - 1];
  if (!player) return;
  player.coinCount = THREE.MathUtils.clamp((Number(player.coinCount) || 0) + delta, 0, 99);
  refreshPlayerSlot(player.id);
  playVfx('falling-coin');
  scheduleTableSync();
}

// Ajusta o contador compartilhado do asilo.
function adjustAsylumCoinCount(delta) {
  const counter = getStateObject('asylum-counter');
  counter.value = THREE.MathUtils.clamp((Number(counter.value) || 0) + delta, 0, 99);
  updateHud();
  playVfx('falling-coin');
  scheduleTableSync();
}

// Alterna o emblema religioso entre católico e protestante.
function togglePlayerReligion(seat) {
  const religion = getStateObject(`religion-${seat}`);
  religion.value = religion.value === 'protestante' ? 'catolico' : 'protestante';
  refreshPlayerSlot(Number(seat));
  scheduleTableSync();
}

// Retorna a religião salva para um assento.
function getPlayerReligion(seat) {
  return getStateObject(`religion-${seat}`).value || 'catolico';
}

// Retorna um objeto persistente, criando seu fallback quando necessário.
function getStateObject(id) {
  let object = state.objects.find(item => item.id === id);
  if (!object) {
    object = id === 'asylum-counter'
      ? { id, kind: 'asylum-counter', value: 0 }
      : { id, kind: 'religion-state', value: 'catolico' };
    state.objects.push(object);
  }
  return object;
}

// Atualiza os contadores do HUD e das áreas centrais.
function updateHud() {
  const asylumCount = Number(getStateObject('asylum-counter').value) || 0;
  dom.deckCountEl.textContent = `Deck: ${state.deck.length}`;
  dom.tableCountEl.textContent = `Cemitério: ${state.tableCards.length}`;
  dom.objectCountEl.textContent = `Asilo: ${asylumCount}`;
  updateTextSprite(app.deckCountSprite, String(state.deck.length));
  updateTextSprite(app.asylumCountSprite, String(asylumCount));
  updateRoomCodeStatus();
}

// Serializa o estado lógico usando o contrato já aceito pelo Firebase.
function getTableState() {
  return {
    version: 2,
    deckConfig: { ...state.deckConfig },
    deck: state.deck.map(cloneValue),
    deckTransform: null,
    objectId: app.entityCounter,
    stackId: 1,
    players: state.players.map(player => ({
      id: player.id,
      coinCount: Number(player.coinCount) || 0,
      cards: player.cards.map(cloneValue)
    })),
    cards: [...app.cards.values()].map(visual => ({
      data: cloneValue(visual.data),
      position: {
        x: visual.group.position.x,
        y: visual.group.position.y,
        z: visual.group.position.z
      },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }
    })),
    objects: state.objects.map(cloneValue),
    stacks: []
  };
}

// Aplica um snapshot remoto e reconstrói apenas os elementos visuais necessários.
function applyTableState(snapshot) {
  if (!snapshot || Number(snapshot.version) < 1) return;
  app.isApplyingRemoteState = true;

  state.deckConfig = { ...DEFAULT_DECK_CONFIG, ...(snapshot.deckConfig || {}) };
  state.deck = Array.isArray(snapshot.deck) ? snapshot.deck.map(cloneValue) : [];
  state.objects = Array.isArray(snapshot.objects)
    ? snapshot.objects
      .filter(object => ['asylum-counter', 'religion-state'].includes(object?.kind))
      .map(cloneValue)
    : [];
  app.entityCounter = Math.max(Number(snapshot.objectId) || 1, app.entityCounter);

  state.players.forEach((player) => {
    player.coinCount = 0;
    player.cards = [];
  });
  (snapshot.players || []).forEach((entry) => {
    const player = state.players[(Number(entry?.id) || 0) - 1];
    if (player) player.coinCount = THREE.MathUtils.clamp(Number(entry.coinCount) || 0, 0, 99);
  });

  const incomingCards = new Map();
  (snapshot.cards || []).forEach((entry) => {
    const data = cloneValue(entry?.data);
    const isKnownCard = CARD_LIBRARY.some(card => card.type === data?.type);
    if (!data?.id || data.location === 'deck' || !isKnownCard) return;
    const current = app.cards.get(data.id);
    if (
      data.location === 'table'
      && !data.boardPosition
      && current?.data?.boardPosition
    ) {
      data.boardPosition = cloneValue(current.data.boardPosition);
    } else if (
      data.location === 'table'
      && !data.boardPosition
      && Number.isFinite(entry?.position?.x)
      && Number.isFinite(entry?.position?.y)
    ) {
      data.boardPosition = {
        x: Number(entry.position.x),
        y: Number(entry.position.y)
      };
    }
    incomingCards.set(data.id, data);
  });

  [...app.cards.values()].forEach((visual) => {
    if (!incomingCards.has(visual.id)) removeCardVisual(visual);
  });
  incomingCards.forEach((data) => {
    const visual = app.cards.get(data.id);
    if (visual) {
      visual.data = data;
      visual.group.userData.cardId = data.id;
      refreshCardFace(visual);
    } else {
      createCardVisual(data);
    }
  });

  rebuildLogicalCollections();
  refreshBoard();
  syncDeckConfigInputs();
  app.lastAppliedTableState = cloneValue(snapshot);
  app.isApplyingRemoteState = false;
}

// Adia snapshots remotos durante um arraste local.
function receiveTableState(snapshot) {
  if (!snapshot) return;
  if (app.draggedCard || app.syncTimer) {
    app.pendingRemoteState = cloneValue(snapshot);
    return;
  }
  applyTableState(snapshot);
}

// Agenda a publicação do estado final após interações locais.
function scheduleTableSync() {
  if (app.isApplyingRemoteState || !window.CoupMaster3DOnline?.publishTableState) return;
  const generation = ++app.syncGeneration;
  window.clearTimeout(app.syncTimer);
  app.syncTimer = window.setTimeout(async () => {
    app.syncTimer = null;
    const localState = getTableState();
    try {
      const merged = await window.CoupMaster3DOnline.publishTableState(
        localState,
        app.lastAppliedTableState
      );
      if (generation === app.syncGeneration && merged) {
        app.lastAppliedTableState = cloneValue(merged);
      }
    } catch (error) {
      console.error('Falha ao publicar a mesa 2.5D.', error);
    }
    flushPendingRemoteState();
  }, SYNC_DELAY_MS);
}

// Aplica o snapshot remoto mais recente depois da operação local.
function flushPendingRemoteState() {
  if (!app.pendingRemoteState || app.draggedCard || app.syncTimer) return;
  const snapshot = app.pendingRemoteState;
  app.pendingRemoteState = null;
  applyTableState(snapshot);
}

// Publica uma ação visual discreta para os outros clientes.
function publishTableAction(type, payload = {}) {
  if (!window.CoupMaster3DOnline?.publishTableAction) return;
  window.CoupMaster3DOnline.publishTableAction({
    id: createEntityId('action'),
    type,
    createdAt: Date.now(),
    ...payload
  });
}

// Reproduz ações visuais recebidas sem repetir a mutação do estado.
function applyTableAction(action) {
  if (!action?.id || app.appliedTableActions.has(action.id)) return;
  app.appliedTableActions.add(action.id);
  if (action.type === 'draw-card') {
    window.setTimeout(() => animateCardFromDeck(app.cards.get(action.cardId)), 80);
  }
}

// Atualiza o assento local e os destaques privados.
function setLocalPlayerSeat(seat) {
  state.activePlayer = normalizeSeat(seat);
  state.viewPlayer = state.activePlayer;
  refreshBoard();
}

// Atualiza perfis online sem misturá-los ao snapshot da mesa.
function setOnlinePlayerProfiles(profiles = []) {
  const reservedSeats = new Set(profiles.map(profile => normalizeSeat(profile.seat)));
  profiles.forEach(profile => setPlayerProfile(profile.seat, profile));
  state.players.forEach((player) => {
    if (reservedSeats.has(player.id)) return;
    player.uid = null;
    player.isReserved = false;
    player.isOnline = false;
    player.name = `Jogador ${player.id}`;
    player.avatarUrl = null;
    refreshPlayerSlot(player.id);
  });
}

// Atualiza nome, avatar e presença de um jogador.
function setPlayerProfile(seat, profile = {}) {
  const player = state.players[normalizeSeat(seat) - 1];
  if (!player) return;
  player.uid = profile.uid || player.uid;
  player.name = profile.displayName || profile.name || player.name;
  player.avatarUrl = profile.photoURL || profile.avatarUrl || null;
  player.isReserved = Boolean(profile.uid || profile.isReserved);
  player.isOnline = profile.connected !== false;
  refreshPlayerSlot(player.id);
}

// Configura permissões visuais para o host.
function setAdminRole(isAdmin) {
  app.isAdmin = Boolean(isAdmin);
  dom.resetBtn.hidden = !app.isAdmin;
  dom.openDeckConfigBtn.disabled = !app.isAdmin;
  dom.applyDeckConfigBtn.disabled = !app.isAdmin;
  document.querySelectorAll('.preset-btn, .card-config-item input').forEach((element) => {
    element.disabled = !app.isAdmin;
  });
  const note = document.getElementById('deckConfigPermissionNote');
  if (note) note.hidden = app.isAdmin;
}

// Liga os botões DOM e os modais reaproveitados da interface anterior.
function setupUi() {
  dom.flipSelectionBtn?.addEventListener('click', flipSelectedCard);
  dom.resetBtn?.addEventListener('click', resetGame);
  dom.roomCodeStatusBtn?.addEventListener('click', copyRoomCodeFromHud);
  setupModalControls();
  setupChat();
  setupMusic();
  setAdminRole(app.isAdmin);
}

// Configura abertura, fechamento e conteúdo dos modais.
function setupModalControls() {
  dom.settingsBtn?.addEventListener('click', () => openModal(dom.settingsModal));
  dom.closeSettingsBtn?.addEventListener('click', () => closeModal(dom.settingsModal));
  dom.feedbackBtn?.addEventListener('click', () => openModal(dom.feedbackModal));
  dom.closeFeedbackBtn?.addEventListener('click', () => closeModal(dom.feedbackModal));
  dom.infoBtn?.addEventListener('click', openRuleCardsModal);
  dom.altRulesBtn?.addEventListener('click', openAltRulesModal);
  dom.spectatorBtn?.addEventListener('click', openSpectatorModal);
  dom.fullscreenBtn?.addEventListener('click', toggleFullscreen);
  dom.closeRuleCardsBtn?.addEventListener('click', () => closeModal(dom.ruleCardsModal));
  dom.closeAltRulesBtn?.addEventListener('click', () => closeModal(dom.altRulesModal));
  dom.closeSpectatorBtn?.addEventListener('click', () => closeModal(dom.spectatorModal));
  dom.closePlayerInfoBtn?.addEventListener('click', closePlayerInfoModal);
  dom.acceptSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('accepted'));
  dom.declineSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('declined'));
  dom.ruleFlipCard?.addEventListener('click', () => stepRuleCard(1));
  dom.altRuleFlipCard?.addEventListener('click', () => stepAltRuleCard(1));
  dom.openDeckConfigBtn?.addEventListener('click', () => {
    syncDeckConfigInputs();
    closeModal(dom.settingsModal);
    openModal(dom.configModal);
  });
  dom.closeConfigModalBtn?.addEventListener('click', () => closeModal(dom.configModal));
  dom.applyDeckConfigBtn?.addEventListener('click', () => {
    if (!app.isAdmin) return;
    state.deckConfig = readDeckConfigInputs();
    closeModal(dom.configModal);
    resetGame();
  });
  dom.removePlayerBtn?.addEventListener('click', showPlayerRemoveConfirmation);
  dom.cancelRemovePlayerBtn?.addEventListener('click', hidePlayerRemoveConfirmation);
  dom.confirmRemovePlayerBtn?.addEventListener('click', removeSelectedRoomPlayer);

  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.addEventListener('click', () => applyDeckPreset(button.dataset.preset));
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal(overlay);
    });
  });
}

// Configura chat textual e mensagens rápidas.
function setupChat() {
  dom.chatBtn?.addEventListener('click', openChatModal);
  dom.closeChatBtn?.addEventListener('click', () => closeModal(dom.chatModal));
  dom.chatForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = dom.chatInput.value.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
    if (!text || !window.CoupMaster3DOnline?.sendChatMessage) return;
    dom.chatInput.value = '';
    await window.CoupMaster3DOnline.sendChatMessage({ text, type: 'text' });
  });

  QUICK_CHAT_MESSAGES.forEach((message) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-quick-btn';
    button.textContent = message;
    button.addEventListener('click', () => {
      window.CoupMaster3DOnline?.sendChatMessage?.({ text: message, type: 'quick' });
    });
    dom.chatQuickMessages?.append(button);
  });
}

// Abre o chat e posiciona o foco no campo de texto.
function openChatModal() {
  openModal(dom.chatModal);
  dom.chatBtn?.classList.remove('chat-btn-has-unread');
  window.setTimeout(() => dom.chatInput?.focus(), 60);
}

// Recebe e renderiza mensagens sincronizadas da sala.
function setChatMessages(messages = []) {
  const previousCount = app.chatMessages.length;
  app.chatMessages = messages.slice(-60);
  renderChatMessages();
  if (app.chatMessagesInitialized
    && messages.length > previousCount
    && dom.chatModal?.style.display !== 'flex') {
    dom.chatBtn?.classList.add('chat-btn-has-unread');
  }
  app.chatMessagesInitialized = true;
}

// Renderiza a lista de mensagens do chat.
function renderChatMessages() {
  if (!dom.chatMessagesList) return;
  dom.chatMessagesList.innerHTML = '';
  if (app.chatMessages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chat-empty-message';
    empty.textContent = 'Nenhuma mensagem ainda.';
    dom.chatMessagesList.append(empty);
    return;
  }

  const localUid = window.CoupMaster3DOnline?.user?.uid;
  app.chatMessages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'chat-message';
    if (message.uid === localUid || message.actorUid === localUid) item.classList.add('is-own');
    if (message.type === 'quick') item.classList.add('is-quick');
    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';
    meta.textContent = `${message.displayName || message.actorName || 'Jogador'} · ${formatChatTime(message.createdAt)}`;
    const text = document.createElement('p');
    text.className = 'chat-message-text';
    text.textContent = message.text || '';
    item.append(meta, text);
    dom.chatMessagesList.append(item);
  });
  dom.chatMessagesList.scrollTop = dom.chatMessagesList.scrollHeight;
}

// Configura música, sliders e retomada após interação do usuário.
function setupMusic() {
  if (!dom.bgmAudio) return;
  dom.bgmAudio.volume = DEFAULT_MUSIC_VOLUME;
  if (dom.volumeSlider) dom.volumeSlider.value = String(DEFAULT_MUSIC_VOLUME);
  if (dom.vfxVolumeSlider) dom.vfxVolumeSlider.value = String(DEFAULT_VFX_VOLUME);

  dom.musicBtn?.addEventListener('click', () => {
    app.musicMuted = !app.musicMuted;
    dom.bgmAudio.muted = app.musicMuted;
    dom.musicBtn.classList.toggle('is-muted', app.musicMuted);
    dom.musicBtn.setAttribute('aria-pressed', String(app.musicMuted));
  });
  dom.volumeSlider?.addEventListener('input', () => {
    dom.bgmAudio.volume = clampAudioVolume(dom.volumeSlider.value, DEFAULT_MUSIC_VOLUME);
  });
  dom.vfxVolumeSlider?.addEventListener('input', () => {
    app.vfxVolume = clampAudioVolume(dom.vfxVolumeSlider.value, DEFAULT_VFX_VOLUME);
  });
  window.addEventListener('pointerdown', startBackgroundMusic, { once: true });
  window.addEventListener('keydown', startBackgroundMusic, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.resumeMusicWhenVisible = !dom.bgmAudio.paused;
      dom.bgmAudio.pause();
    } else if (app.resumeMusicWhenVisible) {
      dom.bgmAudio.play().catch(() => {});
    }
  });
}

// Inicia a trilha após a primeira interação permitida pelo navegador.
function startBackgroundMusic() {
  if (app.musicStarted || !dom.bgmAudio) return;
  app.musicStarted = true;
  dom.bgmAudio.play().catch(() => {});
}

// Reproduz efeitos sonoros reaproveitando instâncias em cache.
function playVfx(name) {
  const paths = {
    'card-whoosh': 'assets/sounds/vfx/card-whoosh.mp3',
    'falling-coin': 'assets/sounds/vfx/falling-coin.mp3'
  };
  if (!paths[name]) return;
  let audio = app.vfx.get(name);
  if (!audio) {
    audio = new Audio(paths[name]);
    app.vfx.set(name, audio);
  }
  audio.volume = app.vfxVolume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Abre o modal com dados e permissões do jogador selecionado.
function openPlayerInfoModal(seat) {
  const player = state.players[normalizeSeat(seat) - 1];
  if (!player) return;
  app.selectedRoomPlayer = player;
  dom.playerInfoName.textContent = player.name || `Jogador ${player.id}`;
  dom.playerInfoSeat.textContent = `P${player.id}`;
  dom.playerInfoStatus.textContent = player.isOnline ? 'Online' : 'Offline';
  dom.playerInfoRole.textContent = player.uid === window.CoupMaster3DOnline?.adminUid ? 'Host' : 'Jogador';
  const canRemove = app.isAdmin
    && player.uid
    && player.uid !== window.CoupMaster3DOnline?.user?.uid;
  dom.removePlayerBtn.hidden = !canRemove;
  dom.playerInfoNote.hidden = canRemove || player.isReserved;
  dom.playerInfoNote.textContent = player.isReserved ? '' : 'Este assento está livre.';
  hidePlayerRemoveConfirmation();
  openModal(dom.playerInfoModal);
}

// Fecha e limpa o modal de jogador.
function closePlayerInfoModal() {
  closeModal(dom.playerInfoModal);
  app.selectedRoomPlayer = null;
  hidePlayerRemoveConfirmation();
}

// Exibe a confirmação antes da remoção pelo host.
function showPlayerRemoveConfirmation() {
  if (!app.selectedRoomPlayer) return;
  dom.playerRemoveConfirm.hidden = false;
  dom.removePlayerBtn.hidden = true;
}

// Oculta a confirmação de remoção.
function hidePlayerRemoveConfirmation() {
  dom.playerRemoveConfirm.hidden = true;
  const player = app.selectedRoomPlayer;
  dom.removePlayerBtn.hidden = !(app.isAdmin
    && player?.uid
    && player.uid !== window.CoupMaster3DOnline?.user?.uid);
}

// Remove o jogador selecionado usando o serviço fornecido pelo boot.
async function removeSelectedRoomPlayer() {
  const player = app.selectedRoomPlayer;
  if (!player?.uid || !window.CoupMaster3DOnline?.removePlayerFromRoom) return;
  dom.confirmRemovePlayerBtn.disabled = true;
  try {
    await window.CoupMaster3DOnline.removePlayerFromRoom({
      uid: player.uid,
      seat: player.id
    });
    closePlayerInfoModal();
  } finally {
    dom.confirmRemovePlayerBtn.disabled = false;
  }
}

// Lista jogadores disponíveis para solicitação de espectador.
function openSpectatorModal() {
  dom.spectatorPlayerList.innerHTML = '';
  const localUid = window.CoupMaster3DOnline?.user?.uid;
  state.players
    .filter(player => player.uid && player.uid !== localUid)
    .forEach((player) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spectator-player-btn';
      button.innerHTML = `<span>${escapeHtml(player.name)}</span><small>P${player.id}</small>`;
      button.addEventListener('click', async () => {
        dom.spectatorStatusText.textContent = `Pedido enviado para ${player.name}.`;
        await window.CoupMaster3DOnline?.requestSpectate?.({
          uid: player.uid,
          seat: player.id,
          displayName: player.name
        });
      });
      dom.spectatorPlayerList.append(button);
    });
  dom.spectatorStatusText.textContent = dom.spectatorPlayerList.children.length
    ? 'Escolha um jogador.'
    : 'Nenhum outro jogador disponível.';
  openModal(dom.spectatorModal);
}

// Mostra um pedido de espectador recebido.
function showSpectatorRequest(request) {
  app.spectatorRequest = request;
  dom.spectatorRequestText.textContent = `${request.requesterName || 'Um jogador'} quer ver sua mão.`;
  openModal(dom.spectatorRequestModal);
}

// Responde ao pedido de espectador atual.
async function respondCurrentSpectatorRequest(status) {
  if (!app.spectatorRequest || !window.CoupMaster3DOnline?.respondSpectateRequest) return;
  await window.CoupMaster3DOnline.respondSpectateRequest(app.spectatorRequest.id, status);
  app.spectatorRequest = null;
  closeModal(dom.spectatorRequestModal);
}

// Passa a revelar a mão autorizada pelo jogador alvo.
function startSpectatingPlayer(request) {
  app.observedSeat = normalizeSeat(request.targetSeat);
  state.viewPlayer = app.observedSeat;
  refreshBoard();
  closeModal(dom.spectatorModal);
  showSpectatorResponse(`Você está observando P${app.observedSeat}.`);
}

// Exibe uma resposta curta no modal de espectador.
function showSpectatorResponse(message) {
  dom.spectatorStatusText.textContent = message;
  openModal(dom.spectatorModal);
}

// Abre as cartas de regras configuradas para o baralho atual.
function openRuleCardsModal() {
  app.ruleImages = calculateRuleImages();
  app.ruleImageIndex = 0;
  syncRuleImages();
  openModal(dom.ruleCardsModal);
}

// Avança pelas cartas de regras.
function stepRuleCard(direction) {
  if (!app.ruleImages.length) return;
  app.ruleImageIndex = (app.ruleImageIndex + direction + app.ruleImages.length) % app.ruleImages.length;
  dom.ruleFlipCard.classList.toggle('is-flipped');
  window.setTimeout(syncRuleImages, 180);
  playVfx('card-whoosh');
}

// Atualiza frente, verso e contador das regras.
function syncRuleImages() {
  const images = app.ruleImages.length
    ? app.ruleImages
    : ['assets/img/guides/front-actions.png', 'assets/img/guides/back-actions.png'];
  const frontIndex = app.ruleImageIndex % images.length;
  const backIndex = (frontIndex + 1) % images.length;
  dom.ruleFrontImg.src = images[frontIndex];
  dom.ruleBackImg.src = images[backIndex];
  dom.ruleCardsCounter.textContent = `${frontIndex + 1} / ${images.length}`;
}

// Calcula os guias relevantes para os grupos habilitados.
function calculateRuleImages() {
  const images = ['assets/img/guides/front-actions.png', 'assets/img/guides/back-actions.png'];
  if (hasConfiguredCards(RULE_CARD_GROUPS.promo)) {
    images.push('assets/img/guides/front-actions-alternative.png');
  }
  if (hasConfiguredCards(RULE_CARD_GROUPS.revolution)) {
    images.push('assets/img/guides/dlc-actions.png');
  }
  if (hasConfiguredCards(RULE_CARD_GROUPS.shadows)) {
    images.push('assets/img/guides/dlc2-actions.png', 'assets/img/guides/dlc3-actions.png');
  }
  return images;
}

// Abre o carrossel de regras alternativas.
function openAltRulesModal() {
  app.altRuleIndex = 0;
  syncAltRuleImages();
  openModal(dom.altRulesModal);
}

// Avança pelas regras alternativas.
function stepAltRuleCard(direction) {
  app.altRuleIndex = (app.altRuleIndex + direction + ALT_RULE_IMAGES.length) % ALT_RULE_IMAGES.length;
  dom.altRuleFlipCard.classList.toggle('is-flipped');
  window.setTimeout(syncAltRuleImages, 180);
  playVfx('card-whoosh');
}

// Atualiza as imagens do carrossel alternativo.
function syncAltRuleImages() {
  const frontIndex = app.altRuleIndex;
  const backIndex = (frontIndex + 1) % ALT_RULE_IMAGES.length;
  dom.altRuleFrontImg.src = ALT_RULE_IMAGES[frontIndex];
  dom.altRuleBackImg.src = ALT_RULE_IMAGES[backIndex];
  dom.altRuleCounter.textContent = `${frontIndex + 1} / ${ALT_RULE_IMAGES.length}`;
}

// Copia o código da sala mostrado no HUD.
async function copyRoomCodeFromHud() {
  const roomCode = window.CoupMaster3DOnline?.roomCode;
  if (!roomCode) return;
  await navigator.clipboard?.writeText(roomCode);
  dom.roomCodeStatusBtn.textContent = 'Código copiado';
  window.clearTimeout(app.roomCodeFeedbackTimer);
  app.roomCodeFeedbackTimer = window.setTimeout(updateRoomCodeStatus, 900);
}

// Atualiza o código da sala no HUD.
function updateRoomCodeStatus() {
  const roomCode = window.CoupMaster3DOnline?.roomCode || '----';
  dom.roomCodeStatusBtn.textContent = `Sala: ${roomCode}`;
}

// Alterna o modo de tela cheia.
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

// Abre um modal e interrompe interações do canvas.
function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  clearHover();
}

// Fecha um modal específico.
function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

// Fecha todos os modais.
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(closeModal);
}

// Verifica se algum modal está aberto.
function isAnyModalOpen() {
  return [...document.querySelectorAll('.modal-overlay')]
    .some(modal => modal.style.display === 'flex');
}

// Sincroniza os inputs do configurador com o estado atual.
function syncDeckConfigInputs() {
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    input.value = String(state.deckConfig[input.dataset.card] || 0);
  });
}

// Lê a configuração de deck informada pelo host.
function readDeckConfigInputs() {
  const config = { ...DEFAULT_DECK_CONFIG };
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    config[input.dataset.card] = clampDeckCopyCount(input.value);
  });
  return config;
}

// Aplica um preset sem resetar antes da confirmação.
function applyDeckPreset(preset) {
  if (!app.isAdmin) return;
  document.querySelectorAll('.card-config-item input').forEach((input) => {
    const card = CARD_LIBRARY.find(entry => entry.type === input.dataset.card);
    let value = 0;
    if (preset === 'standard') value = card?.folder === 'base' ? 5 : 0;
    if (preset === 'base_promo') value = ['base', 'promo'].includes(card?.folder) ? 5 : 0;
    if (preset === 'base_dlc1') value = ['base', 'dlc1'].includes(card?.folder) ? 5 : 0;
    if (preset === 'base_dlc2') value = ['base', 'dlc2'].includes(card?.folder) ? 5 : 0;
    if (preset === 'test') value = 1;
    input.value = String(value);
  });
}

// Mostra o tooltip da carta junto ao ponteiro.
function showTooltip(label, x, y) {
  if (!dom.hoverTooltipEl) return;
  dom.hoverTooltipEl.textContent = label;
  dom.hoverTooltipEl.style.display = 'block';
  dom.hoverTooltipEl.style.left = `${x + 14}px`;
  dom.hoverTooltipEl.style.top = `${y + 14}px`;
}

// Mostra uma mensagem temporária usando o tooltip existente.
function showTooltipMessage(message) {
  if (!dom.hoverTooltipEl) return;
  dom.hoverTooltipEl.textContent = message;
  dom.hoverTooltipEl.style.display = 'block';
  dom.hoverTooltipEl.style.left = '50%';
  dom.hoverTooltipEl.style.top = '18%';
  dom.hoverTooltipEl.style.transform = 'translateX(-50%)';
  window.setTimeout(() => {
    dom.hoverTooltipEl.style.transform = '';
    hideTooltip();
  }, 1400);
}

// Oculta o tooltip.
function hideTooltip() {
  if (dom.hoverTooltipEl) dom.hoverTooltipEl.style.display = 'none';
}

// Cria uma geometria retangular com cantos arredondados.
function createRoundedGeometry(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index += 1) {
    uv.setXY(
      index,
      (positions.getX(index) + width / 2) / width,
      (positions.getY(index) + height / 2) / height
    );
  }
  uv.needsUpdate = true;
  return geometry;
}

// Cria um painel plano arredondado.
function createRoundedMesh(width, height, radius, color, opacity) {
  return new THREE.Mesh(
    createRoundedGeometry(width, height, radius),
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1
    })
  );
}

// Cria uma área invisível de raycast.
function createHitbox(width, height, action) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  mesh.userData.action = action;
  return mesh;
}

// Cria um sprite textual usando canvas para manter a interface dentro do WebGL.
function createTextSprite(text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.height = 256;
  const displayWidth = options.width || 1.5;
  const displayHeight = options.height || 0.35;
  canvas.width = THREE.MathUtils.clamp(
    Math.round(canvas.height * displayWidth / displayHeight),
    256,
    2048
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: options.color || '#ffffff',
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.userData.textCanvas = canvas;
  sprite.userData.textOptions = options;
  sprite.scale.set(displayWidth, displayHeight, 1);
  updateTextSprite(sprite, text);
  return sprite;
}

// Redesenha um sprite textual sem recriar sua geometria.
function updateTextSprite(sprite, text) {
  if (!sprite?.userData?.textCanvas) return;
  sprite.userData.textValue = String(text);
  const canvas = sprite.userData.textCanvas;
  const options = sprite.userData.textOptions || {};
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  const fontSize = Math.min((options.fontSize || 48) * 4, 232);
  const fontFamily = options.fontFamily || '"Press Start 2P", monospace';
  const fontWeight = options.fontWeight || 400;
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.textBaseline = 'middle';
  context.textAlign = options.align || 'center';
  const padding = 34;
  const x = options.align === 'left'
    ? padding
    : options.align === 'right'
      ? canvas.width - padding
      : canvas.width / 2;
  context.fillText(String(text), x, canvas.height / 2, canvas.width - padding * 2);
  sprite.material.map.needsUpdate = true;
}

// Carrega e reutiliza uma textura local.
function loadTexture(path) {
  if (app.textureCache.has(path)) return app.textureCache.get(path);
  const texture = app.textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(app.renderer?.capabilities?.getMaxAnisotropy?.() || 1, 8);
  app.textureCache.set(path, texture);
  return texture;
}

// Limpa todas as cartas renderizadas.
function clearCardVisuals() {
  [...app.cards.values()].forEach(removeCardVisual);
  app.cards.clear();
  app.selectedCard = null;
  app.hoveredCard = null;
}

// Libera recursos de um objeto removido.
function disposeObject3D(object) {
  object.geometry?.dispose?.();
  if (Array.isArray(object.material)) {
    object.material.forEach(material => material.dispose?.());
  } else {
    object.material?.dispose?.();
  }
}

// Libera textura e material de um sprite dinâmico.
function disposeSprite(sprite) {
  sprite.material?.map?.dispose?.();
  sprite.material?.dispose?.();
}

// Cria os objetos persistentes dos contadores e religiões.
function createDefaultObjects() {
  return [
    { id: 'asylum-counter', kind: 'asylum-counter', value: 0 },
    ...Array.from({ length: PLAYER_COUNT }, (_, index) => ({
      id: `religion-${index + 1}`,
      kind: 'religion-state',
      value: 'catolico'
    }))
  ];
}

function getObservedSeat() {
  return app.observedSeat || getLocalPlayerSeat();
}

function getSlotLayout() {
  return app.isPortraitLayout ? PORTRAIT_SLOT_LAYOUT : LANDSCAPE_SLOT_LAYOUT;
}

function getSlotDimensions() {
  return app.isPortraitLayout
    ? { width: 4.02, height: 2.08 }
    : { width: SLOT_WIDTH, height: SLOT_HEIGHT };
}

function getZone(name) {
  return (app.isPortraitLayout ? PORTRAIT_ZONES : LANDSCAPE_ZONES)[name];
}

function getLocalPlayerSeat() {
  return normalizeSeat(window.CoupMaster3DOnline?.playerSeat || state.activePlayer);
}

function normalizeSeat(value) {
  return THREE.MathUtils.clamp(Number(value) || 1, 1, PLAYER_COUNT);
}

function createEntityId(prefix) {
  app.entityCounter += 1;
  const uid = String(window.CoupMaster3DOnline?.user?.uid || 'local').slice(-6);
  return `${prefix}-${uid}-${Date.now().toString(36)}-${app.entityCounter}`;
}

function clampDeckCopyCount(value) {
  return THREE.MathUtils.clamp(Math.floor(Number(value) || 0), 0, 10);
}

function hasConfiguredCards(types) {
  return types.some(type => (Number(state.deckConfig[type]) || 0) > 0);
}

function clampAudioVolume(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? THREE.MathUtils.clamp(parsed, 0, 1) : fallback;
}

function getInitials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'P';
}

function truncateLabel(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function formatChatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function wait(duration) {
  return new Promise(resolve => window.setTimeout(resolve, duration));
}
