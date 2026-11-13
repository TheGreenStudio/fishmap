// Сервис-воркер: приложение и карта работают без интернета
const SHELL = 'fishmap-shell-v34';
const TILES = 'fishmap-tiles-v1';
const PHOTOS = 'fishmap-photos-v1'; // фото из группы, их нельзя удалять при обновлении
const MAX_TILES = 3000;
const TILE_HOSTS = ['tile.openstreetmap.org', 'tile.opentopomap.org'];

const ASSETS = [
  './', './index.html', './app.css', './app.js', './spots.json', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './leaflet.js', './leaflet.css', './layers.png', './layers-2x.png',
  './inter-latin.woff2', './inter-cyrillic.woff2'
];

self.addEventListener('install', (e) => {
  // cache: 'reload' обходит HTTP-кэш браузера (GitHub Pages держит файлы до 10 минут), иначе в кэш попадала бы устаревшая копия
  e.waitUntil(caches.open(SHELL)
    .then((c) => Promise.all(ASSETS.map((a) => fetch(new Request(a, { cache: 'reload' })).then((r) => { if (!r.ok) throw new Error(a + ' ' + r.status); return c.put(a, r); }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== TILES && k !== PHOTOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Чистка кэша плиток не чаще раза в 20 с (раньше список из 3000 плиток перебирался на каждую новую плитку)
let lastTrim = 0, trimming = false;
async function trimTiles(cache) {
  if (trimming || Date.now() - lastTrim < 20000) return;
  trimming = true; lastTrim = Date.now();
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES + 200).map((k) => cache.delete(k)));
  } finally { trimming = false; }
}

// Плитки, которые смотрят снова (свои места), переносим в конец очереди (put заменяет запись и ставит её в конец), чтобы при чистке удалялись давно не нужные, а не самые первые
const touched = new Set();
async function touchTile(cache, url, res) {
  if (touched.has(url) || touched.size > 5000) return;
  touched.add(url);
  try { const b = await res.blob(); await cache.put(url, new Response(b, { status: 200, headers: res.headers })); } catch (e) { /* не критично */ }
}

async function tileHandler(request) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(request.url);
  if (hit) { touchTile(cache, request.url, hit.clone()); return hit; }
  try {
    const res = await fetch(new Request(request.url, { mode: 'cors' }));
    if (res.ok) { cache.put(request.url, res.clone()).then(() => trimTiles(cache)).catch(() => {}); }
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

// Сначала отдаём из кэша (быстро и без сети), в фоне обновляем: новая версия появится при следующем открытии
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request, { ignoreSearch: true });
  const net = fetch(request.url, { cache: 'no-cache' }).then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; }).catch(() => null);
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
  if (url.searchParams.has('chk')) return;      // проверка сети перед обновлением: реально идёт в сеть, а не в кэш
  e.respondWith(staleWhileRevalidate(req));
});
