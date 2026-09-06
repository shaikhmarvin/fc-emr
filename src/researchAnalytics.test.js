import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchReport } from './researchAnalytics.js';

const visit = (id, clinicDate, extra = {}) => ({ id, clinicDate, visitType: 'general', status: 'done', createdAt: `${clinicDate}T17:00:00Z`, undergradCompletedAt: `${clinicDate}T17:10:00Z`, visitCompletedAt: `${clinicDate}T18:00:00Z`, ...extra });
const report = (encounters, patient = {}, start = '2026-01-01') => buildResearchReport([{ id: 'p1', ...patient, encounters }], start, '2026-09-03');

test('refills and specialty visits cannot contribute to general research or return history', () => {
  const result = report([
    visit('r', '2026-01-01', { visitType: undefined, intake_data: { visit_type: 'refill_only', htn: true }, pharmacyPickedUpAt: '2026-01-01T17:25:00Z', transportation: 'Refill transport', spanishSpeaking: true }),
    visit('s', '2026-01-02', { visitType: 'specialty_only', dm: true }),
    visit('c', '2026-01-03', { status: 'cancelled' }),
    visit('g', '2026-02-01', { newReturning: 'Returning', transportation: 'Car' }),
  ]);
  assert.deepEqual(result.rows.map(r => r.encounter.id), ['g']);
  assert.equal(result.rows[0].returning, false);
  assert.equal(result.chronicRows.length, 0);
  assert.deepEqual(result.transportation, [['Car', 1]]);
  assert.equal(result.languageStats.length, 1);
  assert.equal(result.refillFlow.visits, 1);
  assert.equal(result.refillFlow.refillPickup, 15);
  assert.equal(result.flow.totalClinic, 50);
  assert.ok(result.dailyFlow.every(day => day.date !== '2026-01-01'));
});

test('return history includes earlier general visits outside date window but never later refills', () => {
  const result = report([
    visit('g0', '2025-12-01', { htn: true }),
    visit('g1', '2026-02-01', { transportation: 'Bus' }),
    visit('r', '2026-03-01', { visitType: 'refill_only' }),
  ]);
  assert.equal(result.chronicReturns, 1);
  assert.equal(result.transportationReturnStats[0].returnedPatients, 0);
});

test('general return likelihood increases only for a later general visit', () => {
  const result = report([visit('g1', '2026-02-01', { transportation: 'Bus' }), visit('g2', '2026-03-01', { visitType: 'both', transportation: 'Car' })]);
  assert.equal(result.rows[1].returning, true);
  assert.equal(result.transportationReturnStats.find(r => r.label === 'Bus').returnedPatients, 1);
});

test('pharmacy rates separate visit types and all outcome denominators', () => {
  const result = report([
    visit('g1', '2026-01-01', { pharmacyStatus: 'picked_up' }),
    visit('g2', '2026-01-02', { pharmacyStatus: 'meds_not_picked_up' }),
    visit('g3', '2026-01-03', { pharmacyStatus: 'meds_ready' }),
    visit('g4', '2026-01-04', { pharmacyStatus: 'no_meds_needed' }),
    visit('g5', '2026-01-05'),
    visit('r1', '2026-01-06', { visitType: 'refill_only', pharmacy_picked_up_at: '2026-01-06T18:00:00Z' }),
    visit('r2', '2026-01-07', { visitType: 'refill_only', status: 'cancelled', pharmacyStatus: 'picked_up' }),
    visit('s', '2026-01-08', { visitType: 'specialty_only', pharmacyStatus: 'picked_up' }),
  ], { chronicConditions: ['Asthma'] });
  const [general, refill, empty] = result.pharmacyGroups;
  assert.equal(general.cohort, 'Chronic condition recorded');
  assert.equal(general.rows.length, 5);
  assert.equal(general.cohortVisits, 6);
  assert.equal(general.patients, 1);
  assert.equal(general.refillPatients, 1);
  assert.equal(general.resolved, 2);
  for (const key of ['pickedUp', 'notPickedUp', 'pending', 'noMeds', 'unrecorded']) assert.equal(general[key].length, 1);
  assert.equal(refill.pickedUp.length, 1);
  assert.equal(refill.resolved, 1);
  assert.equal(empty.rows.length, 0);
});

test('refill-only patients are retained only in pharmacy and refill timing; zero denominators stay empty', () => {
  const result = report([visit('r', '2026-01-01', { visitType: undefined, intakeData: { visitType: 'refill_only' } })]);
  assert.equal(result.uniquePatients, 0);
  assert.equal(result.rows.length, 0);
  assert.equal(result.groups.reduce((n,g) => n + g.visits, 0), 0);
  assert.equal(result.refillFlow.visits, 1);
  const refill = result.pharmacyGroups[3];
  assert.equal(refill.patients, 1);
  assert.equal(refill.refillPatients, 1);
  assert.equal(refill.resolved, 0);
  assert.equal(refill.unrecorded.length, 1);
});


test('chronic groups include patient profile diagnoses without admitting refill visits', () => {
  const patients = [
    { id: 'profile-htn', chronicConditions: ['Hypertension'], encounters: [visit('g1', '2026-02-01'), visit('r1', '2026-02-02', { visitType: 'refill_only' })] },
    { id: 'intake-dm', encounters: [visit('g2', '2026-02-03', { dm: true }), visit('r2', '2026-02-04', { visitType: 'refill_only' })] },
    { id: 'refill-flag-only', encounters: [visit('g3', '2026-02-05'), visit('r3', '2026-02-06', { visitType: 'refill_only', htn: true, dm: true })] },
  ];
  const result = buildResearchReport(patients, '2026-01-01', '2026-09-03');
  assert.equal(result.rows.length, 3);
  assert.equal(result.chronicPatients, 2);
  assert.equal(result.chronicRows.length, 2);
  assert.equal(result.groups.find(group => group.label === 'HTN+ only').patients, 1);
  assert.equal(result.groups.find(group => group.label === 'DM+ only').patients, 1);
  assert.equal(result.groups.find(group => group.label === 'Neither recorded').patients, 1);
  assert.equal(result.groups.find(group => group.label === 'HTN+ only').refillPatients, 1);
  assert.equal(result.groups.find(group => group.label === 'DM+ only').refillPatients, 1);
  assert.equal(result.groups.find(group => group.label === 'Neither recorded').refillPatients, 1);
  assert.equal(result.groups.reduce((sum, group) => sum + group.refillPatients, 0), 3);
  assert.equal(result.refillAnalyticsRows.length, 3);
});
