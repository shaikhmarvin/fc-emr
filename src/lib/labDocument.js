import { LAB_CATALOG } from './labCatalog.js';
import { identifyStiTest } from './stiResults.js';
import { identifyHepatitisTest, parseHepatitisValue, hepatitisDefinitionForValue } from './hepatitisResults.js';

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const number = '(?:[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
const resultExpression = new RegExp(`^([<>]=?|[≤≥])?\\s*(${number})(?:\\s*([HL*]))?$`, 'i');
const rangeExpression = new RegExp(`^(${number}\\s*[-–]\\s*${number}|[<>]=?\\s*${number}|[≤≥]\\s*${number}|${number}\\+)\\s*(.*)$`);

export function parseResultCell(text) {
  const value = clean(text).replace(/non\s*-\s*reactive/ig, 'Non-Reactive').replace(/\(\s*([HL*])\s*\)$/i, '$1');
  const match = value.match(resultExpression);
  if (match) return {
    value: match[1] ? `${match[1].replace('≤', '<=').replace('≥', '>=')}${match[2]}` : Number(match[2]),
    flag: (match[3] || '').toUpperCase(),
  };
  if (/^(?:non[- ]?reactive|reactive|not detected|detected|negative|positive|normal|abnormal|trace|equivocal|inconclusive|pending|cancelled|canceled|see comment)(?:\s*\([^)]+\))?$/i.test(value)) {
    return { value, flag: '' };
  }
  return null;
}

// Coordinates stay in the original image's normalized coordinate system.
// Project word centers onto the text baseline to tolerate skew/rotation.
export function buildPageRows(words = []) {
  const valid = words.filter(word => clean(word.text) && word.box &&
    ['x', 'y', 'width', 'height'].every(key => Number.isFinite(word.box[key])));
  if (!valid.length) return [];
  const angles = valid.filter(word => Number.isFinite(word.angle)).map(word => word.angle).sort((a, b) => a - b);
  const angle = angles.length ? angles[Math.floor(angles.length / 2)] : 0;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const projected = valid.map(word => {
    const x = word.box.x + word.box.width / 2, y = word.box.y + word.box.height / 2;
    return { ...word, across: x * cos + y * sin, down: -x * sin + y * cos };
  }).sort((a, b) => a.down - b.down || a.across - b.across);
  const heights = projected.map(word => word.textHeight || word.box.height).sort((a, b) => a - b);
  const tolerance = Math.max(0.002, heights[Math.floor(heights.length / 2)] * 0.5);
  const rows = [];
  for (const word of projected) {
    let row = rows.at(-1);
    if (!row || Math.abs(row.down - word.down) > tolerance) {
      row = { down: word.down, words: [] };
      rows.push(row);
    }
    row.words.push(word);
    row.down = row.words.reduce((sum, item) => sum + item.down, 0) / row.words.length;
  }
  return rows.map((row, index) => {
    row.words.sort((a, b) => a.across - b.across);
    const left = Math.min(...row.words.map(word => word.box.x));
    const top = Math.min(...row.words.map(word => word.box.y));
    return {
      id: `row-${index + 1}`,
      text: row.words.map(word => word.text).join(' '),
      words: row.words,
      box: { x: left, y: top,
        width: Math.max(...row.words.map(word => word.box.x + word.box.width)) - left,
        height: Math.max(...row.words.map(word => word.box.y + word.box.height)) - top },
      confidence: Math.min(...row.words.map(word => word.confidence ?? 0)),
    };
  });
}

export function hasResultColumns(page) {
  return (page.rows || []).some(row => {
    const text = (row.words || []).map(word => word.text);
    return text.some(value => /^(?:value|result|results)$/i.test(value)) &&
      text.some(value => /^(?:range|reference|interval|units?)$/i.test(value));
  });
}

export function parseLayoutResults(page) {
  let columns = null;
  const results = [];
  for (const row of page.rows || []) {
    const words = row.words || [];
    const valueHeader = words.find(word => /^(?:value|result|results)$/i.test(word.text));
    const rangeHeader = words.find(word => /^(?:range|reference|interval)$/i.test(word.text));
    const unitHeader = words.find(word => /^units?$/i.test(word.text));
    if (valueHeader && (rangeHeader || unitHeader)) {
      columns = { value: valueHeader.across ?? valueHeader.box.x,
        range: rangeHeader ? (rangeHeader.across ?? rangeHeader.box.x) : null,
        unit: unitHeader ? (unitHeader.across ?? unitHeader.box.x) : null };
      continue;
    }
    if (!columns) continue;
    const valueStart = columns.value - 0.12;
    const boundaries = [columns.range, columns.unit].filter(value => value !== null && value > columns.value);
    const valueEnd = boundaries.length ? (columns.value + Math.min(...boundaries)) / 2 : Infinity;
    const x = word => word.across ?? word.box.x;
    const name = clean(words.filter(word => x(word) < valueStart).map(word => word.text).join(' '));
    // Vision occasionally merges an entire vertical result column into one word.
    // Its digits cannot safely be assigned to individual tests.
    const heights = words.map(word => word.box.height).sort((a, b) => a - b);
    const typicalHeight = heights[Math.floor(heights.length / 2)] || 0;
    const valueText = clean(words.filter(word => x(word) >= valueStart && x(word) < valueEnd &&
      word.box.height <= typicalHeight * 2.5).map(word => word.text).join(' '));
    let definition = identifyHepatitisTest(name) || identifyStiTest(name) || LAB_CATALOG.find(lab => [lab.displayName, ...(lab.aliases || [])].some(alias => normalize(alias) === normalize(name)));
    const parsed = definition?.key.startsWith('hepatitis_') ? parseHepatitisValue(valueText.replace(/non\s*-\s*reactive/ig, 'Non-Reactive'), definition) : parseResultCell(valueText);
    if (!name || (!parsed && !definition) || /specimen|collected|received|verified|ordered|printed|patient|comment|page\s*:/i.test(name)) continue;
    if (parsed && definition?.key.startsWith('hepatitis_')) definition = hepatitisDefinitionForValue(definition, parsed);
    const trailing = clean(words.filter(word => x(word) >= valueEnd).map(word => word.text).join(' '));
    let rangeText = trailing, unit = parsed?.unit || '';
    if (columns.unit !== null && columns.range !== null && columns.unit < columns.range) {
      unit = clean(words.filter(word => x(word) >= (columns.value + columns.unit) / 2 && x(word) < (columns.unit + columns.range) / 2).map(word => word.text).join(' '));
      rangeText = clean(words.filter(word => x(word) >= (columns.unit + columns.range) / 2).map(word => word.text).join(' '));
    }
    // Some scans omit the short dash between the two reference limits.
    rangeText = rangeText.replace(new RegExp(`^(${number})\\s+(${number})(?=\\s|$)`), '$1 - $2')
      .replace(/\s*\/\s*/g, '/');
    const rangeMatch = rangeText.match(rangeExpression);
    if (rangeMatch) { rangeText = rangeMatch[1]; unit ||= rangeMatch[2]; }
    else if (/^(?:mg\/|g\/|mmol\/|mL\/|U\/|%|fL|pg)/i.test(rangeText)) { unit ||= rangeText; rangeText = ''; }
    results.push({
      key: definition?.key || `outside-${normalize(name)}`,
      displayName: definition?.displayName || name,
      group: definition?.group || 'Other', custom: !definition,
      value: parsed?.value ?? '', unit, referenceRangeText: rangeText, referenceRangeSource: rangeText ? "report" : "",
      reportedFlag: parsed?.flag || '', rawLine: row.text,
      sourcePage: page.pageNumber, sourceRowId: row.id, sourceBox: row.box,
      extractionMethod: page.method, extractionConfidence: row.confidence,
      suspicious: !parsed || row.confidence < 0.85, sourceReviewed: false,
      missing: false, autoFilled: false, confidence: row.confidence >= 0.85 ? 'high' : 'low',
    });
  }
  return results;
}

export function documentIdentity(text) {
  const mrns = [...String(text).matchAll(/\bMRN\s*[:#]?\s*([a-z0-9]+(?:-[a-z0-9]+)*)/gi)]
    .map(match => normalize(match[1]));
  return [...new Set(mrns)];
}

function compatiblePatientNames(first, second) {
  if (!first || !second || normalize(first) === normalize(second)) return true;
  const tokens = value => new Set(clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const a = tokens(first), b = tokens(second);
  const shorter = a.size <= b.size ? a : b, longer = a.size <= b.size ? b : a;
  return shorter.size >= 2 && [...shorter].every(token => longer.has(token));
}

export function mergeDocumentPackets(packets) {
  const merged = [];
  // Dated pages establish report groups first. An undated page must match just
  // one group, so it cannot bridge two different collection dates.
  const ordered = packets.map((packet, index) => ({ packet, index }))
    .sort((a, b) => Number(!a.packet.collectedDate) - Number(!b.packet.collectedDate) || a.index - b.index);
  for (const { packet, index } of ordered) {
    const name = normalize(packet.extractedPatientName), dob = packet.extractedDob;
    const ids = documentIdentity(packet.rawText);
    const candidates = merged.filter(item => {
      if (packet.batchId && item.batchId && packet.batchId !== item.batchId) return false;
      if (packet.sourceDocument?.id && item.sourceDocument?.id && packet.sourceDocument.id !== item.sourceDocument.id) return false;
      if ((packet.reviewStatus || 'unsaved') !== (item.reviewStatus || 'unsaved')) return false;
      if (packet.matchedEncounterId && item.matchedEncounterId && packet.matchedEncounterId !== item.matchedEncounterId) return false;
      if (packet.confirmedPatient?.id && item.confirmedPatient?.id && packet.confirmedPatient.id !== item.confirmedPatient.id) return false;
      if (packet.collectedDate && item.collectedDate && item.collectedDate !== packet.collectedDate) return false;
      const previousIds = documentIdentity(item.rawText);
      if (ids.length > 1 || previousIds.length > 1) return false;
      if (ids.length && previousIds.length && ids[0] !== previousIds[0]) return false;
      if (dob && item.extractedDob && dob !== item.extractedDob) return false;
      const sameConfirmedPatient = packet.confirmedPatient?.id && packet.confirmedPatient.id === item.confirmedPatient?.id;
      if (!sameConfirmedPatient && !compatiblePatientNames(packet.extractedPatientName, item.extractedPatientName)) return false;
      const sameMrn = ids.length === 1 && previousIds[0] === ids[0];
      if (sameMrn) return true;
      // A confirmed chart identity can connect continuation pages that omit MRN.
      if (sameConfirmedPatient) return true;
      return !!(name && dob && name === normalize(item.extractedPatientName) && dob === item.extractedDob);
    });
    const existing = candidates.length === 1 ? candidates[0] : null;
    const preparedLabs = (packet.labs || []).map((lab, labIndex) => ({ ...lab,
      sourceResultId: lab.sourceResultId || `${packet.packetId || index}:${labIndex}`,
      collectedDate: lab.collectedDate || packet.collectedDate || '',
    }));
    if (!existing) {
      merged.push({ ...packet, labs: preparedLabs, _firstPageIndex: index,
        memberPacketIds: packet.memberPacketIds || (packet.packetId ? [packet.packetId] : []) });
      continue;
    }
    existing._firstPageIndex = Math.min(existing._firstPageIndex, index);
    existing.rawText = [...new Set([existing.rawText, packet.rawText].filter(Boolean))].join('\n\n');
    existing.sourceRawText = existing.rawText;
    existing.extractedDob ||= dob;
    existing.extractedPatientName ||= packet.extractedPatientName;
    existing.collectedDate ||= packet.collectedDate;
    existing.confirmedPatient ||= packet.confirmedPatient;
    existing.matchedPatient ||= packet.matchedPatient;
    if (existing.confirmedPatient) existing.matchStatus = 'matched';
    existing.memberPacketIds = [...new Set([...existing.memberPacketIds,
      ...(packet.memberPacketIds || (packet.packetId ? [packet.packetId] : []))])];
    const seenResults = new Set(existing.labs.map(lab => lab.sourceResultId));
    existing.labs.push(...preparedLabs.filter(lab => !seenResults.has(lab.sourceResultId)));
    if (existing.sourceDocument || packet.sourceDocument) {
      const pages = [...(existing.sourceDocument?.pages || []), ...(packet.sourceDocument?.pages || [])];
      existing.sourceDocument = { ...packet.sourceDocument, ...existing.sourceDocument,
        pages: [...new Map(pages.map(page => [page.pageNumber, page])).values()].sort((a, b) => a.pageNumber - b.pageNumber) };
    }
  }
  return merged.sort((a, b) => a._firstPageIndex - b._firstPageIndex).map(item => {
    const { _firstPageIndex, ...packet } = item;
    void _firstPageIndex;
    return packet;
  });
}

export function labsReadyToSave(labs) {
  return labs.filter(lab => {
    const value = lab.value && typeof lab.value === 'object' ? lab.value.value : lab.value;
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
}

export function markRepeatedDocumentResults(labs) {
  const seen = new Set();
  return labs.map(lab => {
    const signature = JSON.stringify([lab.key, lab.value, lab.unit || '', lab.referenceRangeText || '']);
    const duplicate = seen.has(signature);
    seen.add(signature);
    return duplicate ? { ...lab, duplicateType: 'same_encounter', suspicious: true,
      duplicateInfo: 'This result appears more than once in the report. Verify or remove the duplicate.' } : lab;
  });
}
