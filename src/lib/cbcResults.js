import { parseExplicitCbcResults } from './labParser.js';
import { findLabByAlias } from './labCatalog.js';

export function repairUnreviewedCbcLabs(labs, text, sourcePage) {
  if (!/\brdw|\bnrbc|nucleated\s+(?:rbc|red)/i.test(text)) return labs;
  const candidates = parseExplicitCbcResults(text);
  const protectedLab = lab => lab.sourceReviewed || ['edited', 'added'].includes(lab._qaAction);
  const repaired = labs.filter(lab => !(lab.key === 'rdw' && /rdw[-\s]*sd/i.test(lab.rawLine || '') &&
    !protectedLab(lab) && candidates.some(candidate => candidate.key === 'rdw_sd')));
  for (const candidate of candidates) {
    if (candidates.filter(item => item.key === candidate.key).length !== 1) continue;
    const matches = repaired.filter(lab => lab.key === candidate.key || findLabByAlias(lab.displayName)?.key === candidate.key);
    if (matches.length > 1) continue;
    const current = matches[0];
    if (current && protectedLab(current)) continue;
    // Existing geometric results keep their extracted values and source boxes.
    const updated = current?.sourceRowId
      ? { ...current, key: candidate.key, displayName: candidate.displayName, group: candidate.group }
      : { ...current, ...candidate, sourcePage: current?.sourcePage || sourcePage,
        extractionMethod: 'text_fallback', confidence: 'low', suspicious: true, sourceReviewed: false };
    if (current) repaired[repaired.indexOf(current)] = updated;
    else repaired.push(updated);
  }
  return repaired;
}
