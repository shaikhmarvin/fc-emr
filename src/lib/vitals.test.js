import test from 'node:test';
import assert from 'node:assert/strict';
import { createVitalEntry, patientVitalHistory, vitalDateLabel } from './vitals.js';

test('retroactive vitals use visit date and retain the real entry time separately', () => {
  const entry = createVitalEntry({ bp: '120/80' }, { clinicDate: '2025-02-15', createdAt: '2026-10-24T18:00:00Z' }, null, '2026-10-24T19:00:00Z');
  assert.equal(entry.recordedAt, '02/15/2025');
  assert.equal(entry.visitDate, '2025-02-15');
  assert.equal(entry.enteredAt, '2026-10-24T19:00:00Z');
  const edited = createVitalEntry({ bp: '122/80' }, { clinicDate: '2025-02-15' }, entry, '2026-10-25T18:00:00Z');
  assert.equal(edited.enteredAt, entry.enteredAt);
  assert.equal(edited.updatedAt, '2026-10-25T18:00:00Z');
});

test('trend combines visits in clinical date order regardless of entry order', () => {
  const encounters = [
    { id: 'older', clinicDate: '2025-02-15', createdAt: '2026-10-24', vitalsHistory: [{ bp: '140/90', recordedAt: '10/24/2026' }] },
    { id: 'newer', clinicDate: '2025-06-12', vitalsHistory: [{ bp: '120/80' }] },
    { id: 'empty', clinicDate: '2026-01-01', vitalsHistory: [] },
  ];
  const history = patientVitalHistory(encounters);
  assert.deepEqual(history.map(entry => entry.bp), ['120/80', '140/90']);
  assert.equal(vitalDateLabel(encounters[0], encounters[0].vitalsHistory[0]), '02/15/2025');
  assert.equal(encounters[0].vitalsHistory[0].recordedAt, '10/24/2026');
});

test('missing visit date uses encounter creation date without timezone date shifts', () => {
  assert.equal(vitalDateLabel({ createdAt: '2025-02-15T00:00:00Z' }), '02/15/2025');
});
