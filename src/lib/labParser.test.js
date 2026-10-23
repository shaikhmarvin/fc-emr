import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabsFromText } from './labParser.js';

// De-identified, visually transcribed rows from the supplied UMC scan.
const rows = [
  ['Direct Bilirubin', '<0.2', '0 - 0.2 mg/dL'],
  ['Albumin', '4.6', '3.5 - 5.2 g/dL'],
  ['Total Bilirubin', '0.3', '0.0 - 1.0 mg/dL'],
  ['Calcium', '9.8', '8.8 - 10.5 mg/dL'],
  ['Carbon Dioxide', '22', '20 - 30 mmol/L'],
  ['Chloride', '103', '97 - 107 mmol/L'],
  ['Creatinine', '0.60', '0.50 - 1.20 mg/dL'],
  ['eGFR', '115', 'mL/min/1.73m2'],
  ['Glucose', '90', '65 - 115 mg/dL'],
  ['Alkaline Phosphatase', '57', '35 - 129 U/L'],
  ['Sodium', '137', '136 - 145 mmol/L'],
  ['Potassium', '4.3', '3.5 - 5.1 mmol/L'],
  ['Total Protein', '7.5', '6.4 - 8.3 g/dL'],
  ['ALT', '20', '5 - 41 U/L'],
  ['AST', '19', '5 - 37 U/L'],
  ['BUN', '9', '6 - 20 mg/dL'],
  ['Anion Gap', '12', '<=30 mmol/L'],
];
for (const separator of [' ', '\n']) {
  test(`UMC rows preserve results rather than reference limits (${JSON.stringify(separator)})`, () => {
    const text = 'UMC HEALTH SYSTEM\nComprehensive Metabolic Panel (Final result)\nValue Range\n' +
      rows.map(row => row.join(separator)).join('\n') + '\nHepatitis A IgM Non-Reactive Non-Reactive';
    const labs = parseLabsFromText(text);
    for (const [name, value] of rows) {
      const lab = labs.find(item => item.rawLine === name || item.rawLine.startsWith(name + ' '));
      assert.ok(lab, `Missing ${name}`);
      assert.equal(String(lab.value), value.startsWith('<') ? value : String(Number(value)), name);
    }
    assert.equal(labs.find(lab => lab.key === 'albumin').referenceRangeText, '3.5 - 5.2');
    assert.equal(labs.find(lab => lab.key === 'albumin').unit, 'g/dL');
    assert.equal(labs.find(lab => lab.key === 'hepatitis_a_igm').value, 'Non-Reactive');
  });
}

test('explicit results outside the expected range are preserved', () => {
  const lab = parseLabsFromText('UMC HEALTH SYSTEM\nGlucose 410 65 - 115 mg/dL').find(l => l.key === 'glucose');
  assert.equal(lab.value, 410);
});
