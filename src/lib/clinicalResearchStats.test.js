import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClinicalResearchStats, summarizeClinicalMeasure } from './clinicalResearchStats.js';

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
  const [cohort] = buildClinicalResearchStats([{ label: 'HTN+ and DM+', rows }]);
  assert.equal(cohort.measures.systolic.mean, 150);
  assert.equal(cohort.measures.diastolic.mean, 95);
  assert.equal(cohort.measures.systolic.paired, 0);
  assert.equal(cohort.measures.a1c.mean, 8);
  assert.equal(cohort.measures.a1c.missing, 1);
});

test('DM change is in percentage points and outside-filter encounters cannot contribute', () => {
  const rows = [8, 7].map((value, index) => ({ patientId: 'a', date: `2025-0${index + 1}-01`, encounter: { id: index, clinicDate: `2025-0${index + 1}-01`, inHouseLabs: { core: { a1c: value } } } }));
  const [cohort] = buildClinicalResearchStats([{ label: 'DM+ only', rows }]);
  assert.equal(cohort.measures.a1c.change, -1);
  assert.equal(cohort.measures.a1c.paired, 1);
  assert.equal(cohort.measures.systolic, undefined);
  assert.equal(summarizeClinicalMeasure([]).mean, null);
});
