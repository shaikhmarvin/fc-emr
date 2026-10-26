import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClinicalResearchStats, summarizeClinicalMeasure, filterClinicalPatients, compareClinicalFollowup } from './clinicalResearchStats.js';

test('follow-up comparison uses one latest reading per patient and excludes missing BP from the single-reading group', () => {
  const rows = [
    { days: [{ value: 180 }, { value: 130 }] },
    { days: [{ value: 140 }, { value: 110 }, { value: 120 }] },
    { days: [{ value: 150 }] }, { days: [{ value: 170 }] }, { days: [{ value: 160 }] }, { days: [] },
  ];
  const comparison = compareClinicalFollowup(rows);
  assert.deepEqual(comparison.withFollowup, { count: 2, mean: 125, median: 125, min: 120, max: 130, baseline: 160, change: -35 });
  assert.deepEqual(comparison.withoutFollowup, { count: 3, mean: 160, median: 160, min: 150, max: 170, baseline: 160, change: null });
  assert.equal(comparison.missing, 1);
  assert.equal(filterClinicalPatients(rows, 'single').length, 3);
  assert.deepEqual(compareClinicalFollowup([]).withFollowup, { count: 0, mean: null, median: null, min: null, max: null, baseline: null, change: null });
});

test('summaries weight patients equally and compare only distinct dated follow-up', () => {
  const stats = summarizeClinicalMeasure([
    { patientId: 'a', days: [{ date: '2025-01-01', value: 160 }, { date: '2025-01-11', value: 140 }, { date: '2025-01-21', value: 120 }] },
    { patientId: 'b', days: [{ date: '2025-01-01', value: 180 }] },
    { patientId: 'c', days: [] },
  ]);
  assert.equal(stats.mean, 150);
  assert.equal(stats.min, 120);
  assert.equal(stats.max, 180);
  assert.equal(stats.missing, 1);
  assert.equal(stats.paired, 1);
  assert.equal(stats.change, -40);
  assert.equal(stats.lower, 1);
  assert.equal(stats.followupDays, 20);
});

test('same-day encounters merge without creating a follow-up and missing values remain missing', () => {
  const rows = [
    { patientId: 'a', date: '2025-01-01', encounter: { id: 1, clinicDate: '2025-01-01', vitalsHistory: [{ bp: '160/100' }, { bp: '140/90' }, { bp: '160/100' }], inHouseLabs: { core: { a1c: '8' } } } },
    { patientId: 'a', date: '2025-01-01', encounter: { id: 2, clinicDate: '2025-01-01', vitalsHistory: [{ bp: '140/90' }] } },
    { patientId: 'b', date: '2025-01-01', encounter: { id: 3, clinicDate: '2025-01-01', inHouseLabs: { core: { a1c: 'pending' } } } },
  ];
  const [cohort, dmCohort] = buildClinicalResearchStats([{ label: 'HTN+ and DM+', rows }]);
  assert.equal(cohort.measures.systolic.mean, 150);
  assert.equal(cohort.measures.diastolic.mean, 95);
  assert.equal(cohort.measures.systolic.paired, 0);
  assert.equal(cohort.measures.systolic.followupComparison.withFollowup.count, 0);
  assert.equal(cohort.measures.diastolic.followupComparison.withoutFollowup.count, 1);
  assert.equal(dmCohort.measures.a1c.mean, 8);
  assert.equal(dmCohort.measures.a1c.missing, 1);
});

test('DM change is in percentage points and outside-filter encounters cannot contribute', () => {
  const rows = [8, 7].map((value, index) => ({ patientId: 'a', date: `2025-0${index + 1}-01`, encounter: { id: index, clinicDate: `2025-0${index + 1}-01`, inHouseLabs: { core: { a1c: value } } } }));
  const [, cohort] = buildClinicalResearchStats([{ label: 'DM+ only', rows }]);
  assert.equal(cohort.measures.a1c.change, -1);
  assert.equal(cohort.measures.a1c.paired, 1);
  assert.equal(cohort.measures.systolic, undefined);
  assert.equal(summarizeClinicalMeasure([]).mean, null);
});

test('outcomes pool single and dual diagnoses and count each patient once', () => {
  const row = (patientId, bp, a1c) => ({ patientId, date: '2025-01-01', encounter: { id: patientId, clinicDate: '2025-01-01', vitalsHistory: [{ bp }], inHouseLabs: { core: { a1c } } } });
  const dual = row('both', '160/100', 10);
  const cohorts = buildClinicalResearchStats([
    { label: 'HTN+ only', rows: [row('htn', '120/80', 5), dual] },
    { label: 'DM+ only', rows: [row('dm', '110/70', 6)] },
    { label: 'HTN+ and DM+', rows: [dual] },
    { label: 'Neither recorded', rows: [row('neither', '200/120', 14)] },
  ]);
  assert.deepEqual(cohorts.map(c => c.label), ['All HTN patients', 'All DM patients']);
  assert.equal(cohorts[0].measures.systolic.total, 2);
  assert.equal(cohorts[0].measures.systolic.mean, 140);
  assert.equal(cohorts[0].measures.diastolic.mean, 90);
  assert.equal(cohorts[1].measures.a1c.total, 2);
  assert.equal(cohorts[1].measures.a1c.mean, 8);
  assert.equal(cohorts[0].measures.a1c, undefined);
  assert.equal(cohorts[1].measures.systolic, undefined);
});

test('detail filters match summary counts, including missing and missing follow-up', () => {
  const series = [
    { patientId: 'missing', days: [] },
    { patientId: 'single', days: [{ date: '2025-01-01', value: 8 }] },
    ...[-1, 0, 1].map(delta => ({ patientId: String(delta), days: [{ date: '2025-01-01', value: 8 }, { date: '2025-02-01', value: 8 + delta }] })),
  ];
  const summary = summarizeClinicalMeasure(series);
  for (const [filter, count] of [['all', summary.total], ['missing', summary.missing], ['available', summary.available], ['paired', summary.paired], ['noFollowup', summary.total - summary.paired], ['lower', summary.lower], ['unchanged', summary.unchanged], ['higher', summary.higher]]) {
    assert.equal(filterClinicalPatients(summary.series, filter).length, count, filter);
  }
  assert.deepEqual(filterClinicalPatients(series, 'missing').map(item => item.patientId), ['missing']);
  assert.deepEqual(filterClinicalPatients(series, 'noFollowup').map(item => item.patientId), ['missing', 'single']);
});
