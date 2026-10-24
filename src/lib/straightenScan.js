// Estimate text-line tilt using horizontal projection sharpness on a small grayscale image.
export function estimateTextSkew({ data, width, height }) {
  const points = [];
  for (let y = 1; y < height - 1; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const i = (y * width + x) * 4;
      const dark = x < width && data[i + 3] > 128 && (data[i] + data[i + 1] + data[i + 2]) < 450;
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        // Discard long horizontal borders, which can overpower text.
        if (x - start < width * 0.15) for (let px = start; px < x; px += 2) points.push([px - width / 2, y - height / 2]);
        start = -1;
      }
    }
  }
  if (points.length < 150) return { angle: 0, confidence: 0 };
  const score = angle => {
    const radians = angle * Math.PI / 180, sin = Math.sin(radians), cos = Math.cos(radians);
    const bins = new Uint32Array(Math.ceil(width + height) * 2 + 4), offset = Math.ceil(width + height);
    for (const [x, y] of points) bins[Math.round(y * cos - x * sin) + offset] += 1;
    let total = 0;
    for (const count of bins) total += count * count;
    return total;
  };
  const baseline = score(0);
  let angle = 0, best = baseline;
  for (let a = -12; a <= 12; a += 0.5) {
    const value = score(a);
    if (value > best) { best = value; angle = a; }
  }
  const coarse = angle;
  for (let a = coarse - 0.4; a <= coarse + 0.4; a += 0.1) {
    if (Math.abs(a) > 12) continue;
    const value = score(a);
    if (value > best) { best = value; angle = a; }
  }
  const confidence = best / baseline - 1;
  // Avoid uncertain rotations, tiny corrections, and estimates at the search boundary.
  return { angle: confidence >= 0.12 && Math.abs(angle) >= 0.4 && Math.abs(angle) < 11.8 ? Math.round(angle * 10) / 10 : 0, confidence };
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
  const scale = Math.min(1, 900 / Math.max(canvas.width, canvas.height));
  sample.width = Math.max(1, Math.round(canvas.width * scale));
  sample.height = Math.max(1, Math.round(canvas.height * scale));
  let estimate;
  try {
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, sample.width, sample.height);
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    estimate = estimateTextSkew(context.getImageData(0, 0, sample.width, sample.height));
  } finally { sample.width = 0; sample.height = 0; }
  const correction = { ...estimate, sourceWidth: canvas.width, sourceHeight: canvas.height, width: canvas.width, height: canvas.height };
  if (!estimate.angle) return { canvas, correction };
  const radians = estimate.angle * Math.PI / 180;
  const output = document.createElement('canvas');
  output.width = Math.ceil(Math.abs(canvas.width * Math.cos(radians)) + Math.abs(canvas.height * Math.sin(radians)));
  output.height = Math.ceil(Math.abs(canvas.height * Math.cos(radians)) + Math.abs(canvas.width * Math.sin(radians)));
  const context = output.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height);
  context.translate(output.width / 2, output.height / 2); context.rotate(-radians);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return { canvas: output, correction: { ...correction, width: output.width, height: output.height } };
}
