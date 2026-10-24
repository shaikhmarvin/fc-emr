import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLabDob } from './labDemographics.js';
const dob = (text, name = '') => extractLabDob(text, name, '2026-10-24');

test('DOB labels accept single-digit months, spaced slashes, and adjacent lines', () => {
  for (const label of ['DOB:', 'D.O.B.:', 'Date of Birth:', 'Birth Date:']) {
    assert.equal(dob(`Patient: SAMPLE, JANE\n${label} 3/07/1980`), '1980-03-07', label);
    assert.equal(dob(`Patient: SAMPLE, JANE\n${label}\n3 / 7 / 1980`), '1980-03-07', label);
  }
  assert.equal(dob('DOB: 1980-03-07 Collected 10/24/2026'), '1980-03-07');
});

test('an unambiguous date near the patient name is recognized', () => {
  assert.equal(dob('SAMPLE, JANE\nF, 46 yrs, 3/07/1980\nCollected: 10/24/2026', 'Jane Sample'), '1980-03-07');
  assert.equal(dob('Patient: SAMPLE, JANE 3/07/1980\nCollected: 10/24/2026'), '1980-03-07');
  assert.equal(dob('SAMPLE, JANE\n3/07/1980\nReceived: 10/24/2026', 'Jane Sample'), '1980-03-07');
});

test('clinical dates, ambiguous dates, invalid dates, and future dates are not DOBs', () => {
  assert.equal(dob('Patient: SAMPLE, JANE\nCollected: 10/24/2026\nPrinted: 10/24/2026'), '');
  assert.equal(dob('Patient: SAMPLE, JANE\n3/07/1980\n4/08/1981'), '');
  for (const date of ['2/30/1980', '13/07/1980', '3/07/2030']) assert.equal(dob(`DOB: ${date}`), '');
  assert.equal(dob('DOB: 3/07/1980\nDOB: 4/08/1981'), '');
  assert.equal(dob('Collected: 3/07/1980\nSome unrelated content'), '');
});
