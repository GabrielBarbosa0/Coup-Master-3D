import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_HEIGHT,
  DEFAULT_CAMERA_TARGET,
  PLAYER_COUNT
} from './config.js';
import { cameraDebugEl } from './dom.js';

const cameraState = {
  camera: null,
  controls: null,
  cameraFocus: null,
  lastDebugText: ''
};

// Cria a camera principal da mesa ja posicionada para o assento informado.
function createTableCamera(playerId) {
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.copy(getPlayerCameraPosition(playerId));
  cameraState.camera = camera;
  return camera;
}

// Cria os controles orbitais usados pela mesa 3D.
function createTableControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(DEFAULT_CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.19;
  controls.screenSpacePanning = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: null
  };

  cameraState.controls = controls;
  return controls;
}

// Inicia animacao de foco da camera para a vista padrao de um jogador.
function focusTableCamera(playerId) {
  const camera = cameraState.camera;
  const controls = cameraState.controls;
  if (!camera || !controls) return;

  cameraState.cameraFocus = {
    progress: 0,
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: getPlayerCameraPosition(playerId),
    endTarget: DEFAULT_CAMERA_TARGET.clone()
  };
}

// Coloca a camera diretamente na vista padrao de um assento.
function snapCameraToPlayer(playerId) {
  const camera = cameraState.camera;
  const controls = cameraState.controls;
  if (!camera || !controls) return;

  cameraState.cameraFocus = null;
  camera.position.copy(getPlayerCameraPosition(playerId));
  controls.target.copy(DEFAULT_CAMERA_TARGET);
  controls.update();
}

// Interpola a camera ate a vista padrao solicitada.
function updateCameraFocus(dt) {
  const camera = cameraState.camera;
  const controls = cameraState.controls;
  if (!cameraState.cameraFocus || !camera || !controls) return;

  const focus = cameraState.cameraFocus;
  focus.progress = Math.min(1, focus.progress + dt * 2.4);
  const t = easeInOutCubic(focus.progress);

  camera.position.copy(focus.startPosition).lerp(focus.endPosition, t);
  controls.target.copy(focus.startTarget).lerp(focus.endTarget, t);

  if (focus.progress >= 1) {
    camera.position.copy(focus.endPosition);
    controls.target.copy(focus.endTarget);
    cameraState.cameraFocus = null;
  }
}

// Atualiza o painel de leitura dos parametros atuais da camera.
function updateCameraDebug() {
  const camera = cameraState.camera;
  const controls = cameraState.controls;
  if (!cameraDebugEl || !camera || !controls) return;

  const position = camera.position;
  const target = controls.target;
  const offset = position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const distance = offset.length();
  const polar = THREE.MathUtils.radToDeg(spherical.phi);
  const azimuth = normalizeDebugAngle(THREE.MathUtils.radToDeg(spherical.theta));
  const text = [
    'CAMERA',
    `pos: ${formatDebugVector(position)}`,
    `target: ${formatDebugVector(target)}`,
    `dist: ${formatDebugNumber(distance)} | polar: ${formatDebugNumber(polar)}\u00b0`,
    `azim: ${formatDebugNumber(azimuth)}\u00b0 | fov: ${formatDebugNumber(camera.fov)}\u00b0`
  ].join('\n');

  if (text === cameraState.lastDebugText) return;
  cameraState.lastDebugText = text;
  cameraDebugEl.textContent = text;
}

// Ajusta a camera quando a janela muda de tamanho.
function resizeCamera() {
  const camera = cameraState.camera;
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Calcula a posicao padrao da camera para um jogador.
function getPlayerCameraPosition(playerId) {
  const angle = getPlayerAngle(playerId);
  return DEFAULT_CAMERA_TARGET.clone().add(new THREE.Vector3(
    Math.cos(angle) * DEFAULT_CAMERA_DISTANCE,
    DEFAULT_CAMERA_HEIGHT,
    Math.sin(angle) * DEFAULT_CAMERA_DISTANCE
  ));
}

// Calcula o angulo radial de um jogador no octogono.
function getPlayerAngle(playerId) {
  return -Math.PI / 2 + ((playerId - 1) / PLAYER_COUNT) * Math.PI * 2;
}

// Normaliza angulos para ficarem mais faceis de copiar e comparar.
function normalizeDebugAngle(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

// Formata vetores de camera com precisao suficiente para reproduzir a vista.
function formatDebugVector(vector) {
  return `${formatDebugNumber(vector.x)}, ${formatDebugNumber(vector.y)}, ${formatDebugNumber(vector.z)}`;
}

// Padroniza numeros do painel de camera.
function formatDebugNumber(value) {
  return Number(value).toFixed(2);
}

// Suaviza a interpolacao da camera entre duas vistas.
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export {
  createTableCamera,
  createTableControls,
  focusTableCamera,
  getPlayerCameraPosition,
  resizeCamera,
  snapCameraToPlayer,
  updateCameraDebug,
  updateCameraFocus
};
