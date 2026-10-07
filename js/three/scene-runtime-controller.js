import RAPIER from '@dimforge/rapier3d-compat';
import {
  LIMBO_RADIUS,
  LIMBO_Y
} from './config.js';
import {
  easeInOutCubic,
  updateCardTweens
} from './animation-service.js';

// Controla o ciclo de renderizacao, fisica e atualizacoes por frame da cena.
function createSceneRuntimeController(options) {
  const {
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
    updateRankedDeckShift = () => {},
    updateRankedCoinAnimations = () => {},
    windowTarget = window
  } = options;

  let isRunning = false;

  // Inicia o loop principal apenas uma vez.
  function start() {
    if (isRunning) return;
    isRunning = true;
    animate();
  }

  // Loop principal de animacao, fisica e renderizacao.
  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - app.lastTime) / 1000, 0.033);
    app.lastTime = now;

    updateCardTweens(app.cards, dt, (_card, suppressSync) => {
      if (!suppressSync) scheduleTableSync();
    });
    updateFlipTweens(dt);
    updateCameraFocus(dt);
    updateDeckShuffle(dt);
    updateRankedDeckShift(dt);
    updateRankedCoinAnimations(dt);
    rescueLimboPieces();
    app.world.step();
    syncPhysicsMeshes();
    app.controls.update();
    updateCameraDebug();
    updatePlayerBadges();
    app.renderer.render(app.scene, app.camera);
    renderInspectOverlay();
  }

  // Renderiza a inspecao ampliada por cima da mesa atual.
  function renderInspectOverlay() {
    if (!app.inspectGroup?.visible || !app.inspectCamera || !app.inspectScene) return;
    const previousAutoClear = app.renderer.autoClear;
    app.renderer.autoClear = false;
    app.renderer.clearDepth();
    app.renderer.render(app.inspectScene, app.inspectCamera);
    app.renderer.autoClear = previousAutoClear;
  }

  // Sincroniza meshes visuais com corpos fisicos.
  function syncPhysicsMeshes() {
    app.cards.forEach((card) => {
      const pos = card.body.translation();
      const rot = card.body.rotation();
      card.mesh.position.set(pos.x, pos.y, pos.z);
      card.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    forEachTableObject((object) => {
      const pos = object.body.translation();
      const rot = object.body.rotation();
      object.mesh.position.set(pos.x, pos.y, pos.z);
      object.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    app.pointerInteractions.syncHoverOutline();
  }

  // Atualiza animacoes de flip das cartas.
  function updateFlipTweens(dt) {
    app.cards.forEach((card) => {
      if (!card.flip) return;

      const flip = card.flip;
      flip.progress = Math.min(1, flip.progress + dt * 3.8);
      const eased = easeInOutCubic(flip.progress);
      const rising = eased < 0.5;
      const localT = rising ? eased * 2 : (eased - 0.5) * 2;
      const pos = rising
        ? flip.startPosition.clone().lerp(flip.liftPosition, localT)
        : flip.liftPosition.clone().lerp(flip.startPosition, localT);
      const quat = rising
        ? flip.startQuat.clone().slerp(flip.liftQuat, localT)
        : flip.liftQuat.clone().slerp(flip.startQuat, localT);

      if (!flip.swapped && flip.progress >= 0.5) {
        card.data.faceUp = flip.nextFaceUp;
        refreshCardMaterial(card);
        flip.swapped = true;
      }

      card.body.setNextKinematicTranslation(pos);
      card.body.setNextKinematicRotation(quat);

      if (flip.progress >= 1) {
        card.body.setNextKinematicTranslation(flip.startPosition);
        card.body.setNextKinematicRotation(flip.startQuat);
        card.flip = null;

        if (flip.restoreDynamic) {
          card.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
          card.body.setLinvel({ x: 0, y: -0.08, z: 0 }, true);
          card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
        if (flip.shouldSync !== false) scheduleTableSync();
        flip.onComplete?.();
      }
    });
  }

  // Atualiza a animacao visual de embaralhar o deck.
  function updateDeckShuffle(dt) {
    if (!app.deckShuffle || !app.deckMesh) return;

    const shuffleState = app.deckShuffle;
    shuffleState.progress = Math.min(1, shuffleState.progress + dt * 2.8);
    const t = shuffleState.progress;
    const shake = Math.sin(t * Math.PI * 14) * (1 - t);
    const wobble = Math.sin(t * Math.PI * 22) * (1 - t);

    app.deckMesh.rotation.y = shuffleState.startRotation + t * Math.PI * 2 + wobble * 0.16;
    app.deckMesh.position.x = shuffleState.startPosition.x + shake * 0.08;
    app.deckMesh.position.z = shuffleState.startPosition.z + Math.cos(t * Math.PI * 12) * (1 - t) * 0.05;
    syncDeckRim();
    updateDeckCollider();

    if (t >= 1) {
      app.deckMesh.rotation.y = shuffleState.startRotation;
      app.deckMesh.position.copy(shuffleState.startPosition);
      app.deckShuffle = null;
      shuffleBtn.disabled = false;
      syncDeckRim();
      updateDeckCollider();
    }
  }

  // Resgata cartas e objetos que caem fora da mesa.
  function rescueLimboPieces() {
    app.cards.forEach((card) => {
      if (card.target || card.flip) return;
      const pos = card.body.translation();
      if (!isInLimbo(pos)) return;
      resetPieceToTable(card, 0.34);
    });

    forEachTableObject((object) => {
      const pos = object.body.translation();
      if (!isInLimbo(pos)) return;
      resetPieceToTable(object, object.kind.includes('coin') ? 0.28 : 0.48);
    });
  }

  // Detecta se uma peca caiu abaixo ou longe demais da mesa.
  function isInLimbo(pos) {
    return pos.y < LIMBO_Y || Math.hypot(pos.x, pos.z) > LIMBO_RADIUS;
  }

  // Reposiciona uma peca perdida de volta ao centro da mesa.
  function resetPieceToTable(piece, y) {
    const angle = random(0, Math.PI * 2);
    const radius = random(0, 0.55);
    const position = {
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius
    };

    piece.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    piece.body.setTranslation(position, true);
    piece.body.setRotation(rapierQuatFromEuler(0, random(0, Math.PI * 2), 0), true);
    piece.body.setLinvel({ x: random(-0.08, 0.08), y: 0, z: random(-0.08, 0.08) }, true);
    piece.body.setAngvel({ x: 0, y: random(-0.25, 0.25), z: 0 }, true);
  }

  // Ajusta camera e renderer quando a janela muda de tamanho.
  function resize() {
    resizeCamera();
    app.renderer.setSize(windowTarget.innerWidth, windowTarget.innerHeight);
    resizeInspectOverlay();
  }

  return {
    resize,
    start,
    syncPhysicsMeshes
  };
}

export {
  createSceneRuntimeController
};
