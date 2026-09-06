import test from 'node:test';
import assert from 'node:assert/strict';
import { getEncounterVisitTypeKey, isGeneralClinicEncounter, isRefillOnlyEncounter, isSpecialtyOnlyEncounter } from './constants.js';

test('canonical visit type reads every stored shape', () => {
  assert.equal(getEncounterVisitTypeKey({ visitType: 'refill_only' }), 'refill_only');
  assert.equal(getEncounterVisitTypeKey({ visit_type: 'Refills Only' }), 'refill_only');
  assert.equal(getEncounterVisitTypeKey({ intakeData: { visitType: 'refill' } }), 'refill_only');
  assert.equal(getEncounterVisitTypeKey({ intake_data: { visit_type: 'specialty clinic only' } }), 'specialty_only');
  assert.equal(getEncounterVisitTypeKey({ intake_data: { visitType: 'general and specialty' } }), 'both');
  assert.equal(getEncounterVisitTypeKey({}), 'general');
  assert.equal(getEncounterVisitTypeKey({ visitType: 'general', intake_data: { visitType: 'refill_only' } }), 'refill_only');
  assert.equal(getEncounterVisitTypeKey({ visit_type: 'general', intakeData: { visit_type: 'specialty_only' } }), 'specialty_only');
});

test('visit pools are mutually exclusive', () => {
  const encounters = [{visitType:'general'},{visitType:'both'},{visitType:'refill_only'},{visitType:'specialty_only'}];
  assert.deepEqual(encounters.map(e => [isGeneralClinicEncounter(e), isRefillOnlyEncounter(e), isSpecialtyOnlyEncounter(e)]), [
    [true,false,false], [true,false,false], [false,true,false], [false,false,true]
  ]);
});
