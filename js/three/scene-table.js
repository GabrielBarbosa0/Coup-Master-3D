import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  FELT_RADIUS,
  HAND_RADIUS,
  PLAY_RADIUS,
  PLAYER_COUNT,
  TABLE_PHYSICS_RADIUS,
  TABLE_RADIUS,
  TABLE_TEXTURES
} from './config.js';

// Cria a iluminacao global e os pontos de destaque da mesa.
function createLights(scene) {
  const ambient = new THREE.HemisphereLight(0xb8d4ff, 0x151a22, 1.75);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xf3f8ff, 2.55);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);

  const rim = new THREE.PointLight(0x4aa6ff, 28, 12);
  rim.position.set(3.8, 2.2, -3.2);
  scene.add(rim);
}

// Monta a mesa visual, o feltro, o chao do limbo e o collider do tampo.
function createTable({ scene, world, loadTexture }) {
  const tableGeo = new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.34, 8, 1, false, Math.PI / 8);
  const tableMat = new THREE.MeshStandardMaterial({
    map: makeRepeatingTexture(loadTexture, TABLE_TEXTURES.wood, 4, 4),
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04
  });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.y = -0.17;
  table.receiveShadow = true;
  scene.add(table);

  const feltGeo = new THREE.CylinderGeometry(FELT_RADIUS, FELT_RADIUS, 0.045, 8, 1, false, Math.PI / 8);
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x15202a,
    roughness: 0.92,
    metalness: 0.02
  });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 0.005;
  felt.receiveShadow = true;
  scene.add(felt);

  const floorGeo = new THREE.PlaneGeometry(45, 45);
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x171d26 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.005, 0));
  const groundCollider = RAPIER.ColliderDesc.cylinder(0.05, TABLE_PHYSICS_RADIUS);
  groundCollider.setFriction(1.25);
  groundCollider.setRestitution(0.12);
  world.createCollider(groundCollider, groundBody);

  return table;
}

// Adiciona paredes fisicas invisiveis ao redor da mesa octogonal.
function createBoundaries(world) {
  const wallHeight = 0.08;
  const wallY = -0.01;
  const wallThickness = 0.18;
  const sideLength = 2 * TABLE_RADIUS * Math.sin(Math.PI / 8);
  const apothem = TABLE_RADIUS * Math.cos(Math.PI / 8);

  for (let i = 0; i < PLAYER_COUNT; i++) {
    const angle = Math.PI / 8 + (i * Math.PI * 2) / PLAYER_COUNT;
    const x = Math.cos(angle) * apothem;
    const z = Math.sin(angle) * apothem;
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, wallY, z)
        .setRotation(rapierQuatFromEuler(0, -angle, 0))
    );
    const collider = RAPIER.ColliderDesc.cuboid(sideLength / 2, wallHeight / 2, wallThickness / 2);
    collider.setFriction(0.7);
    collider.setRestitution(0.28);
    world.createCollider(collider, body);
  }
}

// Cria as areas visuais onde cartas podem ser soltas.
function createDropZones({ scene, viewPlayer }) {
  const dropZones = [];

  const tableZone = makeOctagonZone(scene, 'table', 0, 0, PLAY_RADIUS * 1.38 * 0.45, 0x1d5d8f, 0.08);
  dropZones.push(tableZone);

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const pos = getPlayerSeatPosition(i);
    const zone = makeZone(scene, `player-${i}`, pos.x, pos.z, 1.90, 1.25, i === viewPlayer ? 0x18f28a : 0x3da3ff, 0.16);
    zone.userData.playerId = i;
    zone.rotation.z = -getPlayerAngle(i) + Math.PI / 2;
    dropZones.push(zone);
  }

  syncDropZoneFocus(dropZones, viewPlayer);
  return dropZones;
}

// Atualiza destaque de zonas de mao conforme jogador observado.
function syncDropZoneFocus(dropZones, playerId) {
  dropZones.forEach((zone) => {
    if (!zone.userData.playerId) return;
    const active = zone.userData.playerId === playerId;
    zone.material.color.set(active ? 0x18f28a : 0x3da3ff);
    zone.material.opacity = active ? 0.24 : zone.userData.baseOpacity;
  });
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

// Carrega uma textura de mesa com repeticao para evitar esticamento visual.
function makeRepeatingTexture(loadTexture, path, repeatX, repeatY) {
  const texture = loadTexture(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// Cria uma zona retangular de drop para a mao de um jogador.
function makeZone(scene, id, x, z, width, depth, color, opacity) {
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
  scene.add(zone);
  return zone;
}

// Cria a zona central octogonal de drop da mesa.
function makeOctagonZone(scene, id, x, z, radius, color, opacity) {
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
  scene.add(zone);
  return zone;
}

// Converte Euler para quaternion aceito pelo Rapier.
function rapierQuatFromEuler(x, y, z) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
}

export {
  createBoundaries,
  createDropZones,
  createLights,
  createTable,
  getPlayerAngle,
  getPlayerSeatPosition,
  syncDropZoneFocus
};
