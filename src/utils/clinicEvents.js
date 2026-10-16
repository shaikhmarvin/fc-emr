export const WOMENS_HEALTH_DAY = "womens_health_day";

export function clinicEventForDate(clinicDate, eventDate) {
  return eventDate && String(clinicDate || '').slice(0, 10) === eventDate ? WOMENS_HEALTH_DAY : "";
}

export function encounterClinicEvent(encounter, eventDate = '') {
  const saved = [encounter?.intake_data?.clinicEvent, encounter?.intake_data?.clinic_event,
    encounter?.intakeData?.clinicEvent, encounter?.intakeData?.clinic_event,
    encounter?.clinicEvent, encounter?.clinic_event].map(value => String(value || '').trim()).find(Boolean);
  return saved || clinicEventForDate(encounter?.clinicDate || encounter?.clinic_date, eventDate);
}

export function isWomensHealthEncounter(encounter, eventDate = '') {
  return encounterClinicEvent(encounter, eventDate) === WOMENS_HEALTH_DAY;
}

export function patientsForClinicEvent(patients, clinicEvent = "", eventDate = '') {
  return patients.map((patient) => ({ ...patient, encounters: (patient.encounters || []).filter((encounter) =>
    isWomensHealthEncounter(encounter, eventDate) === (clinicEvent === WOMENS_HEALTH_DAY)) }));
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
