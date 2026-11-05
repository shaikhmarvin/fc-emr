import { specialtyProgram } from './specialtyTracker.js';
export const SPECIALTY_INTEREST_FIELDS = {
  Dermatology: 'dermatology', 'Physical Therapy': 'physicalTherapy',
  'Mental Health': 'mentalHealthCombined', 'Addiction Medicine': 'substanceUseTreatment',
  Ophthalmology: 'ophthalmology', Counseling: 'counseling',
};
const value = (e, key) => e?.[key] ?? (e?.intakeData || e?.intake_data || {})[key];
export function hasSpecialtyInterest(raw) {
  return !['', 'n/a', 'na', 'no', 'none', 'not interested', 'declined', 'false', '0'].includes(String(raw ?? '').trim().toLowerCase());
}
export function buildSpecialtyAnalytics(patients, start, end) {
  const rows = (patients || []).flatMap(patient => (patient.encounters || []).map(encounter => ({
    patient, patientId: patient.id, patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' '), encounter,
    date: String(encounter.clinicDate || encounter.clinic_date || '').slice(0, 10),
    program: specialtyProgram(encounter),
  }))).filter(row => row.date && (!start || row.date >= start) && (!end || row.date <= end));
  const active = rows.filter(r => String(r.encounter.status).toLowerCase() !== 'cancelled');
  const unique = list => new Set(list.map(r => String(r.patientId))).size;
  const groups = Object.entries(SPECIALTY_INTEREST_FIELDS).map(([program, field]) => {
    const visits = rows.filter(r => r.program === program);
    const used = visits.filter(r => String(r.encounter.status).toLowerCase() !== 'cancelled');
    const completed = used.filter(r => ['done', 'completed'].includes(String(r.encounter.status).toLowerCase()));
    const interested = active.filter(r => hasSpecialtyInterest(value(r.encounter, field)));
    const assessed = active.filter(r => !['', 'n/a', 'na'].includes(String(value(r.encounter, field) ?? '').trim().toLowerCase()));
    const completedDates = new Map();
    for (const row of completed) { const dates = completedDates.get(String(row.patientId)) || new Set(); dates.add(row.date); completedDates.set(String(row.patientId), dates); }
    const repeat = completed.filter(r => completedDates.get(String(r.patientId)).size > 1);
    const unmet = interested.filter(r => !used.some(u => String(u.patientId) === String(r.patientId) && u.date >= r.date));
    return { program, visits, used, completed, interested, assessed, repeat, unmet, patients: unique(used), interestedPatients: unique(interested), assessedPatients: unique(assessed), repeatPatients: unique(repeat), unmetPatients: unique(unmet), cancelled: visits.filter(r => String(r.encounter.status).toLowerCase() === 'cancelled') };
  });
  return { rows, active, groups, patients: unique(active), used: active.filter(r => r.program), specialtyPatients: unique(active.filter(r => r.program)) };
}
