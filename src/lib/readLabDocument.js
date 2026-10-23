import { buildPageRows } from './labDocument.js';

function wordsFromPdf(items, viewport) {
  return items.filter(item => item.str?.trim()).flatMap(item => {
    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const height = Math.abs(item.height * viewport.scale) || 10;
    const width = Math.abs(item.width * viewport.scale);
    const tokens = [...item.str.matchAll(/\S+/g)];
    return tokens.map(token => ({ text: token[0], confidence: tokens.length > 1 ? 0.8 : 1,
      box: { x: (x + width * token.index / item.str.length) / viewport.width,
        y: (y - height) / viewport.height,
        width: width * token[0].length / item.str.length / viewport.width, height: height / viewport.height } }));
  });
}

export async function labFileFingerprint(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export async function readLabDocument(file, { recognizePages, onProgress = () => {}, fingerprint }) {
  const buffer = await file.arrayBuffer();
  const id = fingerprint || await labFileFingerprint(file);
  const pages = [];
  let pending = [];
  async function flush() {
    if (!pending.length) return;
    onProgress(`Reading scanned pages ${pending[0].pageNumber}–${pending.at(-1).pageNumber}…`);
    const recognized = await recognizePages(pending.map(page => page.image));
    if (!Array.isArray(recognized) || recognized.length !== pending.length) throw new Error('The scan reader returned an incomplete page group. Please retry.');
    pending.forEach((page, index) => {
      const response = recognized[index];
      const rows = buildPageRows(response.words || []);
      pages.push({ pageNumber: page.pageNumber, method: 'ocr',
        text: rows.length ? rows.map(row => row.text).join('\n') : response.text || '',
        originalText: response.text || '', rows,
        warning: response.error || (!response.text?.trim() ? 'No readable text. Review this page manually.' :
          !rows.length ? 'Page coordinates are unavailable. Results require manual source verification.' : '') });
    });
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
            pages.push({ pageNumber: number, method: 'pdf_text', text, originalText: text, rows, warning: '' });
          } else {
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            try {
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              pending.push({ pageNumber: number, image: canvas.toDataURL('image/png').split(',')[1] });
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
    pending.push({ pageNumber: 1, image });
    await flush();
  } else throw new Error('Choose a PDF or image file.');
  return { id, name: file.name, size: file.size, pageCount: pages.length,
    pages: pages.sort((a, b) => a.pageNumber - b.pageNumber) };
}
