export default function IntakeModal({
  showIntakeModal,
  setShowIntakeModal,
  intakeTab,
  setIntakeTab,
  intakeForm,
  updateIntakeField,
  submitPatient,
  isEditingIntake,
  intakeMatchPatientId,
}) {
  const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

  const TABS = [
    "Patient Info",
    "Visit Info",
    "Screenings",
    "Services",
    "Logistics",
  ];

  function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function closeModal() {
    setShowIntakeModal(false);
    setIntakeTab(0);
  }

  if (!showIntakeModal) return null;

  const showNicotineDetails =
    intakeForm.nicotineUse === "Yes" || intakeForm.nicotineUse === "Former";

  const showSubstanceNotes =
    intakeForm.substanceUseConcern === "Yes" ||
    intakeForm.substanceUseTreatment === "Yes" ||
    intakeForm.substanceUseTreatment === "Maybe";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              {isEditingIntake ? "Edit Intake" : "New Wednesday Intake"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Move between tabs before submitting.
            </p>
          </div>

          <button
            onClick={closeModal}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="border-b bg-slate-50/70 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setIntakeTab(index)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${intakeTab === index
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {intakeMatchPatientId && !isEditingIntake && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">
                Possible existing patient found
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Stable patient information has been auto-filled. Continue entering
                today’s visit details normally. Saving will add this as a new
                encounter to the existing patient chart.
              </p>
            </div>
          )}

          {intakeTab === 0 && (
            <div className="space-y-4">
              <SectionCard title="Patient Information">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="First Name">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.firstName}
                      onChange={(e) =>
                        updateIntakeField("firstName", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Last Name">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.lastName}
                      onChange={(e) =>
                        updateIntakeField("lastName", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Preferred Name">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.preferredName}
                      onChange={(e) =>
                        updateIntakeField("preferredName", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Patient ID / MRN">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Leave blank to auto-generate"
                      value={intakeForm.mrn}
                      onChange={(e) => updateIntakeField("mrn", e.target.value)}
                    />
                  </Field>

                  <Field label="Date of Birth">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.dob}
                      onChange={(e) => updateIntakeField("dob", e.target.value)}
                    />
                  </Field>

                  <Field label="Age">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600"
                      value={intakeForm.age}
                      readOnly
                    />
                  </Field>

                  <Field label="Phone Number">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.phone}
                      onChange={(e) =>
                        updateIntakeField(
                          "phone",
                          formatPhoneNumber(e.target.value)
                        )
                      }
                    />
                  </Field>

                  <Field label="Pronouns">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.pronouns}
                      onChange={(e) =>
                        updateIntakeField("pronouns", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Sex">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.sex}
                      onChange={(e) => updateIntakeField("sex", e.target.value)}
                    >
                      <option value="">Select sex</option>
                      {SEX_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Ethnicity">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.ethnicity}
                      onChange={(e) =>
                        updateIntakeField("ethnicity", e.target.value)
                      }
                    >
                      <option value="">Select ethnicity</option>
                      <option>Hispanic or Latino</option>
                      <option>Asian</option>
                      <option>Black or African American</option>
                      <option>White</option>
                      <option>Middle Eastern</option>
                    </select>
                  </Field>
                </div>
              </SectionCard>

              <Field label="Patient Flags" className="xl:col-span-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CheckboxCard
                    label="Patient is over 65"
                    checked={intakeForm.over65}
                    onChange={(checked) => updateIntakeField("over65", checked)}
                  />
                  <CheckboxCard
                    label="TTU Student"
                    checked={intakeForm.ttuStudent}
                    onChange={(checked) => updateIntakeField("ttuStudent", checked)}
                  />
                </div>
              </Field>
            </div>
          )}

          {intakeTab === 1 && (
            <div className="space-y-6">
              <SectionCard title="Visit Details">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="New or Returning">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.newReturning}
                      onChange={(e) =>
                        updateIntakeField("newReturning", e.target.value)
                      }
                    >
                      <option value="">Select status</option>
                      <option>New</option>
                      <option>Returning</option>
                    </select>
                  </Field>

                  <Field label="Visit Location">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.visitLocation}
                      onChange={(e) =>
                        updateIntakeField("visitLocation", e.target.value)
                      }
                    >
                      <option value="">Select location</option>
                      <option>In Clinic</option>
                      <option>Zoom</option>
                      <option>Phone</option>
                    </select>
                  </Field>

                  <ReadOnlyField
                    label="Visit Type"
                    value={intakeForm.visitType}
                  />

                  <ReadOnlyField
                    label="Specialty"
                    value={intakeForm.specialtyType || "—"}
                  />

                  <Field label="Chief Complaint" className="md:col-span-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.chiefComplaint}
                      onChange={(e) =>
                        updateIntakeField("chiefComplaint", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Notes" className="md:col-span-2">
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      rows="4"
                      value={intakeForm.notes}
                      onChange={(e) => updateIntakeField("notes", e.target.value)}
                    />
                  </Field>
                </div>
              </SectionCard>
            </div>
          )}

          {intakeTab === 2 && (
            <div className="space-y-6">
              <SectionCard title="Screenings">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Mammogram">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.mammogramStatus}
                      onChange={(e) =>
                        updateIntakeField("mammogramStatus", e.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option>Interested</option>
                      <option>Not Interested</option>
                      <option>UTD</option>
                      <option>N/A</option>
                    </select>
                  </Field>

                  <Field label="Pap Smear">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.papStatus}
                      onChange={(e) =>
                        updateIntakeField("papStatus", e.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option>Interested</option>
                      <option>Not Interested</option>
                      <option>UTD</option>
                      <option>N/A</option>
                    </select>
                  </Field>

                  <Field label="Flu Shot">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.fluShot}
                      onChange={(e) =>
                        updateIntakeField("fluShot", e.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option>Interested</option>
                      <option>Not Interested</option>
                      <option>UTD</option>
                    </select>
                  </Field>

                  <CheckboxCard
                    label="HTN"
                    checked={intakeForm.htn}
                    onChange={(checked) => updateIntakeField("htn", checked)}
                  />

                  <CheckboxCard
                    label="DM"
                    checked={intakeForm.dm}
                    onChange={(checked) => updateIntakeField("dm", checked)}
                  />

                  <Field label="Labs drawn in the last 6 months">
                    <select
                      className={`w-full rounded-xl border px-3 py-2.5 ${intakeForm.htn || intakeForm.dm
                        ? "border-slate-200"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      value={intakeForm.labsLast6Months}
                      onChange={(e) =>
                        updateIntakeField("labsLast6Months", e.target.value)
                      }
                      disabled={!intakeForm.htn && !intakeForm.dm}
                    >
                      <option value="">Select one</option>
                      <option>Yes</option>
                      <option>No</option>
                      <option>Not sure</option>
                    </select>
                  </Field>

                  <Field label="Nicotine Use">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.nicotineUse}
                      onChange={(e) =>
                        updateIntakeField("nicotineUse", e.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option>No</option>
                      <option>Yes</option>
                      <option>Former</option>
                      <option>Unknown</option>
                    </select>
                  </Field>

                  {showNicotineDetails && (
                    <Field label="Nicotine Details">
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="Type, amount, frequency"
                        value={intakeForm.nicotineDetails}
                        onChange={(e) =>
                          updateIntakeField("nicotineDetails", e.target.value)
                        }
                      />
                    </Field>
                  )}

                  <Field label="Substance Use Concern">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.substanceUseConcern}
                      onChange={(e) =>
                        updateIntakeField("substanceUseConcern", e.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </Field>

                  <Field label="Substance Use Treatment">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.substanceUseTreatment}
                      onChange={(e) =>
                        updateIntakeField(
                          "substanceUseTreatment",
                          e.target.value
                        )
                      }
                    >
                      <option value="">Select one</option>
                      <option>No</option>
                      <option>Yes</option>
                      <option>Maybe</option>
                    </select>
                  </Field>

                  {showSubstanceNotes && (
                    <Field label="Substance Use Notes" className="md:col-span-2">
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        rows="3"
                        placeholder="Relevant details"
                        value={intakeForm.substanceUseNotes}
                        onChange={(e) =>
                          updateIntakeField("substanceUseNotes", e.target.value)
                        }
                      />
                    </Field>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {intakeTab === 3 && (
            <div className="space-y-6">
              <SectionCard title="Referral / Service Needs">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Dermatology">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Reason or chief complaint"
                      value={
                        intakeForm.dermatology === "N/A"
                          ? ""
                          : intakeForm.dermatology
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "dermatology",
                          e.target.value.trim() === "" ? "N/A" : e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Ophthalmology">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Reason or chief complaint"
                      value={
                        intakeForm.ophthalmology === "N/A"
                          ? ""
                          : intakeForm.ophthalmology
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "ophthalmology",
                          e.target.value.trim() === ""
                            ? "N/A"
                            : e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Optometry">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Reason or chief complaint"
                      value={
                        intakeForm.optometry === "N/A"
                          ? ""
                          : intakeForm.optometry
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "optometry",
                          e.target.value.trim() === "" ? "N/A" : e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Diabetic Eye Exam in Past Year">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.diabeticEyeExamPastYear}
                      onChange={(e) =>
                        updateIntakeField(
                          "diabeticEyeExamPastYear",
                          e.target.value
                        )
                      }
                    >
                      <option value="">Select one</option>
                      <option>Yes</option>
                      <option>No</option>
                      <option>Not sure</option>
                      <option>N/A</option>
                    </select>
                  </Field>

                  <Field label="Physical Therapy">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Reason or chief complaint"
                      value={
                        intakeForm.physicalTherapy === "N/A"
                          ? ""
                          : intakeForm.physicalTherapy
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "physicalTherapy",
                          e.target.value.trim() === ""
                            ? "N/A"
                            : e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Mental Health Screening / Medications">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Relevant details"
                      value={
                        intakeForm.mentalHealthCombined === "N/A"
                          ? ""
                          : intakeForm.mentalHealthCombined
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "mentalHealthCombined",
                          e.target.value.trim() === ""
                            ? "N/A"
                            : e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Counseling">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      placeholder="Relevant details"
                      value={
                        intakeForm.counseling === "N/A"
                          ? ""
                          : intakeForm.counseling
                      }
                      onChange={(e) =>
                        updateIntakeField(
                          "counseling",
                          e.target.value.trim() === "" ? "N/A" : e.target.value
                        )
                      }
                    />
                  </Field>

                  <CheckboxCard
                    label="Any mental health screen positive"
                    checked={intakeForm.anyMentalHealthPositive}
                    onChange={(checked) =>
                      updateIntakeField("anyMentalHealthPositive", checked)
                    }
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {intakeTab === 4 && (
            <div className="space-y-6">
              <SectionCard title="Logistics">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Transportation">
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      value={intakeForm.transportation}
                      onChange={(e) =>
                        updateIntakeField("transportation", e.target.value)
                      }
                    >
                      <option value="">Select transportation</option>
                      <option>Drove Self</option>
                      <option>Someone Drove Pt</option>
                      <option>Bus/Public Transport</option>
                      <option>Walked/Bike</option>
                      <option>Uber/Cab</option>
                    </select>
                  </Field>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
                    Bus/Public Transport patients will be prioritized in the
                    queue.
                  </div>

                  <CheckboxCard
                    label="Needs Elevator"
                    checked={intakeForm.needsElevator}
                    onChange={(checked) =>
                      updateIntakeField("needsElevator", checked)
                    }
                  />

                  <CheckboxCard
                    label="Spanish Speaking"
                    checked={!!intakeForm.spanishSpeaking}
                    onChange={(checked) =>
                      updateIntakeField("spanishSpeaking", checked)
                    }
                  />
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIntakeTab((prev) => Math.max(0, prev - 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>

            <button
              onClick={() => setIntakeTab((prev) => Math.min(4, prev + 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>

          <button
            onClick={submitPatient}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Complete Intake
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
        {value || "—"}
      </div>
    </div>
  );
}

function CheckboxCard({ label, checked, onChange }) {
  return (
    <label className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}