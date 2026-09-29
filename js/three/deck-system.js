import * as THREE from 'three';
import {
  CARD_D,
  CARD_H,
  CARD_LIBRARY,
  CARD_RADIUS,
  CARD_REST_Y,
  CARD_W,
  DECK_BASE_HEIGHT,
  DECK_ROTATION_Y,
  DECK_STACK_GAP
} from './config.js';

// Monta e embaralha o baralho a partir da configuracao atual.
function buildDeck(deckConfig, clampDeckCopyCount) {
  const cards = [];
  let id = 1;

  CARD_LIBRARY.forEach((def) => {
    const totalCopies = clampDeckCopyCount(deckConfig[def.type]);
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

// Retira do deck a carta solicitada pelo evento ou a carta do topo local.
function takeDeckCard(deck, cardData = null, hasRuntimeCard = () => false, cloneCardData = data => data) {
  if (cardData?.id) {
    const deckIndex = deck.findIndex(data => data.id === cardData.id);
    if (deckIndex >= 0) return deck.splice(deckIndex, 1)[0];
    if (hasRuntimeCard(cardData.id)) return null;
    return cloneCardData(cardData);
  }

  return deck.pop() || null;
}

// Embaralha a ordem interna do deck.
function shuffleDeck(deck) {
  return shuffle(deck);
}

// Retorna a altura visual/fisica atual do deck real.
function getDeckHeight(deck) {
  const layerCount = getVisibleDeckLayerCount(deck);
  if (layerCount <= 1) return CARD_D;
  return layerCount * CARD_D + (layerCount - 1) * DECK_STACK_GAP;
}

// Retorna o espacamento vertical entre cartas reais do deck.
function getDeckLayerStep() {
  return CARD_D + DECK_STACK_GAP;
}

// Limita a altura visual do deck sem alterar a quantidade real de cartas.
function getVisibleDeckLayerCount(deck) {
  return Math.min(deck.length, 8);
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
function makeDeckLayerMaterials(showBack, loadTexture) {
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

// Cria o mesh clicavel do deck, ainda sem adiciona-lo na cena.
function createDeckMesh(options) {
  const {
    createRoundedCardGeometry,
    deckHeight
  } = options;

  const geo = createRoundedCardGeometry(CARD_W, CARD_H, DECK_BASE_HEIGHT, CARD_RADIUS);
  const mesh = new THREE.Mesh(geo, makeDeckHitMaterials());
  mesh.position.set(0, CARD_REST_Y + deckHeight / 2, 0);
  mesh.rotation.y = DECK_ROTATION_Y;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = 'deck';
  mesh.userData.deck = true;
  return mesh;
}

// Recria a pilha visual do deck com uma camada para cada carta real.
function updateDeckVisualLayers(options) {
  const {
    deckMesh,
    deckVisualCount,
    force = false,
    layerCount,
    deckHeight,
    deckLayerStep,
    createRoundedCardGeometry,
    loadTexture
  } = options;

  if (!deckMesh) return deckVisualCount;
  if (!force && deckVisualCount === layerCount) return deckVisualCount;

  clearDeckVisualLayers(deckMesh);
  if (layerCount <= 0) return layerCount;

  const layerGeo = createRoundedCardGeometry(CARD_W, CARD_H, CARD_D, CARD_RADIUS);
  for (let i = 0; i < layerCount; i++) {
    const layer = new THREE.Mesh(layerGeo, makeDeckLayerMaterials(i === layerCount - 1, loadTexture));
    layer.position.y = -deckHeight / 2 + CARD_D / 2 + i * deckLayerStep;
    layer.castShadow = i === layerCount - 1;
    layer.receiveShadow = true;
    layer.name = `deck-layer-${i + 1}`;
    deckMesh.add(layer);
  }

  return layerCount;
}

// Remove camadas visuais antigas do deck antes de reconstruir.
function clearDeckVisualLayers(deckMesh) {
  if (!deckMesh) return;

  while (deckMesh.children.length > 0) {
    const child = deckMesh.children.pop();
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach(material => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  }
}

// Adiciona o aro branco superior que destaca a borda do deck.
function createDeckRim(options) {
  const { createRoundedRectShape } = options;
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

  const rim = new THREE.Mesh(geo, mat);
  rim.name = 'deck-rim';
  return rim;
}

// Mantem o hitbox invisivel do deck com a mesma altura da pilha real.
function syncDeckHitboxGeometry(options) {
  const {
    deckMesh,
    deckHitHeight,
    deckHeight,
    createRoundedCardGeometry
  } = options;

  if (!deckMesh) return deckHitHeight;
  if (Math.abs(deckHitHeight - deckHeight) < 0.0001) return deckHitHeight;

  deckMesh.geometry.dispose();
  deckMesh.geometry = createRoundedCardGeometry(CARD_W, CARD_H, deckHeight, CARD_RADIUS);
  return deckHeight;
}

// Mantem o aro visual do deck alinhado ao deck.
function syncDeckRim(options) {
  const {
    deckMesh,
    deckRim,
    deckHeight,
    deckCount
  } = options;

  if (!deckRim || !deckMesh) return;

  deckRim.position.set(
    deckMesh.position.x,
    deckMesh.position.y + deckHeight / 2 + 0.004,
    deckMesh.position.z
  );
  deckRim.rotation.set(0, deckMesh.rotation.y, 0);
  deckRim.visible = deckCount > 0;
}

// Embaralha uma lista usando Fisher-Yates.
function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export {
  buildDeck,
  clearDeckVisualLayers,
  createDeckMesh,
  createDeckRim,
  getDeckHeight,
  getDeckLayerStep,
  getVisibleDeckLayerCount,
  makeDeckHitMaterials,
  makeDeckLayerMaterials,
  shuffle,
  shuffleDeck,
  syncDeckHitboxGeometry,
  syncDeckRim,
  updateDeckVisualLayers,
  takeDeckCard
};
