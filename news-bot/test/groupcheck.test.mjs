// Проверка кода группы Supabase: повтор при сбое сети, без повтора при «код не подошёл».
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_GROUP_CODE = 'test-code';
const { loadSpots } = await import('../digest.mjs');

const ROWS = JSON.stringify([{ id: 'a', name: 'A', lat: 51, lon: -114, season: 'summer' }]);
// fetch по сценарию: answers[i] для i-го обращения к group_check
function mock(answers) {
  const calls = { check: 0, rows: 0 };
  globalThis.fetch = async (url) => {
    if (String(url).includes('/rpc/group_check')) {
      const a = answers[calls.check++];
      if (a === 'net') throw new TypeError('fetch failed');
      return new Response(JSON.stringify(a.body), { status: a.status });
    }
    calls.rows++;
    return new Response(ROWS, { status: 200 });
  };
  return calls;
}

test('сбой сети, затем успех: точки загружены после повтора', async () => {
  const calls = mock(['net', { status: 200, body: true }]);
  const spots = await loadSpots();
  assert.equal(calls.check, 2);
  assert.ok(spots.some((s) => s.name === 'A'));
});

test('503, затем успех: повтор', async () => {
  const calls = mock([{ status: 503, body: {} }, { status: 200, body: true }]);
  await loadSpots();
  assert.equal(calls.check, 2);
});

test('код не подошёл (false): без повтора', async () => {
  const calls = mock([{ status: 200, body: false }, { status: 200, body: true }]);
  await assert.rejects(loadSpots, /код группы не подошёл/);
  assert.equal(calls.check, 1);
  assert.equal(calls.rows, 0);
});

test('401: без повтора, та же понятная ошибка', async () => {
  const calls = mock([{ status: 401, body: {} }, { status: 200, body: true }]);
  await assert.rejects(loadSpots, /код группы не подошёл/);
  assert.equal(calls.check, 1);
});

test('два сбоя подряд: ошибка (блок точек выпадет с предупреждением)', async () => {
  const calls = mock(['net', 'net']);
  await assert.rejects(loadSpots, /fetch failed/);
  assert.equal(calls.check, 2);
});
