import { specialtyProgram, specialtyReportingGroup, MENTAL_HEALTH_ADDICTION } from './specialtyTracker.js';

const SPECIALTIES = ['Dermatology', 'Physical Therapy', MENTAL_HEALTH_ADDICTION, 'Ophthalmology', 'Counseling'];
const completed = encounter => ['done', 'completed'].includes(String(encounter.status || '').toLowerCase());
const day = encounter => String(encounter.clinicDate || encounter.clinic_date || '').slice(0, 10);
const name = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const patientName = patient => [patient.firstName, patient.lastName].filter(Boolean).join(' ');

function trackerIdentity(entry, patients) {
  // Resolve legacy tracker rows only when the chart match is unambiguous.
  const matches = patients.filter(patient => entry.patientId
    ? String(patient.id) === String(entry.patientId)
    : entry.mrn ? name(patient.mrn) === name(entry.mrn)
      : entry.patientName && entry.dob && name(patientName(patient)) === name(entry.patientName) && patient.dob === entry.dob);
  const patient = matches.length === 1 ? matches[0] : null;
  const key = patient ? 'patient:' + patient.id : entry.patientId ? 'patient:' + entry.patientId
    : entry.mrn ? 'mrn:' + name(entry.mrn) : entry.patientName && entry.dob ? 'person:' + name(entry.patientName) + ':' + entry.dob : 'entry:' + entry.id;
  return { key, patientId: patient?.id || entry.patientId || '', patientName: patient ? patientName(patient) : entry.patientName || 'Unnamed tracker patient',
    date: '', encounter: null, program: specialtyReportingGroup(entry.programType), recordedProgram: entry.programType };
}

export function buildSpecialtyAnalytics(patients = [], start, end, programEntries = [], historyPatients = patients) {
  const rows = patients.flatMap(patient => (patient.encounters || []).filter(completed).map(encounter => ({
    patientId: patient.id, patientName: patientName(patient), encounter, date: day(encounter), program: specialtyReportingGroup(specialtyProgram(encounter)), recordedProgram: specialtyProgram(encounter),
  }))).filter(row => row.program && row.date && (!start || row.date >= start) && (!end || row.date <= end));
  const seenHistory = new Set(historyPatients.flatMap(patient => (patient.encounters || [])
    .filter(encounter => completed(encounter) && day(encounter) && (!end || day(encounter) <= end) && specialtyProgram(encounter))
    .map(encounter => String(patient.id) + ':' + specialtyReportingGroup(specialtyProgram(encounter)))));

  return { groups: SPECIALTIES.map(program => {
    // Multiple encounters on the same day represent one patient clinic visit.
    const visitByPatientDate = new Map();
    for (const row of rows.filter(row => row.program === program)) {
      const key = String(row.patientId) + ':' + row.date;
      const previous = visitByPatientDate.get(key);
      const recordedPrograms = [...new Set([...(previous?.recordedPrograms || []), row.recordedProgram])];
      visitByPatientDate.set(key, { ...row, recordedPrograms, recordedProgram: recordedPrograms.join(' + ') });
    }
    const visits = [...visitByPatientDate.values()];
    const patientsSeen = [...new Map(visits.map(row => [String(row.patientId), row])).values()];
    const repeatPatients = patientsSeen.filter(row => visits.filter(visit => String(visit.patientId) === String(row.patientId)).length > 1);
    const trackerPatients = program === 'Ophthalmology' ? null : [...new Map(programEntries
      .filter(entry => specialtyReportingGroup(entry.programType) === program && !entry.archivedAt && !entry.archived_at)
      .map(entry => trackerIdentity(entry, historyPatients)).map(row => [row.key, row])).values()];
    const notSeen = trackerPatients?.filter(row => !row.patientId || !seenHistory.has(String(row.patientId) + ':' + program)) ?? null;
    return { program, visits, patientsSeen, repeatPatients, trackerPatients, notSeen };
  }) };
}
