import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpecialtyAnalytics } from './specialtyAnalytics.js';
const visit = (id, date, extra = {}) => ({ id, clinicDate: date, visitType: 'specialty_only', specialtyType: 'pt', status: 'done', ...extra });
const pt = report => report.groups.find(group => group.program === 'Physical Therapy');

test('seen patients, visits and repeats count completed care and deduplicate same-day encounters', () => {
  const patients = [
    { id: 'a', encounters: [visit('1', '2026-09-01'), visit('duplicate', '2026-09-01'), visit('2', '2026-10-01')] },
    { id: 'b', encounters: [visit('3', '2026-09-01', { status: 'undergrad_complete' }), visit('4', '2026-09-02', { status: 'cancelled' })] },
    { id: 'c', encounters: [visit('5', '2026-09-01', { visitType: 'general' }), visit('6', '2026-11-01')] },
  ];
  const group = pt(buildSpecialtyAnalytics(patients, '2026-09-01', '2026-10-31'));
  assert.equal(group.patientsSeen.length, 1);
  assert.equal(group.visits.length, 2);
  assert.equal(group.repeatPatients.length, 1);
});

test('tracker totals deduplicate patients and unseen uses history before the selected start date', () => {
  const patients = [
    { id: 'a', encounters: [visit('old', '2026-01-01')] },
    { id: 'b', encounters: [visit('future', '2026-11-01')] },
    { id: 'c', encounters: [visit('other', '2026-09-01', { specialtyType: 'dermatology' })] },
  ];
  const entries = [
    { id: 't1', patientId: 'a', programType: 'Physical Therapy' },
    { id: 't2', patientId: 'a', programType: 'Physical Therapy', status: 'Completed' },
    { id: 't3', patientId: 'b', programType: 'Physical Therapy', status: 'Completed' },
    { id: 't4', patientId: 'c', programType: 'Physical Therapy' },
    { id: 'archived', patientId: 'archived', programType: 'Physical Therapy', archivedAt: '2026-01-01' },
  ];
  const group = pt(buildSpecialtyAnalytics(patients, '2026-09-01', '2026-10-31', entries));
  assert.equal(group.patientsSeen.length, 0);
  assert.equal(group.trackerPatients.length, 3);
  assert.deepEqual(group.notSeen.map(row => row.patientId), ['b', 'c']);
});

test('Counseling has tracker totals while Ophthalmology totals are unavailable', () => {
  const patients = [{ id: 'a', encounters: [visit('c', '2026-10-01', { specialtyType: 'counseling' }), visit('o', '2026-10-01', { specialtyType: 'ophthalmology' })] }];
  const report = buildSpecialtyAnalytics(patients, '', '', [
    { id: 't1', patientId: 'a', programType: 'Counseling' },
    { id: 't2', patientId: 'b', programType: 'Counseling' },
  ]);
  const counseling = report.groups.find(group => group.program === 'Counseling');
  assert.equal(counseling.trackerPatients.length, 2);
  assert.equal(counseling.notSeen.length, 1);
  assert.equal(counseling.patientsSeen.length, 1);
  const ophtho = report.groups.find(group => group.program === 'Ophthalmology');
  assert.equal(ophtho.trackerPatients, null);
  assert.equal(ophtho.notSeen, null);
  assert.equal(ophtho.patientsSeen.length, 1);
});

test('legacy tracker identity matches unambiguously and full history is independent of clinic event', () => {
  const history = [{ id: 'a', mrn: '123', firstName: 'Amy', lastName: 'Patient', dob: '1980-01-01', encounters: [visit('seen', '2026-01-01')] }];
  const report = buildSpecialtyAnalytics([{ ...history[0], encounters: [] }], '2026-10-01', '2026-10-31', [
    { id: 'mrn', mrn: '123', programType: 'Physical Therapy' },
    { id: 'named', patientName: 'Amy Patient', dob: '1980-01-01', programType: 'Physical Therapy' },
    { id: 'unlinked', patientName: 'Another Patient', dob: '1970-01-01', programType: 'Physical Therapy' },
  ], history);
  assert.equal(pt(report).trackerPatients.length, 2);
  assert.equal(pt(report).notSeen.length, 1);
  assert.equal(pt(report).notSeen[0].patientName, 'Another Patient');
});

test('Mental Health and Addiction Medicine share all counts across historical check-in labels', () => {
  const patients = [
    { id: 'a', encounters: [visit('mh', '2026-09-01', { specialtyType: 'mental_health' }), visit('add', '2026-10-01', { specialtyType: 'addiction_medicine' }), visit('duplicate', '2026-10-01', { specialtyType: 'mental_health' })] },
    { id: 'b', encounters: [visit('add-only', '2026-09-01', { specialtyType: 'addiction' })] },
    { id: 'c', encounters: [visit('pending', '2026-09-01', { specialtyType: 'mental_health', status: 'undergrad_complete' })] },
  ];
  const entries = [
    { id: 'a-mh', patientId: 'a', programType: 'Mental Health' },
    { id: 'a-add', patientId: 'a', programType: 'Addiction Medicine' },
    { id: 'b-mh', patientId: 'b', programType: 'Mental Health' },
    { id: 'c-add', patientId: 'c', programType: 'Addiction Medicine' },
  ];
  const report = buildSpecialtyAnalytics(patients, '2026-09-01', '2026-10-31', entries);
  const group = report.groups.find(group => group.program === 'Mental Health / Addiction Medicine');
  assert.equal(report.groups.length, 5);
  assert.equal(report.groups.some(group => ['Mental Health', 'Addiction Medicine'].includes(group.program)), false);
  assert.equal(group.patientsSeen.length, 2);
  assert.equal(group.visits.length, 3);
  assert.deepEqual(group.visits.find(row => row.patientId === "a" && row.date === "2026-10-01").recordedPrograms, ["Addiction Medicine", "Mental Health"]);
  assert.equal(group.repeatPatients.length, 1);
  assert.equal(group.trackerPatients.length, 3);
  assert.deepEqual(group.notSeen.map(row => row.patientId), ['c']);
  assert.equal(patients[0].encounters[0].specialtyType, 'mental_health');
  assert.equal(patients[0].encounters[1].specialtyType, 'addiction_medicine');
});

test('historical visits under the opposite label prevent false not-yet-seen counts in either direction', () => {
  const patients = [
    { id: 'mh-referral', encounters: [visit('old-add', '2026-01-01', { specialtyType: 'addiction' })] },
    { id: 'add-referral', encounters: [visit('old-mh', '2026-01-01', { specialtyType: 'mental_health' })] },
    { id: 'future', encounters: [visit('future-mh', '2026-11-01', { specialtyType: 'mental_health' })] },
    { id: 'cancelled', encounters: [visit('cancel-add', '2026-01-01', { specialtyType: 'addiction', status: 'cancelled' })] },
  ];
  const entries = patients.map((patient, index) => ({ id: 't' + index, patientId: patient.id, programType: index % 2 ? 'Addiction Medicine' : 'Mental Health' }));
  const group = buildSpecialtyAnalytics(patients, '2026-10-01', '2026-10-31', entries).groups.find(group => group.program === 'Mental Health / Addiction Medicine');
  assert.equal(group.patientsSeen.length, 0);
  assert.deepEqual(group.notSeen.map(row => row.patientId), ['future', 'cancelled']);
});
