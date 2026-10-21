import test from 'node:test';
import assert from 'node:assert/strict';
import { ophthoReferral, matchesOphthoDay, isOphthoEncounter } from './ophthalmology.js';
const patient = {id: 'p', firstName: 'Test', lastName: 'Patient', dob: '2000-01-01'};
const encounter = {clinicDate: '2026-10-20', visitType: 'general'};
const referral = {id: 'r', patientId: 'p', programType: 'Ophthalmology', reason: 'Blurry vision', status: 'Scheduled', specialtyDate: '2026-10-20'};
test('ophtho reason uses the patient and clinic date, with scheduled referrals first', () => {
  const entries = [{...referral, patientId:'other'}, {...referral, specialtyDate:'2026-10-21'}, {...referral, specialtyDate:null, reason:'Old'}, referral];
  assert.equal(ophthoReferral(entries, patient, encounter)?.reason, 'Blurry vision');
  assert.equal(ophthoReferral([{...referral, status:'Declined'}], patient, encounter), null);
  assert.equal(ophthoReferral([{...referral, patientId:'other', patientName:'Test Patient'}], patient, encounter), null);
  assert.equal(ophthoReferral([{...referral, patientId:null, patientName:'Test Patient', dob:patient.dob}], patient, encounter)?.id, 'r');
});
test('on day includes checked-in referrals and spontaneous ophthalmology visits', () => {
  assert.equal(matchesOphthoDay([referral], patient, encounter, 'on_day'), true);
  assert.equal(matchesOphthoDay([], patient, {...encounter, specialtyType:'ophthalmology'}, 'on_day'), true);
  assert.equal(matchesOphthoDay([], patient, encounter, 'on_day'), false);
  assert.equal(isOphthoEncounter({noteType:'ophthalmology'}), true);
});
test('off day screens completed intake for eye interest or diabetes screening', () => {
  assert.equal(matchesOphthoDay([], patient, {...encounter, dm:true}, 'off_day'), false);
  assert.equal(matchesOphthoDay([], patient, {...encounter, dm:true, leadershipIntakeComplete:true}, 'off_day'), true);
  assert.equal(matchesOphthoDay([], patient, {...encounter, dm:true, diabeticEyeExamPastYear:'yes', leadershipIntakeComplete:true}, 'off_day'), false);
  assert.equal(matchesOphthoDay([], patient, {...encounter, ophthalmology:'Blurry vision', leadershipIntakeComplete:true}, 'off_day'), true);
});
