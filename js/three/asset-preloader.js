import {
  CARD_LIBRARY,
  COIN_TEXTURES,
  SPECIAL_CARD_TEXTURES,
  TABLE_TEXTURES
} from './config.js';

const DEFAULT_TIMEOUT_MS = 9000;

const HUD_ICON_PATHS = [
  'assets/img/icons/arrow.svg',
  'assets/img/icons/cached.svg',
  'assets/img/icons/chat.svg',
  'assets/img/icons/church.svg',
  'assets/img/icons/delete.svg',
  'assets/img/icons/dice.svg',
  'assets/img/icons/discord.svg',
  'assets/img/icons/distribute-cards.svg',
  'assets/img/icons/feedback.svg',
  'assets/img/icons/flip.svg',
  'assets/img/icons/focus.svg',
  'assets/img/icons/fullscreen.svg',
  'assets/img/icons/ghost.svg',
  'assets/img/icons/home.svg',
  'assets/img/icons/i-romano.svg',
  'assets/img/icons/info.svg',
  'assets/img/icons/logout.svg',
  'assets/img/icons/music_note.svg',
  'assets/img/icons/parchment.svg',
  'assets/img/icons/pen-paper.svg',
  'assets/img/icons/settings.svg',
  'assets/img/icons/share.svg',
  'assets/img/icons/shield-cross.svg',
  'assets/img/icons/translate.svg',
  'assets/img/icons/trophy.svg',
  'assets/img/icons/v-romano.svg'
];

const GUIDE_ASSET_PATHS = [
  'assets/img/guides/clean.png'
];

const LOGO_ASSET_PATHS = [
  'assets/img/logo/favicon-coup-master.png',
  'assets/img/logo/favicon-coup-master-circulo.png',
  'assets/img/logo/coup-master-192x192.png',
  'assets/img/logo/coup-master-512x512.png'
];

// Retorna uma lista sem repeticoes preservando a ordem original.
function unique(paths) {
  return Array.from(new Set(paths.filter(Boolean)));
}

// Lista imagens criticas para a mesa 3D e guias dinamicos.
function getThreeAssetPaths() {
  const cardPaths = CARD_LIBRARY.flatMap(({ type, folder }) => [
    `assets/img/cards/${folder}/${type}.png`,
    `assets/img/perfil-cards/${folder}/${type}.png`
  ]);

  const specialCardPaths = Object.values(SPECIAL_CARD_TEXTURES)
    .flatMap(({ front, back }) => [front, back]);

  return unique([
    'assets/img/cards/base/back.png',
    ...cardPaths,
    ...specialCardPaths,
    'assets/img/cards/religion/asilo.png',
    'assets/img/cards/religion/catolico-quadrado.png',
    'assets/img/cards/religion/protestante-quadrado.png',
    ...Object.values(COIN_TEXTURES),
    ...Object.values(TABLE_TEXTURES),
    ...GUIDE_ASSET_PATHS,
    ...HUD_ICON_PATHS,
    ...LOGO_ASSET_PATHS
  ]);
}

// Atualiza o texto de loading sem depender do estado interno do app 3D.
function setLoadingMessage(messageElement, completed, total) {
  const element = resolveMessageElement(messageElement);
  if (!element) return;

  const fallback = `Carregando recursos... ${completed}/${total}`;
  element.textContent = window.CoupLanguage?.t?.(
    'three.loadingResources',
    { completed, total },
    fallback
  ) || fallback;
}

function resolveMessageElement(messageElement) {
  if (typeof messageElement === 'string') return document.querySelector(messageElement);
  return messageElement || null;
}

// Precarrega uma imagem e resolve mesmo em erro para evitar loading infinito.
function preloadImage(src, timeoutMs) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    let timeout = null;

    function finish(ok, reason = '') {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      resolve({ src, ok, reason });
    }

    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => {
      if (typeof image.decode !== 'function') {
        finish(true);
        return;
      }

      image.decode().then(
        () => finish(true),
        () => finish(true)
      );
    };
    image.onerror = () => finish(false, 'error');

    timeout = window.setTimeout(() => finish(false, 'timeout'), timeoutMs);
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      finish(true);
    }
  });
}

// Precarrega assets criticos da mesa 3D e reporta progresso ao overlay.
function preloadThreeAssets(options = {}) {
  const assets = getThreeAssetPaths();
  const total = assets.length;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  let completed = 0;
  let loaded = 0;
  let failed = 0;

  function notify(lastAsset = null) {
    const progress = { total, completed, loaded, failed, lastAsset };
    setLoadingMessage(options.messageElement, completed, total);
    options.onProgress?.(progress);
  }

  if (!total) {
    notify();
    return Promise.resolve({ total, loaded, failed, assets: [] });
  }

  notify();

  return Promise.all(assets.map((src) => (
    preloadImage(src, timeoutMs).then((asset) => {
      completed += 1;
      if (asset.ok) loaded += 1;
      else failed += 1;
      notify(asset);
      return asset;
    })
  ))).then((results) => ({ total, loaded, failed, assets: results }));
}

export {
  getThreeAssetPaths,
  preloadThreeAssets
};
