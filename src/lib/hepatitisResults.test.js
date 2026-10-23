import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabsFromText } from './labParser.js';
import { identifyHepatitisTest, parseExplicitHepatitisResults, repairUnreviewedHepatitisLabs } from './hepatitisResults.js';
import { buildPageRows, parseLayoutResults } from './labDocument.js';

test('hepatitis panel preserves A IgG/IgM/total, B antigen/antibody/core classes, and C antibody separately', () => {
  const rows = [
    ['Hepatitis A Ab IgG', 'Reactive', 'hepatitis_a_igg'],
    ['Hepatitis A Ab IgM', 'Non-Reactive', 'hepatitis_a_igm'],
    ['Hepatitis A Total Ab', 'Positive', 'hepatitis_a_total_antibody'],
    ['HBsAg', 'Reactive', 'hepatitis_b_surface_antigen'],
    ['Anti-HBs', 'Non-Reactive', 'hepatitis_b_surface_antibody'],
    ['Anti-HBc IgG', 'Reactive', 'hepatitis_b_core_igg'],
    ['Anti-HBc IgM', 'Non-Reactive', 'hepatitis_b_core_igm'],
    ['Anti-HBc Total', 'Reactive', 'hepatitis_b_core_total_antibody'],
    ['HCV Ab', 'Reactive', 'hepatitis_c_antibody'],
  ];
  const labs = parseLabsFromText('UMC HEALTH SYSTEM\nHepatitis Panel\n' + rows.map(([label, value]) => `${label} ${value} Non-Reactive`).join('\n'));
  const real = labs.filter(lab => !lab.autoFilled);
  assert.equal(real.length, rows.length);
  for (const [, value, key] of rows) assert.equal(real.find(lab => lab.key === key)?.value, value, key);
});

test('numeric antibody assays, viral counts, qualifiers and logarithms remain distinct', () => {
  const labs = parseExplicitHepatitisResults('HBsAb Quantitative 42 mIU/mL\nHCV Ab Index 0.12 S/CO\nHCV RNA Quantitative <15 IU/mL\nHCV RNA Log 1.18 log IU/mL\nHBV DNA Quantitative 1.2e5 IU/mL\nHBV DNA Log 5.08 log10 IU/mL\nHCV RNA Qualitative Not Detected');
  const expected = [
    ['hepatitis_b_surface_antibody_quant', 42, 'mIU/mL'],
    ['hepatitis_c_antibody_index', .12, 'S/CO'],
    ['hepatitis_c_rna_quant', '<15', 'IU/mL'],
    ['hepatitis_c_rna_log', 1.18, 'log IU/mL'],
    ['hepatitis_b_dna_quant', 120000, 'IU/mL'],
    ['hepatitis_b_dna_log', 5.08, 'log10 IU/mL'],
    ['hepatitis_c_rna', 'Not Detected', ''],
  ];
  assert.deepEqual(labs.map(lab => [lab.key, lab.value, lab.unit]), expected);
});

test('stacked results do not cross into another assay or its reference interval', () => {
  const labs = parseExplicitHepatitisResults('Hepatitis B Surface Antigen\nResult\nReactive\nReference: Non-Reactive\nHepatitis B Core IgM\nResult: Non-Reactive');
  assert.deepEqual(labs.map(lab => [lab.key, lab.value]), [
    ['hepatitis_b_surface_antigen', 'Reactive'], ['hepatitis_b_core_igm', 'Non-Reactive'],
  ]);
  assert.deepEqual(parseExplicitHepatitisResults('HBsAg\nReference: Non-Reactive'), []);
  assert.deepEqual(parseExplicitHepatitisResults('HBsAg\nHCV Ab\nReactive').map(lab => lab.key), ['hepatitis_c_antibody']);
});

test('a heading or individual test never invents the rest of a hepatitis panel', () => {
  assert.equal(parseLabsFromText('Hepatitis Panel').length, 0);
  const labs = parseLabsFromText('Hepatitis A IgM Reactive Non-Reactive');
  assert.deepEqual(labs.map(lab => lab.key), ['hepatitis_a_igm']);
  assert.equal(labs[0].value, 'Reactive');
});

test('reflex antibody order labels do not manufacture a viral RNA result', () => {
  const labs = parseExplicitHepatitisResults('HCV Ab with reflex to HCV RNA Quantitative PCR Reactive Non-Reactive');
  assert.deepEqual(labs.map(lab => [lab.key, lab.value]), [['hepatitis_c_antibody', 'Reactive']]);
});

test('individual e markers, confirmation, genotype and D/E assays retain their identities', () => {
  const labs = parseExplicitHepatitisResults('HBeAg Positive Negative\nAnti-HBe Negative Negative\nHBsAg Confirmation Positive Negative\nHCV Genotype 1a\nHDV Ab Negative\nHDV RNA Not Detected\nHEV IgM Negative\nHEV IgG Positive');
  assert.deepEqual(labs.map(lab => [lab.key, lab.value]), [
    ['hepatitis_b_e_antigen', 'Positive'], ['hepatitis_b_e_antibody', 'Negative'],
    ['hepatitis_b_surface_antigen_confirmation', 'Positive'], ['hepatitis_c_genotype', '1a'],
    ['hepatitis_d_antibody', 'Negative'], ['hepatitis_d_rna', 'Not Detected'],
    ['hepatitis_e_igm', 'Negative'], ['hepatitis_e_igg', 'Positive'],
  ]);
  assert.equal(identifyHepatitisTest('Hepatitis A antibody IgM')?.key, 'hepatitis_a_igm');
  assert.equal(identifyHepatitisTest('Hepatitis A Ab Unknown Subtype'), null);
});

test('positioned panel rows preserve reactive result versus nonreactive reference', () => {
  const word = (text, x, y) => ({ text, confidence: .99, box: { x, y, width: text.length * .003, height: .01 } });
  const rows = buildPageRows([word('Result', .6, .1), word('Range', .82, .1),
    word('Hepatitis A Ab IgG', .08, .13), word('Reactive', .6, .13), word('Non-Reactive', .82, .13),
    word('HBsAb Quantitative', .08, .16), word('42 mIU/mL', .6, .16), word('See comment', .82, .16),
    word('HCV RNA Quantitative', .08, .19), word('<15 IU/mL', .6, .19), word('Not Detected', .82, .19)]);
  const labs = parseLayoutResults({ rows, pageNumber: 2, method: 'ocr' });
  assert.deepEqual(labs.map(lab => [lab.key, lab.value]), [
    ['hepatitis_a_igg', 'Reactive'], ['hepatitis_b_surface_antibody_quant', 42], ['hepatitis_c_rna_quant', '<15'],
  ]);
  assert.equal(labs[0].referenceRangeText, 'Non-Reactive');
  assert.equal(labs[1].unit, 'mIU/mL');
});

test('pending repairs distinguish formerly conflated classes and preserve reviewer corrections', () => {
  const old = [{ key: 'hepatitis_a_antibody', value: 'Non-Reactive', rawLine: 'Hepatitis A Ab IgG Reactive Non-Reactive' }];
  const repaired = repairUnreviewedHepatitisLabs(old, 'Hepatitis A Ab IgG Reactive Non-Reactive', 2);
  assert.equal(repaired.length, 1);
  assert.equal(repaired[0].key, 'hepatitis_a_igg');
  assert.equal(repaired[0].value, 'Reactive');
  assert.equal(repaired[0].suspicious, true);
  assert.equal(old[0].value, 'Non-Reactive');
  const manual = { key: 'hepatitis_a_igg', value: 'Reviewer result', _qaAction: 'edited' };
  assert.equal(repairUnreviewedHepatitisLabs([manual], 'Hepatitis A Ab IgG Reactive')[0].value, 'Reviewer result');
});
