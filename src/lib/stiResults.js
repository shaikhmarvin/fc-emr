import { findLabByKey } from './labCatalog.js';

const labels = [
  { key: 'chlamydia', pattern: /^(?:chlamydia\s+trachomatis|c\.?\s*trachomatis|chlamydia|ct)(?=$|[\s,(:/])/i },
  { key: 'gonorrhea', pattern: /^(?:neisseria\s+gonorrh[oe]+ae|n\.?\s*gonorrh[oe]+ae|gonorrh[oe]+a|gc|ng)(?=$|[\s,(:/])/i },
];
const resultPattern = /\b(not[ -]+detected|non[ -]?reactive|negative|positive|detected|reactive|indeterminate|equivocal|inconclusive|invalid|pending|cancelled|canceled)\b/i;
const canonicalResults = {
  notdetected: 'Not Detected', nonreactive: 'Non-Reactive', negative: 'Negative',
  positive: 'Positive', detected: 'Detected', reactive: 'Reactive',
  indeterminate: 'Indeterminate', equivocal: 'Equivocal', inconclusive: 'Inconclusive',
  invalid: 'Invalid', pending: 'Pending', cancelled: 'Cancelled', canceled: 'Cancelled',
};
const normalize = text => String(text || '').toLowerCase().replace(/[^a-z]/g, '');

function labelMatch(text) {
  const raw = String(text || '').trim();
  for (const label of labels) {
    const match = raw.match(label.pattern);
    if (match) return { ...label, rest: raw.slice(match[0].length).trim() };
  }
  return null;
}

function validModifiers(text) {
  const tokens = String(text).replace(/[(),:;\-/]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return tokens.every(token => /^(?:dna|rna|tma|pcr|naa|naat|amplified|amplification|probe|qual|ql|qualitative|test|assay|by|rt|urine|ur|swab|genital|urogenital|vaginal|cervical|endocervical|rectal|throat|pharyngeal|aptima|screen|screening)$/i.test(token));
}

export function identifyStiTest(text) {
  const match = labelMatch(text);
  return match && validModifiers(match.rest) ? findLabByKey(match.key) : null;
}

// Read the first explicit result after one organism's label. A later negative
// reference interval must never overwrite a positive patient result.
export function parseExplicitStiResults(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const results = [];
  for (let index = 0; index < lines.length; index += 1) {
    const label = labelMatch(lines[index]);
    if (!label) continue;
    let source = lines[index], result = label.rest.match(resultPattern);
    if (result && !validModifiers(label.rest.slice(0, result.index))) continue;
    if (!result) {
      if (!validModifiers(label.rest)) continue;
      for (let next = index + 1; next < Math.min(index + 6, lines.length); next += 1) {
        const line = lines[next];
        if (labelMatch(line) || /\b(?:reference|range|normal|specimen|collected|comment|interpretation|methodology)\b/i.test(line)) break;
        if (/^(?:value|result|results|units?)\s*:?$/i.test(line)) continue;
        // Only accept an isolated result, with an optional laboratory flag.
        const candidate = line.replace(/^(?:result|value)\s*:\s*/i, '');
        const isolated = candidate.match(resultPattern);
        if (isolated?.index === 0 && /^[\s()*AHL]*$/i.test(candidate.slice(isolated[0].length))) {
          result = isolated; source = line;
          break;
        }
        if (validModifiers(line)) continue;
        break;
      }
    }
    if (!result) continue;
    const definition = findLabByKey(label.key);
    results.push({ key: definition.key, displayName: definition.displayName, group: definition.group,
      value: canonicalResults[normalize(result[0])], rawLine: `${lines[index]}${source === lines[index] ? '' : ` | ${source}`}`,
      referenceRangeText: '', expectedRangeText: '', missing: false, autoFilled: false,
      confidence: 'high', suspicious: false,
      debug: { parseMethod: 'explicit_sti_result', matchIndex: index, valueSourceLine: source },
    });
  }
  return results;
}

export function repairUnreviewedStiLabs(labs, text, sourcePage) {
  const repaired = [...labs];
  const candidates = parseExplicitStiResults(text);
  for (const candidate of candidates) {
    // Multiple specimens/results for an organism require individual review.
    if (candidates.filter(item => item.key === candidate.key).length !== 1) continue;
    const matches = repaired.filter(item => item.key === candidate.key);
    if (matches.length > 1) continue;
    const current = matches[0];
    if (current && (current.sourceReviewed || current.sourceRowId || ['edited', 'added'].includes(current._qaAction))) continue;
    const updated = { ...current, ...candidate,
      sourcePage: current?.sourcePage || sourcePage,
      extractionMethod: 'text_fallback', confidence: 'low', suspicious: true, sourceReviewed: false };
    if (current) repaired[repaired.indexOf(current)] = updated;
    else repaired.push(updated);
  }
  return repaired;
}
