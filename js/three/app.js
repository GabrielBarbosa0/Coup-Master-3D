import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import * as config from './config.js';
import * as dom from './dom.js';
import {
  playResetSoundFromButton,
  playVfx,
  setupAudioControls,
  triggerResetFromButton
} from './audio-service.js';
import {
  closeAllModals,
  closeModal,
  isAnyModalOpen,
  openModal,
  setupFullscreenControl,
  setupModalOverlayDismiss
} from './modal-service.js';
import {
  openChatModal,
  setChatMessages,
  setupChatPanel
} from './chat-service.js';
import { setupFeedbackService } from './feedback-service.js';
import {
  renderShareRoomModal,
  setupShareRoomService
} from './share-room-service.js';
import {
  refreshOpenPlayerInfoModal,
  renderRoomPlayerList,
  setupRoomPlayerList
} from './room-players-ui.js';
import {
  clampDeckCopyCount,
  setupDeckConfigService,
  syncDeckConfigControls,
  syncDeckConfigInputs
} from './deck-config-service.js';
import {
  buildDeck,
  getDeckHeight as getDeckHeightForCards,
  getDeckLayerStep as getDeckLayerStepForCards,
  getVisibleDeckLayerCount as getVisibleDeckLayerCountForCards,
  shuffle,
  shuffleDeck as shuffleDeckCards,
  takeDeckCard as takeDeckCardFromDeck
} from './deck-system.js';
import {
  canRevealCardFace,
  createCardObject as createCardRuntimeObject,
  createRoundedCardGeometry,
  createRoundedRectShape,
  refreshCardMaterial,
  setupCardSystem
} from './card-system.js';
import {
  easeInOutCubic,
  placeCard,
  random,
  tossTo,
  updateCardTweens
} from './animation-service.js';
import {
  createTableStack as createTableStackRecord,
  findCompatibleLooseStackBaseCard,
  findCompatibleTableStackForStack,
  findExistingCompatibleTableStack,
  getCardStack,
  getStackCardPosition,
  getStackCardTranslation,
  getStackHoverLabel as getStackHoverSummary,
  getTopStackCard,
  pruneStackCards,
  removeTableStack,
  setupStackSystem
} from './stack-system.js';
import { setupInputController } from './input-controller.js';
import {
  flushPendingRemoteState,
  publishTableAction,
  receiveTableState,
  runWithTableSyncSuppressed,
  scheduleTableSync,
  setLastAppliedTableState,
  setupTableSyncService,
  shouldApplyTableAction
} from './table-sync-service.js';
import {
  createPlayerBadges,
  refreshPlayerBadge,
  setupPlayerBadges,
  updatePlayerBadges
} from './player-badges.js';
import {
  createTableCamera,
  createTableControls,
  focusTableCamera,
  resizeCamera,
  snapCameraToPlayer,
  updateCameraDebug,
  updateCameraFocus
} from './camera-service.js';
import {
  createBoundaries,
  createDropZones,
  createLights,
  createTable,
  getPlayerAngle,
  getPlayerSeatPosition,
  syncDropZoneFocus
} from './scene-table.js';
import {
  bumpObjectIdFrom,
  clearTableObjects,
  forEachTableObject,
  getObjectById,
  getObjectCount,
  getObjectId,
  getObjectMeshes,
  getTableObjects,
  isCoinObject,
  removeTableObject,
  rollDice,
  setObjectId,
  setupObjectSystem,
  spawnCoin,
  spawnDie
} from './object-system.js';
import { setupRulesGuidesUi } from './rules-guides-ui.js';
import { applyAlternativeDeckRules } from './alternative-rules-service.js';

const {
  acceptSpectatorBtn,
  asylumCardBtn,
  canvas,
  clearObjectsBtn,
  closeFeedbackBtn,
  closeSettingsBtn,
  closeSpectatorBtn,
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
  goldCoinBtn,
  hoverTooltipEl,
  objectCountEl,
  religionCardBtn,
  resetBtn,
  rollBtn,
  rotateLeftBtn,
  rotateRightBtn,
  settingsBtn,
  settingsModal,
  shareRoomBtn,
  shuffleBtn,
  silverCoinBtn,
  spectatorBtn,
  spectatorModal,
  spectatorPlayerList,
  spectatorRequestModal,
  spectatorRequestText,
  spectatorStatusText,
  tableCountEl
} = dom;

const {
  CARD_D,
  CARD_H,
  CARD_LABELS,
  CARD_RADIUS,
  CARD_REST_Y,
  CARD_RETURN_COOLDOWN_MS,
  CARD_W,
  DECK_BASE_HEIGHT,
  DECK_DRAG_HOLD_MS,
  DECK_ROTATION_Y,
  DEFAULT_DECK_CONFIG,
  HAND_LADDER_DEPTH,
  HAND_LADDER_LIFT,
  HAND_LADDER_ROTATION,
  HAND_LADDER_SPACING,
  HAND_RADIUS,
  LIMBO_RADIUS,
  LIMBO_Y,
  OBJECT_ROTATION_STEP,
  PLAYER_COUNT,
  PLAY_RADIUS,
  SPECIAL_CARD_LABELS
} = config;

function t(key, params = {}, fallback = key) {
  return window.CoupLanguage?.t?.(key, params, fallback) || fallback;
}

function getPlayerFallbackName(playerId = '') {
  return `${t('common.player', {}, 'Jogador')} ${playerId}`.trim();
}

const state = {
  activePlayer: 1,
  viewPlayer: 1,
  deckConfig: { ...DEFAULT_DECK_CONFIG },
  alternativeRuleDraw: null,
  deck: [],
  tableCards: [],
  players: Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    id: index + 1,
    uid: null,
    name: getPlayerFallbackName(index + 1),
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
  spectatorRequest: null,
  deckShuffle: null,
  deckVisualCount: -1,
  deckHitHeight: 0,
  stackShuffleTimers: new Map(),
  cards: new Map(),
  tableStacks: [],
  dropZones: [],
  stackId: 1,
  isDealing: false,
  pendingDrawCount: 0,
  lastAppliedTableState: null,
  isApplyingRemoteState: false,
  isAdmin: Boolean(window.CoupMaster3DOnline?.isAdmin),
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

  app.camera = createTableCamera(state.viewPlayer);
  createInspectOverlay();

  app.controls = createTableControls(app.camera, canvas);

  app.world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
  app.world.timestep = 1 / 60;
  setupCardSystem({
    getScene: () => app.scene,
    getWorld: () => app.world,
    getViewPlayer: () => state.viewPlayer,
    loadTexture
  });
  setupStackSystem({
    getStacks: () => app.tableStacks,
    setStacks: (stacks) => {
      app.tableStacks = stacks;
    },
    getCards: () => app.cards,
    getTableCards: () => state.tableCards,
    createStackId: () => createSharedEntityId('stack')
  });
  setupTableSyncService({
    getActivePlayer: () => state.activePlayer,
    getUserUid: () => window.CoupMaster3DOnline?.user?.uid,
    getTableState,
    applyTableState,
    isApplyingRemoteState: () => app.isApplyingRemoteState,
    isSceneInteractionPending: () => Boolean(
      app.pendingDrawCount > 0
      || app.dragged
      || app.pendingDeckDrag
      || app.pendingStackDrag
    ),
    publishOnlineAction: () => window.CoupMaster3DOnline?.publishTableAction,
    publishOnlineState: () => window.CoupMaster3DOnline?.publishTableState
  });
  setupObjectSystem({
    getScene: () => app.scene,
    getWorld: () => app.world,
    getRenderer: () => app.renderer,
    getActivePlayer: () => state.activePlayer,
    loadTexture,
    playVfx,
    updateHud,
    scheduleTableSync,
    clearPointerHover,
    onObjectsCleared: () => {
      app.selectedObject = null;
    },
    onObjectRemoved: (id) => {
      if (app.selectedObject?.id === id) app.selectedObject = null;
    }
  });

  createLights(app.scene);
  app.table = createTable({
    scene: app.scene,
    world: app.world,
    loadTexture
  });
  createBoundaries(app.world);
  app.dropZones = createDropZones({
    scene: app.scene,
    viewPlayer: state.viewPlayer
  });
  setupPlayerBadges({
    getScene: () => app.scene,
    getCamera: () => app.camera,
    getPlayers: () => state.players,
    getViewPlayer: () => state.viewPlayer,
    loadTexture,
    disposeObject3D
  });
  createPlayerBadges();
  createDeck();
  setupSettingsModal();
  setupChatPanel();
  setupRoomPlayerList({
    getPlayers: () => state.players,
    isAdmin: () => app.isAdmin
  });
  setupAudioControls({
    canReset: () => app.isAdmin,
    onReset: resetMvp
  });
  window.CoupMaster3D = {
    ...(window.CoupMaster3D || {}),
    applyTableState,
    receiveTableState,
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

  setupInputController({
    canvas,
    buttons: {
      asylumCardBtn,
      clearObjectsBtn,
      dealBtn,
      deleteSelectionBtn,
      diceBtn,
      drawBtn,
      flipSelectionBtn,
      focusCameraBtn,
      goldCoinBtn,
      religionCardBtn,
      resetBtn,
      rollBtn,
      rotateLeftBtn,
      rotateRightBtn,
      shuffleBtn,
      silverCoinBtn
    },
    actions: {
      clearTableObjects,
      closeAllModals,
      dealInitialHands,
      deleteSelectedPiece,
      drawCardToActivePlayer: () => drawCardToPlayer(state.activePlayer),
      flipSelectedCards,
      focusCamera: () => focusTableCamera(state.viewPlayer),
      hideInspectOverlay,
      onDoubleClick,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      openChatModal,
      playResetSoundFromButton,
      resize,
      rollDice,
      rotateSelectedPiece,
      setInspectAltDown: (value) => {
        app.inspectAltDown = value;
      },
      shuffleDeck,
      shuffleHoveredCards,
      spawnAsylumCard: () => spawnSpecialCard('asilo'),
      spawnDie,
      spawnGoldCoin: () => spawnCoin('gold'),
      spawnReligionCard: () => spawnSpecialCard('religiao'),
      spawnSilverCoin: () => spawnCoin('silver'),
      triggerResetFromButton,
      updateInspectOverlay
    },
    isAnyModalOpen
  });
  window.addEventListener('coup:languagechange', refreshLanguageAwareUi);
}

// Reaplica textos dinamicos que nao vivem direto em data-i18n.
function refreshLanguageAwareUi() {
  state.players.forEach((player) => {
    if (!player.uid && /^(Jogador|Player) \d+$/.test(player.name)) {
      player.name = getPlayerFallbackName(player.id);
    }
  });
  updateHud();
  renderRoomPlayerList();
  refreshOpenPlayerInfoModal();
  syncDeckConfigControls(app.isAdmin);
  if (spectatorModal?.style.display === 'flex') renderSpectatorTargets();
  window.CoupLanguage?.applyTranslations?.();
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

// Atualiza um perfil local de jogador; futuramente recebe displayName/photoURL do Google.
function setPlayerProfile(playerId, profile = {}) {
  const player = state.players[playerId - 1];
  if (!player) return;

  player.name = profile.name || profile.displayName || player.name || getPlayerFallbackName(playerId);
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
    player.name = getPlayerFallbackName(player.id);
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

// Configura a abertura dos modais de configurações, feedback e baralho.
function setupSettingsModal() {
  settingsBtn?.addEventListener('click', () => {
    openModal(settingsModal);
  });

  closeSettingsBtn?.addEventListener('click', () => closeModal(settingsModal));
  setupShareRoomService({
    shareRoomBtn,
    shareRoomModal: dom.shareRoomModal,
    closeShareRoomBtn: dom.closeShareRoomBtn,
    shareRoomCodeCopy: dom.shareRoomCodeCopy,
    shareRoomCode: dom.shareRoomCode,
    shareRoomLinkCopy: dom.shareRoomLinkCopy,
    shareRoomQr: dom.shareRoomQr,
    shareRoomCopyStatus: dom.shareRoomCopyStatus,
    openModal,
    closeModal,
    getRoomCode,
    t
  });
  setupFeedbackService({
    feedbackBtn,
    feedbackModal,
    closeFeedbackBtn,
    cancelFeedbackBtn: dom.cancelFeedbackBtn,
    feedbackForm: dom.feedbackForm,
    feedbackStatus: dom.feedbackStatus,
    feedbackPage: dom.feedbackPage,
    feedbackRoom: dom.feedbackRoom,
    feedbackPlayer: dom.feedbackPlayer,
    feedbackDate: dom.feedbackDate,
    openModal,
    closeModal,
    getRoomCode: () => window.CoupMaster3DOnline?.roomCode || new URLSearchParams(location.search).get('room') || '',
    getPlayerName: () => window.CoupMaster3DOnline?.playerName || window.CoupMaster3DOnline?.user?.displayName || 'Visitante',
    t
  });
  spectatorBtn?.addEventListener('click', openSpectatorModal);
  setupFullscreenControl();
  setupRulesGuidesUi({
    getDeckConfig: () => state.deckConfig,
    getAlternativeRuleDraw: () => state.alternativeRuleDraw,
    setAlternativeRuleDraw: (drawData) => {
      state.alternativeRuleDraw = drawData ? cloneTableState(drawData) : null;
    },
    canEditAlternativeRules: () => app.isAdmin,
    onAlternativeRuleDrawChange: () => {
      scheduleTableSync();
      syncDeckConfigInputs();
    },
    getPlayerName: () => window.CoupMaster3DOnline?.playerName
      || window.CoupMaster3DOnline?.user?.displayName
      || t('common.host', {}, 'Host')
  });
  setupDeckConfigService({
    getDeckConfig: () => state.deckConfig,
    setDeckConfig: (deckConfig) => {
      state.deckConfig = deckConfig;
    },
    canEdit: () => app.isAdmin,
    onApply: resetMvp
  });

  closeSpectatorBtn?.addEventListener('click', () => closeModal(spectatorModal));
  acceptSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('accepted'));
  declineSpectatorBtn?.addEventListener('click', () => respondCurrentSpectatorRequest('declined'));

  setupModalOverlayDismiss({
    ignoredModals: [spectatorRequestModal]
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

  syncDeckConfigControls(app.isAdmin);
  refreshOpenPlayerInfoModal();
}

// Abre a lista de jogadores conectados que podem autorizar espectador.
function openSpectatorModal() {
  renderSpectatorTargets();
  openModal(spectatorModal);
  spectatorBtn?.blur();
}

// Atualiza a lista de alvos disponiveis para espectar.
function renderSpectatorTargets(statusText = t('three.choosePlayer', {}, 'Escolha um jogador.')) {
  if (!spectatorPlayerList || !spectatorStatusText) return;

  const localUid = window.CoupMaster3DOnline?.user?.uid;
  const targets = state.players.filter((player) => {
    return player.uid && player.uid !== localUid && player.isOnline;
  });

  spectatorPlayerList.innerHTML = '';
  if (targets.length === 0) {
    spectatorStatusText.textContent = t('three.noPlayerToSpectate', {}, 'Nao ha nenhum jogador para espectar.');
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
  spectatorStatusText.textContent = t('three.requestSentTo', { name: player.name }, `Pedido enviado para ${player.name}.`);
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
    spectatorRequestText.textContent = t(
      'three.spectatorRequestText',
      { name: request.requesterName || t('common.player', {}, 'Um jogador') },
      `${request.requesterName || 'Um jogador'} quer espectar sua mao.`
    );
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
    spectatorStatusText.textContent = t(
      'three.spectating',
      { name: request.targetName || t('common.player', {}, 'jogador') },
      `Espectando ${request.targetName || 'jogador'}.`
    );
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

// Le o codigo da sala atual a partir do bootstrap online ou da URL.
function getRoomCode() {
  return window.CoupMaster3DOnline?.roomCode || new URLSearchParams(location.search).get('room') || '';
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

  state.deck = buildDeck(applyAlternativeDeckRules(state.deckConfig, state.alternativeRuleDraw), clampDeckCopyCount);
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

// Compra uma carta do deck e anima ate a mao do jogador.
function drawCardToPlayer(playerId, animateDraw = true, options = {}) {
  const targetPlayerId = normalizePlayerId(playerId);

  if (options.publishAction !== false && window.CoupMaster3DOnline?.drawCard) {
    requestAuthoritativeCardDraw(targetPlayerId);
    return true;
  }

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

// Reserva a carta no Firebase antes de atualizar qualquer cliente da sala.
async function requestAuthoritativeCardDraw(playerId) {
  const drawActionId = createTableActionId();
  app.pendingDrawCount += 1;

  try {
    const result = await window.CoupMaster3DOnline.drawCard(playerId, drawActionId);
    if (!result?.tableState) {
      updateHud();
      return;
    }
    receiveTableState(result.tableState);
  } catch {
    // O boot ja registra o erro de rede; a mesa local permanece intacta.
  } finally {
    app.pendingDrawCount = Math.max(0, app.pendingDrawCount - 1);
    flushPendingRemoteState();
  }
}

// Retira do deck a carta solicitada pelo evento ou a carta do topo local.
function takeDeckCard(cardData = null) {
  return takeDeckCardFromDeck(
    state.deck,
    cardData,
    (cardId) => app.cards.has(cardId),
    cloneCardData
  );
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

  state.deck = shuffleDeckCards(state.deck);
  updateHud();
  scheduleTableSync();
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

// Cria uma carta pelo modulo dedicado e registra no runtime local.
function createCardObject(data) {
  const card = createCardRuntimeObject(data);
  if (!card) return null;

  app.cards.set(data.id, card);
  return card;
}

// Cria uma carta especial da DLC de religião diretamente na mesa.
function spawnSpecialCard(type, options = {}) {
  const data = {
    id: options.id || createSharedEntityId(`special-${type}`),
    type,
    folder: 'religion',
    faceUp: options.faceUp ?? true,
    location: 'table',
    owner: null,
    specialCard: true
  };
  if (!options.id) setObjectId(getObjectId() + 1);
  bumpObjectIdFrom(data.id);
  state.tableCards.push(data);

  const card = createCardObject(data);
  const defaultPosition = getSpecialCardSpawnPosition(state.activePlayer);
  const position = vectorFromSnapshot(options.position, defaultPosition);
  const rotationY = options.rotationY ?? getHandRotation(state.activePlayer) + random(-0.12, 0.12);
  placeCard(card, position, rotationY, true);
  if (!options.silent) playVfx('card-whoosh');
  updateHud();
  scheduleTableSync();
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

// Posiciona cartas especiais em um anel interno proximo ao slot do jogador.
function getSpecialCardSpawnPosition(playerId) {
  return getNearbyPlayerSpawnPosition(playerId, 0.42, 0.74, 0.18);
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
  syncDropZoneFocus(app.dropZones, playerId);

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
    focusTableCamera(state.viewPlayer);
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
    focusTableCamera(seat);
  }
}

// Cria IDs compartilhados que nao colidem entre dois jogadores simultaneos.
function createSharedEntityId(prefix) {
  const uid = String(window.CoupMaster3DOnline?.user?.uid || 'local')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${uid}-${randomPart}`;
}

// Aplica uma acao de mesa recebida pela rede sem reemitir eco.
function applyTableAction(action) {
  if (!shouldApplyTableAction(action)) return;
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

  const object = getObjectById(hit.object.userData.objectId);
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

  const object = getObjectById(mesh.userData.objectId);
  return object || null;
}

// Define o texto acessivel exibido no tooltip de hover.
function getHoverLabel(piece) {
  if (!piece) return '';
  if (piece.kind === 'deck') return t('three.pieces.deck', {}, 'Baralho');
  if (piece.kind === 'gold-coin') return t('three.pieces.goldCoin', {}, 'Moeda de ouro');
  if (piece.kind === 'silver-coin') return t('three.pieces.silverCoin', {}, 'Moeda de prata');
  if (piece.kind === 'die') return t('three.pieces.die', {}, 'Dado');
  if (piece.data) return getCardHoverLabel(piece);
  return '';
}

// Monta o texto de hover para carta solta ou pilha aberta.
function getCardHoverLabel(card) {
  if (card.data.specialCard) {
    const labels = SPECIAL_CARD_LABELS[card.data.type];
    const fallback = canRevealCardFace(card.data) ? labels?.front : labels?.back;
    const key = card.data.type === 'religiao' && canRevealCardFace(card.data)
      ? 'three.cards.catolico'
      : card.data.type === 'religiao'
        ? 'three.cards.protestante'
        : `three.cards.${card.data.type}`;
    return t(key, {}, fallback);
  }

  if (!canRevealCardFace(card.data)) return t('three.pieces.closedCard', {}, 'Carta fechada');

  const stack = getCardStack(card);
  if (!stack || stack.cards.length <= 1) {
    return t(`three.cards.${card.data.type}`, {}, CARD_LABELS[card.data.type] || card.data.type);
  }

  return getStackHoverSummary(stack, getTranslatedCardLabels());
}

// Retorna labels de cartas no idioma atual para tooltips e pilhas.
function getTranslatedCardLabels() {
  return Object.fromEntries(
    Object.entries(CARD_LABELS).map(([key, value]) => [key, t(`three.cards.${key}`, {}, value)])
  );
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
  const object = objectHit ? getObjectById(objectHit.object.userData.objectId) : null;
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
  scheduleTableSync();
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
    scheduleTableSync();
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
  scheduleTableSync();
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
  removeTableStack(stack);
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

// Procura uma pilha de mesa com mesmo lado visivel e proximidade.
function findCompatibleTableStack(card, position) {
  const existingStack = findExistingCompatibleTableStack(card, position);
  if (existingStack) return existingStack;

  const baseCard = findCompatibleLooseStackBaseCard(card, position);
  return baseCard ? createTableStack(baseCard) : null;
}

// Cria uma nova pilha de mesa a partir de uma carta base.
function createTableStack(baseCard) {
  const stack = createTableStackRecord(baseCard);
  app.stackId += 1;
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

  removeTableStack(sourceStack);
  layoutTableStack(targetStack, true);
  updateHud();
  scheduleTableSync();
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
    const position = getStackCardPosition(stack, index, 0.03);
    position.x += Math.cos(angle) * radius;
    position.z += Math.sin(angle) * radius;

    tossTo(card, position, stack.rotationY + random(-0.35, 0.35), 0.1);
  });

  const timer = window.setTimeout(() => {
    stack.cards = nextOrder;
    layoutTableStack(stack, true);
    app.stackShuffleTimers.delete(stack.id);
    updateHud();
    scheduleTableSync();
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
    removeTableStack(stack);
    return;
  }

  layoutTableStack(stack);
}

// Reposiciona as cartas de uma pilha em camadas.
function layoutTableStack(stack, animateLayout = true) {
  pruneStackCards(stack);
  stack.cards.forEach((id, index) => {
    const card = app.cards.get(id);
    if (!card) return;

    const position = getStackCardPosition(stack, index);
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

    card.body.setNextKinematicTranslation(getStackCardTranslation(stack, index));
    card.body.setNextKinematicRotation(quat);
  });
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
  scheduleTableSync();
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

  updateCardTweens(app.cards, dt, scheduleTableSync);
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

// Sincroniza meshes visuais com corpos fisicos.
function syncPhysicsMeshes() {
  app.cards.forEach((card) => {
    const pos = card.body.translation();
    const rot = card.body.rotation();
    card.mesh.position.set(pos.x, pos.y, pos.z);
    card.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  });

  forEachTableObject((object) => {
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
      scheduleTableSync();
    }
  });
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

  forEachTableObject((object) => {
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
  resizeCamera();
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  resizeInspectOverlay();
}

// Serializa o estado atual da mesa para o Firebase.
function getTableState() {
  return {
    version: 1,
    deckConfig: { ...state.deckConfig },
    alternativeRuleDraw: state.alternativeRuleDraw ? cloneTableState(state.alternativeRuleDraw) : null,
    deck: state.deck.map(cloneCardData),
    deckTransform: serializeTransform(app.deckMesh),
    objectId: getObjectId(),
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
    objects: getTableObjects().map(object => ({
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

  const previousCardIds = new Set(
    (app.lastAppliedTableState?.cards || [])
      .map(entry => entry?.data?.id)
      .filter(Boolean)
  );
  const animatedDrawIds = new Set(
    app.lastAppliedTableState
      ? (snapshot.cards || [])
        .filter(entry => entry?.data?.owner && !previousCardIds.has(entry.data.id))
        .map(entry => entry.data.id)
      : []
  );
  const animatedDrawOwners = new Set();

  app.isApplyingRemoteState = true;
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
  state.alternativeRuleDraw = snapshot.alternativeRuleDraw ? cloneTableState(snapshot.alternativeRuleDraw) : null;
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
  setObjectId(snapshot.objectId);
  app.stackId = Math.max(Number(snapshot.stackId) || 1, 1);

  syncDeckConfigInputs();
  applyDeckTransform(snapshot.deckTransform);

  (snapshot.cards || []).forEach((entry) => {
    const data = cloneCardData(entry.data);
    if (!data || data.location === 'deck') return;
    addCardDataToCollections(data);

    const card = createCardObject(data);
    placeCardFromSnapshot(card, entry);
    if (animatedDrawIds.has(data.id)) {
      placeCard(card, getDeckDrawPosition(1.0), getHandRotation(data.owner), false);
      animatedDrawOwners.add(data.owner);
    }
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

  state.players.forEach((player) => {
    layoutPlayerHand(player.id, animatedDrawOwners.has(player.id) ? 0.34 : 0);
  });
  renderRoomPlayerList();
  setLocalPlayerSeat(getLocalPlayerSeat(), { focus: false, preserveView: true });
  updateHud();
  app.lastAppliedTableState = cloneTableState(snapshot);
  setLastAppliedTableState(snapshot);
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

// Clona snapshots serializaveis usados como base da mesclagem transacional.
function cloneTableState(snapshot) {
  return snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
}

// Mantem o contador de pilhas acima dos IDs restaurados.
function bumpStackIdFrom(id) {
  const number = Number(String(id).match(/(\d+)$/)?.[1]);
  if (!Number.isNaN(number)) app.stackId = Math.max(app.stackId, number + 1);
}

// Atualiza contadores e visibilidade do deck no HUD.
function updateHud() {
  deckCountEl.textContent = t('three.deckCount', { count: state.deck.length }, `Deck: ${state.deck.length}`);
  tableCountEl.textContent = t('three.tableCount', { count: state.tableCards.length }, `Mesa: ${state.tableCards.length}`);
  objectCountEl.textContent = t('three.objectCount', { count: getObjectCount() }, `Objetos: ${getObjectCount()}`);
  renderShareRoomModal({
    shareRoomCode: dom.shareRoomCode,
    shareRoomQr: dom.shareRoomQr,
    getRoomCode,
    t
  });

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

// Retorna a altura visual/fisica atual do deck real.
function getDeckHeight() {
  return getDeckHeightForCards(state.deck);
}

// Retorna o espacamento vertical entre cartas reais do deck.
function getDeckLayerStep() {
  return getDeckLayerStepForCards();
}

// Limita a altura visual do deck sem alterar a quantidade real de cartas.
function getVisibleDeckLayerCount() {
  return getVisibleDeckLayerCountForCards(state.deck);
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

// Converte rotacao Euler do Three.js para quaternion do Rapier.
function rapierQuatFromEuler(x, y, z) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}
