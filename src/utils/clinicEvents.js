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
