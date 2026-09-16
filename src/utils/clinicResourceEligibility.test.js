import test from "node:test";
import assert from "node:assert/strict";
import { isClinicResourceAvailable } from "./clinicResourceEligibility.js";

const settings = [{
  resource_key: "womens_health_day",
  enabled: true,
  sex_restriction: "female",
  min_age: 18,
  max_age: 75,
  seasonal: false,
}];

test("Women’s Health Day intake follows enabled, female, and age settings", () => {
  assert.equal(isClinicResourceAvailable("womens_health_day", settings, { sex: "Female", age: 35 }), true);
  assert.equal(isClinicResourceAvailable("womens_health_day", settings, { sex: "Male", age: 35 }), false);
  assert.equal(isClinicResourceAvailable("womens_health_day", settings, { sex: "Female", age: 17 }), false);
  assert.equal(isClinicResourceAvailable("womens_health_day", settings, { sex: "Female", age: 76 }), false);
  assert.equal(isClinicResourceAvailable("womens_health_day", [{ ...settings[0], enabled: false }], { sex: "Female", age: 35 }), false);
  assert.equal(isClinicResourceAvailable("womens_health_day", [], { sex: "Female", age: 35 }), false);
});
