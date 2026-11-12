import test from 'node:test';
import assert from 'node:assert/strict';
import { iceSentence, formatSpots } from '../digest.mjs';
import { fishCtx } from '../fishscore.mjs';

const TAIL = 'Заморозков на неделю не видно, льда по погоде не ожидается.';

test('iceSentence: холода -> зимняя фраза, оттепель после морозов -> осторожная, иначе хвост', () => {
  assert.match(iceSentence({ frozen: true, winterCold: true, cat: 'check' }, TAIL), /Установилась зимняя погода/);
  assert.match(iceSentence({ frozen: true, winterCold: true }, TAIL), /Установилась зимняя погода/);   // нет истории морозов
  assert.match(iceSentence({ frozen: true, winterCold: false, cat: 'ok' }, TAIL), /После морозов оттепель/);
  assert.equal(iceSentence({ frozen: false, winterCold: false, cat: 'none' }, TAIL), TAIL);
});

test('iceSentence: мороз недавно, льда по оценке ещё нет или он тонкий -> на лёд не выходить', () => {
  const none = iceSentence({ frozen: true, winterCold: true, cat: 'none' }, TAIL);
  const thin = iceSentence({ frozen: true, winterCold: true, cat: 'thin' }, TAIL);
  for (const s of [none, thin]) {
    assert.match(s, /на лёд не выходить/);
    assert.doesNotMatch(s, /лёд мог встать/);
  }
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

test('первая неделя морозов: погода и точки говорят одно и то же', () => {
  const day = (n) => new Date(Date.UTC(2026, 10, 20) - n * 864e5).toISOString().slice(0, 10);
  const time = [], tmax = [], tmin = [];
  for (let n = 30; n >= 1; n--) { time.push(day(n)); const cold = n <= 3; tmax.push(cold ? -6 : 4); tmin.push(cold ? -14 : -2); }
  const d = { daily: { time: [day(0), day(-1)], temperature_2m_max: [-8, -9], temperature_2m_min: [-16, -18] } };
  const ctx = fishCtx(d, { time, tmax, tmin });
  assert.ok(ctx.autoIce && ctx.avg <= -5 && ctx.cat === 'none', 'сценарий: мороз есть, льда ещё нет');
  const s = iceSentence({ frozen: ctx.autoIce, winterCold: ctx.avg <= -5, cat: ctx.cat }, TAIL);
  assert.doesNotMatch(s, /лёд мог встать/);
  assert.match(s, /не выходить/);
});

const spot = (name, score, warn = '') => ({ name, score, label: 'плохо', warn });

test('formatSpots: одинаковое предупреждение у всех точек пишется один раз', () => {
  const w = 'Льда, скорее всего, ещё нет: на лёд не выходить';
  const out = formatSpots([spot('A', 20, w), spot('B', 20, w), spot('C', 18, w)], { winter: true });
  assert.equal(out.split(w).length - 1, 1);
  assert.match(out, /Топ 3 точки/);
});

test('formatSpots: разные предупреждения видны у каждой точки', () => {
  const out = formatSpots([spot('A', 40), spot('B', 25, 'Лёд, скорее всего, тонкий: на лёд не выходить'), spot('C', 20, 'Опасный мороз: риск обморожения')], { winter: true });
  const lines = out.split('\n');
  assert.doesNotMatch(lines[1], /не выходить|мороз/);
  assert.match(lines[2], /^2\. B: 25 из 100, плохо\. Лёд, скорее всего, тонкий: на лёд не выходить\.$/);
  assert.match(lines[3], /^3\. C: .*Опасный мороз: риск обморожения\.$/);
});

test('formatSpots: без предупреждений и с маскировкой названий', () => {
  const out = formatSpots([spot('Секретное озеро', 70)], { winter: false, mask: true });
  assert.doesNotMatch(out, /Секретное/);
  assert.match(out, /Лучшая точка/);
  assert.match(out, /1\. точка 1: 70 из 100/);
});

test('formatSpots: HTML в названии экранируется', () => {
  assert.match(formatSpots([spot('A<b>', 50)], { winter: false }), /A&lt;b&gt;/);
});
