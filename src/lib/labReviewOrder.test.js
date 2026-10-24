import test from 'node:test';
import assert from 'node:assert/strict';
import { labsBySourcePage } from './labReviewOrder.js';

test('review follows page and source-row order across clinical groups without changing stored labs', () => {
  const labs = [
    { key: 'a', group: 'CBC', sourcePage: 2, sourceRowId: 'row-2' },
    { key: 'b', group: 'Lipids', sourcePage: 1, sourceRowId: 'row-10' },
    { key: 'c', group: 'CBC', sourcePage: 1, sourceRowId: 'row-2' },
    { key: 'd', group: 'Other' },
  ];
  const pages = labsBySourcePage(labs);
  assert.deepEqual(pages.map(([label]) => label), ['Page 1', 'Page 2', 'Results without a page']);
  assert.deepEqual(pages[0][1].map(row => row.lab.key), ['c', 'b']);
  assert.deepEqual(pages[0][1].map(row => row.index), [2, 1]);
  assert.equal(labs[0].key, 'a');
  assert.equal(labs[1].group, 'Lipids');
});

test('coordinate-only results use top-to-bottom then left-to-right order, legacy results retain extraction order', () => {
  const pages = labsBySourcePage([
    { sourcePage: 1, sourceBox: { y: 0.5, x: 0.2 } },
    { sourcePage: 1, sourceBox: { y: 0.2, x: 0.5 } },
    { sourcePage: 1, sourceBox: { y: 0.2, x: 0.1 } },
  ]);
  assert.deepEqual(pages[0][1].map(row => row.index), [2, 1, 0]);
  assert.deepEqual(labsBySourcePage([{ sourcePage: 1 }, { sourcePage: 1 }])[0][1].map(row => row.index), [0, 1]);
});
