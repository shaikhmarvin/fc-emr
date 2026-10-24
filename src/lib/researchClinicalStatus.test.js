import test from 'node:test';
import assert from 'node:assert/strict';
import { researchClinicalStatus } from './researchClinicalStatus.js';

test('BP and A1C completion uses the clinic date across encounters of one patient', () => {
  const patient = { encounters: [
    { clinicDate: '2025-02-15', vitalsHistory: [{ bp: '120/80', recordedAt: '10/24/2026' }], inHouseLabs: { core: { a1c: { value: '6.3' } } } },
    { clinicDate: '2025-06-01', vitalsHistory: [{ bp: '140/90' }], inHouseLabs: { core: { a1c: '7.2' } } },
  ] };
  assert.deepEqual(researchClinicalStatus(patient, '2025-02-15'), { bp: ['120/80'], a1c: ['6.3'] });
  assert.deepEqual(researchClinicalStatus(patient, '2026-10-24'), { bp: [], a1c: [] });
});

test('imported A1C follows collection date and ignores missing or nonnumeric entries', () => {
  const patient = { encounters: [{ clinicDate: '2026-10-24', vitalsHistory: [{ bp: 'pending' }],
    inHouseLabs: { core: { a1c: { value: '' } } }, importedSendOutLabs: [
      { key: 'a1c', value: '6.8', collectedDate: '2025-02-15' },
      { key: 'glucose', value: '99', collectedDate: '2025-02-15' },
      { key: 'a1c', value: 'pending' },
    ] }] };
  assert.deepEqual(researchClinicalStatus(patient, '2025-02-15'), { bp: [], a1c: ['6.8'] });
  assert.deepEqual(researchClinicalStatus(patient, '2026-10-24'), { bp: [], a1c: [] });
  assert.deepEqual(researchClinicalStatus(undefined, '2025-02-15'), { bp: [], a1c: [] });
});
