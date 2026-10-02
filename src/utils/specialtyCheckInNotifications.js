import { specialtyProgram } from './specialtyTracker.js';

export function specialtyCheckIns(rows, date, role, access, acknowledged) {
  return rows.filter(({ encounter }) => {
    const program = specialtyProgram(encounter);
    return program && (access.includes(program) || (role === 'physical_therapy' && program === 'Physical Therapy') || (role === 'counseling' && program === 'Counseling')) &&
      String(encounter.clinicDate || '').slice(0, 10) === date &&
      !['done', 'completed', 'cancelled'].includes(String(encounter.status).toLowerCase()) &&
      encounter.soapStatus !== 'signed' && encounter.disciplineNoteStatus !== 'signed' &&
      !acknowledged.has(`${encounter.id}:${program}`);
  });
}
