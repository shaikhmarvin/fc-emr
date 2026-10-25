import { buildPageRows } from './labDocument.js';
import { straightenScan, originalWordBoxes, prepareScanImage } from './straightenScan.js';
import { wordsFromPdf } from './pdfTextWords.js';
import { alignRecognizedPage } from './alignRecognizedPage.js';

export async function labFileFingerprint(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export async function readLabDocument(file, { recognizePages, onProgress = () => {}, fingerprint, runId = crypto.randomUUID(), onDiagnostic = () => {}, prepareImage = prepareScanImage }) {
  const startedAt = new Date().toISOString(), started = performance.now(), events = [];
  const emit = event => {
    const entry = { timestamp: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started), ...event };
    events.push(entry); onDiagnostic(entry);
  };
  emit({ stage: "read_started", fileType: file.type, size: file.size });
  const buffer = await file.arrayBuffer();
  const id = fingerprint || await labFileFingerprint(file);
  const pages = [];
  let pending = [];
  async function flush() {
    if (!pending.length) return;
    onProgress(`Reading scanned pages ${pending[0].pageNumber}–${pending.at(-1).pageNumber}…`);
    const batchStarted = performance.now(), pageNumbers = pending.map(page => page.pageNumber);
    emit({ stage: "ocr_request_started", pageNumbers, imageCount: pending.length, engine: "google_vision", feature: "DOCUMENT_TEXT_DETECTION" });
    let recognized;
    try {
      recognized = await recognizePages(pending.map(page => page.image));
      if (!Array.isArray(recognized) || recognized.length !== pending.length) throw new Error('The scan reader returned an incomplete page group. Please retry.');
      emit({ stage: "ocr_request_completed", pageNumbers, durationMs: Math.round(performance.now() - batchStarted),
        responseCount: recognized.length, layoutPages: recognized.filter(page => page.words?.length).length });
    } catch (error) {
      emit({ stage: "ocr_request_failed", pageNumbers, durationMs: Math.round(performance.now() - batchStarted), error: error.message });
      throw error;
    }
    for (let index = 0; index < pending.length; index++) {
      const page = pending[index];
      const aligned = await alignRecognizedPage(page, recognized[index], { recognizePages, prepareImage, emit, onProgress });
      const response = aligned.response;
      const rows = buildPageRows(response.words || []).map(row => ({ ...row,
        words: originalWordBoxes(row.words, aligned.correction),
        box: originalWordBoxes([{ box: row.box }], aligned.correction)[0].box }));
      pages.push({ pageNumber: page.pageNumber, method: 'ocr',
        text: rows.length ? rows.map(row => row.text).join('\n') : response.text || '',
        originalText: response.text || '', rows,
        reading: { engineVersion: response.engineVersion || "unrecorded", wordCount: response.words?.length || 0,
          rowCount: rows.length, width: page.width || null, height: page.height || null,
          nativeTextCharacters: page.nativeTextCharacters ?? null, deskew: aligned.correction || null,
          responseFormat: response.words?.length ? "word_layout" : "text_only" },
        warning: response.error || aligned.warning || (!response.text?.trim() ? 'No readable text. Review this page manually.' :
          !rows.length ? 'Page coordinates are unavailable. Results require manual source verification.' : '') });
    }
    pending = [];
  }
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker?url')]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    try {
      for (let number = 1; number <= pdf.numPages; number += 1) {
        onProgress(`Preparing page ${number} of ${pdf.numPages}…`);
        const page = await pdf.getPage(number);
        try {
          const viewport = page.getViewport({ scale: 2 });
          const content = await page.getTextContent();
          const words = wordsFromPdf(content.items, viewport);
          const rows = buildPageRows(words);
          const text = rows.map(row => row.text).join('\n');
          if (text.length >= 80 && /\b(?:value|result|range|reference)\b/i.test(text) && /\d/.test(text)) {
            pages.push({ pageNumber: number, method: 'pdf_text', text, originalText: text, rows, warning: '',
              reading: { nativeItemCount: content.items.length, nativeTextCharacters: text.length,
                wordCount: words.length, rowCount: rows.length, width: viewport.width, height: viewport.height } });
            emit({ stage: "native_text_used", pageNumber: number, nativeTextCharacters: text.length, wordCount: words.length, rowCount: rows.length });
          } else {
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            try {
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              onProgress(`Checking text alignment on page ${number}…`);
              const prepared = straightenScan(canvas);
              try {
                pending.push({ pageNumber: number, image: prepared.canvas.toDataURL('image/png').split(',')[1],
                  width: canvas.width, height: canvas.height, correction: prepared.correction, nativeTextCharacters: text.length });
                emit({ stage: 'page_deskewed', pageNumber: number, ...prepared.correction });
              } finally {
                if (prepared.canvas !== canvas) { prepared.canvas.width = 0; prepared.canvas.height = 0; }
              }
              emit({ stage: "page_rendered_for_ocr", pageNumber: number, width: canvas.width, height: canvas.height,
                nativeTextCharacters: text.length, scale: 2, format: "image/png" });
            } finally { canvas.width = 0; canvas.height = 0; }
            if (pending.length >= 4) await flush();
          }
        } finally { page.cleanup(); }
      }
      await flush();
    } finally { await pdf.destroy(); }
  } else if (file.type.startsWith('image/')) {
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not open the image.'));
      reader.readAsDataURL(file);
    });
    onProgress("Checking image text alignment…");
    const prepared = await prepareImage(image);
    pending.push({ pageNumber: 1, image: prepared.image, correction: prepared.correction,
      width: prepared.correction?.sourceWidth, height: prepared.correction?.sourceHeight });
    emit({ stage: "page_deskewed", pageNumber: 1, ...(prepared.correction || {}), inputType: "image" });
    await flush();
  } else throw new Error('Choose a PDF or image file.');
  emit({ stage: "read_completed", pageCount: pages.length });
  return { id, name: file.name, size: file.size, pageCount: pages.length,
    diagnostics: { runId, readerVersion: "positioned-document-reader-v5", startedAt, completedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started), renderScale: 2, ocrBatchLimit: 4, events },
    pages: pages.sort((a, b) => a.pageNumber - b.pageNumber) };
}
