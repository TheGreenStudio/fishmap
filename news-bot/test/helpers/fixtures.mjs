// Заготовки данных для прогона всей сводки (FIXTURE_DIR): даты строятся от заданного «сейчас».
import fs from 'node:fs';
import path from 'node:path';

const TZ = 'Etc/GMT+6';   // Calgary
const DAY = 864e5;
const ymd = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(ms);
const hourStr = (ms) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(ms).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
};
const item = (title, source, ageDays, now) => `<item><title>${title} - ${source}</title><link>https://news.google.com/rss/articles/T${encodeURIComponent(title).slice(0, 20)}</link>`
  + `<pubDate>${new Date(now - ageDays * DAY).toUTCString()}</pubDate><source url="https://x.example">${source}</source></item>`;

export const FISH = ['Озеро Тест-1', 'Река Тест-2', 'Пруд Тест-3', 'Залив Тест-4'];
export const OTHER = ['Кэмпинг-тест', 'Интересное-тест'];

export function writeFixtures(dir, nowIso, { brokenWeather = false } = {}) {
  const now = Date.parse(nowIso);
  fs.mkdirSync(dir, { recursive: true });
  const w = (f, s) => fs.writeFileSync(path.join(dir, f), typeof s === 'string' ? s : JSON.stringify(s));
  w('alberta.xml', `<?xml version="1.0"?><rss><channel>${item('Alberta walleye anglers welcome new limits at Pigeon Lake', 'Edmonton Journal', 1, now)}</channel></rss>`);
  w('canada.xml', `<?xml version="1.0"?><rss><channel>${item('Ontario angler lands record muskie on Lake of the Woods', 'CBC', 2, now)}</channel></rss>`);
  // Погода Calgary: 5 прошлых дней, сегодня и 6 вперёд
  const days = Array.from({ length: 12 }, (_, i) => ymd(now + (i - 5) * DAY));
  w('weather.json', brokenWeather ? 'not json' : { daily: {
    time: days, temperature_2m_max: days.map(() => 10), temperature_2m_min: days.map(() => 2), temperature_2m_mean: days.map(() => 6),
    snowfall_sum: days.map(() => 0), precipitation_sum: days.map(() => 0), wind_gusts_10m_max: days.map(() => 20),
  } });
  // Прогноз для точек (как у приложения) и история температур
  const d4 = [0, 1, 2, 3].map((i) => ymd(now + i * DAY));
  const htime = [], hp = [];
  for (let k = -24; k < 96; k++) { htime.push(hourStr(now + k * 3600e3)); hp.push(1016); }
  w('spotwx.json', { daily: { time: d4, weather_code: [1, 1, 1, 1], temperature_2m_max: [14, 14, 14, 14], temperature_2m_min: [4, 4, 4, 4],
    precipitation_sum: [0, 0, 0, 0], wind_speed_10m_max: [10, 10, 10, 10], wind_gusts_10m_max: [20, 20, 20, 20], sunrise: [], sunset: [] },
  hourly: { time: htime, pressure_msl: hp } });
  const ht = Array.from({ length: 31 }, (_, i) => ymd(now + (i - 30) * DAY));
  w('hist.json', { daily: { time: ht, temperature_2m_max: ht.map(() => 12), temperature_2m_min: ht.map(() => 3) } });
  w('spots_db.json', [
    ...FISH.map((name, i) => ({ id: `f${i}`, name, lat: 51 + i / 10, lon: -114, season: i === 3 ? undefined : 'summer', kind: i === 1 ? undefined : 'fish' })),
    { id: 'c', name: OTHER[0], lat: 51.5, lon: -114.5, season: 'both', kind: 'camp', kids: true },
    { id: 'p', name: OTHER[1], lat: 51.6, lon: -114.6, season: 'summer', kind: 'poi' },
  ]);
}
