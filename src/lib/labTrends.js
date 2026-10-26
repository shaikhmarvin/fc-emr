export function trendNumber(value) {
  if (value && typeof value === 'object') value = value.value;
  let text = String(value ?? '').trim();
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function labDateForTrend(lab, encounter = {}) {
  const collected = lab.collectedDate || lab.collectionDate || lab.collectedAt || lab.date;
  return collected ? { value: collected, source: 'collection' } :
    { value: encounter.clinicDate || encounter.createdAt || '', source: 'visit' };
}

function dayTimestamp(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : null;
}

export function buildLabTrendSeries(results) {
  const series = new Map(), seen = new Set();
  for (const result of results) {
    const value = result.value && typeof result.value === 'object' ? result.value.value : result.value;
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const sourceId = result.sourceDocumentId && result.sourceResultId ? JSON.stringify([result.sourceDocumentId, result.sourceResultId]) : null;
    if (sourceId && seen.has(sourceId)) continue;
    if (sourceId) seen.add(sourceId);
    // Prefix case is significant. Never combine or convert different units.
    const unit = String(result.unitText || '').trim().replace(/μ/g, 'µ');
    const key = JSON.stringify([result.analyteKey || result.analyte, unit]);
    if (!series.has(key)) series.set(key, { key, label: result.analyte, unit, group: result.group, entries: [] });
    series.get(key).entries.push({ ...result, value, numeric: result.resultType === "categorical" ? null : trendNumber(value), timestamp: dayTimestamp(result.dateKey) });
  }
  return [...series.values()].map(item => ({ ...item, entries: item.entries.sort((a, b) =>
    (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity)) }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit));
}

export function trendChange(entries) {
  const dated = entries.filter(entry => entry.timestamp !== null);
  const dates = [...new Set(dated.map(entry => entry.timestamp))].sort((a, b) => b - a);
  if (dates.length < 2) return null;
  const latest = dated.filter(entry => entry.timestamp === dates[0]);
  const previous = dated.filter(entry => entry.timestamp === dates[1]);
  if (latest.length !== 1 || previous.length !== 1 || latest[0].numeric === null || previous[0].numeric === null) return null;
  const delta = latest[0].numeric - previous[0].numeric;
  return { latest: latest[0], previous: previous[0], delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged' };
}

export function trendSegments(entries) {
  const segments = [];
  const counts = new Map();
  for (const entry of entries) if (entry.timestamp !== null) counts.set(entry.timestamp, (counts.get(entry.timestamp) || 0) + 1);
  let current = [];
  for (const entry of entries) {
    if (entry.numeric === null || entry.timestamp === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      if (counts.get(entry.timestamp) > 1) {
        if (current.length) segments.push(current);
        segments.push([entry]); current = [];
        continue;
      }
      if (current.at(-1)?.timestamp === entry.timestamp) {
        segments.push(current); current = [];
      }
      current.push(entry);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}
