import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchReport } from './researchAnalytics.js';
import { buildResearchStudies } from './researchStudies.js';
import { buildClinicalResearchStats } from './lib/clinicalResearchStats.js';

const visit = (id, clinicDate, extra = {}) => ({ id, clinicDate, visitType: 'general', status: 'done', createdAt: `${clinicDate}T17:00:00Z`, undergradCompletedAt: `${clinicDate}T17:10:00Z`, visitCompletedAt: `${clinicDate}T18:00:00Z`, ...extra });
const report = (encounters, patient = {}, start = '2026-01-01') => buildResearchReport([{ id: 'p1', ...patient, encounters }], start, '2026-09-03');

test('transportation return buckets count unique patients and distinct later general dates', () => {
  const patients = [0, 1, 2, 3, 4, 5].map(count => ({ id: `p${count}`, encounters: [
    visit(`first-${count}`, '2026-01-01', { transportation: 'Bus' }),
    visit(`duplicate-${count}`, '2026-01-01', { transportation: 'Bus' }),
    ...Array.from({ length: count }, (_, index) => visit(`return-${count}-${index}`, `2026-02-0${index + 1}`, { transportation: 'Car' })),
    visit(`refill-${count}`, '2026-03-01', { visitType: 'refill_only' }),
    visit(`cancel-${count}`, '2026-03-02', { status: 'cancelled' }),
    visit(`specialty-${count}`, '2026-03-03', { visitType: 'specialty_only' }),
  ] }));
  const result = buildResearchReport(patients, '2026-01-01', '2026-09-03');
  const bus = result.transportationReturnStats.find(mode => mode.label === 'Bus');
  assert.equal(bus.patients, 6);
  assert.equal(bus.returnedPatients, 5);
  assert.deepEqual(bus.returnBreakdown.map(bucket => bucket.rows.length), [1, 1, 1, 2]);
  assert.deepEqual(bus.returnBreakdown[3].rows.map(row => row.returnCount), [4, 5]);
});

test('transportation averages consecutive general dates by earlier mode and excludes ineligible visits', () => {
  const result = report([
    visit('before', '2025-12-20', { transportation: 'Bus' }),
    visit('a', '2026-01-01', { transportation: 'Bus' }),
    visit('duplicate', '2026-01-01', { transportation: 'Bus' }),
    visit('refill', '2026-01-03', { visitType: 'refill_only' }),
    visit('specialty', '2026-01-04', { visitType: 'specialty_only' }),
    visit('cancelled', '2026-01-05', { status: 'cancelled' }),
    visit('b', '2026-01-11', { transportation: 'Car' }),
    visit('c', '2026-01-31', { transportation: 'Bus' }),
    visit('d', '2026-03-02', { transportation: 'Car' }),
  ]);
  const bus = result.transportationReturnStats.find(mode => mode.label === 'Bus');
  const car = result.transportationReturnStats.find(mode => mode.label === 'Car');
  assert.equal(bus.averageDaysBetweenVisits, 20);
  assert.deepEqual(bus.visitIntervals.map(row => row.daysBetween), [10, 30]);
  assert.equal(car.averageDaysBetweenVisits, 20);
  const single = report([visit('only', '2026-01-01', { transportation: 'Walk' })]);
  assert.equal(single.transportationReturnStats[0].averageDaysBetweenVisits, '—');
});

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


test("Women's Health Day is separate across visits, refills, return history, and disease history", () => {
  const patients = [{ id: 'p', sex: 'Female', dob: '1970-01-01', encounters: [
    visit('event', '2026-01-01', { clinicEvent: 'womens_health_day', htn: true, spanishSpeaking: true }),
    visit('event-refill', '2026-01-01', { intake_data: { clinicEvent: 'womens_health_day' }, visitType: 'refill_only' }),
    visit('regular', '2026-02-01'),
    visit('cancelled-event', '2026-03-01', { clinicEvent: 'womens_health_day', status: 'cancelled' }),
  ] }];
  const regular = buildResearchReport(patients, '2026-01-01', '2026-12-31');
  assert.deepEqual(regular.rows.map(r => r.encounter.id), ['regular']);
  assert.equal(regular.rows[0].returning, false);
  assert.equal(regular.chronicRows.length, 0);
  assert.equal(regular.refillAnalyticsRows.length, 0);
  const event = buildResearchReport(patients, '2026-01-01', '2026-12-31', 'womens_health_day');
  assert.deepEqual(event.rows.map(r => r.encounter.id), ['event']);
  assert.equal(event.uniquePatients, 1);
  assert.equal(event.refillAnalyticsRows.length, 1);
  assert.equal(event.papEligibleRows.length, 1);
});

test('blank research responses use the same category in summaries and source rows', () => {
  const result = report([visit('g1', '2026-02-01', { transportation: '   ', papStatus: ' ', mammogramStatus: '\t' })], { sex: 'Female', dob: '1970-01-01' });
  assert.equal(result.rows[0].transportation, 'Not recorded');
  assert.equal(result.rows[0].pap, 'Not recorded');
  assert.equal(result.rows[0].mammogram, 'Not recorded');
  assert.deepEqual(result.transportation, [['Not recorded', 1]]);
  assert.deepEqual(result.pap, [['Not recorded', 1]]);
  assert.deepEqual(result.mammogram, [['Not recorded', 1]]);
});

test('configured event date recovers legacy visits across research without leaking into regular clinic', () => {
  const patients = [{ id: 'p', sex: 'Female', dob: '1970-01-01', encounters: [
    visit('legacy', '2026-03-01', { clinicEvent: '', htn: true }),
    visit('legacy-refill', '2026-03-01', { visitType: 'refill_only' }),
    visit('saved', '2026-02-01', { clinicEvent: '', intake_data: { clinicEvent: 'womens_health_day' } }),
    visit('regular', '2026-04-01'),
  ] }];
  const regular = buildResearchReport(patients, '2026-01-01', '2026-09-01', '', '2026-03-01');
  const event = buildResearchReport(patients, '2026-01-01', '2026-09-01', 'womens_health_day', '2026-03-01');
  assert.deepEqual(regular.rows.map(row => row.encounter.id), ['regular']);
  assert.equal(regular.rows[0].returning, false);
  assert.equal(regular.chronicRows.length, 0);
  assert.equal(regular.refillAnalyticsRows.length, 0);
  assert.deepEqual(event.rows.map(row => row.encounter.id), ['saved', 'legacy']);
  assert.equal(event.rows[1].returning, true);
  assert.equal(event.refillAnalyticsRows.length, 1);
  assert.equal(event.flow.visits, 2);
  assert.equal(event.papEligibleRows.length, 2);
  assert.equal(patients[0].encounters[0].clinicEvent, '');
});

test('currently fired patients are excluded from every tracker analysis and restored when unfired', () => {
  const createPatient = (id, fired) => ({ id, fired, firedAt: '2026-08-01', firedReason: 'Insurance', sex: 'Female', dob: '1970-01-01', chronicConditions: ['Hypertension', 'Diabetes'], encounters: [
    visit(id + '-first', '2026-01-01', { transportation: 'Bus', vitalsHistory: [{ bp: '160/100' }], inHouseLabs: { core: { a1c: 9 } } }),
    visit(id + '-return', '2026-02-01', { transportation: 'Bus', vitalsHistory: [{ bp: '140/90' }], inHouseLabs: { core: { a1c: 8 } } }),
    visit(id + '-refill', '2026-03-01', { visitType: 'refill_only', pharmacyStatus: 'picked_up' }),
    visit(id + '-event', '2026-04-01', { clinicEvent: 'womens_health_day' }),
  ] });
  const active = createPatient('active', false);
  const fired = createPatient('fired', true);
  for (const event of ['', 'womens_health_day']) {
    const build = patients => buildResearchReport(patients, '2026-01-01', '2026-09-03', event);
    const expected = build([active]);
    const excluded = build([active, fired]);
    assert.deepEqual(excluded, expected, 'all report counts, denominators, and source rows exclude fired patients');
    assert.deepEqual(buildResearchStudies(excluded, '2026-09-03'), buildResearchStudies(expected, '2026-09-03'));
    assert.deepEqual(buildClinicalResearchStats(excluded.groups), buildClinicalResearchStats(expected.groups));
    fired.fired = false;
    assert.deepEqual(build([active, fired]), build([active, { ...fired, firedAt: '', firedReason: '' }]), 'old fired metadata cannot prevent restoration');
    assert.equal(build([active, fired]).uniquePatients, 2);
    fired.fired = true;
  }
});

test('average days between general visits uses distinct eligible dates within the filter', () => {
  const patients = [
    { id: 'a', chronicConditions: ['Hypertension'], encounters: [
      visit('outside', '2025-12-31'), visit('a1', '2026-01-01'), visit('same-day', '2026-01-01'),
      visit('refill', '2026-01-04', { visitType: 'refill_only' }),
      visit('specialty', '2026-01-05', { visitType: 'specialty_only' }),
      visit('cancelled', '2026-01-06', { status: 'cancelled' }),
      visit('other-event', '2026-01-07', { clinicEvent: 'womens_health_day' }),
      visit('a2', '2026-01-11', { visitType: 'both' }), visit('a3', '2026-01-31'),
      visit('future', '2026-02-01'),
    ] },
    { id: 'b', chronicConditions: ['Hypertension'], encounters: [visit('b1', '2026-01-01'), visit('b2', '2026-01-06')] },
    { id: 'single', chronicConditions: ['Hypertension'], encounters: [visit('s1', '2026-01-03')] },
    { id: 'fired', fired: true, chronicConditions: ['Hypertension'], encounters: [visit('f1', '2026-01-01'), visit('f2', '2026-01-02')] },
  ];
  const result = buildResearchReport(patients, '2026-01-01', '2026-01-31');
  const group = result.groups.find(item => item.label === 'HTN+ only');
  assert.deepEqual(group.visitIntervals.map(row => row.daysBetween), [10, 20, 5]);
  assert.equal(group.averageDaysBetweenVisits, 11.7);
  assert.equal(result.groups.find(item => item.label === 'DM+ only').averageDaysBetweenVisits, '—');
  assert.equal(buildResearchReport(patients, '2026-01-11', '2026-01-11').groups[0].averageDaysBetweenVisits, '—');
});
