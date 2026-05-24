import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import RAPIER from '@dimforge/rapier3d-compat';

const canvas = document.getElementById('threeCanvas');
const deckCountEl = document.getElementById('deckCount');
const tableCountEl = document.getElementById('tableCount');
const playerTabsEl = document.getElementById('playerTabs');
const drawBtn = document.getElementById('drawBtn');
const resetBtn = document.getElementById('resetBtn3d');

const CARD_W = 0.72;
const CARD_H = 1.04;
const CARD_D = 0.035;
const CARD_RADIUS = 0.055;
const TABLE_RADIUS = 4.65;
const FELT_RADIUS = 4.18;
const PLAY_RADIUS = 3.62;
const PLAYER_COUNT = 8;
const HAND_RADIUS = 3.28;
const CARD_REST_Y = 0.068;
const DECK_BASE_HEIGHT = 0.38;
const HAND_LADDER_SPACING = 0.36;
const HAND_LADDER_DEPTH = 0.075;
const HAND_LADDER_LIFT = 0.012;
const HAND_LADDER_ROTATION = 0.035;

const CARD_LIBRARY = [
  { type: 'duque', folder: 'base' },
  { type: 'capitao', folder: 'base' },
  { type: 'assassino', folder: 'base' },
  { type: 'condessa', folder: 'base' },
  { type: 'embaixador', folder: 'base' },
  { type: 'inquisidor', folder: 'base' }
];

const state = {
  activePlayer: 1,
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
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12),
  dragPoint: new THREE.Vector3(),
  dragOffset: new THREE.Vector3(),
  dragged: null,
  dragOrigin: null,
  dragStart: null,
  hasDragged: false,
  selectedCard: null,
  hoveredDrop: null,
  cards: new Map(),
  dropZones: [],
  lastTime: performance.now(),
  textures: {}
};

await RAPIER.init();
init();
resetMvp();
animate();

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
  app.scene.background = new THREE.Color(0x05070a);
  app.scene.fog = new THREE.Fog(0x05070a, 9, 22);

  app.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 80);
  app.camera.position.set(0, 7.6, 7.8);

  app.controls = new OrbitControls(app.camera, canvas);
  app.controls.target.set(0, 0, 0);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.08;
  app.controls.minDistance = 5;
  app.controls.maxDistance = 13;
  app.controls.maxPolarAngle = Math.PI * 0.48;
  app.controls.minPolarAngle = Math.PI * 0.19;
  app.controls.screenSpacePanning = false;

  app.world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
  app.world.timestep = 1 / 60;

  createLights();
  createTable();
  createBoundaries();
  createDropZones();
  createDeck();
  createPlayerTabs();

  drawBtn.addEventListener('click', () => drawCardToPlayer(state.activePlayer));
  resetBtn.addEventListener('click', resetMvp);
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('dblclick', onDoubleClick);
}

function createLights() {
  const ambient = new THREE.HemisphereLight(0x8fb8ff, 0x090a0d, 1.2);
  app.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xe8f5ff, 2.2);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  app.scene.add(key);

  const rim = new THREE.PointLight(0x2d8cff, 22, 11);
  rim.position.set(3.8, 2.2, -3.2);
  app.scene.add(rim);
}

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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x030406, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  app.scene.add(floor);

  const groundBody = app.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.005, 0));
  const groundCollider = RAPIER.ColliderDesc.cylinder(0.05, PLAY_RADIUS);
  groundCollider.setFriction(1.25);
  groundCollider.setRestitution(0.12);
  app.world.createCollider(groundCollider, groundBody);
}

function createBoundaries() {
  const wallHeight = 0.52;
  const wallY = 0.24;
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

function createDropZones() {
  app.dropZones = [];

  const tableZone = makeZone('table', 0, 0, PLAY_RADIUS * 1.38, PLAY_RADIUS * 1.38, 0x1d5d8f, 0.08);
  app.dropZones.push(tableZone);

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const pos = getPlayerSeatPosition(i);
    const zone = makeZone(`player-${i}`, pos.x, pos.z, 1.95, 1.28, i === state.activePlayer ? 0x18f28a : 0x3da3ff, 0.16);
    zone.userData.playerId = i;
    zone.rotation.z = -getPlayerAngle(i) + Math.PI / 2;
    app.dropZones.push(zone);
  }
}

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

function createDeck() {
  const geo = new RoundedBoxGeometry(CARD_W, DECK_BASE_HEIGHT, CARD_H, 5, CARD_RADIUS);
  const materials = makeCardMaterials('assets/img/cards/base/back.png', false);
  app.deckMesh = new THREE.Mesh(geo, materials);
  app.deckMesh.position.set(0, CARD_REST_Y + DECK_BASE_HEIGHT / 2, 0);
  app.deckMesh.rotation.y = -0.12;
  app.deckMesh.castShadow = true;
  app.deckMesh.receiveShadow = true;
  app.deckMesh.name = 'deck';
  app.deckMesh.userData.deck = true;
  app.scene.add(app.deckMesh);
}

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

function resetMvp() {
  app.cards.forEach((card) => {
    app.scene.remove(card.mesh);
    app.world.removeRigidBody(card.body);
  });
  app.cards.clear();

  state.deck = buildDeck();
  state.tableCards = [];
  state.players.forEach(player => {
    player.cards = [];
  });

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    drawCardToPlayer(i, false);
    drawCardToPlayer(i, false);
  }

  setActivePlayer(1);
  updateHud();
}

function buildDeck() {
  const cards = [];
  let id = 1;

  CARD_LIBRARY.forEach((def) => {
    for (let copy = 0; copy < 5; copy++) {
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

function drawCardToPlayer(playerId, animateDraw = true) {
  const data = state.deck.pop();
  if (!data) {
    updateHud();
    return;
  }

  data.owner = playerId;
  data.location = `player-${playerId}`;
  data.faceUp = playerId === state.activePlayer;
  state.players[playerId - 1].cards.push(data);

  const card = createCardObject(data);
  const target = getHandCardPosition(playerId, state.players[playerId - 1].cards.length - 1);
  const start = animateDraw ? new THREE.Vector3(0, 1.0, 0) : target.clone().add(new THREE.Vector3(0, 0.35, 0));
  placeCard(card, start, getHandRotation(playerId), false);
  layoutPlayerHand(playerId, animateDraw ? 0.34 : 0);
  updateHud();
}

function createCardObject(data) {
  const texturePath = data.faceUp
    ? `assets/img/cards/${data.folder}/${data.type}.png`
    : 'assets/img/cards/base/back.png';
  const geo = new RoundedBoxGeometry(CARD_W, CARD_D, CARD_H, 5, CARD_RADIUS);
  const mesh = new THREE.Mesh(geo, makeCardMaterials(texturePath, data.faceUp));
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
  const collider = RAPIER.ColliderDesc.cuboid(CARD_W / 2, CARD_D / 2, CARD_H / 2);
  collider.setDensity(0.36);
  collider.setFriction(1.6);
  collider.setRestitution(0.08);
  app.world.createCollider(collider, body);

  app.scene.add(mesh);

  const card = {
    id: data.id,
    data,
    mesh,
    body,
    target: null,
    targetQuat: null
  };

  app.cards.set(data.id, card);
  return card;
}

function makeCardMaterials(texturePath, faceUp) {
  const faceTexture = loadTexture(texturePath);
  const backTexture = loadTexture('assets/img/cards/base/back.png');
  const edge = new THREE.MeshStandardMaterial({
    color: faceUp ? 0x161d28 : 0x0e1420,
    roughness: 0.7,
    metalness: 0.05
  });
  const face = new THREE.MeshStandardMaterial({
    map: faceTexture,
    roughness: 0.58,
    metalness: 0.02
  });
  const back = new THREE.MeshStandardMaterial({
    map: backTexture,
    roughness: 0.66,
    metalness: 0.02
  });

  return [edge, edge, face, back, edge, edge];
}

function loadTexture(path) {
  if (app.textures[path]) return app.textures[path];

  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(app.renderer.capabilities.getMaxAnisotropy(), 8);
  app.textures[path] = texture;
  return texture;
}

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

function refreshCardMaterial(card) {
  const texturePath = card.data.faceUp
    ? `assets/img/cards/${card.data.folder}/${card.data.type}.png`
    : 'assets/img/cards/base/back.png';
  card.mesh.material = makeCardMaterials(texturePath, card.data.faceUp);
}

function onPointerDown(event) {
  setPointer(event);

  const hits = getIntersections([app.deckMesh, ...getCardMeshes()]);
  const hit = hits[0];
  if (!hit) return;

  if (hit.object.userData.deck) {
    drawCardToPlayer(state.activePlayer);
    return;
  }

  const card = app.cards.get(hit.object.userData.cardId);
  if (!card) return;

  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  app.controls.enabled = false;
  app.dragged = card;
  app.selectedCard = card;
  app.dragStart = { x: event.clientX, y: event.clientY };
  app.hasDragged = false;
  app.dragOrigin = {
    owner: card.data.owner,
    location: card.data.location
  };

  card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  if (rayToPlane(event, app.dragPoint)) {
    const pos = card.mesh.position;
    app.dragOffset.copy(pos).sub(app.dragPoint);
    app.dragOffset.y = 0.5;
  } else {
    app.dragOffset.set(0, 0.5, 0);
  }
}

function onPointerMove(event) {
  if (!app.dragged) return;

  event.preventDefault();
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
  next.y = 0.42;

  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, app.dragged.mesh.rotation.y, 0.08));
  app.dragged.body.setNextKinematicTranslation(next);
  app.dragged.body.setNextKinematicRotation(quat);
  updateHoveredDrop(event);
}

function onPointerUp(event) {
  if (!app.dragged) return;

  const card = app.dragged;
  const wasDragged = app.hasDragged;
  app.dragged = null;
  app.dragStart = null;
  app.hasDragged = false;
  app.controls.enabled = true;

  canvas.releasePointerCapture?.(event.pointerId);
  clearDropHover();

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

function onDoubleClick(event) {
  setPointer(event);
  const hits = getIntersections(getCardMeshes());
  const hit = hits[0];
  if (!hit) return;

  const card = app.cards.get(hit.object.userData.cardId);
  if (card && !card.data.faceUp) returnCardToDeck(card);
}

function onKeyDown(event) {
  if (event.key.toLowerCase() !== 'f') return;
  if (!app.selectedCard) return;
  if (app.selectedCard.data.location === 'deck') return;

  event.preventDefault();
  flipCard(app.selectedCard);
}

function flipCard(card) {
  card.data.faceUp = !card.data.faceUp;
  refreshCardMaterial(card);
}

function restoreDraggedCard(card) {
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

function moveCardToPlayer(card, playerId) {
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

function moveCardToTable(card) {
  const oldOwner = card.data.owner;
  removeCardFromCollections(card);
  card.data.owner = null;
  card.data.location = 'table';
  card.data.faceUp = true;
  state.tableCards.push(card.data);
  refreshCardMaterial(card);

  const pos = card.mesh.position.clone();
  card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  card.body.setTranslation({ x: pos.x, y: 0.28, z: pos.z }, true);
  card.body.setRotation(card.mesh.quaternion, true);
  card.body.setLinvel({ x: random(-0.25, 0.25), y: -0.4, z: random(-0.25, 0.25) }, true);
  card.body.setAngvel({ x: random(-0.2, 0.2), y: random(-0.55, 0.55), z: random(-0.2, 0.2) }, true);
  card.target = null;
  if (oldOwner) layoutPlayerHand(oldOwner, 0.12);
  updateHud();
}

function returnCardToDeck(card) {
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
  updateHud();
}

function removeCardFromCollections(card) {
  state.tableCards = state.tableCards.filter(data => data.id !== card.id);
  state.players.forEach((player) => {
    player.cards = player.cards.filter(data => data.id !== card.id);
  });
}

function tossTo(card, target, rotationY, lift = 0.25) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  const start = card.mesh.position.clone();
  const high = start.clone().lerp(target, 0.45);
  high.y += lift;

  card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  card.target = { start, high, end: target.clone(), progress: 0 };
  card.targetQuat = quat;
}

function placeCard(card, position, rotationY, dynamic = true) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  card.mesh.position.copy(position);
  card.mesh.quaternion.copy(quat);
  card.body.setTranslation(position, true);
  card.body.setRotation(quat, true);
  card.body.setBodyType(dynamic ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
}

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

function getHandRotation(playerId, cardIndex = null, handCount = null) {
  const baseRotation = -getPlayerAngle(playerId) + Math.PI / 2;
  if (cardIndex === null || handCount === null || handCount <= 1) return baseRotation;

  const centerIndex = (handCount - 1) / 2;
  return baseRotation + (cardIndex - centerIndex) * HAND_LADDER_ROTATION;
}

function getPlayerSeatPosition(playerId) {
  const angle = getPlayerAngle(playerId);
  return {
    x: Math.cos(angle) * HAND_RADIUS,
    z: Math.sin(angle) * HAND_RADIUS
  };
}

function getPlayerAngle(playerId) {
  return -Math.PI / 2 + Math.PI / 8 + ((playerId - 1) / PLAYER_COUNT) * Math.PI * 2;
}

function updateHoveredDrop(event) {
  const drop = findDropZoneAtPointer(event);
  if (drop === app.hoveredDrop) return;

  clearDropHover();
  app.hoveredDrop = drop;
  if (app.hoveredDrop) {
    app.hoveredDrop.material.opacity = Math.min(0.38, app.hoveredDrop.material.opacity + 0.16);
  }
}

function clearDropHover() {
  if (!app.hoveredDrop) return;
  app.hoveredDrop.material.opacity = app.hoveredDrop.userData.playerId === state.activePlayer
    ? 0.24
    : app.hoveredDrop.userData.baseOpacity;
  app.hoveredDrop = null;
}

function findDropZoneAtPointer(event) {
  setPointer(event);
  const hits = getIntersections(app.dropZones.filter(zone => zone.name !== 'table'));
  return hits[0]?.object || null;
}

function isPointerOverDeck(event) {
  if (!app.deckMesh?.visible) return false;

  setPointer(event);
  if (getIntersections([app.deckMesh]).length > 0) return true;

  const point = new THREE.Vector3();
  if (!rayToPlane(event, point)) return false;

  return Math.hypot(point.x - app.deckMesh.position.x, point.z - app.deckMesh.position.z) < 0.95;
}

function rayToPlane(event, out) {
  setPointer(event);
  app.raycaster.setFromCamera(app.pointer, app.camera);
  return app.raycaster.ray.intersectPlane(app.dragPlane, out);
}

function getIntersections(objects) {
  app.raycaster.setFromCamera(app.pointer, app.camera);
  return app.raycaster.intersectObjects(objects, false);
}

function getCardMeshes() {
  return [...app.cards.values()].map(card => card.mesh);
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  app.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  app.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - app.lastTime) / 1000, 0.033);
  app.lastTime = now;

  updateCardTweens(dt);
  app.world.step();
  syncPhysicsMeshes();
  app.controls.update();
  app.renderer.render(app.scene, app.camera);
}

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
      card.target = null;
    }
  });
}

function syncPhysicsMeshes() {
  app.cards.forEach((card) => {
    const pos = card.body.translation();
    const rot = card.body.rotation();
    card.mesh.position.set(pos.x, pos.y, pos.z);
    card.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  });
}

function resize() {
  app.camera.aspect = window.innerWidth / window.innerHeight;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateHud() {
  deckCountEl.textContent = `Deck: ${state.deck.length}`;
  tableCountEl.textContent = `Mesa: ${state.tableCards.length}`;

  if (app.deckMesh) {
    const deckScale = Math.max(0.12, state.deck.length / 30);
    app.deckMesh.scale.y = deckScale;
    app.deckMesh.position.y = CARD_REST_Y + (DECK_BASE_HEIGHT * deckScale) / 2;
    app.deckMesh.visible = state.deck.length > 0;
  }
}

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function rapierQuatFromEuler(x, y, z) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}
