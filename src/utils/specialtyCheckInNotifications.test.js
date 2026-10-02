import test from 'node:test';
import assert from 'node:assert/strict';
import { specialtyCheckIns } from './specialtyCheckInNotifications.js';
const date = '2026-10-03';
const row = (id, specialtyType, extra = {}) => ({ encounter: { id, specialtyType, visitType: 'specialty_only', clinicDate: date, status: 'undergrad_complete', ...extra } });
test('specialty checkbox scopes alerts, including combined visits', () => {
  const rows = [row('p', 'pt'), row('d', 'dermatology', { visitType: 'both' }), row('o', 'ophthalmology')];
  assert.deepEqual(specialtyCheckIns(rows, date, 'student', ['Dermatology'], new Set()).map(r => r.encounter.id), ['d']);
  assert.deepEqual(specialtyCheckIns(rows, date, 'physical_therapy', [], new Set()).map(r => r.encounter.id), ['p']);
  assert.equal(specialtyCheckIns(rows, date, 'leadership', [], new Set()).length, 0);
});
test('persisted acknowledgments suppress only the acknowledged encounter and specialty', () => {
  const acknowledged = new Set(JSON.parse(JSON.stringify(['a:Mental Health'])));
  assert.deepEqual(specialtyCheckIns([row('a', 'mental_health'), row('b', 'mental_health')], date, 'student', ['Mental Health'], acknowledged).map(r => r.encounter.id), ['b']);
});
test('old, cancelled, finished, and non-specialty visits do not alert', () => {
  const rows = [row('a', 'pt', { clinicDate: '2026-10-02' }), row('b', 'pt', { status: 'cancelled' }), row('c', 'pt', { status: 'done' }), row('d', 'pt', { visitType: 'general' })];
  assert.equal(specialtyCheckIns(rows, date, 'physical_therapy', [], new Set()).length, 0);
});
