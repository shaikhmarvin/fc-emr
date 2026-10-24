import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChartLabs } from './mergeChartLabs.js';

const lab = changes => ({ key: 'glucose', displayName: 'Glucose', value: 90, unit: 'mg/dL', collectedDate: '2026-10-14', sourceDocumentId: 'file', sourceImportPacketId: 'packet', ...changes });

test('same file with new packet IDs or OCR row order cannot duplicate a saved result', () => {
  const original = lab({ manualFlag: '', sourceReviewed: true });
  const result = mergeChartLabs([original], [lab({ value: '90.0', sourceImportPacketId: 'rerun', sourceRowId: 'new-row', manualFlag: 'H' })]);
  assert.equal(result.labs.length, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.labs[0], original);
  assert.equal(result.labs[0].manualFlag, '');
});

test('reruns that miss rows preserve all old results and append only newly found tests', () => {
  const previous = [lab({}), lab({ key: 'albumin', value: 4.6, unit: 'g/dL' })];
  const result = mergeChartLabs(previous, [lab({ key: 'rdw_sd', value: 42, unit: 'fL' })]);
  assert.equal(result.labs.length, 3);
  assert.deepEqual(result.labs.slice(0, 2), previous);
  assert.equal(mergeChartLabs(previous, []).labs.length, 2);
});

test('a changed OCR value blocks saving instead of replacing or duplicating it', () => {
  const existing = [lab({})];
  assert.throws(() => mergeChartLabs(existing, [lab({ value: 900 })]), /different saved result/);
  assert.equal(existing[0].value, 90);
});

test('new dates/files remain separate and retrying a packet with old metadata stays idempotent', () => {
  assert.equal(mergeChartLabs([lab({})], [lab({ collectedDate: '2026-10-21' })]).added, 1);
  assert.equal(mergeChartLabs([lab({})], [lab({ sourceDocumentId: 'another', sourceImportPacketId: 'another' })]).added, 1);
  const old = lab({ sourceDocumentId: undefined });
  assert.equal(mergeChartLabs([old], [lab({})], ['packet']).skipped, 1);
});

test("exact dated legacy repeats are skipped while incomplete repeats still need review", () => {
  const original = lab({ sourceDocumentId: undefined, sourceImportPacketId: undefined });
  const result = mergeChartLabs([original], [lab({})]);
  assert.equal(result.skipped, 1);
  assert.equal(result.labs[0], original);
  assert.throws(() => mergeChartLabs([{ ...original, collectedDate: "" }], [lab({ collectedDate: "" })]), /matching older result/);
});

test('the same source result already saved under another visit is not copied to this visit', () => {
  const existingVisit = [lab({ key: 'albumin', value: 4.6, unit: 'g/dL', sourceDocumentId: 'older-file' })];
  const otherVisit = [lab({ sourceImportPacketId: 'original' })];
  const merged = mergeChartLabs(existingVisit, [lab({ sourceImportPacketId: 'rerun' })], ['rerun'], otherVisit);
  assert.equal(merged.skipped, 1);
  assert.deepEqual(merged.labs, existingVisit);
  assert.equal(otherVisit.length, 1);
});

test('unique same-value repeats with incomplete metadata preserve the saved result', () => {
  for (const missing of [{ collectedDate: '' }, { unit: '' }, { unit: '', collectedDate: '' }]) {
    const original = lab({ key: 'free_t4', value: 1.2, ...missing });
    const result = mergeChartLabs([original], [lab({ key: 'free_t4', value: '1.20', sourceImportPacketId: 'rerun' })]);
    assert.equal(result.skipped, 1);
    assert.equal(result.added, 0);
    assert.equal(result.labs[0], original);
  }
});

test('incomplete metadata still blocks changed values and multiple possible matches', () => {
  assert.throws(() => mergeChartLabs([lab({ unit: '' })], [lab({ value: 95 })]), /cannot be matched safely/);
  assert.throws(() => mergeChartLabs([lab({ unit: '' }), lab({ collectedDate: '' })], [lab({})]), /cannot be matched safely/);
});

test('known dates or units distinguish results despite another missing field', () => {
  assert.equal(mergeChartLabs([lab({ unit: '' })], [lab({ collectedDate: '2026-10-21' })]).added, 1);
  assert.equal(mergeChartLabs([lab({ collectedDate: '' })], [lab({ unit: 'mmol/L' })]).added, 1);
});
