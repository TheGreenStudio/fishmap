import test from 'node:test';
import assert from 'node:assert/strict';
import { localParts } from '../digest.mjs';

// Местное время не зависит от версии базы часовых поясов: Альберта = UTC-6 круглый год.
test('13:30 UTC всегда 7:30 в Calgary, зимой и летом', () => {
  for (const iso of ['2026-11-12T13:30:00Z', '2027-01-15T13:30:00Z', '2027-03-09T13:30:00Z', '2027-07-15T13:30:00Z']) {
    const p = localParts(new Date(iso));
    assert.equal(p.minutes, 7 * 60 + 30, iso);
  }
});

test('14:30 UTC это 8:30, оба плановых запуска попадают в окно отправки 7:20-12:00', () => {
  const p = localParts(new Date('2026-11-12T14:30:00Z'));
  assert.equal(p.minutes, 8 * 60 + 30);
});

test('дата считается по местному времени', () => {
  assert.equal(localParts(new Date('2026-11-12T05:59:00Z')).date, '2026-11-11');   // 23:59 11 ноября в Calgary
  assert.equal(localParts(new Date('2026-11-12T06:00:00Z')).date, '2026-11-12');   // полночь
});
