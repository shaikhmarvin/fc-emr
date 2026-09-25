export const WOMENS_HEALTH_DAY = "womens_health_day";

export function clinicEventForDate(clinicDate, eventDate) {
  return eventDate && clinicDate === eventDate ? WOMENS_HEALTH_DAY : "";
}

export function isWomensHealthEncounter(encounter) {
  return (encounter?.clinicEvent ?? encounter?.intake_data?.clinicEvent ?? encounter?.intakeData?.clinicEvent) === WOMENS_HEALTH_DAY;
}

export function patientsForClinicEvent(patients, clinicEvent = "") {
  return patients.map((patient) => ({ ...patient, encounters: (patient.encounters || []).filter((encounter) =>
    isWomensHealthEncounter(encounter) === (clinicEvent === WOMENS_HEALTH_DAY)) }));
}

// Refill requests have no encounter link; use the patient's saved visits on that date.
export function hasOnlyWomensHealthVisitsOnDate(patient, date) {
  const visits = (patient?.encounters || []).filter((encounter) => String(encounter.clinicDate || '').slice(0, 10) === date);
  return visits.length > 0 && visits.every(isWomensHealthEncounter);
}

export function womensHealthChiefComplaint(entries, patientId, clinicDate, clinicEvent) {
  if (clinicEvent !== WOMENS_HEALTH_DAY || !patientId || !clinicDate) return '';
  const reasons = entries.filter((entry) =>
    entry.programType === "Women's Health Day" &&
    String(entry.patientId) === String(patientId) &&
    entry.status === 'Accepted' && entry.specialtyDate === clinicDate
  ).map((entry) => String(entry.reason || '').trim()).filter(Boolean);
  return [...new Set(reasons)].join('; ');
}

export function womensHealthQueuePreference(entries, patientId, encounter, eventDate = '') {
  const date = String(encounter?.clinicDate || '').slice(0, 10);
  const matches = (entries || []).filter((entry) => entry.programType === "Women's Health Day" &&
    String(entry.patientId) === String(patientId) && entry.status === 'Accepted' && entry.specialtyDate === date);
  if (!isWomensHealthEncounter(encounter) && !(date && date === eventDate && matches.length)) return null;
  const values = [...new Set(matches.map((entry) => entry.clinicianGenderPreference || ''))];
  if (values.length !== 1 || !['Female', 'No Preference'].includes(values[0])) return 'Not Recorded';
  return values[0];
}
