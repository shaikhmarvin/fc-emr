import { getEncounterVisitTypeKey } from '../constants.js';

const PROGRAMS = {
  pt: 'Physical Therapy', physical_therapy: 'Physical Therapy',
  dermatology: 'Dermatology', derm: 'Dermatology', ophthalmology: 'Ophthalmology', ophtho: 'Ophthalmology', optho: 'Ophthalmology',
  mental_health: 'Mental Health', counseling: 'Counseling',
  addiction: 'Addiction Medicine', addiction_medicine: 'Addiction Medicine',
};

export const MENTAL_HEALTH_ADDICTION = 'Mental Health / Addiction Medicine';

// Historical check-ins used these labels interchangeably. Keep clinical labels
// intact while treating both as one service for reporting and visit history.
export function specialtyReportingGroup(program) {
  return ['Mental Health', 'Addiction Medicine', MENTAL_HEALTH_ADDICTION].includes(program) ? MENTAL_HEALTH_ADDICTION : program;
}

export function specialtyProgram(encounter) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  const key = String(encounter?.specialtyType || encounter?.specialty_type || (encounter?.noteType === 'ophthalmology' ? 'ophthalmology' : '') || intake.specialtyType || intake.specialty_type || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const type = getEncounterVisitTypeKey(encounter);
  if (!['specialty_only', 'both'].includes(type) && encounter?.dualVisit !== true && intake.dualVisit !== true && encounter?.noteType !== 'ophthalmology') return '';
  return PROGRAMS[key] || '';
}

export function matchingSpecialtyTracker(entries, patientId, encounter) {
  const program = specialtyProgram(encounter);
  const date = String(encounter?.clinicDate || encounter?.clinic_date || '').slice(0, 10);
  if (!program || !patientId || !date) return null;
  const linkedId = encounter.specialtyTrackerId || encounter.intakeData?.specialtyTrackerId || encounter.intake_data?.specialtyTrackerId;
  if (linkedId) return (entries || []).find(entry => String(entry.id) === String(linkedId) && String(entry.patientId) === String(patientId) && specialtyReportingGroup(entry.programType) === specialtyReportingGroup(program)) || null;
  const matches = (entries || []).filter((entry) => {
    if (String(entry.patientId) !== String(patientId) || specialtyReportingGroup(entry.programType) !== specialtyReportingGroup(program)) return false;
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

export function specialtyVisitHistory(patients) {
  const history = new Map();
  for (const patient of patients || []) for (const encounter of patient.encounters || []) {
    const program = specialtyProgram(encounter);
    const date = String(encounter.clinicDate || encounter.clinic_date || '').slice(0, 10);
    if (!program || !date) continue;
    const status = String(encounter.status || '').toLowerCase();
    const visit = { date, encounterId: encounter.id, status: status === 'cancelled' ? 'Cancelled' : ['done', 'completed'].includes(status) ? 'Visit completed' : 'Checked in' };
    const key = patient.id + ':' + program;
    const visits = history.get(key) || [];
    if (!visits.some(v => v.encounterId === visit.encounterId)) visits.push(visit);
    history.set(key, visits);
  }
  for (const visits of history.values()) visits.sort((a, b) => b.date.localeCompare(a.date));
  return history;
}
export function completedSpecialtyDates(history, entry) {
  const programs = specialtyReportingGroup(entry.programType) === MENTAL_HEALTH_ADDICTION
    ? ['Mental Health', 'Addiction Medicine'] : [entry.programType];
  const visits = programs.flatMap(program => history.get(entry.patientId + ':' + program) || []);
  return [...new Set(visits.filter(visit => visit.status === 'Visit completed').map(visit => visit.date))].sort();
}
export function trackerCompletionDates(history, entry) {
  return completedSpecialtyDates(history, entry).filter(date => entry.specialtyDate ? date === entry.specialtyDate : !entry.createdAt || date >= String(entry.createdAt).slice(0, 10));
}

export function isPtNoShow(history, entry, today) {
  if (entry.programType !== 'Physical Therapy' || entry.status !== 'Scheduled' ||
      !entry.patientId || !entry.specialtyDate || entry.specialtyDate >= today) return false;
  const visits = history.get(entry.patientId + ':Physical Therapy') || [];
  return !visits.some(visit => visit.date === entry.specialtyDate);
}

export function specialtyScheduleByDate(entries, history, today) {
  const byDate = new Map();
  for (const entry of entries) {
    const schedule = { ...entry.scheduleHistory };
    const { specialtyDate, status, scheduleType, appointmentSlot } = entry;
    if (specialtyDate && !schedule[specialtyDate] && (
      ['Scheduled', 'Backup', 'Attempted Contact', 'Unable to Reach'].includes(status) ||
      (status === 'Completed' && ['primary', 'backup'].includes(scheduleType))
    )) {
      schedule[specialtyDate] = { status, scheduleType, appointmentSlot };
    }

    const programs = specialtyReportingGroup(entry.programType) === MENTAL_HEALTH_ADDICTION
      ? ['Mental Health', 'Addiction Medicine'] : [entry.programType];
    const visits = programs.flatMap(program => history.get(entry.patientId + ':' + program) || []);
    for (const [date, appointment] of Object.entries(schedule)) {
      const sameDay = visits.filter(visit => visit.date === date);
      const attendance = ['Visit completed', 'Checked in', 'Cancelled'].find(
        visitStatus => sameDay.some(visit => visit.status === visitStatus)
      );
      const savedCompletion = date === specialtyDate && status === 'Completed';
      const noShow = !attendance && !savedCompletion && isPtNoShow(history, {
        ...entry, status: appointment.status, specialtyDate: date,
      }, today);
      const roster = byDate.get(date) || [];
      roster.push({
        id: entry.id,
        patientName: entry.patientName,
        appointmentSlot: appointment.appointmentSlot,
        status: attendance || (savedCompletion ? 'Completed' : noShow ? 'No Show' : appointment.status),
      });
      byDate.set(date, roster);
    }
  }
  return byDate;
}

export function matchesSpecialtyFilter(encounter, filter = '') {
  return !filter || (filter === 'lwobs' ? String(encounter?.status).toLowerCase() === 'cancelled' : specialtyProgram(encounter) === filter);
}
