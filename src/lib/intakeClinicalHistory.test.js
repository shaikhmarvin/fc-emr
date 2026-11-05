import test from 'node:test';
import assert from 'node:assert/strict';
import { intakeClinicalHistory } from './intakeClinicalHistory.js';

test('latest charted BP uses visit date, preserves repeated readings and skips blank and cancelled visits', () => {
  const patient = { encounters: [
    { id: 'old', clinicDate: '2026-01-01', vitalsHistory: [{ bp: '160/100', enteredAt: '2026-11-05' }] },
    { id: 'latest', clinicDate: '2026-10-28', vitalsHistory: [{ bp: ' 130 / 80 ' }, { bp: '128/78' }, { bp: '128/78' }] },
    { id: 'empty', clinicDate: '2026-11-04', vitalsHistory: [{ bp: '' }] },
    { id: 'cancel', clinicDate: '2026-11-05', status: 'cancelled', vitalsHistory: [{ bp: '170/100' }] },
  ] };
  assert.deepEqual(intakeClinicalHistory(patient).bp, { date: '2026-10-28', values: ['130/80', '128/78'], dateSource: 'visit' });
});
test('A1C includes chart-level imports and uses collection date rather than upload or visit date', () => {
  const patient = { importedSendOutLabs: [{ key: 'a1c', value: '7.2', collectedDate: '2026-10-01' }], encounters: [
    { clinicDate: '2026-09-01', inHouseLabs: { core: { a1c: { value: '8.1' } } } },
    { clinicDate: '2026-11-01', importedSendOutLabs: [{ displayName: 'Hemoglobin A1c', value: '9.0', collectedDate: '2026-01-01' }] },
  ] };
  assert.deepEqual(intakeClinicalHistory(patient).a1c, { date: '2026-10-01', values: ['7.2 %'], dateSource: 'collection' });
});
test('in-house A1C and undated results are available without inventing a collection date or changing units', () => {
  assert.deepEqual(intakeClinicalHistory({ encounters: [{ clinicDate: '2026-10-01', inHouseLabs: { core: { a1c: '6.4' } } }] }).a1c,
    { date: '2026-10-01', values: ['6.4 %'], dateSource: 'visit' });
  assert.deepEqual(intakeClinicalHistory({ imported_send_out_labs: [{ key: 'hba1c', value: '48', unit: 'mmol/mol' }] }).a1c,
    { date: '', values: ['48 mmol/mol'], dateSource: 'visit' });
});
test('missing charts, invalid BP, missing and pending A1C do not produce readings', () => {
  assert.deepEqual(intakeClinicalHistory(null), { bp: null, a1c: null });
  assert.deepEqual(intakeClinicalHistory({ encounters: [{ vitalsHistory: [{ bp: 'N/A' }], inHouseLabs: { core: { a1c: 'N/A' } } }], importedSendOutLabs: [
    { key: 'a1c', value: 'Pending' }, { key: 'a1c', value: '8', missing: true }, { key: 'glucose', value: '120' },
  ] }), { bp: null, a1c: null });
});
