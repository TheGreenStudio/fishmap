// Сверка формулы клёва бота (fishscore.mjs) с приложением (app.js).
// Приложение правят отдельно, поэтому тест падает, если в app.js поменялись таблицы, функции,
// пороги или предупреждения, а в боте нет. Тогда перенести изменения в news-bot/fishscore.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP = fs.readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
const BOT = fs.readFileSync(new URL('../fishscore.mjs', import.meta.url), 'utf8');
const DIGEST = fs.readFileSync(new URL('../digest.mjs', import.meta.url), 'utf8');

// без комментариев, пробелов и точек с запятой
const strip = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '').replace(/;/g, '');

// тело функции `function name(...) { ... }` по парным скобкам
function fnBody(src, name) {
  const start = src.search(new RegExp(`function ${name}\\(`));
  assert.ok(start >= 0, `функция ${name} не найдена`);
  let i = src.indexOf('{', start), depth = 0;
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) break;
  }
  return src.slice(from, i + 1);
}

const TABLES = ['F_TEMP', 'F_PDELTA', 'F_PABS', 'F_WIND', 'F_CLOUD', 'F_RAIN', 'F_WIND_ICE', 'F_CHILL', 'F_CLOUD_ICE', 'F_RAIN_ICE'];
const table = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = (\\[[^;]*\\]);`));
  assert.ok(m, `таблица ${name} не найдена`);
  return strip(m[1]);
};

test('таблицы оценки совпадают с app.js', () => {
  for (const t of TABLES) assert.equal(table(BOT, t), table(APP, t), t);
});

test('вспомогательные функции совпадают с app.js', () => {
  for (const f of ['interp', 'windChill', 'codePrecip', 'codeCloud', 'histBefore', 'iceCategory']) {
    assert.equal(strip(fnBody(BOT, f)), strip(fnBody(APP, f)), f);
  }
});

test('итоговая шкала и уровни совпадают с app.js', () => {
  const shape = (src) => src.match(/const SHAPE = ([\d.]+)/)[1];
  assert.equal(shape(BOT), shape(APP));
  const levels = (src) => [...src.match(/levelOf[^\n]*/)[0].matchAll(/s < (\d+)/g)].map((m) => m[1]).join(',');
  assert.equal(levels(BOT), levels(APP));
  // общий счёт: округление каждой части, кривая, потолок
  for (const piece of ['100*Math.pow(clamp(score,0,100)/100,SHAPE)', 'clamp(rnd(Math.min(score,cap)),0,100)', 'if(c.cap<cap){cap=c.cap']) {
    assert.ok(strip(fnBody(APP, 'finishScore')).includes(piece), `app.js finishScore: ${piece}`);
    assert.ok(strip(fnBody(BOT, 'finishScore')).includes(piece), `fishscore.mjs finishScore: ${piece}`);
  }
});

// условия, потолки и тексты предупреждений
const caps = (src, fn) => [...fnBody(src, fn).matchAll(/(?:else )?if \([^)]*\) caps\.push\(\{[^}]*\}\)/g)].map((m) => m[0].replace(/\s+/g, ' '));

test('предупреждения и потолки оценки совпадают с app.js', () => {
  for (const fn of ['fishScoreOpen', 'fishScoreIce']) {
    const app = caps(APP, fn);
    assert.ok(app.length >= 4, `${fn}: в app.js не найдены предупреждения`);
    assert.deepEqual(caps(BOT, fn), app, fn);
  }
});

test('составные части оценки совпадают с app.js', () => {
  const both = (fn, pieces) => {
    const a = strip(fnBody(APP, fn)), b = strip(fnBody(BOT, fn));
    for (const p of pieces) {
      assert.ok(a.includes(p), `app.js ${fn}: нет «${p}»`);
      assert.ok(b.includes(p), `fishscore.mjs ${fn}: нет «${p}»`);
    }
  };
  both('fishScoreOpen', ['interp(F_TEMP,t)', 'i.wind+0.5*Math.max(0,i.gust-i.wind)', 'interp(F_WIND,eff)', 'interp(F_CLOUD,i.cloud)', 'interp(F_RAIN,i.precip)']);
  both('fishScoreIce', ['windChill(i.temp,i.wind)', 'interp(F_CHILL,chill)', 'if(i.thaw)cp=Math.min(cp,6)', '{none:0,thin:2,check:9,ok:15,unknown:7}', 'i.thaw?Math.min(ip,3):ip',
    'interp(F_WIND_ICE,eff)', 'interp(F_CLOUD_ICE,i.cloud)', 'interp(F_RAIN_ICE,i.precip)']);
  // время суток в режиме дня: максимум (5 для открытой воды, 10 для льда)
  assert.ok(strip(fnBody(APP, 'fishScoreOpen')).includes('timeOfDay(i,5,'));
  assert.ok(strip(fnBody(APP, 'fishScoreIce')).includes('timeOfDay(i,10,'));
  assert.ok(strip(fnBody(APP, 'timeOfDay')).includes('if(i.dayMode)return{pts:peakPts'));
  assert.ok(/interp\(F_RAIN, i\.precip\), 5,/.test(BOT) && /interp\(F_RAIN_ICE, i\.precip\), 10,/.test(BOT), 'fishscore.mjs: время суток 5 и 10');
  // давление
  for (const src of [APP, BOT]) assert.ok(strip(src).includes('dp==null?12:interp(F_PDELTA,dp)') || strip(src).includes('i.dp==null?12:interp(F_PDELTA,i.dp)'));
});

test('режим «Авто» и оценка дня совпадают с app.js', () => {
  const ctxApp = strip(fnBody(APP, 'fishCtx')), ctxBot = strip(fnBody(BOT, 'fishCtx'));
  for (const p of ['past.slice(-5)', 'constautoIce=avg<=-5||cat===\'check\'||cat===\'ok\'', 'ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:10', 'past[past.length-1].mx:-99']) {
    assert.ok(ctxApp.includes(p), `app.js fishCtx: ${p}`);
    assert.ok(ctxBot.includes(p), `fishscore.mjs fishCtx: ${p}`);
  }
  assert.ok(ctxApp.includes('k<i0+2'), 'app.js: прогноз на 2 дня'); assert.ok(ctxBot.includes('k<2'), 'бот: прогноз на 2 дня');
  const dayApp = strip(fnBody(APP, 'fishDay')), dayBot = strip(fnBody(BOT, 'fishDay'));
  for (const p of ['dy.temperature_2m_min[i]+0.4*(dy.temperature_2m_max[i]-dy.temperature_2m_min[i])', '(dy.wind_speed_10m_max[i]||0)*0.75',
    '(dy.wind_gusts_10m_max[i]||0)*0.85', 'Math.max(dy.precipitation_sum[i]||0,codePrecip(dy.weather_code[i])*0.5)', 'codeCloud(dy.weather_code[i])',
    'pb!=null?pb:1013', 'pa!=null&&pb!=null?pb-pa:null', 'ctx.ice&&thawOf(d,ctx,i)', 'at(\'09\')', 'at(\'15\')']) {
    assert.ok(dayApp.includes(p), `app.js fishDay: ${p}`);
    assert.ok(dayBot.includes(p), `fishscore.mjs fishDay: ${p}`);
  }
  const thaw = (src) => strip(src.match(/const thawOf = [\s\S]*?;\n/)[0]);
  assert.equal(thaw(BOT), thaw(APP));
});

test('запросы погоды и истории совпадают с app.js', () => {
  const histUrl = (src) => src.match(/forecast\?latitude=' \+ lat\.toFixed\((\d)\)[^\n]*\n?[^\n]*past_days=30[^']*'/);
  const a = histUrl(APP), b = histUrl(DIGEST);
  assert.ok(a && b, 'запрос истории не найден');
  assert.equal(b[1], a[1], 'точность координат истории');
  const daily = (src) => (src.match(/daily=weather_code,[a-z_0-9,]+/) || [])[0];
  assert.equal(daily(DIGEST), daily(APP), 'набор дневных полей прогноза');
  for (const p of ['hourly=pressure_msl&past_hours=24', 'forecast_days=4&timezone=auto&wind_speed_unit=kmh']) {
    assert.ok(APP.includes(p) && DIGEST.includes(p), p);
  }
});
