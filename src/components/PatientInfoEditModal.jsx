import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  preferredName: "",
  dob: "",
  mrn: "",
  phone: "",
  pronouns: "",
  ethnicity: "",
  sex: "",
  ttuStudent: false,
  last4ssn: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  incomeRange: "",
  spanishOnly: "",
  chronicConditions: [],
  chronicConditionsOther: "",
};

const CHRONIC_CONDITION_OPTIONS = [
  "HTN",
  "DM",
  "Asthma",
  "COPD",
  "Heart Disease",
  "Kidney Disease",
  "Mental Health",
  "Other",
];

export default function PatientInfoEditModal({
  show,
  patient,
  canEditUndergradFields,
  canEditAllPatientFields,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!show || !patient) return;

    setForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      preferredName: patient.preferredName || "",
      dob: patient.dob || "",
      mrn: patient.mrn || "",
      phone: patient.phone || "",
      pronouns: patient.pronouns || "",
      ethnicity: patient.ethnicity || "",
      sex: patient.sex || "",
      ttuStudent: patient.ttuStudent || false,
      last4ssn: patient.last4ssn || "",
      address: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zipCode: patient.zipCode || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactRelation: patient.emergencyContactRelation || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      incomeRange: patient.incomeRange || "",
      spanishOnly: patient.spanishOnly || "",
      chronicConditions: patient.chronicConditions || [],
      chronicConditionsOther: patient.chronicConditionsOther || "",
    });
  }, [show, patient]);

  const visibleFields = useMemo(() => {
    if (canEditAllPatientFields) {
      return {
        demographic: true,
        registration: true,
      };
    }

    if (canEditUndergradFields) {
      return {
        demographic: true,
        registration: true,
      };
    }

    return {
      demographic: false,
      registration: false,
    };
  }, [canEditAllPatientFields, canEditUndergradFields]);

  if (!show || !patient) return null;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleChronicCondition(condition) {
    setForm((prev) => {
      const exists = prev.chronicConditions.includes(condition);
      return {
        ...prev,
        chronicConditions: exists
          ? prev.chronicConditions.filter((item) => item !== condition)
          : [...prev.chronicConditions, condition],
      };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      preferredName: form.preferredName,
      dob: form.dob,
      mrn: form.mrn.trim(),
      phone: form.phone,
      pronouns: form.pronouns,
      ethnicity: form.ethnicity,
      sex: form.sex,
      ttuStudent: form.ttuStudent,
      last4ssn: form.last4ssn,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      emergencyContactName: form.emergencyContactName,
      emergencyContactRelation: form.emergencyContactRelation,
      emergencyContactPhone: form.emergencyContactPhone,
      incomeRange: form.incomeRange,
      spanishOnly: form.spanishOnly,
      chronicConditions: form.chronicConditions,
      chronicConditionsOther: form.chronicConditionsOther,
    };

    onSave(patient.id, payload);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Edit Patient Info
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Update demographic and registration information for {patient.firstName} {patient.lastName}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {visibleFields.demographic && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Demographics
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Preferred Name"
                  value={form.preferredName}
                  onChange={(e) => updateField("preferredName", e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.dob}
                  onChange={(e) => updateField("dob", e.target.value)}
                />
                <input
  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  placeholder="MRN"
  value={form.mrn}
  onChange={(e) => updateField("mrn", e.target.value.trimStart())}
/>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Pronouns"
                  value={form.pronouns}
                  onChange={(e) => updateField("pronouns", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ethnicity"
                  value={form.ethnicity}
                  onChange={(e) => updateField("ethnicity", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Sex"
                  value={form.sex}
                  onChange={(e) => updateField("sex", e.target.value)}
                />

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.ttuStudent}
                    onChange={(e) => updateField("ttuStudent", e.target.checked)}
                  />
                  TTU Student
                </label>
              </div>
            </div>
          )}

          {visibleFields.registration && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Registration
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Last 4 SSN"
                  value={form.last4ssn}
                  onChange={(e) => updateField("last4ssn", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Zip Code"
                  value={form.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Emergency Contact Name"
                  value={form.emergencyContactName}
                  onChange={(e) => updateField("emergencyContactName", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Emergency Contact Relation"
                  value={form.emergencyContactRelation}
                  onChange={(e) => updateField("emergencyContactRelation", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Emergency Contact Phone"
                  value={form.emergencyContactPhone}
                  onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Income Range"
                  value={form.incomeRange}
                  onChange={(e) => updateField("incomeRange", e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Spanish Only"
                  value={form.spanishOnly}
                  onChange={(e) => updateField("spanishOnly", e.target.value)}
                />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Chronic Conditions
                </p>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {CHRONIC_CONDITION_OPTIONS.map((condition) => (
                    <label
                      key={condition}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.chronicConditions.includes(condition)}
                        onChange={() => toggleChronicCondition(condition)}
                      />
                      {condition}
                    </label>
                  ))}
                </div>

                <textarea
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Other chronic conditions"
                  value={form.chronicConditionsOther}
                  onChange={(e) =>
                    updateField("chronicConditionsOther", e.target.value)
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}