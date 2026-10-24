const datePattern = /\b(?:\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}|\d{4}-\d{2}-\d{2})\b/g;
const dobLabel = /\b(?:d\s*\.?\s*o\s*\.?\s*b\.?|date\s+of\s+birth|birth\s*date|born)\b\s*[:\-]?/i;
const otherDateLabel = /\b(?:collect(?:ed|ion)?|specimen|received|reported|printed|ordered|service|result\s*date|visit\s*date)\b/i;
function normalizedDate(raw, today) {
  const compact = raw.replace(/\s/g, '');
  const parts = compact.includes('/') ? compact.split('/') : null;
  const iso = parts ? `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : compact;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso || iso < '1800-01-01' || iso > today) return '';
  return iso;
}
function candidates(text, today) {
  return [...text.matchAll(datePattern)].map(match => normalizedDate(match[0], today)).filter(Boolean);
}
const uniqueDate = dates => [...new Set(dates)].length === 1 ? dates[0] : '';

export function extractLabDob(rawText, patientName = '', today = new Date().toISOString().slice(0, 10)) {
  const lines = String(rawText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const explicit = [];
  for (let i = 0; i < lines.length; i++) {
    const label = dobLabel.exec(lines[i]);
    if (!label) continue;
    const tail = lines[i].slice(label.index + label[0].length).split(otherDateLabel)[0];
    const dates = candidates(tail, today);
    if (dates.length) explicit.push(...dates);
    else if (!otherDateLabel.test(lines[i + 1] || '')) explicit.push(...candidates(lines[i + 1] || '', today));
  }
  if (explicit.length) return uniqueDate(explicit);
  const demographics = lines.slice(0, 20).filter(line => !otherDateLabel.test(line) &&
    /^\s*(?:M|F|Male|Female)\s*[,.]?\s*\d{1,3}\s*(?:yr|yrs|years)\b/i.test(line));
  const demographicDates = demographics.flatMap(line => candidates(line, today));
  if (demographicDates.length) return uniqueDate(demographicDates);

  // Unlabeled dates need a nearby patient-name anchor, not just a place in the header.
  const nameWords = patientName.toLowerCase().match(/[a-z]+/g) || [];
  const nearby = [];
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    const words = line.toLowerCase().match(/[a-z]+/g) || [];
    const hasName = nameWords.length >= 2 && nameWords.every(word => words.includes(word));
    const patientAnchor = /\bpatient(?:\s+name)?\s*[:\-]/i.test(line) && /[a-z]{2,}/i.test(line.replace(/patient|name/ig, ''));
    if (!hasName && !patientAnchor) continue;
    for (const neighbor of lines.slice(Math.max(0, i - 1), i + 3)) {
      if (!otherDateLabel.test(neighbor)) nearby.push(...candidates(neighbor, today));
    }
  }
  return uniqueDate(nearby);
}
