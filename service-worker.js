const CACHE_VERSION = 'coup-master-pwa-v88';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './lobby.html',
  './legal/privacy.html',
  './legal/terms.html',
  './manifest.webmanifest',
  './css/online.css',
  './css/lobby.css',
  './css/legal.css',
  './css/loading.css',
  './css/compat.css',
  './css/three-board.css',
  './js/pwa.js',
  './js/navigation/entry-routing.js',
  './js/i18n/initial-language.js',
  './js/i18n/language-service.js',
  './js/firebase/login-page.js',
  './js/firebase/lobby-page.js',
  './js/firebase/auth-service.js',
  './js/firebase/firebase-config.js',
  './js/firebase/room-service.js',
  './js/firebase/table-state-merge.mjs',
  './js/gamemode/game-modes.js',
  './js/gamemode/ranked-3d/ranked-3d-achievements.js',
  './js/three/boot.js',
  './js/three/app.js',
  './js/three/animation-service.js',
  './js/three/alternative-rules-service.js',
  './js/three/asset-preloader.js',
  './js/three/audio-service.js',
  './js/three/camera-service.js',
  './js/three/card-actions-service.js',
  './js/three/card-system.js',
  './js/three/chat-service.js',
  './js/three/config.js',
  './js/three/deck-config-service.js',
  './js/three/deck-system.js',
  './js/three/dom.js',
  './js/three/feedback-service.js',
  './js/three/game-actions-controller.js',
  './js/three/hover-inspect-service.js',
  './js/three/interaction-drag-controller.js',
  './js/three/input-controller.js',
  './js/three/modal-service.js',
  './js/three/object-system.js',
  './js/three/player-badges.js',
  './js/three/pointer-interaction-controller.js',
  './js/three/room-players-ui.js',
  './js/three/rules-guide-builder.js',
  './js/three/rules-guides-ui.js',
  './js/three/scene-runtime-controller.js',
  './js/three/scene-table.js',
  './js/three/share-room-service.js',
  './js/three/spectator-service.js',
  './js/three/stack-system.js',
  './js/three/table-stack-controller.js',
  './js/three/table-state-clone.js',
  './js/three/table-state-serializer.js',
  './js/three/table-sync-service.js',
  './lang/pt-BR.json',
  './lang/en-US.json',
  './assets/fonts/tilda-script-bold.woff2',
  './assets/fonts/tilda-script-bold.otf',
  './assets/fonts/Cinzel-VariableFont_wght.ttf',
  './assets/img/logo/favicon-coup-master.png',
  './assets/img/logo/favicon-coup-master-circulo.png',
  './assets/img/logo/coup-master-192x192.png',
  './assets/img/logo/coup-master-circulo-192x192.png',
  './assets/img/logo/coup-master-512x512.png',
  './assets/img/icons/discord.svg',
  './assets/img/icons/gavel.svg',
  './assets/img/icons/google.svg',
  './assets/img/icons/home.svg',
  './assets/img/icons/logout.svg',
  './assets/img/icons/parchment.svg',
  './assets/img/icons/share.svg',
  './assets/img/icons/translate.svg',
  './assets/img/icons/trophy.svg',
  './assets/img/guides/clean.png',
  './assets/img/cards/base/back.png'
];

// Prepara o shell minimo para abrir a PWA mesmo durante uma falha de rede.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos quando uma nova versao do service worker assume o controle.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Mantem navegacoes atualizadas e reutiliza cache para assets estaticos locais.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// Busca a pagina mais recente e usa o cache apenas quando a rede falhar.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || (await cache.match('./login.html'))
      || Response.error();
  }
}

// Entrega assets imediatamente e atualiza a copia local em segundo plano.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkRequest = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkRequest) || Response.error();
}
