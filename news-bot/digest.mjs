// Ежедневная сводка для Telegram-группы «Дикая Рыбалка».
// Без внешних зависимостей, Node 20+. Запускается из .github/workflows/daily-digest.yml.
//
// Состав сообщения: погода в Calgary (Open-Meteo), одна новость по Альберте и одна
// по Канаде (Google News RSS). Текст погоды собирается по правилам, без ИИ.
//
// Переменные окружения:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  куда отправлять (секреты GitHub)
//   SUPABASE_GROUP_CODE  код группы для чтения наших точек (секрет GitHub); без него блок «Клёв» пропускается
//   DRY_RUN=1     только напечатать сообщение, ничего не отправлять
//   FORCE=1       игнорировать проверку времени и «уже отправляли сегодня»
//   SAVE_STATE=1  запомнить отправленные новости и дату (для боевых запусков)
//   FIXTURE_DIR   для локальных тестов: брать данные из файлов вместо сети

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fishCtx, fishDay } from './fishscore.mjs';
import { norm, SECTIONS, MUST, STRONG, TRAVEL, BLOCK, sameStory, alreadySent, cleanSummary } from './filters.mjs';

const TZ = 'America/Edmonton';
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
const MASK_SPOTS = E.MASK_SPOTS ? E.MASK_SPOTS === '1' : !FIXTURES;


// ---------- вспомогательное ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function localParts(d) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const ruLocal = (d, opts) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, ...opts }).format(d);
const ruDay = (ymd) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long' })
    .format(new Date(`${ymd}T12:00:00Z`));

async function getText(url, fixture, headers = {}) {
  if (FIXTURES) return fs.readFileSync(`${FIXTURES}/${fixture}`, 'utf8');
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; WildFishingDigest/1.0)', ...headers },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  throw lastErr;
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

async function pickNews(section, state, used) {
  const all = new Map();
  let failed = 0;
  for (const q of section.queries) {
    const url = 'https://news.google.com/rss/search?q='
      + encodeURIComponent(`${q} when:${section.days}d`)
      + '&hl=en-CA&gl=CA&ceid=CA:en';
    try {
      for (const it of parseRss(await getText(url, section.fixture))) all.set(it.link, it);
    } catch (e) { failed++; console.error(`${section.title}: запрос «${q}» не удался (${e.message})`); }
  }
  if (failed === section.queries.length) throw new Error('все запросы не удались');
  const cutoff = Date.now() - section.days * 864e5;
  const found = [...all.values()]
    .filter((i) => i.date.getTime() >= cutoff
      && MUST.test(i.title) && STRONG.test(i.title)
      && !BLOCK.test(i.title) && !TRAVEL.test(i.title)
      && section.region.test(`${i.title} ${i.source}`)
      && !alreadySent(i.title, state.sent) && !alreadySent(i.title, [...used]))
    .sort((a, b) => b.date - a.date);
  console.log(`${section.title}: найдено в Google News ${all.size}, подходит ${found.length}`);
  // Для настройки фильтров: в пробном запуске показываем, из чего выбирали.
  if (DRY) for (const f of found.slice(0, 6)) console.log(`   - ${f.date.toISOString().slice(0, 10)} | ${f.source} | ${f.title}`);

  // Берём самую свежую новость, к которой удалось получить краткое описание со страницы статьи.
  // Если ни к одной не удалось, остаётся самая свежая, но только с заголовком.
  const top = found.slice(0, 4);
  for (const f of top) {
    f.summary = await fetchSummary(f);
    if (f.summary) return f;
  }
  if (top[0]) console.log(`${section.title}: описание получить не удалось, будет только заголовок`);
  return top[0] || null;
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
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// Ссылка из Google News ведёт на редирект. Достаём адрес настоящей статьи.
async function resolveGoogleLink(link) {
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
    const html = (await tryFetch(url)).slice(0, 400000);
    const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
    const pick = (re) => {
      const t = metas.find((x) => re.test(x));
      return t?.match(/content\s*=\s*"([^"]*)"/i)?.[1] || t?.match(/content\s*=\s*'([^']*)'/i)?.[1] || '';
    };
    const raw = pick(/(property|name)\s*=\s*["']og:description["']/i)
      || pick(/name\s*=\s*["']description["']/i)
      || pick(/name\s*=\s*["']twitter:description["']/i);
    const s = cleanSummary(raw, item.title);
    console.log(`   описание: ${s ? 'получено' : 'пустое'} (${new URL(url).hostname})`);
    return s;
  } catch (e) {
    console.error(`   описание не получено (${e.message})`);
    return '';
  }
}

function newsBlock(section, item) {
  const when = ruLocal(item.date, { day: 'numeric', month: 'long' });
  const src = item.source ? `${esc(item.source)}, ${when}` : when;
  const head = `<b>${section.title}.</b> «<a href="${esc(item.link)}">${esc(item.title)}</a>» (${src})`;
  return item.summary ? `${head}\n${esc(item.summary)}` : head;
}

// ---------- погода ----------

const fmtT = (t) => {
  const r = Math.round(t);
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

async function weatherBlock(today) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${LAT}&longitude=${LON}`
    + '&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,snowfall_sum,precipitation_sum,wind_gusts_10m_max'
    + `&past_days=5&forecast_days=7&timezone=${encodeURIComponent(TZ)}`;
  const d = JSON.parse(await getText(url, 'weather.json')).daily;
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
  const win = d.temperature_2m_mean.slice(i0 - 5, i0 + 2).filter((t) => t != null);
  const winMean = win.reduce((a, b) => a + b, 0) / win.length;
  if (winMean <= -5) {
    parts.push('Установилась зимняя погода: лёд мог встать, толщину проверяйте сами, по погоде её не определить.');
  } else {
    const future = d.time.map((date, i) => ({ date, min: d.temperature_2m_min[i] })).slice(i0);
    const cold = future.find((x) => x.min <= -5);
    const lowest = Math.min(...future.map((x) => x.min));
    if (cold) parts.push(`Похолодание: с ${ruDay(cold.date)} ночью до ${fmtT(Math.min(...future.filter((x) => x.date >= cold.date).map((x) => x.min)))}. Льда пока ждать не стоит.`);
    else if (Math.round(lowest) <= -1) parts.push(`Ночные заморозки слабые (до ${fmtT(lowest)}), льда нет.`);
    else if (lowest <= 0.5) parts.push('Ночью около нуля, льда нет.');
    else parts.push('Заморозков на неделю не видно, льда нет.');
  }
  return `<b>Погода.</b> ${parts.join(' ')}`;
}

// ---------- клёв по нашим точкам ----------

const SB_URL = 'https://caxuvdrzuurhdtmqbkbg.supabase.co';
const SB_KEY = 'sb_publishable_gS7j7lRfJV5rz-nr6AzV7g_Q9lfGNzt'; // публичный ключ, как в приложении
const MAP_CENTER = { lat: LAT, lon: LON };                       // центр карты (по нему приложение выбирает сезон)

async function loadSpots() {
  const code = E.SUPABASE_GROUP_CODE;
  if (!code && !FIXTURES) throw new Error('не задан секрет SUPABASE_GROUP_CODE');
  const headers = { apikey: SB_KEY, 'x-group-code': code || '' };
  let rows = [];
  if (FIXTURES) rows = JSON.parse(fs.readFileSync(`${FIXTURES}/spots_db.json`, 'utf8'));
  else {
    const chk = await fetch(`${SB_URL}/rest/v1/rpc/group_check`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000),
    });
    if (!chk.ok || (await chk.json()) !== true) throw new Error('код группы не подошёл');
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
    wxCache.set(k, getText('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(2) + '&longitude=' + lon.toFixed(2)
      + '&hourly=pressure_msl&past_hours=24'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'
      + '&forecast_days=4&timezone=auto&wind_speed_unit=kmh', 'spotwx.json').then(JSON.parse));
  }
  return wxCache.get(k);
};
const histCache = new Map();
const histFor = (lat, lon) => {
  const k = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  if (!histCache.has(k)) {
    histCache.set(k, getText('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(1) + '&longitude=' + lon.toFixed(1)
      + '&daily=temperature_2m_max,temperature_2m_min&past_days=30&forecast_days=1&timezone=auto', 'hist.json')
      .then((t) => { const j = JSON.parse(t); return { time: j.daily.time, tmax: j.daily.temperature_2m_max, tmin: j.daily.temperature_2m_min }; }));
  }
  return histCache.get(k);
};

async function spotsBlock() {
  const spots = await loadSpots();
  // сезон карты: как «Авто» в приложении, по погоде и морозам в центре карты
  const [cw, ch] = await Promise.all([wxFor(MAP_CENTER.lat, MAP_CENTER.lon), histFor(MAP_CENTER.lat, MAP_CENTER.lon)]);
  const winter = fishCtx(cw, ch).autoIce;
  const season = winter ? 'winter' : 'summer';
  const inSeason = spots.filter((s) => { const q = s.season || 'summer'; return q === 'both' || q === season; });
  console.log(`Клёв: точек всего ${spots.length}, в сезоне «${winter ? 'зима' : 'лето'}» ${inSeason.length}`);
  if (!inSeason.length) return null;

  const scored = [];
  for (const [n, sp] of inSeason.entries()) {
    try {
      const [w, h] = await Promise.all([wxFor(sp.lat, sp.lon), histFor(sp.lat, sp.lon)]);
      const ctx = fishCtx(w, h);          // режим каждой точки по её координатам, как в приложении
      const r = fishDay(w, 0, ctx);
      scored.push({ name: sp.name, ...r, ice: ctx.ice });
    } catch (e) { console.error(`Клёв: точка №${n + 1} пропущена (${e.message})`); }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (DRY) for (const [i, t] of scored.entries()) console.log(`   - ${t.score} | ${MASK_SPOTS ? 'точка ' + (i + 1) : t.name}${t.warn ? ' | ' + t.warn : ''}`);

  const lines = top.map((t, i) => `${i + 1}. ${DRY && MASK_SPOTS ? 'точка ' + (i + 1) : esc(t.name)}: ${t.score} из 100, ${t.label}`);
  if (DRY && MASK_SPOTS) console.log('В пробном запуске названия точек скрыты: логи публичные.');
  const head = lines.length >= 3 ? 'Топ 3 точки' : lines.length === 2 ? 'Топ 2 точки' : 'Лучшая точка';
  let out = `<b>${head}</b> (${winter ? 'зима, подлёдная рыбалка' : 'лето, открытая вода'}):\n${lines.join('\n')}`;
  if (top[0].warn) out += `\n${esc(top[0].warn)}.`;
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

// ---------- главное ----------

async function main() {
  const now = new Date();
  const { date: today, minutes } = localParts(now);

  let state = { lastSentDate: '', sent: [] };
  try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch { /* первый запуск */ }

  if (!FORCE) {
    if (state.lastSentDate === today) { console.log('Сегодня уже отправляли, выходим.'); return; }
    // Два cron-запуска (зима и лето): отправляем только в окне 7:20-12:00 по Calgary.
    if (minutes < 7 * 60 + 20 || minutes >= 12 * 60) { console.log('Не время отправки, выходим.'); return; }
  }

  const blocks = [];
  const picked = [];
  const problems = [];   // что пошло не так, но сводку всё же отправили: в конце помечаем запуск ошибкой, чтобы пришло письмо от GitHub

  try { blocks.push(await weatherBlock(today)); }
  catch (e) { console.error(`Погода недоступна: ${e.message}`); }

  try {
    const sb = await spotsBlock();
    if (sb) blocks.push(sb);
  } catch (e) { console.error(`Клёв по точкам недоступен: ${e.message}`); }

  const used = new Set();
  for (const s of SECTIONS) {
    try {
      const item = await pickNews(s, state, used);
      if (item) { blocks.push(newsBlock(s, item)); used.add(norm(item.title)); picked.push(norm(item.title)); }
      else console.log(`${s.title}: свежих новостей нет, раздел пропущен.`);
    } catch (e) { console.error(`${s.title}: ошибка ${e.message}`); }
  }

  if (!blocks.length) { console.error('Нечего отправлять.'); process.exit(1); }

  const head = `<b>Дикая Рыбалка. ${cap(ruLocal(now, { weekday: 'long' }))}, ${ruLocal(now, { day: 'numeric', month: 'long' })}</b>`;
  const text = [head, ...blocks].join('\n\n');

  if (DRY) { console.log('--- DRY RUN, ничего не отправлено ---\n' + text); return; }
  if (!E.TELEGRAM_BOT_TOKEN || !E.TELEGRAM_CHAT_ID) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID.'); process.exit(1);
  }
  const sent = await sendTelegram(text);
  console.log('Отправлено.');
  if (sent.migrated) problems.push('группа стала супергруппой: обновите секрет TELEGRAM_CHAT_ID');

  if (SAVE) {
    state.lastSentDate = today;
    state.sent = [...picked, ...state.sent].slice(0, 100);
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
