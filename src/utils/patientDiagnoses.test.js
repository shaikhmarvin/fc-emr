import test from 'node:test';
import assert from 'node:assert/strict';
import { patientHasPriorDiagnosis } from './patientDiagnoses.js';

test('profile and historical intake diagnoses survive a daily visit with false flags', () => {
  const current = { visitType: 'general', htn: false, dm: false };
  const profile = { chronicConditions: ['Hypertension', 'Diabetes'], encounters: [current] };
  for (const key of ['htn', 'dm']) assert.equal(patientHasPriorDiagnosis(profile, key), true);
  const historical = { encounters: [current, { visitType: 'general', intake_data: { htn: 'Yes', dm: true } }] };
  for (const key of ['htn', 'dm']) assert.equal(patientHasPriorDiagnosis(historical, key), true);
});

test('cancelled and specialty-only flags do not establish general clinic diagnosis history', () => {
  const patient = { encounters: [{ visitType: 'general', status: 'cancelled', htn: true, dm: true }, { visitType: 'specialty_only', htn: true, dm: true }] };
  for (const key of ['htn', 'dm']) assert.equal(patientHasPriorDiagnosis(patient, key), false);
});
