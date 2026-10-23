import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyStiTest, parseExplicitStiResults, repairUnreviewedStiLabs } from './stiResults.js';
import { parseLabsFromText } from './labParser.js';
import { buildPageRows, parseLayoutResults } from './labDocument.js';

test('common full and abbreviated NAAT names map to separate organisms', () => {
  for (const label of ['Chlamydia trachomatis', 'C. trachomatis RNA, TMA', 'C trachomatis DNA PCR', 'Chlamydia trachomatis, NAA', 'CT DNA, Urine']) {
    assert.equal(identifyStiTest(label)?.key, 'chlamydia', label);
  }
  for (const label of ['Neisseria gonorrhoeae', 'N. gonorrhoeae RNA, TMA', 'N gonorrhoeae DNA PCR', 'Neisseria gonorrhoeae, NAA', 'GC NAAT']) {
    assert.equal(identifyStiTest(label)?.key, 'gonorrhea', label);
  }
  for (const label of ['Chlamydia pneumoniae', 'Neisseria meningitidis', 'CT/NG', 'Chlamydia trachomatis / Neisseria gonorrhoeae']) {
    assert.equal(identifyStiTest(label), null, label);
  }
});

test('positive patient results are not replaced by negative reference values', () => {
  const labs = parseLabsFromText('UMC HEALTH SYSTEM\nChlamydia trachomatis Detected Not Detected\nNeisseria gonorrhoeae Not Detected Not Detected');
  assert.equal(labs.find(lab => lab.key === 'chlamydia').value, 'Detected');
  assert.equal(labs.find(lab => lab.key === 'gonorrhea').value, 'Not Detected');
  const swapped = parseLabsFromText('C. trachomatis RNA, TMA Not Detected Not Detected\nN. gonorrhoeae RNA, TMA Detected Not Detected');
  assert.equal(swapped.find(lab => lab.key === 'chlamydia').value, 'Not Detected');
  assert.equal(swapped.find(lab => lab.key === 'gonorrhea').value, 'Detected');
});

test('stacked results stay attached to their organism and do not cross references', () => {
  const labs = parseExplicitStiResults('C. trachomatis\nRNA, TMA\nResult: Detected\nReference: Not Detected\nN. gonorrhoeae\nNot Detected');
  assert.deepEqual(labs.map(lab => [lab.key, lab.value]), [['chlamydia', 'Detected'], ['gonorrhea', 'Not Detected']]);
  assert.deepEqual(parseExplicitStiResults('Chlamydia trachomatis\nReference: Not Detected'), []);
  const missing = parseExplicitStiResults('C. trachomatis\nN. gonorrhoeae\nDetected');
  assert.deepEqual(missing.map(lab => lab.key), ['gonorrhea']);
});

test('combined panel headings do not assign one result to both organisms', () => {
  assert.deepEqual(parseExplicitStiResults('Chlamydia trachomatis / Neisseria gonorrhoeae Not Detected'), []);
  assert.deepEqual(parseExplicitStiResults('CT/NG Not Detected'), []);
});

test('positioned STI results retain separate result and reference columns', () => {
  const word = (text, x, y) => ({ text, confidence: .99, box: { x, y, width: text.length * .003, height: .012 } });
  const rows = buildPageRows([
    word('Result', .6, .2), word('Range', .82, .2),
    word('C. trachomatis RNA, TMA', .08, .23), word('Detected', .6, .23), word('Not Detected', .82, .23),
    word('N. gonorrhoeae RNA, TMA', .08, .26), word('Not Detected', .6, .26), word('Not Detected', .82, .26),
  ]);
  const labs = parseLayoutResults({ pageNumber: 1, method: 'ocr', rows });
  assert.deepEqual(labs.map(lab => [lab.key, lab.value, lab.referenceRangeText]), [
    ['chlamydia', 'Detected', 'Not Detected'], ['gonorrhea', 'Not Detected', 'Not Detected'],
  ]);
  assert.ok(labs.every(lab => !lab.custom));
});

test('existing pending imports are repaired without replacing reviewer corrections', () => {
  const text = 'C. trachomatis RNA, TMA Detected Not Detected\nN. gonorrhoeae RNA, TMA Not Detected Not Detected';
  const original = [{ key: 'chlamydia', value: 'Not Detected', sourceResultId: 'original' }];
  const labs = repairUnreviewedStiLabs(original, text, 2);
  assert.equal(labs[0].value, 'Detected');
  assert.equal(labs[0].sourceResultId, 'original');
  assert.equal(labs[0].sourcePage, 2);
  assert.equal(labs[0].suspicious, true);
  assert.equal(labs[1].key, 'gonorrhea');
  assert.equal(original[0].value, 'Not Detected');
  for (const protection of [{ sourceReviewed: true }, { _qaAction: 'edited' }, { sourceRowId: 'row-1' }]) {
    const protectedLab = { key: 'chlamydia', value: 'Reviewer result', ...protection };
    assert.equal(repairUnreviewedStiLabs([protectedLab], text)[0].value, 'Reviewer result');
  }
});
