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
import { setupOfficialLogService } from './official-log-service.js';
import { createGameActionsController } from './game-actions-controller.js';
import {
  refreshOpenPlayerInfoModal,
  renderRoomPlayerList,
  setupRoomPlayerList
} from './room-players-ui.js';
import {
  renderSpectatorTargets,
  setupSpectatorService,
  showSpectatorRequest,
  showSpectatorResponse,
  startSpectatingPlayer
} from './spectator-service.js';
import {
  clampDeckCopyCount,
  setupDeckConfigService,
  syncDeckConfigControls,
  syncDeckConfigInputs
} from './deck-config-service.js';
import {
  buildDeck,
  createDeckMesh,
  createDeckRim as createDeckRimMesh,
  getDeckHeight as getDeckHeightForCards,
  getDeckLayerStep as getDeckLayerStepForCards,
  getVisibleDeckLayerCount as getVisibleDeckLayerCountForCards,
  shuffle,
  shuffleDeck as shuffleDeckCards,
  syncDeckHitboxGeometry as syncDeckHitboxGeometryForMesh,
  syncDeckRim as syncDeckRimForMesh,
  takeDeckCard as takeDeckCardFromDeck,
  updateDeckVisualLayers as updateDeckVisualLayersForMesh
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
  animateCardReturnToDeck,
  canReturnCardNow,
  canReturnCardToDeck,
  createDrawCardActionPayload,
  createReturnCardActionPayload,
  getHandCardPosition,
  getHandRotation,
  getRotationDelta,
  getRotationTarget,
  getSelectedFlipTarget,
  layoutPlayerHand,
  moveCardToPlayer,
  moveCardToTable,
  removeSpecialCard,
  restoreDraggedCard,
  returnCardToDeck,
  resolveActionPlayerId,
  setupCardActionsService
} from './card-actions-service.js';
import {
  placeCard,
  random,
  tossTo
} from './animation-service.js';
import {
  createTableStack as createTableStackRecord,
  canFlipStack,
  getNextStackFaceUp,
  findCompatibleLooseStackBaseCard,
  findCompatibleTableStackForStack,
  findExistingCompatibleTableStack,
  getCardStack,
  getStackCardPosition,
  getStackCardTranslation,
  getStackHoverLabel as getStackHoverSummary,
  getTopStackCard,
  hasStackGroup,
  pruneStackCards,
  removeTableStack,
  setupStackSystem
} from './stack-system.js';
import {
  addCardToTableStack,
  findCompatibleTableStack,
  finishTableStackDrag,
  layoutTableStack,
  moveTableStack,
  removeCardFromTableStack,
  setupTableStackController,
  shuffleTableStack,
  startTableStackDrag,
  startTableStackTopCardDrag
} from './table-stack-controller.js';
import { setupInputController } from './input-controller.js';
import {
  publishTableAction,
  receiveTableState,
  runWithTableSyncSuppressed,
  scheduleTableSync,
  setLastAppliedTableState,
  setupTableSyncService,
  shouldApplyTableAction
} from './table-sync-service.js';
import {
  cloneCardData,
  cloneTableState,
  createTableStateSnapshot,
  quaternionFromSnapshot,
  stackFromSnapshot,
  vectorFromSnapshot
} from './table-state-serializer.js';
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
import { createSceneRuntimeController } from './scene-runtime-controller.js';
import { createRankedCoinAnimationController } from './ranked-coin-animation-controller.js';
import { createRankedRevealAnimationController } from './ranked-reveal-animation-controller.js';
import { createRankedCinematicEventLayer } from './ranked-cinematic-event-layer.js';
import { createRankedTreasuryBag } from './ranked-treasury-bag.js';
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
import { createPointerInteractionController } from './pointer-interaction-controller.js';
import { isSandboxTableInteractionAllowed } from './interaction-policy.js';
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
  CARD_REST_Y,
  CARD_W,
  DECK_ROTATION_Y,
  DEFAULT_DECK_CONFIG,
  HAND_RADIUS,
  PLAYER_COUNT
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
  rankedActivePlayer: null,
  rankedTableLayout: null,
  rankedCoinBalances: null,
  rankedPublicRevealSequence: null,
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
let officialLogService = null;

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
  deckShuffle: null,
  deckVisualCount: -1,
  deckHitHeight: 0,
  stackShuffleTimers: new Map(),
  cards: new Map(),
  tableStacks: [],
  dropZones: [],
  stackId: 1,
  isDealing: false,
  lastAppliedTableState: null,
  isApplyingRemoteState: false,
  isAdmin: Boolean(window.CoupMaster3DOnline?.isAdmin),
  lastTime: performance.now(),
  pointerInteractions: null,
  sceneRuntime: null,
  rankedCoinAnimations: null,
  rankedRevealAnimations: null,
  rankedCinematicEvents: null,
  rankedTreasuryBag: null,
  textures: {}
};

await RAPIER.init();
init();
resetMvp();
app.sceneRuntime.start();

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
  app.pointerInteractions = createPointerInteractionController({
    app,
    canvas,
    state,
    hoverTooltipEl,
    canRevealCardFace,
    createCardObject,
    drawCardToPlayer,
    finishTableStackDrag,
    getCardStack,
    getDeckHeight,
    getObjectById,
    getObjectMeshes,
    getStackHoverSummary,
    getTopStackCard,
    isCoinObject,
    isSandboxInteractionAllowed: () => isSandboxTableInteractionAllowed(window.CoupMaster3DOnline?.mode),
    moveCardToPlayer,
    moveCardToTable,
    moveTableStack,
    placeCard,
    random,
    removeCardFromTableStack,
    removeTableObject,
    restoreDraggedCard,
    returnCardToDeck,
    scheduleTableSync,
    setPieceSensor,
    startTableStackDrag,
    startTableStackTopCardDrag,
    syncDeckRim,
    t,
    tryReturnCardToDeck,
    updateDeckCollider,
    updateHud
  });
  app.sceneRuntime = createSceneRuntimeController({
    app,
    forEachTableObject,
    random,
    rapierQuatFromEuler,
    refreshCardMaterial,
    resizeCamera,
    resizeInspectOverlay,
    scheduleTableSync,
    shuffleBtn,
    syncDeckRim,
    updateCameraDebug,
    updateCameraFocus,
    updateDeckCollider,
    updatePlayerBadges,
    updateRankedCoinAnimations: (deltaSeconds) => app.rankedCinematicEvents?.update(deltaSeconds)
  });
  setupTableStackController({
    app,
    state,
    autoShuffleDeckAfterReturn,
    beginDrag: app.pointerInteractions.beginDrag,
    clearPointerHover: app.pointerInteractions.clearPointerHover,
    createTableStackRecord,
    findCompatibleLooseStackBaseCard,
    findCompatibleTableStackForStack,
    findExistingCompatibleTableStack,
    getStackCardPosition,
    getStackCardTranslation,
    isStackOverDeck: app.pointerInteractions.isStackOverDeck,
    placeCard,
    pruneStackCards,
    random,
    rayToPlane: app.pointerInteractions.rayToPlane,
    refreshCardMaterial,
    removeTableStack,
    scheduleTableSync,
    setPieceSensor,
    shuffle,
    tossTo,
    updateHud
  });
  setupCardActionsService({
    app,
    state,
    addCardToTableStack,
    autoShuffleDeckAfterReturn,
    clearPointerHover: app.pointerInteractions.clearPointerHover,
    findCompatibleTableStack,
    getDeckReturnPosition,
    getPlayerAngle,
    getPlayerSeatPosition,
    isPublicSlotCard,
    placeCard,
    playVfx,
    random,
    refreshCardMaterial,
    removeCardFromTableStack,
    scheduleTableSync,
    setPieceSensor,
    tossTo,
    updateHud
  });
  setupTableSyncService({
    getActivePlayer: () => state.activePlayer,
    getUserUid: () => window.CoupMaster3DOnline?.user?.uid,
    getTableState,
    applyTableState,
    isApplyingRemoteState: () => app.isApplyingRemoteState,
    isSceneInteractionPending: () => Boolean(
      app.dragged
      || app.pendingDeckDrag
      || app.pendingStackDrag
      || hasActiveCardAnimations()
    ),
    publishOnlineAction: () => window.CoupMaster3DOnline?.publishTableAction,
    publishOnlineState: () => window.CoupMaster3DOnline?.publishTableState,
    confirmLocalTableState: (snapshot) => {
      app.lastAppliedTableState = cloneTableState(snapshot);
    }
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
    clearPointerHover: app.pointerInteractions.clearPointerHover,
    onObjectsCleared: () => {
      app.selectedObject = null;
    },
    onObjectRemoved: (id) => {
      if (app.selectedObject?.id === id) app.selectedObject = null;
    }
  });
  app.rankedCoinAnimations = createRankedCoinAnimationController({
    createTransientCoin: (type, position, id) => spawnCoin(type, {
      id: `ranked-coin-transfer-${id}`,
      position,
      locked: true,
      silent: true
    }),
    getObjectById,
    removeTableObject,
    setCoinKinematic: (coin) => {
      coin.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    },
    releaseCoinPhysics: (coin) => {
      coin.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      coin.body.setLinvel({ x: 0, y: -0.08, z: 0 }, true);
      coin.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  });
  app.rankedRevealAnimations = createRankedRevealAnimationController({
    createTransientCard: createRankedRevealCard,
    getCardById: (id) => app.cards.get(id) || null,
    getCardPose: getCardPose,
    getDeckPose: () => ({ position: getDeckReturnPosition(), rotationY: app.deckMesh?.rotation.y || 0 }),
    placeCard,
    refreshCardMaterial,
    removeTransientCard: removeRankedRevealCard,
    setCardVisible: (card, visible) => {
      card.mesh.visible = visible;
    },
    startCardFlip,
    tossTo: (card, target, rotationY, lift, onComplete, options) => tossTo(
      card,
      vectorFromSnapshot(target, new THREE.Vector3()),
      rotationY,
      lift,
      onComplete,
      options
    )
  });
  app.rankedCinematicEvents = createRankedCinematicEventLayer({
    coinAnimations: app.rankedCoinAnimations,
    revealAnimations: app.rankedRevealAnimations
  });

  createLights(app.scene);
  app.table = createTable({
    scene: app.scene,
    world: app.world,
    loadTexture
  });
  app.rankedTreasuryBag = createRankedTreasuryBag({ scene: app.scene });
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
  officialLogService = setupOfficialLogService({
    historyBtn: dom.historyBtn,
    officialLogModal: dom.officialLogModal,
    closeOfficialLogBtn: dom.closeOfficialLogBtn,
    officialLogList: dom.officialLogList,
    copyOfficialLogBtn: dom.copyOfficialLogBtn,
    officialLogStatus: dom.officialLogStatus,
    openModal,
    closeModal,
    t
  });
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
    getRankedTableLayout,
    setAdminRole,
    setLocalPlayerSeat,
    setOnlinePlayerProfiles,
    showSpectatorRequest,
    showSpectatorResponse,
    startSpectatingPlayer,
    applyTableAction,
    setChatMessages,
    setOfficialLogEntries,
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
    actions: createGameActionsController({
      clearTableObjects,
      closeAllModals,
      dealInitialHands,
      deleteSelectedPiece,
      drawCardToPlayer,
      flipSelectedCards,
      focusTableCamera,
      getActivePlayer: () => state.activePlayer,
      getViewPlayer: () => state.viewPlayer,
      hideInspectOverlay: app.pointerInteractions.hideInspectOverlay,
      onDoubleClick: app.pointerInteractions.onDoubleClick,
      onPointerDown: app.pointerInteractions.onPointerDown,
      onPointerMove: app.pointerInteractions.onPointerMove,
      onPointerUp: app.pointerInteractions.onPointerUp,
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
      spawnCoin,
      spawnDie,
      spawnSpecialCard,
      triggerResetFromButton,
      updateInspectOverlay: app.pointerInteractions.updateInspectOverlay
    }),
    isSandboxInteractionAllowed: () => isSandboxTableInteractionAllowed(window.CoupMaster3DOnline?.mode),
    isAnyModalOpen
  });
  window.addEventListener('coup:languagechange', refreshLanguageAwareUi);
}

// Evita publicar snapshots enquanto cartas ainda estao em animacao.
function hasActiveCardAnimations() {
  return [...app.cards.values()].some(card => Boolean(card.target || card.flip));
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

// Atualiza o registro oficial exibido pelo botao de historico.
function setOfficialLogEntries(entries = []) {
  officialLogService?.setEntries(entries);
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
  app.deckMesh = createDeckMesh({
    createRoundedCardGeometry,
    deckHeight: getDeckHeight()
  });
  syncDeckHitboxGeometry();
  updateDeckVisualLayers();
  app.scene.add(app.deckMesh);
  createDeckRim();
  updateDeckCollider();
}

// Recria a pilha visual do deck com uma camada para cada carta real.
function updateDeckVisualLayers(force = false) {
  app.deckVisualCount = updateDeckVisualLayersForMesh({
    deckMesh: app.deckMesh,
    deckVisualCount: app.deckVisualCount,
    force,
    layerCount: getVisibleDeckLayerCount(),
    deckHeight: getDeckHeight(),
    deckLayerStep: getDeckLayerStep(),
    createRoundedCardGeometry,
    loadTexture
  });
}

// Remove camadas visuais antigas do deck antes de reconstruir.
function clearDeckVisualLayers() {
  updateDeckVisualLayersForMesh({
    deckMesh: app.deckMesh,
    deckVisualCount: -1,
    force: true,
    layerCount: 0,
    deckHeight: getDeckHeight(),
    deckLayerStep: getDeckLayerStep(),
    createRoundedCardGeometry,
    loadTexture
  });
  app.deckVisualCount = 0;
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
  app.deckRim = createDeckRimMesh({
    createRoundedRectShape
  });
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
  setupSpectatorService({
    spectatorBtn,
    spectatorModal,
    closeSpectatorBtn,
    spectatorPlayerList,
    spectatorStatusText,
    spectatorRequestModal,
    spectatorRequestText,
    acceptSpectatorBtn,
    declineSpectatorBtn,
    openModal,
    closeModal,
    getPlayers: () => state.players,
    getOnlineService: () => window.CoupMaster3DOnline,
    setObservedPlayerSeat,
    t
  });
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

  const data = takeDeckCard(options.cardData);
  if (!data) {
    updateHud();
    return false;
  }

  const action = options.publishAction === false
    ? null
    : publishTableAction('draw-card', createDrawCardActionPayload(
      targetPlayerId,
      data,
      animateDraw,
      cloneCardData
    ));
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
  if (!hasStackGroup(stack)) return false;

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

// Cria uma carta temporaria para apresentar uma prova que ja retornou ao baralho.
function createRankedRevealCard(reveal) {
  return createCardObject({
    id: `ranked-reveal-${reveal.sequence}`,
    type: reveal.role,
    folder: 'base',
    faceUp: false,
    location: 'table',
    owner: null,
    rankedPresentation: true,
    rankedRole: reveal.role
  });
}

// Remove uma carta usada apenas durante a apresentacao visual de uma prova.
function removeRankedRevealCard(card) {
  if (!card) return;
  app.scene.remove(card.mesh);
  app.world.removeRigidBody(card.body);
  app.cards.delete(card.id);
}

// Captura a pose final de uma carta antes de ela ser deslocada para a revelacao.
function getCardPose(card) {
  const rotationY = new THREE.Euler().setFromQuaternion(card.mesh.quaternion, 'YXZ').y;
  return {
    position: card.mesh.position.clone(),
    rotationY
  };
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
  syncDropZoneFocus(app.dropZones, playerId, state.rankedActivePlayer);

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
  return resolveActionPlayerId(playerId, state.activePlayer, PLAYER_COUNT);
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
    if (!canReturnCardToDeck(card)) return;

    runWithTableSyncSuppressed(RETURN_ACTION_SYNC_DELAY_MS, () => {
      animateCardReturnToDeck(card);
    });
  }
}

// Define cartas que continuam publicas mesmo quando estao em um slot de jogador.
function isPublicSlotCard(data) {
  return data?.type === 'religiao';
}

// Liga ou desliga colisao fisica durante o arrasto de uma peca.
function setPieceSensor(piece, enabled) {
  piece?.collider?.setSensor?.(enabled);
}

// Devolve carta ao deck respeitando cooldown contra cliques duplicados.
function tryReturnCardToDeck(card, animated = false, options = {}) {
  const now = performance.now();
  if (!canReturnCardNow(card, app.lastCardReturnAt, now)) return false;

  app.lastCardReturnAt = now;
  const action = animated && options.publishAction !== false
    ? publishTableAction('return-card-to-deck', createReturnCardActionPayload(card, cloneCardData))
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
  const target = getSelectedFlipTarget(app.selectedCard, getCardStack);
  if (!target) return false;

  if (target.type === 'stack') {
    flipTableStack(target.stack);
  } else {
    flipCard(target.card);
  }
  return true;
}

// Gira o objeto sob o mouse ou selecionado com os atalhos Q/E.
function rotateSelectedPiece(direction) {
  const piece = app.hoveredPiece || app.selectedCard || app.selectedObject;
  const target = getRotationTarget(piece);
  if (!target) return false;

  const delta = getRotationDelta(direction);
  if (target.type === 'deck') {
    rotateDeck(delta);
    return true;
  }

  if (target.type === 'card') {
    rotateCardPiece(target.piece, delta);
    return true;
  }

  if (target.type === 'object') {
    rotatePhysicsObject(target.piece, delta);
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
  if (hasStackGroup(stack)) {
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
  if (!hasStackGroup(stack)) return;
  const cards = stack.cards.map(id => app.cards.get(id)).filter(Boolean);
  if (!canFlipStack(stack, cards)) return;

  const nextFaceUp = getNextStackFaceUp(stack);
  stack.faceUp = nextFaceUp;
  cards.forEach((card) => {
    startCardFlip(card, nextFaceUp, false);
  });
}

// Inicia a animacao de flip de uma carta sem decidir sua origem.
function startCardFlip(card, nextFaceUp, restoreDynamic, onComplete = null, shouldSync = true) {
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
    restoreDynamic,
    onComplete,
    shouldSync
  };
}

// Embaralha automaticamente sempre que cartas fechadas voltam para o deck.
function autoShuffleDeckAfterReturn() {
  if (state.deck.length === 0) return;
  if (state.deck.length > 1) shuffleDeck();
}

// Ajusta camera e renderer quando a janela muda de tamanho.
function resize() {
  app.sceneRuntime.resize();
}

// Serializa o estado atual da mesa para o Firebase.
function getTableState() {
  return createTableStateSnapshot({
    deckConfig: state.deckConfig,
    alternativeRuleDraw: state.alternativeRuleDraw,
    deck: state.deck,
    deckMesh: app.deckMesh,
    objectId: getObjectId(),
    stackId: app.stackId,
    players: state.players,
    tableCards: state.tableCards,
    cards: app.cards,
    objects: getTableObjects(),
    stacks: app.tableStacks
  });
}

// Expoe os pontos fixos do ranqueado para as proximas animacoes de mesa.
function getRankedTableLayout() {
  return state.rankedTableLayout ? cloneTableState(state.rankedTableLayout) : null;
}

// Aplica o estado final publicado por outro jogador, sem reemitir eco.
function applyTableState(snapshot) {
  if (!snapshot || snapshot.version !== 1) return;

  const previousSnapshot = app.lastAppliedTableState;
  const previousRankedCoinPoses = snapshot.mode === 'ranked'
    ? captureRankedCoinPoses()
    : new Map();

  app.isApplyingRemoteState = true;
  app.pointerInteractions.clearPointerHover();
  app.pointerInteractions.clearDropHover();
  app.dragged = null;
  app.dragMode = null;
  app.pendingDeckDrag = null;
  app.pendingStackDrag = null;
  app.controls.enabled = true;

  app.stackShuffleTimers.forEach(timer => window.clearTimeout(timer));
  app.stackShuffleTimers.clear();
  app.rankedCinematicEvents?.cancel();
  clearCardsForSnapshot();
  clearTableObjects(false);

  state.deckConfig = { ...DEFAULT_DECK_CONFIG, ...(snapshot.deckConfig || {}) };
  state.alternativeRuleDraw = snapshot.alternativeRuleDraw ? cloneTableState(snapshot.alternativeRuleDraw) : null;
  state.rankedActivePlayer = Number(snapshot.ranked3d?.activeSeat) || null;
  state.rankedTableLayout = snapshot.ranked3d?.layout
    ? cloneTableState(snapshot.ranked3d.layout)
    : null;
  app.rankedTreasuryBag?.update(snapshot.mode === 'ranked' ? state.rankedTableLayout?.treasury : null);
  state.rankedCoinBalances = snapshot.mode === 'ranked' && Array.isArray(snapshot.ranked3d?.coinBalances)
    ? snapshot.ranked3d.coinBalances.map(value => Math.max(0, Number(value) || 0))
    : null;
  const rankedPublicReveals = snapshot.mode === 'ranked' && Array.isArray(snapshot.ranked3d?.publicReveals)
    ? snapshot.ranked3d.publicReveals
    : [];
  state.rankedPublicRevealSequence = rankedPublicReveals.reduce(
    (highest, reveal) => Math.max(highest, Number(reveal?.sequence) || 0),
    0
  );
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
    bumpObjectIdFrom(data.id);
  });

  app.tableStacks = (snapshot.stacks || []).map(stack => {
    bumpStackIdFrom(stack.id);
    return stackFromSnapshot(stack, new THREE.Vector3());
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
      const preservedPose = previousRankedCoinPoses.get(object.id);
      spawnCoin(object.kind === 'gold-coin' ? 'gold' : 'silver', {
        id: object.id,
        position: preservedPose?.position || object.position,
        quaternion: preservedPose?.quaternion || object.quaternion,
        locked: snapshot.mode === 'ranked' || Boolean(object.rankedLocked),
        physicsLocked: Boolean(object.rankedLocked),
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
  if (snapshot.mode === 'ranked') {
    app.rankedCinematicEvents?.transition(previousSnapshot, snapshot);
  }
  renderRoomPlayerList();
  setLocalPlayerSeat(getLocalPlayerSeat(), { focus: false, preserveView: true });
  updateHud();
  app.lastAppliedTableState = cloneTableState(snapshot);
  setLastAppliedTableState(snapshot);
  app.isApplyingRemoteState = false;
}

// Preserva moedas fisicas ranqueadas que ja se acomodaram entre atualizacoes do motor.
function captureRankedCoinPoses() {
  return getTableObjects().reduce((poses, object) => {
    if (!object?.id?.startsWith('ranked-coin-') || object.id.startsWith('ranked-coin-transfer-')) return poses;
    const position = object.body?.translation?.();
    const quaternion = object.body?.rotation?.();
    if (!position || !quaternion) return poses;
    poses.set(object.id, {
      position: { x: position.x, y: position.y, z: position.z },
      quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
    });
    return poses;
  }, new Map());
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

// Mantem o contador de pilhas acima dos IDs restaurados.
function bumpStackIdFrom(id) {
  const number = Number(String(id).match(/(\d+)$/)?.[1]);
  if (!Number.isNaN(number)) app.stackId = Math.max(app.stackId, number + 1);
}

// Atualiza contadores e visibilidade do deck no HUD.
function updateHud() {
  deckCountEl.textContent = t('three.deckCount', { count: state.deck.length }, `Baralho: ${state.deck.length}`);
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
  app.deckHitHeight = syncDeckHitboxGeometryForMesh({
    deckMesh: app.deckMesh,
    deckHitHeight: app.deckHitHeight,
    deckHeight: getDeckHeight(),
    createRoundedCardGeometry
  });
}

// Mantem o aro visual do deck alinhado ao deck.
function syncDeckRim() {
  syncDeckRimForMesh({
    deckMesh: app.deckMesh,
    deckRim: app.deckRim,
    deckHeight: getDeckHeight(),
    deckCount: state.deck.length
  });
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
