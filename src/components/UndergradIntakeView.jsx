
import { useMemo, useState } from "react";

const ETHNICITY_OPTIONS = [
  "Hispanic or Latino",
  "Asian",
  "Black or African American",
  "White",
  "Middle Eastern",
];

const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const YES_NO_OPTIONS = ["Yes", "No"];

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function capitalizeNameInput(value = "") {
  return String(value).replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function normalizeNamePart(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeNameTokens(value = "") {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function namePartMatchesPrefix(inputName = "", patientName = "") {
  const input = normalizeNamePart(inputName);
  const patient = normalizeNamePart(patientName);
  const inputTokens = normalizeNameTokens(inputName);
  const patientTokens = normalizeNameTokens(patientName);

  if (!input || !patient) return false;
  if (Math.min(input.length, patient.length) < 3) return false;

  if (patient.startsWith(input) || input.startsWith(patient)) return true;

  return inputTokens.some((inputToken) =>
    patientTokens.some((patientToken) => {
      if (Math.min(inputToken.length, patientToken.length) < 3) return false;
      return patientToken.startsWith(inputToken) || inputToken.startsWith(patientToken);
    })
  );
}

function FiredPatientStartModal({
  show,
  patient,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  if (!show || !patient) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-red-950/80 px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl border-4 border-red-600 bg-white shadow-2xl">
        <div className="border-b-4 border-red-600 bg-red-100 px-6 py-5">
          <p className="text-sm font-black uppercase tracking-wide text-red-800">
            Fired patient alert
          </p>
          <h2 className="mt-1 text-3xl font-black text-red-950">
            Do not start unless leadership approved
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5 text-red-950">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-700">
              Patient
            </p>
            <p className="text-2xl font-black">{getPatientFullName(patient)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                Fired Date
              </p>
              <p className="mt-1 text-lg font-extrabold">
                {patient.firedAt ? formatDisplayDate(patient.firedAt) : "Unknown"}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                Reason
              </p>
              <p className="mt-1 text-lg font-extrabold">
                {patient.firedReason || "No reason entered."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-red-500 bg-red-100 px-4 py-3">
            <p className="text-base font-black">
              Confirm with leadership before continuing. Starting this encounter will let the fired patient into the clinic flow.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel - Do Not Start
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Starting..." : "Leadership Approved - Start Encounter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function namesAreCompatible(inputName = "", patientName = "") {
  return (
    namesAreSimilar(inputName, patientName) ||
    namePartMatchesPrefix(inputName, patientName)
  );
}

function normalizeDateString(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 8);
}

function levenshteinDistance(a = "", b = "") {
  const left = normalizeNamePart(a);
  const right = normalizeNamePart(b);

  if (!left) return right.length;
  if (!right) return left.length;

  const dp = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0)
  );

  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[left.length][right.length];
}

function namesAreSimilar(inputName = "", patientName = "") {
  const input = normalizeNamePart(inputName);
  const patient = normalizeNamePart(patientName);

  if (!input || !patient) return false;
  if (input.length < 2 || patient.length < 2) return false;
  if (input === patient) return true;

  const maxLength = Math.max(input.length, patient.length);
  const allowedDistance = maxLength <= 5 ? 1 : 2;

  return levenshteinDistance(input, patient) <= allowedDistance;
}

function datesDifferByOneDigit(left = "", right = "") {
  const a = normalizeDateString(left);
  const b = normalizeDateString(right);

  if (!a || !b || a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) diff += 1;
    if (diff > 1) return false;
  }

  return diff === 1;
}

function getPatientFullName(patient) {
  return [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim() || "Unnamed patient";
}

function formatDisplayDate(value) {
  if (!value) return "—";

  const text = String(value).trim();

  const yyyyMmDd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) {
    const [, yyyy, mm, dd] = yyyyMmDd;
    return `${mm}/${dd}/${yyyy}`;
  }

  const mmDdYyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmDdYyyy) {
    const [, mm, dd, yyyy] = mmDdYyyy;
    return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${yyyy}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function getLastSeenLabel(patient) {
  const encounters = Array.isArray(patient?.encounters) ? patient.encounters : [];
  const latest = encounters
    .map((encounter) => encounter.createdAt || encounter.clinicDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest ? formatDisplayDate(latest) : "No prior visits listed";
}

function getMatchLevel(score) {
  if (score >= 10) return { label: "High match", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (score >= 7) return { label: "Possible match", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "Low match", className: "bg-slate-100 text-slate-700 border-slate-200" };
}

function buildPatientMatchCandidates(patients = [], form = {}) {
  const firstName = form.firstName || "";
  const lastName = form.lastName || "";
  const dob = form.dob || "";

  const normalizedFirst = normalizeNamePart(firstName);
  const normalizedLast = normalizeNamePart(lastName);
  const normalizedDob = normalizeDateString(dob);

  const firstNameReady = normalizedFirst.length >= 2;
  const lastNameReady = normalizedLast.length >= 3;
  const dobReady = normalizedDob.length === 8;

  // Do not show match noise until there is enough identity info entered.
  // Either a usable full-name pattern, or an exact DOB plus at least one name part.
  if (!((firstNameReady && lastNameReady) || (dobReady && (firstNameReady || lastNameReady)))) {
    return [];
  }

  return (patients || [])
    .map((patient) => {
      const patientFirst = patient.firstName || "";
      const patientLast = patient.lastName || "";
      const patientDob = patient.dob || "";

      const firstExact = normalizeNamePart(firstName) === normalizeNamePart(patientFirst);
      const lastExact = normalizeNamePart(lastName) === normalizeNamePart(patientLast);

      const firstSimilar = namesAreSimilar(firstName, patientFirst);
      const lastSimilar = namesAreSimilar(lastName, patientLast);
      const firstPrefix = namePartMatchesPrefix(firstName, patientFirst);
      const lastPrefix = namePartMatchesPrefix(lastName, patientLast);

      const firstCompatible = firstNameReady && namesAreCompatible(firstName, patientFirst);
      const lastCompatible = lastNameReady && namesAreCompatible(lastName, patientLast);

      const dobExact = normalizedDob === normalizeDateString(patientDob);
      const dobClose = !dobExact && datesDifferByOneDigit(dob, patientDob);

      const firstAndLastMatch = firstCompatible && lastCompatible;
      const exactDobWithPartialName = dobExact && (firstCompatible || lastCompatible);
      const closeDobWithStrongName = dobClose && firstAndLastMatch;

      // Intuitive matching rules:
      // 1) First + last name are compatible, including hyphen/prefix last names.
      // 2) Exact DOB + either first or last name compatible is enough to surface.
      // 3) One-digit DOB typo only surfaces when both names are compatible.
      if (!firstAndLastMatch && !exactDobWithPartialName && !closeDobWithStrongName) {
        return null;
      }

      let score = 0;

      if (firstExact) score += 4;
      else if (firstSimilar) score += 3;
      else if (firstPrefix) score += 2;

      if (lastExact) score += 5;
      else if (lastSimilar) score += 4;
      else if (lastPrefix) score += 3;

      if (dobExact) score += 6;
      else if (dobClose) score += 3;

      if (firstAndLastMatch) score += 2;
      if (exactDobWithPartialName && !firstAndLastMatch) score += 1;

      return {
        patient,
        score,
        firstSimilar: firstCompatible,
        lastSimilar: lastCompatible,
        dobExact,
        dobClose,
        phoneExact: false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}


const STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const CHRONIC_CONDITION_OPTIONS = [
  "Anxiety",
  "COPD",
  "Diabetes",
  "Hyperthyroidism",
  "Hypothyroidism",
  "Asthma",
  "Depression",
  "Dyslipidemia",
  "Hypertension",
  "Other",
];

const INCOME_OPTIONS = [
  "$0 - $499",
  "$500 - $4,999",
  "$5,000 - $9,999",
  "$10,000 - $19,000",
  "$20,000 - $29,000",
  "$30,000 - $39,999",
  "Above $40,000",
];

const EMPTY_FORM = {
  dailyNumber: "",
  refillNumber: "",
  firstName: "",
  preferredName: "",
  lastName: "",
  dob: "",
  mrn: "",
  phone: "",
  isReturning: "",
  ttuStudent: false,
  sex: "",
  ethnicity: "",
  addressLine1: "",
  city: "",
  state: "",
  zipCode: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  last4Ssn: "",
  incomeRange: "",
  spanishOnly: "",
  chronicConditions: [],
  chronicConditionsOther: "",
  visitType: "general",
  specialtyType: "",
  refillMedicationRequest: "",
};

export default function UndergradIntakeView({
  onSave,
  patients,
  tonightSpecialtyNames = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [matchPatientId, setMatchPatientId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFiredPatientModal, setShowFiredPatientModal] = useState(false);

  function handleChange(key, value) {
    // Keep the existing-patient link when undergrad adds updateable details
    // like phone, ethnicity, address, sex, etc. Only identity edits should
    // clear the match and return the form to "create new patient" mode.
    if (["firstName", "lastName", "dob"].includes(key) && matchPatientId) {
      setMatchPatientId(null);
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleVisitTypeChange(nextVisitType) {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        visitType: nextVisitType,
      };

      if (nextVisitType !== "both" && nextVisitType !== "specialty_only") {
        nextForm.specialtyType = "";
      }

      if (nextVisitType === "refill_only") {
        nextForm.refillNumber = "";
      } else {
        nextForm.refillNumber = "";
        nextForm.refillMedicationRequest = "";
      }

      return nextForm;
    });
  }

  function calculateAge(dob) {
    if (!dob) return "";
    const today = new Date();
    const birthDate = new Date(dob);

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

  const age = useMemo(() => calculateAge(form.dob), [form.dob]);
  const matchedPatient = useMemo(
    () => (patients || []).find((patient) => patient.id === matchPatientId) || null,
    [patients, matchPatientId]
  );
  const matchedPatientFired = !!matchedPatient?.fired;
  const matchCandidates = useMemo(() => {
    if (matchPatientId) return [];
    return buildPatientMatchCandidates(patients || [], form);
  }, [patients, form, matchPatientId]);

  function handleSelectMatch(patient) {
    if (!patient) return;

    setMatchPatientId(patient.id);
    setForm((prev) => ({
      ...prev,
      firstName: patient.firstName || "",
      preferredName: patient.preferredName || "",
      lastName: patient.lastName || "",
      dob: prev.dob || patient.dob || "",
      mrn: patient.mrn || "",
      phone: patient.phone || "",
      isReturning: "Returning",
      sex: patient.sex || "",
      ethnicity: patient.ethnicity || "",
      addressLine1: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zipCode: patient.zipCode || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactRelation: patient.emergencyContactRelation || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      last4Ssn: patient.last4ssn || "",
      incomeRange: patient.incomeRange || "",
      spanishOnly: patient.spanishOnly || "",
      chronicConditions: patient.chronicConditions || [],
      chronicConditionsOther: patient.chronicConditionsOther || "",
    }));
  }

  function handleClearMatch() {
    setMatchPatientId(null);
    setForm((prev) => ({
      ...prev,
      mrn: "",
      isReturning: "",
    }));
  }

  async function submitEncounterAfterFiredReview() {
    if (isSubmitting) return;

    const payload = {
      ...form,
      age,
      matchedPatientId: matchPatientId || null,
      address: [form.addressLine1, form.city, form.state, form.zipCode]
        .filter(Boolean)
        .join(", "),
      emergencyContact: {
        name: form.emergencyContactName,
        relation: form.emergencyContactRelation,
        phone: form.emergencyContactPhone,
      },
      intakeStatus: "started",
    };

    setIsSubmitting(true);

    try {
      const didSave = await onSave(payload);

      if (!didSave) return;

      setForm(EMPTY_FORM);
      setMatchPatientId(null);
      setShowFiredPatientModal(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    if (
      (form.visitType === "both" || form.visitType === "specialty_only") &&
      !form.specialtyType
    ) {
      alert("Please select a specialty before starting the encounter.");
      return;
    }

    if (matchedPatientFired) {
      setShowFiredPatientModal(true);
      return;
    }

    await submitEncounterAfterFiredReview();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <FiredPatientStartModal
        show={showFiredPatientModal}
        patient={matchedPatient}
        isSubmitting={isSubmitting}
        onClose={() => setShowFiredPatientModal(false)}
        onConfirm={submitEncounterAfterFiredReview}
      />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Undergraduate Intake
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter patient demographics and form details before full registration.
          </p>
          {tonightSpecialtyNames.length > 0 && (
            <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800">
              Tonight’s Specialties: {tonightSpecialtyNames.join(", ")}
            </div>
          )}
        </div>

        {matchedPatient && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
              matchedPatientFired
                ? "border-red-500 bg-red-50 text-red-950 ring-4 ring-red-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {matchedPatientFired && (
              <div className="mb-3 rounded-xl border-2 border-red-600 bg-red-100 px-4 py-3">
                <p className="text-lg font-black uppercase tracking-wide text-red-950">
                  Fired patient - stop and get leadership approval
                </p>
                <div className="mt-2 grid gap-2 text-sm font-semibold text-red-950 sm:grid-cols-2">
                  <p>
                    Fired date:{" "}
                    {matchedPatient?.firedAt
                      ? formatDisplayDate(matchedPatient.firedAt)
                      : "Unknown"}
                  </p>
                  <p>
                    Reason: {matchedPatient?.firedReason || "No reason entered."}
                  </p>
                </div>
                <p className="mt-2 text-sm font-bold text-red-900">
                  Do not start this encounter unless leadership tells you to continue.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Matched to existing patient: {getPatientFullName(matchedPatient)}</p>
                <p
                  className={`mt-1 text-xs ${
                    matchedPatientFired ? "text-red-900" : "text-emerald-800"
                  }`}
                >
                  This encounter will attach to the existing chart. Full name and DOB were filled from the saved patient record.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearMatch}
                className={`rounded-lg border bg-white px-3 py-2 text-xs font-semibold ${
                  matchedPatientFired
                    ? "border-red-400 text-red-800 hover:bg-red-100"
                    : "border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Clear match / create new
              </button>
            </div>
          </div>
        )}

        {!matchedPatient && matchCandidates.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-bold text-amber-950">Possible existing patients</h2>
              <p className="mt-1 text-xs text-amber-800">
                Select a card only if this is the same patient. Selecting a match will replace typed demographics with the saved chart information.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {matchCandidates.map(({ patient, score }) => {
                const level = getMatchLevel(score);

                return (
                  <div
                    key={patient.id}
                    className={`rounded-xl border p-4 shadow-sm ${
                      patient.fired
                        ? "border-red-500 bg-red-50 ring-4 ring-red-100"
                        : "border-amber-200 bg-white"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${level.className}`}>
                        {level.label}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Last seen: {getLastSeenLabel(patient)}
                      </span>
                      {patient.fired && (
                        <div className="w-full rounded-xl border-2 border-red-600 bg-red-100 px-4 py-3 text-sm text-red-950">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-red-700 px-3 py-1 font-black uppercase tracking-wide text-white">
                              Fired patient
                            </span>
                            <span className="font-semibold">
                              Date: {patient.firedAt ? formatDisplayDate(patient.firedAt) : "Unknown"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold">Reason:</span>{" "}
                            {patient.firedReason || "No reason entered."}
                          </div>
                          <div className="mt-2 font-black uppercase tracking-wide">
                            Stop and ask leadership before continuing.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-slate-700">
                      <p className="text-lg font-extrabold text-slate-950">{getPatientFullName(patient)}</p>
                      {patient.preferredName && (
                        <p>
                          <span className="font-medium text-slate-500">Preferred:</span> {patient.preferredName}
                        </p>
                      )}
                      <p>
                        <span className="font-bold text-slate-950">DOB:</span>{" "}
                        <span className="font-bold text-slate-950">{formatDisplayDate(patient.dob)}</span>
                      </p>
                      <p>
                        <span className="font-medium text-slate-500">Phone:</span> {patient.phone || "—"}
                      </p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-500">Sex:</span> {patient.sex || "—"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-500">Ethnicity:</span> {patient.ethnicity || "—"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectMatch(patient)}
                      className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                        patient.fired
                          ? "bg-red-700 hover:bg-red-800"
                          : "bg-amber-700 hover:bg-amber-800"
                      }`}
                    >
                      {patient.fired
                        ? "Use Fired Patient - Leadership Approval Needed"
                        : "Use This Patient"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {matchedPatientFired && (
          <div className="rounded-2xl border-4 border-red-600 bg-red-100 px-5 py-4 text-sm text-red-950 shadow-lg">
            <p className="text-xl font-black uppercase tracking-wide">Fired patient warning</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              <p>
                <span className="font-bold">Fired date:</span>{" "}
                {matchedPatient?.firedAt ? formatDisplayDate(matchedPatient.firedAt) : "—"}
              </p>
              <p>
                <span className="font-bold">Reason:</span>{" "}
                {matchedPatient?.firedReason || "—"}
              </p>
            </div>
            <p className="mt-3 text-base font-extrabold">
              Stop intake and ask leadership before starting this encounter.
            </p>
            <p className="mt-1 text-xs font-semibold text-red-900">
              If you click Start Encounter, a full-screen confirmation will appear.
            </p>
          </div>
        )}

        <div className="grid gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Quick Intake
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Daily Card #
                </label>
                <input
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.dailyNumber}
                  onChange={(e) => handleChange("dailyNumber", e.target.value.replace(/\D/g, ""))}
                  placeholder="Example: 7"
                />
              </div>
              <div className="hidden md:block" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${matchedPatient ? "border-slate-200 bg-slate-50 text-slate-600" : "border-slate-300"}`}
                  value={form.firstName}
                  readOnly={!!matchedPatient}
                  onChange={(e) => handleChange("firstName", capitalizeNameInput(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${matchedPatient ? "border-slate-200 bg-slate-50 text-slate-600" : "border-slate-300"}`}
                  value={form.lastName}
                  readOnly={!!matchedPatient}
                  onChange={(e) => handleChange("lastName", capitalizeNameInput(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Preferred Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.preferredName}
                  onChange={(e) => handleChange("preferredName", e.target.value)}
                />
              </div>



              <div>
  <label className="mb-1 block text-sm font-medium text-slate-700">
    DOB
  </label>

  <div className="flex gap-2">
    <input
      type="date"
      min="1900-01-01"
      max={new Date().toISOString().split("T")[0]}
      className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
        matchedPatient
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-slate-300"
      }`}
      value={form.dob}
      readOnly={!!matchedPatient}
      onChange={(e) => handleChange("dob", e.target.value)}
      onInput={(e) => {
        if (e.target.value.length > 10) {
          e.target.value = e.target.value.slice(0, 10);
        }
      }}
    />

    {form.dob && !matchedPatient && (
      <button
        type="button"
        onClick={() => handleChange("dob", "")}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        Clear
      </button>
    )}
  </div>
</div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Age
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  value={age}
                  readOnly
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Visit Type
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.visitType || "general"}
                  onChange={(e) => handleVisitTypeChange(e.target.value)}
                >
                  <option value="general">General Clinic</option>
                  <option value="specialty_only">Specialty Clinic Only</option>
                  <option value="both">General + Specialty Clinic</option>
                  <option value="refill_only">Refills Only</option>
                </select>
              </div>

              {(form.visitType === "both" || form.visitType === "specialty_only") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Specialty Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.specialtyType || ""}
                    onChange={(e) => handleChange("specialtyType", e.target.value)}
                  >
                    <option value="">Select Specialty</option>
                    <option value="pt">Physical Therapy</option>
                    <option value="dermatology">Dermatology</option>
                    <option value="ophthalmology">Ophthalmology</option>
                    <option value="mental_health">Mental Health</option>
                    <option value="addiction">Addiction Medicine</option>
                  </select>
                </div>
              )}

              {form.visitType === "refill_only" && (
                <div className="md:col-span-2 space-y-4">
                  <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                      Refill Queue Number
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-purple-950">
                      Assigned after intake is submitted
                    </p>
                    <p className="mt-1 text-xs text-purple-700">
                      Prevents duplicate R#s when multiple refill intakes are submitted at the same time.
                    </p>
                  </div>

                  <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Do you know what medications you need refilled?
                  </label>
                  <textarea
                    className="min-h-[88px] w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    value={form.refillMedicationRequest || ""}
                    onChange={(e) => handleChange("refillMedicationRequest", e.target.value)}
                    placeholder="Example: Metformin, lisinopril, insulin, unsure, etc."
                  />
                  <p className="mt-1 text-xs text-purple-700">
                    This answer will show in the pharmacy / refill queue after the encounter starts.
                  </p>
                  </div>
                </div>
              )}


              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", formatPhoneNumber(e.target.value))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New or Returning
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.isReturning}
                  onChange={(e) => handleChange("isReturning", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="New">New</option>
                  <option value="Returning">Returning</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Sex
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.sex}
                  onChange={(e) => handleChange("sex", e.target.value)}
                >
                  <option value="">Select</option>
                  {SEX_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ethnicity
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.ethnicity}
                  onChange={(e) => handleChange("ethnicity", e.target.value)}
                >
                  <option value="">Select</option>
                  {ETHNICITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.ttuStudent}
                onChange={(e) => handleChange("ttuStudent", e.target.checked)}
              />
              TTU Student
            </label>
          </div>

        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => {
                if (isSubmitting) return;
                setForm(EMPTY_FORM);
                setMatchPatientId(null);
              }}
              disabled={isSubmitting}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear Form
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                matchedPatientFired
                  ? "bg-red-800 ring-4 ring-red-300 hover:bg-red-900"
                  : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {isSubmitting
                ? "Starting..."
                : matchedPatientFired
                  ? "Start Fired Patient Encounter"
                  : "Start Encounter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
