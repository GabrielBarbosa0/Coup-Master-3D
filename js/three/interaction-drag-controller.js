import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Registra um gesto pendente ate sabermos se sera clique, compra rapida ou arrasto longo.
function beginPendingDragGesture(event, options) {
  const {
    canvas,
    controls,
    state,
    key,
    extra = {}
  } = options;

  event.preventDefault();
  event.stopImmediatePropagation();
  canvas.setPointerCapture(event.pointerId);
  controls.enabled = false;
  state[key] = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedAt: performance.now(),
    ...extra
  };
}

// Finaliza um gesto pendente sem iniciar arrasto.
function endPendingDragGesture(event, options) {
  const {
    canvas,
    controls,
    state,
    key
  } = options;

  event.preventDefault();
  event.stopImmediatePropagation();
  canvas.releasePointerCapture?.(event.pointerId);
  controls.enabled = true;
  state[key] = null;
}

// Mede se o ponteiro ja saiu da zona morta de clique.
function didPendingGestureMove(gesture, event, threshold = 6) {
  if (!gesture) return false;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  return Math.hypot(dx, dy) > threshold;
}

// Prepara carta, moeda, dado ou extra para arrasto cinematico.
function beginKinematicPieceDrag(event, piece, mode, options) {
  const {
    canvas,
    controls,
    state,
    hideInspectOverlay,
    clearPointerHover,
    setPieceSensor,
    rayToPlane
  } = options;

  event.preventDefault();
  hideInspectOverlay();
  clearPointerHover();
  canvas.setPointerCapture(event.pointerId);
  controls.enabled = false;
  state.dragged = piece;
  state.dragMode = mode;
  state.dragQuat = piece.mesh.quaternion.clone();
  state.dragStart = { x: event.clientX, y: event.clientY };
  state.hasDragged = false;

  setPieceSensor(piece, true);
  piece.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  piece.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  piece.body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  if (rayToPlane(event, state.dragPoint)) {
    const pos = piece.mesh.position;
    state.dragOffset.copy(pos).sub(state.dragPoint);
    state.dragOffset.y = 0.5;
  } else {
    state.dragOffset.set(0, 0.5, 0);
  }
}

// Prepara uma entidade agregada, como deck ou pilha, para arrasto.
function beginAggregateDrag(event, piece, mode, options) {
  const {
    controls,
    state,
    rayToPlane,
    getPosition
  } = options;

  event.preventDefault();
  controls.enabled = false;
  state.dragged = piece;
  state.dragMode = mode;
  state.dragStart = { x: event.clientX, y: event.clientY };
  state.hasDragged = true;

  const position = getPosition(piece);
  if (rayToPlane(event, state.dragPoint)) {
    state.dragOffset.copy(position).sub(state.dragPoint);
    state.dragOffset.y = 0;
  } else {
    state.dragOffset.set(0, 0, 0);
  }
}

// Marca que um arrasto ativo ja passou da zona morta.
function updateDragMovementFlag(state, event, threshold = 6) {
  if (!state.dragStart) return;
  const dx = event.clientX - state.dragStart.x;
  const dy = event.clientY - state.dragStart.y;
  if (Math.hypot(dx, dy) > threshold) state.hasDragged = true;
}

// Limita o destino do arrasto ao raio jogavel da mesa.
function clampDragTargetToRadius(target, playRadius) {
  const distance = Math.hypot(target.x, target.z);
  if (distance > playRadius) {
    target.multiplyScalar(playRadius / distance);
  }
  return target;
}

// Retorna a rotacao que deve ser aplicada no corpo cinematico arrastado.
function getKinematicDragQuaternion(piece, mode, dragQuat) {
  if (mode === 'card') return dragQuat;
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, piece.mesh.rotation.y, 0.08));
}

// Limpa o estado de arrasto ativo, devolvendo um snapshot do que estava em curso.
function consumeActiveDrag(state) {
  const drag = {
    piece: state.dragged,
    mode: state.dragMode,
    wasDragged: state.hasDragged
  };

  state.dragged = null;
  state.dragMode = null;
  state.dragQuat = null;
  state.dragStart = null;
  state.hasDragged = false;
  return drag;
}

export {
  beginAggregateDrag,
  beginKinematicPieceDrag,
  beginPendingDragGesture,
  clampDragTargetToRadius,
  consumeActiveDrag,
  didPendingGestureMove,
  endPendingDragGesture,
  getKinematicDragQuaternion,
  updateDragMovementFlag
};
