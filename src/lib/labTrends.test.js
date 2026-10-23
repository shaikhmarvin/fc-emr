import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabTrendSeries, trendNumber, trendChange, trendSegments, labDateForTrend } from './labTrends.js';

const result = (dateKey, value, options = {}) => ({ analyte: 'Glucose', analyteKey: 'glucose', unitText: 'mg/dL', dateKey, value, ...options });

test('series span visits in chronological order and show the actual numeric change', () => {
  const [series] = buildLabTrendSeries([result('2026-10-14', 100), result('2026-09-30', 90), result('2026-10-07', 95)]);
  assert.deepEqual(series.entries.map(entry => entry.value), [90, 95, 100]);
  assert.equal(trendChange(series.entries).delta, 5);
  assert.equal(trendChange(series.entries).previous.dateKey, '2026-10-07');
  assert.equal(series.entries[2].timestamp - series.entries[0].timestamp, 14 * 86400000);
});

test('different units, RDW tests, and hepatitis antibody classes never share series', () => {
  const series = buildLabTrendSeries([
    result('2026-10-14', 90), result('2026-10-07', 5, { unitText: 'mmol/L' }),
    result('2026-10-14', 42, { analyte: 'RDW-SD', analyteKey: 'rdw_sd', unitText: 'fL' }),
    result('2026-10-14', 13, { analyte: 'RDW-CV', analyteKey: 'rdw', unitText: '%' }),
    result('2026-10-14', 'Reactive', { analyte: 'Hepatitis A', analyteKey: 'hepatitis_a_igg', unitText: '' }),
    result('2026-10-14', 'Non-Reactive', { analyte: 'Hepatitis A', analyteKey: 'hepatitis_a_igm', unitText: '' }),
  ]);
  assert.equal(series.length, 6);
});

test('text, bounds and genotypes remain literal and interrupt numeric trend lines', () => {
  const [series] = buildLabTrendSeries([result('2026-09-30', 90), result('2026-10-07', '<100'), result('2026-10-14', 95)]);
  assert.equal(trendNumber('<100'), null);
  assert.equal(trendNumber('Not Detected'), null);
  assert.equal(trendNumber(0), 0);
  assert.equal(series.entries[1].value, '<100');
  assert.equal(trendChange(series.entries), null);
  assert.deepEqual(trendSegments(series.entries).map(segment => segment.length), [1, 1]);
  const [genotype] = buildLabTrendSeries([result('2026-10-14', '1', { resultType: 'categorical' })]);
  assert.equal(genotype.entries[0].numeric, null);
});

test('multiple results on the same date remain visible without an arbitrary change or vertical trend line', () => {
  const [series] = buildLabTrendSeries([result('2026-10-07', 90), result('2026-10-14', 100), result('2026-10-14', 110)]);
  assert.equal(series.entries.length, 3);
  assert.equal(trendChange(series.entries), null);
  assert.ok(trendSegments(series.entries).every(segment => segment.length === 1));
});

test('collection dates take priority over the encounter that received an import', () => {
  assert.deepEqual(labDateForTrend({ collectedDate: '2026-09-30' }, { clinicDate: '2026-10-14' }), { value: '2026-09-30', source: 'collection' });
  assert.deepEqual(labDateForTrend({}, { clinicDate: '2026-10-14' }), { value: '2026-10-14', source: 'visit' });
});

test('invalid dates are retained in history without a plotted timestamp', () => {
  const [series] = buildLabTrendSeries([result('', 90), result('2026-02-31', 95)]);
  assert.ok(series.entries.every(entry => entry.timestamp === null));
  assert.equal(trendChange(series.entries), null);
});

test('the same source result in multiple visits is counted once while different files remain separate', () => {
  const [series] = buildLabTrendSeries([
    result('2026-10-14', 90, { sourceDocumentId: 'one', sourceResultId: 'page-1:0' }),
    result('2026-10-14', 90, { sourceDocumentId: 'one', sourceResultId: 'page-1:0' }),
    result('2026-10-07', 100, { sourceDocumentId: 'two', sourceResultId: 'page-1:0' }),
  ]);
  assert.equal(series.entries.length, 2);
});
