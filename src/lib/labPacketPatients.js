// Refresh identities only; review rows and progress must never be reset by directory loading.
export function refreshLabPacketPatient(packet, patients, suggest) {
  const savedId = packet.confirmedPatient?.id || packet.matchedPatient?.id || packet.matchedPatientId;
  const byId = new Map(patients.map(patient => [String(patient.id), patient]));
  const confirmed = savedId ? byId.get(String(savedId)) || (!patients.length ? packet.confirmedPatient || packet.matchedPatient : null) : null;
  if (confirmed) return { ...packet, matchedPatientId: confirmed.id, matchedPatient: confirmed,
    confirmedPatient: confirmed, matchStatus: 'matched', possibleMatches: [], unresolvedReason: '' };
  if (!patients.length) return { ...packet, matchStatus: 'loading_patients',
    unresolvedReason: 'Waiting for the patient directory. Suggestions will update when it is available.' };
  // A missing saved chart needs attention; never replace it with a different chart automatically.
  if (savedId) return { ...packet, matchedPatientId: savedId, matchedPatient: null, confirmedPatient: null,
    matchStatus: 'unresolved', possibleMatches: [], unresolvedReason: 'The previously confirmed chart is not in the loaded patient directory. Refresh the directory or select the patient again.' };
  const result = suggest(patients, packet.extractedPatientName || '', packet.extractedDob || '');
  const ids = [...(packet.possibleMatchIds || []), ...(packet.possibleMatches || []).map(patient => patient.id)];
  const candidates = [...ids.map(id => byId.get(String(id))).filter(Boolean), ...(result.match ? [result.match] : []), ...(result.possible || [])];
  const possibleMatches = [...new Map(candidates.map(patient => [String(patient.id), patient])).values()];
  return { ...packet, matchedPatient: null, confirmedPatient: null, possibleMatches,
    matchStatus: possibleMatches.length ? 'possible_match' : 'unresolved',
    unresolvedReason: possibleMatches.length ? '' : result.reason || 'No patient suggestions found. Search by name, MRN, or date of birth.' };
}
