const numeric = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?';

function interval(raw, reference = false) {
  let text = String(raw ?? '').trim().replace(/[–−]/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=');
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  if (reference) {
    const range = text.match(new RegExp(`^(${numeric})\\s*-\\s*(${numeric})$`));
    if (range) {
      const min = Number(range[1]), max = Number(range[2]);
      return min <= max ? { min, max, minInclusive: true, maxInclusive: true } : null;
    }
    const plus = text.match(new RegExp(`^(${numeric})\\s*\\+$`));
    if (plus) return { min: Number(plus[1]), max: Infinity, minInclusive: true, maxInclusive: false };
  }
  const match = text.match(new RegExp(`^(<=|>=|<|>)?\\s*(${numeric})$`));
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  if (match[1]?.startsWith('<')) return { min: -Infinity, max: value, minInclusive: false, maxInclusive: match[1] === '<=' };
  if (match[1]?.startsWith('>')) return { min: value, max: Infinity, minInclusive: match[1] === '>=', maxInclusive: false };
  return reference ? null : { min: value, max: value, minInclusive: true, maxInclusive: true };
}

export function importedLabFlag(lab) {
  // An empty manual flag explicitly clears even an automatic/report flag.
  if (['', 'H', 'L', 'A'].includes(lab.manualFlag)) return lab.manualFlag;
  const reported = String(lab.reportedFlag ?? (lab.flagSource === 'report' ? lab.flag : '') ?? '').trim().toUpperCase();
  if (['H', 'HH', 'HIGH'].includes(reported)) return 'H';
  if (['L', 'LL', 'LOW'].includes(reported)) return 'L';
  if (['A', 'ABNORMAL'].includes(reported)) return 'A';
  if (['N', 'NORMAL'].includes(reported)) return '';
  if (lab.referenceRangeNeedsReview) return '';

  const traceableRange = lab.referenceRangeSource === 'report' || lab.referenceRangeSource === 'manual' ||
    (lab.referenceRangeSource === 'verified_default' && lab.sourceReviewed) ||
    (!lab.referenceRangeSource && lab.sourceRowId && lab.extractionMethod !== 'text_fallback');
  if (!traceableRange) return '';
  const rawValue = lab.value && typeof lab.value === 'object' ? lab.value.value : lab.value;
  const value = interval(rawValue), range = interval(lab.referenceRangeText, true);
  if (!value || !range) return '';
  if (value.min > range.max || (value.min === range.max && !(value.minInclusive && range.maxInclusive))) return 'H';
  if (value.max < range.min || (value.max === range.min && !(value.maxInclusive && range.minInclusive))) return 'L';
  return '';
}

export function labFlagChoices(lab) {
  const raw = lab.value && typeof lab.value === 'object' ? lab.value.value : lab.value;
  const text = String(raw ?? '').trim();
  if (/^(?:not[ -]+detected|non[ -]?reactive|negative|positive|detected|reactive|normal|abnormal|equivocal|indeterminate|invalid|pending|cancelled|canceled|trace|see comment)\b/i.test(text)) return ['A'];
  const definition = findLabByKey(lab.key);
  if (definition?.resultType === 'categorical' && !lab.unit?.trim()) return ['A'];
  if (interval(text)) return ['H', 'L'];
  if (definition?.resultType === 'categorical') return ['A'];
  if (definition?.resultType === 'numeric' || lab.unit?.trim()) return ['H', 'L'];
  return ['A'];
}

export function toggleLabFlag(lab, flag) {
  return importedLabFlag(lab) === flag ? '' : flag;
}

export function needsExtractionReview(lab) {
  return !lab.sourceReviewed && !!(lab.suspicious || lab.custom || lab.extractionMethod === 'text_fallback' || lab.referenceRangeNeedsReview);
}
import { findLabByKey } from './labCatalog.js';

