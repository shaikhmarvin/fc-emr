import test from 'node:test';
import assert from 'node:assert/strict';
import { ophthoReferral, matchesOphthoDay, isOphthoEncounter, existingOphthoVisit, canReopenOphthoNote } from './ophthalmology.js';
const patient = {id: 'p', firstName: 'Test', lastName: 'Patient', dob: '2000-01-01'};
const encounter = {clinicDate: '2026-10-20', visitType: 'general'};
const referral = {id: 'r', patientId: 'p', programType: 'Ophthalmology', reason: 'Blurry vision', status: 'Scheduled', specialtyDate: '2026-10-20'};
test('only leadership can reopen final ophthalmology notes', () => {
  const note = {noteType:'ophthalmology', soapStatus:'completed'};
  assert.equal(canReopenOphthoNote('leadership', note), true);
  assert.equal(canReopenOphthoNote('leadership', {...note, soapStatus:'signed'}), true);
  for (const role of ['attending', 'ophthalmology', 'undergraduate', 'physical_therapy', '']) {
    assert.equal(canReopenOphthoNote(role, note), false);
  }
  assert.equal(canReopenOphthoNote('leadership', {...note, soapStatus:'draft'}), false);
  assert.equal(canReopenOphthoNote('leadership', {noteType:'medical', soapStatus:'signed'}), false);
  assert.equal(canReopenOphthoNote('leadership', null), false);
});
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

test('existing visits match date and legacy specialty data, excluding cancelled visits', () => {
  const visit = {...encounter, specialtyType:'ophthalmology', status:'done'};
  assert.equal(existingOphthoVisit({...patient, encounters:[visit]}, encounter.clinicDate), visit);
  assert.equal(existingOphthoVisit({...patient, encounters:[visit]}, '2026-10-21'), undefined);
  assert.equal(existingOphthoVisit({...patient, encounters:[{...visit, status:'cancelled'}]}, encounter.clinicDate), undefined);
  assert.ok(existingOphthoVisit({...patient, encounters:[{...encounter, intake_data:{specialtyType:'ophtho'}}]}, encounter.clinicDate));
});
