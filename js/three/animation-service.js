import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Anima uma carta em arco ate uma posicao alvo.
export function tossTo(card, target, rotationY, lift = 0.25, onComplete = null) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  const start = card.mesh.position.clone();
  const high = start.clone().lerp(target, 0.45);
  high.y += lift;

  card.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  card.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  card.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  card.target = { start, high, end: target.clone(), progress: 0, onComplete };
  card.targetQuat = quat;
}

// Posiciona uma carta imediatamente no mundo fisico e visual.
export function placeCard(card, position, rotationY, dynamic = true) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0));
  card.mesh.position.copy(position);
  card.mesh.quaternion.copy(quat);
  card.body.setTranslation(position, true);
  card.body.setRotation(quat, true);
  card.body.setBodyType(dynamic ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
}

// Atualiza animacoes de cartas em movimento.
export function updateCardTweens(cards, dt, onTweenComplete = null) {
  cards.forEach((card) => {
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
      const onComplete = card.target.onComplete;
      card.target = null;
      onComplete?.();
      onTweenComplete?.(card);
    }
  });
}

// Retorna numero aleatorio entre minimo e maximo.
export function random(min, max) {
  return min + Math.random() * (max - min);
}

// Aplica easing de desaceleracao para animacoes.
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Aplica easing suave de entrada e saida.
export function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
