import test from 'node:test';
import assert from 'node:assert/strict';
import { labNameSuggestionScore } from './labPatientSuggestions.js';
import { mergeDocumentPackets } from './labDocument.js';

test('name suggestions tolerate OCR typos, order, accents, and omitted middle names', () => {
  const patient = { firstName: 'Maria Elena', lastName: 'Gonzalez' };
  for (const name of ['GONZALEZ, MARIA', 'Maria Elena Gonzales', 'María Gonzalez', 'Maria Gonzal', 'Patient: Maria Gonzalez']) {
    assert.ok(labNameSuggestionScore(name, patient) > 0, name);
  }
  assert.ok(labNameSuggestionScore('Gonzalez', { firstName: 'Maria', lastName: 'Gonzalez' }) > 0);
  assert.equal(labNameSuggestionScore('Gonzalez', patient), 0); // Less than half the full name is present.
});

test('unrelated names and initials do not produce a majority-name suggestion', () => {
  const patient = { firstName: 'Maria', lastName: 'Gonzalez' };
  for (const name of ['', 'M G', 'John Smith', 'Maria Robinson']) assert.equal(labNameSuggestionScore(name, patient), 0, name);
  assert.ok(labNameSuggestionScore('Maria Gonzalez', patient) > labNameSuggestionScore('Maria Gonzales', patient));
});

test('combining two packets keeps the confirmed patient and member packet IDs', () => {
  const patient = { id: 'patient', firstName: 'Maria', lastName: 'Gonzalez' };
  const packets = [
    { packetId: 'one', extractedPatientName: 'Maria Gonzalez', extractedDob: '1980-03-07', collectedDate: '2026-10-01', labs: [], sourceDocument: { id: 'file' } },
    { packetId: 'two', extractedPatientName: 'Maria Gonzalez', extractedDob: '1980-03-07', collectedDate: '2026-10-01', confirmedPatient: patient, labs: [], sourceDocument: { id: 'file' } },
  ];
  const [displayed] = mergeDocumentPackets(packets);
  assert.equal(displayed.confirmedPatient.id, 'patient');
  assert.deepEqual(displayed.memberPacketIds, ['one', 'two']);
  assert.equal(packets[0].confirmedPatient, undefined);
});
