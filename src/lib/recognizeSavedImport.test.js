import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeSavedImport } from './recognizeSavedImport.js';
const packet = { packetId: 'rerun', collectedDate: '2026-10-01', sourceDocument: { id: 'document' } };
const lab = { key: 'glucose', displayName: 'Glucose', value: '90', unit: 'mg/dL', sourcePage: 1 };
const saved = { ...lab, value: 90, collectedDate: '2026-10-01', sourceDocumentId: 'document', sourceImportPacketId: 'original' };

test('recognizes saved work after a partial save or rerun without requiring pages again', () => {
  const result = recognizeSavedImport([lab, { ...lab, key: 'albumin', value: 4, sourcePage: 2 }], packet,
    [{ id: 'visit', imported_send_out_labs: [saved] }], 'visit');
  assert.deepEqual([...result.matchedIndexes], [0]);
  assert.deepEqual(result.completedPages, [1]);
});

test('changed values and incomplete pages remain reviewable', () => {
  const result = recognizeSavedImport([lab, { ...lab, value: '95' }], packet,
    [{ id: 'visit', imported_send_out_labs: [saved] }], 'visit');
  assert.deepEqual([...result.matchedIndexes], [0]);
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(result.completedPages, []);
});

test('recognizes the same document under another visit but never an unrelated report', () => {
  const visits = [{ id: 'target', imported_send_out_labs: [] }, { id: 'other', imported_send_out_labs: [saved] }];
  assert.equal(recognizeSavedImport([lab], packet, visits, 'target').matchedIndexes.size, 1);
  assert.equal(recognizeSavedImport([lab], { ...packet, sourceDocument: { id: 'different' } }, visits, 'target').matchedIndexes.size, 0);
  assert.equal(recognizeSavedImport([lab], packet, visits, null).matchedIndexes.size, 0);
});
