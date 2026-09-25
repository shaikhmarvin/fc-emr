import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingSpecialtyTracker, specialtyTrackerVisits } from './specialtyTracker.js';
const encounter = { id: 'e', clinicDate: '2026-09-25', specialtyType: 'dermatology', visitType: 'specialty_only', status: 'undergrad_complete' };
const entry = { id: 't', patientId: 'p', programType: 'Dermatology', specialtyDate: '2026-09-25', status: 'Scheduled', reason: 'Rash', createdAt: '2026-09-01T12:00:00Z' };

test('reason matches the patient and specialty, preferring the current appointment', () => {
  const other = { ...entry, id: 'other', patientId: 'other' };
  const general = { ...encounter, visitType: 'general', specialtyType: '' };
  const undated = { ...entry, id: 'undated', specialtyDate: '' };
  assert.equal(matchingSpecialtyTracker([other, undated, entry], 'p', encounter).reason, 'Rash');
  assert.equal(matchingSpecialtyTracker([other], 'p', encounter), null);
  assert.equal(matchingSpecialtyTracker([entry], 'p', { ...encounter, specialtyType: 'ophthalmology' }), null);
  assert.equal(matchingSpecialtyTracker([entry], 'p', general), null);
  assert.equal(matchingSpecialtyTracker([undated], 'p', encounter).id, 'undated');
});
test('different-date appointments, future referrals and declined unscheduled referrals do not match', () => {
  for (const candidate of [
    { ...entry, specialtyDate: '2026-09-26' },
    { ...entry, specialtyDate: '2026-09-24' },
    { ...entry, createdAt: '2026-09-26T12:00:00Z' },
    { ...entry, specialtyDate: '', status: 'Declined' },
  ]) assert.equal(matchingSpecialtyTracker([candidate], 'p', encounter), null);
});
test('saved specialty encounters mark check-in and completion without general visits completing another specialty', () => {
  const track = (visits) => specialtyTrackerVisits([entry], [{ id: 'p', encounters: visits }]).get('t');
  assert.equal(track([encounter]).status, 'Checked in');
  assert.equal(track([{ ...encounter, status: 'done' }]).status, 'Visit completed');
  assert.equal(track([{ ...encounter, status: 'cancelled' }]).status, 'Cancelled');
  assert.equal(track([{ ...encounter, status: 'done', specialtyType: 'ophthalmology' }]), undefined);
  assert.equal(track([{ ...encounter, status: 'done', visitType: 'general' }]), undefined);
  assert.equal(track([{ ...encounter, soapStatus: 'signed' }]).status, 'Checked in');
  assert.equal(track([{ ...encounter, status: 'done' }, { ...encounter, id: 'duplicate', status: 'cancelled' }]).status, 'Visit completed');
});
test('physical therapy aliases and legacy saved specialty data match', () => {
  const pt = { ...entry, programType: 'Physical Therapy' };
  assert.equal(matchingSpecialtyTracker([pt], 'p', { ...encounter, specialtyType: 'physical_therapy' }).id, 't');
  assert.equal(matchingSpecialtyTracker([pt], 'p', { ...encounter, specialtyType: '', visitType: 'general', intake_data: { visitType: 'specialty_only', specialtyType: 'pt' } }).id, 't');
});
