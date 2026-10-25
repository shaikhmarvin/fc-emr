import { normalizeClinicDate } from './index.js';
import { getEncounterVisitTypeKey } from '../constants.js';

// Use the same date and visit-type context as the displayed patient search.
export function encounterFromPatientSearch(rows, patientId, clinicDate = '', visitType = 'all') {
  const date = normalizeClinicDate(clinicDate);
  return rows.find(({ patient, encounter }) => String(patient.id) === String(patientId) &&
    (!date || normalizeClinicDate(encounter.clinicDate || encounter.clinic_date) === date) &&
    (visitType === 'all' || getEncounterVisitTypeKey(encounter) === visitType))?.encounter || null;
}
