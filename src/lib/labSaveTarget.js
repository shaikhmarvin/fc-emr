export const PATIENT_CHART_TARGET = 'patient-chart';
const day = value => {
  const text = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const time = Date.parse(text + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === text ? time : null;
};
export function labVisitDistance(encounter, collectedDate) {
  const visit = day(encounter?.clinic_date || encounter?.clinicDate);
  const collection = day(collectedDate);
  return visit === null || collection === null ? null : Math.abs(visit - collection) / 86400000;
}
export function nearbyLabEncounters(encounters, collectedDate) {
  return encounters.filter(encounter => encounter.status !== 'cancelled' && labVisitDistance(encounter, collectedDate) !== null && labVisitDistance(encounter, collectedDate) <= 2);
}
export function suggestLabSaveTarget(encounters, collectedDate) {
  if (day(collectedDate) === null) return null;
  const nearby = nearbyLabEncounters(encounters, collectedDate);
  const nearest = Math.min(...nearby.map(encounter => labVisitDistance(encounter, collectedDate)));
  const matches = nearby.filter(encounter => labVisitDistance(encounter, collectedDate) === nearest);
  return matches.length === 1 ? String(matches[0].id) : PATIENT_CHART_TARGET;
}
export function patientLabSources(patient) {
  return [
    { encounter: {}, labs: patient?.importedSendOutLabs || patient?.imported_send_out_labs || [] },
    ...(patient?.encounters || []).map(encounter => ({ encounter, labs: encounter.importedSendOutLabs || encounter.imported_send_out_labs || [] })),
  ];
}
export function validateLabDestination(labs, encounter = null) {
  for (const lab of labs) {
    if (day(lab.collectedDate) === null) throw new Error('Enter a valid collection date before saving labs.');
    if (encounter && (encounter.status === 'cancelled' || labVisitDistance(encounter, lab.collectedDate) === null || labVisitDistance(encounter, lab.collectedDate) > 2)) {
      throw new Error('This visit is more than two days from a collection date. Save to the patient chart under the collection date instead.');
    }
  }
}
