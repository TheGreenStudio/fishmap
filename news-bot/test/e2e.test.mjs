// Прогон всей сводки как в GitHub Actions: заготовки данных, подменённые время и Telegram, без сети.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFixtures, FISH, OTHER } from './helpers/fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIGEST = path.join(here, '..', 'digest.mjs');
const PRELOAD = path.join(here, 'helpers', 'preload.mjs');
const NOW = '2026-11-20T13:31:00Z';   // пятница, 7:31 по Calgary

function setup(opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-e2e-'));
  writeFixtures(path.join(dir, 'fx'), NOW, opts);
  return { dir, fx: path.join(dir, 'fx'), state: path.join(dir, 'state.json'), out: path.join(dir, 'out.txt'), tg: path.join(dir, 'tg.txt') };
}
function run(t, env) {
  const r = spawnSync(process.execPath, ['--import', PRELOAD, DIGEST], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, FIXTURE_DIR: t.fx, STATE_FILE: t.state, GITHUB_OUTPUT: t.out, TG_LOG: t.tg,
      TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: '1', FAKE_NOW: NOW, ...env },
  });
  const tg = fs.existsSync(t.tg) ? fs.readFileSync(t.tg, 'utf8').split('\n=====\n').filter(Boolean) : [];
  return { code: r.status, log: r.stdout + r.stderr, tg };
}

test('пробный запуск: полная сводка, только точки рыбалки, без предупреждений', () => {
  const t = setup();
  const r = run(t, { DRY_RUN: '1', FORCE: '1' });
  assert.equal(r.code, 0, r.log);
  assert.equal(r.tg.length, 0);
  assert.match(r.log, /<b>Дикая Рыбалка\. Пятница, 20 ноября<\/b>/);
  assert.match(r.log, /<b>Погода\.<\/b> В Calgary сегодня от \+2 до \+10/);
  assert.match(r.log, /<b>Топ 3 точки<\/b> \(лето, открытая вода\)/);
  for (const name of OTHER) assert.ok(!r.log.includes(name), `${name} не должна попасть в клёв`);
  assert.ok(FISH.filter((f) => r.log.includes(f)).length >= 3);
  assert.match(r.log, /<b>Альберта\.<\/b> «<a href="[^"]+">Alberta walleye anglers welcome new limits at Pigeon Lake<\/a>» \(Edmonton Journal, 19 ноября\)/);
  assert.match(r.log, /<b>Канада\.<\/b> «<a href="[^"]+">Ontario angler lands record muskie on Lake of the Woods<\/a>»/);
  assert.doesNotMatch(r.log, /::warning::/);
});

test('плановая отправка: одно сообщение, дата сохранена; повтор через час ничего не шлёт', () => {
  const t = setup();
  const first = run(t, { SAVE_STATE: '1' });
  assert.equal(first.code, 0, first.log);
  assert.equal(first.tg.length, 1);
  assert.match(first.tg[0], /^<b>Дикая Рыбалка\. Пятница, 20 ноября<\/b>/);
  assert.match(fs.readFileSync(t.out, 'utf8'), /saved=true/);
  const st = JSON.parse(fs.readFileSync(t.state, 'utf8'));
  assert.equal(st.lastSentDate, '2026-11-20');
  assert.equal(st.sent.length, 2);

  const retry = run(t, { SAVE_STATE: '1', FAKE_NOW: '2026-11-20T14:31:00Z' });
  assert.equal(retry.code, 0);
  assert.match(retry.log, /Сегодня уже отправляли/);
  assert.equal(retry.tg.length, 1);

  // на следующий день те же новости не повторяются, разделы новостей пропускаются
  const next = run(t, { SAVE_STATE: '1', FAKE_NOW: '2026-11-21T13:31:00Z' });
  assert.equal(next.code, 0, next.log);
  assert.equal(next.tg.length, 2);
  assert.doesNotMatch(next.tg[1], /Alberta walleye|Ontario angler/);
});

test('7:00 по Calgary: не время отправки', () => {
  const t = setup();
  const r = run(t, { SAVE_STATE: '1', FAKE_NOW: '2026-11-20T13:00:00Z' });
  assert.equal(r.code, 0);
  assert.match(r.log, /Не время отправки/);
  assert.equal(r.tg.length, 0);
});

test('погода не получена: сводка уходит без неё, дата сохраняется, запуск помечен ошибкой', () => {
  const t = setup({ brokenWeather: true });
  const r = run(t, { SAVE_STATE: '1' });
  assert.equal(r.code, 1);
  assert.equal(r.tg.length, 1);
  assert.doesNotMatch(r.tg[0], /Погода/);
  assert.match(r.tg[0], /Топ 3 точки/);
  assert.match(r.log, /::warning::блок «Погода» не получен/);
  assert.match(fs.readFileSync(t.out, 'utf8'), /saved=true/);
});
