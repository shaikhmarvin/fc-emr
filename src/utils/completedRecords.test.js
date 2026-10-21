import test from 'node:test';
import assert from 'node:assert/strict';
import { isCompletedRecordForExport, filterRecordTypes } from './completedRecords.js';
import { buildCompletedRecordsPdf, printCompletedRecordsPdf } from './pdfGenerator.js';
const eye = {id:'eye', noteType:'ophthalmology', clinicDate:'2026-10-21', soapStatus:'completed', ophthalmologyNote:{hpi:'Vision concerns', ocularHistory:'No surgery', vaOd:'20/30', vaOs:'20/40', assessment:'Eye assessment', plan:'Eye follow up'}};
test('note type selection can include ophthalmology alone or exclude social work', () => {
  const rows = [eye, {noteType:'social_work'}, {noteType:'medical'}, {noteType:'physical_therapy'}, {specialtyType:'ophthalmology'}].map(encounter => ({encounter}));
  assert.deepEqual(filterRecordTypes(rows, ['ophthalmology']), [rows[0], rows[4]]);
  assert.deepEqual(filterRecordTypes(rows, ['medical', 'physical_therapy', 'ophthalmology']), [rows[0], rows[2], rows[3], rows[4]]);
  assert.deepEqual(filterRecordTypes(rows, []), []);
});
test('hole punch margins are maintained on every page of a long note', async () => {
  const doc = await buildCompletedRecordsPdf({rows:[{patient:{firstName:'Test'}, encounter:{...eye, ophthalmologyNote:{...eye.ophthalmologyNote,hpi:'History for pagination. '.repeat(1500)}}}]});
  const scale = doc.internal.scaleFactor;
  const topLimit = doc.internal.pageSize.getHeight() * scale - 22 * scale;
  for (const page of doc.internal.pages.slice(1)) {
    const positions = [...page.join('\n').matchAll(/([\d.]+) ([\d.]+) Td/g)];
    assert.ok(positions.length > 0);
    for (const [, x, y] of positions) {
      assert.ok(Number(x) >= 25.4 * scale - 0.01, 'text stays clear of the left edge');
      assert.ok(Number(y) <= topLimit + 0.01, 'text stays clear of the top edge');
    }
  }
});
test('final eye notes export on the selected day; drafts, reopened and cancelled notes do not', () => {
  assert.equal(isCompletedRecordForExport(eye, '2026-10-21'), true);
  assert.equal(isCompletedRecordForExport(eye, '2026-10-20'), false);
  assert.equal(isCompletedRecordForExport(eye), true);
  assert.equal(isCompletedRecordForExport({...eye, soapStatus:'draft', attendingSignedAt:'old-signature'}), false);
  assert.equal(isCompletedRecordForExport({...eye, status:'cancelled'}), false);
  assert.equal(isCompletedRecordForExport({specialtyType:'ophthalmology', soapStatus:'completed'}), true);
  assert.equal(isCompletedRecordForExport({noteType:'medical', soapStatus:'signed'}), true);
  assert.equal(isCompletedRecordForExport({noteType:'physical_therapy', disciplineNoteStatus:'completed'}), true);
});
test('combined PDF includes every eye exam section and starts each patient on a new page', async () => {
  const doc = await buildCompletedRecordsPdf({rows:[{patient:{firstName:'Test', lastName:'One'}, encounter:eye}, {patient:{firstName:'Test', lastName:'Two'}, encounter:{...eye,id:'eye2'}}]});
  const text = doc.output();
  for (const value of ['Ophthalmology Note', 'Vision concerns', 'No surgery', '20/30', '20/40', 'Eye assessment', 'Eye follow up', 'Test One', 'Test Two']) assert.ok(text.includes(value), value);
  assert.equal(doc.getNumberOfPages(), 2);
});
test('long eye notes paginate without losing their final lines', async () => {
  const doc = await buildCompletedRecordsPdf({rows:[{patient:{firstName:'Test'}, encounter:{...eye, ophthalmologyNote:{...eye.ophthalmologyNote, hpi:'Long eye history. '.repeat(1600)+'End of history.'}}}]});
  assert.ok(doc.getNumberOfPages() > 2);
  assert.ok(doc.output().includes('End of history.'));
  assert.ok(doc.output().includes('continued'));
  await assert.rejects(buildCompletedRecordsPdf({rows:[]}), /no completed notes/i);
});
test('printing opens a PDF with a print action and releases it after closing', async (t) => {
  let pdfBlob;
  let cleanup;
  let released = false;
  let destination;
  t.mock.method(URL, 'createObjectURL', blob => { pdfBlob = blob; return 'blob:test-print'; });
  t.mock.method(URL, 'revokeObjectURL', url => { assert.equal(url, 'blob:test-print'); released = true; });
  t.mock.method(globalThis, 'setInterval', callback => { cleanup = callback; return 1; });
  t.mock.method(globalThis, 'clearInterval', () => {});
  const printWindow = {closed:false, location:{replace: url => { destination = url; }}};
  const args = {rows:[{patient:{firstName:'Test'}, encounter:eye}], printWindow};
  await printCompletedRecordsPdf(args);
  assert.equal(destination, 'blob:test-print');
  assert.equal(pdfBlob.type, 'application/pdf');
  assert.ok((await pdfBlob.text()).includes('/Print'));
  cleanup();
  assert.equal(released, false);
  printWindow.closed = true;
  cleanup();
  assert.equal(released, true);
  await assert.rejects(printCompletedRecordsPdf(args), /print window was closed/i);
});
