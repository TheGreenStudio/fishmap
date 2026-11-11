// Если сайты зависают, сбор данных укладывается в общий бюджет, а не в лимит задачи.
process.env.BUDGET_MS = '3000';
import test from 'node:test';
import assert from 'node:assert/strict';

test('зависшие запросы новостей прерываются по бюджету', async () => {
  // fetch, который никогда не отвечает, но честно реагирует на прерывание
  globalThis.fetch = (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  const { pickNews, budgetTimeout } = await import('../digest.mjs');
  const { SECTIONS } = await import('../filters.mjs');
  const keep = setInterval(() => {}, 50);   // AbortSignal.timeout не держит процесс живым, а настоящий сокет держал бы
  const t0 = Date.now();
  await assert.rejects(() => pickNews(SECTIONS[0], { sent: [] }, new Set()), /все запросы не удались/);
  clearInterval(keep);
  const spent = Date.now() - t0;
  assert.ok(spent < 4500, `ушло ${spent} мс, ожидали около 3000`);
  assert.throws(() => budgetTimeout(10000), /время на сбор данных вышло/);
});
