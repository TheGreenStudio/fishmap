import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState } from '../digest.mjs';

test('пустое и битое состояние даёт чистое', () => {
  for (const raw of [null, undefined, 'x', 5, []]) {
    assert.deepEqual(normalizeState(raw, '2026-11-12'), { lastSentDate: '', sent: [] });
  }
});

test('старый формат (строки) переносится с сегодняшней датой', () => {
  const st = normalizeState({ lastSentDate: '2026-11-11', sent: ['big jack classic postponed'] }, '2026-11-12');
  assert.equal(st.lastSentDate, '2026-11-11');
  assert.deepEqual(st.sent, [{ t: 'big jack classic postponed', d: '2026-11-12' }]);
});

test('записи старше 30 дней удаляются, свежие остаются', () => {
  const st = normalizeState({ sent: [{ t: 'a', d: '2026-10-01' }, { t: 'b', d: '2026-10-20' }, { t: 'c', d: '2026-11-12' }] }, '2026-11-12');
  assert.deepEqual(st.sent.map((x) => x.t), ['b', 'c']);
});

test('мусорные записи отбрасываются', () => {
  const st = normalizeState({ sent: [null, 5, { t: 1 }, { t: 'ok', d: '2026-11-12' }] }, '2026-11-12');
  assert.deepEqual(st.sent, [{ t: 'ok', d: '2026-11-12' }]);
});
