
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

function normalizeNamePart(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeDateString(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 8);
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
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
  if (input === patient) return true;
  if (input.length >= 3 && patient.startsWith(input)) return true;
  if (patient.length >= 3 && input.startsWith(patient)) return true;

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
  const phoneDigits = onlyDigits(form.phone);

  const hasEnoughSearchInfo =
    (normalizeNamePart(firstName).length >= 2 && normalizeNamePart(lastName).length >= 2) ||
    (!!dob && (normalizeNamePart(firstName).length >= 2 || normalizeNamePart(lastName).length >= 2)) ||
    phoneDigits.length >= 7;

  if (!hasEnoughSearchInfo) return [];

  return (patients || [])
    .map((patient) => {
      const firstSimilar = namesAreSimilar(firstName, patient.firstName || "");
      const lastSimilar = namesAreSimilar(lastName, patient.lastName || "");
      const dobExact = !!dob && normalizeDateString(dob) === normalizeDateString(patient.dob || "");
      const dobClose = !!dob && !dobExact && datesDifferByOneDigit(dob, patient.dob || "");
      const phoneExact =
        phoneDigits.length >= 7 &&
        onlyDigits(patient.phone || "").slice(-7) === phoneDigits.slice(-7);

      let score = 0;
      if (firstSimilar) score += 3;
      if (lastSimilar) score += 4;
      if (dobExact) score += 5;
      else if (dobClose) score += 3;
      if (phoneExact) score += 3;

      const hasIdentityAnchor = dobExact || dobClose || phoneExact;
      const hasNameAnchor = firstSimilar || lastSimilar;

      if (!hasNameAnchor && !phoneExact) return null;
      if (!hasIdentityAnchor && !(firstSimilar && lastSimilar)) return null;
      if (score < 4) return null;

      return {
        patient,
        score,
        firstSimilar,
        lastSimilar,
        dobExact,
        dobClose,
        phoneExact,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bDate = new Date(
        (b.patient.encounters || [])[0]?.createdAt || (b.patient.encounters || [])[0]?.clinicDate || 0
      ).getTime();
      const aDate = new Date(
        (a.patient.encounters || [])[0]?.createdAt || (a.patient.encounters || [])[0]?.clinicDate || 0
      ).getTime();
      return bDate - aDate;
    })
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
};

export default function UndergradIntakeView({
  onSave,
  patients,
  tonightSpecialtyNames = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [matchPatientId, setMatchPatientId] = useState(null);

  function handleChange(key, value) {
    if (["firstName", "lastName", "dob", "phone"].includes(key) && matchPatientId) {
      setMatchPatientId(null);
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleConditionToggle(condition) {
    setForm((prev) => {
      const alreadySelected = prev.chronicConditions.includes(condition);

      const nextConditions = alreadySelected
        ? prev.chronicConditions.filter((item) => item !== condition)
        : [...prev.chronicConditions, condition];

      return {
        ...prev,
        chronicConditions: nextConditions,
        chronicConditionsOther:
          condition === "Other" || nextConditions.includes("Other")
            ? prev.chronicConditionsOther
            : "",
      };
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
      dob: patient.dob || "",
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

  async function handleSubmit() {
  if (
    (form.visitType === "both" || form.visitType === "specialty_only") &&
    !form.specialtyType
  ) {
    alert("Please select a specialty before starting the encounter.");
    return;
  }

  if (matchedPatientFired) {
      const firedDateLabel = matchedPatient?.firedAt
        ? new Date(matchedPatient.firedAt).toLocaleDateString()
        : "an unknown date";
      const firedReasonLabel = matchedPatient?.firedReason || "No reason entered.";

      const shouldContinue = window.confirm(
        `This patient is marked as fired.\n\nFired on: ${firedDateLabel}\nReason: ${firedReasonLabel}\n\nDo you still want to start the encounter?`
      );

      if (!shouldContinue) return;
    }

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

    const didSave = await onSave(payload);

    if (!didSave) return;

    setForm(EMPTY_FORM);
    setMatchPatientId(null);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Matched to existing patient: {getPatientFullName(matchedPatient)}</p>
                <p className="mt-1 text-xs text-emerald-800">
                  This encounter will attach to the existing chart. Full name and DOB were filled from the saved patient record.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearMatch}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
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
                    className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${level.className}`}>
                        {level.label}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Last seen: {getLastSeenLabel(patient)}
                      </span>
                      {patient.fired && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
                          Fired
                        </span>
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
                      className="mt-4 w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                    >
                      Use This Patient
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {matchedPatientFired && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
            <p className="font-semibold">Warning: this patient has been marked as fired.</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              <p>
                <span className="font-medium">Date:</span>{" "}
                {matchedPatient?.firedAt ? new Date(matchedPatient.firedAt).toLocaleDateString() : "—"}
              </p>
              <p>
                <span className="font-medium">Reason:</span>{" "}
                {matchedPatient?.firedReason || "—"}
              </p>
            </div>
            <p className="mt-2 text-xs text-rose-800">
              You will be asked to confirm before starting the encounter.
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
                  onChange={(e) => handleChange("firstName", e.target.value)}
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
                  onChange={(e) => handleChange("lastName", e.target.value)}
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
                <input
  type="date"
  min="1900-01-01"
  max={new Date().toISOString().split("T")[0]}
  className={`w-full rounded-lg border px-3 py-2 text-sm ${matchedPatient ? "border-slate-200 bg-slate-50 text-slate-600" : "border-slate-300"}`}
  value={form.dob}
  readOnly={!!matchedPatient}
  onChange={(e) => handleChange("dob", e.target.value)}
  onInput={(e) => {
    if (e.target.value.length > 10) {
      e.target.value = e.target.value.slice(0, 10);
    }
  }}
/>
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
                  onChange={(e) => {
  const nextVisitType = e.target.value;

  handleChange("visitType", nextVisitType);

  if (
    nextVisitType !== "both" &&
    nextVisitType !== "specialty_only"
  ) {
    handleChange("specialtyType", "");
  }
}}
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
                setForm(EMPTY_FORM);
                setMatchPatientId(null);
              }}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Clear Form
            </button>

            <button
              onClick={handleSubmit}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Start Encounter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}