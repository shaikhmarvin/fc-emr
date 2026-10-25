import { estimateOcrSkew } from './ocrSkew.js';

// One targeted retry at most. Keep the first reading if the retry loses text or
// does not measurably straighten it, and flag that page for manual verification.
export async function alignRecognizedPage(page, response, { recognizePages, prepareImage, emit = () => {}, onProgress = () => {} }) {
  const width = page.correction?.width || page.width, height = page.correction?.height || page.height;
  const skew = estimateOcrSkew(response.words || [], width, height);
  emit({ stage: 'ocr_alignment_checked', pageNumber: page.pageNumber, ...skew });
  if (skew.wordCount < 6) return { response, correction: page.correction };
  if (skew.confidence < 0.75) return { response, correction: page.correction,
    warning: 'Text angles vary across this page. Check every result against the source.' };
  if (Math.abs(skew.angle) < 0.3) return { response, correction: page.correction };
  onProgress(`Straightening and re-reading page ${page.pageNumber}…`);
  emit({ stage: 'ocr_alignment_retry_started', pageNumber: page.pageNumber, angle: skew.angle });
  try {
    const prepared = await prepareImage(page.image, { angle: skew.angle, previousCorrection: page.correction || {
      angle: 0, sourceWidth: width, sourceHeight: height, width, height,
    } });
    const recognized = await recognizePages([prepared.image]);
    if (!Array.isArray(recognized) || recognized.length !== 1) throw new Error('Incomplete alignment retry response.');
    const candidate = recognized[0];
    const after = estimateOcrSkew(candidate.words || [], prepared.correction?.width, prepared.correction?.height);
    const accepted = !candidate.error && (candidate.words?.length || 0) >= (response.words?.length || 0) * 0.7 &&
      after.wordCount >= 6 && after.confidence >= 0.75 && (Math.abs(after.angle) < 0.3 || Math.abs(after.angle) < Math.abs(skew.angle) * 0.6);
    emit({ stage: 'ocr_alignment_retry_completed', pageNumber: page.pageNumber, accepted, residualAngle: after.angle,
      originalWordCount: response.words?.length || 0, retryWordCount: candidate.words?.length || 0 });
    if (accepted) return { response: candidate, correction: prepared.correction };
  } catch (error) {
    emit({ stage: 'ocr_alignment_retry_failed', pageNumber: page.pageNumber, error: error.message });
  }
  return { response, correction: page.correction,
    warning: 'Automatic straightening could not confirm a better reading. Check every result against the source.' };
}
