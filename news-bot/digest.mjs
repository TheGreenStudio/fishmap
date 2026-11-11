// Ежедневная сводка для Telegram-группы «Дикая Рыбалка».
// Без внешних зависимостей, Node 20+. Запускается из .github/workflows/daily-digest.yml.
//
// Состав сообщения: погода в Calgary (Open-Meteo), одна новость по Альберте и одна
// по Канаде (Google News RSS). Текст погоды собирается по правилам, без ИИ.
//
// Переменные окружения:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  куда отправлять (секреты GitHub)
//   DRY_RUN=1     только напечатать сообщение, ничего не отправлять
//   FORCE=1       игнорировать проверку времени и «уже отправляли сегодня»
//   SAVE_STATE=1  запомнить отправленные новости и дату (для боевых запусков)
//   FIXTURE_DIR   для локальных тестов: брать данные из файлов вместо сети

import fs from 'node:fs';

const TZ = 'America/Edmonton';
const LAT = 51.0447;
const LON = -114.0719;
const E = process.env;
const DRY = E.DRY_RUN === '1';
const FORCE = E.FORCE === '1';
const SAVE = E.SAVE_STATE === '1';
const STATE_FILE = E.STATE_FILE || 'news-bot/state.json';
const FIXTURES = E.FIXTURE_DIR || '';

// Порядок разделов в сообщении: сначала то, что ближе к читателю.
// Запросы намеренно простые: Google News на длинные запросы с OR отвечает мусором
// (проверено вживую 2026-11-11). Результаты нескольких запросов объединяются.
const SECTIONS = [
  { title: 'Альберта', fixture: 'alberta.xml', days: 21,
    queries: ['Alberta fishing', 'Alberta anglers', 'Calgary fishing', 'Alberta ice fishing'],
    // Новость должна быть про Альберту (в заголовке или названии источника).
    region: /alberta|calgary|edmonton|red deer|lethbridge|medicine hat|bow river|stettler|grande prairie|peace river|banff|jasper|canmore|cochrane|airdrie|okotoks|mcmurray|slave lake|athabasca|cold lake|bonnyville|wetaskiwin|camrose|drumheller|lloydminster|brooks|high river|rocky mountain house|sylvan|pigeon lake|lac la biche/i },
  { title: 'Канада', fixture: 'canada.xml', days: 14,
    queries: ['Canada fishing anglers', 'recreational fishing Canada', 'ice fishing Canada', 'Fisheries and Oceans Canada anglers'],
    // Только канадские новости: американские местные газеты с запросом «Canada» тоже находятся.
    region: /canad|b\.c\.|\bbc\b|ontario|manitoba|saskatchewan|quebec|nova scotia|new brunswick|newfoundland|yukon|nunavut|northwest territories|\bdfo\b|fisheries and oceans|cbc|ctv|global news|citynews|narcity|daily hive|castanet|national post|toronto|vancouver|winnipeg|ottawa|kelowna|kamloops|victoria|\.ca\b/i },
];

// Нужны именно новости про любительскую рыбалку: промысел и прочее отсекаем.
// Слова «fish/angl» нет в части заголовков (например «Prussian carp», «Big Jack Classic»), поэтому список шире.
const MUST = /fish|angl|trout|walleye|pike|carp|sturgeon|whitefish|perch|grayling|burbot|bass\b|salmon|steelhead|big jack|derby|stocking|lake trout|tackle/i;
const BLOCK = /commercial|aquaculture|seafood|lobster|crab|shrimp|scallop|oyster|whale|trawler|vessel|tariff|fishing sector|fishing industry|obituar|\bdie[sd]?\b|dead|death|fatal|killed|drown|body found|missing|shooting|stock market|earnings|shares|\bcod\b|quota|fish farm|salmon farm|herring|tuna|fossil|first nation|pipeline|hydro|britannica|golf|\bbears?\b|fish and wildlife club|stolen|rescued|recipe|restaurant/i;

// ---------- вспомогательное ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-я]+/g, ' ').trim();

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

async function getText(url, fixture) {
  if (FIXTURES) return fs.readFileSync(`${FIXTURES}/${fixture}`, 'utf8');
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; WildFishingDigest/1.0)' },
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
    const source = tag(x, 'source');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
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
      && MUST.test(i.title) && !BLOCK.test(i.title)
      && section.region.test(`${i.title} ${i.source}`)
      && !state.sent.includes(norm(i.title)) && !used.has(norm(i.title)))
    .sort((a, b) => b.date - a.date);
  console.log(`${section.title}: найдено в Google News ${all.size}, подходит ${found.length}`);
  return found[0] || null;
}

function newsBlock(section, item) {
  const when = ruLocal(item.date, { day: 'numeric', month: 'long' });
  const src = item.source ? `${esc(item.source)}, ${when}` : when;
  return `<b>${section.title}.</b> «<a href="${esc(item.link)}">${esc(item.title)}</a>» (${src})`;
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

// ---------- отправка ----------

async function sendTelegram(text) {
  let r;
  try {
    r = await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: E.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('не удалось связаться с Telegram');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`Telegram отказал: ${j.description || r.status}`);
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

  try { blocks.push(await weatherBlock(today)); }
  catch (e) { console.error(`Погода недоступна: ${e.message}`); }

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
  await sendTelegram(text);
  console.log('Отправлено.');

  if (SAVE) {
    state.lastSentDate = today;
    state.sent = [...picked, ...state.sent].slice(0, 100);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
    if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, 'saved=true\n');
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
