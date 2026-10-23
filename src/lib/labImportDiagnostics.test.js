import test from 'node:test';
import assert from 'node:assert/strict';
import { captureImportBaseline, labBaseline, buildLabDiagnostics } from './labImportDiagnostics.js';

function lab(id, changes = {}) {
  return { sourceResultId: id, sourcePage: 1, key: 'glucose', displayName: 'Glucose', value: 90,
    unit: 'mg/dL', referenceRangeText: '65 - 115', ...changes };
}
const packet = labs => ({ packetId: 'packet', labs, sourceDocument: { runId: 'run', pages: [{ pageNumber: 1 }] } });

test('verification clicks alone do not count as adjusted lab values', () => {
  const initial = captureImportBaseline(lab('one'));
  const verified = { ...initial, _qaOriginal: labBaseline(initial), _qaAction: 'edited', sourceReviewed: true };
  const report = buildLabDiagnostics({ packets: [packet([verified])] });
  assert.equal(report.overview.reviewerModifiedLabs, 0);
  assert.equal(report.overview.verifiedLabs, 1);
  assert.equal(report.overview.reviewerCorrectionRate, 0);
});

test('one lab changed in several fields counts once and retains each before/after value', () => {
  const initial = captureImportBaseline(lab('one'));
  const edited = { ...initial, _qaOriginal: labBaseline(initial), value: 95, unit: 'mmol/L', manualFlag: 'H' };
  const report = buildLabDiagnostics({ packets: [packet([edited])] });
  const summary = report.packets[0].summary;
  assert.equal(summary.reviewerModifiedLabs, 1);
  assert.equal(summary.fieldChangeCounts.value, 1);
  assert.equal(summary.fieldChangeCounts.unit, 1);
  assert.equal(summary.fieldChangeCounts.manualFlag, 1);
  assert.deepEqual(report.packets[0].labs[0].reviewerChanges.value, { before: 90, after: 95 });
});

test('import-time adjustments, human edits, additions and removals remain separate', () => {
  const initial = captureImportBaseline(lab('one', { value: 115 }));
  const repaired = { ...initial, value: 90 };
  const reviewed = { ...repaired, _qaOriginal: labBaseline(repaired), sourceReviewed: true };
  const added = lab('new', { key: 'albumin', value: 4.6, _qaAction: 'added' });
  const removed = lab('removed', { key: 'rdw_sd', value: 42 });
  const report = buildLabDiagnostics({ packets: [packet([reviewed, added])],
    traces: { run: { initialPackets: [{ labs: [initial, removed] }] } } });
  assert.equal(report.overview.automaticAdjustedLabs, 1);
  assert.equal(report.overview.reviewerModifiedLabs, 0);
  assert.equal(report.overview.manuallyAddedLabs, 1);
  assert.equal(report.overview.removedLabs, 1);
});

test('selected packet exports immediate edits before the debounced save', () => {
  const initial = captureImportBaseline(lab('one'));
  const report = buildLabDiagnostics({ packets: [packet([initial])], reviewState: { packetId: 'packet',
    labs: [{ ...initial, value: 100, _qaOriginal: labBaseline(initial) }] } });
  assert.equal(report.packets[0].labs[0].value, 100);
  assert.equal(report.overview.reviewerModifiedLabs, 1);
});

test('missing traces/baselines are explicit and unrelated chart notes are not exported', () => {
  const item = { ...packet([lab('old')]), confirmedPatient: { id: 'patient', firstName: 'Example',
    encounters: [{ notes: 'unrelated private notes' }] } };
  const report = buildLabDiagnostics({ packets: [item], auditError: 'Unavailable' });
  assert.equal(report.pipelineRuns[0].available, false);
  assert.equal(report.overview.baselineUnavailableLabs, 1);
  assert.equal(report.overview.reviewerCorrectionRate, null);
  assert.equal(report.packets[0].removalHistoryAvailability.originalTraceAvailable, false);
  assert.equal(JSON.stringify(report).includes('unrelated private notes'), false);
});

test('deletion events do not double-count a result already missing from the initial trace', () => {
  const original = captureImportBaseline(lab('removed'));
  const report = buildLabDiagnostics({ packets: [packet([])], traces: { run: { initialPackets: [{ labs: [original] }] } },
    reviewState: { deletedByPacket: { packet: [{ action: 'deleted', lab: original }] } } });
  assert.equal(report.overview.removedLabs, 1);
});
