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
  if (!showIntakeModal) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-20 sm:p-6 sm:pt-24">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold">
              {isEditingIntake ? "Edit Intake" : "New Wednesday Intake"}
            </h3>
            <p className="text-sm text-slate-500">
              You can move back and forth between tabs before submitting.
            </p>
          </div>

          <button
            onClick={() => {
              setShowIntakeModal(false);
              setIntakeTab(0);
            }}
            className="rounded-lg border px-4 py-2"
          >
            Close
          </button>
        </div>

        <div className="border-b px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {["Patient Info", "Visit Info", "Screenings", "Services", "Logistics"].map(
              (tab, index) => (
                <button
                  key={tab}
                  onClick={() => setIntakeTab(index)}
                  className={`rounded-full px-4 py-2 text-sm ${intakeTab === index
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>

        <div className="p-6">
          {intakeMatchPatientId && !isEditingIntake && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Possible existing patient found.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Stable patient information has been auto-filled. Continue entering today’s visit details normally. Saving will add this as a new encounter to the existing patient chart.
              </p>
            </div>
          )}
          {intakeTab === 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-lg border p-3"
                placeholder="First Name"
                value={intakeForm.firstName}
                onChange={(e) => updateIntakeField("firstName", e.target.value)}
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Last Name"
                value={intakeForm.lastName}
                onChange={(e) => updateIntakeField("lastName", e.target.value)}
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Preferred Name"
                value={intakeForm.preferredName}
                onChange={(e) => updateIntakeField("preferredName", e.target.value)}
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Patient ID / MRN (leave blank to auto-generate)"
                value={intakeForm.mrn}
                onChange={(e) => updateIntakeField("mrn", e.target.value)}
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Last 4 SSN"
                value={intakeForm.last4ssn}
                onChange={(e) => updateIntakeField("last4ssn", e.target.value)}
              />

              <input
                type="date"
                className="rounded-lg border p-3"
                value={intakeForm.dob}
                onChange={(e) => updateIntakeField("dob", e.target.value)}
              />

              <input
                className="rounded-lg border bg-slate-50 p-3"
                placeholder="Age"
                value={intakeForm.age}
                readOnly
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Phone Number"
                value={intakeForm.phone}
                onChange={(e) =>
                  updateIntakeField("phone", formatPhoneNumber(e.target.value))
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Pronouns"
                value={intakeForm.pronouns}
                onChange={(e) => updateIntakeField("pronouns", e.target.value)}
              />

              <select
                className="rounded-lg border p-3"
                value={intakeForm.sex}
                onChange={(e) => updateIntakeField("sex", e.target.value)}
              >
                <option value="">Select Sex</option>
                {SEX_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                className="rounded-lg border p-3"
                value={intakeForm.ethnicity}
                onChange={(e) => updateIntakeField("ethnicity", e.target.value)}
              >
                <option value="">Select Ethnicity</option>
                <option>Hispanic or Latino</option>
                <option>Asian</option>
                <option>Black or African American</option>
                <option>White</option>
                <option>Middle Eastern</option>
              </select>

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.over65}
                  onChange={(e) => updateIntakeField("over65", e.target.checked)}
                />
                Is patient &gt; 65
              </label>

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.ttuStudent}
                  onChange={(e) => updateIntakeField("ttuStudent", e.target.checked)}
                />
                TTU Student
              </label>
            </div>
          )}

          {intakeTab === 1 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-lg border p-3"
                value={intakeForm.newReturning}
                onChange={(e) => updateIntakeField("newReturning", e.target.value)}
              >
                <option value="">New or Returning</option>
                <option>New</option>
                <option>Returning</option>
              </select>

              <select
                className="rounded-lg border p-3"
                value={intakeForm.visitLocation}
                onChange={(e) => updateIntakeField("visitLocation", e.target.value)}
              >
                <option value="">Visit Location</option>
                <option>In Clinic</option>
                <option>Zoom</option>
                <option>Phone</option>
              </select>

              <input
                className="col-span-2 rounded-lg border p-3"
                placeholder="Chief Complaint"
                value={intakeForm.chiefComplaint}
                onChange={(e) => updateIntakeField("chiefComplaint", e.target.value)}
              />

              <textarea
                className="col-span-2 rounded-lg border p-3"
                rows="4"
                placeholder="Notes"
                value={intakeForm.notes}
                onChange={(e) => updateIntakeField("notes", e.target.value)}
              />
            </div>
          )}

          {intakeTab === 2 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-lg border p-3"
                value={intakeForm.mammogramPapSmear}
                onChange={(e) => updateIntakeField("mammogramPapSmear", e.target.value)}
              >
                <option value="">Mammogram / Pap Smear</option>
                <option>Mammogram</option>
                <option>Pap Smear</option>
                <option>N/A</option>
              </select>

              <select
                className="rounded-lg border p-3"
                value={intakeForm.fluShot}
                onChange={(e) => updateIntakeField("fluShot", e.target.value)}
              >
                <option value="">Flu Shot</option>
                <option>Yes</option>
                <option>Not Interested</option>
                <option>UTD</option>
              </select>

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.htn}
                  onChange={(e) => updateIntakeField("htn", e.target.checked)}
                />
                HTN
              </label>

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.dm}
                  onChange={(e) => updateIntakeField("dm", e.target.checked)}
                />
                DM
              </label>

              <select
                className={`rounded-lg border p-3 ${intakeForm.htn || intakeForm.dm ? "" : "bg-slate-50 text-slate-400"
                  }`}
                value={intakeForm.labsLast6Months}
                onChange={(e) => updateIntakeField("labsLast6Months", e.target.value)}
                disabled={!intakeForm.htn && !intakeForm.dm}
              >
                <option value="">Labs drawn in the last 6 months</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not sure</option>
              </select>

              <textarea
                className="col-span-2 rounded-lg border p-3"
                rows="4"
                placeholder={`Tobacco / Nicotine / Substance Use Treatment
Type, quantity, duration, interested in cessation, substance use treatment`}
                value={intakeForm.tobaccoScreening}
                onChange={(e) => updateIntakeField("tobaccoScreening", e.target.value)}
              />
            </div>
          )}

          {intakeTab === 3 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-lg border p-3"
                placeholder="Dermatology and Chief Complaint"
                value={intakeForm.dermatology === "N/A" ? "" : intakeForm.dermatology}
                onChange={(e) =>
                  updateIntakeField(
                    "dermatology",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Ophthalmology and Chief Complaint"
                value={intakeForm.ophthalmology === "N/A" ? "" : intakeForm.ophthalmology}
                onChange={(e) =>
                  updateIntakeField(
                    "ophthalmology",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Optometry and Chief Complaint"
                value={intakeForm.optometry === "N/A" ? "" : intakeForm.optometry}
                onChange={(e) =>
                  updateIntakeField(
                    "optometry",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <select
                className="rounded-lg border p-3"
                value={intakeForm.diabeticEyeExamPastYear}
                onChange={(e) => updateIntakeField("diabeticEyeExamPastYear", e.target.value)}
              >
                <option value="">Diabetic Eye Exam in Past Year</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not sure</option>
                <option>N/A</option>
              </select>

              <input
                className="rounded-lg border p-3"
                placeholder="Physical Therapy and Chief Complaint"
                value={intakeForm.physicalTherapy === "N/A" ? "" : intakeForm.physicalTherapy}
                onChange={(e) =>
                  updateIntakeField(
                    "physicalTherapy",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Mental Health Screening / Medications"
                value={
                  intakeForm.mentalHealthCombined === "N/A"
                    ? ""
                    : intakeForm.mentalHealthCombined
                }
                onChange={(e) =>
                  updateIntakeField(
                    "mentalHealthCombined",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Counseling"
                value={intakeForm.counseling === "N/A" ? "" : intakeForm.counseling}
                onChange={(e) =>
                  updateIntakeField(
                    "counseling",
                    e.target.value.trim() === "" ? "N/A" : e.target.value
                  )
                }
              />

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.anyMentalHealthPositive}
                  onChange={(e) => updateIntakeField("anyMentalHealthPositive", e.target.checked)}
                />
                Checkbox if any MH is +
              </label>
            </div>
          )}

          {intakeTab === 4 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-lg border p-3"
                value={intakeForm.transportation}
                onChange={(e) => updateIntakeField("transportation", e.target.value)}
              >
                <option value="">Transportation</option>
                <option>Drove Self</option>
                <option>Someone Drove Pt</option>
                <option>Bus/Public Transport</option>
                <option>Walked/Bike</option>
                <option>Uber/Cab</option>
              </select>

              <div className="rounded-lg border p-3 text-sm text-slate-500">
                Bus/Public Transport patients will be prioritized in the queue.
              </div>

              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={intakeForm.needsElevator}
                  onChange={(e) => updateIntakeField("needsElevator", e.target.checked)}
                />
                Needs Elevator
              </label>

              <select
                className="rounded-lg border p-3"
                value={intakeForm.spanishSpeaking}
                onChange={(e) => updateIntakeField("spanishSpeaking", e.target.value)}
              >
                <option value="">Spanish Speaking</option>
                {YES_NO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIntakeTab((prev) => Math.max(0, prev - 1))}
              className="rounded-lg border px-4 py-2"
            >
              Back
            </button>

            <button
              onClick={() => setIntakeTab((prev) => Math.min(4, prev + 1))}
              className="rounded-lg border px-4 py-2"
            >
              Next
            </button>
          </div>

          <button
            onClick={submitPatient}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Complete Intake
          </button>
        </div>
      </div>
    </div>
  );
}