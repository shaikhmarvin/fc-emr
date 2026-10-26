import test from 'node:test';
import assert from 'node:assert/strict';
import { completedLabSourcePaths } from './labSourceLifecycle.js';
const row = status => ({ review_status: status, duplicate_summary_json: { sourceDocument: { sharedFile: { path: 'batch/original' } } } });
test('shared source survives until every packet is terminal', () => {
  for (const status of ['unreviewed', 'reviewing', 'skipped', null, undefined]) assert.deepEqual(completedLabSourcePaths([row('saved'), row(status)]), []);
  assert.deepEqual(completedLabSourcePaths([]), []);
  assert.deepEqual(completedLabSourcePaths([row('saved'), row('saved')]), ['batch/original']);
  assert.deepEqual(completedLabSourcePaths([{ review_status: 'saved' }]), []);
  assert.deepEqual(completedLabSourcePaths([row('saved'), row('deleted')]), ['batch/original']);
  assert.deepEqual(completedLabSourcePaths([row('deleted')]), ['batch/original']);
  assert.deepEqual(completedLabSourcePaths([row('deleted'), row('skipped')]), []);
});
