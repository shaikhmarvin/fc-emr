import { isGeneralClinicEncounter } from "../constants.js";

function normalizeDiagnosisText(value) {
  if (value && typeof value === "object") {
    return String(value.name || value.label || value.diagnosis || "").toLowerCase();
  }

  return String(value || "").toLowerCase();
}

function isAffirmative(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "1"].includes(String(value || "").trim().toLowerCase());
}

export function diagnosisTextMatches(value, diagnosis) {
  const text = normalizeDiagnosisText(value);

  if (diagnosis === "htn") {
    return /\b(htn|hypertension|high blood pressure)\b/.test(text);
  }

  if (diagnosis === "dm") {
    return /\b(dm(?:1|2)?|t(?:1|2)dm|diabetes|diabetic|type\s*(?:1|2|i|ii)\s*diabetes)\b/.test(text);
  }

  return false;
}

export function patientHasPriorDiagnosis(patient, diagnosis) {
  if (!patient) return false;

  const profileDiagnoses = [
    ...(Array.isArray(patient.chronicConditions) ? patient.chronicConditions : []),
    patient.chronicConditionsOther,
  ];

  if (profileDiagnoses.some((value) => diagnosisTextMatches(value, diagnosis))) {
    return true;
  }

  return (patient.encounters || []).some((encounter) => {
    if (!isGeneralClinicEncounter(encounter)) return false;

    if (isAffirmative(encounter?.[diagnosis])) return true;

    const intakeData = encounter?.intakeData || encounter?.intake_data || {};
    if (isAffirmative(intakeData?.[diagnosis])) return true;

    const encounterDiagnoses = [
      ...(Array.isArray(encounter?.chronicConditions) ? encounter.chronicConditions : []),
      encounter?.chronicConditionsOther,
    ];

    return encounterDiagnoses.some((value) => diagnosisTextMatches(value, diagnosis));
  });
}

