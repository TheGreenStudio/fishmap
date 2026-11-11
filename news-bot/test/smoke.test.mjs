// Минимальная проверка: модули импортируются без побочных эффектов и фильтры отвечают.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sameStory, norm, MUST } from '../filters.mjs';

test('filters.mjs импортируется', () => {
  assert.equal(typeof sameStory, 'function');
  assert.equal(norm('A, B!'), 'a b');
  assert.ok(MUST.test('Alberta anglers'));
});

test('digest.mjs импортируется и не запускает main', async () => {
  await import('../digest.mjs');
});
