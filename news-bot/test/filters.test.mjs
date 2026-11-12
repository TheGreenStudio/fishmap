import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, passesFilters, sameStory, alreadySent, cleanSummary, extractMeta, pageMatchesTitle, pickWithSummary, norm } from '../filters.mjs';

const AB = SECTIONS.find((s) => s.title === 'Альберта');
const CA = SECTIONS.find((s) => s.title === 'Канада');
const it = (title, source = '') => ({ title, source });

test('Альберта: однозначные места проходят', () => {
  assert.ok(passesFilters(AB, it('Alberta anglers face new walleye limits at Lac La Biche')));
  assert.ok(passesFilters(AB, it('Calgary anglers urged to check ice on Glenmore Reservoir')));
  assert.ok(passesFilters(AB, it('Brown trout stocked in the Bow River', 'Calgary Herald')));
});

test('Альберта: чужие Airdrie/Victoria/Vancouver не проходят', () => {
  assert.ok(!passesFilters(AB, it('Airdrie angler lands record pike', 'Daily Record')));
  assert.ok(!passesFilters(AB, it('Victoria anglers fishing licence changes', 'Herald Sun')));
  assert.ok(!passesFilters(AB, it('Vancouver, Wash. anglers get steelhead season', 'The Columbian')));
});

test('Альберта: двусмысленный город + канадский источник проходит', () => {
  assert.ok(passesFilters(AB, it('Airdrie angler lands record pike', 'Airdrie City View.ca')));
  assert.ok(passesFilters(AB, it('Jasper fishing closure extended for bull trout', 'CBC.ca')));
});

test('Канада: канадские слова и источники', () => {
  assert.ok(passesFilters(CA, it('DFO reviews recreational fishing rules for trout')));
  // канадский источник без места в заголовке больше не считается новостью про Канаду
  assert.ok(!passesFilters(CA, it('Ice fishing derby draws anglers', 'CTV News')));
  assert.ok(!passesFilters(CA, it('Ottawa County anglers prep for walleye opener', 'Holland Sentinel')));
  assert.ok(!passesFilters(CA, it('Victoria anglers enjoy fishing season', 'Geelong Advertiser')));
});

test('Слова deadline и shares не блокируют', () => {
  assert.ok(passesFilters(AB, it('Alberta fishing licence deadline approaches for anglers')));
  assert.ok(passesFilters(AB, it('Anglers shares tips on Alberta walleye fishing')));
});

test('Мёртвое/акции блокируются', () => {
  assert.ok(!passesFilters(AB, it('Dead fish found at Alberta lake, anglers concerned')));
});

test('sameStory: одна история', () => {
  assert.ok(sameStory('DFO restricts trout fishing on Alberta rivers', 'Alberta trout fishing restricted by DFO on rivers'));
});

test('sameStory: разные истории не склеиваются', () => {
  assert.ok(!sameStory('Prussian carp spreads in Alberta waters', 'Whirling disease found in Alberta fishing waters'));
  assert.ok(!sameStory('Buffalo Lake ice fishing derby returns', 'Lac Ste. Anne ice fishing derby returns'));
  assert.ok(!sameStory('Alberta fishing licence fees rise', 'Alberta fishing licence sales hit record'));
});

test('alreadySent использует точное и нечёткое совпадение', () => {
  const t = 'Alberta trout fishing restricted by DFO on rivers';
  assert.ok(alreadySent(t, [norm(t)]));
  assert.ok(alreadySent('DFO restricts trout fishing on Alberta rivers', [norm(t)]));
  assert.ok(!alreadySent('Totally different walleye derby results', [norm(t)]));
});

const T = 'Alberta walleye anglers see new limits at Pigeon Lake';
test('cleanSummary: нормальное описание проходит', () => {
  const s = cleanSummary('New walleye limits at Pigeon Lake take effect next month, and anglers are being asked to check the regulations before heading out.', T);
  assert.ok(s.length > 50);
});
test('cleanSummary: шаблон издания отбрасывается', () => {
  assert.equal(cleanSummary('Read the latest local news, weather, sports and more from your source for Alberta news every day of the week.', T), '');
});
test('cleanSummary: не про эту новость отбрасывается', () => {
  assert.equal(cleanSummary('The city council voted on Tuesday to approve the new transit budget for the coming year after a long debate.', T), '');
});
test('cleanSummary: обрезанное издателем режется до целых предложений', () => {
  const s = cleanSummary('Anglers on Pigeon Lake face new walleye limits starting next month. The province says the change protects stocks. Officials also plan to review the rule for other…', T);
  assert.ok(s.endsWith('stocks.'));
});

test('extractMeta и pageMatchesTitle', () => {
  const html = '<head><title>x</title><meta property="og:title" content="New walleye limits at Pigeon Lake &amp; more"><meta property="og:description" content="Some description"></head>';
  const m = extractMeta(html);
  assert.equal(m.description, 'Some description');
  assert.ok(pageMatchesTitle(m.title, T));
  assert.ok(!pageMatchesTitle('Privacy settings and cookie consent', T));
  assert.ok(pageMatchesTitle('', T));
});

test('pickWithSummary: берёт свежий с описанием, но не слишком старый', () => {
  const d = (n) => new Date(Date.UTC(2026, 10, 11) - n * 864e5);
  const a = { date: d(0), summary: '' }, b = { date: d(2), summary: 'x' }, c = { date: d(9), summary: 'y' };
  assert.equal(pickWithSummary([a, b, c], 5), b);
  assert.equal(pickWithSummary([a, c], 5), a);
  assert.equal(pickWithSummary([], 5), null);
});

// Живая выдача Google News 12.11.2026
test('Канада: перепечатка зарубежной новости канадским сайтом не проходит', () => {
  assert.ok(!passesFilters(CA, it('Generations of anglers have made the pilgrimage to Montauk to catch striped bass', 'thecanadianpressnews.ca')));
  assert.ok(!passesFilters(AB, it('Generations of anglers have made the pilgrimage to Montauk to catch striped bass', 'Calgary Herald')));
});

test('Канада: морской промысел и развлекательные сайты США не проходят', () => {
  assert.ok(!passesFilters(CA, it('2 fined $7.4K for illegal prawn fishing in closed sponge reef area in B.C.', 'CHEK News')));
  assert.ok(!passesFilters(CA, it('$7,400 in fines for 2 anglers caught fishing in B.C. glass sponge reef, DFO says', 'CTV News')));
  assert.ok(!passesFilters(CA, it('Canadian Anglers Absolutely Shocked To Reel In A Full Buck Skeleton Through The Ice', 'Whiskey Riff')));
});

test('Канада: настоящие канадские новости проходят', () => {
  assert.ok(passesFilters(CA, it('Ontario Angler Catches 57-Inch Muskie on His First Try', 'OutdoorHub')));
  assert.ok(passesFilters(CA, it('Tourist catches massive sturgeon in B.C.’s Fraser River', 'CTV News')));
  assert.ok(passesFilters(CA, it('Toronto anglers report big walleye season', 'CBC')));
  assert.ok(!passesFilters(CA, it('Toronto anglers report big walleye season', 'Some US Paper')));
  assert.ok(passesFilters(CA, it('Calgary anglers flock to Glenmore for ice fishing', 'CTV News')));
});

test('Альберта: округа County и местные издания проходят', () => {
  assert.ok(passesFilters(AB, it('Ponoka County ice fishing derby returns to Gull Lake', 'Ponoka News')));
  assert.ok(passesFilters(AB, it('Strathcona County stocks trout in local ponds', 'Sherwood Park News')));
  assert.ok(passesFilters(AB, it('Brooks walleye derby draws hundreds', 'Brooks Bulletin')));
  assert.ok(passesFilters(AB, it('Banff closes lakes to fishing to protect bull trout', 'Rocky Mountain Outlook')));
  assert.ok(passesFilters(AB, it('An Update on Prussian Carp in Evanston', 'The City of Calgary')));
  assert.ok(passesFilters(AB, it('2027 Big Jack Classic postponed', 'The Stettler Independent')));
});

test('County без канадских признаков по-прежнему считается США', () => {
  assert.ok(!passesFilters(AB, it('Lake County walleye anglers get new limits', 'News-Herald')));
  assert.ok(!passesFilters(CA, it('Lake County walleye anglers get new limits', 'News-Herald')));
});

test('sameStory: пересказ CTV той же истории про штраф распознаётся', () => {
  assert.ok(sameStory(norm('2 fined $7.4K for illegal prawn fishing in closed sponge reef area in B.C.'),
    '$7,400 in fines for 2 anglers caught fishing in B.C. glass sponge reef, DFO says'));
});
