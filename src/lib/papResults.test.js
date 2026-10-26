import test from 'node:test';
import assert from 'node:assert/strict';
import { PAP_NILM, normalizePapLab, parsePapReport, latestPapHistory } from './papResults.js';
import { parseResultCell } from './labDocument.js';

test('Pap interpretation is preserved in full with no units and never assumed for abnormal or missing results', () => {
  const lab = normalizePapLab({ displayName: 'Pap Test', value: 'Negative', rawLine: PAP_NILM, unit: 'mg/dL' });
  assert.equal(lab.value, PAP_NILM);
  assert.equal(lab.unit, '');
  assert.equal(lab.key, 'pap_smear');
  assert.equal(normalizePapLab({ displayName: 'Pap Test', value: 'ASC-US' }).value, 'ASC-US');
  assert.equal(normalizePapLab({ displayName: 'Pap Test', value: '' }).value, '');
  assert.equal(parseResultCell(PAP_NILM).value, PAP_NILM);
});

test('narrative Pap reports read a stated result and do not copy a reference interpretation', () => {
  assert.equal(parsePapReport('Pap Test\nInterpretation: Negative for intraepithelial\nlesion or malignancy')[0].value, PAP_NILM);
  assert.equal(parsePapReport('Pap Test\nInterpretation: ASC-US\nReference: ' + PAP_NILM)[0].value, 'ASC-US');
  assert.equal(parsePapReport('Pap Test\nInterpretation\nUnsatisfactory For Evaluation\nElectronically signed by reviewer')[0].value, 'Unsatisfactory For Evaluation');
  const abnormal = parsePapReport('Pap Test\nInterpretation (Abnormal)\nAtypical squamous cells of undetermined significance\nElectronically signed by reviewer')[0];
  assert.equal(abnormal.value, 'Atypical squamous cells of undetermined significance');
  assert.equal(abnormal.reportedFlag, 'A');
  assert.equal(parsePapReport('Glucose\n' + PAP_NILM).length, 0);
});

test('intake Pap history uses collection date, keeps abnormal wording and does not mix HPV into cytology', () => {
  const patient = { encounters: [
    { clinicDate: '2026-10-24', importedSendOutLabs: [{ key: 'pap_smear', value: PAP_NILM, collectedDate: '2024-03-07' }, { key: 'hpv', value: 'Negative', collectedDate: '2026-10-24' }] },
    { clinicDate: '2025-04-12', importedSendOutLabs: [{ displayName: 'Pap Smear', value: 'ASC-US' }] },
  ] };
  const latest = latestPapHistory(patient);
  assert.equal(latest.date, '2025-04-12');
  assert.deepEqual(latest.results, ['ASC-US']);
  assert.equal(latest.dateSource, 'visit');
  assert.equal(latestPapHistory(null), null);
});
