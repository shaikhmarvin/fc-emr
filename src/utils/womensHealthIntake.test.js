import test from "node:test";
import assert from "node:assert/strict";
import { womensHealthAppointments } from "./womensHealthIntake.js";
const entry = { id: "a", programType: "Women's Health Day", status: "Accepted", specialtyDate: "2026-10-03", appointmentSlot: "10:00", patientId: "p", patientName: "Test Patient" };
test("only scheduled appointments for the event date appear", () => {
  assert.equal(womensHealthAppointments([entry, { ...entry, status: "Pending" }, { ...entry, specialtyDate: "2026-10-04" }], [], "2026-10-03").length, 1);
});
test("existing general check-in is detected without treating refills as check-in", () => {
  const patient = { id: "p", encounters: [{ clinicDate: "2026-10-03", visitType: "refill_only", status: "ready" }] };
  assert.equal(womensHealthAppointments([entry], [patient], "2026-10-03")[0].checkedIn, false);
  patient.encounters.push({ clinicDate: "2026-10-03", visitType: "general", status: "started" });
  assert.equal(womensHealthAppointments([entry], [patient], "2026-10-03")[0].checkedIn, true);
  assert.equal(womensHealthAppointments([entry], [], "2026-10-03")[0].patient, undefined);
});
