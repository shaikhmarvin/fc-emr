export function isOphthoEncounter(encounter) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  const specialty = String(encounter?.specialtyType || encounter?.specialty_type || intake.specialtyType || intake.specialty_type || '').trim().toLowerCase();
  return encounter?.noteType === 'ophthalmology' || ['ophthalmology', 'ophtho', 'optho'].includes(specialty);
}

export function ophthoReferral(entries, patient, encounter) {
  const name = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return (entries || []).filter(entry => entry.programType === 'Ophthalmology' &&
    !['Completed', 'Declined', 'Denied', 'Unable to Reach'].includes(entry.status) &&
    (!entry.specialtyDate || entry.specialtyDate === encounter?.clinicDate) &&
    (entry.patientId ? String(entry.patientId) === String(patient?.id) :
      name(entry.patientName) === name([patient?.firstName, patient?.lastName].filter(Boolean).join(' ')) && Boolean(entry.patientName) && (!entry.dob || entry.dob === patient?.dob)))
    .sort((a, b) => Number(Boolean(b.specialtyDate)) - Number(Boolean(a.specialtyDate)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}

export function matchesOphthoDay(entries, patient, encounter, mode) {
  if (mode === 'on_day') return isOphthoEncounter(encounter) || Boolean(ophthoReferral(entries, patient, encounter));
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  const interest = String(encounter?.ophthalmology || intake.ophthalmology || '').trim().toLowerCase();
  const screening = (encounter?.dm === true || intake.dm === true) && String(encounter?.diabeticEyeExamPastYear || intake.diabeticEyeExamPastYear || '').toLowerCase() !== 'yes';
  return Boolean(encounter?.leadershipIntakeComplete || encounter?.leadershipIntakeCompletedAt || encounter?.leadership_intake_completed_at) && (screening || !['', 'n/a', 'na', 'no', 'none'].includes(interest));
}

export function existingOphthoVisit(patient, clinicDate) {
  const today = new Date();
  const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const date = String(clinicDate || localDate).slice(0, 10);
  return patient?.encounters?.find(encounter =>
    String(encounter.clinicDate || encounter.clinic_date || '').slice(0, 10) === date &&
    encounter.status !== 'cancelled' && isOphthoEncounter(encounter));
}
