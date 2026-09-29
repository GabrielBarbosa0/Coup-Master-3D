import * as THREE from 'three';

// Clona dados serializaveis para evitar referencias mutaveis entre estado e rede.
function cloneSerializable(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

// Clona dados de carta para snapshots e payloads discretos.
function cloneCardData(data) {
  return cloneSerializable(data);
}

// Clona snapshots serializaveis usados como base da mesclagem transacional.
function cloneTableState(snapshot) {
  return cloneSerializable(snapshot);
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

// Serializa uma carta de runtime para entrada de snapshot.
function serializeRuntimeCard(card) {
  return {
    data: cloneCardData(card.data),
    position: serializeBodyPosition(card),
    quaternion: serializeBodyRotation(card)
  };
}

// Serializa um objeto de mesa para entrada de snapshot.
function serializeTableObject(object) {
  return {
    id: object.id,
    kind: object.kind,
    position: serializeBodyPosition(object),
    quaternion: serializeBodyRotation(object)
  };
}

// Serializa uma pilha de mesa para entrada de snapshot.
function serializeTableStack(stack) {
  return {
    id: stack.id,
    faceUp: stack.faceUp,
    cards: stack.cards.slice(),
    position: serializeVector(stack.position),
    rotationY: stack.rotationY
  };
}

// Normaliza uma pilha recebida de snapshot para uso interno.
function stackFromSnapshot(stack, fallbackPosition = new THREE.Vector3()) {
  return {
    id: stack.id,
    faceUp: Boolean(stack.faceUp),
    cards: Array.isArray(stack.cards) ? stack.cards.slice() : [],
    position: vectorFromSnapshot(stack.position, fallbackPosition),
    rotationY: Number(stack.rotationY) || 0
  };
}

// Monta o snapshot completo da mesa a partir dos provedores vivos do app.
function createTableStateSnapshot(options) {
  const {
    deckConfig,
    alternativeRuleDraw,
    deck,
    deckMesh,
    objectId,
    stackId,
    players,
    tableCards,
    cards,
    objects,
    stacks
  } = options;

  return {
    version: 1,
    deckConfig: { ...deckConfig },
    alternativeRuleDraw: alternativeRuleDraw ? cloneTableState(alternativeRuleDraw) : null,
    deck: deck.map(cloneCardData),
    deckTransform: serializeTransform(deckMesh),
    objectId,
    stackId,
    players: players.map(player => ({
      id: player.id,
      coinCount: Number(player.coinCount) || 0,
      cards: player.cards.map(cloneCardData)
    })),
    tableCards: tableCards.map(cloneCardData),
    cards: [...cards.values()].map(serializeRuntimeCard),
    objects: objects.map(serializeTableObject),
    stacks: stacks.map(serializeTableStack)
  };
}

export {
  cloneCardData,
  cloneSerializable,
  cloneTableState,
  createTableStateSnapshot,
  quaternionFromSnapshot,
  serializeBodyPosition,
  serializeBodyRotation,
  serializeQuaternion,
  serializeTableObject,
  serializeTableStack,
  serializeTransform,
  serializeVector,
  stackFromSnapshot,
  vectorFromSnapshot
};
