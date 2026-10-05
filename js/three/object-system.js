import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  COIN_HEIGHT,
  COIN_TEXTURES,
  DIE_SIZE,
  GOLD_COIN_RADIUS,
  HAND_RADIUS,
  SILVER_COIN_RADIUS
} from './config.js';
import { getPlayerAngle } from './scene-table.js';

const objectState = {
  objects: new Map(),
  objectId: 1,
  dieTextures: new Map(),
  getScene: () => null,
  getWorld: () => null,
  getRenderer: () => null,
  getActivePlayer: () => 1,
  loadTexture: () => null,
  playVfx: () => {},
  updateHud: () => {},
  scheduleTableSync: () => {},
  clearPointerHover: () => {},
  onObjectsCleared: () => {},
  onObjectRemoved: () => {}
};

// Recebe as dependencias usadas pelo sistema de objetos soltos.
function setupObjectSystem(options = {}) {
  objectState.getScene = options.getScene || objectState.getScene;
  objectState.getWorld = options.getWorld || objectState.getWorld;
  objectState.getRenderer = options.getRenderer || objectState.getRenderer;
  objectState.getActivePlayer = options.getActivePlayer || objectState.getActivePlayer;
  objectState.loadTexture = options.loadTexture || objectState.loadTexture;
  objectState.playVfx = options.playVfx || objectState.playVfx;
  objectState.updateHud = options.updateHud || objectState.updateHud;
  objectState.scheduleTableSync = options.scheduleTableSync || objectState.scheduleTableSync;
  objectState.clearPointerHover = options.clearPointerHover || objectState.clearPointerHover;
  objectState.onObjectsCleared = options.onObjectsCleared || objectState.onObjectsCleared;
  objectState.onObjectRemoved = options.onObjectRemoved || objectState.onObjectRemoved;
}

// Cria uma moeda fisica de ouro ou prata na mesa.
function spawnCoin(type = 'gold', options = {}) {
  const scene = objectState.getScene();
  const world = objectState.getWorld();
  if (!scene || !world) return null;

  const id = options.id || createSharedEntityId('coin');
  if (!options.id) objectState.objectId += 1;
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
  mesh.userData.locked = Boolean(options.locked);

  const spawnPlayer = options.playerId || objectState.getActivePlayer();
  const initialPosition = vectorFromSnapshot(options.position, getCoinSpawnPosition(spawnPlayer));
  const initialQuaternion = quaternionFromSnapshot(
    options.quaternion,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(random(-0.3, 0.3), random(0, Math.PI * 2), random(-0.3, 0.3)))
  );
  mesh.position.copy(initialPosition);
  mesh.quaternion.copy(initialQuaternion);

  const bodyDescriptor = options.locked
    ? RAPIER.RigidBodyDesc.kinematicPositionBased()
    : RAPIER.RigidBodyDesc.dynamic()
      .setLinearDamping(1.65)
      .setAngularDamping(1.95);
  const body = world.createRigidBody(
    bodyDescriptor
      .setTranslation(initialPosition.x, initialPosition.y, initialPosition.z)
      .setRotation(initialQuaternion)
  );
  const collider = RAPIER.ColliderDesc.cylinder(COIN_HEIGHT / 2, radius);
  collider.setDensity(1.2);
  collider.setFriction(1.4);
  collider.setRestitution(0.18);
  const bodyCollider = world.createCollider(collider, body);

  scene.add(mesh);
  const object = {
    id,
    kind: mesh.userData.kind,
    locked: Boolean(options.locked),
    mesh,
    body,
    collider: bodyCollider
  };
  objectState.objects.set(id, object);
  if (!options.silent) objectState.playVfx('falling-coin');
  objectState.updateHud();
  objectState.scheduleTableSync();
  return object;
}

// Cria um dado fisico e inicia uma rolagem curta.
function spawnDie(options = {}) {
  const scene = objectState.getScene();
  const world = objectState.getWorld();
  if (!scene || !world) return null;

  const id = options.id || createSharedEntityId('die');
  if (!options.id) objectState.objectId += 1;
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

  const body = world.createRigidBody(
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
  const bodyCollider = world.createCollider(collider, body);

  scene.add(mesh);
  const object = { id, kind: 'die', mesh, body, collider: bodyCollider };
  objectState.objects.set(id, object);
  if (!options.silent) rollSingleDie(object, 0.75);
  objectState.updateHud();
  objectState.scheduleTableSync();
  return object;
}

// Rola todos os dados existentes ou cria um dado se nao houver nenhum.
function rollDice() {
  const dice = getTableObjects().filter(object => object.kind === 'die');
  if (dice.length === 0) {
    spawnDie();
    return;
  }

  dice.forEach((die, index) => rollSingleDie(die, index * 0.12));
}

// Remove moedas e dados da mesa.
function clearTableObjects(update = true) {
  const scene = objectState.getScene();
  const world = objectState.getWorld();
  objectState.clearPointerHover();

  objectState.objects.forEach((object) => {
    scene?.remove(object.mesh);
    world?.removeRigidBody(object.body);
  });
  objectState.objects.clear();
  objectState.onObjectsCleared();

  if (update) {
    objectState.updateHud();
    objectState.scheduleTableSync();
  }
}

// Remove um objeto solto especifico da mesa.
function removeTableObject(object, options = {}) {
  const scene = objectState.getScene();
  const world = objectState.getWorld();
  if (!object) return;

  objectState.clearPointerHover();
  scene?.remove(object.mesh);
  world?.removeRigidBody(object.body);
  objectState.objects.delete(object.id);
  objectState.onObjectRemoved(object.id);

  if (options.update !== false) {
    objectState.updateHud();
    objectState.scheduleTableSync();
  }
}

// Retorna todos os objetos soltos atuais.
function getTableObjects() {
  return [...objectState.objects.values()];
}

// Executa uma funcao para cada objeto solto atual.
function forEachTableObject(callback) {
  objectState.objects.forEach(callback);
}

// Retorna os meshes de objetos soltos para raycast.
function getObjectMeshes() {
  return getTableObjects().map(object => object.mesh);
}

// Busca objeto solto por ID.
function getObjectById(id) {
  return objectState.objects.get(id) || null;
}

// Retorna quantos objetos soltos existem na mesa.
function getObjectCount() {
  return objectState.objects.size;
}

// Retorna o proximo contador serializado de objetos.
function getObjectId() {
  return objectState.objectId;
}

// Define o contador vindo de um snapshot remoto.
function setObjectId(value) {
  objectState.objectId = Math.max(Number(value) || 1, 1);
}

// Mantem o contador de objetos acima dos IDs restaurados.
function bumpObjectIdFrom(id) {
  const number = Number(String(id).match(/(\d+)$/)?.[1]);
  if (!Number.isNaN(number)) objectState.objectId = Math.max(objectState.objectId, number + 1);
}

// Identifica moedas para a interacao de duplo clique.
function isCoinObject(object) {
  return object?.kind === 'gold-coin' || object?.kind === 'silver-coin';
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

// Cria lateral metalica e textura igual na frente e no verso da moeda.
function makeCoinMaterials(type) {
  const isGold = type === 'gold';
  const texture = objectState.loadTexture(COIN_TEXTURES[type]);
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
  if (objectState.dieTextures.has(key)) return objectState.dieTextures.get(key);

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
  texture.anisotropy = Math.min(objectState.getRenderer()?.capabilities?.getMaxAnisotropy?.() || 1, 8);
  objectState.dieTextures.set(key, texture);
  return texture;
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

// Cria IDs compartilhados que nao colidem entre dois jogadores simultaneos.
function createSharedEntityId(prefix) {
  const uid = String(window.CoupMaster3DOnline?.user?.uid || 'local')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${uid}-${randomPart}`;
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

// Converte Euler para quaternion aceito pelo Rapier.
function rapierQuatFromEuler(x, y, z) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}

// Numero aleatorio inclusivo de intervalo continuo.
function random(min, max) {
  return min + Math.random() * (max - min);
}

export {
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
};
