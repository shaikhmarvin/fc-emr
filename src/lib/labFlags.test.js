import test from 'node:test';
import assert from 'node:assert/strict';
import { importedLabFlag, needsExtractionReview, labFlagChoices, toggleLabFlag } from './labFlags.js';

const result = (value, range) => ({ value, referenceRangeText: range, referenceRangeSource: 'report' });

test('normal numeric values are not abnormal because OCR needs review', () => {
  const lab = { ...result(90, '65 - 115'), suspicious: true, extractionMethod: 'text_fallback' };
  assert.equal(needsExtractionReview(lab), true);
  assert.equal(importedLabFlag(lab), '');
  assert.equal(needsExtractionReview({ ...lab, sourceReviewed: true }), false);
});

test('report intervals identify high, low and inclusive boundaries correctly', () => {
  for (const [value, expected] of [[64, 'L'], [65, ''], [90, ''], [115, ''], [116, 'H']]) {
    assert.equal(importedLabFlag(result(value, '65–115')), expected);
  }
  assert.equal(importedLabFlag(result(0, '0 - 0.1')), '');
  assert.equal(importedLabFlag(result(5, '<5')), 'H');
  assert.equal(importedLabFlag(result(5, '<=5')), '');
  assert.equal(importedLabFlag(result(60, '60+')), '');
  assert.equal(importedLabFlag(result(59, '60+')), 'L');
});

test('qualifiers are not stripped or guessed when they overlap a reference interval', () => {
  assert.equal(importedLabFlag(result('<0.2', '0 - 0.2')), '');
  assert.equal(importedLabFlag(result('>200', '0 - 100')), 'H');
  assert.equal(importedLabFlag(result('<1', '3 - 10')), 'L');
  assert.equal(importedLabFlag(result('>=100', '<=100')), '');
});

test('catalog defaults, old computed symbols and unverified reused ranges do not flag results', () => {
  assert.equal(importedLabFlag({ value: 42, expectedRangeText: '0 - 5', resultSymbol: 'H' }), '');
  assert.equal(importedLabFlag({ value: 42, referenceRangeText: '0 - 5' }), '');
  const reused = { ...result(42, '0 - 5'), referenceRangeSource: 'verified_default', referenceRangeNeedsReview: true };
  assert.equal(importedLabFlag(reused), '');
  assert.equal(importedLabFlag({ ...reused, referenceRangeNeedsReview: false, sourceReviewed: true }), 'H');
});

test('qualitative results do not automatically become HIGH', () => {
  for (const value of ['Reactive', 'Positive', 'Detected', 'Non-Reactive', 'Not Detected']) {
    assert.equal(importedLabFlag(result(value, 'Non-Reactive')), '');
  }
  assert.equal(importedLabFlag({ value: 'Reactive', reportedFlag: 'A' }), 'A');
});

test('explicit normal/high/low report flags are respected', () => {
  assert.equal(importedLabFlag({ ...result(90, '65 - 115'), reportedFlag: 'H' }), 'H');
  assert.equal(importedLabFlag({ ...result(1, '65 - 115'), reportedFlag: 'N' }), '');
  assert.equal(importedLabFlag({ value: 1, reportedFlag: 'LL' }), 'L');
  assert.equal(importedLabFlag({ value: 1, reportedFlag: '*' }), '');
});

test('ambiguous ranges and nonnumeric values stay unclassified', () => {
  for (const range of ['Adult 0-5; Child 0-10', '5 - 0', '~0-5', 'See comment', '']) {
    assert.equal(importedLabFlag(result(90, range)), '');
  }
  assert.equal(importedLabFlag(result('Pending', '0 - 5')), '');
});

test('manual H/L selections override automatic flags and clicking again explicitly clears them', () => {
  const automatic = result(200, '65 - 115');
  assert.equal(importedLabFlag(automatic), 'H');
  const cleared = { ...automatic, manualFlag: toggleLabFlag(automatic, 'H') };
  assert.equal(cleared.manualFlag, '');
  assert.equal(importedLabFlag(JSON.parse(JSON.stringify(cleared))), '');
  const low = { ...cleared, manualFlag: toggleLabFlag(cleared, 'L') };
  assert.equal(importedLabFlag(low), 'L');
  const high = { ...low, manualFlag: toggleLabFlag(low, 'H') };
  assert.equal(importedLabFlag(high), 'H');
});

test('numeric results offer H/L and qualitative results offer a reversible A', () => {
  assert.deepEqual(labFlagChoices({ key: 'glucose', value: 90, unit: 'mg/dL' }), ['H', 'L']);
  assert.deepEqual(labFlagChoices({ key: 'glucose', value: '', unit: 'mg/dL' }), ['H', 'L']);
  assert.deepEqual(labFlagChoices({ key: 'hepatitis_c_rna_quant', value: 'Not Detected', unit: 'IU/mL' }), ['A']);
  assert.deepEqual(labFlagChoices({ key: 'hepatitis_c_genotype', value: '1a' }), ['A']);
  assert.deepEqual(labFlagChoices({ key: 'hepatitis_c_genotype', value: '1' }), ['A']);
  const qualitative = { key: 'chlamydia', value: 'Not Detected' };
  assert.deepEqual(labFlagChoices(qualitative), ['A']);
  const abnormal = { ...qualitative, manualFlag: toggleLabFlag(qualitative, 'A') };
  assert.equal(importedLabFlag(abnormal), 'A');
  assert.equal(importedLabFlag({ ...abnormal, manualFlag: toggleLabFlag(abnormal, 'A') }), '');
});
