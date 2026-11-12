import test from 'node:test';
import assert from 'node:assert/strict';
import { localParts, chooseTz, inSendWindow, TZ_MIN_VERSION } from '../digest.mjs';

test('пояс: свежая база поясов -> America/Edmonton, старая -> фиксированный UTC-6', () => {
  assert.equal(TZ_MIN_VERSION, '2026c');   // версия IANA, где Альберта перешла на постоянный UTC-6
  for (const v of ['2026c', '2026e', '2027a']) assert.equal(chooseTz(v), 'America/Edmonton', v);
  for (const v of ['2025c', '2026a', '2026b', '', undefined]) assert.equal(chooseTz(v), 'Etc/GMT+6', String(v));
});

test('на текущей базе поясов 13:31 UTC это 7:31 в Calgary, зимой и летом', () => {
  const tz = chooseTz(process.versions.tz);
  for (const iso of ['2026-11-13T13:31:00Z', '2027-01-15T13:31:00Z', '2027-03-15T13:31:00Z', '2027-07-15T13:31:00Z']) {
    assert.equal(localParts(new Date(iso), tz).minutes, 7 * 60 + 31, iso);
  }
});

test('America/Edmonton в базе поясов совпадает с UTC-6 круглый год (иначе база не та)', () => {
  if (chooseTz(process.versions.tz) !== 'America/Edmonton') return;   // старая база: бот и так берёт UTC-6
  for (const iso of ['2027-01-15T13:31:00Z', '2027-07-15T13:31:00Z']) {
    assert.deepEqual(localParts(new Date(iso), 'America/Edmonton'), localParts(new Date(iso), 'Etc/GMT+6'), iso);
  }
});

test('оба плановых запуска в окне отправки при UTC-6', () => {
  assert.ok(inSendWindow(localParts(new Date('2026-11-13T13:31:00Z'), 'Etc/GMT+6').minutes));   // 7:31
  assert.ok(inSendWindow(localParts(new Date('2026-11-13T14:31:00Z'), 'Etc/GMT+6').minutes));   // 8:31
});

test('если Альберта вернёт зимнее UTC-7: 13:31 UTC вне окна, 14:31 UTC отправит в 7:31', () => {
  assert.ok(!inSendWindow(localParts(new Date('2027-12-01T13:31:00Z'), 'Etc/GMT+7').minutes));   // 6:31
  const p = localParts(new Date('2027-12-01T14:31:00Z'), 'Etc/GMT+7');
  assert.equal(p.minutes, 7 * 60 + 31);
  assert.ok(inSendWindow(p.minutes));
});

test('окно отправки 7:20-12:00', () => {
  assert.ok(!inSendWindow(7 * 60 + 19));
  assert.ok(inSendWindow(7 * 60 + 20));
  assert.ok(inSendWindow(11 * 60 + 59));
  assert.ok(!inSendWindow(12 * 60));
});

test('дата считается по местному времени', () => {
  const tz = chooseTz(process.versions.tz);
  assert.equal(localParts(new Date('2026-11-12T05:59:00Z'), tz).date, '2026-11-11');   // 23:59 11 ноября в Calgary
  assert.equal(localParts(new Date('2026-11-12T06:00:00Z'), tz).date, '2026-11-12');   // полночь
});
