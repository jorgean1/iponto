import test from 'node:test';
import assert from 'node:assert/strict';
import { isExcludedDate, parseExcludedDates } from '../src/scheduler.js';

test('reconhece feriado individual e período de férias', () => {
  const spec = '2026-09-07\n2026-12-21 a 2027-01-05';
  assert.equal(isExcludedDate('2026-09-07', spec), true);
  assert.equal(isExcludedDate('2026-12-28', spec), true);
  assert.equal(isExcludedDate('2027-01-05', spec), true);
  assert.equal(isExcludedDate('2026-10-01', spec), false);
});

test('identifica datas e períodos inválidos', () => {
  const result = parseExcludedDates('07/09/2026\n2027-01-10 a 2027-01-01');
  assert.deepEqual(result.invalid, ['07/09/2026', '2027-01-10 a 2027-01-01']);
});
