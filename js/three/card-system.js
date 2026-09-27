import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  ASYLUM_CARD_AREA_SCALE,
  ASYLUM_CARD_ASPECT,
  CARD_D,
  CARD_H,
  CARD_RADIUS,
  CARD_W,
  RELIGION_CARD_ASPECT,
  RELIGION_CARD_HEIGHT_SCALE,
  SPECIAL_CARD_TEXTURES
} from './config.js';

const cardSystem = {
  getScene: null,
  getWorld: null,
  getViewPlayer: null,
  loadTexture: null
};

// Configura dependencias compartilhadas usadas pela fabrica de cartas.
export function setupCardSystem(options) {
  cardSystem.getScene = options.getScene;
  cardSystem.getWorld = options.getWorld;
  cardSystem.getViewPlayer = options.getViewPlayer;
  cardSystem.loadTexture = options.loadTexture;
}

// Cria mesh, corpo fisico e dados de runtime para uma carta.
export function createCardObject(data) {
  const scene = cardSystem.getScene?.();
  const world = cardSystem.getWorld?.();
  if (!scene || !world) return null;

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
  const body = world.createRigidBody(bodyDesc);
  const collider = RAPIER.ColliderDesc.cuboid(dimensions.width / 2, CARD_D / 2, dimensions.height / 2);
  collider.setDensity(0.36);
  collider.setFriction(1.6);
  collider.setRestitution(0.08);
  const bodyCollider = world.createCollider(collider, body);

  scene.add(mesh);

  return {
    id: data.id,
    data,
    mesh,
    body,
    collider: bodyCollider,
    target: null,
    targetQuat: null,
    flip: null
  };
}

// Atualiza o material da carta quando ela vira, muda de dono ou troca a visao local.
export function refreshCardMaterial(card) {
  const texturePaths = getCardTexturePaths(card.data);
  card.mesh.material = makeCardMaterials(
    texturePaths.front,
    canRevealCardFace(card.data),
    null,
    texturePaths.back,
    isPrivateSlotCardHidden(card.data)
  );
}

// Gera a geometria extrudada da carta com cantos arredondados reais.
export function createRoundedCardGeometry(width, height, depth, radius, segments = 10) {
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
export function createRoundedRectShape(width, height, radius) {
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

// Cria materiais da lateral, frente e verso de uma carta.
function makeCardMaterials(frontPath, faceUp, edgeColor = null, backPath = 'assets/img/cards/base/back.png', hideFront = false) {
  const frontTexture = loadCardTexture(frontPath);
  const backTexture = loadCardTexture(backPath);
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

// Define cartas que continuam publicas mesmo quando estao em um slot de jogador.
function isPublicSlotCard(data) {
  return data?.type === 'religiao';
}

// Identifica carta privada de outro slot que nao pode revelar textura nem durante flip.
function isPrivateSlotCardHidden(data) {
  const viewPlayer = cardSystem.getViewPlayer?.();
  return Boolean(data?.owner) && data.owner !== viewPlayer && !isPublicSlotCard(data);
}

// Define se a face da carta pode ser mostrada nesta tela.
export function canRevealCardFace(data) {
  const viewPlayer = cardSystem.getViewPlayer?.();
  if (isPublicSlotCard(data)) return Boolean(data?.faceUp);
  if (!data?.owner) return Boolean(data?.faceUp);
  return data.owner === viewPlayer && Boolean(data.faceUp);
}

// Carrega texturas usando o cache compartilhado do app principal.
function loadCardTexture(path) {
  return cardSystem.loadTexture(path);
}
