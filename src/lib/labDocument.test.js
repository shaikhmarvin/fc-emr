import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageRows, parseLayoutResults, parseResultCell, mergeDocumentPackets, labsReadyToSave, markRepeatedDocumentResults, documentIdentity } from './labDocument.js';

function word(text, x, y, confidence = 0.99) {
  return { text, box: { x, y, width: text.length * 0.006, height: 0.012 }, confidence };
}
function pageFixture() {
  const words = [word('Value', 0.60, 0.2), word('Range', 0.8, 0.2),
    word('Albumin', 0.08, 0.23), word('4.6', 0.60, 0.23), word('3.5 - 5.2', 0.8, 0.23), word('g/dL', 0.9, 0.23),
    word('Direct Bilirubin', 0.08, 0.26), word('<0.2', 0.60, 0.26), word('0 - 0.2', 0.8, 0.26), word('mg/dL', 0.9, 0.26),
    word('Outside Test', 0.08, 0.29), word('Positive', 0.60, 0.29, 0.6), word('Negative', 0.8, 0.29)];
  return { pageNumber: 2, method: 'ocr', rows: buildPageRows(words.reverse()) };
}

test('positioned rows preserve result/range association regardless of OCR block order', () => {
  const page = pageFixture();
  const labs = parseLayoutResults(page);
  assert.equal(labs.length, 3);
  assert.equal(labs[0].value, 4.6);
  assert.equal(labs[0].referenceRangeText, '3.5 - 5.2');
  assert.equal(labs[0].unit, 'g/dL');
  assert.equal(labs[1].value, '<0.2');
  assert.equal(labs[1].sourcePage, 2);
  assert.ok(labs[1].sourceBox);
  assert.equal(labs[2].value, 'Positive');
  assert.equal(labs[2].custom, true);
  assert.equal(labs[2].suspicious, true);
  assert.equal(labs[2].sourceReviewed, false);
});

test('positioned rows preserve high values instead of choosing a plausible reference value', () => {
  const rows = buildPageRows([word('Result', .6, .2), word('Units', .72, .2), word('Reference', .85, .2),
    word('Glucose', .08, .23), word('410', .6, .23), word('H', .65, .23), word('mg/dL', .72, .23), word('65 - 115', .85, .23)]);
  const [lab] = parseLayoutResults({ rows, pageNumber: 1, method: 'pdf_text' });
  assert.equal(lab.value, 410);
  assert.equal(lab.reportedFlag, 'H');
  assert.equal(lab.unit, 'mg/dL');
  assert.equal(lab.referenceRangeText, '65 - 115');
});

test('numeric and qualitative cells preserve their meaning', () => {
  for (const value of ['<0.2', '>=90', '<=3']) assert.equal(parseResultCell(value).value, value);
  assert.equal(parseResultCell('≤ 0.2').value, '<=0.2');
  assert.equal(parseResultCell('Non-Reactive').value, 'Non-Reactive');
  assert.equal(parseResultCell('0.0 - 1.0'), null);
  assert.equal(parseResultCell('Collected 10/14/2026'), null);
});

function packet(overrides = {}) {
  return { extractedPatientName: 'Test Person', extractedDob: '1970-01-01', collectedDate: '2026-10-14',
    rawText: 'Patient Test Person MRN: 123-45-67', labs: [{ value: 1 }], sourceDocument: { pages: [{ pageNumber: 1 }] }, ...overrides };
}
test('merge pages only for consistent identity and collection date', () => {
  assert.equal(mergeDocumentPackets([packet(), packet()]).length, 1);
  for (const changes of [
    { collectedDate: '2026-10-07' },
    { extractedDob: '1980-01-01' }, { extractedPatientName: 'Different Person' },
    { rawText: 'Patient Test Person MRN: 999-99-99' },
  ]) assert.equal(mergeDocumentPackets([packet(), packet(changes)]).length, 2);
  assert.equal(mergeDocumentPackets([packet({ extractedPatientName: '', extractedDob: '', rawText: '' }),
    packet({ extractedPatientName: '', extractedDob: '', rawText: '' })]).length, 2);
});

test('blank and placeholder values never become chart results', () => {
  assert.deepEqual(labsReadyToSave([{ value: null }, { value: '' }, { value: { value: null } }, { value: 0 }, { value: '<0.2' }]),
    [{ value: 0 }, { value: '<0.2' }]);
});

test('skewed word baselines form one row without merging neighboring rows', () => {
  const angle = 0.05;
  const words = [word('Test', .1, .2), word('90', .6, .225), word('Next', .1, .25), word('80', .6, .275)]
    .map(item => ({ ...item, angle }));
  const rows = buildPageRows(words);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, 'Test 90');
  assert.equal(rows[1].text, 'Next 80');
});

test('repeated rows are flagged without discarding conflicting or repeated results', () => {
  const rows = [{ key: 'glucose', value: 90, unit: 'mg/dL' },
    { key: 'glucose', value: 90, unit: 'mg/dL' }, { key: 'glucose', value: 410, unit: 'mg/dL' }];
  const marked = markRepeatedDocumentResults(rows);
  assert.equal(marked.length, 3);
  assert.equal(marked[1].duplicateType, 'same_encounter');
  assert.equal(marked[1].suspicious, true);
  assert.equal(marked[2].value, 410);
  assert.equal(rows[1].suspicious, undefined);
});

test('MRNs stop at the end of an identifier and conflicting identities stay distinct', () => {
  assert.deepEqual(documentIdentity('MRN: 123-45-67 Blood Specimen\nMRN: 123-45-67'), ['1234567']);
  assert.equal(documentIdentity('MRN: 123-45-67\nMRN: 999-99-99').length, 2);
});


test('continuation pages merge with missing collection date and shortened patient name', () => {
  const merged = mergeDocumentPackets([
    packet({ packetId: 'page-1', extractedPatientName: 'Test Middle Person', sourceDocument: { id: 'file', pages: [{ pageNumber: 1 }] } }),
    packet({ packetId: 'page-2', extractedPatientName: 'Test Person', extractedDob: '', collectedDate: '', sourceDocument: { id: 'file', pages: [{ pageNumber: 2 }] } }),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].collectedDate, '2026-10-14');
  assert.deepEqual(merged[0].memberPacketIds, ['page-1', 'page-2']);
  assert.deepEqual(merged[0].sourceDocument.pages.map(page => page.pageNumber), [1, 2]);
  assert.equal(merged[0].labs.length, 2);
});

test('undated pages cannot bridge two dated reports for the same patient', () => {
  const merged = mergeDocumentPackets([
    packet({ packetId: 'undated', collectedDate: '' }),
    packet({ packetId: 'first', collectedDate: '2026-10-07' }),
    packet({ packetId: 'second', collectedDate: '2026-10-14' }),
  ]);
  assert.equal(merged.length, 3);
});

test('undated header preceding a dated continuation stays in the same packet', () => {
  const merged = mergeDocumentPackets([
    packet({ packetId: 'header', collectedDate: '' }),
    packet({ packetId: 'result', collectedDate: '2026-10-14' }),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].collectedDate, '2026-10-14');
  assert.equal(merged[0].memberPacketIds.length, 2);
});

test('persisted combined result arrays are deduplicated by source result identity', () => {
  const labs = [{ key: 'glucose', value: 90, sourceResultId: 'first:0' }, { key: 'albumin', value: 4.6, sourceResultId: 'second:0' }];
  const merged = mergeDocumentPackets([packet({ packetId: 'first', labs }), packet({ packetId: 'second', labs })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].labs.length, 2);
  assert.deepEqual(merged[0].memberPacketIds, ['first', 'second']);
  assert.equal(labs[0].collectedDate, undefined);
});

test('saved reports and reports in other files or confirmed charts stay separate', () => {
  assert.equal(mergeDocumentPackets([packet({ reviewStatus: 'saved' }), packet()]).length, 2);
  assert.equal(mergeDocumentPackets([packet({ sourceDocument: { id: 'one' } }), packet({ sourceDocument: { id: 'two' } })]).length, 2);
  assert.equal(mergeDocumentPackets([packet({ confirmedPatient: { id: 'one' } }), packet({ confirmedPatient: { id: 'two' } })]).length, 2);
});
