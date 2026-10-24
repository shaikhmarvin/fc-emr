import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTextSkew, originalWordBoxes } from './straightenScan.js';

function scan(angle) {
  const width = 700, height = 650, data = new Uint8ClampedArray(width * height * 4).fill(255);
  const slope = Math.tan(angle * Math.PI / 180);
  for (let row = 0; row < 15; row++) for (let column = 0; column < 45; column++) {
    for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 7; dy++) {
      const x = 60 + column * 12 + dx;
      const y = Math.round(90 + row * 30 + dy + (x - width / 2) * slope);
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return { width, height, data };
}

test('detects positive and negative text tilt and leaves level text alone', () => {
  for (const angle of [-7, -2, 0, 3, 9]) {
    assert.ok(Math.abs(estimateTextSkew(scan(angle)).angle - angle) <= 0.3, `angle ${angle}`);
  }
});

test('blank pages are not rotated', () => {
  assert.equal(estimateTextSkew({ width: 50, height: 50, data: new Uint8ClampedArray(50 * 50 * 4).fill(255) }).angle, 0);
});

test('highlight boxes map back to the source center after rotation and padding', () => {
  const words = [{ text: 'Result', box: { x: 0.49, y: 0.49, width: 0.02, height: 0.02 }, across: 0.5 }];
  const [word] = originalWordBoxes(words, { angle: 7, sourceWidth: 700, sourceHeight: 900, width: 805, height: 979 });
  assert.ok(Math.abs(word.box.x + word.box.width / 2 - 0.5) < 1e-10);
  assert.ok(Math.abs(word.box.y + word.box.height / 2 - 0.5) < 1e-10);
  assert.equal(word.across, 0.5);
  assert.equal(originalWordBoxes(words, { angle: 0 }), words);
});
