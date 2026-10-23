import { LAB_CATALOG, findLabByKey } from './labCatalog.js';

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const definitions = LAB_CATALOG.filter(lab => lab.key.startsWith('hepatitis_'));
const aliases = definitions.flatMap(lab => [lab.displayName, ...(lab.aliases || [])].map(alias => ({
  lab, alias, pattern: new RegExp('^' + alias.split(/[\s,._/-]+/).filter(Boolean).map(escape).join('[\\s,._/-]*') + '(?![a-z0-9])', 'i'),
}))).sort((a, b) => b.alias.replace(/[^a-z0-9]/gi, '').length - a.alias.replace(/[^a-z0-9]/gi, '').length);
const qualitative = /^(not[ -]+detected|non[ -]?reactive|negative|positive|detected|reactive|equivocal|indeterminate|inconclusive|invalid|pending|cancelled|canceled)\b/i;
const numeric = /^([<>]=?|[≤≥])?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+|\.\d+)(?:\.\d+)?(?:\s*[eE][+-]?\d+)?)(?=\s|$)/;
const canonical = { notdetected: 'Not Detected', nonreactive: 'Non-Reactive', negative: 'Negative', positive: 'Positive',
  detected: 'Detected', reactive: 'Reactive', equivocal: 'Equivocal', indeterminate: 'Indeterminate', inconclusive: 'Inconclusive',
  invalid: 'Invalid', pending: 'Pending', cancelled: 'Cancelled', canceled: 'Cancelled' };

function matchLabel(text) {
  for (const entry of aliases) {
    const match = String(text || '').trim().match(entry.pattern);
    if (match) return { lab: entry.lab, rest: String(text).trim().slice(match[0].length).trim() };
  }
  return null;
}

function stripModifiers(text) {
  return String(text).replace(/^[\s,():-]+/, '').replace(/^(?:(?:qualitative|quantitative|qual|quant|ql|screen|screening|confirmation|confirm|confirmatory|neutralization|pcr|rna|dna|real[- ]time|by|serum|plasma|test|assay|result|value|final|reflex|with|to|hcv|hbv|ab|antibody|iu\/ml|miu\/ml)(?:[\s,():-]+|$))*/i, '').trim();
}

export function identifyHepatitisTest(label) {
  const match = matchLabel(label);
  if (!match) return null;
  // Unknown subtype modifiers (IgM/IgG/total/log/etc.) must not fall back to a
  // broader antibody or viral test definition.
  if (!stripModifiers(match.rest)) return match.lab;
  const result = parseHepatitisValue(match.rest, match.lab);
  return result ? hepatitisDefinitionForValue(match.lab, result) : null;
}

export function parseHepatitisValue(text, definition) {
  const raw = stripModifiers(text);
  const category = raw.match(qualitative);
  if (category) return { value: canonical[category[1].toLowerCase().replace(/[^a-z]/g, '')], length: category[0].length, unit: '' };
  if (definition.key === 'hepatitis_c_genotype') {
    const genotype = raw.match(/^(?:genotype\s*:?\s*)?([1-8][a-z]?(?:\s*[,/]\s*[1-8][a-z]?)*)(?=\s|$)/i);
    return genotype ? { value: genotype[1], length: genotype[0].length, unit: '' } : null;
  }
  const result = raw.match(numeric);
  if (!result) return null;
  const number = result[2].replace(/[,\s]/g, '');
  const symbol = (result[1] || '').replace('≤', '<=').replace('≥', '>=');
  const tail = raw.slice(result[0].length).trim();
  if (/^[-–]/.test(tail)) return null;
  const unit = tail.match(/^(?:(?:log(?:10)?\s*)?IU\/mL|mIU\/mL|S\/CO|index|copies\/mL)\b/i)?.[0] || '';
  // A numeric antibody result requires an explicit quantitative/index assay or
  // printed unit. Do not turn a negative reference threshold into a result.
  if (definition.resultType !== 'numeric' && !unit && !/_(?:rna|dna)$/.test(definition.key)) return null;
  return { value: symbol ? `${symbol}${number}` : Number(number), length: result[0].length, unit };
}

export function hepatitisDefinitionForValue(definition, result) {
  if (typeof result.value === 'number' || /^[<>]/.test(String(result.value))) {
    const quantitative = {
      hepatitis_b_surface_antibody: 'hepatitis_b_surface_antibody_quant',
      hepatitis_c_antibody: 'hepatitis_c_antibody_index',
      hepatitis_c_rna: /log/i.test(result.unit) ? 'hepatitis_c_rna_log' : 'hepatitis_c_rna_quant',
      hepatitis_b_dna: /log/i.test(result.unit) ? 'hepatitis_b_dna_log' : 'hepatitis_b_dna_quant',
    };
    return findLabByKey(quantitative[definition.key]) || definition;
  }
  return definition;
}

export function parseExplicitHepatitisResults(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const labs = [];
  for (let index = 0; index < lines.length; index += 1) {
    const label = matchLabel(lines[index]);
    if (!label) continue;
    let source = label.rest, value = parseHepatitisValue(source, label.lab);
    if (!value) {
      if (stripModifiers(label.rest)) continue;
      for (let next = index + 1; next < Math.min(index + 5, lines.length); next += 1) {
        if (matchLabel(lines[next]) || /\b(?:reference|range|normal|comment|interpretation|collected|specimen)\b/i.test(lines[next])) break;
        if (/^(?:result|value|units?)\s*:?$/i.test(lines[next])) continue;
        value = parseHepatitisValue(lines[next], label.lab);
        if (!value) break;
        source = lines[next]; break;
      }
    }
    if (!value) continue;
    const definition = hepatitisDefinitionForValue(label.lab, value);
    labs.push({ key: definition.key, displayName: definition.displayName, group: definition.group,
      value: value.value, unit: value.unit, rawLine: lines[index] + (source === label.rest ? '' : ` | ${source}`),
      referenceRangeText: '', expectedRangeText: '', missing: false, autoFilled: false, suspicious: false, confidence: 'high',
      debug: { parseMethod: 'explicit_hepatitis_result', valueSourceLine: source } });
  }
  return labs;
}

export function repairUnreviewedHepatitisLabs(labs, text, sourcePage) {
  if (!/hepatitis|\b(?:hav|hb[scve]|hcv|hdv|hev)|anti[- ]h/i.test(text)) return labs;
  const repaired = [...labs], candidates = parseExplicitHepatitisResults(text);
  for (const candidate of candidates) {
    if (candidates.filter(lab => lab.key === candidate.key).length !== 1) continue;
    const matches = repaired.filter(lab => lab.key === candidate.key || identifyHepatitisTest(lab.rawLine)?.key === candidate.key);
    if (matches.length > 1) continue;
    const current = matches[0];
    if (current && (current.sourceReviewed || ['edited', 'added'].includes(current._qaAction))) continue;
    const updated = current?.sourceRowId ? { ...current, key: candidate.key, displayName: candidate.displayName } :
      { ...current, ...candidate, sourcePage: current?.sourcePage || sourcePage,
        suspicious: true, confidence: 'low', sourceReviewed: false, extractionMethod: 'text_fallback' };
    if (current) repaired[repaired.indexOf(current)] = updated;
    else repaired.push(updated);
  }
  return repaired;
}
