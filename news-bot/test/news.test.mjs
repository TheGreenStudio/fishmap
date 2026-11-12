// Выбор новостей целиком (pickNews) и раскрытие ссылок Google News, без сети.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, norm } from '../filters.mjs';
import { mockFetch, oldLink, newLink, page } from './helpers/news.mjs';

const [AB, CA] = SECTIONS;
let n = 0;
// Каждый тест берёт свой экземпляр модуля: общий пул заголовков и кэши не переходят между тестами.
const fresh = () => import(`../digest.mjs?case=${++n}`);
const isAB = (q) => AB.queries.includes(q);

const A_URL = 'https://a.example.ca/walleye';
const B_URL = 'https://b.example.ca/glenmore';
const S_URL = 'https://s.example.ca/sturgeon';
const ab = [
  { title: 'Alberta walleye anglers welcome new limits at Pigeon Lake', source: 'Edmonton Journal', link: oldLink(A_URL), ageDays: 1 },
  { title: 'Calgary anglers report trout stocking at Glenmore', source: 'Calgary Herald', link: oldLink(B_URL), ageDays: 0.5 },
  { title: 'Alberta trout derby returns to Sylvan Lake', source: 'Red Deer Advocate', link: oldLink('https://c.example.ca/x'), ageDays: 25 },
  { title: 'Ohio walleye anglers get new limits', source: 'Toledo Blade', link: oldLink('https://d.example.com/x'), ageDays: 1 },
  { title: '2027 Big Jack Classic postponed', source: 'The Stettler Independent', link: oldLink('https://e.example.ca/x'), ageDays: 2 },
  { title: 'Tourist catches massive sturgeon in B.C.’s Fraser River', source: 'CTV News', link: oldLink(S_URL), ageDays: 2 },
];
const articles = {
  [A_URL]: page('Alberta walleye anglers welcome new limits at Pigeon Lake', 'New walleye limits at Pigeon Lake take effect next month, and anglers are asked to check the rules before heading out.'),
  [B_URL]: page('Privacy settings and cookie consent', 'We use cookies to improve your experience on our site.'),
  [S_URL]: page('Tourist catches massive sturgeon in Fraser River', 'A visiting angler landed a huge white sturgeon on the Fraser River before releasing it back into the water.'),
};
const state = { sent: [{ t: norm('2027 Big Jack Classic postponed'), d: '2026-11-12' }] };

test('Альберта: фильтры, окно свежести, уже отправленное, свежая новость с описанием', async () => {
  const { pickNews } = await fresh();
  mockFetch({ rssByQuery: (q) => (isAB(q) ? ab : []), articles });
  const best = await pickNews(AB, state, new Set());
  // самая свежая (Glenmore) без описания: страница не про неё; берётся следующая с описанием
  assert.equal(best.title, 'Alberta walleye anglers welcome new limits at Pigeon Lake');
  assert.equal(best.url, A_URL);
  assert.match(best.summary, /New walleye limits/);
});

test('Канада видит заголовки, найденные запросами Альберты; выбранное в Альберте не повторяется', async () => {
  const { pickNews } = await fresh();
  mockFetch({ rssByQuery: (q) => (isAB(q) ? ab : []), articles });
  const used = new Set();
  const a = await pickNews(AB, state, used);
  used.add(norm(a.title));
  const c = await pickNews(CA, state, used);
  assert.equal(c.title, 'Tourist catches massive sturgeon in B.C.’s Fraser River');
  assert.equal(c.url, S_URL);
});

test('без описаний остаётся самая свежая новость, ссылка прямая', async () => {
  const { pickNews, newsBlock } = await fresh();
  mockFetch({ rssByQuery: (q) => (isAB(q) ? ab : []), articles: {} });   // все статьи 404
  const best = await pickNews(AB, state, new Set());
  assert.equal(best.title, 'Calgary anglers report trout stocking at Glenmore');
  assert.equal(best.summary, '');
  assert.match(newsBlock(AB, best), new RegExp(`href="${B_URL}"`));
});

test('ссылка нового формата раскрывается через Google', async () => {
  const { pickNews } = await fresh();
  const URL_N = 'https://n.example.ca/new-limits';
  const item = { title: 'Alberta walleye anglers welcome new limits at Pigeon Lake', source: 'Edmonton Journal', link: newLink('NEW1'), ageDays: 1 };
  mockFetch({ rssByQuery: (q) => (isAB(q) ? [item] : []), google: { NEW1: URL_N }, articles: { [URL_N]: articles[A_URL] } });
  const best = await pickNews(AB, { sent: [] }, new Set());
  assert.equal(best.url, URL_N);
  assert.match(best.summary, /New walleye limits/);
});

test('Google не отдал адрес: описания нет, в сообщении ссылка Google News', async () => {
  const { pickNews, newsBlock } = await fresh();
  const item = { title: 'Alberta walleye anglers welcome new limits at Pigeon Lake', source: 'Edmonton Journal', link: newLink('NOPE'), ageDays: 1 };
  mockFetch({ rssByQuery: (q) => (isAB(q) ? [item] : []) });
  const best = await pickNews(AB, { sent: [] }, new Set());
  assert.equal(best.summary, '');
  assert.equal(best.url, undefined);
  assert.match(newsBlock(AB, best), /href="https:\/\/news\.google\.com\/rss\/articles\/CBMiNOPE\?oc=5"/);
});

test('раскрытие ссылок: старый формат без сети, новый через Google', async () => {
  const { resolveGoogleLink } = await fresh();
  const calls = mockFetch({ google: { ABC: 'https://z.example.ca/a?b=1&c=2' } });
  assert.equal(await resolveGoogleLink(oldLink('https://www.cbc.ca/news/canada/calgary/trout-1.234')), 'https://www.cbc.ca/news/canada/calgary/trout-1.234');
  assert.equal(calls.length, 0);
  assert.equal(await resolveGoogleLink(newLink('ABC')), 'https://z.example.ca/a?b=1&c=2');
  await assert.rejects(resolveGoogleLink(newLink('MISSING')), /нет параметров ссылки/);
});

test('часть запросов не удалась: раздел работает; все не удались: ошибка раздела', async () => {
  let { pickNews } = await fresh();
  mockFetch({ rssByQuery: (q) => (isAB(q) ? ab : []), articles, failQueries: ['Alberta fishing', 'Alberta anglers'] });
  assert.ok(await pickNews(AB, state, new Set()));
  ({ pickNews } = await fresh());
  mockFetch({ failQueries: ['*'] });
  await assert.rejects(pickNews(AB, state, new Set()), /все запросы не удались/);
});

test('свежих подходящих новостей нет: раздел пропускается (null)', async () => {
  const { pickNews } = await fresh();
  mockFetch({ rssByQuery: () => [ab[2], ab[3]] });   // только старая и зарубежная
  assert.equal(await pickNews(AB, { sent: [] }, new Set()), null);
});
