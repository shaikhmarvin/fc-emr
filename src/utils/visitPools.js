import { getEncounterVisitTypeKey } from "../constants.js";

export function getEncounterTypeCounts(rows = []) {
  return rows.reduce((counts, { encounter } = {}) => {
    counts[getEncounterVisitTypeKey(encounter)] += 1;
    return counts;
  }, { general: 0, both: 0, specialty_only: 0, refill_only: 0 });
}

export function getEncounterTypesForPatient(rows = [], patientId) {
  return new Set(rows
    .filter(({ patient } = {}) => String(patient?.id) === String(patientId))
    .map(({ encounter }) => getEncounterVisitTypeKey(encounter)));
}

export function patientHasEncounterType(rows, patientId, visitType) {
  return getEncounterTypesForPatient(rows, patientId).has(visitType);
}
