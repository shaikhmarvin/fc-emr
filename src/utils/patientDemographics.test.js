import test from "node:test";
import assert from "node:assert/strict";
import { intakeDemographics } from "./patientDemographics.js";

test("existing patient intake persists newly entered sex and ethnicity", () => {
  assert.deepEqual(intakeDemographics({ sex: "Female", ethnicity: "Asian" }, {}), { sex: "Female", ethnicity: "Asian" });
});

test("blank intake answers preserve existing demographics", () => {
  assert.deepEqual(intakeDemographics({ sex: "", ethnicity: " " }, { sex: "Male", ethnicity: "White" }), { sex: "Male", ethnicity: "White" });
});

test("missing answers do not invent demographics or request database clearing", () => {
  assert.deepEqual(intakeDemographics(), { sex: undefined, ethnicity: undefined });
});

test("explicit intake corrections replace old values", () => {
  assert.deepEqual(intakeDemographics({ sex: "Prefer not to say", ethnicity: "Asian" }, { sex: "Other", ethnicity: "White" }), { sex: "Prefer not to say", ethnicity: "Asian" });
});
