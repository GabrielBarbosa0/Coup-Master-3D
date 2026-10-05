import * as THREE from 'three';

// Cria a representacao fixa do tesouro central usada pelas animacoes de moeda ranqueadas.
export function createRankedTreasuryBag(options = {}) {
  const scene = options.scene;
  const group = buildTreasuryBag();
  group.visible = false;
  scene?.add(group);

  // Mantem a sacola no ponto serializavel do layout ou a oculta fora do ranqueado.
  function update(treasuryPoint) {
    if (!treasuryPoint) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.position.set(Number(treasuryPoint.x) || 0, 0, Number(treasuryPoint.z) || 0);
  }

  function destroy() {
    scene?.remove(group);
    group.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
  }

  return { group, update, destroy };
}

// Modela uma sacola de tecido compacta sem moedas decorativas sobre a textura.
function buildTreasuryBag() {
  const group = new THREE.Group();
  group.name = 'ranked-treasury-bag';
  group.userData.rankedTreasury = true;

  const cloth = new THREE.MeshStandardMaterial({
    color: 0x9a693a,
    roughness: 0.88,
    metalness: 0.01
  });
  const rope = new THREE.MeshStandardMaterial({
    color: 0xdec28a,
    roughness: 0.78,
    metalness: 0.02
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.08, 0.02),
    new THREE.Vector2(0.24, 0.05),
    new THREE.Vector2(0.3, 0.14),
    new THREE.Vector2(0.26, 0.25),
    new THREE.Vector2(0.17, 0.31),
    new THREE.Vector2(0.15, 0.37)
  ], 24), cloth);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.07, 20), cloth);
  neck.position.y = 0.37;
  neck.castShadow = true;
  group.add(neck);

  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.018, 6, 20), rope);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.374;
  group.add(tie);

  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), rope);
  knot.position.set(0.16, 0.374, 0);
  knot.castShadow = true;
  group.add(knot);
  return group;
}
