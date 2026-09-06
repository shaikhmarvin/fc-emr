import test from 'node:test';
import assert from 'node:assert/strict';
import { getEncounterTypeCounts, getEncounterTypesForPatient, patientHasEncounterType } from './visitPools.js';
const rows = [
  {patient:{id:'same'}, encounter:{id:'g', visitType:'general'}},
  {patient:{id:'same'}, encounter:{id:'r', visit_type:'general', intake_data:{visitType:'refill_only'}}},
  {patient:{id:'other'}, encounter:{id:'s', visitType:'general', intake_data:{visitType:'specialty_only'}}},
];
test('a mixed-history patient belongs to each encounter pool without relabeling encounters', () => {
  assert.deepEqual(getEncounterTypeCounts(rows), {general:1,both:0,specialty_only:1,refill_only:1});
  assert.deepEqual([...getEncounterTypesForPatient(rows,'same')].sort(), ['general','refill_only']);
  assert.equal(patientHasEncounterType(rows,'same','general'), true);
  assert.equal(patientHasEncounterType(rows,'same','refill_only'), true);
  assert.equal(patientHasEncounterType(rows,'other','general'), false);
});

