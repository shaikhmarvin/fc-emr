import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabsFromText, parseExplicitCbcResults } from './labParser.js';
import { findLabByAlias } from './labCatalog.js';
import { buildPageRows, parseLayoutResults } from './labDocument.js';
import { repairUnreviewedCbcLabs } from './cbcResults.js';

const text = 'RDW-SD 42.5 35.0 - 46.0 fL\nRDWCV 13.2 11.5 - 14.5 %\nNRBC% 0.2 0.0 - 0.1 /100WBC\nNRBC Abs 0.015 0.000 - 0.012 x10^3/uL';
test('RDW-SD, RDW-CV, NRBC percentage and absolute count remain four distinct results', () => {
  for (const prefix of ['', 'UMC HEALTH SYSTEM\n']) {
    const labs = parseLabsFromText(prefix + text);
    for (const [key, value, unit] of [['rdw_sd', 42.5, 'fL'], ['rdw', 13.2, '%'], ['nrbc_percent', .2, '/100WBC'], ['nrbc_absolute', .015, 'x10^3/uL']]) {
      const lab = labs.find(item => item.key === key);
      assert.equal(lab?.value, value, key);
      assert.equal(lab.unit, unit, key);
    }
  }
});

test('NRBC percentage aliases do not collide with absolute count aliases', () => {
  for (const alias of ['NRBC%', 'NRBC %', 'NRBC percent']) assert.equal(findLabByAlias(alias)?.key, 'nrbc_percent');
  for (const alias of ['NRBC Abs', 'NRBC Absolute', 'Absolute NRBC']) assert.equal(findLabByAlias(alias)?.key, 'nrbc_absolute');
  assert.equal(findLabByAlias('RDW-SD').key, 'rdw_sd');
  assert.equal(findLabByAlias('RDWCV').key, 'rdw');
});

test('stacked OCR preserves zero and fractional NRBC results and printed units', () => {
  const labs = parseExplicitCbcResults('NRBC%\n0.0\n/100WBC\nNRBC Abs\n0.000\nx10^3/uL');
  assert.deepEqual(labs.map(lab => [lab.key, lab.value, lab.unit]), [
    ['nrbc_percent', 0, '/100WBC'], ['nrbc_absolute', 0, 'x10^3/uL'],
  ]);
});

test('interleaved MPV and NRBC labels do not assign MPV to NRBC absolute', () => {
  const labs = parseLabsFromText('UMC HEALTH SYSTEM\nMPV\nNRBC%\nNRBC Abs\n10.4\nfL\n0.2\n0.015');
  assert.equal(labs.find(lab => lab.key === 'mpv').value, 10.4);
  assert.equal(labs.find(lab => lab.key === 'nrbc_percent').value, .2);
  assert.equal(labs.find(lab => lab.key === 'nrbc_absolute').value, .015);
});

test('positioned CBC rows retain the four canonical identities', () => {
  const word = (value, x, y) => ({ text: value, confidence: .99, box: { x, y, width: value.length * .003, height: .01 } });
  const words = [word('Value', .6, .1), word('Range', .8, .1)];
  [['RDW-SD', '42.5', '35 - 46 fL'], ['RDWCV', '13.2', '11.5 - 14.5 %'], ['NRBC%', '0.2', '0 - 0.1 /100WBC'], ['NRBC Abs', '0.015', '0 - 0.012 x10^3/uL']].forEach(([name, value, range], index) => {
    const y = .13 + index * .03;
    words.push(word(name, .08, y), word(value, .6, y), word(range, .8, y));
  });
  assert.deepEqual(parseLayoutResults({ pageNumber: 1, method: 'ocr', rows: buildPageRows(words) }).map(lab => lab.key),
    ['rdw_sd', 'rdw', 'nrbc_percent', 'nrbc_absolute']);
});

test('pending CBC repairs retain reviewer changes and geometric values', () => {
  const original = [{ key: 'rdw', displayName: 'RDW', value: 42.5, rawLine: 'RDW-SD 42.5' }];
  const repaired = repairUnreviewedCbcLabs(original, text, 2);
  assert.equal(repaired.find(lab => lab.key === 'rdw').value, 13.2);
  assert.equal(repaired.find(lab => lab.key === 'rdw_sd').value, 42.5);
  assert.equal(repaired.find(lab => lab.key === 'nrbc_percent').sourcePage, 2);
  assert.equal(original.length, 1);
  const reviewed = { key: 'nrbc_absolute', value: .012, _qaAction: 'edited' };
  assert.equal(repairUnreviewedCbcLabs([reviewed], text).find(lab => lab.key === 'nrbc_absolute').value, .012);
  const geometric = { key: 'outside-rdwsd', displayName: 'RDW-SD', value: 44, sourceRowId: 'row-1' };
  assert.equal(repairUnreviewedCbcLabs([geometric], text).find(lab => lab.key === 'rdw_sd').value, 44);
});
