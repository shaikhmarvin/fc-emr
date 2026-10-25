import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeScope, learnRangeDefault, applyRangeDefaults, suspendConflictingRangeDefaults } from './labRangeDefaults.js';

const lab = { key: 'albumin', displayName: 'Albumin', unit: 'g/dL', referenceRangeText: '3.5 - 5.2' };
const report = labs => ({ rawText: 'UMC HEALTH SYSTEM', sourceDocument: { id: 'file-one' }, labs });

test('verified ranges fill missing ranges for the same laboratory, test and units', () => {
  const defaults = learnRangeDefault({}, report([lab]), lab, [report([lab])]);
  const [filled] = applyRangeDefaults([{ ...lab, referenceRangeText: '' }], report([]), defaults);
  assert.equal(filled.referenceRangeText, '3.5 - 5.2');
  assert.equal(filled.referenceRangeNeedsReview, true);
  assert.equal(filled.referenceRangeSource, 'verified_default');
  assert.equal(filled.sourceReviewed, false);
});

test('printed ranges, deliberate clearing, different tests/units and laboratories are respected', () => {
  const defaults = learnRangeDefault({}, report([lab]), lab, [report([lab])]);
  for (const current of [lab, { ...lab, referenceRangeText: '3.0 - 5.0' },
    { ...lab, referenceRangeText: '', unit: 'mg/dL' }, { ...lab, referenceRangeText: '', key: 'rdw_sd' },
    { ...lab, referenceRangeText: '', referenceRangeCleared: true }]) {
    assert.deepEqual(applyRangeDefaults([current], report([]), defaults), [current]);
  }
  const otherLab = { rawText: 'Laboratory: Another Lab', sourceDocument: { id: 'file-two' } };
  assert.equal(applyRangeDefaults([{ ...lab, referenceRangeText: '' }], otherLab, defaults)[0].referenceRangeText, '');
});

test('conflicting ranges block learning and suspend previous defaults for future uploads', () => {
  const conflict = { ...lab, referenceRangeText: '3.0 - 5.0' };
  assert.throws(() => learnRangeDefault({}, report([lab]), lab, [report([lab, conflict])]), /different ranges/);
  const defaults = learnRangeDefault({}, report([lab]), lab, [report([lab])]);
  const suspended = suspendConflictingRangeDefaults(defaults, [report([conflict])]);
  const [missing] = applyRangeDefaults([{ ...lab, referenceRangeText: '' }], report([]), suspended);
  assert.equal(missing.referenceRangeText, '');
  const reused = applyRangeDefaults([{ ...lab, referenceRangeText: '' }], report([]), defaults)[0];
  assert.equal(applyRangeDefaults([reused], report([]), suspended)[0].referenceRangeText, '');
  assert.equal(applyRangeDefaults([{ ...reused, sourceReviewed: true }], report([]), suspended)[0].referenceRangeText, lab.referenceRangeText);
});

test('equivalent whitespace does not create a conflict and unknown labs are file-scoped', () => {
  assert.doesNotThrow(() => learnRangeDefault({}, report([lab]), lab, [report([{ ...lab, referenceRangeText: '3.5–5.2' }])]));
  assert.equal(rangeScope({ sourceDocument: { id: 'one' } }), 'document:one');
  const packet = { sourceDocument: { id: 'one' }, labs: [lab] };
  const defaults = learnRangeDefault({}, packet, lab, [packet]);
  assert.equal(applyRangeDefaults([{ ...lab, referenceRangeText: '' }], { sourceDocument: { id: 'two' } }, defaults)[0].referenceRangeText, '');
});

test('unit prefixes with different case never share defaults', () => {
  const antibody = { ...lab, key: 'hepatitis_b_surface_antibody_quant', unit: 'mIU/mL' };
  const defaults = learnRangeDefault({}, report([antibody]), antibody, [report([antibody])]);
  const changed = { ...antibody, unit: 'MIU/mL', referenceRangeText: '' };
  assert.equal(applyRangeDefaults([changed], report([]), defaults)[0].referenceRangeText, '');
});

test('verified lipid units and ranges fill together and preserve report-specific values', async () => {
  const { learnVerifiedLipidDefaults } = await import('./labRangeDefaults.js');
  const lipid = { key: 'ldl', displayName: 'LDL', unit: 'mg/dL', referenceRangeText: '<100', referenceRangeSource: 'report', sourceReviewed: true };
  const defaults = learnVerifiedLipidDefaults({}, [report([lipid])]);
  const [filled] = applyRangeDefaults([{ key: 'ldl', unit: '', referenceRangeText: '' }], report([]), defaults);
  assert.equal(filled.unit, 'mg/dL');
  assert.equal(filled.referenceRangeText, '<100');
  assert.equal(filled.unitNeedsReview, true);
  assert.equal(filled.referenceRangeNeedsReview, true);
  assert.equal(filled.sourceReviewed, false);
  const [printed] = applyRangeDefaults([{ ...lipid, referenceRangeText: '<130' }], report([]), defaults);
  assert.equal(printed.referenceRangeText, '<130');
  assert.deepEqual(applyRangeDefaults([{ key: 'ldl', unit: '', unitCleared: true, referenceRangeText: '' }], report([]), defaults)[0].unit, '');
  assert.equal(Object.keys(learnVerifiedLipidDefaults({}, [report([{ ...lipid, sourceReviewed: false }])])).length, 0);
});

test('lipid units are not guessed when verified templates or observed report units conflict', () => {
  const lipid = { key: 'ldl', displayName: 'LDL', unit: 'mg/dL', referenceRangeText: '<100' };
  let defaults = learnRangeDefault({}, report([lipid]), lipid, [report([lipid])]);
  const si = { ...lipid, unit: 'mmol/L', referenceRangeText: '<2.6' };
  defaults = learnRangeDefault(defaults, report([si]), si, [report([si])]);
  const [missing] = applyRangeDefaults([{ key: 'ldl', unit: '', referenceRangeText: '' }], report([]), defaults);
  assert.equal(missing.unit, '');
});
