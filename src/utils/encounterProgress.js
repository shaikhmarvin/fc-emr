// Registration edits must not undo work completed on this encounter while
// the form was open, or import the progress of a different same-day visit.
export function preserveRegistrationProgress(updates, encounter = {}) {
  if (!["started", "undergrad_complete"].includes(updates.status)) return updates;
  const completed = encounter.leadershipIntakeComplete === true ||
    encounter.leadership_intake_complete === true ||
    Boolean(encounter.leadershipIntakeCompletedAt || encounter.leadership_intake_completed_at);
  const progressed = ["ready", "roomed", "in_visit", "done", "cancelled"].includes(encounter.status);
  if (!completed && !progressed) return updates;
  const next = { ...updates };
  // Omit workflow fields rather than writing a potentially stale snapshot back.
  delete next.status;
  delete next.leadershipIntakeComplete;
  delete next.leadershipIntakeCompletedAt;
  return next;
}

export function isolateGeneralVisitUpdates(updates, selected, general) {
  if (!general || String(general.id) === String(selected.id)) return updates;
  const next = { ...updates };
  for (const field of ["status", "undergradCompletedAt", "leadershipIntakeComplete", "leadershipIntakeCompletedAt", "readyAt"]) {
    delete next[field];
  }
  return next;
}
