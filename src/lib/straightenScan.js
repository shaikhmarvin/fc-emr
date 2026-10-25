// Adaptive thresholding retains faint fax text. Connected-component filtering removes
// table grids and scanner borders before estimating the dominant text-line direction.
export function estimateTextSkew({ data, width, height }) {
  const count = width * height, gray = new Uint8Array(count), histogram = new Uint32Array(256);
  for (let i = 0; i < count; i++) {
    const offset = i * 4, alpha = data[offset + 3] / 255;
    gray[i] = Math.round((data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114) * alpha + 255 * (1 - alpha));
    histogram[gray[i]]++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let backgroundWeight = 0, backgroundSum = 0, variance = -1, threshold = 128;
  for (let i = 0; i < 255; i++) {
    backgroundWeight += histogram[i]; backgroundSum += i * histogram[i];
    const foregroundWeight = count - backgroundWeight;
    if (!backgroundWeight || !foregroundWeight) continue;
    const difference = backgroundSum / backgroundWeight - (sum - backgroundSum) / foregroundWeight;
    const candidate = backgroundWeight * foregroundWeight * difference * difference;
    if (candidate > variance) { variance = candidate; threshold = i; }
  }
  let backgroundMode = 128;
  for (let i = 129; i < 256; i++) if (histogram[i] > histogram[backgroundMode]) backgroundMode = i;
  // Dark grid lines can make Otsu choose black alone and discard faint gray text.
  threshold = Math.min(235, Math.max(threshold + 15, backgroundMode - 25));
  const dark = new Uint8Array(count), queue = new Uint32Array(count), points = [];
  for (let i = 0; i < count; i++) dark[i] = gray[i] <= threshold ? 1 : 0;
  let components = 0;
  for (let i = 0; i < count; i++) {
    if (!dark[i]) continue;
    let head = 0, tail = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = i; dark[i] = 0;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (dark[neighbor]) { dark[neighbor] = 0; queue[tail++] = neighbor; }
      }
    }
    if (tail < 3 || tail > count * 0.025 || right - left > width * 0.45 || bottom - top > height * 0.08 ||
      left < 2 || top < 2 || right >= width - 2 || bottom >= height - 2) continue;
    components++;
    for (let p = 0; p < tail; p += 2) points.push([queue[p] % width - width / 2, Math.floor(queue[p] / width) - height / 2]);
  }
  if (points.length < 150 || components < 8) return { angle: 0, confidence: 0, components };
  const sample = points.length > 50000 ? points.filter((_, index) => index % Math.ceil(points.length / 50000) === 0) : points;
  const score = angle => {
    const radians = angle * Math.PI / 180, sin = Math.sin(radians), cos = Math.cos(radians);
    const bins = new Uint32Array(Math.ceil(width + height) * 2 + 4), offset = Math.ceil(width + height);
    for (const [x, y] of sample) bins[Math.round(y * cos - x * sin) + offset]++;
    let total = 0;
    for (const value of bins) total += value * value;
    return total;
  };
  const baseline = score(0);
  let angle = 0, best = baseline;
  for (let a = -25; a <= 25; a += 0.5) {
    const value = score(a); if (value > best) { best = value; angle = a; }
  }
  const coarse = angle;
  for (let a = coarse - 0.4; a <= coarse + 0.4; a += 0.1) {
    if (Math.abs(a) > 25) continue;
    const value = score(a); if (value > best) { best = value; angle = a; }
  }
  const confidence = best / baseline - 1;
  return { angle: confidence >= 0.06 && Math.abs(angle) >= 0.15 && Math.abs(angle) < 24.8 ? Math.round(angle * 10) / 10 : 0, confidence, components };
}

export function originalWordBoxes(words, correction) {
  if (!correction?.angle) return words;
  const { angle, sourceWidth, sourceHeight, width, height } = correction;
  const radians = angle * Math.PI / 180, sin = Math.sin(radians), cos = Math.cos(radians);
  return words.map(word => {
    if (!word.box) return word;
    const { x, y, width: w, height: h } = word.box;
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => {
      const dx = px * width - width / 2, dy = py * height - height / 2;
      return [(dx * cos - dy * sin + sourceWidth / 2) / sourceWidth,
        (dx * sin + dy * cos + sourceHeight / 2) / sourceHeight];
    });
    const left = Math.max(0, Math.min(...corners.map(p => p[0]))), top = Math.max(0, Math.min(...corners.map(p => p[1])));
    return { ...word, box: { x: left, y: top,
      width: Math.max(0, Math.min(1, Math.max(...corners.map(p => p[0]))) - left),
      height: Math.max(0, Math.min(1, Math.max(...corners.map(p => p[1]))) - top) } };
  });
}

export function straightenScan(canvas) {
  const sample = document.createElement('canvas');
  const scale = Math.min(1, 1400 / Math.max(canvas.width, canvas.height));
  sample.width = Math.max(1, Math.round(canvas.width * scale));
  sample.height = Math.max(1, Math.round(canvas.height * scale));
  let estimate;
  try {
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, sample.width, sample.height);
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    estimate = estimateTextSkew(context.getImageData(0, 0, sample.width, sample.height));
  } finally { sample.width = 0; sample.height = 0; }
  return rotateScanCanvas(canvas, estimate.angle, { ...estimate, sourceWidth: canvas.width, sourceHeight: canvas.height });
}

export function rotateScanCanvas(canvas, angle, metadata = {}) {
  const correction = { ...metadata, angle, sourceWidth: metadata.sourceWidth || canvas.width,
    sourceHeight: metadata.sourceHeight || canvas.height, width: canvas.width, height: canvas.height };
  if (!angle) return { canvas, correction };
  const radians = angle * Math.PI / 180;
  const output = document.createElement('canvas');
  output.width = Math.ceil(Math.abs(canvas.width * Math.cos(radians)) + Math.abs(canvas.height * Math.sin(radians)));
  output.height = Math.ceil(Math.abs(canvas.height * Math.cos(radians)) + Math.abs(canvas.width * Math.sin(radians)));
  const context = output.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height);
  context.translate(output.width / 2, output.height / 2); context.rotate(-radians);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return { canvas: output, correction: { ...correction, width: output.width, height: output.height } };
}

export async function prepareScanImage(image, { angle, previousCorrection } = {}) {
  if (typeof document === 'undefined') return { image, correction: null };
  const source = await new Promise((resolve, reject) => {
    const element = new Image(); element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not prepare the scan image.'));
    element.src = 'data:image/png;base64,' + image;
  });
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
  let prepared;
  try {
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(source, 0, 0);
    prepared = angle === undefined ? straightenScan(canvas) : rotateScanCanvas(canvas, angle, previousCorrection || {});
    const correction = { ...prepared.correction, angle: (previousCorrection?.angle || 0) + prepared.correction.angle };
    return { image: prepared.canvas.toDataURL('image/png').split(',')[1], correction };
  } finally {
    if (prepared?.canvas !== canvas && prepared?.canvas) { prepared.canvas.width = 0; prepared.canvas.height = 0; }
    canvas.width = 0; canvas.height = 0;
  }
}
