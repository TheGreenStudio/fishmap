(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const rnd = Math.round;
  const APP_URL = location.origin + location.pathname;

  const P = {
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
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
    fish: '<path d="M2.5 12c2.6-4 6.2-5.3 10-4 1.6.6 3 1.6 4 3l4.5-3.2v8.4L16.5 13c-1 1.4-2.4 2.4-4 3-3.8 1.3-7.4 0-10-4z"/><circle cx="8" cy="11" r="0.6"/>'
  };
  const ic = (n, size, color, sw, extra) =>
    '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
    '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;' + (extra || '') + '">' + P[n] + '</svg>';

  document.querySelectorAll('[data-ic]').forEach((el) => {
    el.outerHTML = ic(el.dataset.ic, +el.dataset.size || 24, null, +el.dataset.sw || 1.8);
  });

  /* ---------- state ---------- */
  const S = {
    spots: [], shared: [], sel: null, temp: null, state: 'peek', loc: null,
    theme: lsGet('fishmap.theme', 'auto'), layer: lsGet('fishmap.layer', 'osm'),
    filter: 'all', q: '', wxKey: ''
  };
  const KEY = 'fishmap.v2.spots';
  function loadLocal() {
    let arr = lsGet(KEY, null);
    if (!arr) {
      const old = lsGet('fishmap.local', []);
      arr = old.map((s) => ({ id: s.id || uid(), name: s.name, lat: s.lat, lon: s.lon, note: s.note || '', created: Date.now() }));
      if (arr.length) lsSet(KEY, arr);
    }
    return arr || [];
  }
  const saveLocal = () => lsSet(KEY, S.spots.filter((s) => !s.shared));
  const allSpots = () => S.spots;
  const findSpot = (id) => S.spots.find((s) => s.id === id);

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
  const map = L.map('map', { zoomControl: false, attributionControl: true, tap: true });
  const layers = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }),
    topo: L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap, © OpenStreetMap' })
  };
  function setLayer(k) {
    Object.keys(layers).forEach((n) => { if (map.hasLayer(layers[n])) map.removeLayer(layers[n]); });
    layers[k].addTo(map); S.layer = k; lsSet('fishmap.layer', k);
  }
  setLayer(layers[S.layer] ? S.layer : 'osm');
  map.attributionControl.setPrefix(false);

  const spotMarkers = new Map();
  let tempMarker = null, meMarker = null;

  function pinHtml(kind, sel) {
    const glyph = kind === 'temp' ? P.plus : P.fish;
    return '<div class="pinwrap ' + (kind === 'temp' ? 'temp ' : '') + (sel ? 'sel' : '') + '"><div class="ring"></div>' +
      '<svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true"><path class="pin-body" d="M22 50C22 50 5 33 5 21a17 17 0 0134 0c0 12-17 29-17 29z"/>' +
      '<g class="pin-glyph" transform="translate(10 9)">' + glyph + '</g></svg></div>';
  }
  const pinIcon = (kind, sel) => L.divIcon({ className: '', html: pinHtml(kind, sel), iconSize: [44, 52], iconAnchor: [22, 50] });

  function renderMarkers() {
    spotMarkers.forEach((m) => m.remove());
    spotMarkers.clear();
    allSpots().forEach((s) => {
      const m = L.marker([s.lat, s.lon], { icon: pinIcon('saved', S.sel === s.id), title: s.name, keyboard: true }).addTo(map);
      m.on('click', () => openSpot(s.id, 'half'));
      spotMarkers.set(s.id, m);
    });
    $('#count').textContent = allSpots().length;
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
     Эвристика по погоде, не гарантия клёва. Веса: давление 25, температура 25,
     ветер 20, свет/облачность 15, осадки 10, время суток 5. */
  function interp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    }
    return pts[pts.length - 1][1];
  }
  const F_TEMP = [[-15, 0], [-5, 6], [3, 16], [8, 25], [20, 25], [27, 15], [35, 3], [40, 0]];
  const F_PDELTA = [[-8, 6], [-5, 12], [-3, 18], [-1, 18], [0, 14], [1, 13], [3, 10], [6, 5], [9, 3]];
  const F_PABS = [[980, 0], [995, 2], [1005, 6], [1010, 7], [1022, 7], [1030, 4], [1040, 2]];
  const F_WIND = [[0, 20], [8, 20], [14, 15], [20, 8], [28, 2], [36, 0]];
  const F_CLOUD = [[0, 6], [30, 9], [60, 13], [85, 15], [100, 15]];
  const F_RAIN = [[0, 10], [0.5, 9], [3, 6], [8, 2], [15, 0]];

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
  function levelOf(s) { return s < 30 ? 'bad' : s < 50 ? 'low' : s < 70 ? 'mid' : s < 85 ? 'good' : 'top'; }
  const LEVEL_TXT = { bad: 'Плохо', low: 'Слабо', mid: 'Средне', good: 'Хорошо', top: 'Отлично' };

  function fishScore(i) {
    const parts = [];
    // температура воздуха (замена температуры воды)
    const t = i.temp;
    parts.push({ name: 'Температура', max: 25, pts: interp(F_TEMP, t),
      text: fmtT(t) + (t < -5 ? ', сильный холод' : t < 3 ? ', холодно' : t < 8 ? ', прохладно' : t <= 20 ? ', комфортно' : t <= 27 ? ', тепло' : ', жарко, вода может перегреться') });
    // давление: тренд за 6 ч + абсолютное значение
    const dp = i.dp, dpts = dp == null ? 14 : interp(F_PDELTA, dp);
    const pw = dp == null ? 'тренд неизвестен' : dp <= -4.5 ? 'быстро падает (идёт фронт)' : dp < -1 ? 'медленно падает' : dp <= 1 ? 'стабильно' : dp < 4.5 ? 'растёт' : 'быстро растёт';
    parts.push({ name: 'Давление', max: 25, pts: dpts + interp(F_PABS, i.pressure), text: mmHg(i.pressure) + ' мм, ' + pw });
    // ветер
    const eff = i.wind + 0.5 * Math.max(0, i.gust - i.wind);
    parts.push({ name: 'Ветер', max: 20, pts: interp(F_WIND, eff),
      text: (i.dayMode ? 'до ' : '') + rnd(i.wind) + ' км/ч, порывы ' + rnd(i.gust) + (eff <= 8 ? ', слабый' : eff <= 15 ? ', лёгкий' : eff <= 22 ? ', заметный' : eff <= 30 ? ', сильный' : ', очень сильный') });
    // облачность / свет
    parts.push({ name: 'Свет', max: 15, pts: interp(F_CLOUD, i.cloud),
      text: rnd(i.cloud) + '% облаков' + (i.cloud >= 60 ? ', рассеянный свет' : i.cloud < 30 ? ', яркое солнце, рыба осторожнее' : '') });
    // осадки
    parts.push({ name: 'Осадки', max: 10, pts: interp(F_RAIN, i.precip),
      text: i.precip < 0.2 ? 'без осадков' : (i.precip < 10 ? i.precip.toFixed(1).replace('.', ',') : rnd(i.precip)) + ' мм' });
    // время суток
    let tp, tt;
    if (i.dayMode) { tp = 5; tt = 'считаем лучшее время суток'; }
    else {
      const sr = i.sr == null ? 6.5 : i.sr, ss = i.ss == null ? 19 : i.ss, h = i.hour;
      if ((h >= sr - 1 && h <= sr + 2.5) || (h >= ss - 2.5 && h <= ss + 1)) { tp = 5; tt = 'утро или вечер, самое активное время'; }
      else if (h > sr && h < ss) { tp = 3; tt = 'день'; }
      else { tp = 2; tt = 'ночь'; }
    }
    parts.push({ name: 'Время суток', max: 5, pts: tp, text: tt });

    let score = 0;
    parts.forEach((p) => { p.pts = rnd(p.pts); score += p.pts; });
    let warn = '';
    if (i.code >= 95) { score = Math.min(score, 15); warn = 'Гроза: рыбачить небезопасно'; }
    else if (i.gust >= 65) { score = Math.min(score, 25); warn = 'Очень сильный ветер: рыбалка опасна'; }
    else if (t <= -25) { score = Math.min(score, 20); warn = 'Сильный мороз'; }
    score = clamp(rnd(score), 0, 100);
    return { score: score, lvl: levelOf(score), label: LEVEL_TXT[levelOf(score)], parts: parts, warn: warn };
  }
  function fishNow(d, series) {
    const c = d.current, dy = d.daily;
    return fishScore({
      temp: c.temperature_2m, pressure: c.pressure_msl,
      dp: series.length >= 7 ? series[series.length - 1] - series[series.length - 7] : null,
      wind: c.wind_speed_10m, gust: c.wind_gusts_10m, cloud: c.cloud_cover,
      precip: Math.max((dy.precipitation_sum[0] || 0) * 0.6, codePrecip(c.weather_code)), code: c.weather_code,
      hour: hourOf(c.time), sr: dy.sunrise && dy.sunrise[0] ? hourOf(dy.sunrise[0]) : null, ss: dy.sunset && dy.sunset[0] ? hourOf(dy.sunset[0]) : null
    });
  }
  function fishDay(d, i) {
    const dy = d.daily, date = dy.time[i], H = d.hourly || {};
    const at = (h) => (H.time || []).indexOf(date + 'T' + h + ':00');
    const a = at('09'), b = at('15');
    const pa = a >= 0 ? H.pressure_msl[a] : null, pb = b >= 0 ? H.pressure_msl[b] : null;
    return fishScore({
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
    openModal('<div class="fhead" data-l="' + f.now.lvl + '">' + ringHtml(f.now.score) + '<div><h3>Клёв: ' + esc(f.now.label) + '</h3><p class="sub">' + f.now.score + ' из 100 · по погоде сейчас</p></div></div>' +
      (f.now.warn ? '<p class="fwarn">' + ic('storm', 18, 'currentColor', 1.8) + '<span>' + esc(f.now.warn) + '</span></p>' : '') +
      '<div class="fparts">' + rows + '</div>' + best +
      '<h4 class="fh4">Лучшие дни</h4><div class="fdays">' + days + '</div>' +
      '<p class="fnote">Это ориентир по погоде, не гарантия. Не учитываются температура и уровень воды, вид рыбы и ваша точка. Давление считается косвенным признаком: прямого научного подтверждения связи с клёвом мало, зато много наблюдений рыбаков.</p>' +
      '<div class="row"><button class="btn btn-primary" id="fOk" type="button">Понятно</button></div>');
    $('#fOk').onclick = closeModal;
  }

  /* ---------- weather ---------- */
  async function getWeather(lat, lon) {
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

  function fillWeather(res, t) {
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

    const fnow = fishNow(d, series);
    const fdays = dy.time.map((tm, i) => {
      const fd = fishDay(d, i);
      return { name: i === 0 ? 'Сегодня' : new Date(tm + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' }), score: fd.score, lvl: fd.lvl };
    });
    S.fish = { now: fnow, days: fdays, sr: dy.sunrise && dy.sunrise[0] ? hourOf(dy.sunrise[0]) : null, ss: dy.sunset && dy.sunset[0] ? hourOf(dy.sunset[0]) : null };
    let bestDay = -1;
    fdays.forEach((x, i) => { if (x.score >= 50 && (bestDay < 0 || x.score > fdays[bestDay].score)) bestDay = i; });
    $('#wxFish').innerHTML = '<button class="fishrow" id="bFish" type="button" data-l="' + fnow.lvl + '" aria-label="Условия клёва: ' + fnow.score + ' из 100, ' + fnow.label + '. Подробнее">' +
      ringHtml(fnow.score) + '<span class="ftxt"><b>Клёв: ' + esc(fnow.label) + '</b><span>' + esc(fnow.warn || 'По погоде · почему такая оценка') + '</span></span>' + ic('chev_r', 20, 'currentColor', 2) + '</button>';
    $('#bFish').addEventListener('click', showFish);

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
    S.wxKey = key;
    const res = await getWeather(t.lat, t.lon);
    if (S.wxKey !== key) return;
    if (!res) {
      $('#wxNow').innerHTML = '<div class="err">' + ic('cloud_off', 24, 'currentColor', 1.8) + '<span>Нет сети и нет сохранённой погоды для этого места. Откройте карту с интернетом один раз.</span></div>';
      $('#wxFish').innerHTML = ''; S.fish = null;
      $('#wxChips').innerHTML = ''; $('#wxStats').innerHTML = ''; $('#wxForecast').innerHTML = ''; $('#wxSpark').innerHTML = '';
      layoutSheet();
      return;
    }
    fillWeather(res, t);
  }

  /* ---------- bottom sheet ---------- */
  const sheet = $('#sheet'), body = $('#sheetBody'), scroll = $('#scroll'), grab = $('#grab');
  let heights = { peek: 280, half: 560, full: 760 };

  const curTarget = () => {
    if (S.sel) { const s = findSpot(S.sel); if (s) return Object.assign({ kind: 'spot' }, s); }
    if (S.temp) return { kind: 'temp', lat: S.temp.lat, lon: S.temp.lon };
    return null;
  };
  const maxFull = () => window.innerHeight - 64 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0);
  function allowedStates() { return sheet.dataset.kind === 'spot' ? ['peek', 'half', 'full'] : ['peek', 'half']; }

  function measure() {
    const chips = $('#wxChips'), actions = $('#actions');
    if (!chips || !actions) return;
    const wasExp = sheet.classList.contains('expanded');
    sheet.classList.remove('expanded');
    const peek = grab.offsetHeight + chips.offsetTop + Math.max(chips.offsetHeight, 36) + 6 + actions.offsetHeight;
    sheet.classList.add('expanded');
    const spark = $('#wxSpark'), fc = $('#wxForecast');
    const endEl = spark && spark.offsetHeight ? spark : fc;
    const halfNeed = grab.offsetHeight + (endEl ? endEl.offsetTop + endEl.offsetHeight : 0) + 12 + actions.offsetHeight;
    sheet.classList.toggle('expanded', wasExp);
    const full = maxFull();
    const half = clamp(rnd(halfNeed), peek + 80, full);
    heights = { peek: Math.min(peek, full), half: half, full: full };
  }
  function applyState(st, instant) {
    S.state = st;
    sheet.classList.toggle('expanded', st !== 'peek');
    sheet.classList.toggle('is-full', st === 'full');
    if (instant) sheet.classList.add('dragging');
    sheet.style.setProperty('--h', heights[st] + 'px');
    if (instant) { sheet.offsetHeight; sheet.classList.remove('dragging'); }
    if (st !== 'full') scroll.scrollTop = 0;
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
  function renderSheet(startState) {
    const t = curTarget();
    if (!t) { closeSheet(); return; }
    const saved = t.kind === 'spot';
    sheet.dataset.kind = t.kind;
    sheet.classList.add('open');
    document.body.classList.add('sheet-open');
    body.innerHTML =
      '<div class="head"><div class="titlecol"><h2 class="title">' + esc(saved ? t.name : 'Новая точка') + '</h2><div class="sub">' + (saved ? 'Сохранено · ' : '') + coordsText(t) + '</div></div>' +
      (saved ? '<button class="icon-btn" id="bMore" type="button" aria-label="Ещё">' + ic('dots', 22) + '</button>' : '<span class="tag tag-accent">Не сохранена</span>') + '</div>' +
      '<div id="wxNow" class="wxnow"><div class="skel" style="height:44px;width:70%;margin-bottom:8px"></div><div class="skel" style="height:14px;width:45%"></div></div>' +
      '<div id="wxFish"></div>' +
      '<div id="wxChips" class="chips"><span class="skel" style="height:36px;width:110px;border-radius:18px"></span><span class="skel" style="height:36px;width:90px;border-radius:18px"></span><span class="skel" style="height:36px;width:80px;border-radius:18px"></span></div>' +
      '<div id="extra"><div id="wxStats" class="stats"></div><div id="wxForecast"></div><div id="wxSpark"></div>' + (saved ? descHtml(t) : '') + '</div>' +
      '<div id="actions" class="actions">' +
      (saved
        ? '<a class="btn btn-primary" href="' + routeUrl(t) + '" target="_blank" rel="noopener">' + ic('nav', 20) + 'Маршрут</a><a class="btn btn-secondary" href="' + tgUrl(t) + '" target="_blank" rel="noopener">' + ic('send', 20) + 'В Telegram</a>'
        : '<button class="btn btn-primary" id="bSave" type="button">' + ic('bookmark', 20) + 'Сохранить точку</button><a class="icon-btn sq" href="' + routeUrl(t) + '" target="_blank" rel="noopener" aria-label="Маршрут">' + ic('nav', 22) + '</a>') +
      '</div>';
    if (saved) {
      $('#bMore').addEventListener('click', () => moreMenu(t));
      const ta = $('#descr');
      let tm;
      ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { const s = findSpot(t.id); if (s && !s.shared) { s.note = ta.value; saveLocal(); } }, 400); });
    } else {
      $('#bSave').addEventListener('click', () => saveDialog({ lat: t.lat, lon: t.lon }));
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
    return 'https://t.me/share/url?url=' + encodeURIComponent(share) + '&text=' + encodeURIComponent('🎣 ' + (t.name || 'Точка') + '\n' + gm);
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
      const h = clamp(startH + (startY - e.clientY), heights.peek * 0.9, heights[al[al.length - 1]]);
      sheet.style.setProperty('--h', h + 'px');
      v = (lastY - e.clientY) / ((e.timeStamp - lastT) || 1);
      lastY = e.clientY; lastT = e.timeStamp;
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('dragging');
      const al = allowedStates();
      if (!moved) { applyState(al[(al.indexOf(S.state) + 1) % al.length]); layoutAfter(); return; }
      const cur = sheet.getBoundingClientRect().height + v * 160;
      let best = al[0], bd = 1e9;
      al.forEach((k) => { const d = Math.abs(heights[k] - cur); if (d < bd) { bd = d; best = k; } });
      applyState(best); layoutAfter();
    };
    const layoutAfter = () => setTimeout(focusTarget, 60);
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    grab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const al = allowedStates(); applyState(al[(al.indexOf(S.state) + 1) % al.length]); layoutAfter(); }
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
      '<div class="row"><button class="btn btn-secondary" id="fCancel" type="button">Отмена</button><button class="btn btn-primary" id="fSave" type="button">Сохранить</button></div>');
    const inp = $('#fName'); inp.focus(); inp.select();
    $('#fCancel').onclick = closeModal;
    const go = () => {
      const name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      const s = { id: uid(), name: name, lat: p.lat, lon: p.lon, note: '', created: Date.now() };
      S.spots.push(s); saveLocal(); closeModal();
      S.temp = null; setTempMarker(null);
      openSpot(s.id, 'half');
      toast('Точка сохранена');
    };
    $('#fSave').onclick = go;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }
  function moreMenu(t) {
    openModal('<h3>' + esc(t.name) + '</h3><div class="stack">' +
      (t.shared ? '<p class="sub">Общая точка из файла spots.json</p>' :
        '<button class="btn btn-secondary" id="mRen" type="button">' + ic('edit', 20) + 'Переименовать</button>' +
        '<button class="btn btn-danger" id="mDel" type="button">' + ic('trash', 20) + 'Удалить точку</button>') +
      '<button class="btn btn-secondary" id="mCancel" type="button">Закрыть</button></div>');
    $('#mCancel').onclick = closeModal;
    if (t.shared) return;
    $('#mRen').onclick = () => {
      openModal('<h3>Переименовать</h3><label for="rName">Название</label><input id="rName" class="input" maxlength="60" value="' + esc(t.name) + '">' +
        '<div class="row"><button class="btn btn-secondary" id="rCancel" type="button">Отмена</button><button class="btn btn-primary" id="rSave" type="button">Сохранить</button></div>');
      const inp = $('#rName'); inp.focus(); inp.select();
      $('#rCancel').onclick = closeModal;
      const go = () => { const v = inp.value.trim(); if (!v) return; const s = findSpot(t.id); s.name = v; saveLocal(); closeModal(); renderMarkers(); renderSheet(S.state); };
      $('#rSave').onclick = go; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    };
    $('#mDel').onclick = () => {
      openModal('<h3>Удалить точку?</h3><p class="sub">«' + esc(t.name) + '» исчезнет с этого устройства. Это нельзя отменить.</p>' +
        '<div class="row"><button class="btn btn-secondary" id="dCancel" type="button">Отмена</button><button class="btn btn-danger" id="dOk" type="button">Удалить</button></div>');
      $('#dCancel').onclick = closeModal;
      $('#dOk').onclick = () => { S.spots = S.spots.filter((s) => s.id !== t.id); saveLocal(); closeModal(); closeSheet(); toast('Точка удалена'); };
    };
  }

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
    $('#lvCount').textContent = allSpots().length;
    let arr = allSpots().slice();
    const q = S.q.trim().toLowerCase();
    if (q) arr = arr.filter((s) => s.name.toLowerCase().includes(q));
    if (S.filter === 'near' && S.loc) arr.sort((a, b) => distance(S.loc, a) - distance(S.loc, b));
    else if (S.filter === 'new') arr.sort((a, b) => (b.created || 0) - (a.created || 0));
    else arr.sort((a, b) => (a.created || 0) - (b.created || 0));
    const box = $('#lvList');
    if (!allSpots().length) {
      box.innerHTML = '<div class="empty">' + ic('fish', 44, 'currentColor', 1.5) + '<b>Пока нет точек</b>Тапните по карте, чтобы увидеть погоду и сохранить первое место.</div>';
      return;
    }
    if (!arr.length) { box.innerHTML = '<div class="empty"><b>Ничего не найдено</b>Попробуйте другое название.</div>'; return; }
    box.innerHTML = arr.map((s) => {
      const dist = S.loc ? fmtDist(distance(S.loc, s)) + ' · ' : '';
      const date = s.created ? new Date(s.created).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
      return '<button class="card" type="button" data-id="' + esc(s.id) + '"><span class="thumb">' + ic('fish', 30, 'currentColor', 1.6) + '</span>' +
        '<span class="ct"><span class="n">' + esc(s.name) + '</span><span class="m">' + dist + (date ? 'сохранена ' + esc(date) : 'общая точка') + '</span>' +
        '<span class="w" data-w="' + esc(s.id) + '"></span></span>' + ic('chev_r', 20, 'currentColor', 2) + '</button>';
    }).join('');
    box.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      const s = findSpot(c.dataset.id); closeList(); openSpot(s.id, 'half');
    }));
    arr.forEach((s) => getWeather(s.lat, s.lon).then((r) => {
      const el = box.querySelector('[data-w="' + s.id + '"]'); if (!el || !r) return;
      const c = r.data.current;
      let fs = null;
      try { fs = fishNow(r.data, pressureSeries(r.data)); } catch (e) { /* нет данных для оценки */ }
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
      '<button class="btn btn-secondary" id="bOffline" type="button" style="width:100%;flex:none;height:48px;font-size:15px">' + ic('download', 20) + '<span id="offTxt">Сохранить карту для офлайна</span></button>' +
      '<p class="note">Карта © OpenStreetMap, OpenTopoMap. Погода: Open-Meteo. Офлайн сохраняются плитки вокруг ваших точек для выбранного слоя. Делайте это по Wi-Fi.</p>';
    menu.hidden = false; $('#bLayers').classList.add('on');
    const sync = () => {
      menu.querySelectorAll('#segLayer button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.layer)));
      menu.querySelectorAll('#segTheme button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.theme)));
    };
    sync();
    menu.querySelectorAll('#segLayer button').forEach((b) => b.addEventListener('click', () => { setLayer(b.dataset.v); sync(); }));
    menu.querySelectorAll('#segTheme button').forEach((b) => b.addEventListener('click', () => { S.theme = b.dataset.v; lsSet('fishmap.theme', S.theme); applyTheme(); sync(); }));
    $('#bOffline').addEventListener('click', downloadOffline);
  }
  $('#bLayers').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !$('#bLayers').contains(e.target)) {
      closeMenu();
      ignoreMapClick = true; setTimeout(() => { ignoreMapClick = false; }, 350);
    }
  });

  /* ---------- offline tiles ---------- */
  const tileXY = (lat, lon, z) => {
    const n = Math.pow(2, z), r = lat * Math.PI / 180;
    return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
  };
  let offBusy = false;
  async function downloadOffline() {
    if (offBusy) return;
    if (!('caches' in window)) { toast('Браузер не поддерживает офлайн'); return; }
    offBusy = true;
    const label = $('#offTxt');
    const layer = layers[S.layer];
    const c = map.getCenter();
    const pts = allSpots().length ? allSpots().map((s) => [s.lat, s.lon]) : [[c.lat, c.lng]];
    const plan = [[10, 1], [12, 1], [13, 2], [14, 2], [15, 2]];
    const urls = new Set();
    pts.forEach(([lat, lon]) => plan.forEach(([z, r]) => {
      const [cx, cy] = tileXY(lat, lon, z), max = Math.pow(2, z);
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) {
        if (y < 0 || y >= max) continue;
        urls.add(layer.getTileUrl({ x: ((x % max) + max) % max, y: y, z: z }));
      }
    }));
    const list = Array.from(urls);
    const cache = await caches.open('fishmap-tiles-v1');
    let done = 0, fail = 0, i = 0;
    async function worker() {
      while (i < list.length) {
        const u = list[i++];
        try { if (!(await cache.match(u))) { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await cache.put(u, r); else fail++; } } catch (e) { fail++; }
        done++;
        if (label && (done % 8 === 0 || done === list.length)) label.textContent = 'Сохраняю: ' + done + ' / ' + list.length;
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    offBusy = false;
    if (label) label.textContent = fail ? 'Готово, не загрузилось: ' + fail : 'Карта сохранена ✓';
  }

  /* ---------- online / offline ---------- */
  function netState() {
    const off = !navigator.onLine;
    document.body.classList.toggle('is-offline', off);
    $('#offlineBar').hidden = !off;
  }
  window.addEventListener('online', netState); window.addEventListener('offline', netState); netState();

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
    map.setView(cfg.center || [51.0447, -114.0719], cfg.zoom || 10);
    renderMarkers();
    if (S.spots.length > 1) map.fitBounds(L.latLngBounds(S.spots.map((s) => [s.lat, s.lon])).pad(0.25));
    else if (S.spots.length === 1) map.setView([S.spots[0].lat, S.spots[0].lon], 12);
    checkHash();
    window.addEventListener('hashchange', checkHash);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  })();
})();
