const CACHE_VERSION = 'coup-master-pwa-v20';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './lobby.html',
  './manifest.webmanifest',
  './css/online.css',
  './css/three-board.css',
  './js/pwa.js',
  './js/firebase/login-page.js',
  './js/firebase/lobby-page.js',
  './js/firebase/auth-service.js',
  './js/firebase/firebase-config.js',
  './js/firebase/room-service.js',
  './js/firebase/table-state-merge.mjs',
  './js/three/boot.js',
  './js/three/app.js',
  './js/three/config.js',
  './js/three/dom.js',
  './assets/fonts/PressStart2P-Regular.ttf',
  './assets/fonts/tilda-script-bold.woff2',
  './assets/img/logo/favicon-coup-master.png',
  './assets/img/logo/coup-master-192x192.png',
  './assets/img/logo/coup-master-512x512.png'
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
