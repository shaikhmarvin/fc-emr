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
  } finally { globalThis.FileReader = previousReader; }
});

test('image import rejects incomplete OCR responses and fingerprints repeat files identically', async () => {
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = TestFileReader;
  try {
    const file = new File(['test'], 'scan.png', { type: 'image/png' });
    await assert.rejects(readLabDocument(file, { recognizePages: async () => [] }), /incomplete/);
    const options = { recognizePages: async () => [{ text: 'Sample result', words: [] }] };
    const first = await readLabDocument(file, options);
    const repeat = await readLabDocument(file, options);
    assert.equal(first.id, repeat.id);
    assert.match(first.pages[0].warning, /coordinates/);
  } finally { globalThis.FileReader = previousReader; }
});
