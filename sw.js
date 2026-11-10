// Сервис-воркер: работа без интернета
const SHELL = 'fishmap-shell-v1';
const TILES = 'fishmap-tiles-v1';
const MAX_TILES = 3000;
const TILE_HOSTS = ['tile.openstreetmap.org', 'tile.opentopomap.org'];

const ASSETS = [
  './',
  './index.html',
  './spots.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './leaflet.js',
  './leaflet.css',
  './layers.png',
  './layers-2x.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== TILES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) {
    await Promise.all(keys.slice(0, keys.length - MAX_TILES + 200).map((k) => cache.delete(k)));
  }
}

async function tileHandler(request) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  try {
    const res = await fetch(new Request(request.url, { mode: 'cors' }));
    if (res.ok) {
      cache.put(request.url, res.clone());
      trimTiles(cache);
    }
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (TILE_HOSTS.includes(url.hostname)) {
    e.respondWith(tileHandler(req));
    return;
  }
  if (url.origin !== location.origin) return; // погода и прочее идут напрямую

  if (req.mode === 'navigate' || url.pathname.endsWith('/spots.json') || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      networkFirst(req).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(cacheFirst(req));
});
