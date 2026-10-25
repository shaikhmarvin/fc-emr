import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshLabPacketPatient } from './labPacketPatients.js';
import { labNameSuggestionScore } from './labPatientSuggestions.js';
const patient = { id: 'patient', firstName: 'Maria', lastName: 'Gonzalez', dob: '1980-03-07' };
const suggest = (patients, name) => ({ possible: patients.filter(p => labNameSuggestionScore(name, p) > 0) });

test('packets loaded before the patient directory recover their saved confirmation', () => {
  const labs = [{ value: '6.8', sourceReviewed: true }];
  const progress = { reviewedPages: [1], encounterId: 'refill', targetVerified: true };
  const initial = { packetId: 'packet', matchedPatientId: 'patient', extractedPatientName: 'Maria Gonzalez', labs, reviewProgress: progress };
  const early = refreshLabPacketPatient(initial, [], suggest);
  assert.equal(early.matchStatus, 'loading_patients');
  const ready = refreshLabPacketPatient(early, [patient], suggest);
  assert.equal(ready.matchStatus, 'matched');
  assert.equal(ready.confirmedPatient.id, 'patient');
  assert.equal(ready.labs, labs);
  assert.equal(ready.reviewProgress, progress);
});

test('unresolved packets recompute fuzzy suggestions when patient records arrive', () => {
  const early = refreshLabPacketPatient({ extractedPatientName: 'Maria Gonzales' }, [], suggest);
  const ready = refreshLabPacketPatient(early, [patient], suggest);
  assert.equal(ready.matchStatus, 'possible_match');
  assert.equal(ready.possibleMatches[0].id, 'patient');
  assert.equal(ready.confirmedPatient, null);
});

test('saved candidate IDs survive an empty directory and confirmed charts are never silently reassigned', () => {
  const early = refreshLabPacketPatient({ possibleMatchIds: ['patient'] }, [], suggest);
  assert.equal(refreshLabPacketPatient(early, [patient], suggest).possibleMatches[0].id, 'patient');
  const missing = refreshLabPacketPatient({ matchedPatientId: 'missing', extractedPatientName: 'Maria Gonzalez' }, [patient], suggest);
  assert.equal(missing.matchStatus, 'unresolved');
  assert.equal(missing.confirmedPatient, null);
  assert.equal(missing.matchedPatientId, 'missing');
});

test('directory updates refresh confirmed chart details without touching review state', () => {
  const result = refreshLabPacketPatient({ confirmedPatient: patient, reviewProgress: { reviewedPages: [2] } }, [{ ...patient, mrn: 'new-number' }], suggest);
  assert.equal(result.confirmedPatient.mrn, 'new-number');
  assert.deepEqual(result.reviewProgress.reviewedPages, [2]);
});
