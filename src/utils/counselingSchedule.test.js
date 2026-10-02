import test from 'node:test';
import assert from 'node:assert/strict';
import { nextWednesday, withCounselingSchedule } from './counselingSchedule.js';
import { specialtyCheckIns } from './specialtyCheckInNotifications.js';

test('weekly date handles Wednesday, week rollover and year rollover', () => {
  assert.equal(nextWednesday('2026-10-02'), '2026-10-07');
  assert.equal(nextWednesday('2026-10-07'), '2026-10-07');
  assert.equal(nextWednesday('2026-10-08'), '2026-10-14');
  assert.equal(nextWednesday('2026-12-31'), '2027-01-06');
});
test('counseling defaults on, can be turned off, and does not change other specialties', () => {
  const other = { program_type: 'Physical Therapy', next_specialty_date: '2026-10-09' };
  assert.deepEqual(withCounselingSchedule([{ program_type: 'Counseling' }, other], '2026-10-02'), [{ program_type: 'Counseling', next_specialty_date: '2026-10-07' }, other]);
  assert.equal(withCounselingSchedule([{ program_type: 'Counseling', counseling_enabled: false }], '2026-10-07')[0].next_specialty_date, '');
});
test('counseling role receives counseling check-ins without a checkbox', () => {
  const rows = [{ encounter: { id: 'c', specialtyType: 'counseling', visitType: 'specialty_only', clinicDate: '2026-10-07', status: 'started' } }];
  assert.equal(specialtyCheckIns(rows, '2026-10-07', 'counseling', [], new Set()).length, 1);
});
