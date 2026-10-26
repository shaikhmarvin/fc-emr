import test from 'node:test';
import assert from 'node:assert/strict';
import { PATIENT_CHART_TARGET, suggestLabSaveTarget, nearbyLabEncounters, validateLabDestination, patientLabSources } from './labSaveTarget.js';
import { restoreLabEncounter, mergeLabReviewProgress } from './labReviewProgress.js';
import { saveImportedLabs } from './saveImportedLabs.js';
import { recognizeSavedImport } from './recognizeSavedImport.js';
import { latestPapHistory } from './papResults.js';
import { researchClinicalStatus } from './researchClinicalStatus.js';
import { buildClinicalResearchStats } from './clinicalResearchStats.js';
const visit = (id, date, status = 'done') => ({ id, clinic_date: date, status });

test('save suggestions use the unique nearest visit within two days across month boundaries', () => {
  assert.equal(suggestLabSaveTarget([visit('near', '2026-08-26'), visit('far', '2026-09-30')], '2026-08-28'), 'near');
  assert.equal(suggestLabSaveTarget([visit('next-month', '2026-10-01')], '2026-09-30'), 'next-month');
  assert.equal(suggestLabSaveTarget([visit('near', '2026-10-01'), visit('exact', '2026-10-03')], '2026-10-03'), 'exact');
  assert.equal(suggestLabSaveTarget([visit('cancelled', '2026-10-03', 'cancelled')], '2026-10-03'), PATIENT_CHART_TARGET);
  assert.equal(nearbyLabEncounters([visit('far', '2026-10-06')], '2026-10-03').length, 0);
});

test('ambiguous or distant visits save to the chart, and invalid collection dates require correction', () => {
  for (const visits of [[], [visit('far', '2026-10-08')], [visit('one', '2026-10-03'), visit('two', '2026-10-03')], [visit('before', '2026-10-02'), visit('after', '2026-10-04')]]) {
    assert.equal(suggestLabSaveTarget(visits, '2026-10-03'), PATIENT_CHART_TARGET);
  }
  assert.equal(suggestLabSaveTarget([], ''), null);
  assert.equal(suggestLabSaveTarget([], '2026-02-30'), null);
  assert.throws(() => validateLabDestination([{ collectedDate: '' }]), /collection date/);
  assert.throws(() => validateLabDestination([{ collectedDate: '2026-10-03' }], visit('far', '2026-10-06')), /two days/);
  validateLabDestination([{ collectedDate: '2026-10-03' }], visit('near', '2026-10-01'));
});

test('explicit chart destinations survive refresh and changing the date clears confirmation', () => {
  const progress = { patientId: 'p', encounterId: PATIENT_CHART_TARGET, collectionDate: '2026-10-03', targetVerified: true };
  assert.equal(restoreLabEncounter([visit('near', '2026-10-03')], progress, 'p', '2026-10-03'), PATIENT_CHART_TARGET);
  assert.equal(mergeLabReviewProgress(progress, { ...progress, collectionDate: '2026-10-04' }).targetVerified, false);
  assert.equal(mergeLabReviewProgress(progress, { ...progress, targetVerified: false }).targetVerified, false);
});

test('saving without a visit uses patient chart conflict protection and detects already saved results', async () => {
  const lab = { key: 'glucose', displayName: 'Glucose', value: 90, unit: 'mg/dL', collectedDate: '2026-10-03', sourceDocumentId: 'doc' };
  let args;
  await saveImportedLabs({ rpc: async (name, payload) => { args = payload; assert.equal(name, 'save_patient_imported_labs_if_unchanged'); return { data: 'patient' }; } }, { patientId: 'patient', encounterId: null, expectedLabs: [], labs: [lab] });
  assert.equal('target_encounter_id' in args, false);
  assert.deepEqual(args.expected_labs, []);
  const packet = { packetId: 'packet', sourceDocument: { id: 'doc' }, collectedDate: '2026-10-03' };
  assert.equal(recognizeSavedImport([lab], packet, [], PATIENT_CHART_TARGET, [lab]).matchedIndexes.size, 1);
  assert.equal(recognizeSavedImport([lab], packet, [{ id: 'visit' }], 'visit', [lab]).matchedIndexes.size, 1);
});

test('labs without visits remain available for patient history, Pap intake and dated A1C research', () => {
  const patient = { id: 'p', importedSendOutLabs: [{ key: 'pap_smear', value: 'ASC-US', collectedDate: '2026-09-01' }, { key: 'a1c', value: 7.2, collectedDate: '2026-10-03' }] };
  assert.equal(patientLabSources(patient).flatMap(source => source.labs).length, 2);
  assert.equal(latestPapHistory(patient).date, '2026-09-01');
  assert.deepEqual(researchClinicalStatus(patient, '2026-10-03').a1c, ['7.2']);
  assert.deepEqual(researchClinicalStatus(patient, '2026-10-04').a1c, []);
  const rows = [{ patientId: 'p', date: '2026-09-30', encounter: { id: 'visit', clinicDate: '2026-09-30' } }];
  const stats = range => buildClinicalResearchStats([{ label: 'DM+ only', rows }], [patient], range)[1].measures.a1c;
  assert.equal(stats({ startDate: '2026-09-01', endDate: '2026-10-31' }).mean, 7.2);
  assert.equal(stats({ startDate: '2026-09-01', endDate: '2026-09-30' }).available, 0);
  assert.equal(stats({ startDate: '2026-09-01', endDate: '2026-10-31', clinicEvent: 'event' }).available, 0);
});
