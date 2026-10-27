import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareHistoricalLab, hasHistoricalLabDuplicate } from './historicalLabs.js';
import { researchClinicalStatus } from './researchClinicalStatus.js';
import { buildClinicalResearchStats } from './clinicalResearchStats.js';
import { importedLabFlag } from './labFlags.js';

const draft = { key: 'a1c', value: '8.2', units: '%', collectedDate: '2019-05-10', source: 'Paper chart', referenceRange: '', flag: 'H' };
const context = { today: '2026-10-27', actorId: 'reviewer', id: 'historical-1', enteredAt: '2026-10-27T12:00:00Z' };
test('historical results retain collection date, source, and entry attribution and contribute to dated A1C', () => {
  const lab = prepareHistoricalLab(draft, context);
  assert.equal(lab.collectedDate, '2019-05-10');
  assert.equal(lab.enteredAt, context.enteredAt);
  assert.equal(lab.enteredBy, 'reviewer');
  assert.equal(lab.sourceFileName, 'Paper chart');
  assert.equal(importedLabFlag(lab), 'H');
  assert.deepEqual(researchClinicalStatus({ importedSendOutLabs: [lab] }, '2019-05-10').a1c, ['8.2']);
  assert.deepEqual(researchClinicalStatus({ importedSendOutLabs: [lab] }, '2026-10-27').a1c, []);
  const groups = [{ label: 'DM+ only', rows: [{ patientId: 'p', patientName: 'Patient', date: '2026-10-01', encounter: { id: 'visit', clinicDate: '2026-10-01', inHouseLabs: { core: { a1c: '7.1' } } } }] }];
  const patients = [{ id: 'p', importedSendOutLabs: [lab] }];
  const measure = buildClinicalResearchStats(groups, patients, { startDate: '2019-01-01', endDate: '2026-10-27' })[1].measures.a1c;
  assert.equal(measure.paired, 1);
  assert.equal(measure.baseline, 8.2);
  assert.equal(measure.followup, 7.1);
});
test('historical entry rejects invalid dates, future dates, missing source and nonnumeric results', () => {
  for (const changes of [{ collectedDate: '' }, { collectedDate: '2019-02-30' }, { collectedDate: '2027-01-01' }, { source: ' ' }, { value: 'unknown' }, { key: 'missing' }]) {
    assert.throws(() => prepareHistoricalLab({ ...draft, ...changes }, context));
  }
});
test('duplicate detection checks patient and encounter labs and allows different dates', () => {
  const lab = prepareHistoricalLab(draft, context);
  assert.equal(hasHistoricalLabDuplicate({ importedSendOutLabs: [lab] }, lab), true);
  assert.equal(hasHistoricalLabDuplicate({ encounters: [{ imported_send_out_labs: [lab] }] }, lab), true);
  assert.equal(hasHistoricalLabDuplicate({ importedSendOutLabs: [{ ...lab, collectedDate: '2020-01-01' }] }, lab), false);
});
