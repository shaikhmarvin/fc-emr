import { labDateForTrend } from './labTrends.js';
export const PAP_NILM = 'Negative for intraepithelial lesion or malignancy';
export function isPapLab(lab = {}) {
  return [lab.key, lab.displayName, lab.normalizedName].some(value => /^(?:pap|paptest|papsmear|cervicalcytology|gyncytology|gynecologiccytology|thinpreppap|papanicolaou)$/.test(String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
}
export function normalizePapLab(lab) {
  if (!isPapLab(lab)) return lab;
  const raw = lab.value && typeof lab.value === 'object' ? lab.value.value : lab.value;
  const full = /negative\s+for\s+intraepithelial\s+lesion\s+or\s+malignancy/i.test(String(raw || '') + ' ' + (lab.rawLine || ''));
  return { ...lab, key: 'pap_smear', displayName: 'Pap Smear', group: 'Cervical Screening', resultType: 'categorical', unit: '', expectedRangeText: '',
    value: full && /^(?:negative|negative\s+for\b|NILM)/i.test(String(raw || '')) ? PAP_NILM : lab.value };
}
export function parsePapReport(text) {
  if (!/\b(?:pap(?:\s+smear|\s+test)?|thinprep|cervical\s+cytology|gynecologic\s+cytology)\b/i.test(text)) return [];
  const lines = String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (!/^(?:negative\s+for|(?:interpretation|diagnosis|result)\s*[:\-])/i.test(lines[i])) continue;
    const segment = lines.slice(i, i + 3).join(' ');
    if (/\b(?:reference|expected|example|normal\s+range)\b/i.test(segment)) continue;
    if (!/negative\s+for\s+intraepithelial\s+lesion\s+or\s+malignancy/i.test(segment)) continue;
    return [{ key: 'pap_smear', displayName: 'Pap Smear', group: 'Cervical Screening', resultType: 'categorical', value: PAP_NILM,
      unit: '', rawLine: segment, referenceRangeText: '', expectedRangeText: '', suspicious: true, sourceReviewed: false, extractionMethod: 'text_fallback', missing: false }];
  }
  return [];
}
const dateKey = value => {
  const text = String(value || '').trim();
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = slash ? `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}` : text.slice(0, 10);
  const timestamp = Date.parse(date + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : '';
};
export function latestPapHistory(patient) {
  const entries = (patient?.encounters || []).flatMap(encounter => (encounter.importedSendOutLabs || encounter.imported_send_out_labs || []).filter(isPapLab).flatMap(lab => {
    const value = lab.value && typeof lab.value === 'object' ? lab.value.value : lab.value;
    if (value === null || value === undefined || !String(value).trim()) return [];
    const date = labDateForTrend(lab, encounter);
    return [{ date: dateKey(date.value), result: String(value), dateSource: date.source }];
  }));
  const latest = entries.filter(entry => entry.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return entries.length ? { date: '', results: [...new Set(entries.map(entry => entry.result))], dateSource: '' } : null;
  return { ...latest, results: [...new Set(entries.filter(entry => entry.date === latest.date).map(entry => entry.result))] };
}
