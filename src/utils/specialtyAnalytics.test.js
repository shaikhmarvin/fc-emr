import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpecialtyAnalytics, hasSpecialtyInterest } from './specialtyAnalytics.js';
const visit = (id, date, extra = {}) => ({ id, clinicDate: date, visitType: 'specialty_only', specialtyType: 'pt', status: 'done', ...extra });
test('specialty use and interest use distinct patients, dated repeats and explicit denominators', () => {
  const data = buildSpecialtyAnalytics([
    { id: 'a', encounters: [visit('1', '2026-09-01', { physicalTherapy: 'Knee pain' }), visit('2', '2026-09-01'), visit('3', '2026-10-01')] },
    { id: 'b', encounters: [visit('4', '2026-09-01', { visitType: 'general', physicalTherapy: 'Maybe' }), visit('5', '2026-09-02', { status: 'cancelled' })] },
    { id: 'c', encounters: [visit('6', '2026-09-01', { visitType: 'general', physicalTherapy: 'No' }), visit('7', '2026-11-01')] },
  ], '2026-09-01', '2026-10-31');
  const pt = data.groups.find(g => g.program === 'Physical Therapy');
  assert.equal(data.patients, 3);
  assert.equal(data.specialtyPatients, 1);
  assert.equal(pt.patients, 1);
  assert.equal(pt.used.length, 3);
  assert.equal(pt.completed.length, 3);
  assert.equal(pt.repeatPatients, 1);
  assert.equal(pt.interestedPatients, 2);
  assert.equal(pt.assessedPatients, 3);
  assert.equal(pt.unmetPatients, 1);
  assert.equal(pt.cancelled.length, 1);
});
test('missing and negative interest do not count; legacy intake fields work', () => {
  for (const value of ['', 'N/A', 'no', 'Not Interested', false, null]) assert.equal(hasSpecialtyInterest(value), false);
  const report = buildSpecialtyAnalytics([{ id: 'p', encounters: [visit('a', '2026-10-01', { specialtyType: '', visitType: 'general', intake_data: { ophthalmology: 'Blurred vision' } })] }]);
  assert.equal(report.groups.find(g => g.program === 'Ophthalmology').interestedPatients, 1);
  assert.equal(report.specialtyPatients, 0);
});
