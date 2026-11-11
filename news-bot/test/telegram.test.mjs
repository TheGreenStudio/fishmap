import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTgStep } from '../digest.mjs';

test('успех: готово', () => {
  assert.deepEqual(nextTgStep({ ok: true, status: 200, j: { ok: true } }, 1), { action: 'done' });
});

test('группа стала супергруппой: берём новый ID из ответа', () => {
  const res = { ok: false, status: 400, j: { ok: false, description: 'Bad Request: group chat was upgraded to a supergroup chat', parameters: { migrate_to_chat_id: -1001234567890 } } };
  assert.deepEqual(nextTgStep(res, 1), { action: 'migrate', chatId: '-1001234567890' });
});

test('обрыв связи и 5xx повторяем, но не больше трёх раз', () => {
  assert.equal(nextTgStep({ ok: false, status: 0, j: {} }, 1).action, 'retry');
  assert.equal(nextTgStep({ ok: false, status: 502, j: {} }, 2).action, 'retry');
  assert.equal(nextTgStep({ ok: false, status: 502, j: {} }, 3).action, 'fail');
});

test('429: ждём retry_after, но не дольше 20 секунд', () => {
  const r = nextTgStep({ ok: false, status: 429, j: { parameters: { retry_after: 7 } } }, 1);
  assert.deepEqual(r, { action: 'retry', waitMs: 7000 });
  assert.equal(nextTgStep({ ok: false, status: 429, j: { parameters: { retry_after: 600 } } }, 1).waitMs, 20000);
});

test('400 и 403 без переезда не повторяем', () => {
  assert.equal(nextTgStep({ ok: false, status: 400, j: { description: 'Bad Request: chat not found' } }, 1).action, 'fail');
  assert.equal(nextTgStep({ ok: false, status: 403, j: {} }, 1).action, 'fail');
});

// Проверка самой отправки с подменённым fetch (сети нет).
import { sendTelegram } from '../digest.mjs';

function mockFetch(responses) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const r = responses.shift();
    if (r === 'netfail') throw new Error('connect ECONNRESET https://api.telegram.org/botSECRETTOKEN/sendMessage');
    return { ok: r.status === 200, status: r.status, json: async () => r.json };
  };
  return calls;
}

test('sendTelegram: после «upgraded to supergroup» отправляет в новый чат и сообщает об этом', async () => {
  process.env.TELEGRAM_BOT_TOKEN = 'SECRETTOKEN'; process.env.TELEGRAM_CHAT_ID = '-100';
  const calls = mockFetch([
    { status: 400, json: { ok: false, description: 'Bad Request: group chat was upgraded to a supergroup chat', parameters: { migrate_to_chat_id: -1009999 } } },
    { status: 200, json: { ok: true } },
  ]);
  const res = await sendTelegram('привет');
  assert.equal(res.migrated, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.chat_id, '-100');
  assert.equal(calls[1].body.chat_id, '-1009999');
});

test('sendTelegram: обрыв связи повторяется, токен в ошибке не появляется', async () => {
  process.env.TELEGRAM_BOT_TOKEN = 'SECRETTOKEN'; process.env.TELEGRAM_CHAT_ID = '-100';
  const orig = global.setTimeout; global.setTimeout = (fn) => orig(fn, 0);   // не ждать по-настоящему
  try {
    const calls = mockFetch(['netfail', 'netfail', 'netfail']);
    await assert.rejects(() => sendTelegram('x'), (e) => { assert.ok(!/SECRETTOKEN/.test(e.message)); return true; });
    assert.equal(calls.length, 3);
  } finally { global.setTimeout = orig; }
});
