// Оценка клёва для сводки. Это перенос формулы из app.js (раздел «fishing score» и «режим и оценка льда»),
// только числа и предупреждения, без текстов для интерфейса. Если меняется формула в app.js, менять и здесь:
// тест news-bot/test/appsync.test.mjs сравнивает таблицы, функции и предупреждения с app.js и падает при расхождении.
// Оценка дня (dayMode), режим «Авто». Ориентир по погоде, не гарантия клёва.

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rnd = Math.round;

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
const F_CLOUD = [[0, 4], [30, 8], [60, 12], [85, 15], [100, 14]];
const F_RAIN = [[0, 10], [0.5, 8], [2, 5], [5, 2], [10, 0]];
// подлёдная
const F_WIND_ICE = [[0, 15], [6, 15], [12, 10], [20, 5], [28, 1], [36, 0]];
const F_CHILL = [[-45, 0], [-35, 3], [-27, 8], [-18, 15], [-10, 20], [-2, 20], [0, 14], [2, 6], [4, 0]];
const F_CLOUD_ICE = [[0, 5], [30, 7], [60, 9], [85, 10], [100, 10]];
const F_RAIN_ICE = [[0, 5], [0.5, 4], [3, 2], [8, 0]];

function windChill(t, v) {
  if (t > 10) return t;
  if (v < 5) return t + (-1.59 + 0.1345 * t) / 5 * Math.max(0, v);
  const p = Math.pow(v, 0.16);
  return 13.12 + 0.6215 * t - 11.37 * p + 0.3965 * t * p;
}
function codePrecip(c) {
  if (c >= 95) return 15;
  if (c === 80) return 4; if (c === 81) return 8; if (c === 82) return 12;
  if (c === 85 || c === 86) return 5;
  if (c >= 71 && c <= 77) return 3;
  if (c === 65 || c === 67) return 10;
  if (c === 63) return 5;
  if (c === 61 || c === 66) return 2;
  if (c >= 51 && c <= 57) return 1.5;
  return 0;
}
function codeCloud(c) {
  if (c === 0) return 5; if (c === 1) return 25; if (c === 2) return 55; if (c === 3) return 90;
  return c === 45 || c === 48 ? 100 : 90;
}
export const levelOf = (s) => (s < 25 ? 'bad' : s < 45 ? 'low' : s < 65 ? 'mid' : s < 83 ? 'good' : 'top');
export const LEVEL_TXT = { bad: 'плохо', low: 'слабо', mid: 'средне', good: 'хорошо', top: 'отлично' };

function pressurePts(i) {
  const dpts = i.dp == null ? 12 : interp(F_PDELTA, i.dp);
  return dpts + interp(F_PABS, i.pressure);
}
const SHAPE = 2.4;
function finishScore(ptsList, caps) {
  let score = 0;
  ptsList.forEach((p) => { score += rnd(p); });
  score = 100 * Math.pow(clamp(score, 0, 100) / 100, SHAPE);
  let warn = '', cap = 100;
  caps.forEach((c) => { if (c.cap < cap) { cap = c.cap; warn = c.warn; } });
  score = clamp(rnd(Math.min(score, cap)), 0, 100);
  return { score, lvl: levelOf(score), label: LEVEL_TXT[levelOf(score)], warn };
}

function fishScoreOpen(i) {
  const t = i.temp;
  const eff = i.wind + 0.5 * Math.max(0, i.gust - i.wind);
  const pts = [
    interp(F_TEMP, t), pressurePts(i), interp(F_WIND, eff),
    interp(F_CLOUD, i.cloud), interp(F_RAIN, i.precip), 5, // время суток: в режиме дня максимум
  ];
  const caps = [];
  if (i.code >= 95) caps.push({ cap: 15, warn: 'Гроза: рыбачить небезопасно' });
  if (i.gust >= 65) caps.push({ cap: 25, warn: 'Очень сильный ветер: рыбалка опасна' });
  if (t <= -25) caps.push({ cap: 20, warn: 'Сильный мороз' });
  if (eff >= 32) caps.push({ cap: 35, warn: 'Очень сильный ветер: рыбачить тяжело и опасно' });
  return finishScore(pts, caps);
}

function fishScoreIce(i) {
  const chill = windChill(i.temp, i.wind);
  let cp = interp(F_CHILL, chill);
  if (i.thaw) cp = Math.min(cp, 6);
  const eff = i.wind + 0.5 * Math.max(0, i.gust - i.wind);
  const cat = i.iceCat || 'unknown';
  const ip = { none: 0, thin: 2, check: 9, ok: 15, unknown: 7 }[cat];
  const pts = [
    pressurePts(i), interp(F_WIND_ICE, eff), cp, i.thaw ? Math.min(ip, 3) : ip,
    interp(F_CLOUD_ICE, i.cloud), interp(F_RAIN_ICE, i.precip), 10,
  ];
  const caps = [];
  if (i.code >= 95) caps.push({ cap: 15, warn: 'Гроза: рыбачить небезопасно' });
  if (i.gust >= 65) caps.push({ cap: 25, warn: 'Очень сильный ветер: рыбалка опасна' });
  if (i.thaw) caps.push({ cap: 30, warn: 'Оттепель: лёд может быть ненадёжным' });
  if (cat === 'none') caps.push({ cap: 20, warn: 'Льда, скорее всего, ещё нет: не выходить' });
  if (cat === 'thin') caps.push({ cap: 25, warn: 'Лёд, скорее всего, тонкий: не выходить' });
  if (chill <= -35) caps.push({ cap: 20, warn: 'Опасный мороз: риск обморожения' });
  else if (chill <= -30) caps.push({ cap: 30, warn: 'Очень сильный мороз: риск обморожения' });
  if (eff >= 32) caps.push({ cap: 30, warn: 'Очень сильный ветер или метель: на льду опасно' });
  return finishScore(pts, caps);
}
const fishScore = (i) => (i.ice ? fishScoreIce(i) : fishScoreOpen(i));

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
// грубая оценка льда по накопленному морозу (Стефан), как в приложении; толщину в сантиметрах не показываем
function iceCategory(days) {
  if (!days.length) return 'unknown';
  let fdd = 0;
  days.forEach((x) => { const m = (x.mx + x.mn) / 2; fdd = m < 0 ? fdd - m : Math.max(0, fdd - 1.5 * m); });
  const h = 1.8 * Math.sqrt(Math.max(0, fdd - 25));
  return h < 5 ? 'none' : h < 10 ? 'thin' : h < 20 ? 'check' : 'ok';
}

// Режим «Авто»: зима, если средняя за 5 прошлых и 2 дня прогноза не выше минус 5 или лёд, по оценке, уже встал.
// d: ответ Open-Meteo (daily, hourly), hist: {time, tmax, tmin} за последние дни.
export function fishCtx(d, hist) {
  const dy = d.daily;
  const past = histBefore(hist, dy.time[0]);
  const mean = (mx, mn) => (mx + mn) / 2;
  const ms = past.slice(-5).map((x) => mean(x.mx, x.mn));
  for (let k = 0; k < 2 && k < dy.time.length; k++) {
    if (dy.temperature_2m_max[k] != null && dy.temperature_2m_min[k] != null) ms.push(mean(dy.temperature_2m_max[k], dy.temperature_2m_min[k]));
  }
  const avg = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 10;
  const cat = iceCategory(past);
  const autoIce = avg <= -5 || cat === 'check' || cat === 'ok';
  const yMax = past.length ? past[past.length - 1].mx : -99;
  return { ice: autoIce, autoIce, avg, cat, yMax };
}
const thawOf = (d, ctx, i) => {
  const mx = d.daily.temperature_2m_max;
  return Math.max(mx[i] == null ? -99 : mx[i], i === 0 ? ctx.yMax : (mx[i - 1] == null ? -99 : mx[i - 1])) > 2;
};

// Оценка дня i (0 = сегодня), как fishDay в app.js
export function fishDay(d, i, ctx) {
  const dy = d.daily, date = dy.time[i], H = d.hourly || {};
  const at = (h) => (H.time || []).indexOf(`${date}T${h}:00`);
  const a = at('09'), b = at('15');
  const pa = a >= 0 ? H.pressure_msl[a] : null, pb = b >= 0 ? H.pressure_msl[b] : null;
  return fishScore({
    ice: ctx.ice, iceCat: ctx.cat, thaw: ctx.ice && thawOf(d, ctx, i),
    temp: dy.temperature_2m_min[i] + 0.4 * (dy.temperature_2m_max[i] - dy.temperature_2m_min[i]),
    pressure: pb != null ? pb : 1013, dp: pa != null && pb != null ? pb - pa : null,
    wind: (dy.wind_speed_10m_max[i] || 0) * 0.75, gust: (dy.wind_gusts_10m_max[i] || 0) * 0.85,
    cloud: codeCloud(dy.weather_code[i]),
    precip: Math.max(dy.precipitation_sum[i] || 0, codePrecip(dy.weather_code[i]) * 0.5),
    code: dy.weather_code[i], dayMode: true,
  });
}
