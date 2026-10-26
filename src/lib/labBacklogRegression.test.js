import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResultCell } from './labDocument.js';
import { importedLabFlag } from './labFlags.js';
test('critical and qualitative report flags preserve the actual result', () => {
  assert.deepEqual(parseResultCell('133.00 (HH)'), { value: 133, flag: 'HH' });
  assert.deepEqual(parseResultCell('<0.01 (LL)'), { value: '<0.01', flag: 'LL' });
  assert.deepEqual(parseResultCell('Detected (A)'), { value: 'Detected', flag: 'A' });
  assert.equal(importedLabFlag({ value: 'Reactive', reportedFlag: 'AA' }), 'A');
});
