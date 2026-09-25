import { getEncounterVisitTypeKey } from '../constants.js';

const PROGRAMS = {
  pt: 'Physical Therapy', physical_therapy: 'Physical Therapy',
  dermatology: 'Dermatology', ophthalmology: 'Ophthalmology',
  mental_health: 'Mental Health', counseling: 'Counseling',
  addiction: 'Addiction Medicine', addiction_medicine: 'Addiction Medicine',
};

export function specialtyProgram(encounter) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  const key = String(encounter?.specialtyType || intake.specialtyType || intake.specialty_type || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const type = getEncounterVisitTypeKey(encounter);
  if (!['specialty_only', 'both'].includes(type) && encounter?.dualVisit !== true && intake.dualVisit !== true) return '';
  return PROGRAMS[key] || '';
}

export function matchingSpecialtyTracker(entries, patientId, encounter) {
  const program = specialtyProgram(encounter);
  const date = String(encounter?.clinicDate || encounter?.clinic_date || '').slice(0, 10);
  if (!program || !patientId || !date) return null;
  const matches = (entries || []).filter((entry) => {
    if (String(entry.patientId) !== String(patientId) || entry.programType !== program) return false;
    if (entry.createdAt && String(entry.createdAt).slice(0, 10) > date) return false;
    if (entry.specialtyDate) return entry.specialtyDate === date;
    return !['Completed', 'Declined', 'Denied', 'Unable to Reach'].includes(entry.status);
  });
  matches.sort((a, b) => Number(Boolean(b.specialtyDate)) - Number(Boolean(a.specialtyDate)) ||
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.id).localeCompare(String(a.id)));
  return matches[0] || null;
}

export function specialtyTrackerVisits(entries, patients) {
  const visits = new Map();
  const priority = (visit) => visit.status === 'Visit completed' ? 2 : visit.status === 'Checked in' ? 1 : 0;
  for (const patient of patients || []) {
    for (const encounter of patient.encounters || []) {
      const entry = matchingSpecialtyTracker(entries, patient.id, encounter);
      if (!entry) continue;
      const date = String(encounter.clinicDate || encounter.clinic_date || '').slice(0, 10);
      const completed = ['done', 'Completed', 'completed'].includes(encounter.status);
      const cancelled = ['cancelled', 'Cancelled'].includes(encounter.status);
      const visit = { date, encounterId: encounter.id, status: cancelled ? 'Cancelled' : completed ? 'Visit completed' : 'Checked in' };
      const previous = visits.get(String(entry.id));
      if (!previous || date > previous.date || (date === previous.date && priority(visit) > priority(previous))) visits.set(String(entry.id), visit);
    }
  }
  return visits;
}
