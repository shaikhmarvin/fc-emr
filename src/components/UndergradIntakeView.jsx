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
  firstName: "",
  preferredName: "",
  lastName: "",
  dob: "",
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
};

export default function UndergradIntakeView({ onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);

  function handleChange(key, value) {
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

  function handleSubmit() {
    const payload = {
      ...form,
      age,
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

    onSave(payload);
    setForm(EMPTY_FORM);
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
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Quick Intake
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
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
                  Last Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  DOB
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
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
              onClick={() => setForm(EMPTY_FORM)}
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