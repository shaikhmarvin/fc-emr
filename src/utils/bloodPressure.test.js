import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBp } from './index.js';

test('BP entry preserves three-digit diastolic readings when typed or pasted', () => {
  for (const value of ['180/110', '210/120', '90/100', '120/80', '70/100']) assert.equal(normalizeBp(value), value);
  let value = '';
  for (const digit of '180110') value = normalizeBp(value + digit);
  assert.equal(value, '180/110');
  assert.equal(normalizeBp('180110'), '180/110');
  assert.equal(normalizeBp('12080'), '120/80');
  assert.equal(normalizeBp(''), '');
});
