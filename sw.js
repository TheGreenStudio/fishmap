// Сервис-воркер: приложение и карта работают без интернета
const SHELL = 'fishmap-shell-v2';
const TILES = 'fishmap-tiles-v1';
const MAX_TILES = 3000;
const TILE_HOSTS = ['tile.openstreetmap.org', 'tile.opentopomap.org'];

const ASSETS = [
  './', './index.html', './app.css', './app.js', './spots.json', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  './leaflet.js', './leaflet.css', './layers.png', './layers-2x.png',
  './inter-latin.woff2', './inter-cyrillic.woff2'
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
    if (res.ok) { cache.put(request.url, res.clone()); trimTiles(cache); }
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

// Сначала отдаём из кэша (быстро и без сети), в фоне обновляем: новая версия появится при следующем открытии
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request, { ignoreSearch: true });
  const net = fetch(request).then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; }).catch(() => null);
  if (hit) return hit;
  const res = await net;
  return res || (await cache.match('./index.html')) || new Response('Нет сети', { status: 503 });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (TILE_HOSTS.includes(url.hostname)) { e.respondWith(tileHandler(req)); return; }
  if (url.origin !== location.origin) return; // погода и прочее идут напрямую
  e.respondWith(staleWhileRevalidate(req));
});
