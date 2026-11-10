import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingSpecialtyTracker, specialtyTrackerVisits, specialtyVisitHistory, completedSpecialtyDates, trackerCompletionDates, matchesSpecialtyFilter, isPtNoShow, specialtyScheduleByDate } from './specialtyTracker.js';
const encounter = { id: 'e', clinicDate: '2026-09-25', specialtyType: 'dermatology', visitType: 'specialty_only', status: 'undergrad_complete' };
const entry = { id: 't', patientId: 'p', programType: 'Dermatology', specialtyDate: '2026-09-25', status: 'Scheduled', reason: 'Rash', createdAt: '2026-09-01T12:00:00Z' };

test('reason matches the patient and specialty, preferring the current appointment', () => {
  const other = { ...entry, id: 'other', patientId: 'other' };
  const general = { ...encounter, visitType: 'general', specialtyType: '' };
  const undated = { ...entry, id: 'undated', specialtyDate: '' };
  assert.equal(matchingSpecialtyTracker([other, undated, entry], 'p', encounter).reason, 'Rash');
  assert.equal(matchingSpecialtyTracker([other], 'p', encounter), null);
  assert.equal(matchingSpecialtyTracker([entry], 'p', { ...encounter, specialtyType: 'ophthalmology' }), null);
  assert.equal(matchingSpecialtyTracker([entry], 'p', general), null);
  assert.equal(matchingSpecialtyTracker([undated], 'p', encounter).id, 'undated');
});
test('different-date appointments, future referrals and declined unscheduled referrals do not match', () => {
  for (const candidate of [
    { ...entry, specialtyDate: '2026-09-26' },
    { ...entry, specialtyDate: '2026-09-24' },
    { ...entry, createdAt: '2026-09-26T12:00:00Z' },
    { ...entry, specialtyDate: '', status: 'Declined' },
  ]) assert.equal(matchingSpecialtyTracker([candidate], 'p', encounter), null);
});
test('saved specialty encounters mark check-in and completion without general visits completing another specialty', () => {
  const track = (visits) => specialtyTrackerVisits([entry], [{ id: 'p', encounters: visits }]).get('t');
  assert.equal(track([encounter]).status, 'Checked in');
  assert.equal(track([{ ...encounter, status: 'done' }]).status, 'Visit completed');
  assert.equal(track([{ ...encounter, status: 'cancelled' }]).status, 'Cancelled');
  assert.equal(track([{ ...encounter, status: 'done', specialtyType: 'ophthalmology' }]), undefined);
  assert.equal(track([{ ...encounter, status: 'done', visitType: 'general' }]), undefined);
  assert.equal(track([{ ...encounter, soapStatus: 'signed' }]).status, 'Checked in');
  assert.equal(track([{ ...encounter, status: 'done' }, { ...encounter, id: 'duplicate', status: 'cancelled' }]).status, 'Visit completed');
});
test('physical therapy aliases and legacy saved specialty data match', () => {
  const pt = { ...entry, programType: 'Physical Therapy' };
  assert.equal(matchingSpecialtyTracker([pt], 'p', { ...encounter, specialtyType: 'physical_therapy' }).id, 't');
  assert.equal(matchingSpecialtyTracker([pt], 'p', { ...encounter, specialtyType: '', visitType: 'general', intake_data: { visitType: 'specialty_only', specialtyType: 'pt' } }).id, 't');
});

test('only past scheduled PT visits without a same-day PT registration are no-shows', () => {
  const pt = { ...entry, programType: 'Physical Therapy' };
  const checkIn = { ...encounter, specialtyType: 'pt', visitType: 'both' };
  const today = '2026-09-26';
  const history = specialtyVisitHistory([
    { id: 'p', encounters: [
      encounter,
      { ...checkIn, id: 'general', visitType: 'general' },
      { ...checkIn, id: 'other-date', clinicDate: '2026-09-24' },
    ] },
    { id: 'other', encounters: [checkIn] },
  ]);

  assert.equal(isPtNoShow(history, pt, today), true);
  assert.equal(isPtNoShow(history, pt, pt.specialtyDate), false);
  assert.equal(isPtNoShow(history, pt, '2026-09-24'), false);
  assert.equal(isPtNoShow(history, entry, today), false);
  assert.equal(isPtNoShow(history, { ...pt, specialtyDate: '' }, today), false);
  assert.equal(isPtNoShow(history, { ...pt, status: 'Backup' }, today), false);
  assert.equal(isPtNoShow(history, { ...pt, status: 'Completed' }, today), false);
  for (const status of ['undergrad_complete', 'done', 'cancelled']) {
    const sameDay = specialtyVisitHistory([{ id: 'p', encounters: [{ ...checkIn, status }] }]);
    assert.equal(isPtNoShow(sameDay, pt, today), false);
  }
});

test('all specialty completion dates survive rescheduling, duplicates and multiple months', () => {
  const patients = [{ id: 'p', encounters: [
    { ...encounter, status: 'done' },
    { ...encounter, id: 'duplicate', status: 'done' },
    { ...encounter, id: 'oct', clinicDate: '2026-10-23', status: 'done' },
    { ...encounter, id: 'cancel', clinicDate: '2026-10-24', status: 'cancelled' },
    { ...encounter, id: 'general', clinicDate: '2026-10-25', visitType: 'general', status: 'done' },
    { ...encounter, id: 'other', clinicDate: '2026-10-26', specialtyType: 'pt', status: 'done' },
  ] }, { id: 'other', encounters: [{ ...encounter, clinicDate: '2026-10-27', status: 'done' }] }];
  const history = specialtyVisitHistory(patients);
  assert.deepEqual(completedSpecialtyDates(history, entry), ['2026-09-25', '2026-10-23']);
  assert.deepEqual(trackerCompletionDates(history, entry), ['2026-09-25']);
  assert.deepEqual(trackerCompletionDates(history, { ...entry, specialtyDate: '2026-11-20' }), []);
  assert.deepEqual(trackerCompletionDates(history, { ...entry, specialtyDate: '', createdAt: '2026-10-01' }), ['2026-10-23']);
  assert.deepEqual(completedSpecialtyDates(history, { ...entry, programType: 'Physical Therapy' }), ['2026-10-26']);
});

test('calendar keeps prior rosters and calculates attendance for each scheduled date', () => {
  const pt = {
    ...entry,
    programType: 'Physical Therapy',
    patientName: 'Test Patient',
    specialtyDate: '2026-11-13',
    scheduleHistory: {
      '2026-09-25': { status: 'Scheduled', appointmentSlot: '6:00 PM' },
      '2026-10-02': { status: 'Rescheduled' },
      '2026-10-09': { status: 'Scheduled' },
      '2026-10-16': { status: 'Attempted Contact' },
    },
  };
  const history = specialtyVisitHistory([{ id: 'p', encounters: [
    { ...encounter, clinicDate: '2026-10-09', specialtyType: 'pt', status: 'done' },
  ] }]);
  const byDate = specialtyScheduleByDate([pt], history, '2026-11-10');
  assert.deepEqual([...byDate.values()].map(rows => rows[0].status),
    ['No Show', 'Rescheduled', 'Visit completed', 'Attempted Contact', 'Scheduled']);
  assert.equal(byDate.get('2026-09-25')[0].appointmentSlot, '6:00 PM');
  assert.equal(byDate.get('2026-11-13')[0].patientName, 'Test Patient');
});

test('dashboard specialty and LWOBS filters match the encounter opened, including legacy aliases', () => {
  assert.equal(matchesSpecialtyFilter(encounter, 'Dermatology'), true);
  assert.equal(matchesSpecialtyFilter(encounter, 'Physical Therapy'), false);
  assert.equal(matchesSpecialtyFilter({ ...encounter, specialtyType: 'physical_therapy' }, 'Physical Therapy'), true);
  assert.equal(matchesSpecialtyFilter(encounter, 'lwobs'), false);
  assert.equal(matchesSpecialtyFilter({ ...encounter, status: 'cancelled' }, 'lwobs'), true);
  assert.equal(matchesSpecialtyFilter(encounter, ''), true);
});

test('program tracker completion history checks both mental health and addiction labels', () => {
  const history = specialtyVisitHistory([{ id: 'p', encounters: [
    { ...encounter, id: 'mh', specialtyType: 'mental_health', clinicDate: '2026-09-25', status: 'done' },
    { ...encounter, id: 'add', specialtyType: 'addiction', clinicDate: '2026-10-23', status: 'done' },
    { ...encounter, id: 'cancelled', specialtyType: 'addiction', clinicDate: '2026-10-24', status: 'cancelled' },
  ] }]);
  for (const programType of ['Mental Health', 'Addiction Medicine']) {
    const tracker = { ...entry, programType };
    assert.deepEqual(completedSpecialtyDates(history, tracker), ['2026-09-25', '2026-10-23']);
    assert.deepEqual(trackerCompletionDates(history, { ...tracker, specialtyDate: '2026-10-23' }), ['2026-10-23']);
    assert.deepEqual(trackerCompletionDates(history, { ...tracker, specialtyDate: '2026-11-20' }), []);
  }
});
