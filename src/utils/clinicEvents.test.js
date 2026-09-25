import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicEventForDate, isWomensHealthEncounter, womensHealthQueuePreference, womensHealthChiefComplaint, hasOnlyWomensHealthVisitsOnDate, patientsForClinicEvent, WOMENS_HEALTH_DAY } from './clinicEvents.js';

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

test('chief complaint uses only this patient accepted event reasons for the intake date', () => {
  const entry = { patientId: 12, programType: "Women's Health Day", status: 'Accepted', specialtyDate: '2026-10-03', reason: 'Pap smear' };
  const entries = [entry, { ...entry }, { ...entry, patientId: 13, reason: 'Other patient' },
    { ...entry, specialtyDate: '2026-11-03', reason: 'Future event' },
    { ...entry, status: 'Declined', reason: 'Declined' },
    { ...entry, programType: 'Mammogram', reason: 'Other program' },
    { ...entry, reason: '  ' }];
  assert.equal(womensHealthChiefComplaint(entries, '12', '2026-10-03', WOMENS_HEALTH_DAY), 'Pap smear');
  assert.equal(womensHealthChiefComplaint(entries, 12, '2026-10-03', ''), '');
  assert.equal(womensHealthChiefComplaint(entries, 99, '2026-10-03', WOMENS_HEALTH_DAY), '');
  assert.equal(womensHealthChiefComplaint([{ ...entry, reason: '' }], 12, '2026-10-03', WOMENS_HEALTH_DAY), '');
});

test('chief complaint requires both the configured event day and this patient event enrollment', () => {
  const eventDate = '2026-10-03';
  const entry = { patientId: 'whd-patient', programType: "Women's Health Day", status: 'Accepted', specialtyDate: eventDate, reason: 'Pap smear' };
  const complaint = (date, patientId, entries = [entry]) => womensHealthChiefComplaint(entries, patientId, date, clinicEventForDate(date, eventDate));
  assert.equal(complaint(eventDate, 'whd-patient'), 'Pap smear');
  assert.equal(complaint(eventDate, 'regular-patient'), '');
  assert.equal(complaint('2026-10-04', 'whd-patient', [{ ...entry, specialtyDate: '2026-10-04' }]), '');
  assert.equal(complaint(eventDate, 'whd-patient', [{ ...entry, programType: 'Dermatology' }]), '');
  assert.equal(complaint(eventDate, 'whd-patient', [{ ...entry, status: 'Pending Acceptance' }]), '');
  assert.equal(complaint(eventDate, 'whd-patient', [{ ...entry, specialtyDate: '2026-11-03' }]), '');
});

test('queue preference is limited to the event patient and date, with unknown values clearly marked', () => {
  const visit = { clinicDate: '2026-10-03', clinicEvent: WOMENS_HEALTH_DAY };
  const entry = { patientId: 'p', programType: "Women's Health Day", specialtyDate: '2026-10-03', status: 'Accepted', clinicianGenderPreference: 'Female' };
  assert.equal(womensHealthQueuePreference([entry], 'p', visit), 'Female');
  assert.equal(womensHealthQueuePreference([{ ...entry, clinicianGenderPreference: 'No Preference' }], 'p', visit), 'No Preference');
  assert.equal(womensHealthQueuePreference([entry], 'other', { clinicDate: '2026-10-03' }, '2026-10-03'), null);
  assert.equal(womensHealthQueuePreference([entry], 'p', { clinicDate: '2026-10-04' }, '2026-10-03'), null);
  assert.equal(womensHealthQueuePreference([], 'p', visit), 'Not Recorded');
  assert.equal(womensHealthQueuePreference([{ ...entry, clinicianGenderPreference: 'Male' }], 'p', visit), 'Not Recorded');
  assert.equal(womensHealthQueuePreference([entry], 'p', { clinicDate: '2026-10-03' }, '2026-10-03'), 'Female');
});
