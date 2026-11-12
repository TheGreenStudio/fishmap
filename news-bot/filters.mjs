// Фильтры новостей и вспомогательные функции без обращения к сети.
// Вынесены из digest.mjs, чтобы их можно было проверять тестами (news-bot/test).

export const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-я]+/g, ' ').trim();

// Порядок разделов в сообщении: сначала то, что ближе к читателю.
// Запросы намеренно простые: Google News на длинные запросы с OR отвечает мусором
// (проверено вживую 2026-11-11). Результаты нескольких запросов объединяются.
export const SECTIONS = [
  { title: 'Альберта', kind: 'ab', fixture: 'alberta.xml', days: 21,
    queries: ['Alberta fishing', 'Alberta anglers', 'Calgary fishing', 'Alberta ice fishing', 'Alberta walleye', 'Alberta trout'] },
  { title: 'Канада', kind: 'ca', fixture: 'canada.xml', days: 14,
    queries: ['Canada fishing anglers', 'recreational fishing Canada', 'ice fishing Canada', 'Fisheries and Oceans Canada anglers',
      'B.C. fishing', 'Ontario fishing', 'Saskatchewan fishing'] },
];

// ---------- привязка к региону ----------
// Google News находит и чужие местные газеты: Victoria (Австралия), Ottawa County (США),
// Vancouver, Wash., Airdrie (Шотландия). Поэтому голые названия городов, которые есть и за пределами Канады,
// региона не доказывают: нужен канадский источник или однозначное слово в заголовке.
// Канадский источник сам по себе не доказывает, что новость про Канаду: канадские сайты перепечатывают
// новости AP и Reuters (12.11.2026 так прошла новость про ловлю в Montauk, Нью-Йорк). Поэтому место
// должно быть в заголовке.

// Местные издания и ведомства Альберты: свои новости, перепечаток зарубежных почти нет.
const AB_LOCAL = [
  'rdnewsnow', 'cochrane eagle', 'cochrane ?today', 'airdrie (city view|today)', 'discover airdrie', 'brooks bulletin',
  'rocky mountain outlook', 'rmo ?today', 'fitzhugh', 'crag (&|and) canyon', 'lethbridge herald', 'medicine hat news',
  'red deer advocate', 'ponoka news', 'lacombe express', 'stettler independent', 'sherwood park news', 'st\\.? albert gazette',
  'lakeland ?today', 'town ?and ?country ?today', 'mountain ?view ?today', 'okotoks ?today', 'western wheel', 'high river times',
  'strathmore times', 'taber times', 'cold lake sun', 'everythinggp', 'my ?grande ?prairie ?now', 'my ?mcmurray', 'todayville',
  'chat news today', 'city of (calgary|edmonton|red deer|lethbridge|airdrie|medicine hat)', 'alberta\\.ca', 'government of alberta',
];
const AB_LOCAL_SOURCE = new RegExp(AB_LOCAL.join('|'), 'i');
// Источники, про которые известно, что они канадские (общенациональные и местные).
const CA_SOURCE = new RegExp([
  '\\.ca\\b', '\\bcbc\\b', '\\bctv\\b', 'global ?news', 'citynews', 'narcity', 'daily hive', 'castanet', 'national post',
  'canadian ?press', 'calgary (herald|sun)', 'edmonton (journal|sun)', 'toronto (star|sun)', 'globe and mail', 'free press',
  'vancouver sun', 'times colonist', '\\bchek\\b', 'pr newswire canada', 'canada newswire', 'saltwire', 'cfjc', 'ckpg',
  'western producer', ...AB_LOCAL,
].join('|'), 'i');
// Названия, однозначно указывающие на Альберту (озёра, реки, города и округа).
const AB_SURE = /alberta|calgary|edmonton|red deer|lethbridge|medicine hat|bow river|elbow river|stettler|grande prairie|peace river|canmore|okotoks|mcmurray|slave lake|athabasca|cold lake|bonnyville|wetaskiwin|camrose|drumheller|lloydminster|high river|rocky mountain house|sylvan lake|pigeon lake|lac la biche|buffalo lake|chestermere|glenmore|ponoka|strathcona|wheatland|lacombe|lac ste\.? anne|wabamun|gull lake|pine lake|ghost lake|chain lakes|kananaskis|waterton|abraham lake|minnewanka|spray lakes|oldman river|red deer river|north saskatchewan|crowsnest|highwood|innisfail|sundre|strathmore|pincher creek|claresholm|stony plain|spruce grove|st\.? albert|fort saskatchewan|morinville|wainwright|whitecourt|edson|high prairie|wabasca|fort chipewyan/i;
// Названия, которые бывают и вне Альберты: засчитываем только с канадским источником.
const AB_AMBIG = /airdrie|cochrane|brooks|jasper|banff/i;
// Однозначно канадские слова в заголовке (без Victoria, Ottawa, Vancouver, Toronto: они есть и в других странах).
const CA_TITLE = /canad|b\.c\.|\bbc\b|british columbia|vancouver island|fraser river|haida gwaii|ontario|\bont\.|lake simcoe|georgian bay|lake of the woods|manitoba|saskatchewan|\bsask\.|quebec|\bque\.|nova scotia|n\.s\.|new brunswick|n\.b\.|newfoundland|\bnfld\.|labrador|yukon|nunavut|northwest territories|n\.w\.t\.|\bdfo\b|fisheries and oceans|\balta\.|prince edward island|p\.e\.i\.|kelowna|kamloops|saskatoon|winnipeg|thunder bay|sudbury|nanaimo|prince george|whitehorse|yellowknife|okanagan/i;
// Канадские города с тёзками в других странах: засчитываем только с канадским источником.
const CA_AMBIG = /toronto|ottawa|vancouver|victoria|montreal|halifax|regina|hamilton|kingston|windsor|london/i;
// Признаки чужой страны. Слово County само по себе не признак США: в Альберте много County (Ponoka, Strathcona).
const FOREIGN = /\b(wash|wis|mich|minn|tex|fla|calif|penn|mont|ore|n\.y)\.|australia|queensland|gippsland|new zealand|scotland|england|ireland|\bUK\b/i;
const COUNTY = /\bcounty\b/i;
// Сайты, которые находятся по слову «Canadian», но не про нашу рыбалку (развлечения США, обзоры рынков, некрологи).
export const SOURCE_BLOCK = /whiskey riff|outkick|sports illustrated|\bfox \d|future market|market (research|insights)|dignity memorial|legacy\.com/i;

export function inRegion(section, title, source = '') {
  const caSource = CA_SOURCE.test(source);
  if (FOREIGN.test(title) && !caSource) return false;
  const abTitle = AB_SURE.test(title);
  // County засчитываем как США, только если в заголовке нет канадских мест и источник не канадский
  if (COUNTY.test(title) && !caSource && !abTitle && !CA_TITLE.test(title)) return false;
  if (section.kind === 'ab') {
    // Крупные газеты (Calgary Herald и др.) перепечатывают чужие новости, поэтому без места в заголовке
    // засчитываем только местные издания Альберты.
    return abTitle || AB_LOCAL_SOURCE.test(source) || (AB_AMBIG.test(title) && caSource);
  }
  if (FOREIGN.test(title)) return false;   // перепечатка зарубежной новости канадским сайтом
  return CA_TITLE.test(title) || abTitle || (CA_AMBIG.test(title) && caSource);
}

// Нужны именно новости про любительскую рыбалку: промысел и прочее отсекаем.
// Слова «fish/angl» нет в части заголовков (например «Prussian carp», «Big Jack Classic»), поэтому список шире.
export const MUST = /fish|angl|trout|walleye|pike|carp|sturgeon|whitefish|perch|grayling|burbot|bass\b|salmon|steelhead|big jack|derby|stocking|lake trout|tackle/i;
// Статья должна быть про рыбалку по существу, а не просто упоминать воду или еду.
export const STRONG = /angler|angling|ice fishing|fishing (ban|closure|rules?|regulations?|licen[cs]e|season|derby|tournament|report|limits?)|\bdfo\b|fisheries and oceans|stocking|derby|big jack|invasive|carp|walleye|trout|\bpike\b|sturgeon|whitefish|burbot|grayling|steelhead|conservation officer|fined|fines\b|die-?off|fish kill|dead fish/i;
// Путевые заметки и подборки не нужны.
export const TRAVEL = /village|lighthouse|best places|top \d+|things to do|travel|vacation|resort|getaway|charming|bucket list|destinations?|itinerary|road trip|hidden gem|must[- ]visit|hotels?\b/i;
// Замор рыбы (die-off, dead fish), новости с First Nation и про ГЭС не отсекаются: решение владельца 12.11.2026.
export const BLOCK = /commercial|aquaculture|seafood|lobster|crab|shrimp|prawn|clam|mussel|sea cucumber|urchin|geoduck|abalone|sponge reef|scallop|oyster|whale|trawler|vessel|tariff|fishing sector|fishing industry|obituar|\bdie[sd]?\b(?!-?off)|\bdead\b(?! fish)|death|fatal|killed|drown|body found|missing|shooting|stock market|earnings|share price|shares (?:rise|rose|fall|fell|jump|drop|surge)|\bcod\b|quota|fish farm|salmon farm|herring|tuna|fossil|pipeline|britannica|golf|\bbears?\b|fish and wildlife club|stolen|rescued|recipe|restaurant/i;

// Подходит ли заголовок для раздела целиком.
export function passesFilters(section, item) {
  const t = item.title;
  return MUST.test(t) && STRONG.test(t) && !BLOCK.test(t) && !TRAVEL.test(t) && !SOURCE_BLOCK.test(item.source || '')
    && inRegion(section, t, item.source || '');
}

// ---------- «одна и та же история» ----------
// Одну историю пересказывают несколько изданий. Заголовки считаем «про одно», если у них много общих
// значимых слов. Слова вроде «Alberta», «fishing», «anglers» есть почти в каждом заголовке и ничего не доказывают,
// поэтому в расчёт не берутся. У слов отбрасываем окончания (-ing, -ed, -es, -s) и сравниваем первые пять букв,
// чтобы «closes» и «closed», «fined» и «fines» совпадали.
const STOP = new Set(['alberta', 'albertas', 'canada', 'canadian', 'calgary', 'edmonton', 'fishing', 'fish', 'angler', 'anglers', 'angling',
  'lake', 'lakes', 'river', 'news', 'says', 'said', 'after', 'will', 'from', 'with', 'this', 'that', 'what', 'when', 'where', 'have',
  'been', 'were', 'they', 'their', 'more', 'into', 'over', 'near', 'local', 'province', 'provincial', 'report', 'reports', 'ice',
  'season', 'year', 'years', 'week', 'today', 'amid', 'about', 'than', 'also', 'just', 'back', 'first', 'last']);
const stem = (w) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/(ed|es|s)$/, '')).slice(0, 5);
export const stems = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 4 && !STOP.has(w)).map(stem));
export function sameStory(a, b) {
  const A = stems(a), B = stems(b);
  let shared = 0;
  for (const w of B) if (A.has(w)) shared++;
  const min = Math.min(A.size, B.size);
  return shared >= 3 || (shared >= 2 && min >= 4 && shared / min >= 0.6);
}
export const alreadySent = (title, list) => list.some((t) => t === norm(title) || sameStory(t, title));

// ---------- краткое описание ----------

export const entities = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&(rsquo|lsquo|#8217);/g, "'").replace(/&(ldquo|rdquo);/g, '"')
  .replace(/&hellip;/g, '…').replace(/&[nm]dash;/g, '-').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Шаблонные описания издания («Read the latest local news...»): к конкретной статье отношения не имеют.
const BOILERPLATE = /\b(latest|breaking|top) (local )?news\b|weather, sports|your (source|home) for|read the latest|get the latest|all the latest|stay (informed|up to date)|news, (weather|sports)|covering (calgary|alberta|canada)\b/i;

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
  if (BOILERPLATE.test(s)) return '';
  // Описание должно быть про эту новость: общее слово с заголовком или рыболовное слово.
  const ts = stems(title);
  let common = 0;
  for (const w of stems(s)) if (ts.has(w)) common++;
  if (common < 1 && !MUST.test(s)) return '';
  // Описание, которое просто повторяет заголовок, ничего не добавляет.
  if (norm(s).startsWith(norm(title).slice(0, 40)) && s.length < title.length + 40) return '';
  if (s.length > 260) {
    const cut = s.slice(0, 260);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    s = end > 100 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }
  return s;
}

// Достаёт из страницы заголовок и описание (og:/meta). Чистая функция, сети не использует.
export function extractMeta(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const pick = (re) => {
    const t = metas.find((x) => re.test(x));
    return (t && (t.match(/content\s*=\s*"([^"]*)"/i) || t.match(/content\s*=\s*'([^']*)'/i)) || [])[1] || '';
  };
  const description = pick(/(property|name)\s*=\s*["']og:description["']/i)
    || pick(/name\s*=\s*["']description["']/i)
    || pick(/name\s*=\s*["']twitter:description["']/i);
  const ogTitle = pick(/(property|name)\s*=\s*["']og:title["']/i)
    || ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  return { description, title: entities(entities(ogTitle)).replace(/\s+/g, ' ').trim() };
}

// Страница действительно про нашу новость (а не заглушка, главная или окно согласия с cookie).
export function pageMatchesTitle(pageTitle, title) {
  if (!pageTitle) return true;   // заголовка на странице нет: решит проверка самого описания
  const A = stems(title), B = stems(pageTitle);
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared >= Math.min(2, A.size);
}

// Из кандидатов (свежие первыми) берём новость с описанием, но не слишком старую по сравнению с самой свежей.
export function pickWithSummary(cands, maxGapDays = 5) {
  if (!cands.length) return null;
  const newest = cands[0];
  const ok = cands.find((c) => c.summary && newest.date - c.date <= maxGapDays * 864e5);
  return ok || newest;
}
