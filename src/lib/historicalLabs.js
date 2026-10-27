import { findLabByKey } from './labCatalog.js';
import { validateLabDestination, patientLabSources } from './labSaveTarget.js';
import { trendNumber } from './labTrends.js';

export function prepareHistoricalLab(draft, { today, actorId, id, enteredAt }) {
  const definition = findLabByKey(draft.key);
  if (!definition) throw new Error('Choose a lab test.');
  validateLabDestination([{ collectedDate: draft.collectedDate }]);
  if (draft.collectedDate > today) throw new Error('Collection date cannot be in the future.');
  const value = String(draft.value || '').trim();
  if (!value) throw new Error('Enter the lab result.');
  if (definition.resultType === 'numeric' && trendNumber(value) === null) throw new Error('Enter a numeric result for this test.');
  if (!draft.source.trim()) throw new Error('Enter the source of the historical result.');
  return {
    id, key: definition.key, displayName: definition.displayName, group: definition.group,
    value, units: draft.units.trim(), collectedDate: draft.collectedDate,
    referenceRangeText: draft.referenceRange.trim(), reportedFlag: draft.flag || '',
    sourceType: 'historical_manual', sourceFileName: draft.source.trim(),
    enteredBy: actorId, enteredAt,
  };
}

export function hasHistoricalLabDuplicate(patient, lab) {
  return patientLabSources(patient).some(({ labs }) => labs.some(existing =>
    existing.key === lab.key && existing.collectedDate === lab.collectedDate &&
    String(existing.value?.value ?? existing.value).trim() === lab.value &&
    String(existing.units || existing.unit || '').trim() === lab.units));
}
