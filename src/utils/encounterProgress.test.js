import test from "node:test";
import assert from "node:assert/strict";
import { preserveRegistrationProgress, isolateGeneralVisitUpdates } from "./encounterProgress.js";

test("stale undergrad save does not overwrite completed leadership intake", () => {
  const updates = { status: "undergrad_complete", leadershipIntakeComplete: false, dailyNumber: "14", undergradCompletedAt: "now" };
  for (const status of ["ready", "roomed", "in_visit", "done", "cancelled"]) {
    const saved = preserveRegistrationProgress(updates, { status, leadership_intake_complete: true });
    assert.equal("status" in saved, false);
    assert.equal("leadershipIntakeComplete" in saved, false);
    assert.equal(saved.dailyNumber, "14");
    assert.equal(saved.undergradCompletedAt, "now");
  }
  assert.equal(updates.status, "undergrad_complete");
});

test("unfinished general and new refill registrations can still complete undergrad intake", () => {
  const updates = { status: "undergrad_complete", undergradCompletedAt: "now" };
  assert.deepEqual(preserveRegistrationProgress(updates, { status: "started", leadership_intake_complete: false }), updates);
  assert.deepEqual(preserveRegistrationProgress({ status: "done" }, { status: "ready" }), { status: "done" });
});

test("refill visit changes do not copy intake progress onto existing general visit", () => {
  const general = { id: "general", status: "ready", leadershipIntakeComplete: true };
  const refill = { id: "refill", status: "undergrad_complete", leadershipIntakeComplete: false };
  const updates = { status: refill.status, leadershipIntakeComplete: false, undergradCompletedAt: "refill-time", dailyNumber: "14" };
  const result = { ...general, ...isolateGeneralVisitUpdates(updates, refill, general) };
  assert.equal(result.status, "ready");
  assert.equal(result.leadershipIntakeComplete, true);
  assert.equal(result.undergradCompletedAt, undefined);
  assert.deepEqual(isolateGeneralVisitUpdates(updates, general, general), updates);
});

test("refill completion never authorizes unfinished general leadership intake", () => {
  const general = { id: "g", status: "started", leadershipIntakeComplete: false };
  const result = { ...general, ...isolateGeneralVisitUpdates({ status: "ready", leadershipIntakeComplete: true }, { id: "r" }, general) };
  assert.equal(result.status, "started");
  assert.equal(result.leadershipIntakeComplete, false);
  assert.equal("status" in preserveRegistrationProgress({ status: "undergrad_complete" }, { leadership_intake_completed_at: "earlier" }), false);
});
