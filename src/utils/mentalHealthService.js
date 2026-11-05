import { MENTAL_HEALTH_ADDICTION, specialtyReportingGroup } from './specialtyTracker.js';

// Use an existing storage value so saved charts and referrals stay compatible.
export function mentalHealthProgramType(program) {
  return specialtyReportingGroup(program) === MENTAL_HEALTH_ADDICTION ? 'Mental Health' : program;
}
export function mentalHealthSpecialtyType(type) {
  const key = String(type || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  return ['mental_health', 'addiction', 'addiction_medicine', 'mental_health_addiction'].includes(key) ? 'mental_health' : type;
}
export function combinedMentalHealthSettings(rows) {
  const mental = rows.find(row => row.program_type === 'Mental Health');
  const addiction = rows.find(row => row.program_type === 'Addiction Medicine');
  const existing = mental || addiction;
  if (!existing) return rows;
  const combined = { ...existing, program_type: 'Mental Health',
    next_specialty_date: mental?.next_specialty_date || addiction?.next_specialty_date || '',
    rooms_assigned: { ...existing.rooms_assigned, rooms: [...new Set([...(mental?.rooms_assigned?.rooms || []), ...(addiction?.rooms_assigned?.rooms || [])])] },
  };
  return [...rows.filter(row => !['Mental Health', 'Addiction Medicine'].includes(row.program_type)), combined];
}

export function combinedMentalHealthAccess(access) {
  return access.some(program => mentalHealthProgramType(program) === 'Mental Health')
    ? [...new Set([...access, 'Mental Health', 'Addiction Medicine'])] : access;
}
