(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  let lsWarnT = 0;
  const lsSet = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { if (Date.now() - lsWarnT > 8000 && typeof toast === 'function') { lsWarnT = Date.now(); setTimeout(() => toast('Память телефона заполнена: изменения могут не сохраниться. Очистите место', 5000), 1800); } return false; }
  };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const rnd = Math.round;
  const APP_URL = location.origin + location.pathname;

  const P = {
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    chat: '<path d="M21 11.5a8 8 0 01-11.6 7.1L4 20l1.4-4.6A8 8 0 1121 11.5z"/>',
    camera: '<path d="M21 18a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3l1.6-2.4h4.8L16 7h3a2 2 0 012 2z"/><circle cx="12" cy="13" r="3.8"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    wind: '<path d="M3 9h10.5a2.5 2.5 0 10-2.5-2.5"/><path d="M3 15h14.5a2.5 2.5 0 11-2.5 2.5"/>',
    gauge: '<path d="M4.5 17a8 8 0 1115 0"/><path d="M12 14.5l3.5-4.5"/>',
    drop: '<path d="M12 3.5s6 6 6 10.2a6 6 0 01-12 0C6 9.5 12 3.5 12 3.5z"/>',
    cloud: '<path d="M7 18a4 4 0 01-.6-7.95A5.5 5.5 0 0117 9.6 4.2 4.2 0 0116.6 18H7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
    cloudsun: '<circle cx="8.5" cy="8" r="2.8"/><path d="M8.5 2.2v1.2M2.7 8h1.2M4.4 3.9l.9.9M12.6 3.9l-.9.9"/><path d="M8 19a3.6 3.6 0 01-.4-7.1A5 5 0 0117 11.2 3.9 3.9 0 0116.4 19H8z"/>',
    rain: '<path d="M7 14.5a3.8 3.8 0 01-.5-7.5A5.2 5.2 0 0116.8 6.2 4 4 0 0117 14.5H7z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    snow: '<path d="M7 14.5a3.8 3.8 0 01-.5-7.5A5.2 5.2 0 0116.8 6.2 4 4 0 0117 14.5H7z"/><path d="M8.5 18.5v.01M12 20.5v.01M15.5 18.5v.01"/>',
    fog: '<path d="M7 12a3.8 3.8 0 01-.5-7.5A5.2 5.2 0 0116.8 3.7 4 4 0 0117 12H7z"/><path d="M4 16h16M7 20h10"/>',
    storm: '<path d="M7 14a3.8 3.8 0 01-.5-7.5A5.2 5.2 0 0116.8 5.7 4 4 0 0117 14H7z"/><path d="M12.5 12l-2.5 4.5h3.5L11 21"/>',
    nav: '<path d="M4 11l16-7-7 16-2.5-6.5L4 11z"/>',
    send: '<path d="M21 4L3 11l6.2 2.6L11.8 20 21 4z"/><path d="M9.2 13.6L21 4"/>',
    chev_r: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    bookmark: '<path d="M6.5 4h11v16.5L12 16.8 6.5 20.5V4z"/>',
    dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    arrow_up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    arrow_down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
    cloud_off: '<path d="M7 18a4 4 0 01-.6-7.95 5.5 5.5 0 011.9-3.3"/><path d="M12.5 5.6A5.5 5.5 0 0117 9.6 4.2 4.2 0 0119.5 17"/><path d="M4 4l16 16"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M5 7h14M10 4h4M7 7l1 13h8l1-13M10 11v6M14 11v6"/>',
    fishw: '<g transform="translate(1 4.5) scale(0.82) translate(0.5 0)"><path d="M2.5 12c2.6-4 6.2-5.3 10-4 1.6.6 3 1.6 4 3l4.5-3.2v8.4L16.5 13c-1 1.4-2.4 2.4-4 3-3.8 1.3-7.4 0-10-4z"/><circle cx="8" cy="11" r="0.6"/></g><g stroke-width="1.5"><path d="M17.5 2.6v7.2M14.4 4.4l6.2 3.6M14.4 8l6.2-3.6"/></g>',
    fish: '<path d="M2.5 12c2.6-4 6.2-5.3 10-4 1.6.6 3 1.6 4 3l4.5-3.2v8.4L16.5 13c-1 1.4-2.4 2.4-4 3-3.8 1.3-7.4 0-10-4z"/><circle cx="8" cy="11" r="0.6"/>'
  };
  const ic = (n, size, color, sw, extra) =>
    '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
    '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;' + (extra || '') + '">' + P[n] + '</svg>';

  document.querySelectorAll('[data-ic]').forEach((el) => {
    el.outerHTML = ic(el.dataset.ic, +el.dataset.size || 24, null, +el.dataset.sw || 1.8);
  });

  /* ---------- state ---------- */
  let dev = lsGet('fishmap.dev', '');
  if (!dev) { dev = uid(); lsSet('fishmap.dev', dev); }
  const S = {
    dev: dev,
    spots: [], shared: [], sel: null, temp: null, state: 'peek', loc: null,
    theme: lsGet('fishmap.theme', 'auto'), layer: lsGet('fishmap.layer', 'osm'), fishMode: lsGet('fishmap.fishmode', 'auto'),
    filter: 'all', q: '', wxKey: '',
    code: lsGet('fishmap.code', ''), me: lsGet('fishmap.me', ''), tomb: lsGet('fishmap.v3.tomb', []),
    sync: { state: 'off', t: lsGet('fishmap.syncT', 0) }
  };
  const KEY = 'fishmap.v3.spots';
  function loadLocal() {
    let arr = lsGet(KEY, null);
    if (!arr) {
      const old = lsGet('fishmap.v2.spots', null) || lsGet('fishmap.local', []);
      arr = old.map((s) => ({ id: isUuid(s.id) ? s.id : uid(), name: s.name, lat: s.lat, lon: s.lon, note: s.note || '', author: '', created: s.created || Date.now(), updated: Date.now(), dirty: true }));
      if (arr.length) lsSet(KEY, arr);
    }
    return arr || [];
  }
  const saveLocal = () => { lsSet(KEY, S.spots.filter((s) => !s.shared)); lsSet('fishmap.v3.tomb', S.tomb); };
  const touch = (s) => { s.dirty = true; s.updated = Date.now(); saveLocal(); scheduleSync(); };
  const allSpots = () => S.spots;
  const findSpot = (id) => S.spots.find((s) => s.id === id);

  /* ---------- сезоны: лето / зима / оба ---------- */
  const SEAS = { summer: 'Лето', winter: 'Зима', both: 'Оба сезона' };
  const calSeason = () => { const m = new Date().getMonth(); return (m >= 10 || m <= 2) ? 'winter' : 'summer'; };   // пока нет данных о погоде: ноябрь-март зимой
  S.autoSeason = lsGet('fishmap.autoSeason', null) || calSeason();
  const seasonOf = (s) => s.season || (s.shared ? 'both' : 'summer');
  const curSeason = () => (S.fishMode === 'ice' ? 'winter' : S.fishMode === 'open' ? 'summer' : S.autoSeason);
  const inSeason = (s) => { const q = seasonOf(s); return q === 'both' || q === curSeason(); };
  const seasonSpots = () => S.spots.filter(inSeason);

  /* ---------- theme ---------- */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const eff = S.theme === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : S.theme;
    document.documentElement.dataset.theme = eff;
    const meta = $('#themeColor');
    if (meta) meta.content = eff === 'dark' ? '#0B171C' : '#EEF3F1';
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
  applyTheme();

  /* ---------- map ---------- */
  const WORLD = L.latLngBounds([[-85, -180], [85, 180]]);
  const map = L.map('map', { zoomControl: false, attributionControl: true, tap: true, maxBounds: WORLD, maxBoundsViscosity: 1 });
  // нельзя отдалиться дальше, чем мир заполняет экран: иначе карта повторяется и вокруг пустота
  const fitMinZoom = () => { try { map.setMinZoom(Math.max(2, map.getBoundsZoom(WORLD, true))); } catch (e) { /* размер ещё неизвестен */ } };
  map.on('resize', fitMinZoom);
  const layers = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, noWrap: true, attribution: '© OpenStreetMap' }),
    topo: L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, noWrap: true, attribution: '© OpenTopoMap, © OpenStreetMap' })
  };
  function setLayer(k) {
    Object.keys(layers).forEach((n) => { if (map.hasLayer(layers[n])) map.removeLayer(layers[n]); });
    layers[k].addTo(map); S.layer = k; lsSet('fishmap.layer', k);
  }
  setLayer(layers[S.layer] ? S.layer : 'osm');
  map.attributionControl.setPrefix(false);

  const spotMarkers = new Map();
  let tempMarker = null, meMarker = null;

  function pinHtml(kind, sel, winter) {
    const glyph = kind === 'temp' ? P.plus : (winter ? P.fishw : P.fish);
    return '<div class="pinwrap ' + (kind === 'temp' ? 'temp ' : '') + (winter && kind !== 'temp' ? 'winter ' : '') + (sel ? 'sel' : '') + '"><div class="ring"></div>' +
      '<svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true"><path class="pin-body" d="M22 50C22 50 5 33 5 21a17 17 0 0134 0c0 12-17 29-17 29z"/>' +
      '<g class="pin-glyph" transform="translate(10 9)">' + glyph + '</g></svg></div>';
  }
  const pinIcon = (kind, sel, winter) => L.divIcon({ className: '', html: pinHtml(kind, sel, winter), iconSize: [44, 52], iconAnchor: [22, 50] });

  function renderMarkers() {
    spotMarkers.forEach((m) => m.remove());
    spotMarkers.clear();
    const win = curSeason() === 'winter';
    // выбранная точка видна всегда, даже если она другого сезона (например, открыта из поиска)
    allSpots().filter((s) => inSeason(s) || S.sel === s.id).forEach((s) => {
      const m = L.marker([s.lat, s.lon], { icon: pinIcon('saved', S.sel === s.id, win), title: s.name, keyboard: true }).addTo(map);
      m.on('click', () => openSpot(s.id, 'half'));
      spotMarkers.set(s.id, m);
    });
    $('#count').textContent = seasonSpots().length;
  }
  function setTempMarker(ll) {
    if (tempMarker) tempMarker.remove();
    tempMarker = ll ? L.marker(ll, { icon: pinIcon('temp', true), interactive: false, keyboard: false }).addTo(map) : null;
  }

  /* ---------- formatting ---------- */
  const fmtT = (x) => { const t = rnd(x); return (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '°'; };
  const fmtC = (x) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(4);
  const coordsText = (p) => fmtC(p.lat) + ', ' + fmtC(p.lon);
  const mmHg = (h) => rnd(h * 0.75006);
  const dirName = (d) => ['северный', 'северо-восточный', 'восточный', 'юго-восточный', 'южный', 'юго-западный', 'западный', 'северо-западный'][rnd(d / 45) % 8];
  const hhmm = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  function fmtDist(m) { return m < 1000 ? rnd(m / 10) * 10 + ' м' : (m < 10000 ? (m / 1000).toFixed(1).replace('.', ',') : rnd(m / 1000)) + ' км'; }
  function distance(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function wmo(c) {
    if (c === 0) return ['sun', 'Ясно'];
    if (c === 1) return ['cloudsun', 'Малооблачно'];
    if (c === 2) return ['cloudsun', 'Переменная облачность'];
    if (c === 3) return ['cloud', 'Пасмурно'];
    if (c === 45 || c === 48) return ['fog', 'Туман'];
    if (c >= 51 && c <= 55) return ['rain', 'Морось'];
    if (c === 56 || c === 57) return ['rain', 'Ледяная морось'];
    if (c >= 61 && c <= 65) return ['rain', 'Дождь'];
    if (c === 66 || c === 67) return ['rain', 'Ледяной дождь'];
    if (c >= 71 && c <= 77) return ['snow', 'Снег'];
    if (c >= 80 && c <= 82) return ['rain', 'Ливень'];
    if (c === 85 || c === 86) return ['snow', 'Снегопад'];
    if (c >= 95) return ['storm', c === 95 ? 'Гроза' : 'Гроза с градом'];
    return ['cloud', ''];
  }

  /* ---------- fishing score (0–100) ----------
     Эвристика по погоде, не гарантия клёва. Два режима:
     открытая вода: давление 25, температура 25, ветер 20, свет 15, осадки 10, время суток 5;
     подлёдная: давление 25, ощущаемая температура 20, ветер 15, лёд (оценка) 15, время 10, свет 10, осадки 5.
     Кривые намеренно узкие: обычный день без проблем даёт 55–70, «Отлично» редкость. */
  function interp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    }
    return pts[pts.length - 1][1];
  }
  // открытая вода
  const F_TEMP = [[-15, 0], [-5, 4], [3, 11], [8, 19], [12, 24], [18, 25], [24, 18], [28, 9], [35, 2], [40, 0]];
  const F_PDELTA = [[-8, 3], [-5, 6], [-3, 14], [-1, 18], [0, 10], [1, 9], [3, 6], [6, 3], [9, 1]];
  const F_PABS = [[980, 0], [995, 2], [1005, 5], [1010, 7], [1022, 7], [1030, 4], [1040, 2]];
  const F_WIND = [[0, 20], [5, 20], [10, 15], [16, 9], [22, 4], [28, 1], [36, 0]];
  const F_CLOUD = [[0, 4], [30, 8], [60, 12], [85, 14], [100, 13]];
  const F_RAIN = [[0, 10], [0.5, 8], [2, 5], [5, 2], [10, 0]];
  // подлёдная
  const F_WIND_ICE = [[0, 15], [6, 15], [12, 10], [20, 5], [28, 1], [36, 0]];
  const F_CHILL = [[-45, 0], [-35, 3], [-27, 8], [-18, 15], [-10, 20], [-2, 20], [0, 14], [2, 6], [4, 0]];
  const F_CLOUD_ICE = [[0, 5], [30, 7], [60, 9], [85, 10], [100, 10]];
  const F_RAIN_ICE = [[0, 5], [0.5, 4], [3, 2], [8, 0]];

  // ощущаемая температура с ветром (формула Environment Canada, для t ≤ 0 и ветра > 5 км/ч)
  function windChill(t, v) {
    if (t > 0 || v <= 5) return t;
    const p = Math.pow(v, 0.16);
    return 13.12 + 0.6215 * t - 11.37 * p + 0.3965 * t * p;
  }

  function codePrecip(c) {
    if (c >= 95) return 15;
    if (c === 80) return 4; if (c === 81) return 8; if (c === 82) return 12;
    if (c === 85 || c === 86) return 5;
    if (c >= 71 && c <= 77) return 3;
    if (c === 65 || c === 67) return 10;
    if (c === 63 || c === 66) return 5;
    if (c === 61) return 2;
    if (c >= 51 && c <= 57) return 1.5;
    return 0;
  }
  function codeCloud(c) {
    if (c === 0) return 5; if (c === 1) return 25; if (c === 2) return 55; if (c === 3) return 90;
    return c === 45 || c === 48 ? 100 : 90;
  }
  const hourOf = (s) => +s.slice(11, 13) + (+s.slice(14, 16)) / 60;
  function hm(h) {
    const m = Math.round(h * 6) * 10, hh = ((Math.floor(m / 60) % 24) + 24) % 24, mm = m % 60;
    return hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function levelOf(s) { return s < 25 ? 'bad' : s < 45 ? 'low' : s < 65 ? 'mid' : s < 83 ? 'good' : 'top'; }
  const LEVEL_TXT = { bad: 'Плохо', low: 'Слабо', mid: 'Средне', good: 'Хорошо', top: 'Отлично' };

  function pressureParts(i) {
    const dp = i.dp, dpts = dp == null ? 12 : interp(F_PDELTA, dp);
    const pw = dp == null ? 'тренд неизвестен' : dp <= -4.5 ? 'быстро падает (идёт фронт)' : dp < -1 ? 'медленно падает' : dp <= 1 ? 'стабильно' : dp < 4.5 ? 'растёт' : 'быстро растёт';
    return { name: 'Давление', max: 25, pts: dpts + interp(F_PABS, i.pressure), text: mmHg(i.pressure) + ' мм, ' + pw };
  }
  function timeOfDay(i, peakPts, dayPts, nightPts) {
    if (i.dayMode) return { pts: peakPts, text: 'считаем лучшее время суток' };
    const sr = i.sr == null ? 6.5 : i.sr, ss = i.ss == null ? 19 : i.ss, h = i.hour;
    if ((h >= sr - 1 && h <= sr + 2.5) || (h >= ss - 2.5 && h <= ss + 1)) return { pts: peakPts, text: 'утро или вечер, самое активное время' };
    if (h > sr && h < ss) return { pts: dayPts, text: 'день' };
    return { pts: nightPts, text: 'ночь' };
  }
  // итог строже простой суммы: «Отлично» только когда совпадает почти всё, обычный день без проблем даёт 65–80
  const SHAPE = 2.4;
  function finishScore(parts, caps) {
    let score = 0;
    parts.forEach((p) => { p.pts = rnd(p.pts); score += p.pts; });
    score = 100 * Math.pow(clamp(score, 0, 100) / 100, SHAPE);
    let warn = '', cap = 100;
    caps.forEach((c) => { if (c.cap < cap) { cap = c.cap; warn = c.warn; } });
    score = clamp(rnd(Math.min(score, cap)), 0, 100);
    return { score: score, lvl: levelOf(score), label: LEVEL_TXT[levelOf(score)], parts: parts, warn: warn };
  }

  function fishScoreOpen(i) {
    const parts = [];
    const t = i.temp;
    parts.push({ name: 'Температура', max: 25, pts: interp(F_TEMP, t),
      text: fmtT(t) + (t < -5 ? ', сильный холод' : t < 3 ? ', холодно' : t < 8 ? ', прохладно' : t <= 20 ? ', комфортно' : t <= 27 ? ', тепло' : ', жарко, вода может перегреться') });
    parts.push(pressureParts(i));
    const eff = i.wind + 0.5 * Math.max(0, i.gust - i.wind);
    parts.push({ name: 'Ветер', max: 20, pts: interp(F_WIND, eff),
      text: (i.dayMode ? 'до ' : '') + rnd(i.wind) + ' км/ч, порывы ' + rnd(i.gust) + (eff <= 8 ? ', слабый' : eff <= 15 ? ', лёгкий' : eff <= 22 ? ', заметный' : eff <= 30 ? ', сильный' : ', очень сильный') });
    parts.push({ name: 'Свет', max: 15, pts: interp(F_CLOUD, i.cloud),
      text: rnd(i.cloud) + '% облаков' + (i.cloud >= 60 ? ', рассеянный свет' : i.cloud < 30 ? ', яркое солнце, рыба осторожнее' : '') });
    parts.push({ name: 'Осадки', max: 10, pts: interp(F_RAIN, i.precip),
      text: i.precip < 0.2 ? 'без осадков' : (i.precip < 10 ? i.precip.toFixed(1).replace('.', ',') : rnd(i.precip)) + ' мм' });
    const td = timeOfDay(i, 5, 3, 2);
    parts.push({ name: 'Время суток', max: 5, pts: td.pts, text: td.text });
    const caps = [];
    if (i.code >= 95) caps.push({ cap: 15, warn: 'Гроза: рыбачить небезопасно' });
    if (i.gust >= 65) caps.push({ cap: 25, warn: 'Очень сильный ветер: рыбалка опасна' });
    if (t <= -25) caps.push({ cap: 20, warn: 'Сильный мороз' });
    if (eff >= 32) caps.push({ cap: 35, warn: 'Очень сильный ветер: рыбачить тяжело и опасно' });
    return finishScore(parts, caps);
  }

  const ICE_TXT = {
    none: 'льда, скорее всего, ещё нет',
    thin: 'лёд, скорее всего, тонкий',
    check: 'лёд мог встать, нужна проверка толщины',
    ok: 'лёд, вероятно, держит, но всё равно проверьте',
    unknown: 'нет данных о морозах за последние дни'
  };
  function fishScoreIce(i) {
    const parts = [];
    const chill = windChill(i.temp, i.wind);
    let cp = interp(F_CHILL, chill);
    if (i.thaw) cp = Math.min(cp, 6);
    parts.push(pressureParts(i));
    const eff = i.wind + 0.5 * Math.max(0, i.gust - i.wind);
    parts.push({ name: 'Ветер', max: 15, pts: interp(F_WIND_ICE, eff),
      text: (i.dayMode ? 'до ' : '') + rnd(i.wind) + ' км/ч, порывы ' + rnd(i.gust) + (eff <= 8 ? ', слабый' : eff <= 15 ? ', лёгкий' : eff <= 22 ? ', заметный, холодно у лунки' : eff <= 30 ? ', сильный, мело́ет снег' : ', очень сильный') });
    parts.push({ name: 'Ощущаемая температура', max: 20, pts: cp,
      text: fmtT(chill) + (i.thaw ? ', оттепель, лёд слабеет' : chill <= -35 ? ', опасный мороз' : chill <= -27 ? ', очень холодно' : chill <= -18 ? ', морозно' : chill <= -3 ? ', комфортно для льда' : chill <= 1 ? ', около нуля' : ', тепло, лёд слабеет') });
    const cat = i.iceCat || 'unknown';
    const ip = { none: 0, thin: 2, check: 9, ok: 15, unknown: 7 }[cat];
    parts.push({ name: 'Лёд (оценка)', max: 15, pts: i.thaw ? Math.min(ip, 3) : ip, text: i.thaw ? 'оттепель съедает лёд, на лёд не выходить' : ICE_TXT[cat] });
    parts.push({ name: 'Свет', max: 10, pts: interp(F_CLOUD_ICE, i.cloud),
      text: rnd(i.cloud) + '% облаков' + (i.cloud >= 60 ? ', рассеянный свет' : i.cloud < 30 ? ', яркое солнце, рыба осторожнее' : '') });
    parts.push({ name: 'Осадки', max: 5, pts: interp(F_RAIN_ICE, i.precip),
      text: i.precip < 0.2 ? 'без осадков' : (i.precip < 10 ? i.precip.toFixed(1).replace('.', ',') : rnd(i.precip)) + ' мм' });
    const td = timeOfDay(i, 10, 5, 2);
    parts.push({ name: 'Время суток', max: 10, pts: td.pts, text: td.text });
    const caps = [];
    if (i.code >= 95) caps.push({ cap: 15, warn: 'Гроза: рыбачить небезопасно' });
    if (i.gust >= 65) caps.push({ cap: 25, warn: 'Очень сильный ветер: рыбалка опасна' });
    if (i.thaw) caps.push({ cap: 30, warn: 'Оттепель: лёд может быть ненадёжным' });
    if (cat === 'none') caps.push({ cap: 20, warn: 'Льда, скорее всего, ещё нет: не выходить' });
    if (cat === 'thin') caps.push({ cap: 25, warn: 'Лёд, скорее всего, тонкий: не выходить' });
    if (chill <= -35) caps.push({ cap: 20, warn: 'Опасный мороз: риск обморожения' });
    else if (chill <= -30) caps.push({ cap: 30, warn: 'Очень сильный мороз: риск обморожения' });
    if (eff >= 32) caps.push({ cap: 30, warn: 'Очень сильный ветер или метель: на льду опасно' });
    return finishScore(parts, caps);
  }
  const fishScore = (i) => (i.ice ? fishScoreIce(i) : fishScoreOpen(i));

  /* --- режим и оценка льда --- */
  const HIST_TTL = 6 * 3600 * 1000;
  const histKey = (lat, lon) => 'fishmap.hist.' + lat.toFixed(1) + ',' + lon.toFixed(1);
  // температуры за последние 30 дней (отдельный лёгкий запрос, кэш 6 часов; нужен только для подлёдного режима)
  const getHistory = (lat, lon) => once('h' + histKey(lat, lon), () => fetchHistory(lat, lon));
  async function fetchHistory(lat, lon) {
    const key = histKey(lat, lon), cached = lsGet(key, null);
    if (cached && cached.data && Date.now() - cached.t < HIST_TTL) return cached.data;
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(2) + '&longitude=' + lon.toFixed(2) +
        '&daily=temperature_2m_max,temperature_2m_min&past_days=30&forecast_days=1&timezone=auto', { signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      const data = { time: j.daily.time, tmax: j.daily.temperature_2m_max, tmin: j.daily.temperature_2m_min };
      lsSet(key, { t: Date.now(), data });
      return data;
    } catch (e) { return cached && cached.data ? cached.data : null; }
  }
  // дни строго до сегодняшнего
  function histBefore(hist, today) {
    const out = [];
    if (!hist || !hist.time) return out;
    for (let k = 0; k < hist.time.length; k++) {
      if (hist.time[k] >= today) break;
      if (hist.tmax[k] != null && hist.tmin[k] != null) out.push({ mx: hist.tmax[k], mn: hist.tmin[k] });
    }
    return out;
  }
  // грубая оценка толщины льда по накопленному морозу (Стефан): h = 1,8 * sqrt(градусо-дни мороза - 25), запас на осторожность. Оттепель сильно «съедает».
  // Это ориентир, не разрешение выходить на лёд: толщину в сантиметрах не показываем.
  function iceCategory(days) {
    if (!days.length) return 'unknown';
    let fdd = 0;
    days.forEach((x) => { const m = (x.mx + x.mn) / 2; fdd = m < 0 ? fdd - m : Math.max(0, fdd - 1.5 * m); });
    const h = 1.8 * Math.sqrt(Math.max(0, fdd - 25));
    return h < 5 ? 'none' : h < 10 ? 'thin' : h < 20 ? 'check' : 'ok';
  }
  function fishCtx(d, hist) {
    const dy = d.daily, mode = S.fishMode || 'auto';
    const past = histBefore(hist, dy.time[0]);
    const mean = (mx, mn) => (mx + mn) / 2;
    const ms = past.slice(-5).map((x) => mean(x.mx, x.mn));
    for (let k = 0; k < 2 && k < dy.time.length; k++) if (dy.temperature_2m_max[k] != null && dy.temperature_2m_min[k] != null) ms.push(mean(dy.temperature_2m_max[k], dy.temperature_2m_min[k]));
    const avg = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 10;
    const cat = iceCategory(past);
    // авто: подлёдная при морозах, а также когда лёд, по оценке, уже встал (оттепель среди зимы режим не меняет)
    const autoIce = avg <= -5 || cat === 'check' || cat === 'ok';
    const ice = mode === 'ice' || (mode === 'auto' && autoIce);
    const yMax = past.length ? past[past.length - 1].mx : -99;
    return { ice: ice, autoIce: autoIce, mode: mode, avg: avg, cat: cat, yMax: yMax };
  }
  const thawOf = (d, ctx, i) => {
    const mx = d.daily.temperature_2m_max;
    return Math.max(mx[i] == null ? -99 : mx[i], i === 0 ? ctx.yMax : (mx[i - 1] == null ? -99 : mx[i - 1])) > 2;
  };

  function fishNow(d, series, ctx) {
    ctx = ctx || fishCtx(d, null);
    const c = d.current, dy = d.daily;
    return fishScore({
      ice: ctx.ice, iceCat: ctx.cat, thaw: ctx.ice && (thawOf(d, ctx, 0) || c.temperature_2m > 1),
      temp: c.temperature_2m, pressure: c.pressure_msl,
      dp: series.length >= 7 ? series[series.length - 1] - series[series.length - 7] : null,
      wind: c.wind_speed_10m, gust: c.wind_gusts_10m, cloud: c.cloud_cover,
      precip: Math.max((dy.precipitation_sum[0] || 0) * 0.6, codePrecip(c.weather_code)), code: c.weather_code,
      hour: hourOf(c.time), sr: dy.sunrise && dy.sunrise[0] ? hourOf(dy.sunrise[0]) : null, ss: dy.sunset && dy.sunset[0] ? hourOf(dy.sunset[0]) : null
    });
  }
  function fishDay(d, i, ctx) {
    ctx = ctx || fishCtx(d, null);
    const dy = d.daily, date = dy.time[i], H = d.hourly || {};
    const at = (h) => (H.time || []).indexOf(date + 'T' + h + ':00');
    const a = at('09'), b = at('15');
    const pa = a >= 0 ? H.pressure_msl[a] : null, pb = b >= 0 ? H.pressure_msl[b] : null;
    return fishScore({
      ice: ctx.ice, iceCat: ctx.cat, thaw: ctx.ice && thawOf(d, ctx, i),
      temp: dy.temperature_2m_min[i] + 0.4 * (dy.temperature_2m_max[i] - dy.temperature_2m_min[i]),
      pressure: pb != null ? pb : 1013, dp: pa != null && pb != null ? pb - pa : null,
      wind: (dy.wind_speed_10m_max[i] || 0) * 0.75, gust: (dy.wind_gusts_10m_max[i] || 0) * 0.85,
      cloud: codeCloud(dy.weather_code[i]), precip: Math.max(dy.precipitation_sum[i] || 0, codePrecip(dy.weather_code[i]) * 0.5),
      code: dy.weather_code[i], dayMode: true
    });
  }
  function ringHtml(score) {
    const circ = 2 * Math.PI * 16;
    return '<span class="ringw"><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--ringbg)" stroke-width="4"/>' +
      '<circle cx="20" cy="20" r="16" fill="none" stroke="var(--fc)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (circ * score / 100).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 20 20)"/></svg><span class="rn">' + score + '</span></span>';
  }
  function showFish() {
    const f = S.fish; if (!f) return;
    const bw = f.days.reduce((b, x, i) => (x.score > (b < 0 ? -1 : f.days[b].score) ? i : b), -1);
    const rows = f.now.parts.map((p) => {
      const pct = rnd(p.pts / p.max * 100);
      return '<div class="fp" data-l="' + levelOf(pct) + '"><div class="fh"><span>' + esc(p.name) + '</span><span>' + p.pts + ' из ' + p.max + '</span></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="ft">' + esc(p.text) + '</div></div>';
    }).join('');
    const best = f.sr != null && f.ss != null
      ? '<p class="fbest">' + ic('sun', 18, 'currentColor', 1.8) + '<span>Лучшее время сегодня: ' + hm(f.sr - 1) + '–' + hm(f.sr + 2.5) + ' и ' + hm(f.ss - 2.5) + '–' + hm(f.ss + 1) + '</span></p>' : '';
    const days = f.days.map((x, i) => '<div class="fd" data-l="' + x.lvl + '"><span class="d">' + esc(x.name) + '</span><span class="fs' + (i === bw && x.score >= 50 ? ' best' : '') + '">' + x.score + '</span></div>').join('');
    const ice = f.ctx.ice, md = f.ctx.mode;
    const seg = '<div class="seg" id="segFish" role="group" aria-label="Режим рыбалки">' + [['auto', 'Авто'], ['open', 'Лето'], ['ice', 'Зима']].map((x) => '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (md === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
    const modeTxt = (ice ? 'Зима, подлёдная' : 'Лето, открытая вода') + (md === 'auto' ? ' (авто)' : '');
    openModal('<div class="fhead" data-l="' + f.now.lvl + '">' + ringHtml(f.now.score) + '<div><h3>Клёв: ' + esc(f.now.label) + '</h3><p class="sub">' + f.now.score + ' из 100 · ' + esc(modeTxt) + '</p></div></div>' + seg +
      (f.now.warn ? '<p class="fwarn">' + ic('storm', 18, 'currentColor', 1.8) + '<span>' + esc(f.now.warn) + '</span></p>' : '') +
      '<div class="fparts">' + rows + '</div>' + best +
      '<h4 class="fh4">Лучшие дни</h4><div class="fdays">' + days + '</div>' +
      (ice ? '<p class="fwarn fice">' + ic('storm', 18, 'currentColor', 1.8) + '<span>Лёд в приложении только оценка по морозам последних недель. Всегда проверяйте толщину пешнёй: ходить можно от 10 см чистого льда. На реках и у течения лёд ненадёжен, мы это не учитываем. Не ходите одни.</span></p>' : '') +
      '<p class="fnote">Это ориентир по погоде, не гарантия. Не учитываются ' + (ice ? 'реальная толщина и снег на льду, ' : 'температура и уровень воды, ') + 'вид рыбы и ваша точка. Итог строже простой суммы частей. Давление считается косвенным признаком: прямого научного подтверждения связи с клёвом мало, зато много наблюдений рыбаков.</p>' +
      '<div class="row"><button class="btn btn-primary" id="fOk" type="button">Понятно</button></div>');
    $('#fOk').onclick = closeModal;
    $('#segFish').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setFishMode(b.dataset.v); showFish(); }));
  }
  function onSeasonChange(announce) {
    renderMarkers();
    if (lv.classList.contains('open')) renderListItems();
    const hidden = allSpots().length - seasonSpots().length;
    if (announce && hidden) toast('Сезон: ' + SEAS[curSeason()] + '. Скрыто точек другого сезона: ' + hidden, 4500);
  }
  let lastAutoCheck = 0;
  async function refreshAutoSeason() {
    try {
      const c = map.getCenter();
      const [res, hist] = await Promise.all([getWeather(c.lat, c.lng), getHistory(c.lat, c.lng).catch(() => null)]);
      if (!res) return;
      const next = fishCtx(res.data, hist).autoIce ? 'winter' : 'summer';
      lsSet('fishmap.autoSeason', next);
      lastAutoCheck = Date.now();
      if (next !== S.autoSeason) { const before = curSeason(); S.autoSeason = next; if (curSeason() !== before) onSeasonChange(true); }
    } catch (e) { /* без данных остаётся прежний сезон */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastAutoCheck > 30 * 60 * 1000) refreshAutoSeason(); });
  function setFishMode(v) {
    const before = curSeason();
    S.fishMode = v; lsSet('fishmap.fishmode', v);
    onSeasonChange(curSeason() !== before);
    if (S.wxRes && sheet.classList.contains('open')) fillWeather(S.wxRes, S.wxHist);
    if (lv.classList.contains('open')) renderListItems();
    const sg = document.querySelector('#segFishMode');
    if (sg) sg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.fishMode)));
  }

  /* ---------- weather ---------- */
  // одинаковые запросы, идущие одновременно (например, много точек рядом в списке), объединяем в один
  const inflight = new Map();
  const once = (key, fn) => { if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key))); return inflight.get(key); };
  const getWeather = (lat, lon) => once('wx' + lat.toFixed(2) + ',' + lon.toFixed(2), () => fetchWeather(lat, lon));
  async function fetchWeather(lat, lon) {
    const key = 'fishmap.wx.' + lat.toFixed(2) + ',' + lon.toFixed(2);
    const cached = lsGet(key, null);
    if (cached && Date.now() - cached.t < 15 * 60 * 1000) return { data: cached.data, t: cached.t, stale: false };
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m' +
      '&hourly=pressure_msl&past_hours=24' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset' +
      '&forecast_days=4&timezone=auto&wind_speed_unit=kmh';
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(url, { signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      const data = await r.json();
      lsSet(key, { t: Date.now(), data });
      return { data, t: Date.now(), stale: false };
    } catch (e) {
      if (cached) return { data: cached.data, t: cached.t, stale: true };
      return null;
    }
  }
  function pressureSeries(d) {
    try {
      const idx = d.hourly.time.indexOf(d.current.time.slice(0, 13) + ':00');
      if (idx < 0) return [];
      return d.hourly.pressure_msl.slice(Math.max(0, idx - 24), idx + 1).filter((v) => v != null);
    } catch (e) { return []; }
  }
  function trend(series) {
    if (series.length < 7) return { k: 'flat', text: 'стабильно' };
    const diff = series[series.length - 1] - series[series.length - 7];
    if (diff > 1.5) return { k: 'up', text: 'растёт за 6 ч' };
    if (diff < -1.5) return { k: 'down', text: 'падает за 6 ч' };
    return { k: 'flat', text: 'стабильно' };
  }
  function sparkSvg(series, w) {
    if (series.length < 2) return '';
    const h = 50, pad = 6, min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    const span = Math.max(max - min, 2);
    const pts = series.map((v, i) => [rnd((i / (series.length - 1)) * w), rnd(pad + (1 - (v - min) / span) * (h - pad * 2))]);
    const last = pts[pts.length - 1];
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' +
      pts.map((p) => p.join(',')).join(' ') + '" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + Math.min(last[0], w - 4) + '" cy="' + last[1] + '" r="4.5" fill="var(--accent)"/></svg>';
  }

  function fillWeather(res, hist) {
    const d = res.data, c = d.current, dy = d.daily;
    const [icn, txt] = wmo(c.weather_code);
    const series = pressureSeries(d), tr = trend(series);
    const trIcon = tr.k === 'down' ? ic('arrow_down', 16, 'currentColor', 2.2) : tr.k === 'up' ? ic('arrow_up', 16, 'currentColor', 2.2) : '';
    const precip = (dy.precipitation_sum[0] || 0);
    const precipTxt = (precip > 0 ? precip.toFixed(1).replace('.', ',') : '0') + ' мм';
    const rot = 'transform:rotate(' + ((c.wind_direction_10m + 180) % 360) + 'deg)';

    $('#wxNow').innerHTML =
      '<div class="wxrow"><span class="wxicon">' + ic(icn, 44, 'currentColor', 1.6) + '</span><div class="temp">' + fmtT(c.temperature_2m) + '</div>' +
      '<div class="desc"><span>' + esc(txt) + '</span><span>Ощущается ' + fmtT(c.apparent_temperature) + '</span></div></div>' +
      (res.stale ? '<div class="stale">' + ic('cloud_off', 18, 'currentColor', 2) + '<span>Нет сети, данные от ' + hhmm(res.t) + '</span></div>' : '');

    $('#miniWx').innerHTML = ic(icn, 22, 'currentColor', 1.8) + fmtT(c.temperature_2m);
    const fctx = fishCtx(d, hist);
    const fnow = fishNow(d, series, fctx);
    const fdays = dy.time.map((tm, i) => {
      const fd = fishDay(d, i, fctx);
      return { name: i === 0 ? 'Сегодня' : new Date(tm + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' }), score: fd.score, lvl: fd.lvl };
    });
    S.fish = { now: fnow, ctx: fctx, days: fdays, sr: dy.sunrise && dy.sunrise[0] ? hourOf(dy.sunrise[0]) : null, ss: dy.sunset && dy.sunset[0] ? hourOf(dy.sunset[0]) : null };
    let bestDay = -1;
    fdays.forEach((x, i) => { if (x.score >= 50 && (bestDay < 0 || x.score > fdays[bestDay].score)) bestDay = i; });
    $('#wxFish').innerHTML = '<button class="fishrow" id="bFish" type="button" data-l="' + fnow.lvl + '" aria-label="Условия клёва: ' + fnow.score + ' из 100, ' + fnow.label + '. Подробнее">' +
      ringHtml(fnow.score) + '<span class="ftxt"><b>Клёв: ' + esc(fnow.label) + '</b><span>' + esc(fnow.warn || ((fctx.ice ? 'Подлёдная' : 'Открытая вода') + ' · почему такая оценка')) + '</span></span>' + ic('chev_r', 20, 'currentColor', 2) + '</button>';
    $('#bFish').addEventListener('click', showFish);
    $('#miniFish').innerHTML = '<span class="fs" data-l="' + fnow.lvl + '">Клёв ' + fnow.score + '</span>';

    $('#wxChips').innerHTML =
      '<span class="chip">' + ic('wind', 18) + rnd(c.wind_speed_10m) + ' км/ч</span>' +
      '<span class="chip">' + ic('gauge', 18) + mmHg(c.pressure_msl) + ' мм' + (trIcon ? '<span class="fall">' + trIcon + '</span>' : '') + '</span>' +
      '<span class="chip">' + ic('drop', 18) + precipTxt + '</span>';

    $('#wxStats').innerHTML =
      '<div class="stat"><span class="l">' + ic('arrow_up', 14, 'currentColor', 2.2, rot) + 'Ветер</span><span class="v">' + rnd(c.wind_speed_10m) + ' км/ч</span><span class="s">' + dirName(c.wind_direction_10m) + ', порывы ' + rnd(c.wind_gusts_10m) + '</span></div>' +
      '<div class="stat"><span class="l">' + ic('gauge', 14, 'currentColor', 2) + 'Давление</span><span class="v">' + mmHg(c.pressure_msl) + ' мм</span><span class="s">' + tr.text + '</span></div>' +
      '<div class="stat"><span class="l">' + ic('cloud', 14, 'currentColor', 2) + 'Облачность</span><span class="v">' + rnd(c.cloud_cover) + '%</span><span class="s">' + esc(txt.toLowerCase()) + '</span></div>' +
      '<div class="stat"><span class="l">' + ic('drop', 14, 'currentColor', 2) + 'Осадки</span><span class="v">' + precipTxt + '</span><span class="s">сегодня</span></div>';

    $('#wxForecast').innerHTML = '<div class="forecast">' + dy.time.map((tm, i) => {
      const dt = new Date(tm + 'T12:00:00');
      const nm = i === 0 ? 'Сегодня' : dt.toLocaleDateString('ru-RU', { weekday: 'short' });
      return '<div class="fday" data-l="' + fdays[i].lvl + '"><span class="d">' + esc(nm) + '</span>' + ic(wmo(dy.weather_code[i])[0], 26, 'currentColor', 1.6) +
        '<span class="hi">' + fmtT(dy.temperature_2m_max[i]) + '</span><span class="lo">' + fmtT(dy.temperature_2m_min[i]) + '</span>' +
        '<span class="fs' + (i === bestDay ? ' best' : '') + '" title="Клёв ' + fdays[i].score + ' из 100" aria-label="Клёв ' + fdays[i].score + ' из 100">' + fdays[i].score + '</span></div>';
    }).join('') + '</div>';

    const w = Math.min(window.innerWidth, 480) - 40 - 32;
    $('#wxSpark').innerHTML = series.length > 1
      ? '<div class="spark"><div class="t"><span>Давление за 24 часа</span>' + (tr.k !== 'flat' ? '<span class="tr">' + (tr.k === 'down' ? ic('arrow_down', 14, 'currentColor', 2.2) + 'падает' : ic('arrow_up', 14, 'currentColor', 2.2) + 'растёт') + '</span>' : '') + '</div>' + sparkSvg(series, w) + '</div>'
      : '';
    layoutSheet();
  }

  async function loadWeather(t) {
    const key = (t.id || 'temp') + ':' + t.lat + ',' + t.lon;
    S.wxKey = key; S.wxRes = null; S.wxHist = null;   // погода предыдущей точки не должна попасть в новую при смене режима
    const [res, hist] = await Promise.all([getWeather(t.lat, t.lon), getHistory(t.lat, t.lon).catch(() => null)]);
    if (S.wxKey !== key) return;
    if (!res) {
      $('#wxNow').innerHTML = '<div class="err">' + ic('cloud_off', 24, 'currentColor', 1.8) + '<span>Нет сети и нет сохранённой погоды для этого места. Откройте карту с интернетом один раз.</span></div>';
      $('#wxFish').innerHTML = ''; S.fish = null;
      $('#wxChips').innerHTML = ''; $('#wxStats').innerHTML = ''; $('#wxForecast').innerHTML = ''; $('#wxSpark').innerHTML = '';
      layoutSheet();
      return;
    }
    S.wxRes = res; S.wxHist = hist;
    fillWeather(res, hist);
  }

  /* ---------- bottom sheet ---------- */
  const sheet = $('#sheet'), body = $('#sheetBody'), scroll = $('#scroll'), grab = $('#grab');
  let heights = { mini: 96, peek: 280, half: 560, full: 760 };

  const curTarget = () => {
    if (S.sel) { const s = findSpot(S.sel); if (s) return Object.assign({ kind: 'spot' }, s); }
    if (S.temp) return { kind: 'temp', lat: S.temp.lat, lon: S.temp.lon, label: S.temp.label || '' };
    return null;
  };
  const maxFull = () => window.innerHeight - 64 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0);
  function allowedStates() { return sheet.dataset.kind === 'spot' ? ['mini', 'peek', 'half', 'full'] : ['mini', 'peek', 'half']; }
  const nextState = () => { const al = allowedStates().filter((k) => k !== 'mini'); return S.state === 'mini' ? 'peek' : al[(al.indexOf(S.state) + 1) % al.length]; };
  function safeBottom() {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;bottom:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(d);
    const v = parseFloat(getComputedStyle(d).paddingBottom) || 0;
    d.remove(); return v;
  }

  function measure() {
    const chips = $('#wxChips'), actions = $('#actions');
    if (!chips || !actions) return;
    const wasExp = sheet.classList.contains('expanded'), wasMini = sheet.classList.contains('is-mini');
    sheet.classList.remove('expanded', 'is-mini');
    const peek = grab.offsetHeight + chips.offsetTop + Math.max(chips.offsetHeight, 36) + 6 + actions.offsetHeight;
    sheet.classList.add('expanded');
    const spark = $('#wxSpark'), fc = $('#wxForecast');
    const endEl = spark && spark.offsetHeight ? spark : fc;
    const halfNeed = grab.offsetHeight + (endEl ? endEl.offsetTop + endEl.offsetHeight : 0) + 12 + actions.offsetHeight;
    sheet.classList.toggle('expanded', wasExp);
    sheet.classList.toggle('is-mini', wasMini);
    const mini = grab.offsetHeight + 56 + 10 + safeBottom();
    const full = maxFull();
    // у точки с фото и отзывами содержимое длинное: половинная высота не больше ~62% экрана, дальше панель листается
    const half = clamp(Math.min(rnd(halfNeed), rnd(window.innerHeight * 0.62)), peek + 80, full);
    heights = { mini: mini, peek: Math.min(peek, full), half: half, full: full };
  }
  function applyState(st, instant) {
    S.state = st;
    sheet.classList.toggle('expanded', st === 'half' || st === 'full');
    sheet.classList.toggle('is-full', st === 'full');
    sheet.classList.toggle('is-mini', st === 'mini');
    if (instant) sheet.classList.add('dragging');
    sheet.style.setProperty('--h', heights[st] + 'px');
    if (instant) { sheet.offsetHeight; sheet.classList.remove('dragging'); }
    if (st === 'mini') scroll.scrollTop = 0;
  }
  function layoutSheet() {
    if (!sheet.classList.contains('open')) return;
    measure();
    applyState(S.state, false);
    focusTarget();
  }
  function closeSheet() {
    sheet.classList.remove('open');
    sheet.style.setProperty('--h', '0px');
    document.body.classList.remove('sheet-open');
    S.sel = null; S.temp = null; S.wxKey = '';
    setTempMarker(null); renderMarkers();
  }
  function visibleSheetH() { return sheet.classList.contains('open') ? Math.min(heights[S.state], window.innerHeight * 0.8) : 0; }
  function focusTarget() {
    const t = curTarget(); if (!t) return;
    const z = Math.max(map.getZoom(), 12);
    const pt = map.project([t.lat, t.lon], z).add([0, visibleSheetH() / 2 - 10]);
    map.setView(map.unproject(pt, z), z, { animate: true, duration: 0.35 });
  }

  function descHtml(t) {
    return '<section class="desc-sec"><h3>Описание</h3><textarea id="descr" aria-label="Описание точки" placeholder="Как подойти, глубина, на что клюёт…" rows="4"' + (t.shared ? ' readonly' : '') + '>' + esc(t.note || '') + '</textarea></section>';
  }
  const subText = (t, saved) => (saved ? (t.author ? 'Автор: ' + esc(t.author) : 'Сохранено') + ' · ' + SEAS[seasonOf(t)] + ' · ' : '') + coordsText(t);
  function renderSheet(startState) {
    const t = curTarget();
    if (!t) { closeSheet(); return; }
    const saved = t.kind === 'spot';
    sheet.dataset.kind = t.kind;
    sheet.classList.add('open');
    document.body.classList.add('sheet-open');
    const ttl = esc(saved ? t.name : (t.label || 'Новая точка'));
    body.innerHTML =
      '<div id="miniRow" class="mini"><button class="mini-main" id="bExpand" type="button" aria-label="Развернуть панель"><span id="miniWx" class="mini-wx"></span><span class="mini-title">' + ttl + '</span><span id="miniFish"></span>' + ic('chev_r', 20, 'currentColor', 2, 'transform:rotate(-90deg);color:var(--muted)') + '</button>' +
      '<button class="icon-btn" id="bClose" type="button" aria-label="Закрыть">' + ic('x', 20, 'currentColor', 2) + '</button></div>' +
      '<div class="head"><div class="titlecol"><h2 class="title">' + esc(saved ? t.name : (t.label || 'Новая точка')) + '</h2><div class="sub">' + subText(t, saved) + '</div></div>' +
      '<div class="hbtns">' + (saved && !t.shared ? '<button class="icon-btn cbtn" id="bComm" type="button" aria-label="Отзывы">' + ic('chat', 22) + '<span class="bdg" id="bdg"></span></button>' : '') + (saved ? '<button class="icon-btn" id="bMore" type="button" aria-label="Ещё">' + ic('dots', 22) + '</button>' : '<span class="tag tag-accent">Не сохранена</span>') +
      '<button class="icon-btn" id="bCollapse" type="button" aria-label="Свернуть погоду">' + ic('chev_r', 22, 'currentColor', 2, 'transform:rotate(90deg)') + '</button></div></div>' +
      '<div id="wxNow" class="wxnow"><div class="skel" style="height:44px;width:70%;margin-bottom:8px"></div><div class="skel" style="height:14px;width:45%"></div></div>' +
      '<div id="wxFish"></div>' +
      '<div id="wxChips" class="chips"><span class="skel" style="height:36px;width:110px;border-radius:18px"></span><span class="skel" style="height:36px;width:90px;border-radius:18px"></span><span class="skel" style="height:36px;width:80px;border-radius:18px"></span></div>' +
      '<div id="extra"><div id="wxStats" class="stats"></div>' + photosHtml(t, saved) + (saved ? commentsHtml(t) : '') + '<div id="wxForecast"></div><div id="wxSpark"></div>' + (saved ? descHtml(t) : '') + '</div>' +
      '<div id="actions" class="actions">' +
      (saved
        ? '<a class="btn btn-primary" href="' + routeUrl(t) + '" target="_blank" rel="noopener">' + ic('nav', 20) + 'Маршрут</a><a class="btn btn-secondary" href="' + tgUrl(t) + '" target="_blank" rel="noopener">' + ic('send', 20) + 'В Telegram</a>' + (t.shared ? '' : '<button class="icon-btn sq" id="bPhoto" type="button" aria-label="Добавить фото">' + ic('camera', 22) + '</button>')
        : '<button class="btn btn-primary" id="bSave" type="button">' + ic('bookmark', 20) + 'Сохранить точку</button><a class="icon-btn sq" href="' + routeUrl(t) + '" target="_blank" rel="noopener" aria-label="Маршрут">' + ic('nav', 22) + '</a>') +
      '</div>';
    $('#bCollapse').addEventListener('click', () => { applyState('mini'); setTimeout(focusTarget, 60); });
    $('#bExpand').addEventListener('click', () => { applyState('peek'); setTimeout(focusTarget, 60); });
    $('#bClose').addEventListener('click', closeSheet);
    if (saved) {
      renderPhotoStrip();
      renderComments();
      const bc = $('#bComm');
      if (bc) bc.addEventListener('click', () => {
        if (S.state !== 'full' && S.state !== 'half') applyState('half');
        setTimeout(() => { const el = $('#cmSec'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 120);
      });
      const bp = $('#bPhoto');
      if (bp) bp.addEventListener('click', () => {
        if (!S.code) { toast('Сначала войдите в группу по ссылке из Telegram'); return; }
        const f = $('#phFile'); if (f) f.click();
      });
      $('#bMore').addEventListener('click', () => moreMenu(t));
      const ta = $('#descr');
      let tm;
      ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { const s = findSpot(t.id); if (s && !s.shared) { s.note = ta.value; touch(s); } }, 400); });
    } else {
      $('#bSave').addEventListener('click', () => saveDialog({ lat: t.lat, lon: t.lon }, t.label));
    }
    S.state = startState || S.state;
    measure();
    applyState(S.state, true);
    focusTarget();
    loadWeather(t);
  }
  const routeUrl = (t) => 'https://www.google.com/maps/dir/?api=1&destination=' + t.lat + ',' + t.lon;
  function tgUrl(t) {
    const share = APP_URL + '#p=' + t.lat.toFixed(5) + ',' + t.lon.toFixed(5) + ',' + encodeURIComponent(t.name || 'Точка');
    const gm = 'https://www.google.com/maps/search/?api=1&query=' + t.lat + ',' + t.lon;
    return 'https://t.me/share/url?url=' + encodeURIComponent(share) + '&text=' + encodeURIComponent('Выше: точка на нашей карте (погода, отзывы, фото)\nНазвание: ' + (t.name || 'Точка') + '\nGoogle Maps: ' + gm);
  }

  function openSpot(id, st) { S.sel = id; S.temp = null; setTempMarker(null); renderMarkers(); renderSheet(st || 'half'); }
  function openTemp(ll) { S.sel = null; S.temp = { lat: ll.lat, lon: ll.lng }; setTempMarker(ll); renderMarkers(); renderSheet('peek'); }

  // drag
  (function bindDrag() {
    let dragging = false, startY = 0, startH = 0, moved = false, lastY = 0, lastT = 0, v = 0;
    grab.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false; startY = lastY = e.clientY; lastT = e.timeStamp; v = 0;
      startH = sheet.getBoundingClientRect().height;
      grab.setPointerCapture(e.pointerId);
      sheet.classList.add('dragging');
    });
    grab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientY - startY) > 4) moved = true;
      const al = allowedStates();
      const h = clamp(startH + (startY - e.clientY), heights.mini * 0.9, heights[al[al.length - 1]]);
      sheet.style.setProperty('--h', h + 'px');
      v = (lastY - e.clientY) / ((e.timeStamp - lastT) || 1);
      lastY = e.clientY; lastT = e.timeStamp;
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('dragging');
      const al = allowedStates();
      if (!moved) { applyState(nextState()); layoutAfter(); return; }
      const cur = sheet.getBoundingClientRect().height + v * 160;
      let best = al[0], bd = 1e9;
      al.forEach((k) => { const d = Math.abs(heights[k] - cur); if (d < bd) { bd = d; best = k; } });
      applyState(best); layoutAfter();
    };
    const layoutAfter = () => setTimeout(focusTarget, 60);
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    grab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyState(nextState()); layoutAfter(); }
    });
  })();

  let ignoreMapClick = false;
  map.on('click', (e) => {
    if (ignoreMapClick) return;
    openTemp(e.latlng);
  });
  window.addEventListener('resize', () => { layoutSheet(); });

  /* ---------- modal ---------- */
  const modal = $('#modal'), mcard = $('#modalCard');
  function openModal(html) { mcard.innerHTML = html; modal.hidden = false; }
  function closeModal() { modal.hidden = true; mcard.innerHTML = ''; }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!modal.hidden) closeModal(); else if (!$('#layerMenu').hidden) $('#layerMenu').hidden = true; } });

  let toastT;
  function toast(msg, ms) {
    const el = $('#toast'); el.textContent = msg;
    const place = () => {
      const lift = lv.classList.contains('open') ? 24 : (sheet.classList.contains('open') ? sheet.getBoundingClientRect().height + 16 : 24);
      el.style.bottom = 'calc(' + lift + 'px + env(safe-area-inset-bottom,0px))';
    };
    place(); setTimeout(place, 340);
    el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms || 2400);
  }

  function saveDialog(p, presetName) {
    const n = allSpots().length + 1;
    openModal('<h3>Сохранить точку</h3><p class="sub">' + coordsText(p) + '</p>' +
      '<label for="fName">Название</label><input id="fName" class="input" maxlength="60" value="' + esc(presetName || 'Точка ' + n) + '" placeholder="Например: Bow River, мост">' +
      '<label>Сезон</label><div class="seg" id="fSeason" role="group" aria-label="Сезон точки">' + ['summer', 'winter', 'both'].map((k) => '<button type="button" data-v="' + k + '" aria-pressed="' + (k === curSeason()) + '">' + SEAS[k] + '</button>').join('') + '</div>' +
      '<div class="row"><button class="btn btn-secondary" id="fCancel" type="button">Отмена</button><button class="btn btn-primary" id="fSave" type="button">Сохранить</button></div>');
    const inp = $('#fName'); inp.focus(); inp.select();
    $('#fCancel').onclick = closeModal;
    let seasonSel = curSeason();
    $('#fSeason').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      seasonSel = b.dataset.v;
      $('#fSeason').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    let done = false;
    const go = () => {
      if (done) return;
      const name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      done = true;
      const s = { id: uid(), name: name, lat: p.lat, lon: p.lon, note: '', season: seasonSel, author: S.me || '', owner: S.dev, created: Date.now(), updated: Date.now(), dirty: true };
      S.spots.push(s); saveLocal(); scheduleSync(); closeModal();
      S.temp = null; setTempMarker(null);
      openSpot(s.id, 'half');
      toast(inSeason(s) ? 'Точка сохранена' : 'Точка сохранена. Она видна в режиме «' + SEAS[seasonSel] + '»', inSeason(s) ? undefined : 4500);
    };
    $('#fSave').onclick = go;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }
  const sameName = (a) => !!(a && S.me && a.trim().toLowerCase() === S.me.trim().toLowerCase());
  const canDelete = (s) => (s.owner === S.dev || sameName(s.author) || (!s.owner && !s.author));
  function moreMenu(t) {
    openModal('<h3>' + esc(t.name) + '</h3><div class="stack">' +
      (t.shared ? '<p class="sub">Общая точка из файла spots.json</p>' :
        '<button class="btn btn-secondary" id="mRen" type="button">' + ic('edit', 20) + 'Переименовать</button>' +
        '<button class="btn btn-secondary" id="mSeas" type="button">' + ic(seasonOf(t) === 'winter' ? 'fishw' : 'fish', 20) + 'Сезон: ' + SEAS[seasonOf(t)] + '</button>' +
        (canDelete(t) ? '<button class="btn btn-danger" id="mDel" type="button">' + ic('trash', 20) + 'Удалить точку</button>' : '<p class="sub">Удалить точку может только её автор' + (t.author ? ': ' + esc(t.author) : '') + '.</p>')) +
      '<button class="btn btn-secondary" id="mCancel" type="button">Закрыть</button></div>');
    $('#mCancel').onclick = closeModal;
    if (t.shared) return;
    $('#mRen').onclick = () => {
      openModal('<h3>Переименовать</h3><label for="rName">Название</label><input id="rName" class="input" maxlength="60" value="' + esc(t.name) + '">' +
        '<div class="row"><button class="btn btn-secondary" id="rCancel" type="button">Отмена</button><button class="btn btn-primary" id="rSave" type="button">Сохранить</button></div>');
      const inp = $('#rName'); inp.focus(); inp.select();
      $('#rCancel').onclick = closeModal;
      const go = () => { const v = inp.value.trim(); if (!v) return; const s = findSpot(t.id); s.name = v; touch(s); closeModal(); renderMarkers(); renderSheet(S.state); };
      $('#rSave').onclick = go; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    };
    $('#mSeas').onclick = () => {
      openModal('<h3>Сезон точки</h3><p class="sub">Летние точки видны в режиме «Лето», зимние в режиме «Зима», точки «Оба сезона» видны всегда.</p><div class="stack">' +
        ['summer', 'winter', 'both'].map((k) => '<button class="btn ' + (k === seasonOf(t) ? 'btn-primary' : 'btn-secondary') + '" type="button" data-v="' + k + '">' + SEAS[k] + '</button>').join('') +
        '<button class="btn btn-secondary" id="sCancel" type="button">Отмена</button></div>');
      $('#sCancel').onclick = closeModal;
      mcard.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
        const x = findSpot(t.id); if (!x) return;
        x.season = b.dataset.v; touch(x); closeModal(); renderMarkers(); renderSheet(S.state);
        if (!inSeason(x)) toast('Точка спрятана до режима «' + SEAS[x.season] + '»', 4500);
      }));
    };
    if (!$('#mDel')) return;
    $('#mDel').onclick = () => {
      openModal('<h3>Удалить точку?</h3><p class="sub">«' + esc(t.name) + '» ' + (S.code ? 'исчезнет у всех в группе. Это нельзя отменить.' : 'исчезнет с этого устройства. Это нельзя отменить.') + '</p>' +
        '<div class="row"><button class="btn btn-secondary" id="dCancel" type="button">Отмена</button><button class="btn btn-danger" id="dOk" type="button">Удалить</button></div>');
      $('#dCancel').onclick = closeModal;
      $('#dOk').onclick = () => { S.spots = S.spots.filter((s) => s.id !== t.id); if (isUuid(t.id) && !t.shared) { S.tomb.push(t.id); dropSpotPhotos(t.id); dropSpotComments(t.id); } saveLocal(); scheduleSync(); closeModal(); closeSheet(); toast('Точка удалена'); };
    };
  }

  // при наборе текста панель кнопок внизу прячется, иначе она закрывает кнопку «Отправить» над клавиатурой
  sheet.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches('textarea')) { sheet.classList.add('typing'); setTimeout(() => { try { e.target.scrollIntoView({ block: 'center' }); } catch (x) { /* не критично */ } }, 250); } });
  sheet.addEventListener('focusout', (e) => { if (e.target.matches && e.target.matches('textarea')) setTimeout(() => { if (!sheet.contains(document.activeElement) || !document.activeElement.matches('textarea')) sheet.classList.remove('typing'); }, 450); });

  /* ---------- list ---------- */
  const lv = $('#listView');
  function openList() {
    closeMenu();
    lv.innerHTML =
      '<div class="lv-head"><h2>Точки <span id="lvCount"></span></h2><button class="icon-btn" id="lvClose" type="button" aria-label="Закрыть">' + ic('x', 22) + '</button></div>' +
      '<label class="search">' + ic('search', 20, 'currentColor', 2) + '<input id="lvQ" aria-label="Поиск по точкам" placeholder="Поиск по названию" value="' + esc(S.q) + '"></label>' +
      '<div class="fchips" role="group" aria-label="Сортировка"><button type="button" data-f="all">Все</button><button type="button" data-f="near">Рядом</button><button type="button" data-f="new">Новые</button></div>' +
      '<div id="lvList" class="lv-list"></div>';
    lv.classList.add('open'); lv.setAttribute('aria-hidden', 'false');
    document.body.classList.add('list-open');
    $('#lvClose').onclick = closeList;
    $('#lvQ').addEventListener('input', (e) => { S.q = e.target.value; renderListItems(); });
    lv.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.f === 'near' && !S.loc) { locate(true, () => { S.filter = 'near'; renderListItems(); }); return; }
      S.filter = b.dataset.f; renderListItems();
    }));
    renderListItems();
  }
  function closeList() { lv.classList.remove('open'); lv.setAttribute('aria-hidden', 'true'); document.body.classList.remove('list-open'); }
  function renderListItems() {
    lv.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === S.filter)));
    const vis = seasonSpots(), hidden = allSpots().length - vis.length;
    $('#lvCount').textContent = vis.length;
    let arr = vis.slice();
    const q = S.q.trim().toLowerCase();
    if (q) arr = arr.filter((s) => s.name.toLowerCase().includes(q));
    if (S.filter === 'near' && S.loc) arr.sort((a, b) => distance(S.loc, a) - distance(S.loc, b));
    else if (S.filter === 'new') arr.sort((a, b) => (b.created || 0) - (a.created || 0));
    else arr.sort((a, b) => (a.created || 0) - (b.created || 0));
    const box = $('#lvList');
    const winNow = curSeason() === 'winter';
    const hideNote = hidden ? '<p class="lvhide">Скрыто точек другого сезона: ' + hidden + '. Сезон переключается в меню слоёв (Рыбалка).</p>' : '';
    if (!allSpots().length) {
      box.innerHTML = '<div class="empty">' + ic('fish', 44, 'currentColor', 1.5) + '<b>Пока нет точек</b>Тапните по карте, чтобы увидеть погоду и сохранить первое место.</div>';
      return;
    }
    if (!vis.length) { box.innerHTML = '<div class="empty">' + ic(winNow ? 'fishw' : 'fish', 44, 'currentColor', 1.5) + '<b>В этом сезоне точек нет</b>Сохраните точку на карте или переключите сезон.</div>' + hideNote; return; }
    if (!arr.length) { box.innerHTML = '<div class="empty"><b>Ничего не найдено</b>Попробуйте другое название.</div>' + hideNote; return; }
    box.innerHTML = arr.map((s) => {
      const dist = S.loc ? fmtDist(distance(S.loc, s)) + ' · ' : '';
      const date = s.created ? new Date(s.created).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
      return '<button class="card" type="button" data-id="' + esc(s.id) + '"><span class="thumb">' + ic(winNow ? 'fishw' : 'fish', 30, 'currentColor', 1.6) + '</span>' +
        '<span class="ct"><span class="n">' + esc(s.name) + '</span><span class="m">' + dist + ((s.author ? esc(s.author) + ' · ' : '') + (date ? (s.author ? '' : 'сохранена ') + esc(date) : 'общая точка')) + (nc(s.id) ? ' · ' + nc(s.id) + ' ' + plural(nc(s.id), 'отзыв', 'отзыва', 'отзывов') : '') + '</span>' +
        '<span class="w" data-w="' + esc(s.id) + '"></span></span>' + ic('chev_r', 20, 'currentColor', 2) + '</button>';
    }).join('') + hideNote;
    hydrateListThumbs(box, arr);
    box.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      const s = findSpot(c.dataset.id); closeList(); openSpot(s.id, 'half');
    }));
    arr.forEach((s) => Promise.all([getWeather(s.lat, s.lon), getHistory(s.lat, s.lon).catch(() => null)]).then(([r, hs]) => {
      const el = box.querySelector('[data-w="' + s.id + '"]'); if (!el || !r) return;
      const c = r.data.current;
      let fs = null;
      try { fs = fishNow(r.data, pressureSeries(r.data), fishCtx(r.data, hs)); } catch (e) { /* нет данных для оценки */ }
      el.innerHTML = ic(wmo(c.weather_code)[0], 16, 'currentColor', 1.8) + fmtT(c.temperature_2m) + ' · ' + rnd(c.wind_speed_10m) + ' км/ч' +
        (fs ? '<span class="fs fs-list" data-l="' + fs.lvl + '" aria-label="Клёв ' + fs.score + ' из 100">Клёв ' + fs.score + '</span>' : '');
    }));
  }
  $('#bList').addEventListener('click', openList);

  /* ---------- locate ---------- */
  function locate(silent, cb) {
    if (!navigator.geolocation) { toast('Геолокация недоступна'); return; }
    toast('Ищу вас…', 6000);
    navigator.geolocation.getCurrentPosition((p) => {
      S.loc = { lat: p.coords.latitude, lon: p.coords.longitude };
      if (meMarker) meMarker.remove();
      meMarker = L.marker([S.loc.lat, S.loc.lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, keyboard: false }).addTo(map);
      if (!silent) map.setView([S.loc.lat, S.loc.lon], Math.max(map.getZoom(), 13));
      $('#toast').classList.remove('show');
      if (cb) cb();
    }, () => toast('Не удалось определить позицию. Разрешите доступ к геолокации'), { enableHighAccuracy: true, timeout: 12000 });
  }
  $('#bLocate').addEventListener('click', () => locate(false));

  /* ---------- layers / settings menu ---------- */
  const menu = $('#layerMenu');
  function closeMenu() { menu.hidden = true; $('#bLayers').classList.remove('on'); }
  function openMenu() {
    menu.innerHTML =
      '<h4>Слой карты</h4><div class="seg" id="segLayer"><button type="button" data-v="osm">Карта</button><button type="button" data-v="topo">Топо</button></div>' +
      '<h4>Тема</h4><div class="seg" id="segTheme"><button type="button" data-v="auto">Авто</button><button type="button" data-v="light">Светлая</button><button type="button" data-v="dark">Тёмная</button></div>' +
      '<h4>Рыбалка</h4><div class="seg" id="segFishMode"><button type="button" data-v="auto">Авто</button><button type="button" data-v="open">Лето</button><button type="button" data-v="ice">Зима</button></div>' +
      '<p class="note">Лето и Зима показывают свои метки и свою формулу клёва. Авто переключается само, когда устанавливаются морозы.</p>' +
      '<h4>Группа</h4><div id="grp" class="grp"></div>' +
      '<p class="note">Карта © OpenStreetMap, OpenTopoMap. Погода: Open-Meteo. Без интернета карта показывает те места, которые вы уже смотрели с интернетом. Откройте нужные озёра и реки по Wi-Fi заранее.</p>' +
      '<button class="linkbtn" id="bUpdate" type="button">Обновить приложение <span id="ver"></span></button>';
    menu.hidden = false; $('#bLayers').classList.add('on');
    const sync = () => {
      menu.querySelectorAll('#segLayer button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.layer)));
      menu.querySelectorAll('#segTheme button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.theme)));
      menu.querySelectorAll('#segFishMode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.fishMode)));
    };
    sync();
    menu.querySelectorAll('#segLayer button').forEach((b) => b.addEventListener('click', () => { setLayer(b.dataset.v); sync(); }));
    menu.querySelectorAll('#segFishMode button').forEach((b) => b.addEventListener('click', () => { setFishMode(b.dataset.v); sync(); }));
    menu.querySelectorAll('#segTheme button').forEach((b) => b.addEventListener('click', () => { S.theme = b.dataset.v; lsSet('fishmap.theme', S.theme); applyTheme(); sync(); }));
    renderGroup();
    if ('caches' in window) caches.keys().then((ks) => { const k = ks.find((x) => /shell/.test(x)), el = $('#ver'); if (k && el) el.textContent = '(' + k.replace('fishmap-shell-', '') + ')'; }).catch(() => {});
    $('#bUpdate').addEventListener('click', async () => {
      try {
        if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); }
        if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.filter((k) => /shell/.test(k)).map((k) => caches.delete(k))); }
      } catch (e) { /* всё равно перезагружаем */ }
      location.reload();
    });
  }
  $('#bLayers').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !$('#bLayers').contains(e.target)) {
      closeMenu();
      ignoreMapClick = true; setTimeout(() => { ignoreMapClick = false; }, 350);
    }
  });

  /* ---------- offline tiles ---------- */

  /* ---------- online / offline ---------- */
  function netState() {
    const off = !navigator.onLine;
    document.body.classList.toggle('is-offline', off);
    $('#offlineBar').hidden = !off;
  }
  window.addEventListener('online', netState); window.addEventListener('offline', netState); netState();

  /* ---------- sync with Supabase (shared group data) ---------- */
  const SB = { url: 'https://caxuvdrzuurhdtmqbkbg.supabase.co', key: 'sb_publishable_gS7j7lRfJV5rz-nr6AzV7g_Q9lfGNzt' };
  // имя автора для сервера: в заголовках нельзя кириллицу, поэтому шестнадцатеричная запись UTF-8
  const nameHex = () => Array.from(new TextEncoder().encode((S.me || '').trim())).map((b) => b.toString(16).padStart(2, '0')).join('');
  async function sb(path, opt) {
    opt = opt || {};
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
    try {
      return await fetch(SB.url + '/rest/v1/' + path, {
        method: opt.method || 'GET', signal: ctl.signal,
        headers: Object.assign({ apikey: SB.key, 'x-group-code': S.code, 'x-author-id': S.dev, 'x-author-name': nameHex(), 'Content-Type': 'application/json' }, opt.headers || {}),
        body: opt.body ? JSON.stringify(opt.body) : undefined
      });
    } finally { clearTimeout(to); }
  }
  function syncText() {
    const st = S.sync.state;
    if (st === 'busy') return 'Синхронизация…';
    if (st === 'denied') return 'Код не подошёл';
    if (st === 'err') return 'Нет связи' + (S.sync.t ? ', последний раз ' + hhmm(S.sync.t) : '');
    if (S.photoErr) return 'Часть данных пока не отправилась, повторю';
    return S.sync.t ? 'Обновлено ' + hhmm(S.sync.t) : 'Ожидание';
  }
  function setSync(state) {
    S.sync.state = state;
    if (state === 'ok') { S.sync.t = Date.now(); lsSet('fishmap.syncT', S.sync.t); }
    const el = $('#syncStat'); if (el) el.textContent = syncText();
  }
  let syncing = false, syncAgain = false, syncTimer = 0;
  function scheduleSync(ms) {
    if (!S.code) return;
    clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms == null ? 1200 : ms);
  }
  async function syncNow() {
    if (!S.code || !navigator.onLine) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true; syncAgain = false; setSync('busy');
    try {
      let r = await sb('rpc/group_check', { method: 'POST', body: {} });
      if (!r.ok) throw new Error('check ' + r.status);
      if ((await r.json()) !== true) { setSync('denied'); return; }
      for (const id of S.tomb.slice()) {
        r = await sb('spots?id=eq.' + id, { method: 'DELETE' });
        if (!r.ok) throw new Error('delete ' + r.status);
        S.tomb = S.tomb.filter((x) => x !== id); saveLocal();
      }
      const dirty = S.spots.filter((x) => !x.shared && x.dirty);
      if (dirty.length) {
        const snap = new Map(dirty.map((x) => [x.id, x.updated]));
        r = await sb('spots?on_conflict=id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: dirty.map((x) => ({ id: x.id, name: x.name, lat: x.lat, lon: x.lon, note: x.note || '', season: seasonOf(x), author: x.author || '', author_id: x.owner === undefined ? S.dev : (x.owner || null), created_at: new Date(x.created || Date.now()).toISOString() }))
        });
        if (!r.ok) throw new Error('push ' + r.status);
        dirty.forEach((x) => { if (x.owner === undefined) x.owner = S.dev; if (snap.get(x.id) === x.updated) delete x.dirty; });
      }
      r = await sb('spots?select=*&order=created_at.asc');
      if (!r.ok) throw new Error('pull ' + r.status);
      const rows = await r.json();
      const remote = new Set(rows.map((x) => x.id));
      const local = new Map(S.spots.filter((x) => !x.shared).map((x) => [x.id, x]));
      let added = 0;
      rows.forEach((row) => {
        const l = local.get(row.id);
        if (l && l.dirty) return;
        const o = { id: row.id, name: row.name, lat: row.lat, lon: row.lon, note: row.note || '', season: row.season || 'summer', author: row.author || '', owner: row.author_id || '', created: Date.parse(row.created_at), updated: Date.parse(row.updated_at) };
        if (l) Object.assign(l, o); else { S.spots.push(o); added++; }
      });
      S.spots = S.spots.filter((x) => x.shared || x.dirty || remote.has(x.id));
      saveLocal();
      let perr = false;
      try { await syncPhotos(); } catch (e) { perr = true; }
      try { await syncComments(); } catch (e) { perr = true; }
      S.photoErr = perr; if (perr) scheduleSync(30000);
      const first = !S.sync.t;
      setSync('ok');
      refreshAfterSync();
      if (first) toast('Подключено. Точек в группе: ' + rows.length);
      else if (added) toast('Новых точек: ' + added);
    } catch (e) {
      setSync('err');
    } finally {
      syncing = false;
      if (syncAgain) scheduleSync(400);
    }
  }
  function refreshAfterSync() {
    renderMarkers();
    renderPhotoStrip();
    renderComments();
    if (lv.classList.contains('open')) renderListItems();
    if (S.sel) {
      const x = findSpot(S.sel);
      if (!x) { closeSheet(); return; }
      const ti = body.querySelector('.title'), su = body.querySelector('.sub');
      if (ti) ti.textContent = x.name;
      const mt = body.querySelector('.mini-title'); if (mt) mt.textContent = x.name;
      if (su) su.innerHTML = subText(x, true);
      const ta = $('#descr');
      if (ta && document.activeElement !== ta && ta.value !== (x.note || '')) ta.value = x.note || '';
    }
  }
  function askName(after) {
    openModal('<h3>Как вас зовут?</h3><p class="sub">Имя будет видно рядом с точками, которые вы добавили.</p>' +
      '<input id="nName" class="input" maxlength="30" value="' + esc(S.me) + '" placeholder="Например: Володя">' +
      '<div class="row"><button class="btn btn-primary" id="nOk" type="button">Готово</button></div>');
    const inp = $('#nName'); inp.focus(); inp.select();
    const go = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } S.me = v; lsSet('fishmap.me', v); closeModal(); if (after) after(); };
    $('#nOk').onclick = go; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }
  async function joinGroup(code) {
    S.code = code; S.sync.t = 0; lsSet('fishmap.code', code);
    await syncNow();
    if (S.sync.state === 'denied') { S.code = ''; lsSet('fishmap.code', ''); toast('Код не подошёл. Проверьте ссылку'); renderGroup(); return false; }
    renderGroup();
    if (!S.me) askName(renderGroup);
    return true;
  }
  function leaveGroup() {
    S.code = ''; lsSet('fishmap.code', ''); S.sync = { state: 'off', t: 0 }; lsSet('fishmap.syncT', 0);
    S.spots.forEach((x) => { if (!x.shared) x.dirty = true; });
    saveLocal(); renderGroup();
  }
  function renderGroup() {
    const box = $('#grp'); if (!box) return;
    if (S.code) {
      box.innerHTML = '<div class="gl"><b>Подключено к группе</b><span id="syncStat">' + esc(syncText()) + '</span></div>' +
        '<div class="grow"><button class="btn btn-secondary sm" id="gSync" type="button">Обновить</button><button class="btn btn-secondary sm" id="gName" type="button">' + esc(S.me ? 'Имя: ' + S.me : 'Указать имя') + '</button></div>' +
        '<button class="linkbtn" id="gOut" type="button">Отключиться от группы</button>';
      $('#gSync').onclick = () => { if (!navigator.onLine) { toast('Нет интернета'); return; } syncNow(); };
      $('#gName').onclick = () => { closeMenu(); askName(); };
      $('#gOut').onclick = leaveGroup;
    } else {
      box.innerHTML = '<p class="note" style="margin:0 0 8px">Вставьте ссылку или код группы из Telegram, чтобы видеть общие точки.</p>' +
        '<div class="grow"><input id="gCode" class="input sm" placeholder="Ссылка или код" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn btn-primary sm" id="gJoin" type="button">Войти</button></div>';
      const go = () => {
        const m = /k=([A-Za-z0-9_-]{8,64})/.exec($('#gCode').value) || /^\s*([A-Za-z0-9_-]{16,64})\s*$/.exec($('#gCode').value);
        if (!m) { toast('Не вижу код. Вставьте ссылку из Telegram целиком'); return; }
        if (!navigator.onLine) { toast('Нужен интернет'); return; }
        joinGroup(m[1]);
      };
      $('#gJoin').onclick = go; $('#gCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }
  }
  function checkJoin() {
    const m = /[#&]k=([A-Za-z0-9_-]{8,64})/.exec(location.hash);
    if (!m) return;
    const rest = location.hash.slice(1).split('&').filter((x) => x && x.indexOf('k=') !== 0).join('&');
    history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : ''));
    if (m[1] !== S.code) joinGroup(m[1]);
  }
  window.addEventListener('online', () => scheduleSync(300));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(300); });
  setInterval(() => { if (!document.hidden) scheduleSync(0); }, 60000);

  /* ---------- photos (Supabase Storage, закрытый бакет) ---------- */
  const PH_CACHE = 'fishmap-photos-v1';
  S.photos = lsGet('fishmap.v3.photos', []);
  S.ptomb = lsGet('fishmap.v3.ptomb', []);
  S.pending = [];
  const savePhotos = () => { lsSet('fishmap.v3.photos', S.photos); lsSet('fishmap.v3.ptomb', S.ptomb); };
  const thumbPath = (p) => p.replace(/\.jpg$/, '_t.jpg');

  // очередь фото, снятых без сети: IndexedDB
  const idbOpen = () => new Promise((res, rej) => {
    const r = indexedDB.open('fishmap', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pending', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  async function idb(mode, fn) {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction('pending', mode), rq = fn(tx.objectStore('pending'));
      tx.oncomplete = () => { db.close(); res(rq && rq.result); };
      tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
    });
  }
  const idbPut = (v) => idb('readwrite', (st) => st.put(v));
  const idbAll = () => idb('readonly', (st) => st.getAll());
  const idbDel = (k) => idb('readwrite', (st) => st.delete(k));

  async function storage(method, path, opt) {
    opt = opt || {};
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
    try {
      return await fetch(SB.url + '/storage/v1/' + path, { method: method, signal: ctl.signal,
        headers: Object.assign({ apikey: SB.key, 'x-group-code': S.code }, opt.headers || {}), body: opt.body });
    } finally { clearTimeout(to); }
  }

  // сжатие: до 1600 px по длинной стороне, JPEG; перерисовка в canvas убирает EXIF (геометки)
  async function loadBitmap(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* запасной путь */ }
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(u); res(im); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
      im.src = u;
    });
  }
  function resizeTo(src, side, q) {
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight, k = Math.min(1, side / Math.max(w0, h0));
    const c = document.createElement('canvas'); c.width = Math.max(1, rnd(w0 * k)); c.height = Math.max(1, rnd(h0 * k));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', q));
  }
  async function addPhotos(spotId, files) {
    const list = Array.from(files || []).slice(0, 10);
    let ok = 0;
    for (const f of list) {
      try {
        const bmp = await loadBitmap(f);
        const full = await resizeTo(bmp, 1600, 0.8), thumb = await resizeTo(bmp, 400, 0.72);
        if (bmp.close) bmp.close();
        const rec = { id: uid(), spot_id: spotId, author: S.me || '', created: Date.now(), full: full, thumb: thumb };
        await idbPut(rec);
        S.pending.push({ id: rec.id, spot_id: spotId, author: rec.author, created: rec.created, thumbUrl: URL.createObjectURL(thumb) });
        ok++; renderPhotoStrip();
      } catch (e) { toast('Не удалось обработать фото'); }
    }
    if (ok) { toast(navigator.onLine ? 'Загружаю фото…' : 'Фото сохранено, загрузится при появлении сети'); scheduleSync(0); }
  }

  // показ: подписанные ссылки (закрытый бакет) + кэш на устройстве, чтобы смотреть без сети
  const phMem = new Map(), signedUrls = new Map();
  async function phCache() { return 'caches' in window ? caches.open(PH_CACHE) : null; }
  async function cachePut(path, blob) {
    try { const c = await phCache(); if (c) await c.put('/_photo/' + path, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })); } catch (e) { /* не критично */ }
  }
  async function fromCache(path) {
    if (phMem.has(path)) return phMem.get(path);
    try {
      const c = await phCache(), hit = c && await c.match('/_photo/' + path);
      if (hit) { const u = URL.createObjectURL(await hit.blob()); phMem.set(path, u); return u; }
    } catch (e) { /* нет кэша */ }
    return '';
  }
  async function signPaths(paths) {
    const need = paths.filter((p) => !(signedUrls.get(p) && signedUrls.get(p).exp > Date.now()));
    if (!need.length) return;
    const r = await storage('POST', 'object/sign/photos', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600, paths: need }) });
    if (!r.ok) throw new Error('sign ' + r.status);
    (await r.json()).forEach((x) => { if (x.signedURL && x.path) signedUrls.set(x.path, { url: SB.url + '/storage/v1' + x.signedURL, exp: Date.now() + 50 * 60000 }); });
  }
  async function fetchPhoto(path) {
    try {
      if (!signedUrls.get(path)) await signPaths([path]);
      const r = await fetch(signedUrls.get(path).url);
      if (!r.ok) return '';
      const b = await r.blob(); cachePut(path, b);
      const u = URL.createObjectURL(b); phMem.set(path, u); return u;
    } catch (e) { return ''; }
  }
  async function loadThumbs(imgs) {
    const missing = [];
    for (const im of imgs) {
      const p = thumbPath(im.dataset.path), u = await fromCache(p);
      if (u) im.src = u; else missing.push([im, p]);
    }
    if (!missing.length || !navigator.onLine || !S.code) return;
    try { await signPaths(missing.map((m) => m[1])); } catch (e) { return; }
    for (let i = 0; i < missing.length; i += 4) {
      await Promise.all(missing.slice(i, i + 4).map(async ([im, p]) => { const u = await fetchPhoto(p); if (u && im.isConnected) im.src = u; }));
    }
  }

  const photosOf = (id) => S.pending.filter((x) => x.spot_id === id).map((x) => ({ id: x.id, pending: true, thumbUrl: x.thumbUrl, author: x.author, created: x.created }))
    .concat(S.photos.filter((x) => x.spot_id === id).map((x) => ({ id: x.id, path: x.path, author: x.author, created: Date.parse(x.created_at) })))
    .sort((a, b) => b.created - a.created);
  const photosHtml = (t, saved) => saved ? (t.shared ? '' : '<section class="ph-sec"><h3>Фото</h3><div id="phStrip" class="pstrip"></div></section>')
    : '<section class="ph-sec"><h3>Фото</h3><p class="pnote">Сохраните точку, и здесь появится кнопка для добавления фото.</p></section>';
  function renderPhotoStrip() {
    const box = $('#phStrip'), t = S.sel && findSpot(S.sel);
    if (!box || !t) return;
    const items = photosOf(t.id);
    box.innerHTML = (S.code
      ? '<button class="ptile padd" id="phAdd" type="button">' + ic('camera', 26, 'currentColor', 1.6) + '<span>Добавить</span></button><input id="phFile" type="file" accept="image/*" multiple hidden>'
      : '<p class="pnote">Войдите в группу (меню со слоями, раздел «Группа»), чтобы добавлять фото.</p>') +
      items.map((it) => '<button class="ptile" type="button" data-pid="' + esc(it.id) + '" aria-label="Открыть фото">' +
        (it.pending ? '<img alt="" src="' + it.thumbUrl + '"><span class="pbadge">' + (navigator.onLine ? 'Загрузка' : 'Ждёт сеть') + '</span>' : '<img alt="" data-path="' + esc(it.path) + '">') + '</button>').join('');
    if (S.code) {
      $('#phAdd').onclick = () => $('#phFile').click();
      $('#phFile').onchange = (e) => { addPhotos(t.id, e.target.files); e.target.value = ''; };
    }
    box.querySelectorAll('.ptile[data-pid]').forEach((b) => { b.onclick = () => openViewer(items, b.dataset.pid); });
    loadThumbs(Array.from(box.querySelectorAll('img[data-path]')));
  }

  // полноэкранный просмотр
  function closeViewer(fromPop) {
    const v = $('#viewer'); if (!v) return;
    v.remove();
  }
  function openViewer(items, startId) {
    closeViewer();
    const v = document.createElement('div'); v.id = 'viewer'; v.className = 'viewer';
    v.innerHTML = '<div class="vtop"><button class="vbtn" id="vClose" type="button" aria-label="Закрыть">' + ic('x', 22, 'currentColor', 2) + '</button><span id="vCount"></span></div>' +
      '<div class="vscroll" id="vScroll">' + items.map((it) => '<div class="vslide"><img alt="Фото" ' + (it.pending ? 'src="' + it.thumbUrl + '"' : 'data-path="' + esc(it.path) + '"') + '></div>').join('') + '</div>' +
      '<div class="vbottom"><span id="vInfo"></span><button class="vbtn" id="vDel" type="button" aria-label="Удалить фото">' + ic('trash', 22, 'currentColor', 1.8) + '</button></div>';
    document.body.appendChild(v);
    const sc = $('#vScroll'), slides = Array.from(sc.querySelectorAll('.vslide'));
    let cur = Math.max(0, items.findIndex((x) => x.id === startId));
    const loaded = new Set();
    async function loadFull(i) {
      if (i < 0 || i >= items.length || loaded.has(i) || items[i].pending) return;
      loaded.add(i);
      const im = slides[i].querySelector('img'), p = items[i].path;
      const t = await fromCache(thumbPath(p)); if (t) im.src = t;
      let u = await fromCache(p);
      if (!u && navigator.onLine) u = await fetchPhoto(p);
      if (u && im.isConnected) im.src = u; else if (!t && im.isConnected) loadThumbs([im]);
    }
    function show(i) {
      cur = i;
      $('#vCount').textContent = (i + 1) + ' / ' + items.length;
      const it = items[i];
      $('#vInfo').textContent = [it.author, new Date(it.created).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), it.pending ? 'ещё не загружено' : ''].filter(Boolean).join(' · ');
      loadFull(i); loadFull(i - 1); loadFull(i + 1);
    }
    sc.scrollLeft = cur * sc.clientWidth;
    show(cur);
    let tm; sc.addEventListener('scroll', () => { clearTimeout(tm); tm = setTimeout(() => { const i = clamp(rnd(sc.scrollLeft / sc.clientWidth), 0, items.length - 1); if (i !== cur) show(i); }, 60); });
    $('#vClose').onclick = () => closeViewer();
    $('#vDel').onclick = () => deletePhoto(items[cur]);
  }
  function deletePhoto(it) {
    openModal('<h3>Удалить фото?</h3><p class="sub">Оно исчезнет у всех в группе. Это нельзя отменить.</p>' +
      '<div class="row"><button class="btn btn-secondary" id="pdCancel" type="button">Отмена</button><button class="btn btn-danger" id="pdOk" type="button">Удалить</button></div>');
    $('#pdCancel').onclick = closeModal;
    $('#pdOk').onclick = async () => {
      if (it.pending) {
        await idbDel(it.id).catch(() => {}); S.pending = S.pending.filter((x) => x.id !== it.id);
      } else {
        if (!navigator.onLine) { closeModal(); toast('Нужен интернет, чтобы удалить фото'); return; }
        try {
          const r = await sb('spot_photos?id=eq.' + it.id, { method: 'DELETE' });
          if (!r.ok) throw new Error('del ' + r.status);
          S.photos = S.photos.filter((x) => x.id !== it.id); savePhotos();
          storage('DELETE', 'object/photos', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [it.path, thumbPath(it.path)] }) }).catch(() => { S.ptomb.push(it.path); savePhotos(); });
        } catch (e) { closeModal(); toast('Не удалось удалить, попробуйте позже'); return; }
      }
      closeModal(); closeViewer(); renderPhotoStrip(); toast('Фото удалено');
    };
  }
  function dropSpotPhotos(spotId) {
    S.photos.filter((x) => x.spot_id === spotId).forEach((x) => S.ptomb.push(x.path));
    S.photos = S.photos.filter((x) => x.spot_id !== spotId);
    S.pending.filter((x) => x.spot_id === spotId).forEach((x) => idbDel(x.id).catch(() => {}));
    S.pending = S.pending.filter((x) => x.spot_id !== spotId);
    savePhotos();
  }
  function hydrateListThumbs(box, arr) {
    arr.forEach((sp) => {
      const first = photosOf(sp.id)[0]; if (!first) return;
      const th = box.querySelector('.card[data-id="' + sp.id + '"] .thumb'); if (!th) return;
      const im = document.createElement('img'); im.alt = '';
      if (first.pending) im.src = first.thumbUrl; else { im.dataset.path = first.path; loadThumbs([im]); }
      th.innerHTML = ''; th.appendChild(im);
    });
  }
  async function syncPhotos() {
    for (const path of S.ptomb.slice()) {
      const r = await storage('DELETE', 'object/photos', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path, thumbPath(path)] }) });
      if (r.ok) { S.ptomb = S.ptomb.filter((x) => x !== path); savePhotos(); }
    }
    const items = await idbAll().catch(() => []);
    let failed = 0;
    for (const it of items) {
      if (!findSpot(it.spot_id)) { await idbDel(it.id); S.pending = S.pending.filter((x) => x.id !== it.id); continue; }
      try {
        const path = it.spot_id + '/' + it.id + '.jpg', hd = { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' };
        let r = await storage('POST', 'object/photos/' + thumbPath(path), { headers: hd, body: it.thumb });
        if (!r.ok) throw new Error('thumb ' + r.status);
        r = await storage('POST', 'object/photos/' + path, { headers: hd, body: it.full });
        if (!r.ok) throw new Error('photo ' + r.status);
        r = await sb('spot_photos?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: [{ id: it.id, spot_id: it.spot_id, path: path, author: it.author || '', created_at: new Date(it.created).toISOString() }] });
        if (!r.ok && r.status !== 409) throw new Error('row ' + r.status);
        cachePut(path, it.full); cachePut(thumbPath(path), it.thumb);
        await idbDel(it.id); S.pending = S.pending.filter((x) => x.id !== it.id);
      } catch (e) { failed++; }
    }
    const r2 = await sb('spot_photos?select=*&order=created_at.asc');
    if (!r2.ok) throw new Error('photos ' + r2.status);
    const ids = new Set(S.spots.map((x) => x.id));
    S.photos = (await r2.json()).filter((x) => ids.has(x.spot_id)); savePhotos();
    if (failed) throw new Error('upload failed: ' + failed);
  }
  idbAll().then((items) => {
    S.pending = items.map((x) => ({ id: x.id, spot_id: x.spot_id, author: x.author, created: x.created, thumbUrl: URL.createObjectURL(x.thumb) }));
    renderPhotoStrip();
  }).catch(() => {});

  /* ---------- отзывы ---------- */
  S.comments = lsGet('fishmap.v3.comments', []);
  S.ctomb = lsGet('fishmap.v3.ctomb', []);
  const saveComments = () => { lsSet('fishmap.v3.comments', S.comments); lsSet('fishmap.v3.ctomb', S.ctomb); };
  const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; return (m > 10 && m < 15) ? c : d === 1 ? a : (d > 1 && d < 5) ? b : c; };
  const commentsOf = (id) => S.comments.filter((c) => c.spot_id === id).sort((a, b) => a.created - b.created);
  const nc = (id) => S.comments.reduce((n, c) => n + (c.spot_id === id ? 1 : 0), 0);
  const canDelComment = (c) => (c.owner === S.dev || sameName(c.author) || (!c.owner && !c.author));
  const commentsHtml = (t) => t.shared ? '' : '<section class="cm-sec" id="cmSec"><h3>Отзывы <span id="cmN" class="cm-n"></span></h3><div id="cmList"></div><div id="cmForm"></div></section>';
  function renderComments() {
    const box = $('#cmList'), t = S.sel && findSpot(S.sel);
    if (!box || !t || t.shared) return;
    const items = commentsOf(t.id);
    $('#cmN').textContent = items.length || '';
    const bd = $('#bdg'); if (bd) { bd.textContent = items.length > 99 ? '99+' : (items.length || ''); bd.hidden = !items.length; }
    box.innerHTML = items.length ? items.map((c) =>
      '<div class="cm"><div class="cmh"><b>' + esc(c.author || 'Без имени') + '</b><span>' +
      esc(new Date(c.created).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span>' +
      (c.dirty ? '<em>' + (navigator.onLine ? 'отправляется…' : 'ждёт сеть') + '</em>' : '') +
      (canDelComment(c) ? '<button class="cmdel" type="button" data-cid="' + esc(c.id) + '" aria-label="Удалить отзыв">' + ic('trash', 18, 'currentColor', 1.8) + '</button>' : '') +
      '</div><p>' + esc(c.body) + '</p></div>').join('') : '<p class="pnote">Пока нет отзывов. Расскажите, как клюёт и что стоит знать об этом месте.</p>';
    box.querySelectorAll('.cmdel').forEach((b) => { b.onclick = () => deleteComment(b.dataset.cid); });
    const form = $('#cmForm');
    if (form && !form.firstChild) {
      if (!S.code) { form.innerHTML = '<p class="pnote">Войдите в группу по ссылке из Telegram, чтобы оставлять отзывы.</p>'; return; }
      form.innerHTML = '<textarea id="cmText" class="cm-text" rows="2" maxlength="1000" aria-label="Ваш отзыв" placeholder="Ваш отзыв: что клюёт, как прошла рыбалка…"></textarea>' +
        '<button class="btn btn-primary sm cm-send" id="cmSend" type="button">Отправить</button>';
      $('#cmSend').onclick = () => sendComment(t.id);
    }
  }
  function sendComment(spotId) {
    const ta = $('#cmText'), v = ta ? ta.value.trim() : '';
    if (!v) { if (ta) ta.focus(); return; }
    if (!S.me) { askName(() => sendComment(spotId)); return; }
    S.comments.push({ id: uid(), spot_id: spotId, author: S.me, owner: S.dev, body: v.slice(0, 1000), created: Date.now(), dirty: true });
    saveComments(); ta.value = ''; renderComments(); scheduleSync(0);
  }
  function deleteComment(id) {
    openModal('<h3>Удалить отзыв?</h3><p class="sub">Он исчезнет у всех в группе.</p>' +
      '<div class="row"><button class="btn btn-secondary" id="cdCancel" type="button">Отмена</button><button class="btn btn-danger" id="cdOk" type="button">Удалить</button></div>');
    $('#cdCancel').onclick = closeModal;
    $('#cdOk').onclick = () => {
      const c = S.comments.find((x) => x.id === id);
      S.comments = S.comments.filter((x) => x.id !== id);
      if (c && !c.dirty) S.ctomb.push(id);
      saveComments(); closeModal(); renderComments(); scheduleSync(0);
    };
  }
  function dropSpotComments(spotId) { S.comments = S.comments.filter((c) => c.spot_id !== spotId); saveComments(); }
  async function syncComments() {
    for (const id of S.ctomb.slice()) {
      const r = await sb('spot_comments?id=eq.' + id, { method: 'DELETE' });
      if (!r.ok) throw new Error('cdel ' + r.status);
      S.ctomb = S.ctomb.filter((x) => x !== id); saveComments();
    }
    const ids = new Set(S.spots.map((x) => x.id));
    const dirty = S.comments.filter((c) => c.dirty && ids.has(c.spot_id) && isUuid(c.spot_id));
    if (dirty.length) {
      const r = await sb('spot_comments?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: dirty.map((c) => ({ id: c.id, spot_id: c.spot_id, author: c.author || '', author_id: c.owner || null, body: c.body, created_at: new Date(c.created).toISOString() })) });
      if (!r.ok) throw new Error('cpush ' + r.status);
      dirty.forEach((c) => { delete c.dirty; }); saveComments();
    }
    const r2 = await sb('spot_comments?select=*&order=created_at.asc');
    if (!r2.ok) throw new Error('cpull ' + r2.status);
    const gone = new Set(S.ctomb);
    const rows = (await r2.json()).filter((x) => ids.has(x.spot_id) && !gone.has(x.id))
      .map((x) => ({ id: x.id, spot_id: x.spot_id, author: x.author || '', owner: x.author_id || '', body: x.body, created: Date.parse(x.created_at) }));
    S.comments = rows.concat(S.comments.filter((c) => c.dirty && ids.has(c.spot_id))); saveComments();
  }

  /* ---------- поиск: координаты, свои точки, названия (OpenStreetMap Nominatim, бесплатно) ---------- */
  function parseCoords(q) {
    let s = String(q || '').trim().toLowerCase();
    if (!s) return null;
    if (/https?:|maps/.test(s)) {
      const g = s.match(/(-?\d{1,3}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)/);
      return g ? checkLL(+g[1], +g[2], true) : null;
    }
    s = s.replace(/[−–—]/g, '-').replace(/[′’‘`´]/g, "'").replace(/[″“”]/g, '"').replace(/[°'"]/g, ' ');
    if (!/\./.test(s)) s = s.replace(/(\d),(\d)/g, '$1.$2');
    else if (/;/.test(s)) s = s.replace(/(\d),(\d)/g, '$1.$2');
    s = s.replace(/(\d)([a-zа-я])/g, '$1 $2').replace(/([a-zа-я])(\d)/g, '$1 $2');
    const toks = s.split(/[\s;,]+/).filter(Boolean);
    if (!toks.length) return null;
    const isN = (t) => /^-?\d+(\.\d+)?$/.test(t), isH = (t) => /^[nsewсювз]$/.test(t);
    if (!toks.every((t) => isN(t) || isH(t))) return null;
    const hasH = toks.some(isH);
    if (!hasH) {
      const v = toks.map(Number);
      if (v.length === 2) return checkLL(v[0], v[1], true);
      const dms = (a) => (a[0] < 0 || Object.is(a[0], -0) ? -1 : 1) * (Math.abs(a[0]) + (a[1] || 0) / 60 + (a[2] || 0) / 3600);
      if (v.length === 4 && v[1] < 60 && v[3] < 60) return checkLL(dms(v.slice(0, 2)), dms(v.slice(2)), false);
      if (v.length === 6 && v[1] < 60 && v[2] < 60 && v[4] < 60 && v[5] < 60) return checkLL(dms(v.slice(0, 3)), dms(v.slice(3)), false);
      return null;
    }
    const prefix = isH(toks[0]), comps = [];
    let cur = { n: [], h: null };
    toks.forEach((t) => {
      if (isH(t)) {
        if (prefix) { if (cur.n.length) { comps.push(cur); cur = { n: [], h: null }; } cur.h = t; }
        else { cur.h = t; comps.push(cur); cur = { n: [], h: null }; }
      } else cur.n.push(Math.abs(+t));
    });
    if (cur.n.length || cur.h) comps.push(cur);
    if (comps.length !== 2 || comps.some((c) => !c.h || !c.n.length || c.n.length > 3 || (c.n[1] || 0) >= 60 || (c.n[2] || 0) >= 60)) return null;
    let lat = null, lon = null;
    comps.forEach((c) => {
      const v = c.n[0] + (c.n[1] || 0) / 60 + (c.n[2] || 0) / 3600;
      if ('nsсю'.includes(c.h)) lat = c.h === 's' || c.h === 'ю' ? -v : v; else lon = c.h === 'w' || c.h === 'з' ? -v : v;
    });
    return lat == null || lon == null ? null : checkLL(lat, lon, false);
  }
  function checkLL(a, b, allowSwap) {
    if (!isFinite(a) || !isFinite(b)) return null;
    if (allowSwap && Math.abs(a) > 90 && Math.abs(b) <= 90) { const t = a; a = b; b = t; }
    return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lon: b } : null;
  }

  const sPanel = $('#searchPanel'), sInput = $('#sInput'), sList = $('#sList');
  let sWeb = null, sBusy = false, sLastReq = 0, sSeq = 0;   // sWeb: результаты поиска по названию
  const openSearch = () => { sPanel.hidden = false; $('#bSearch').classList.add('on'); sWeb = null; sInput.value = ''; renderSearch(); setTimeout(() => sInput.focus(), 30); };
  const closeSearch = () => { sPanel.hidden = true; $('#bSearch').classList.remove('on'); sInput.blur(); sSeq++; };
  const placeLabel = (r) => {
    const parts = String(r.display_name || '').split(',').map((x) => x.trim()).filter(Boolean);
    return { title: r.name || parts[0] || 'Место', sub: parts.slice(r.name ? 0 : 1).filter((x) => x !== r.name).slice(0, 3).join(', ') };
  };
  function goTo(lat, lon, label, zoom) {
    closeSearch();
    const dup = allSpots().find((x) => Math.abs(x.lat - lat) < 0.0001 && Math.abs(x.lon - lon) < 0.0001);
    if (dup) { openSpot(dup.id, 'half'); toast('Это ваша сохранённая точка'); return; }
    map.setView([lat, lon], zoom || 14, { animate: false });
    openTemp(L.latLng(lat, lon));
    if (label) { S.temp.label = String(label).slice(0, 60); renderSheet('peek'); }
  }
  function renderSearch(msg) {
    const q = sInput.value.trim(), rows = [];
    const row = (cls, icon, title, sub, attr) => '<button type="button" class="sres ' + cls + '" ' + attr + '><span class="si">' + ic(icon, 20, 'currentColor', 1.8) + '</span><span class="st"><b>' + esc(title) + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : '') + '</span></button>';
    const c = parseCoords(q);
    if (c) rows.push(row('sc', 'locate', 'Перейти к координатам', fmtC(c.lat) + ', ' + fmtC(c.lon), 'data-act="coord"'));
    const lq = q.toLowerCase();
    const mine = lq && !c ? allSpots().filter((x) => x.name.toLowerCase().includes(lq)).slice(0, 6) : (!lq ? allSpots().slice().sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 4) : []);
    if (mine.length) {
      rows.push('<div class="shead">' + (lq ? 'Ваши точки' : 'Недавние точки') + '</div>');
      mine.forEach((x) => rows.push(row('sm', 'fish', x.name, (x.author ? x.author + ' · ' : '') + coordsText(x) + (inSeason(x) ? '' : ' · ' + SEAS[seasonOf(x)]), 'data-act="spot" data-id="' + esc(x.id) + '"')));
    }
    if (q.length >= 2 && !c) rows.push(row('sw', 'search', 'Искать «' + q + '» на карте', 'Озёра, реки, города, парки. Нужен интернет', 'data-act="web"'));
    if (sBusy) rows.push('<div class="smsg">Ищу…</div>');
    if (sWeb) {
      rows.push('<div class="shead">Найдено на карте</div>');
      if (!sWeb.length) rows.push('<div class="smsg">Ничего не найдено. Попробуйте другое написание или латиницу.</div>');
      sWeb.forEach((r, i) => { const l = placeLabel(r); rows.push(row('sp', 'pin', l.title, l.sub, 'data-act="place" data-i="' + i + '"')); });
    }
    if (msg) rows.push('<div class="smsg warn">' + esc(msg) + '</div>');
    if (!rows.length) rows.push('<div class="smsg">Введите название места или координаты, например 51.0447, -114.0719</div>');
    sList.innerHTML = rows.join('');
  }
  async function webSearch() {
    const q = sInput.value.trim();
    if (q.length < 2) return;
    if (!navigator.onLine) { renderSearch('Нет интернета: поиск по названию недоступен. Координаты и ваши точки работают.'); return; }
    const my = ++sSeq; sBusy = true; sWeb = null; renderSearch();
    const wait = sLastReq + 1100 - Date.now();           // правило сервиса: не чаще 1 запроса в секунду
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (my !== sSeq) return;
    sLastReq = Date.now();
    const b = map.getBounds();
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=ru,en&q=' + encodeURIComponent(q) +
      '&viewbox=' + [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].map((x) => x.toFixed(4)).join(',');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('nominatim ' + r.status);
      const data = await r.json();
      if (my !== sSeq) return;
      sBusy = false; sWeb = data.filter((x) => isFinite(+x.lat) && isFinite(+x.lon)); renderSearch();
    } catch (e) {
      if (my !== sSeq) return;
      sBusy = false; sWeb = null; renderSearch('Не удалось выполнить поиск. Проверьте интернет и попробуйте ещё раз.');
    } finally { clearTimeout(to); }
  }
  const zoomFor = (r) => (/^(city|town|administrative|state|country|county)$/.test(r.type) || r.category === 'boundary' ? 11 : r.category === 'natural' || r.category === 'waterway' ? 13 : r.category === 'place' ? 12 : 14);
  sList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'coord') { const c = parseCoords(sInput.value); if (c) goTo(c.lat, c.lon, '', 14); }
    else if (a === 'spot') { closeSearch(); openSpot(b.dataset.id, 'half'); }
    else if (a === 'web') webSearch();
    else if (a === 'place' && sWeb) { const r = sWeb[+b.dataset.i]; if (r) goTo(+r.lat, +r.lon, placeLabel(r).title, zoomFor(r)); }
  });
  $('#sForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = parseCoords(sInput.value);
    if (c) goTo(c.lat, c.lon, '', 14); else webSearch();
  });
  sInput.addEventListener('input', () => { sSeq++; sBusy = false; sWeb = null; renderSearch(); });
  $('#sClose').addEventListener('click', closeSearch);
  $('#bSearch').addEventListener('click', () => (sPanel.hidden ? openSearch() : closeSearch()));
  sPanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });

  /* ---------- кнопка «Назад» (Android / жест): закрывает верхнее окно, а не выходит из приложения ---------- */
  const overlays = [   // сверху вниз
    [() => !!$('#viewer'), () => closeViewer()],
    [() => !modal.hidden, closeModal],
    [() => !menu.hidden, closeMenu],
    [() => !sPanel.hidden, closeSearch],
    [() => lv.classList.contains('open'), closeList],
    [() => sheet.classList.contains('open'), closeSheet],
  ];
  const anyOverlay = () => overlays.some((o) => o[0]());
  let histPushed = false, histIgnore = 0;
  function syncHist() {
    const any = anyOverlay();
    if (any && !histPushed) {
      try { history.pushState({ fmL: 1 }, ''); histPushed = true; } catch (e) { /* не критично */ }
    } else if (!any && histPushed) {
      histPushed = false; histIgnore++;
      try { history.back(); } catch (e) { histIgnore--; }
    }
  }
  window.addEventListener('popstate', () => {
    if (histIgnore > 0) { histIgnore--; return; }
    if (!histPushed) return;
    histPushed = false;
    const top = overlays.find((o) => o[0]());
    if (top) top[1]();
    syncHist();   // если что-то ещё открыто, снова ставим «заслонку» для следующего нажатия
  });
  const mo = new MutationObserver(syncHist);
  mo.observe(sheet, { attributes: true, attributeFilter: ['class'] });
  mo.observe(lv, { attributes: true, attributeFilter: ['class'] });
  mo.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  mo.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  mo.observe(sPanel, { attributes: true, attributeFilter: ['hidden'] });
  mo.observe(document.body, { childList: true });

  /* ---------- deep link: #p=lat,lon,name ---------- */
  function checkHash() {
    const m = /^#p=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(.*)$/.exec(location.hash);
    if (!m) return;
    const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
    let name = '';
    try { name = decodeURIComponent(m[3]).slice(0, 60); } catch (e) {}
    history.replaceState(null, '', location.pathname + location.search);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    const dup = allSpots().find((s) => Math.abs(s.lat - lat) < 0.0001 && Math.abs(s.lon - lon) < 0.0001);
    if (dup) { openSpot(dup.id, 'half'); return; }
    map.setView([lat, lon], 14);
    S.temp = { lat: lat, lon: lon }; setTempMarker(L.latLng(lat, lon));
    saveDialog({ lat: lat, lon: lon }, name);
  }

  /* ---------- init ---------- */
  (async function init() {
    S.spots = loadLocal();
    let cfg = { center: [51.0447, -114.0719], zoom: 10, spots: [] };
    try { const r = await fetch('spots.json', { cache: 'no-cache' }); cfg = await r.json(); } catch (e) {}
    S.shared = (cfg.spots || []).map((s) => Object.assign({}, s, { shared: true, created: s.created || 0 }));
    S.shared.forEach((s) => { if (!findSpot(s.id)) S.spots.push(s); });
    fitMinZoom();
    map.setView(cfg.center || [51.0447, -114.0719], cfg.zoom || 10);
    renderMarkers();
    if (S.spots.length > 1) map.fitBounds(L.latLngBounds(S.spots.map((s) => [s.lat, s.lon])).pad(0.25));
    else if (S.spots.length === 1) map.setView([S.spots[0].lat, S.spots[0].lon], 12);
    checkJoin(); checkHash();
    refreshAutoSeason();
    window.addEventListener('hashchange', () => { checkJoin(); checkHash(); });
    if (S.code) syncNow();
    if ('serviceWorker' in navigator) {
      const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadCtl || reloaded) return;
        const a = document.activeElement, typing = a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT');
        if (typing || !$('#modal').hidden) { toast('Вышла новая версия, она применится при следующем открытии'); return; }
        reloaded = true; location.reload();
      });
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  })();
})();
