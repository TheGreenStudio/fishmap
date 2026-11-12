import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherText, newsBlock } from '../digest.mjs';

// 5 прошлых дней, сегодня (2026-11-12) и 6 дней вперёд, как отдаёт Open-Meteo
const days = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, 10, 7 + i)).toISOString().slice(0, 10));
const TODAY = '2026-11-12';
function wx({ min = 2, max = 10, mean = 5, snow = 0, precip = 0, gust = 20, mins } = {}) {
  return {
    time: days,
    temperature_2m_min: mins || days.map(() => min),
    temperature_2m_max: days.map(() => max),
    temperature_2m_mean: days.map(() => mean),
    snowfall_sum: days.map(() => snow),
    precipitation_sum: days.map(() => precip),
    wind_gusts_10m_max: days.map(() => gust),
  };
}
const warm = { autoIce: false, avg: 5, cat: 'none' };

test('погода: тепло, без осадков, без заморозков', () => {
  const s = weatherText(wx(), TODAY, warm);
  assert.match(s, /^<b>Погода\.<\/b> В Calgary сегодня от \+2 до \+10, без осадков\./);
  assert.match(s, /Заморозков на неделю не видно, льда по погоде не ожидается\./);
});

test('погода: снег, дождь и ветер', () => {
  assert.match(weatherText(wx({ snow: 3.4, precip: 4 }), TODAY, warm), /снег около 3 см/);
  assert.match(weatherText(wx({ precip: 6.6 }), TODAY, warm), /осадки около 7 мм/);
  assert.match(weatherText(wx({ gust: 40 }), TODAY, warm), /порывы ветра до 40 км\/ч/);
  assert.match(weatherText(wx({ gust: 55 }), TODAY, warm), /порывы до 55 км\/ч, на воде будет неуютно/);
});

test('погода: слабые заморозки, около нуля, похолодание', () => {
  assert.match(weatherText(wx({ min: -3 }), TODAY, warm), /Ночные заморозки слабые \(до −3\)/);
  assert.match(weatherText(wx({ min: 0.3 }), TODAY, warm), /Ночью около нуля/);
  const mins = days.map((d) => (d >= '2026-11-15' ? -9 : 1));
  assert.match(weatherText(wx({ mins }), TODAY, warm), /Похолодание: с 15 ноября ночью до −9\. Льда пока ждать не стоит\./);
});

test('погода: лёд по режиму приложения', () => {
  assert.match(weatherText(wx({ min: -15, max: -5 }), TODAY, { autoIce: true, avg: -10, cat: 'ok' }), /Установилась зимняя погода: лёд мог встать/);
  assert.match(weatherText(wx({ min: -15, max: -5 }), TODAY, { autoIce: true, avg: -8, cat: 'none' }), /лёд, скорее всего, ещё не встал: на лёд не выходить/);
  assert.match(weatherText(wx(), TODAY, { autoIce: true, avg: 1, cat: 'check' }), /После морозов оттепель/);
});

test('погода: без режима приложения считаем по средней температуре', () => {
  assert.match(weatherText(wx({ mean: -8, min: -12 }), TODAY, null), /Установилась зимняя погода/);
  assert.doesNotMatch(weatherText(wx(), TODAY, null), /лёд мог/);
});

test('погода: нет сегодняшней даты -> ошибка', () => {
  assert.throws(() => weatherText(wx(), '2026-12-31', warm), /нет сегодняшней даты/);
});

const SEC = { title: 'Канада' };
const item = (extra = {}) => ({ title: 'Ontario angler lands muskie', source: 'OutdoorHub', link: 'https://news.google.com/rss/articles/X?oc=5', date: new Date('2026-11-12T15:00:00Z'), ...extra });

test('новость: прямая ссылка на статью, если удалось её получить', () => {
  const s = newsBlock(SEC, item({ url: 'https://example.ca/a?b=1&c="2"' }));
  assert.match(s, /href="https:\/\/example\.ca\/a\?b=1&amp;c=&quot;2&quot;"/);
});

test('новость: без прямой ссылки остаётся ссылка Google News, описание с новой строки', () => {
  const s = newsBlock(SEC, item({ summary: 'A <big> fish.' }));
  assert.match(s, /href="https:\/\/news\.google\.com\/rss\/articles\/X\?oc=5"/);
  assert.match(s, /\(OutdoorHub, 12 ноября\)\nA &lt;big&gt; fish\.$/);
});
