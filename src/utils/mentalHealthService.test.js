import test from 'node:test';
import assert from 'node:assert/strict';
import { mentalHealthProgramType, mentalHealthSpecialtyType, combinedMentalHealthSettings, combinedMentalHealthAccess } from './mentalHealthService.js';
import { matchingSpecialtyTracker } from './specialtyTracker.js';

test('legacy intake values and either specialty permission resolve to one existing storage value', () => {
  for (const type of ['mental_health', 'addiction', 'addiction_medicine']) assert.equal(mentalHealthSpecialtyType(type), 'mental_health');
  for (const type of ['Mental Health', 'Addiction Medicine', 'Mental Health / Addiction Medicine']) assert.equal(mentalHealthProgramType(type), 'Mental Health');
  assert.equal(mentalHealthProgramType('Counseling'), 'Counseling');
  assert.equal(mentalHealthSpecialtyType('pt'), 'pt');
});

test('combined scheduling retains legacy dates and rooms, with one capacity and no mutation', () => {
  const rows = [
    { program_type: 'Mental Health', next_specialty_date: '', primary_count: 8, rooms_assigned: { rooms: ['1'] } },
    { program_type: 'Addiction Medicine', next_specialty_date: '2026-11-18', primary_count: 4, rooms_assigned: { rooms: ['1', '2'] } },
    { program_type: 'Counseling', next_specialty_date: '2026-11-11' },
  ];
  const result = combinedMentalHealthSettings(rows);
  const service = result.find(row => row.program_type === 'Mental Health');
  assert.equal(result.length, 2);
  assert.equal(service.next_specialty_date, '2026-11-18');
  assert.equal(service.primary_count, 8);
  assert.deepEqual(service.rooms_assigned.rooms, ['1', '2']);
  assert.equal(rows[0].next_specialty_date, '');
  assert.equal(combinedMentalHealthSettings([rows[1]])[0].program_type, 'Mental Health');
});

test('new combined check-ins find historical addiction referrals and old addiction visits find mental health referrals', () => {
  const referral = { id: 'r', patientId: 'p', programType: 'Addiction Medicine', status: 'Scheduled', specialtyDate: '2026-11-18', createdAt: '2026-11-01' };
  const encounter = { visitType: 'specialty_only', specialtyType: 'mental_health', clinicDate: '2026-11-18' };
  assert.equal(matchingSpecialtyTracker([referral], 'p', encounter)?.id, 'r');
  assert.equal(matchingSpecialtyTracker([{ ...referral, programType: 'Mental Health' }], 'p', { ...encounter, specialtyType: 'addiction' })?.id, 'r');
  assert.equal(matchingSpecialtyTracker([referral], 'p', { ...encounter, intakeData: { specialtyTrackerId: 'r' } })?.id, 'r');
  assert.equal(matchingSpecialtyTracker([referral], 'other', encounter), null);
  assert.equal(matchingSpecialtyTracker([referral], 'p', { ...encounter, clinicDate: '2026-12-01' }), null);
  assert.equal(matchingSpecialtyTracker([referral], 'p', { ...encounter, specialtyType: 'counseling' }), null);
});

test('either existing service access works for combined check-ins without granting other specialties', () => {
  assert.deepEqual(combinedMentalHealthAccess(['Addiction Medicine']), ['Addiction Medicine', 'Mental Health']);
  assert.deepEqual(combinedMentalHealthAccess(['Mental Health']), ['Mental Health', 'Addiction Medicine']);
  assert.deepEqual(combinedMentalHealthAccess(['Counseling']), ['Counseling']);
  assert.deepEqual(combinedMentalHealthAccess([]), []);
});
