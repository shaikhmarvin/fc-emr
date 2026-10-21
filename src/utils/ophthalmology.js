export function isOphthoEncounter(encounter) {
  return encounter?.noteType === 'ophthalmology' || encounter?.specialtyType === 'ophthalmology';
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
