// Google word angles are normalized to page dimensions; convert back to pixel angles
// before rotating a raster. Weight longer, confident words above noisy short tokens.
export function estimateOcrSkew(words, width, height) {
  if (!(width > 0 && height > 0)) return { angle: 0, confidence: 0, wordCount: 0 };
  const samples = words.filter(word => Number.isFinite(word.angle) && (word.confidence ?? 1) >= 0.65 &&
    String(word.text || '').trim().length >= 2).map(word => ({
      angle: Math.atan2(Math.sin(word.angle) * height, Math.cos(word.angle) * width) * 180 / Math.PI,
      weight: Math.min(20, String(word.text).length) * (word.confidence ?? 1),
    }));
  if (samples.length < 6) return { angle: 0, confidence: 0, wordCount: samples.length };
  // Unwrap around the strongest orientation to handle angles around +/-180 degrees.
  const anchor = samples.reduce((a, b) => a.weight > b.weight ? a : b).angle;
  for (const sample of samples) {
    while (sample.angle - anchor > 180) sample.angle -= 360;
    while (sample.angle - anchor < -180) sample.angle += 360;
  }
  samples.sort((a, b) => a.angle - b.angle);
  const weight = samples.reduce((sum, sample) => sum + sample.weight, 0);
  let cumulative = 0, angle = samples[0].angle;
  for (const sample of samples) { cumulative += sample.weight; if (cumulative >= weight / 2) { angle = sample.angle; break; } }
  const confidence = samples.filter(sample => Math.abs(sample.angle - angle) <= 1.5).reduce((sum, sample) => sum + sample.weight, 0) / weight;
  while (angle > 180) angle -= 360;
  while (angle <= -180) angle += 360;
  return { angle: Math.round(angle * 100) / 100, confidence, wordCount: samples.length };
}
