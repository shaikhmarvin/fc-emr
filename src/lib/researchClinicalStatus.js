import { trendNumber, labDateForTrend } from './labTrends.js';
const day = value => String(value || '').slice(0, 10);
const a1cName = lab => /^(?:a1c|hba1c|hemoglobina1c|hgba1c|hemoglobina1chemoglobintotal)$/.test(String(lab.key || lab.testKey || lab.name || lab.displayName || lab.testName || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
export function researchClinicalStatus(patient, date) {
  const bp = [], a1c = [];
  for (const encounter of patient?.encounters || []) {
    const visitDate = day(encounter.clinicDate || encounter.createdAt);
    if (visitDate === date) {
      for (const vital of encounter.vitalsHistory || []) {
        if (/^\s*\d{2,3}\s*\/\s*\d{2,3}\s*$/.test(String(vital.bp || ''))) bp.push(String(vital.bp).trim());
      }
      const value = encounter.inHouseLabs?.core?.a1c;
      if (trendNumber(value) !== null) a1c.push(String(value?.value ?? value));
    }
    for (const lab of encounter.importedSendOutLabs || []) {
      if (a1cName(lab) && day(labDateForTrend(lab, encounter).value) === date && trendNumber(lab.value) !== null) a1c.push(String(lab.value?.value ?? lab.value));
    }
  }
  return { bp: [...new Set(bp)], a1c: [...new Set(a1c)] };
}
