import test from 'node:test';
import assert from 'node:assert/strict';
import { readLabDocument } from './readLabDocument.js';

class TestFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,dGVzdA==';
    queueMicrotask(() => this.onload());
  }
}

test('image import retains unreadable pages instead of silently dropping them', async () => {
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = TestFileReader;
  try {
    const file = new File(['test'], 'scan.png', { type: 'image/png' });
    const document = await readLabDocument(file, {
      recognizePages: async images => {
        assert.equal(images.length, 1);
        return [{ text: '', words: [], error: 'Unreadable page' }];
      },
    });
    assert.equal(document.id.length, 64);
    assert.equal(document.pageCount, 1);
    assert.equal(document.pages[0].warning, 'Unreadable page');
    assert.equal(document.pages[0].pageNumber, 1);
    assert.equal(document.diagnostics.ocrBatchLimit, 4);
    assert.equal(document.diagnostics.events.filter(event => event.stage === 'ocr_request_completed').length, 1);
    assert.ok(document.diagnostics.durationMs >= 0);
    assert.equal(JSON.stringify(document.diagnostics).includes('dGVzdA=='), false);
  } finally { globalThis.FileReader = previousReader; }
});

test('image import rejects incomplete OCR responses and fingerprints repeat files identically', async () => {
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = TestFileReader;
  try {
    const file = new File(['test'], 'scan.png', { type: 'image/png' });
    const events = [];
    await assert.rejects(readLabDocument(file, { recognizePages: async () => [], onDiagnostic: event => events.push(event) }), /incomplete/);
    assert.equal(events.at(-1).stage, 'ocr_request_failed');
    const options = { recognizePages: async () => [{ text: 'Sample result', words: [] }] };
    const first = await readLabDocument(file, options);
    const repeat = await readLabDocument(file, options);
    assert.equal(first.id, repeat.id);
    assert.match(first.pages[0].warning, /coordinates/);
  } finally { globalThis.FileReader = previousReader; }
});

test('image uploads are preprocessed and residual OCR tilt is retried before building source rows', async () => {
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = TestFileReader;
  const wordLayout = (angle, width, height) => Array.from({ length: 8 }, (_, i) => ({ text: `Reading${i}`, confidence: 0.99,
    angle: Math.atan2(Math.sin(angle * Math.PI / 180) / height, Math.cos(angle * Math.PI / 180) / width),
    box: { x: 0.3, y: 0.2 + i * 0.05, width: 0.15, height: 0.01 } }));
  let preparations = 0, requests = 0;
  try {
    const result = await readLabDocument(new File(['test'], 'scan.png', { type: 'image/png' }), {
      prepareImage: async (image, options) => {
        preparations++;
        if (!options) return { image: 'preprocessed', correction: { angle: 2, sourceWidth: 1200, sourceHeight: 1800, width: 1300, height: 1900 } };
        assert.equal(options.angle, 3);
        return { image: 'realigned', correction: { ...options.previousCorrection, angle: 5, width: 1400, height: 2000 } };
      },
      recognizePages: async images => {
        requests++;
        assert.deepEqual(images, [requests === 1 ? 'preprocessed' : 'realigned']);
        return [{ text: 'Readable table', words: wordLayout(requests === 1 ? 3 : 0, requests === 1 ? 1300 : 1400, requests === 1 ? 1900 : 2000) }];
      },
    });
    assert.equal(preparations, 2); assert.equal(requests, 2);
    assert.equal(result.pages[0].reading.deskew.angle, 5);
    assert.equal(result.pages[0].reading.width, 1200);
    assert.equal(result.pages[0].rows.length, 8);
    assert.equal(result.diagnostics.events.find(event => event.stage === 'ocr_alignment_retry_completed').accepted, true);
  } finally { globalThis.FileReader = previousReader; }
});
