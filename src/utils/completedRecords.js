import { isOphthoEncounter } from './ophthalmology.js';

export const RECORD_TYPE_OPTIONS = [
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'medical', label: 'Medical' },
  { value: 'physical_therapy', label: 'Physical Therapy' },
  { value: 'social_work', label: 'Social Work' },
];

export function recordTypeForExport(encounter) {
  if (isOphthoEncounter(encounter)) return 'ophthalmology';
  return ['physical_therapy', 'social_work'].includes(encounter?.noteType) ? encounter.noteType : 'medical';
}

export function filterRecordTypes(rows, selectedTypes) {
  return rows.filter(({ encounter }) => selectedTypes.includes(recordTypeForExport(encounter)));
}

export function isCompletedRecordForExport(encounter, clinicDate = '') {
  if (!encounter || encounter.status === 'cancelled') return false;
  if (clinicDate && String(encounter.clinicDate || '').slice(0, 10) !== clinicDate) return false;
  if (isOphthoEncounter(encounter)) return ['completed', 'signed'].includes(encounter.soapStatus);
  return (encounter.noteType === 'physical_therapy' && encounter.disciplineNoteStatus === 'completed') ||
    encounter.soapStatus === 'signed' || Boolean(encounter.attendingSignedAt);
}
