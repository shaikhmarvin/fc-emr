import test from 'node:test';
import assert from 'node:assert/strict';
import { wordsFromPdf } from './pdfTextWords.js';
import { buildPageRows } from './labDocument.js';

test('tilted embedded PDF text keeps its actual angle and forms the correct table rows', () => {
  const angle = 8 * Math.PI / 180;
  const viewport = { width: 1200, height: 1600, scale: 2, convertToViewportPoint: (x, y) => [x * 2, 1600 - y * 2] };
  const items = [];
  for (const [label, y] of [['Glucose', 650], ['Albumin', 620]]) {
    for (const [text, x, width] of [[label, 50, 60], ['90', 300, 20], ['70-99', 450, 40]]) {
      items.push({ str: text, width, height: 8, transform: [Math.cos(angle), -Math.sin(angle), Math.sin(angle), Math.cos(angle), x, y - x * Math.tan(angle)] });
    }
  }
  const rows = buildPageRows(wordsFromPdf(items, viewport));
  assert.deepEqual(rows.map(row => row.text), ['Glucose 90 70-99', 'Albumin 90 70-99']);
  assert.ok(rows[0].words.every(word => word.angle > 0));
});
