import test from 'node:test';
import assert from 'node:assert/strict';
import { LabReviewSync } from './labReviewSync.js';
const rows = checked => [{ key: 'a1c', value: '6.8', sourceReviewed: checked }];

test('stale shared echoes cannot toggle the verification checkbox or trigger writes', async () => {
  const sync = new LabReviewSync();
  sync.receive('packet', rows(false));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const writes = [];
  const saved = sync.edit('packet', rows(true), async (_, labs) => { writes.push(labs); await gate; });
  assert.equal(sync.receive('packet', rows(false))[0].sourceReviewed, true);
  assert.equal(sync.receive('packet', rows(true))[0].sourceReviewed, true);
  release(); await saved;
  for (let i = 0; i < 5; i++) {
    assert.equal(sync.receive('packet', rows(false))[0].sourceReviewed, true);
    assert.equal(sync.receive('packet', rows(true))[0].sourceReviewed, true);
  }
  assert.equal(writes.length, 1);
});

test('rapid edits are persisted in order, including reverting to the starting value', async () => {
  const sync = new LabReviewSync();
  sync.receive('packet', rows(false));
  const writes = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const first = sync.edit('packet', rows(true), async (_, labs) => { writes.push(labs[0].sourceReviewed); await gate; });
  const second = sync.edit('packet', rows(false), async (_, labs) => { writes.push(labs[0].sourceReviewed); });
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(writes, [true]);
  release(); await Promise.all([first, second]); await sync.flush('packet');
  assert.deepEqual(writes, [true, false]);
  assert.equal(sync.get('packet')[0].sourceReviewed, false);
});

test('failed review saves retain the local edit and stop chart saving until retried', async () => {
  const sync = new LabReviewSync(); sync.receive('packet', rows(false));
  await assert.rejects(sync.edit('packet', rows(true), async () => { throw Error('offline'); }), /offline/);
  await assert.rejects(sync.flush('packet'), /offline/);
  assert.equal(sync.receive('packet', rows(false))[0].sourceReviewed, true);
  await sync.edit('packet', rows(true), async () => {});
  await sync.flush('packet');
});

test('untouched packets accept new shared edits and packets have independent queues', async () => {
  const sync = new LabReviewSync(); sync.receive('a', rows(false));
  assert.equal(sync.receive('a', rows(true))[0].sourceReviewed, true);
  sync.receive('b', rows(false));
  await sync.edit('b', [{ ...rows(true)[0], value: '7.1' }], async () => {});
  assert.equal(sync.get('a')[0].value, '6.8');
  assert.equal(sync.get('b')[0].value, '7.1');
});
