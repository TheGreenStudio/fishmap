import test from 'node:test';
import assert from 'node:assert/strict';
import { spotKind, fishSpotsInSeason } from '../digest.mjs';

const sp = (name, extra = {}) => ({ name, lat: 51, lon: -114, ...extra });
const SPOTS = [
  sp('Рыбалка лето', { kind: 'fish', season: 'summer' }),
  sp('Без kind', { season: 'summer' }),
  sp('Без kind и сезона'),
  sp('Кэмпинг', { kind: 'camp', season: 'both', kids: true }),
  sp('Интересное', { kind: 'poi', season: 'summer' }),
  sp('Рыбалка зима', { kind: 'fish', season: 'winter' }),
  sp('Общая из spots.json', { season: 'both' }),
  sp('Кэмпинг из spots.json', { type: 'camp', season: 'both' }),
];
const names = (list) => list.map((s) => s.name);

test('тип точки: без поля и с незнакомым значением считается рыбалкой', () => {
  assert.equal(spotKind(sp('a')), 'fish');
  assert.equal(spotKind(sp('a', { kind: null })), 'fish');
  assert.equal(spotKind(sp('a', { kind: 'hotel' })), 'fish');
  assert.equal(spotKind(sp('a', { kind: 'camp' })), 'camp');
  assert.equal(spotKind(sp('a', { kind: 'poi' })), 'poi');
  assert.equal(spotKind(sp('a', { type: 'camp' })), 'camp');   // spots.json
});

test('клёв летом: только рыбалка своего сезона, кэмпинги и интересные места не попадают', () => {
  assert.deepEqual(names(fishSpotsInSeason(SPOTS, false)), ['Рыбалка лето', 'Без kind', 'Без kind и сезона', 'Общая из spots.json']);
});

test('клёв зимой: кэмпинг с сезоном both не попадает', () => {
  assert.deepEqual(names(fishSpotsInSeason(SPOTS, true)), ['Рыбалка зима', 'Общая из spots.json']);
});

test('только кэмпинги и интересные места: блок клёва пустой', () => {
  assert.deepEqual(fishSpotsInSeason([sp('c', { kind: 'camp' }), sp('p', { kind: 'poi' })], false), []);
});
