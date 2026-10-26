import test from 'node:test';
import assert from 'node:assert/strict';
import { labEncounterLabel, restoreLabEncounter, mergeLabReviewProgress, readLabReviewDraft, writeLabReviewDraft, acknowledgeLabReviewDraft, removeLabReviewDraft } from './labReviewProgress.js';
import { PATIENT_CHART_TARGET } from './labSaveTarget.js';
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };

test('refill encounters are labeled and can be selected and restored with general visits', () => {
  const visits = [{ id: 'refill', clinic_date: '2026-10-24', intake_data: { visitType: 'refill_only' }, chief_complaint: 'Refill' }, { id: 'general', clinic_date: '2026-10-24', visitType: 'general' }];
  assert.match(labEncounterLabel(visits[0]), /2026-10-24 — Refill visit/);
  assert.match(labEncounterLabel(visits[1]), /General clinic/);
  assert.equal(restoreLabEncounter(visits, {}, 'patient', '2026-10-24'), PATIENT_CHART_TARGET);
  assert.equal(restoreLabEncounter(visits, { patientId: 'patient', encounterId: 'refill' }, 'patient', '2026-10-24'), 'refill');
  assert.equal(restoreLabEncounter(visits, { patientId: 'someone-else', encounterId: 'refill' }, 'patient', '2026-10-24'), PATIENT_CHART_TARGET);
  assert.equal(restoreLabEncounter(visits, { patientId: 'patient', encounterId: 'deleted-visit' }, 'patient', '2026-10-24'), PATIENT_CHART_TARGET);
});

test('pending edits and review checks survive refresh without an old acknowledgement erasing new work', () => {
  const disk = storage();
  writeLabReviewDraft('user', 'packet', 'labs', [{ value: '6.8', sourceReviewed: true }], disk);
  writeLabReviewDraft('user', 'packet', 'progress', { reviewedPages: [1, 2], patientId: 'patient', encounterId: 'refill', targetVerified: true }, disk);
  const restored = readLabReviewDraft('user', 'packet', disk);
  assert.equal(restored.labs[0].sourceReviewed, true);
  assert.deepEqual(restored.progress.reviewedPages, [1, 2]);
  assert.equal(restored.labsPending, true);
  writeLabReviewDraft('user', 'packet', 'labs', [{ value: '7.1' }], disk);
  acknowledgeLabReviewDraft('user', 'packet', 'labs', restored.labs, disk);
  assert.equal(readLabReviewDraft('user', 'packet', disk).labsPending, true);
  acknowledgeLabReviewDraft('user', 'packet', 'labs', [{ value: '7.1' }], disk);
  assert.equal(readLabReviewDraft('user', 'packet', disk).labsPending, false);
  assert.equal(readLabReviewDraft('other-user', 'packet', disk), null);
  removeLabReviewDraft('user', 'packet', disk);
  assert.equal(readLabReviewDraft('user', 'packet', disk), null);
});

test('combined packet page checks survive and conflicting targets require confirmation again', () => {
  const a = { reviewedPages: [1], patientId: 'p', encounterId: 'v', targetVerified: true };
  const b = { reviewedPages: [2] };
  assert.deepEqual(mergeLabReviewProgress(a, b).reviewedPages, [1, 2]);
  assert.equal(mergeLabReviewProgress(a, b).targetVerified, true);
  assert.equal(mergeLabReviewProgress({}, a).targetVerified, true);
  assert.equal(mergeLabReviewProgress(a, { ...a, encounterId: 'other' }).targetVerified, false);
});
