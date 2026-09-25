import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicEventForDate, isWomensHealthEncounter, hasOnlyWomensHealthVisitsOnDate, patientsForClinicEvent, WOMENS_HEALTH_DAY } from './clinicEvents.js';

test('intake classification matches only the configured event date', () => {
  assert.equal(clinicEventForDate('2026-10-03', '2026-10-03'), WOMENS_HEALTH_DAY);
  assert.equal(clinicEventForDate('2026-10-02', '2026-10-03'), '');
  assert.equal(clinicEventForDate('2026-10-03', ''), '');
});
test('event identity survives reloads and does not use referral interest or current event date', () => {
  assert.equal(isWomensHealthEncounter({ intake_data: { clinicEvent: WOMENS_HEALTH_DAY } }), true);
  assert.equal(isWomensHealthEncounter({ intakeData: { clinicEvent: WOMENS_HEALTH_DAY } }), true);
  assert.equal(isWomensHealthEncounter({ womenHealthDay: 'Accepted', clinicDate: '2026-10-03' }), false);
});
test('mixed patient histories are split by visit without modifying the original chart', () => {
  const patients = [{ id: 'p', encounters: [{ id: 'regular' }, { id: 'event', clinicEvent: WOMENS_HEALTH_DAY }] }];
  assert.deepEqual(patientsForClinicEvent(patients)[0].encounters.map(e => e.id), ['regular']);
  assert.deepEqual(patientsForClinicEvent(patients, WOMENS_HEALTH_DAY)[0].encounters.map(e => e.id), ['event']);
  assert.equal(patients[0].encounters.length, 2);
});

test('event-only refill patients stay separate without excluding regular visits on the same date', () => {
  const patient = { encounters: [{ clinicDate: '2026-10-03', clinicEvent: WOMENS_HEALTH_DAY }] };
  assert.equal(hasOnlyWomensHealthVisitsOnDate(patient, '2026-10-03'), true);
  assert.equal(hasOnlyWomensHealthVisitsOnDate(patient, '2026-10-04'), false);
  patient.encounters.push({ clinicDate: '2026-10-03' });
  assert.equal(hasOnlyWomensHealthVisitsOnDate(patient, '2026-10-03'), false);
});
