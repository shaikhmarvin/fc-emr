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
  fired: false,
  firedReason: "",
  firedAt: "",
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

function FieldLabel({ children }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</label>;
}

function FieldInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`.trim()}
    />
  );
}

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
    if (!show || !patient?.id) return;

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
      fired: patient.fired || false,
      firedReason: patient.firedReason || "",
      firedAt: patient.firedAt || "",
    });
  }, [show, patient?.id]);

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
      fired: form.fired,
      firedReason: form.fired ? form.firedReason : "",
      firedAt: form.fired ? (form.firedAt || new Date().toISOString().slice(0, 10)) : null,
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
                <div>
                  <FieldLabel>First Name</FieldLabel>
                  <FieldInput
                    placeholder="Enter first name"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Last Name</FieldLabel>
                  <FieldInput
                    placeholder="Enter last name"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Preferred Name</FieldLabel>
                  <FieldInput
                    placeholder="Enter preferred name"
                    value={form.preferredName}
                    onChange={(e) => updateField("preferredName", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <FieldInput
                    type="date"
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>MRN</FieldLabel>
                  <FieldInput
                    placeholder="Enter MRN"
                    value={form.mrn}
                    onChange={(e) => updateField("mrn", e.target.value.trimStart())}
                  />
                </div>

                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <FieldInput
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Pronouns</FieldLabel>
                  <FieldInput
                    placeholder="Enter pronouns"
                    value={form.pronouns}
                    onChange={(e) => updateField("pronouns", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Ethnicity</FieldLabel>
                  <FieldInput
                    placeholder="Enter ethnicity"
                    value={form.ethnicity}
                    onChange={(e) => updateField("ethnicity", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Sex</FieldLabel>
                  <FieldInput
                    placeholder="Enter sex"
                    value={form.sex}
                    onChange={(e) => updateField("sex", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>TTU Student</FieldLabel>
                  <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.ttuStudent}
                      onChange={(e) => updateField("ttuStudent", e.target.checked)}
                    />
                    Yes
                  </label>
                </div>
              </div>
            </div>
          )}

          {visibleFields.registration && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Registration
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Last 4 SSN</FieldLabel>
                  <FieldInput
                    placeholder="Enter last 4 of SSN"
                    value={form.last4ssn}
                    onChange={(e) => updateField("last4ssn", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Address</FieldLabel>
                  <FieldInput
                    placeholder="Enter address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>City</FieldLabel>
                  <FieldInput
                    placeholder="Enter city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>State</FieldLabel>
                  <FieldInput
                    placeholder="Enter state"
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Zip Code</FieldLabel>
                  <FieldInput
                    placeholder="Enter zip code"
                    value={form.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Emergency Contact Name</FieldLabel>
                  <FieldInput
                    placeholder="Enter emergency contact name"
                    value={form.emergencyContactName}
                    onChange={(e) => updateField("emergencyContactName", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Emergency Contact Relation</FieldLabel>
                  <FieldInput
                    placeholder="Enter relationship"
                    value={form.emergencyContactRelation}
                    onChange={(e) => updateField("emergencyContactRelation", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Emergency Contact Phone</FieldLabel>
                  <FieldInput
                    placeholder="Enter emergency contact phone"
                    value={form.emergencyContactPhone}
                    onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Income Range</FieldLabel>
                  <FieldInput
                    placeholder="Enter income range"
                    value={form.incomeRange}
                    onChange={(e) => updateField("incomeRange", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Spanish Only</FieldLabel>
                  <FieldInput
                    placeholder="Enter yes/no or notes"
                    value={form.spanishOnly}
                    onChange={(e) => updateField("spanishOnly", e.target.value)}
                  />
                </div>
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

                <div className="mt-3">
                  <FieldLabel>Other Chronic Conditions</FieldLabel>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={3}
                    placeholder="Add any other chronic conditions"
                    value={form.chronicConditionsOther}
                    onChange={(e) =>
                      updateField("chronicConditionsOther", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {canEditAllPatientFields && (
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
              <h3 className="mb-4 text-lg font-semibold text-red-900">
                Patient Flags
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Fired Patient</FieldLabel>
                  <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-900">
                    <input
                      type="checkbox"
                      checked={!!form.fired}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          fired: checked,
                          firedAt: checked ? prev.firedAt || new Date().toISOString().slice(0, 10) : "",
                          firedReason: checked ? prev.firedReason : "",
                        }));
                      }}
                    />
                    Mark patient as fired
                  </label>
                </div>

                <div>
                  <FieldLabel>Fired Date</FieldLabel>
                  <FieldInput
                    type="date"
                    value={form.firedAt}
                    disabled={!form.fired}
                    onChange={(e) => updateField("firedAt", e.target.value)}
                    className={!form.fired ? "bg-slate-100 text-slate-400" : ""}
                  />
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel>Reason for Firing</FieldLabel>
                <textarea
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${form.fired ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300 bg-slate-100 text-slate-400 focus:border-slate-300 focus:ring-slate-100"}`}
                  rows={3}
                  placeholder="Enter reason the patient was fired"
                  value={form.firedReason}
                  disabled={!form.fired}
                  onChange={(e) => updateField("firedReason", e.target.value)}
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
