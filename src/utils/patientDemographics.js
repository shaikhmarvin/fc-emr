export const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
export const ETHNICITY_OPTIONS = ["Hispanic or Latino", "Asian", "Black or African American", "White", "Middle Eastern"];

// An unanswered intake question must not clear an existing chart value.
// Explicit clearing remains available through Edit Patient Info.
export function intakeDemographics(form = {}, patient = {}) {
  return {
    sex: String(form.sex || "").trim() || patient.sex || undefined,
    ethnicity: String(form.ethnicity || "").trim() || patient.ethnicity || undefined,
  };
}
