import { getEncounterVisitTypeKey } from '../constants.js';
export function labEncounterLabel(encounter) {
  const labels = { general: 'General clinic', refill_only: 'Refill visit', specialty_only: 'Specialty visit', both: 'General + specialty' };
  const date = encounter.clinic_date || encounter.clinicDate || 'No date';
  const complaint = encounter.chief_complaint || encounter.chiefComplaint;
  return `${date} — ${labels[getEncounterVisitTypeKey(encounter)]}${complaint ? ` — ${complaint}` : ''}`;
}
export function restoreLabEncounter(encounters, progress, patientId, collectedDate, previousId = null) {
  const savedId = progress?.patientId === patientId ? progress.encounterId : previousId;
  if (savedId && encounters.some(enc => String(enc.id) === String(savedId))) return String(savedId);
  const matches = collectedDate ? encounters.filter(enc => String(enc.clinic_date || enc.clinicDate || '').slice(0, 10) === collectedDate.slice(0, 10)) : [];
  return matches.length === 1 ? String(matches[0].id) : null;
}
export function mergeLabReviewProgress(a = {}, b = {}) {
  const pages = [...new Set([...(a.reviewedPages || []), ...(b.reviewedPages || [])])];
  if (!b.patientId && !b.encounterId) return { ...a, ...b, reviewedPages: pages, targetVerified: !!a.targetVerified };
  if (!a.patientId && !a.encounterId) return { ...a, ...b, reviewedPages: pages };
  const sameTarget = a.patientId === b.patientId && a.encounterId === b.encounterId;
  return { ...a, ...b, reviewedPages: pages, targetVerified: sameTarget && !!(a.targetVerified || b.targetVerified) };
}
const keyFor = (userId, packetId) => `lab-review-draft-v1:${userId}:${packetId}`;
export function readLabReviewDraft(userId, packetId, storage = globalThis.localStorage) {
  if (!userId || !packetId) return null;
  try { return JSON.parse(storage.getItem(keyFor(userId, packetId)) || 'null'); } catch { return null; }
}
export function writeLabReviewDraft(userId, packetId, field, value, storage = globalThis.localStorage) {
  if (!userId || !packetId) return;
  const current = readLabReviewDraft(userId, packetId, storage) || {};
  storage.setItem(keyFor(userId, packetId), JSON.stringify({ ...current, [field]: value, [`${field}Pending`]: true }));
}
export function acknowledgeLabReviewDraft(userId, packetId, field, value, storage = globalThis.localStorage) {
  const current = readLabReviewDraft(userId, packetId, storage);
  if (current && JSON.stringify(current[field]) === JSON.stringify(value)) {
    storage.setItem(keyFor(userId, packetId), JSON.stringify({ ...current, [`${field}Pending`]: false }));
  }
}
export function removeLabReviewDraft(userId, packetId, storage = globalThis.localStorage) {
  if (userId && packetId) storage.removeItem(keyFor(userId, packetId));
}
