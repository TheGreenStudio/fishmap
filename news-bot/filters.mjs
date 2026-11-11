// Фильтры новостей и вспомогательные функции без обращения к сети.
// Вынесены из digest.mjs, чтобы их можно было проверять тестами (news-bot/test).

export const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-я]+/g, ' ').trim();

// Порядок разделов в сообщении: сначала то, что ближе к читателю.
// Запросы намеренно простые: Google News на длинные запросы с OR отвечает мусором
// (проверено вживую 2026-11-11). Результаты нескольких запросов объединяются.
export const SECTIONS = [
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
export const MUST = /fish|angl|trout|walleye|pike|carp|sturgeon|whitefish|perch|grayling|burbot|bass\b|salmon|steelhead|big jack|derby|stocking|lake trout|tackle/i;
// Статья должна быть про рыбалку по существу, а не просто упоминать воду или еду.
export const STRONG = /angler|angling|ice fishing|fishing (ban|closure|rules?|regulations?|licen[cs]e|season|derby|tournament|report|limits?)|\bdfo\b|fisheries and oceans|stocking|derby|big jack|invasive|carp|walleye|trout|\bpike\b|sturgeon|whitefish|burbot|grayling|steelhead|conservation officer|fined|fines\b/i;
// Путевые заметки и подборки не нужны.
export const TRAVEL = /village|lighthouse|best places|top \d+|things to do|travel|vacation|resort|getaway|charming|bucket list|destinations?|itinerary|road trip|hidden gem|must[- ]visit|guide to|hotels?\b/i;
export const BLOCK = /commercial|aquaculture|seafood|lobster|crab|shrimp|scallop|oyster|whale|trawler|vessel|tariff|fishing sector|fishing industry|obituar|\bdie[sd]?\b|dead|death|fatal|killed|drown|body found|missing|shooting|stock market|earnings|shares|\bcod\b|quota|fish farm|salmon farm|herring|tuna|fossil|first nation|pipeline|hydro|britannica|golf|\bbears?\b|fish and wildlife club|stolen|rescued|recipe|restaurant/i;

// Одну и ту же историю пересказывают несколько изданий. Считаем заголовки «про одно»,
// если у них три и больше общих слов из четырёх и более букв.
export const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 4));
export function sameStory(a, b) {
  const wa = words(a);
  let shared = 0;
  for (const w of words(b)) if (wa.has(w)) shared++;
  return shared >= 3;
}
export const alreadySent = (title, list) => list.some((t) => t === norm(title) || sameStory(t, title));

export const entities = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&(rsquo|lsquo|#8217);/g, "'").replace(/&(ldquo|rdquo);/g, '"')
  .replace(/&hellip;/g, '…').replace(/&[nm]dash;/g, '-').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function cleanSummary(raw, title) {
  let s = entities(entities(raw)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  // Издание само обрезало описание («… [...]»): оставляем только целые предложения.
  const cutMark = /\s*\[?\s*(…|\.{3})\s*\]?\s*$/;
  if (cutMark.test(s)) {
    s = s.replace(cutMark, '');
    const end = Math.max(s.lastIndexOf('. '), s.lastIndexOf('! '), s.lastIndexOf('? '));
    if (end > 40) s = s.slice(0, end + 1);
    else if (!/[.!?]$/.test(s)) return '';
  }
  if (s.length < 50) return '';
  if (/cookie|subscribe|sign in|log in|javascript|enable|all rights reserved/i.test(s)) return '';
  // Описание, которое просто повторяет заголовок, ничего не добавляет.
  if (norm(s).startsWith(norm(title).slice(0, 40)) && s.length < title.length + 40) return '';
  if (s.length > 260) {
    const cut = s.slice(0, 260);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    s = end > 100 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }
  return s;
}
