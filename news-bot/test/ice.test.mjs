import test from 'node:test';
import assert from 'node:assert/strict';
import { iceSentence } from '../digest.mjs';
import { fishCtx } from '../fishscore.mjs';

const TAIL = 'Заморозков на неделю не видно, льда по погоде не ожидается.';

test('iceSentence: холода -> зимняя фраза, оттепель после морозов -> осторожная, иначе хвост', () => {
  assert.match(iceSentence({ frozen: true, winterCold: true }, TAIL), /Установилась зимняя погода/);
  assert.match(iceSentence({ frozen: true, winterCold: false }, TAIL), /После морозов оттепель/);
  assert.equal(iceSentence({ frozen: false, winterCold: false }, TAIL), TAIL);
});

test('после долгих морозов и оттепели fishCtx даёт autoIce при тёплой средней, текст не говорит «льда нет»', () => {
  const day = (n) => new Date(Date.UTC(2026, 10, 11) - n * 864e5).toISOString().slice(0, 10);
  const time = [], tmax = [], tmin = [];
  for (let n = 30; n >= 1; n--) {
    time.push(day(n));
    const cold = n > 5;
    tmax.push(cold ? -12 : 4); tmin.push(cold ? -22 : 1);
  }
  const hist = { time, tmax, tmin };
  const d = { daily: { time: [day(0), day(-1)], temperature_2m_max: [5, 5], temperature_2m_min: [1, 1] } };
  const ctx = fishCtx(d, hist);
  assert.ok(ctx.avg > -5, 'средняя тёплая');
  assert.ok(ctx.autoIce, 'приложение считает, что лёд мог остаться');
  const s = iceSentence({ frozen: ctx.autoIce, winterCold: ctx.avg <= -5 }, TAIL);
  assert.doesNotMatch(s, /льда нет/);
  assert.match(s, /толщину проверяйте/);
});
