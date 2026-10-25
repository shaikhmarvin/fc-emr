const lipidKeys = new Set(["total_cholesterol", "hdl", "ldl", "triglycerides", "non_hdl", "chol_hdl_ratio"]);
const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
const normalizedRange = value => clean(value).replace(/[–−]/g, '-').replace(/\s/g, '').toLowerCase();
// SI prefixes are case-sensitive (mIU and MIU must not share a default).
const normalizedUnit = value => clean(value).replace(/μ/g, 'µ').replace(/\s/g, '');

export function rangeScope(packet) {
  const text = packet.sourceRawText || packet.rawText || '';
  if (/umc\s+health\s+system|resulted\s+by\s+umc|resulting\s+lab[^\n]*umc/i.test(text)) return 'laboratory:umc';
  const label = text.match(/^(?:performing |reporting )?laboratory\s*:\s*([^\n]{3,100})$/im)?.[1];
  if (label) return `laboratory:${clean(label).toLowerCase()}`;
  return packet.sourceDocument?.id ? `document:${packet.sourceDocument.id}` : '';
}

export function rangeDefaultKey(scope, lab) {
  return scope && lab.key ? JSON.stringify([scope, lab.key, normalizedUnit(lab.unit)]) : '';
}

export function learnRangeDefault(defaults, packet, lab, packets) {
  const scope = rangeScope(packet), key = rangeDefaultKey(scope, lab);
  const range = clean(lab.referenceRangeText);
  if (!key || !range) throw new Error('Enter a report range first. The report also needs an identifiable laboratory or source file.');
  const conflicting = packets.some(other => rangeScope(other) === scope && other.labs?.some(item =>
    rangeDefaultKey(scope, item) === key && item.referenceRangeText && item.referenceRangeSource !== 'verified_default' &&
    normalizedRange(item.referenceRangeText) !== normalizedRange(range)));
  if (conflicting) throw new Error('These reports contain different ranges for this test and units. Keep their individual ranges.');
  return { ...defaults, [key]: { range, test: lab.displayName || lab.key, unit: lab.unit || '', scope } };
}

export function applyRangeDefaults(labs, packet, defaults, packets = []) {
  const scope = rangeScope(packet);
  return labs.map(original => {
    let lab = original;
    if (lipidKeys.has(lab.key) && !clean(lab.unit) && !lab.unitCleared) {
      const candidates = Object.entries(defaults || {}).filter(([key, item]) => {
        try { const [savedScope, test] = JSON.parse(key); return savedScope === scope && test === lab.key && !item.disabled && clean(item.unit); } catch { return false; }
      }).map(([, item]) => item);
      const units = [...new Set(candidates.map(item => normalizedUnit(item.unit)))];
      const observedUnits = packets.filter(packet => rangeScope(packet) === scope).flatMap(packet => (packet.labs || []).filter(item => item.key === lab.key && clean(item.unit)).map(item => normalizedUnit(item.unit)));
      if (units.length === 1 && observedUnits.every(unit => unit === units[0])) {
        lab = { ...lab, unit: candidates[0].unit, unitSource: 'verified_default', unitNeedsReview: true, sourceReviewed: false };
      }
    }
    const key = rangeDefaultKey(scope, lab), template = defaults?.[key];
    if (template?.disabled && lab.referenceRangeSource === 'verified_default' && !lab.sourceReviewed) {
      return { ...lab, referenceRangeText: '', referenceRangeSource: '', referenceRangeNeedsReview: false };
    }
    if (lab.referenceRangeText || lab.referenceRangeCleared) return lab;
    if (!template?.range || template.disabled) return lab;
    const conflicting = packets.some(other => rangeScope(other) === scope && other.labs?.some(item =>
      rangeDefaultKey(scope, item) === key && item.referenceRangeText && item.referenceRangeSource !== 'verified_default' &&
      normalizedRange(item.referenceRangeText) !== normalizedRange(template.range)));
    if (conflicting) return lab;
    return { ...lab, referenceRangeText: template.range, referenceRangeSource: 'verified_default',
      referenceRangeNeedsReview: true, sourceReviewed: false };
  });
}

export function suspendConflictingRangeDefaults(defaults, packets) {
  let next = defaults;
  for (const packet of packets) {
    const scope = rangeScope(packet);
    for (const lab of packet.labs || []) {
      const key = rangeDefaultKey(scope, lab), template = next?.[key];
      if (!template?.range || template.disabled || !lab.referenceRangeText || lab.referenceRangeSource === 'verified_default') continue;
      if (normalizedRange(lab.referenceRangeText) !== normalizedRange(template.range)) {
        next = { ...next, [key]: { ...template, disabled: true } };
      }
    }
  }
  return next;
}

export function learnVerifiedLipidDefaults(defaults, packets) {
  let next = defaults;
  for (const packet of packets) for (const lab of packet.labs || []) {
    if (!lipidKeys.has(lab.key) || !lab.sourceReviewed || !clean(lab.referenceRangeText)) continue;
    const key = rangeDefaultKey(rangeScope(packet), lab);
    if (!key || next[key]?.disabled) continue;
    try {
      const learned = learnRangeDefault(next, packet, lab, packets);
      if (JSON.stringify(learned[key]) !== JSON.stringify(next[key])) next = learned;
    } catch { /* Conflicting report ranges must remain report-specific. */ }
  }
  return next;
}
