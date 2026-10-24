import test from 'node:test';
import assert from 'node:assert/strict';
import { saveImportedLabs } from './saveImportedLabs.js';

test('large lab snapshots travel as RPC body arguments with the original null state preserved', async () => {
  const labs = Array.from({ length: 500 }, (_, i) => ({ key: 'test-' + i, value: i }));
  let args;
  const client = { rpc: async (name, payload) => { assert.equal(name, 'save_imported_labs_if_unchanged'); args = payload; return { data: 'visit', error: null }; } };
  await saveImportedLabs(client, { encounterId: 'visit', patientId: 'patient', expectedLabs: null, labs });
  assert.equal(args.expected_labs, null);
  assert.equal(args.proposed_labs, labs);
  assert.equal(args.target_patient_id, 'patient');
});

test('conflicts and database errors remain actionable', async () => {
  const options = { encounterId: 'visit', patientId: 'patient', expectedLabs: [], labs: [] };
  await assert.rejects(saveImportedLabs({ rpc: async () => ({ data: null }) }, options), /changed during review/);
  await assert.rejects(saveImportedLabs({ rpc: async () => ({ error: { code: 'PGRST202' } }) }, options), /migration/);
  await assert.rejects(saveImportedLabs({ rpc: async () => ({ error: { message: 'Bad Request', details: 'specific cause', code: '22023' } }) }, options), /specific cause.*22023/);
});
