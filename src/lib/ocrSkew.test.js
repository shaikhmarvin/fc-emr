import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateOcrSkew } from './ocrSkew.js';
import { alignRecognizedPage } from './alignRecognizedPage.js';
const words = (angle, width = 1200, height = 1800) => Array.from({ length: 12 }, (_, i) => ({ text: `Sample${i}`, confidence: 0.95,
  angle: Math.atan2(Math.sin(angle * Math.PI / 180) / height, Math.cos(angle * Math.PI / 180) / width),
  box: { x: 0.2, y: 0.2 + i * 0.03, width: 0.1, height: 0.01 } }));

test('OCR angle detection converts normalized coordinates back to pixels, including sideways scans', () => {
  for (const angle of [-18, -3, 0, 7, 90, 180]) {
    assert.ok(Math.abs(estimateOcrSkew(words(angle), 1200, 1800).angle - angle) < 0.02, String(angle));
  }
  assert.equal(estimateOcrSkew([], 1200, 1800).confidence, 0);
});

test('a page with residual skew gets only one targeted retry with the original coordinate transform retained', async () => {
  let calls = 0;
  const events = [];
  const page = { pageNumber: 2, image: 'first', width: 1000, height: 1600,
    correction: { angle: 2, sourceWidth: 1000, sourceHeight: 1600, width: 1200, height: 1800 } };
  const after = { text: 'straightened', words: words(0, 1300, 1900) };
  const result = await alignRecognizedPage(page, { text: 'original', words: words(3) }, {
    prepareImage: async (image, options) => {
      assert.equal(image, 'first'); assert.equal(options.angle, 3); assert.equal(options.previousCorrection.angle, 2);
      return { image: 'corrected', correction: { ...page.correction, angle: 5, width: 1300, height: 1900 } };
    },
    recognizePages: async images => { calls++; assert.deepEqual(images, ['corrected']); return [after]; },
    emit: event => events.push(event),
  });
  assert.equal(calls, 1); assert.equal(result.response, after); assert.equal(result.correction.angle, 5);
  assert.equal(events.at(-1).accepted, true);
});

test('straight pages avoid another OCR request and unsuccessful retries retain the original results', async () => {
  const page = { image: 'first', width: 1200, height: 1800 };
  let calls = 0;
  const options = { prepareImage: async () => ({ image: 'second', correction: { angle: 3, width: 1200, height: 1800 } }),
    recognizePages: async () => { calls++; return [{ text: 'lost words', words: [] }]; } };
  const straight = { words: words(0) };
  assert.equal((await alignRecognizedPage(page, straight, options)).response, straight);
  assert.equal(calls, 0);
  const tilted = { words: words(3) };
  const result = await alignRecognizedPage(page, tilted, options);
  assert.equal(result.response, tilted); assert.match(result.warning, /could not confirm/); assert.equal(calls, 1);
  const failed = await alignRecognizedPage(page, tilted, { ...options, recognizePages: async () => { throw Error('offline'); } });
  assert.equal(failed.response, tilted);
});
