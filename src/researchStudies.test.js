import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchReport } from './researchAnalytics.js';
import { buildResearchStudies } from './researchStudies.js';

const visit = (id, clinicDate, extra = {}) => ({ id, clinicDate, visitType: 'general', ...extra });
const build = (patients, end = '2026-04-01', event = '') => buildResearchStudies(buildResearchReport(patients, '2026-01-01', end, event));

test('return frequency counts distinct later dates and assigns each patient once by diagnosis', () => {
  const { returnPatterns } = build([
    { id: 'a', encounters: [
      visit('a1', '2026-01-01', { transportation: 'Bus', htn: true, dm: true }),
      visit('a2', '2026-01-01'),
      visit('a3', '2026-01-31', { transportation: 'Car' }),
      visit('a4', '2026-01-31'),
      visit('a5', '2026-02-10'),
      visit('a6', '2026-02-11'),
      visit('a7', '2026-02-12'),
      visit('a8', '2026-02-13'),
    ] },
    { id: 'b', encounters: [visit('b1', '2026-03-30'), visit('b2', '2026-03-31')] },
    { id: 'c', encounters: [visit('c1', '2026-04-01'), visit('c2', '2026-04-02')] },
  ]);
  const { overall, diagnoses } = returnPatterns;
  assert.equal(overall.patients.length, 3);
  assert.equal(overall.returned.length, 2);
  assert.deepEqual(overall.frequency.map(rows => rows.length), [1, 1, 0, 0, 1]);
  assert.equal(overall.frequency[4][0].returnCount, 5);
  assert.equal(diagnoses.find(group => group.label === 'HTN and DM').returned.length, 1);
  assert.equal(diagnoses.flatMap(group => group.patients).length, 3);
});

test('return frequency excludes cancelled, specialty, refill, and other-event returns', () => {
  const data = build([{ id: 'a', encounters: [visit('a', '2026-01-01'), visit('r', '2026-01-02', { visitType: 'refill_only' }), visit('s', '2026-01-03', { visitType: 'specialty_only' }), visit('c', '2026-01-04', { status: 'cancelled' }), visit('e', '2026-01-05', { clinicEvent: 'womens_health_day' })] }]);
  assert.equal(data.returnPatterns.overall.patients.length, 1);
  assert.equal(data.returnPatterns.overall.returned.length, 0);
  assert.equal(data.pharmacyRows.length, 2);
});

test('workflow reports median, nearest-rank p90, missing and invalid separately with aliases', () => {
  const encounters = [10, 20, 30, 100].map((minutes, i) => visit(`v${i}`, '2026-01-01', { created_at: '2026-01-01T12:00:00Z', leadership_intake_completed_at: new Date(Date.parse('2026-01-01T12:00:00Z') + minutes * 60000).toISOString() }));
  encounters.push(visit('missing', '2026-01-01'), visit('invalid', '2026-01-01', { createdAt: 'bad', leadershipIntakeCompletedAt: 'bad' }), visit('cancelled', '2026-01-01', { status: 'cancelled' }));
  const data = build([{ id: 'a', encounters }]);
  const stage = data.stages[0];
  assert.equal(stage.valid, 4);
  assert.equal(stage.median, 25);
  assert.equal(stage.p90, 100);
  assert.equal(stage.missing, 1);
  assert.equal(stage.invalid, 1);
  assert.equal(stage.rows.length, 6);
  assert.equal(data.daily[0].stages[0].median, 25);
});

test('refill patterns count consecutive pairs, distinct patients, and median gaps', () => {
  const data = build([{ id: 'a', encounters: [visit('a', '2026-01-01'), visit('b', '2026-01-11', { visitType: 'refill_only' }), visit('s', '2026-01-15', { visitType: 'specialty_only' }), visit('c', '2026-01-31'), visit('d', '2026-02-10', { visitType: 'refill_only' })] }]);
  const generalRefill = data.transitions.find(g => g.label === 'General → Refill');
  assert.equal(generalRefill.rows.length, 2);
  assert.equal(generalRefill.patients, 1);
  assert.equal(generalRefill.median, 10);
  assert.equal(generalRefill.share, '66.67%');
  assert.equal(data.transitions.find(g => g.label === 'Refill → General').median, 20);
});

test('leadership completion interval starts at registration, including daily summaries', () => {
  const data = build([{ id: 'a', encounters: [visit('a', '2026-01-01', {
    createdAt: '2026-01-01T12:00:00Z',
    undergradCompletedAt: '2026-01-01T12:10:00Z',
    leadershipIntakeCompletedAt: '2026-01-01T12:30:00Z',
  })] }]);
  assert.equal(data.stages[0].label, 'Patient Checked In → Leadership Registration Complete');
  assert.equal(data.stages[0].median, 30);
  assert.equal(data.daily[0].stages[0].median, 30);
  assert.match(data.stages[0].rows[0].researchSource, /12:00:00Z/);
});

test('same-day ambiguity never invents a visit order', () => {
  const data = build([{ id: 'a', encounters: [visit('a', '2026-01-01'), visit('b', '2026-01-02'), visit('c', '2026-01-02', { visitType: 'refill_only' }), visit('d', '2026-01-03')] }]);
  assert.equal(data.ambiguous, 3);
  assert.equal(data.transitions.flatMap(g => g.rows).length, 0);
});

test('future and cancelled diagnoses cannot define historical research cohorts', () => {
  const data = build([{ id: 'a', encounters: [visit('a', '2026-01-01'), visit('c', '2026-02-01', { status: 'cancelled', htn: true }), visit('f', '2026-05-01', { dm: true })] }]);
  assert.equal(data.returnPatterns.diagnoses.find(g => g.label === 'Neither recorded').patients.length, 1);
});

test('empty data and invalid dates produce no fabricated statistics', () => {
  const data = build([{ id: 'a', encounters: [visit('bad', '2026-02-30')] }]);
  assert.equal(data.invalidDates.length, 1);
  assert.equal(data.returnPatterns.overall.patients.length, 0);
  assert.equal(data.stages[0].median, '—');
  assert.equal(data.transitions[0].share, '—');
  assert.equal(data.transitions[0].median, '—');
});
