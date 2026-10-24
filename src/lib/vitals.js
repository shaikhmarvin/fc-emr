// Clinical dates belong to the encounter; entry timestamps are audit metadata.
export function vitalVisitDate(encounter = {}) {
  const value = encounter.clinicDate || encounter.createdAt || '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})(?:$|T| )/);
  return match ? match[1] : '';
}

export function vitalDateLabel(encounter, entry = {}) {
  const date = vitalVisitDate(encounter);
  if (!date) return entry.recordedAt || 'Visit date unavailable';
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}

export function createVitalEntry(values, encounter, previous = null, now = new Date().toISOString()) {
  return { ...previous, ...values, visitDate: vitalVisitDate(encounter),
    recordedAt: vitalDateLabel(encounter),
    enteredAt: previous?.enteredAt || previous?.recordedAt || now,
    ...(previous ? { updatedAt: now } : {}) };
}

export function patientVitalHistory(encounters = []) {
  return encounters.flatMap(encounter => (encounter.vitalsHistory || []).map((entry, index) => ({
    ...entry, encounterId: encounter.id, visitDate: vitalVisitDate(encounter),
    visitLabel: vitalDateLabel(encounter, entry), entryIndex: index,
  }))).sort((a, b) => b.visitDate.localeCompare(a.visitDate) ||
    String(a.encounterId).localeCompare(String(b.encounterId)) || a.entryIndex - b.entryIndex);
}
