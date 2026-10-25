import test from 'node:test';
import assert from 'node:assert/strict';
import { encounterFromPatientSearch } from './patientEncounterSelection.js';
const rows = [
  { patient: { id: 'patient' }, encounter: { id: 'newer', clinicDate: '2026-10-24', visitType: 'general' } },
  { patient: { id: 'other' }, encounter: { id: 'other-visit', clinicDate: '2025-02-15', visitType: 'general' } },
  { patient: { id: 'patient' }, encounter: { id: 'past-general', clinicDate: '2025-02-15', visitType: 'general' } },
  { patient: { id: 'patient' }, encounter: { id: 'past-refill', clinicDate: '2025-02-15', intake_data: { visitType: 'refill_only' } } },
];
test('patient search opens the selected visit date rather than a newer encounter', () => {
  assert.equal(encounterFromPatientSearch(rows, 'patient', '2025-02-15').id, 'past-general');
});
test('same-day refill and general searches open the selected encounter type', () => {
  assert.equal(encounterFromPatientSearch(rows, 'patient', '2025-02-15', 'refill_only').id, 'past-refill');
  assert.equal(encounterFromPatientSearch(rows, 'patient', '2025-02-15', 'general').id, 'past-general');
});
test('a missing dated visit never falls through to another date or another patient', () => {
  assert.equal(encounterFromPatientSearch(rows, 'patient', '2024-01-01'), null);
  assert.equal(encounterFromPatientSearch(rows, 'patient', '2026-10-24', 'refill_only'), null);
  assert.equal(encounterFromPatientSearch(rows, 'patient').id, 'newer');
});
