import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CARD_D,
  CARD_LABELS,
  DECK_DRAG_HOLD_MS,
  PLAY_RADIUS,
  SPECIAL_CARD_LABELS
} from './config.js';
import {
  beginAggregateDrag,
  beginKinematicPieceDrag,
  beginPendingDragGesture,
  clampDragTargetToRadius,
  consumeActiveDrag,
  didPendingGestureMove,
  endPendingDragGesture,
  getKinematicDragQuaternion,
  updateDragMovementFlag
} from './interaction-drag-controller.js';
import {
  clearInspectClone as clearInspectCloneState,
  createHoverOutline,
  disposeHoverOutline,
  getHoverLabelForPiece,
  getHoverPieceFromMesh,
  hideHoverTooltip as hideHoverTooltipElement,
  hideInspectOverlayForState,
  selectHoveredPiece as selectHoveredPieceForState,
  shouldShowInspectOverlay,
  showHoverTooltip as showHoverTooltipElement,
  showInspectOverlayForPiece,
  syncHoverOutlineToPiece
} from './hover-inspect-service.js';

// Centraliza gestos de ponteiro, hover, raycast e arrasto da mesa 3D.
function createPointerInteractionController(options) {
  const {
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
    isSandboxInteractionAllowed = () => true,
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
  } = options;

  // Resolve clique inicial em deck, carta, pilha ou objeto.
  function onPointerDown(event) {
    if (!isSandboxInteractionAllowed()) return;
    setPointer(event);

    const hits = getIntersections([app.deckMesh, ...getCardMeshes(), ...getObjectMeshes()]);
    const hit = hits[0];
    if (!hit) return;

    if (hit.object.userData.deck) {
      beginPendingDeckGesture(event);
      return;
    }

    const hitCard = app.cards.get(hit.object.userData.cardId);
    if (hitCard) {
      const stack = getCardStack(hitCard);
      let card = stack ? getTopStackCard(hitCard) : hitCard;

      if (!isCardOverDeckGesture(card, event) && isCardDoubleClick(card, event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        app.lastCardClick = null;
        tryReturnCardToDeck(card, true);
        return;
      }

      if (stack) {
        app.selectedCard = card;
        beginPendingDragGesture(event, {
          canvas,
          controls: app.controls,
          state: app,
          key: 'pendingStackDrag',
          extra: { stackId: stack.id }
        });
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
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
    event.stopImmediatePropagation();
    beginDrag(event, object, 'object');
    app.selectedObject = object;
  }

  // Atualiza gestos pendentes, arrastos e hover durante movimento do mouse.
  function onPointerMove(event) {
    if (!isSandboxInteractionAllowed()) {
      updatePointerHover(event);
      return;
    }

    if (app.pendingDeckDrag && !app.dragged) {
      if (!didPendingGestureMove(app.pendingDeckDrag, event)) return;
      if (performance.now() - app.pendingDeckDrag.startedAt >= DECK_DRAG_HOLD_MS) {
        startDeckDrag(event);
      } else {
        startDeckCardDrag(event);
      }
    }

    if (app.pendingStackDrag && !app.dragged) {
      if (!didPendingGestureMove(app.pendingStackDrag, event)) return;
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
    event.stopImmediatePropagation();
    clearPointerHover();
    updateDragMovementFlag(app, event);

    if (!rayToPlane(event, app.dragPoint)) return;

    const next = clampDragTargetToRadius(app.dragPoint.clone().add(app.dragOffset), PLAY_RADIUS);

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

    const quat = getKinematicDragQuaternion(app.dragged, app.dragMode, app.dragQuat);
    app.dragged.body.setNextKinematicTranslation(next);
    app.dragged.body.setNextKinematicRotation(quat);
    updateHoveredDrop(event);
  }

  // Finaliza clique, arrasto de objeto, deck, pilha ou carta.
  function onPointerUp(event) {
    if (!isSandboxInteractionAllowed()) return;

    if (app.pendingDeckDrag && !app.dragged) {
      endPendingDragGesture(event, {
        canvas,
        controls: app.controls,
        state: app,
        key: 'pendingDeckDrag'
      });
      drawCardToPlayer(state.activePlayer);
      return;
    }

    if (app.pendingStackDrag && !app.dragged) {
      endPendingDragGesture(event, {
        canvas,
        controls: app.controls,
        state: app,
        key: 'pendingStackDrag'
      });
      return;
    }

    if (!app.dragged) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const { piece, mode, wasDragged } = consumeActiveDrag(app);
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

  // Fallback de duplo clique nativo para remover moedas ou devolver carta ao deck.
  function onDoubleClick(event) {
    if (!isSandboxInteractionAllowed()) return;
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

  // Inicia clique/arrasto no deck quando o raycast acerta o baralho diretamente.
  function beginPendingDeckGesture(event) {
    beginPendingDragGesture(event, {
      canvas,
      controls: app.controls,
      state: app,
      key: 'pendingDeckDrag'
    });
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
    return getHoverPieceFromMesh(mesh, {
      deckMesh: app.deckMesh,
      cards: app.cards,
      getTopStackCard,
      getObjectById
    });
  }

  // Define o texto acessivel exibido no tooltip de hover.
  function getHoverLabel(piece) {
    return getHoverLabelForPiece(piece, {
      cardLabels: CARD_LABELS,
      specialCardLabels: SPECIAL_CARD_LABELS,
      canRevealCardFace,
      getCardStack,
      getStackHoverSummary,
      getTranslatedCardLabels,
      t
    });
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
    app.hoverOutline = createHoverOutline(piece, {
      deckCount: state.deck.length,
      scene: app.scene
    });
    syncHoverOutline();
  }

  // Mantem a outline alinhada com o objeto em movimento.
  function syncHoverOutline() {
    syncHoverOutlineToPiece(app.hoverOutline, app.hoveredPiece);
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
    selectHoveredPieceForState(piece, app);
  }

  // Descarta a geometria e material da outline atual.
  function clearHoverOutline() {
    disposeHoverOutline(app.hoverOutline, app.scene);
    app.hoverOutline = null;
  }

  // Mostra o tooltip perto do cursor.
  function showHoverTooltip(label, x, y) {
    showHoverTooltipElement(hoverTooltipEl, label, x, y);
  }

  // Oculta o tooltip de hover.
  function hideHoverTooltip() {
    hideHoverTooltipElement(hoverTooltipEl);
  }

  // Atualiza a visualizacao ampliada quando Alt esta pressionado.
  function updateInspectOverlay() {
    if (!shouldShowInspectOverlay(app)) {
      clearInspectClone();
      return;
    }

    showInspectOverlay(app.hoveredPiece);
  }

  // Exibe uma copia ampliada do objeto sob hover, sem interferir na fisica.
  function showInspectOverlay(piece) {
    showInspectOverlayForPiece(piece, app, hideHoverTooltip);
  }

  // Oculta a visualizacao ampliada do Alt.
  function hideInspectOverlay({ resetAlt = true } = {}) {
    hideInspectOverlayForState(app, { resetAlt });
  }

  // Remove o clone usado pela visualizacao ampliada sem descartar materiais compartilhados.
  function clearInspectClone() {
    clearInspectCloneState(app);
  }

  // Prepara uma peca para arrasto cinematico sem empurrar outros objetos.
  function beginDrag(event, piece, mode) {
    if (!isSandboxInteractionAllowed()) return false;
    beginKinematicPieceDrag(event, piece, mode, {
      canvas,
      controls: app.controls,
      state: app,
      hideInspectOverlay,
      clearPointerHover,
      setPieceSensor,
      rayToPlane
    });
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
    beginAggregateDrag(event, app.deckMesh, 'deck', {
      controls: app.controls,
      state: app,
      rayToPlane,
      getPosition: deck => deck.position
    });
  }

  // Finaliza o arrasto do deck e atualiza seu collider.
  function finishDeckDrag() {
    app.dragOrigin = null;
    syncDeckRim();
    updateDeckCollider();
    scheduleTableSync();
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

  // Evita que cliques no deck atinjam cartas recém-compradas ainda em trânsito.
  function isCardOverDeckGesture(card, event) {
    return Boolean(card?.target) && isPointerOverDeck(event);
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

  // Converte coordenadas de tela em coordenadas normalizadas para raycast.
  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    app.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    app.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  return {
    beginDrag,
    clearDropHover,
    clearInspectClone,
    clearPointerHover,
    hideInspectOverlay,
    isPointerOverDeck,
    isStackOverDeck,
    onDoubleClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    rayToPlane,
    setPointer,
    syncHoverOutline,
    updateInspectOverlay
  };
}

export {
  createPointerInteractionController
};
