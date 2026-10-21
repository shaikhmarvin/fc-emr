import { ophthoReferral } from './ophthalmology.js';
import { specialtyProgram } from './specialtyTracker.js';

export function specialtyCheckIns(rows, date, role, access, acknowledged, entries = []) {
  return rows.filter(({ patient, encounter }) => {
    const program = specialtyProgram(encounter) || (ophthoReferral(entries, patient, encounter) ? "Ophthalmology" : "");
    return program && (access.includes(program) || (role === 'physical_therapy' && program === 'Physical Therapy') || (role === 'counseling' && program === 'Counseling')) &&
      String(encounter.clinicDate || '').slice(0, 10) === date &&
      !['done', 'completed', 'cancelled'].includes(String(encounter.status).toLowerCase()) &&
      !['signed', 'completed'].includes(encounter.soapStatus) && encounter.disciplineNoteStatus !== 'signed' &&
      !acknowledged.has(`${encounter.id}:${program}`);
  });
}
