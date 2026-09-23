import test from "node:test";
import assert from "node:assert/strict";
import { WHD_DEFAULT_CAPACITIES, WHD_SLOTS, isWhdScheduled, whdSlotEntries, whdSlotLabel } from "./womensHealthSchedule.js";

const appointment = (id, extra = {}) => ({ id, programType: "Women's Health Day", status: "Accepted", specialtyDate: "2026-10-03", appointmentSlot: "10:00", reason: "", ...extra });

test("WHD starts with eight places at each requested time", () => {
  assert.deepEqual(WHD_SLOTS.map((slot) => [whdSlotLabel(slot), WHD_DEFAULT_CAPACITIES[slot]]), [["10:00 AM", 8], ["11:00 AM", 8], ["12:00 PM", 8]]);
});

test("occupancy excludes other dates, times, programs, and unscheduled patients", () => {
  const entries = [appointment(1), appointment(2, { specialtyDate: "2026-11-07" }), appointment(3, { appointmentSlot: "11:00" }), appointment(4, { status: "Pending Acceptance" }), appointment(5, { programType: "Physical Therapy" }), appointment(6, { appointmentSlot: "" })];
  assert.deepEqual(whdSlotEntries(entries, "2026-10-03", "10:00").map((entry) => entry.id), [1]);
});

test("blank reasons remain schedulable; accepted without date or time stays unscheduled", () => {
  assert.equal(isWhdScheduled(appointment(1)), true);
  assert.equal(isWhdScheduled(appointment(1, { specialtyDate: "" })), false);
  assert.equal(isWhdScheduled(appointment(1, { appointmentSlot: "" })), false);
});

test("moving and returning appointments releases their previous place", () => {
  const entries = [appointment(1), appointment(2)];
  const moved = entries.map((entry) => entry.id === 1 ? { ...entry, appointmentSlot: "12:00" } : entry);
  assert.equal(whdSlotEntries(moved, "2026-10-03", "10:00").length, 1);
  assert.equal(whdSlotEntries(moved, "2026-10-03", "12:00").length, 1);
  const returned = moved.map((entry) => entry.id === 1 ? { ...entry, status: "Pending Acceptance", specialtyDate: "", appointmentSlot: "" } : entry);
  assert.equal(isWhdScheduled(returned[0]), false);
  assert.equal(whdSlotEntries(returned, "2026-10-03", "12:00").length, 0);
});

test("existing nonstandard times remain visible", () => {
  assert.equal(whdSlotEntries([appointment(1, { appointmentSlot: "09:30" })], "2026-10-03", "09:30").length, 1);
});
