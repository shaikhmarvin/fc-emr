import test from "node:test";
import assert from "node:assert/strict";
import { canReceivePtCheckIns, getNewPtCheckIns } from "./ptCheckInNotifications.js";

const date = "2026-09-30";
const row = (id, extra = {}) => ({ patient: { id: "p" }, encounter: { id, clinicDate: date, specialtyType: "pt", visitType: "specialty_only", status: "undergrad_complete", ...extra } });

test("PT role and checkbox independently qualify for check-in notifications", () => {
  assert.equal(canReceivePtCheckIns("physical_therapy"), true);
  assert.equal(canReceivePtCheckIns("student", ["Physical Therapy"]), true);
  assert.equal(canReceivePtCheckIns("leadership", ["Physical Therapy"]), true);
  assert.equal(canReceivePtCheckIns("student", ["Ophthalmology"]), false);
  assert.equal(canReceivePtCheckIns("leadership"), false);
});

test("PT check-ins include combined visits and exclude other dates, services, and finished visits", () => {
  const rows = [row("new"), row("both", { visitType: "both", specialtyType: "Physical Therapy" }), row("old", { clinicDate: "2026-09-29" }), row("done", { status: "done" }), row("cancelled", { status: "cancelled" }), row("other", { specialtyType: "ophthalmology" }), row("refill", { visitType: "refill_only" }), row("signed", { soapStatus: "signed" })];
  assert.deepEqual(getNewPtCheckIns(rows, date, new Set()).map(r => r.encounter.id), ["new", "both"]);
});

test("refreshes and encounter updates do not repeat acknowledged check-ins", () => {
  const seen = new Set(["1"]);
  assert.deepEqual(getNewPtCheckIns([row(1, { status: "ready" }), row("2")], date, seen).map(r => r.encounter.id), ["2"]);
});
