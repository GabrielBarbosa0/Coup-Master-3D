import * as THREE from 'three';

// Converte o mesh atingido pelo raycast no objeto logico correto.
function getHoverPieceFromMesh(mesh, options) {
  const {
    deckMesh,
    cards,
    getTopStackCard,
    getObjectById
  } = options;

  if (mesh.userData.deck) return { mesh: deckMesh, kind: 'deck' };

  const card = cards.get(mesh.userData.cardId);
  if (card) return getTopStackCard(card);

  const object = getObjectById(mesh.userData.objectId);
  return object || null;
}

// Define o texto acessivel exibido no tooltip de hover.
function getHoverLabelForPiece(piece, options) {
  const {
    cardLabels,
    specialCardLabels,
    canRevealCardFace,
    getCardStack,
    getStackHoverSummary,
    getTranslatedCardLabels,
    t
  } = options;

  if (!piece) return '';
  if (piece.kind === 'deck') return t('three.pieces.deck', {}, 'Baralho');
  if (piece.kind === 'gold-coin') return t('three.pieces.goldCoin', {}, 'Moeda de ouro');
  if (piece.kind === 'silver-coin') return t('three.pieces.silverCoin', {}, 'Moeda de prata');
  if (piece.kind === 'die') return t('three.pieces.die', {}, 'Dado');
  if (!piece.data) return '';

  return getCardHoverLabel(piece, {
    cardLabels,
    specialCardLabels,
    canRevealCardFace,
    getCardStack,
    getStackHoverSummary,
    getTranslatedCardLabels,
    t
  });
}

// Monta o texto de hover para carta solta ou pilha aberta.
function getCardHoverLabel(card, options) {
  const {
    cardLabels,
    specialCardLabels,
    canRevealCardFace,
    getCardStack,
    getStackHoverSummary,
    getTranslatedCardLabels,
    t
  } = options;

  if (card.data.specialCard) {
    const labels = specialCardLabels[card.data.type];
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
    return t(`three.cards.${card.data.type}`, {}, cardLabels[card.data.type] || card.data.type);
  }

  return getStackHoverSummary(stack, getTranslatedCardLabels());
}

// Cria a malha de outline branca ao redor do objeto em hover.
function createHoverOutline(piece, options) {
  const {
    deckCount,
    scene
  } = options;

  if (piece.kind === 'deck' && deckCount <= 0) return null;

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
  scene.add(outline);
  return outline;
}

// Mantem a outline alinhada com o objeto em movimento.
function syncHoverOutlineToPiece(outline, piece) {
  if (!outline || !piece) return;
  outline.position.copy(piece.mesh.position);
  outline.quaternion.copy(piece.mesh.quaternion);
  outline.scale.copy(piece.mesh.scale).multiplyScalar(1.018);
}

// Descarta a geometria e material da outline atual.
function disposeHoverOutline(outline, scene) {
  if (!outline) return;
  scene.remove(outline);
  outline.geometry.dispose();
  outline.material.dispose();
}

// Seleciona automaticamente o objeto sob o mouse para atalhos de teclado.
function selectHoveredPiece(piece, state) {
  if (piece?.data) {
    state.selectedCard = piece;
    state.selectedObject = null;
    return;
  }

  if (piece?.kind && piece.kind !== 'deck') {
    state.selectedObject = piece;
    state.selectedCard = null;
  }
}

// Mostra o tooltip perto do cursor.
function showHoverTooltip(tooltipEl, label, x, y) {
  tooltipEl.textContent = label;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
}

// Oculta o tooltip de hover.
function hideHoverTooltip(tooltipEl) {
  tooltipEl.style.display = 'none';
}

// Atualiza a visualizacao ampliada quando Alt esta pressionado.
function shouldShowInspectOverlay(state) {
  return Boolean(state.inspectAltDown && !state.dragged && state.hoveredPiece);
}

// Exibe uma copia ampliada do objeto sob hover, sem interferir na fisica.
function showInspectOverlayForPiece(piece, state, hideTooltip) {
  const key = getInspectPieceKey(piece);
  if (!piece?.mesh || !key || state.inspectedPieceKey === key) return;

  clearInspectClone(state);
  state.inspectedPiece = piece;
  state.inspectedPieceKey = key;

  const clone = piece.mesh.clone(true);
  normalizeInspectCloneOrientation(clone, piece);
  clone.position.set(0, 0, 0);
  clone.updateMatrixWorld(true);
  state.inspectGroup.add(clone);
  state.inspectClone = clone;

  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  clone.position.sub(center);

  const fitSize = Math.max(size.x, size.z, size.y * 0.8, 0.1);
  const scale = THREE.MathUtils.clamp(1.55 / fitSize, 1.1, 5.8);
  state.inspectGroup.scale.setScalar(scale);
  state.inspectGroup.position.set(0, 0, 0);
  state.inspectGroup.visible = true;
  hideTooltip();
}

// Oculta a visualizacao ampliada do Alt.
function hideInspectOverlayForState(state, options = {}) {
  const { resetAlt = true } = options;
  if (resetAlt) state.inspectAltDown = false;
  clearInspectClone(state);
}

// Remove o clone usado pela visualizacao ampliada sem descartar materiais compartilhados.
function clearInspectClone(state) {
  if (state.inspectClone) {
    state.inspectGroup?.remove(state.inspectClone);
  }
  state.inspectClone = null;
  state.inspectedPiece = null;
  state.inspectedPieceKey = null;
  if (state.inspectGroup) state.inspectGroup.visible = false;
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

export {
  clearInspectClone,
  createHoverOutline,
  disposeHoverOutline,
  getHoverLabelForPiece,
  getHoverPieceFromMesh,
  hideHoverTooltip,
  hideInspectOverlayForState,
  selectHoveredPiece,
  shouldShowInspectOverlay,
  showHoverTooltip,
  showInspectOverlayForPiece,
  syncHoverOutlineToPiece
};
