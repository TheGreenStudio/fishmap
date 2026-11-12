// Ежедневная сводка для Telegram-группы «Дикая Рыбалка».
// Без внешних зависимостей, Node 20+ (на GitHub Node 24). Запускается из .github/workflows/daily-digest.yml.
//
// Состав сообщения: погода в Calgary (Open-Meteo), топ-3 наших точек по оценке клёва (формула приложения),
// одна новость по Альберте и одна по Канаде (Google News RSS). Тексты собираются по правилам, без ИИ.
//
// Переменные окружения:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  куда отправлять (секреты GitHub)
//   SUPABASE_GROUP_CODE  код группы для чтения наших точек (секрет GitHub); без него блок «Клёв» выпадает,
//                        сводка уходит, а запуск помечается ошибкой (письмо от GitHub)
//   DRY_RUN=1     только напечатать сообщение, ничего не отправлять
//   FORCE=1       игнорировать проверку времени и «уже отправляли сегодня»
//   SAVE_STATE=1  запомнить отправленные новости и дату (для боевых запусков)
//   FIXTURE_DIR   для локальных тестов: брать данные из файлов вместо сети

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fishCtx, fishDay } from './fishscore.mjs';
import { norm, SECTIONS, passesFilters, alreadySent, cleanSummary, extractMeta, pageMatchesTitle, pickWithSummary } from './filters.mjs';

// Альберта с ноября 2026 живёт на постоянном UTC-6 (правило вошло в базу часовых поясов IANA, версия 2026c).
// Если база в Node не старше 2026c, считаем время по 'America/Edmonton': будущие изменения правил
// подхватятся сами, когда GitHub обновит Node на раннерах. Со старой базой (так было на раннере с Node 20,
// tzdata 2025c: время на час раньше) берём фиксированный UTC-6.
// Расписание 13:31 и 14:31 UTC переживает и возврат к зимнему UTC-7: тогда отправит запуск 14:31 (7:31 по Calgary).
export const TZ_MIN_VERSION = '2026c';
export function chooseTz(tzVersion) {
  return tzVersion && tzVersion >= TZ_MIN_VERSION ? 'America/Edmonton' : 'Etc/GMT+6';
}
const TZ = chooseTz(process.versions.tz);
const WEATHER_TZ = 'America/Edmonton';   // только для запросов к Open-Meteo (границы суток, разница не больше часа)
const LAT = 51.0447;
const LON = -114.0719;
const E = process.env;
const DRY = E.DRY_RUN === '1';
const FORCE = E.FORCE === '1';
const SAVE = E.SAVE_STATE === '1';
const STATE_FILE = E.STATE_FILE || 'news-bot/state.json';
const FIXTURES = E.FIXTURE_DIR || '';
// Логи запусков в публичном репозитории видны всем, а названия наших точек не для чужих глаз.
// Поэтому в пробных запусках (и в ошибках) названия точек в лог не попадают. Локально с фикстурами показываем как есть.
// Общий бюджет времени на сбор данных. Если какой-то сайт зависает, лучше отправить то, что успели собрать,
// чем упереться в лимит задачи (5 минут) и не прислать ничего.
const BUDGET_MS = Number(E.BUDGET_MS) || 150000;
const STARTED = Date.now();
const timeLeft = () => BUDGET_MS - (Date.now() - STARTED);
export function budgetTimeout(ms) {
  const left = timeLeft();
  if (left < 1500) throw new Error('время на сбор данных вышло');
  return Math.min(ms, left);
}
const MASK_SPOTS = E.MASK_SPOTS ? E.MASK_SPOTS === '1' : !FIXTURES;


// ---------- вспомогательное ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function localParts(d, tz = TZ) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const ruLocal = (d, opts) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, ...opts }).format(d);
const ruDay = (ymd) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long' })
    .format(new Date(`${ymd}T12:00:00Z`));

// Запрос с одним повтором. Повторяем только то, что похоже на временный сбой: обрыв связи, таймаут, 429, 5xx.
// Ответы вроде 401/403/404 не повторяем: второй раз будет то же самое.
export async function request(url, { method = 'GET', headers = {}, body } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, {
        method, body,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; WildFishingDigest/1.0)', ...headers },
        signal: AbortSignal.timeout(budgetTimeout(10000)),
      });
      if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
      return await r.text();
    } catch (e) {
      lastErr = e;
      const transient = !e.status || e.status === 429 || e.status >= 500;
      if (!transient || attempt === 2 || timeLeft() <= 2500) break;   // бюджет на исходе: повторять нет смысла
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
  throw lastErr;
}

async function getText(url, fixture, headers = {}) {
  if (FIXTURES) return fs.readFileSync(`${FIXTURES}/${fixture}`, 'utf8');
  return request(url, { headers });
}

// ---------- новости ----------


const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');

const tag = (x, t) => {
  const m = x.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`));
  return m ? decode(m[1]).trim() : '';
};

function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1];
    let title = tag(x, 'title');
    const rawSource = tag(x, 'source');
    if (rawSource && title.endsWith(` - ${rawSource}`)) title = title.slice(0, -(rawSource.length + 3));
    // У части источников вместо названия приходит адрес сайта: оставляем только домен.
    const source = /^https?:\/\//i.test(rawSource) ? rawSource.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '') : rawSource;
    return { title, source, link: tag(x, 'link'), date: new Date(tag(x, 'pubDate')) };
  }).filter((i) => i.title && i.link && !Number.isNaN(i.date.getTime()));
}

// Все заголовки, найденные за этот запуск: «Канада» смотрит и то, что нашли запросы «Альберты»
// (например, новости B.C. по запросу «Alberta fishing»). Регион всё равно проверяется фильтрами раздела.
const fetchedAll = new Map();

export async function pickNews(section, state, used) {
  const all = new Map(fetchedAll);
  const results = await Promise.allSettled(section.queries.map((q) => {
    const url = 'https://news.google.com/rss/search?q='
      + encodeURIComponent(`${q} when:${section.days}d`)
      + '&hl=en-CA&gl=CA&ceid=CA:en';
    return getText(url, section.fixture).then(parseRss);
  }));
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') for (const it of r.value) { all.set(it.link, it); fetchedAll.set(it.link, it); }
    else { failed++; console.error(`${section.title}: запрос «${section.queries[i]}» не удался (${r.reason && r.reason.message})`); }
  });
  if (failed === section.queries.length) throw new Error('все запросы не удались');
  const cutoff = Date.now() - section.days * 864e5;
  const found = [...all.values()]
    .filter((i) => i.date.getTime() >= cutoff
      && passesFilters(section, i)
      && !alreadySent(i.title, state.sent.map((x) => x.t)) && !alreadySent(i.title, [...used]))
    .sort((a, b) => b.date - a.date);
  console.log(`${section.title}: заголовков в выдаче ${all.size}, подходит ${found.length}`);
  // Для настройки фильтров: в пробном запуске показываем, из чего выбирали.
  if (DRY) for (const f of found.slice(0, 6)) console.log(`   - ${f.date.toISOString().slice(0, 10)} | ${f.source} | ${f.title}`);

  // Берём самую свежую новость, к которой удалось получить краткое описание со страницы статьи
  // (не старше самой свежей более чем на 5 дней). Если описаний нет совсем, остаётся самая свежая с заголовком.
  const top = found.slice(0, 4);
  await Promise.all(top.map(async (f) => { f.summary = await fetchSummary(f); }));
  const best = pickWithSummary(top, 5);
  if (best && !best.summary) console.log(`${section.title}: описание получить не удалось, будет только заголовок`);
  return best;
}

// ---------- краткое описание статьи ----------


async function tryFetch(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'accept-language': 'en-CA,en;q=0.9',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(budgetTimeout(10000)),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// Ссылка из Google News ведёт на редирект. Достаём адрес настоящей статьи.
export async function resolveGoogleLink(link) {
  const m = link.match(/\/articles\/([^?/]+)/);
  if (!m) return link;
  const id = m[1];
  // Старый формат: адрес статьи лежит прямо в base64.
  try {
    const bin = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1');
    const u = bin.match(/https?:\/\/[\x21-\x7e]+/);
    if (u) return u[0];
  } catch { /* дальше */ }
  // Новый формат: спрашиваем у самого Google.
  const page = await tryFetch(`https://news.google.com/rss/articles/${id}?hl=en-CA&gl=CA&ceid=CA:en`);
  const sg = page.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = page.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sg || !ts) throw new Error('нет параметров ссылки');
  const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`;
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
  const resp = await tryFetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });
  const arr = JSON.parse(resp.split('\n\n')[1]);
  const url = JSON.parse(arr[0][2])[1];
  if (!/^https?:\/\//.test(url)) throw new Error('не получили адрес статьи');
  return url;
}


async function fetchSummary(item) {
  if (FIXTURES) return '';
  try {
    const url = await resolveGoogleLink(item.link);
    item.url = url;   // прямая ссылка на статью вместо редиректа Google News
    const html = (await tryFetch(url)).slice(0, 400000);
    const meta = extractMeta(html);
    // Страница-заглушка, главная или окно с cookie: заголовок не совпадает с нашей новостью.
    if (!pageMatchesTitle(meta.title, item.title)) {
      console.log(`   описание: пропущено, страница не про эту новость (${new URL(url).hostname})`);
      return '';
    }
    const raw = meta.description;
    const s = cleanSummary(raw, item.title);
    console.log(`   описание: ${s ? 'получено' : 'пустое'} (${new URL(url).hostname})`);
    return s;
  } catch (e) {
    console.error(`   описание не получено (${e.message})`);
    return '';
  }
}

export function newsBlock(section, item) {
  const when = ruLocal(item.date, { day: 'numeric', month: 'long' });
  const src = item.source ? `${esc(item.source)}, ${when}` : when;
  const href = item.url && /^https?:\/\//.test(item.url) ? item.url : item.link;
  const head = `<b>${section.title}.</b> «<a href="${escAttr(href)}">${esc(item.title)}</a>» (${src})`;
  return item.summary ? `${head}\n${esc(item.summary)}` : head;
}

// ---------- погода ----------

const fmtT = (t) => {
  const r = Math.round(t);
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

// Фраза про лёд. frozen: приложение считает, что лёд мог встать (мороз или недавняя череда морозов);
// winterCold: средняя температура держится не выше минус 5; cat: оценка льда по накопленному морозу,
// та же, что в блоке точек (none, thin, check, ok, unknown). Фраза не должна спорить с предупреждениями точек.
export function iceSentence({ frozen, winterCold, cat = 'unknown' }, tail) {
  if (!frozen && !winterCold) return tail;
  if (cat === 'none') return 'Похолодало, но лёд, скорее всего, ещё не встал: на лёд не выходить.';
  if (cat === 'thin') return 'Лёд, скорее всего, ещё тонкий: на лёд не выходить.';
  if (winterCold) return 'Установилась зимняя погода: лёд мог встать, толщину проверяйте сами, по погоде её не определить.';
  return 'После морозов оттепель: лёд мог остаться, но он ненадёжен, толщину проверяйте сами.';
}

// Режим центра карты (как «Авто» в приложении). Данные кэшируются и используются и в погоде, и в блоке точек.
const centerCtx = () => Promise.all([wxFor(LAT, LON), histFor(LAT, LON)]).then(([w, h]) => fishCtx(w, h));

async function weatherBlock(today) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${LAT}&longitude=${LON}`
    + '&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,snowfall_sum,precipitation_sum,wind_gusts_10m_max'
    + `&past_days=5&forecast_days=7&timezone=${encodeURIComponent(WEATHER_TZ)}`;
  const d = JSON.parse(await getText(url, 'weather.json')).daily;
  let ctx = null;
  try { ctx = await centerCtx(); } catch (e) { console.error(`Режим льда по приложению не определён (${e.message}), считаю по погоде`); }
  return weatherText(d, today, ctx);
}

// Текст блока «Погода» из дневного прогноза Open-Meteo (5 прошлых дней и 7 вперёд). Без сети, проверяется тестами.
// ctx: режим центра карты (fishCtx) или null, если его не удалось получить.
export function weatherText(d, today, ctx) {
  const i0 = d.time.indexOf(today);
  if (i0 < 0) throw new Error('нет сегодняшней даты в прогнозе');

  const parts = [];
  // Сегодня
  let precip = 'без осадков';
  if (d.snowfall_sum[i0] >= 1) precip = `снег около ${Math.round(d.snowfall_sum[i0])} см`;
  else if (d.precipitation_sum[i0] >= 1) precip = `осадки около ${Math.round(d.precipitation_sum[i0])} мм`;
  let line = `В Calgary сегодня от ${fmtT(d.temperature_2m_min[i0])} до ${fmtT(d.temperature_2m_max[i0])}, ${precip}`;
  const gust = Math.round(d.wind_gusts_10m_max[i0]);
  if (gust >= 50) line += `, порывы до ${gust} км/ч, на воде будет неуютно`;
  else if (gust >= 35) line += `, порывы ветра до ${gust} км/ч`;
  parts.push(`${line}.`);

  // Лёд и заморозки. Режим «зима» по тем же правилам, что в приложении:
  // средняя температура за 5 прошлых и 2 дня прогноза не выше минус 5.
  const win = d.temperature_2m_mean.slice(Math.max(0, i0 - 5), i0 + 2).filter((t) => t != null);
  const winMean = win.length ? win.reduce((a, b) => a + b, 0) / win.length : 10;
  const frozen = ctx ? ctx.autoIce : winMean <= -5;
  const winterCold = ctx ? ctx.avg <= -5 : winMean <= -5;
  const future = d.time.map((date, i) => ({ date, min: d.temperature_2m_min[i] })).slice(i0).filter((x) => x.min != null);
  const cold = future.find((x) => x.min <= -5);
  const lowest = Math.min(...future.map((x) => x.min));
  let tail;
  if (cold) tail = `Похолодание: с ${ruDay(cold.date)} ночью до ${fmtT(Math.min(...future.filter((x) => x.date >= cold.date).map((x) => x.min)))}. Льда пока ждать не стоит.`;
  else if (Math.round(lowest) <= -1) tail = `Ночные заморозки слабые (до ${fmtT(lowest)}), льда по погоде не ожидается.`;
  else if (lowest <= 0.5) tail = 'Ночью около нуля, льда по погоде не ожидается.';
  else tail = 'Заморозков на неделю не видно, льда по погоде не ожидается.';
  parts.push(iceSentence({ frozen, winterCold, cat: ctx ? ctx.cat : 'unknown' }, tail));
  return `<b>Погода.</b> ${parts.join(' ')}`;
}

// ---------- клёв по нашим точкам ----------

const SB_URL = 'https://caxuvdrzuurhdtmqbkbg.supabase.co';
const SB_KEY = 'sb_publishable_gS7j7lRfJV5rz-nr6AzV7g_Q9lfGNzt'; // публичный ключ, как в приложении

export async function loadSpots() {
  const code = E.SUPABASE_GROUP_CODE;
  if (!code && !FIXTURES) throw new Error('не задан секрет SUPABASE_GROUP_CODE');
  const headers = { apikey: SB_KEY, 'x-group-code': code || '' };
  let rows = [];
  if (FIXTURES) rows = JSON.parse(fs.readFileSync(`${FIXTURES}/spots_db.json`, 'utf8'));
  else {
    // Проверка кода группы с повтором при сбое сети; «код не подошёл» (false, 401, 403) не повторяем.
    let ok;
    try {
      ok = JSON.parse(await request(`${SB_URL}/rest/v1/rpc/group_check`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}',
      }));
    } catch (e) {
      if (e.status === 401 || e.status === 403) throw new Error('код группы не подошёл');
      throw e;
    }
    if (ok !== true) throw new Error('код группы не подошёл');
    rows = JSON.parse(await getText(`${SB_URL}/rest/v1/spots?select=*&order=created_at.asc`, '', headers));
  }
  // точки из spots.json в репозитории считаются «Оба сезона»
  try {
    const shared = JSON.parse(fs.readFileSync(new URL('../spots.json', import.meta.url), 'utf8')).spots || [];
    for (const sp of shared) if (!rows.some((r) => r.id === sp.id)) rows.push({ ...sp, season: 'both' });
  } catch { /* файла может не быть */ }
  return rows.filter((r) => r && r.name && Number.isFinite(r.lat) && Number.isFinite(r.lon));
}

const wxCache = new Map();
const wxFor = (lat, lon) => {
  const k = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!wxCache.has(k)) {
    // как в приложении: координаты точки без округления, кэш по двум знакам
    wxCache.set(k, getText('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
      + '&hourly=pressure_msl&past_hours=24'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'
      + '&forecast_days=4&timezone=auto&wind_speed_unit=kmh', 'spotwx.json').then(JSON.parse));
  }
  return wxCache.get(k);
};
const histCache = new Map();
const histFor = (lat, lon) => {
  // как в приложении: история температур по координатам с двумя знаками
  const k = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!histCache.has(k)) {
    histCache.set(k, getText('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(2) + '&longitude=' + lon.toFixed(2)
      + '&daily=temperature_2m_max,temperature_2m_min&past_days=30&forecast_days=1&timezone=auto', 'hist.json')
      .then((t) => { const j = JSON.parse(t); return { time: j.daily.time, tmax: j.daily.temperature_2m_max, tmin: j.daily.temperature_2m_min }; }));
  }
  return histCache.get(k);
};

// Тип точки, как в приложении: fish (рыбалка), camp (кэмпинг), poi (интересное место).
// В базе поле kind, в spots.json kind или type; нет поля или незнакомое значение: рыбалка.
const SPOT_KINDS = ['fish', 'camp', 'poi'];
export const spotKind = (s) => { const k = s.kind || s.type; return SPOT_KINDS.includes(k) ? k : 'fish'; };

// Точки для блока клёва: только рыбалка (кэмпинги и интересные места не оцениваются) и только текущего сезона.
export function fishSpotsInSeason(spots, winter) {
  const season = winter ? 'winter' : 'summer';
  return spots.filter((s) => spotKind(s) === 'fish' && ['both', season].includes(s.season || 'summer'));
}

async function spotsBlock() {
  const spots = await loadSpots();
  // сезон карты: как «Авто» в приложении, по погоде и морозам в центре карты
  const winter = (await centerCtx()).autoIce;
  const inSeason = fishSpotsInSeason(spots, winter);
  const fish = spots.filter((s) => spotKind(s) === 'fish').length;
  console.log(`Клёв: точек всего ${spots.length}, рыбалка ${fish}, в сезоне «${winter ? 'зима' : 'лето'}» ${inSeason.length}`);
  if (!inSeason.length) return { text: null, failed: 0 };   // точек на этот сезон нет: блок молча пропадает (решение владельца)

  const scored = [];
  let failed = 0;
  for (const [n, sp] of inSeason.entries()) {
    try {
      const [w, h] = await Promise.all([wxFor(sp.lat, sp.lon), histFor(sp.lat, sp.lon)]);
      const ctx = fishCtx(w, h);          // режим каждой точки по её координатам, как в приложении
      const r = fishDay(w, 0, ctx);
      scored.push({ name: sp.name, ...r, ice: ctx.ice });
    } catch (e) { failed++; console.error(`Клёв: точка №${n + 1} пропущена (${e.message})`); }
  }
  if (!scored.length) return { text: null, failed };
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (DRY) for (const [i, t] of scored.entries()) console.log(`   - ${t.score} | ${MASK_SPOTS ? 'точка ' + (i + 1) : t.name}${t.warn ? ' | ' + t.warn : ''}`);

  if (DRY && MASK_SPOTS) console.log('В пробном запуске названия точек скрыты: логи публичные.');
  return { text: formatSpots(top, { winter, mask: DRY && MASK_SPOTS }), failed };
}

// Текст блока точек. Предупреждения (тонкий лёд, ветер, мороз) показываются для каждой точки:
// если у всех точек одно и то же предупреждение, оно пишется один раз под списком, иначе у каждой своей строки.
export function formatSpots(top, { winter, mask = false }) {
  const warns = top.map((t) => t.warn || '');
  const common = warns[0] && warns.every((w) => w === warns[0]);
  const lines = top.map((t, i) => {
    let line = `${i + 1}. ${mask ? 'точка ' + (i + 1) : esc(t.name)}: ${t.score} из 100, ${t.label}`;
    if (t.warn && !common) line += `. ${esc(t.warn)}.`;
    return line;
  });
  const head = lines.length >= 3 ? 'Топ 3 точки' : lines.length === 2 ? 'Топ 2 точки' : 'Лучшая точка';
  let out = `<b>${head}</b> (${winter ? 'зима, подлёдная рыбалка' : 'лето, открытая вода'}):\n${lines.join('\n')}`;
  if (common) out += `\n${esc(warns[0])}.`;
  if (winter) out += '\nЛёд оценивается только по погоде, толщину проверяйте сами.';
  return out;
}

// ---------- отправка ----------

async function tgCall(chatId, text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.ok === true, status: r.status, j };
  } catch {
    return { ok: false, status: 0, j: {} };   // сеть; текст ошибки с адресом (в нём токен) не берём
  }
}

// Что делать дальше после ответа Telegram. Вынесено отдельно, чтобы проверять тестами.
export function nextTgStep(res, attempt) {
  if (res.ok) return { action: 'done' };
  const mig = res.j && res.j.parameters && res.j.parameters.migrate_to_chat_id;
  if (mig) return { action: 'migrate', chatId: String(mig) };
  if ((res.status === 0 || res.status === 429 || res.status >= 500) && attempt < 3) {
    const wait = Math.min(((res.j && res.j.parameters && res.j.parameters.retry_after) || 2) * 1000, 20000);
    return { action: 'retry', waitMs: wait };
  }
  return { action: 'fail' };
}

// Возвращает { migrated }: true, если группа стала супергруппой и сообщение ушло в новый чат.
export async function sendTelegram(text) {
  let chatId = E.TELEGRAM_CHAT_ID;
  let migrated = false;
  for (let attempt = 1; ; attempt++) {
    const res = await tgCall(chatId, text);
    const step = nextTgStep(res, attempt);
    if (step.action === 'done') return { migrated };
    if (step.action === 'migrate' && !migrated) {
      migrated = true; chatId = step.chatId;
      console.error('Группа стала супергруппой: отправляю в новый чат. Секрет TELEGRAM_CHAT_ID нужно обновить (новый ID покажет getUpdates).');
      attempt--; continue;
    }
    if (step.action === 'retry') {
      console.error(`Telegram не ответил (код ${res.status}), повтор ${attempt}/3`);
      await new Promise((r) => setTimeout(r, step.waitMs));
      continue;
    }
    throw new Error(`Telegram отказал: ${(res.j && res.j.description) || (res.status || 'нет связи')}`);
  }
}

// ---------- состояние ----------

const daysApart = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
const SENT_KEEP_DAYS = 30;

// Состояние хранится в кэше GitHub Actions. Записи об отправленных новостях живут 30 дней,
// иначе со временем «похожие» старые заголовки начинали бы отсекать настоящие новые.
export function normalizeState(raw, today) {
  const st = { lastSentDate: '', sent: [] };
  if (!raw || typeof raw !== 'object') return st;
  st.lastSentDate = typeof raw.lastSentDate === 'string' ? raw.lastSentDate : '';
  const list = Array.isArray(raw.sent) ? raw.sent : [];
  st.sent = list
    .map((x) => (typeof x === 'string' ? { t: x, d: today } : x))
    .filter((x) => x && typeof x.t === 'string' && typeof x.d === 'string' && daysApart(x.d, today) <= SENT_KEEP_DAYS);
  return st;
}

// Проверка сохранения кэша без отправки сообщения: ручной запуск с галочкой selftest.
function selftest() {
  const f = E.SELFTEST_FILE || 'news-bot/selftest.json';
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* первого запуска ещё не было */ }
  console.log(prev ? `Самотест: кэш восстановлен (запись №${prev.n} от ${prev.at})` : 'Самотест: кэша нет (первый запуск самотеста)');
  fs.writeFileSync(f, JSON.stringify({ n: ((prev && prev.n) || 0) + 1, at: new Date().toISOString() }));
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, 'selftest=true\n');
}

// ---------- главное ----------

// Окно отправки по местному времени: 7:20-12:00.
export const inSendWindow = (minutes) => minutes >= 7 * 60 + 20 && minutes < 12 * 60;

async function main() {
  const now = new Date();
  const { date: today, minutes } = localParts(now);

  if (E.SELFTEST === '1') { selftest(); return; }
  console.log(`Время в Calgary: ${today} ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} (пояс ${TZ === 'America/Edmonton' ? 'America/Edmonton' : 'фиксированный UTC-6, база поясов старая'}; tzdata раннера ${process.versions.tz || 'неизвестно'}, Node ${process.version})`);

  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* первого запуска ещё не было или кэш потерян */ }
  const state = normalizeState(raw, today);
  console.log(raw
    ? `Состояние восстановлено: последняя отправка ${state.lastSentDate || 'нет'}, записей о новостях ${state.sent.length}`
    : 'Сохранённого состояния нет (первый запуск или кэш потерян).');

  if (!FORCE) {
    if (state.lastSentDate === today) { console.log('Сегодня уже отправляли, выходим.'); return; }
    // Два cron-запуска (основной и повтор через час): отправляем только в окне 7:20-12:00 по Calgary.
    if (!inSendWindow(minutes)) { console.log('Не время отправки, выходим.'); return; }
  }

  const blocks = [];
  const picked = [];
  const problems = [];   // что пошло не так, но сводку всё же отправили: в конце помечаем запуск ошибкой, чтобы пришло письмо от GitHub

  try { blocks.push(await weatherBlock(today)); }
  catch (e) { console.error(`Погода недоступна: ${e.message}`); problems.push('блок «Погода» не получен'); }

  try {
    const sb = await spotsBlock();
    if (sb.text) blocks.push(sb.text);
    if (sb.failed) problems.push(`блок «Топ точек»: точек без прогноза ${sb.failed}`);
  } catch (e) { console.error(`Клёв по точкам недоступен: ${e.message}`); problems.push('блок «Топ точек» не получен'); }

  const used = new Set();
  for (const s of SECTIONS) {
    try {
      const item = await pickNews(s, state, used);
      if (item) { blocks.push(newsBlock(s, item)); used.add(norm(item.title)); picked.push(norm(item.title)); }
      else console.log(`${s.title}: свежих новостей нет, раздел пропущен.`);
    } catch (e) { console.error(`${s.title}: ошибка ${e.message}`); problems.push(`раздел «${s.title}» не получен`); }
  }

  if (!blocks.length) { console.error('Нечего отправлять.'); process.exit(1); }

  const head = `<b>Дикая Рыбалка. ${cap(ruLocal(now, { weekday: 'long' }))}, ${ruLocal(now, { day: 'numeric', month: 'long' })}</b>`;
  const text = [head, ...blocks].join('\n\n');

  if (DRY) {
    console.log('--- DRY RUN, ничего не отправлено ---\n' + text);
    for (const p of problems) console.log(`::warning::${p}`);
    return;
  }
  if (!E.TELEGRAM_BOT_TOKEN || !E.TELEGRAM_CHAT_ID) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID.'); process.exit(1);
  }
  const sent = await sendTelegram(text);
  console.log('Отправлено.');
  if (sent.migrated) problems.push('группа стала супергруппой: обновите секрет TELEGRAM_CHAT_ID');

  if (SAVE) {
    state.lastSentDate = today;
    state.sent = [...picked.map((t) => ({ t, d: today })), ...state.sent].slice(0, 100);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
    if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, 'saved=true\n');
  }
  if (problems.length) {
    for (const p of problems) console.log(`::warning::${p}`);
    process.exitCode = 1;
  }
}

// Запуск только как скрипт: при импорте (тесты) ничего не выполняется.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
