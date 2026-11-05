import { patientVitalHistory } from './vitals.js';
import { patientLabSources } from './labSaveTarget.js';
import { labDateForTrend } from './labTrends.js';

function dateKey(value) {
  const text = String(value || '').trim();
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = slash ? slash[3] + '-' + slash[1].padStart(2, '0') + '-' + slash[2].padStart(2, '0') : text.slice(0, 10);
  const time = Date.parse(date + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : '';
}
const resultValue = value => String((value && typeof value === 'object' ? value.value : value) ?? '').trim();
function latest(entries) {
  const available = entries.filter(entry => entry.value && !/^(?:n\/?a|not recorded|not performed|pending)$/i.test(entry.value));
  const date = available.map(entry => entry.date).filter(Boolean).sort().at(-1) || '';
  const readings = available.filter(entry => entry.date === date);
  return readings.length ? { date, values: [...new Set(readings.map(entry => entry.value))], dateSource: readings.some(entry => entry.dateSource === 'visit') ? 'visit' : 'collection' } : null;
}
function isA1c(lab) {
  return [lab.key, lab.testKey, lab.name, lab.displayName, lab.testName, lab.normalizedName].some(name =>
    /^(?:a1c|hba1c|hemoglobina1c|hgba1c|hemoglobina1chemoglobintotal|glycatedhemoglobin|glycohemoglobin)$/.test(String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
}
function a1cValue(value, unit = '%') {
  const result = resultValue(value);
  return result && !/^(?:n\/?a|not recorded|not performed|pending)$/i.test(result) ? result + (/[%]|mmol\/mol/i.test(result) ? '' : ' ' + unit) : '';
}

export function intakeClinicalHistory(patient) {
  const encounters = (patient?.encounters || []).filter(encounter => String(encounter.status).toLowerCase() !== 'cancelled');
  const bp = latest(patientVitalHistory(encounters).filter(vital => /^\s*\d{2,3}\s*\/\s*\d{2,3}\s*$/.test(String(vital.bp || '')))
    .map(vital => ({ date: dateKey(vital.visitDate), value: String(vital.bp).replace(/\s/g, ''), dateSource: 'visit' })));
  const a1cEntries = encounters.map(encounter => ({ date: dateKey(encounter.clinicDate || encounter.createdAt), value: a1cValue(encounter.inHouseLabs?.core?.a1c), dateSource: 'visit' }));
  for (const { encounter, labs } of patientLabSources({ ...patient, encounters })) {
    for (const lab of labs) {
      if (!isA1c(lab) || lab.missing) continue;
      const date = labDateForTrend(lab, encounter);
      a1cEntries.push({ date: dateKey(date.value), value: a1cValue(lab.value, lab.unit || lab.unitText || '%'), dateSource: date.source });
    }
  }
  return { bp, a1c: latest(a1cEntries) };
}
