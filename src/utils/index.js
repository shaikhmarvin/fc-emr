export function calculateAge(dob) {
  if (!dob) return "";
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? String(age) : "";
}

export function generateMrn() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getPatientBoardName(patient) {
  const first = patient.firstName?.trim() || "";
  const last = patient.lastName?.trim() || "";

  if (!first && !last) return "Unknown";
  if (!last) return first;

  return `${first} ${last[0].toUpperCase()}`;
}

export function getLatestEncounter(patient) {
  if (!patient?.encounters?.length) return null;

  return [...patient.encounters].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )[0];
}

export function getFullPatientName(patient) {
  const first = patient.firstName?.trim() || "";
  const last = patient.lastName?.trim() || "";
  const preferred = patient.preferredName?.trim() || "";

  const base = `${first} ${last}`.trim();
  if (preferred) return `${base} (${preferred})`;
  return base;
}

export function getStudentBoardName(name) {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed.split(" ")[0];
}

export function formatWaitTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  return `${mins} min`;
}

export function isPapRestricted(encounter) {
  return encounter.papStatus === "Interested";
}

export function getStatusClasses(status) {
  switch (status) {
    case "started":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "undergrad_complete":
      return "bg-purple-100 text-purple-800 border-purple-200";

    case "ready":
      return "bg-blue-100 text-blue-800 border-blue-200";

    case "roomed":
      return "bg-green-100 text-green-800 border-green-200";

    case "in_visit":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";

    case "done":
      return "bg-slate-200 text-slate-600 border-slate-300";

    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";

    default:
      return "bg-white text-slate-700 border-slate-200";
  }
}

export function getStatusLabel(status, soapStatus) {
  if (soapStatus === "signed") return "Closed";

  switch (status) {
    case "started":
      return "Intake Started";
    case "undergrad_complete":
      return "Undergrad Complete";
    case "ready":
      return "Ready for Assignment";
    case "roomed":
      return "Roomed";
    case "in_visit":
      return "In Visit";
    case "done":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status || "—";
  }
}

export function parseHeightToInches(height) {
  const match = height.match(/^(\d{1})'(\d{1,2})"?$/);
  if (!match) return null;
  const feet = Number(match[1]);
  const inches = Number(match[2]);
  return feet * 12 + inches;
}

export function calculateBmi(weight, height) {
  const weightNum = Number(weight);
  const totalInches = parseHeightToInches(height);
  if (!weightNum || !totalInches) return "";
  return ((weightNum / (totalInches * totalInches)) * 703).toFixed(1);
}

export function normalizeBp(value) {
  const cleaned = value.replace(/[^\d/]/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 1) return parts[0].slice(0, 3);
  return `${parts[0].slice(0, 3)}/${(parts[1] || "").slice(0, 3)}`;
}

export function normalizePain(value) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  let num = Number(digits);
  if (num > 10) num = 10;
  return `${num}/10`;
}

export function normalizeHeight(value) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  const feet = digits[0];
  const inches = digits.slice(1, 3);
  if (!inches) return `${feet}'`;
  return `${feet}'${inches}"`;
}

export function formatDate(dateString) {
  if (!dateString) return "—";

  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }

  return dateString;
}

export function formatClinicDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeClinicDate(dateStr) {
  if (!dateStr) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
const month = String(parsed.getMonth() + 1).padStart(2, "0");
const day = String(parsed.getDate()).padStart(2, "0");
return `${year}-${month}-${day}`;
}

export function createEncounterFromIntake(form) {
  return {
    id: Date.now(),
    clinicDate: formatClinicDate(),
    createdAt: new Date().toISOString(),
    newReturning: form.newReturning,
    visitLocation: form.visitLocation,
    chiefComplaint: form.chiefComplaint,
    notes: form.notes,
    transportation: form.transportation,
    needsElevator: form.needsElevator,
    spanishSpeaking: form.spanishSpeaking,
    mammogramStatus: form.mammogramStatus,
    papStatus: form.papStatus,
    fluShot: form.fluShot,
    htn: form.htn,
    dm: form.dm,
    labsLast6Months: form.labsLast6Months,
    tobaccoScreening: form.tobaccoScreening,
    dermatology: form.dermatology,
    ophthalmology: form.ophthalmology,
    optometry: form.optometry,
    diabeticEyeExamPastYear: form.diabeticEyeExamPastYear,
    physicalTherapy: form.physicalTherapy,
    mentalHealthCombined: form.mentalHealthCombined,
    counseling: form.counseling,
    anyMentalHealthPositive: form.anyMentalHealthPositive,
    status: "started",
    assignedStudent: "",
    assignedUpperLevel: "",
    roomNumber: "",
    vitalsHistory: [],
    soapSubjective: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: "",
    soapSavedAt: "",
  };
}

export function canAssignRoom(encounter, roomNumber) {
  if (!encounter) return false;

  if (isPapRestricted(encounter) && (roomNumber === 9 || roomNumber === 10)) {
    return false;
  }

  return true;
}

export function mapDbStatusToUi(status) {
  switch (status) {
    case "started":
      return "started";
    case "undergrad_complete":
      return "undergrad_complete";
    case "ready":
      return "ready";
    case "roomed":
      return "roomed";
    case "in_visit":
      return "in_visit";
    case "done":
      return "done";
    case "cancelled":
      return "cancelled";
    case "waiting":
      return "started";
    default:
      return "started";
  }
}

export function normalizeForDuplicateCheck(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function findPotentialDuplicatePatient(
  patients,
  firstName,
  lastName,
  dob,
  last4ssn,
  excludePatientId = null
) {
  return patients.find((patient) => {
    if (excludePatientId && patient.id === excludePatientId) return false;

    const sameDob =
      normalizeForDuplicateCheck(patient.dob) ===
      normalizeForDuplicateCheck(dob);

    const sameFirst =
      normalizeForDuplicateCheck(patient.firstName) ===
      normalizeForDuplicateCheck(firstName);

    const sameLast =
      normalizeForDuplicateCheck(patient.lastName) ===
      normalizeForDuplicateCheck(lastName);

    const inputLast4 = normalizeForDuplicateCheck(last4ssn);
    const patientLast4 = normalizeForDuplicateCheck(patient.last4ssn);

    const hasLast4OnBoth = inputLast4 && patientLast4;
    const sameLast4 = hasLast4OnBoth ? inputLast4 === patientLast4 : true;

    return sameDob && sameFirst && sameLast && sameLast4;
  });
}

export function mrnExists(patients, mrn, excludePatientId = null) {
  const normalizedMrn = String(mrn || "").trim().toLowerCase();
  if (!normalizedMrn) return false;

  return patients.some((patient) => {
    if (excludePatientId && patient.id === excludePatientId) return false;

    return (
      String(patient.mrn || "").trim().toLowerCase() === normalizedMrn
    );
  });
}

export function sortEncountersByDate(encounters = []) {
  return [...encounters].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.clinicDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.clinicDate || 0).getTime();
    return bTime - aTime;
  });
}

export function isEncounterActive(encounter) {
  return (
    encounter.status !== "done" &&
    encounter.soapStatus !== "signed"
  );
}