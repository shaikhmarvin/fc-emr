import { useMemo, useState } from "react";

const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
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

const YES_NO_OPTIONS = ["Yes", "No"];

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function UndergradRegistrationModal({
  show,
  form,
  setForm,
  onClose,
  onSubmit,
  tonightSpecialtyNames = [],
}) {
  if (!show) return null;

  const [stateSearch, setStateSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const filteredStates = useMemo(() => {
    const query = stateSearch.trim().toLowerCase();

    if (!query) return STATES;

    return STATES.filter((state) =>
      state.toLowerCase().includes(query)
    );
  }, [stateSearch]);

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

  const fullName =
  form.name ||
  form.patientName ||
  `${form.firstName || ""} ${form.lastName || ""}`.trim();

const nameParts = fullName.trim().split(/\s+/);

const displayFirstName =
  form.firstName ||
  form.first_name ||
  nameParts[0] ||
  "";

const displayLastName =
  form.lastName ||
  form.last_name ||
  nameParts.slice(1).join(" ") ||
  "";

const displayDob =
  form.dob ||
  form.dateOfBirth ||
  form.date_of_birth ||
  "";

const displayMrn =
  form.mrn ||
  form.MRN ||
  form.patientMrn ||
  form.patient_mrn ||
  "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 sm:p-6">
  <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold">Complete Undergrad Intake</h3>
            <p className="text-sm text-slate-500">
              Edit registration details and front-desk encounter fields.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
    Patient Information
  </h4>

  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        First Name
      </label>
      <input
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        value={displayFirstName}
        readOnly
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Last Name
      </label>
      <input
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        value={displayLastName}
        readOnly
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        DOB
      </label>
      <input
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        value={displayDob}
        readOnly
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        MRN
      </label>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        value={displayMrn}
        onChange={(e) => handleChange("mrn", e.target.value)}
        placeholder="Auto-filled if existing"
      />
    </div>
  </div>
</div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
              Encounter Details
            </h4>
            <p className="mb-4 text-xs text-blue-700">
              Use this if the daily card number or visit type was entered incorrectly at the front desk.
            </p>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Daily Card #
                </label>
                <input
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={form.dailyNumber || ""}
                  onChange={(e) => handleChange("dailyNumber", e.target.value.replace(/\D/g, ""))}
                  placeholder="Example: 7"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Visit Type
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={form.visitType || "general"}
                  onChange={(e) => {
                    const nextVisitType = e.target.value;
                    handleChange("visitType", nextVisitType);
                    if (nextVisitType !== "both" && nextVisitType !== "specialty_only") {
                      handleChange("specialtyType", "");
                    }
                    if (nextVisitType !== "refill_only") {
                      handleChange("refillMedicationRequest", "");
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  {tonightSpecialtyNames.length > 0 && (
                    <p className="mt-1 text-xs text-blue-700">
                      Tonight: {tonightSpecialtyNames.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {form.visitType === "refill_only" && (
                <div className="md:col-span-2 xl:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Do you know what medications you need refilled?
                  </label>
                  <textarea
                    className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.refillMedicationRequest || ""}
                    onChange={(e) => handleChange("refillMedicationRequest", e.target.value)}
                    placeholder="Example: Metformin, lisinopril, insulin, unsure, etc."
                  />
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
    Address Information
  </h4>

  <label className="mb-1 block text-sm font-medium text-slate-700">
    Street Address
  </label>

  <input
    autoComplete="new-password"
    name="clinic-field-a1"
    id="clinic-field-a1"
    inputMode="text"
    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
    value={form.addressLine1}
    onChange={(e) => handleChange("addressLine1", e.target.value)}
  />
</div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City
              </label>
              <input
                autoComplete="new-password"
                name="clinic-field-c1"
                id="clinic-field-c1"
                inputMode="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                State
              </label>

              <input
                autoComplete="new-password"
                name="clinic-field-s1"
                id="clinic-field-s1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={stateSearch || form.state || ""}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  handleChange("state", e.target.value);
                  setShowStateDropdown(true);
                }}
                onFocus={() => {
                  setStateSearch(form.state || "");
                  setShowStateDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowStateDropdown(false);
                    setStateSearch("");
                  }, 150);
                }}
                placeholder="Search state"
              />

              {showStateDropdown && (
                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredStates.length > 0 ? (
                    filteredStates.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleChange("state", state);
                          setStateSearch("");
                          setShowStateDropdown(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${form.state === state
                          ? "bg-blue-50 font-semibold text-blue-700"
                          : "text-slate-700"
                          }`}
                      >
                        {state}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No matching states
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ZIP Code
              </label>
              <input
                autoComplete="new-password"
                name="clinic-field-z1"
                id="clinic-field-z1"
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Emergency Contact
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Relation
                </label>
                <input
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.emergencyContactRelation}
                  onChange={(e) => handleChange("emergencyContactRelation", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    handleChange("emergencyContactPhone", formatPhoneNumber(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Last 4 SSN
              </label>
              <input
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.last4Ssn}
                onChange={(e) => handleChange("last4Ssn", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Income Range
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.incomeRange}
                onChange={(e) => handleChange("incomeRange", e.target.value)}
              >
                <option value="">Select</option>
                {INCOME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Spanish Only
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.spanishOnly}
              onChange={(e) => handleChange("spanishOnly", e.target.value)}
            >
              <option value="">Select</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chronic Conditions
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              {CHRONIC_CONDITION_OPTIONS.map((condition) => (
                <label
                  key={condition}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.chronicConditions.includes(condition)}
                    onChange={() => handleConditionToggle(condition)}
                  />
                  {condition}
                </label>
              ))}
            </div>

            {form.chronicConditions.includes("Other") && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Other Chronic Condition
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.chronicConditionsOther}
                  onChange={(e) => handleChange("chronicConditionsOther", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <button
            onClick={onSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Undergrad Intake
          </button>
        </div>
      </div>
    </div>
  );
}