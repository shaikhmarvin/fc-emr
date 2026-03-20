import { useEffect, useState } from "react";
export default function ChartView({
  selectedPatient,
  selectedEncounter,
  selectedEncounterId,
  normalizeClinicDate,
  setActiveView,
  startNewEncounter,
  isLeadershipView,
  getFullPatientName,
  lastVisitLabel,
  openPatientChart,
  spanishBadge,
  priorityBadge,
  assignmentForm,
  setAssignmentForm,
  studentNameOptions,
  upperLevelNameOptions,
  ROOM_OPTIONS,
  isPapRestricted,
  assignEncounter,
  leadershipActionLocked,
  updateEncounterStatus,
  clearEncounterRoom,
  sortedMedications,
  activeMedicationCount,
  toggleMedicationActive,
  startEditMedication,
  deleteMedication,
  setEditingMedicationId,
  setNewMedication,
  setShowMedicationModal,
  EMPTY_MEDICATION,
  startEditAllergy,
  deleteAllergy,
  setShowAllergyModal,
  setEditingAllergyId,
  setNewAllergy,
  EMPTY_ALLERGY,
  updatePatientField,
  currentVitals,
  updateVitalsField,
  saveVitals,
  editingVitalsIndex,
  startEditVitals,
  saveSoapNote,
  soapAutoSaveEnabled,
  updateEncounterField,
  openEditIntake,
  formatDate,
  soapStatus,
  canSignAsUpperLevel,
  canSignAsAttending,
  signSoapAsUpperLevel,
  signSoapAsAttending,
  canSubmitForUpperLevel,
  canSubmitForAttending,
  submitSoapForUpperLevel,
  submitSoapForAttending,
  soapBusy,
  soapUiMessage,
  formatRoleLabel,
  canReopenSoap,
  reopenSoapNote,
  auditEntries,
  auditLoading,
  soapAuthorName,
  upperLevelSignerName,
  attendingSignerName,
  activeStudents,
  activeUpperLevels,
  activeAttendings,
signSoapAsAttendingWithPin,
}) {

  function formatAuditAction(action) {
  switch (action) {
    case "soap_saved":
      return "SOAP note saved";
    case "soap_submitted_upper":
  return "Submitted to upper level";
case "soap_submitted_attending":
  return "Submitted to attending";
    case "soap_signed_upper":
      return "Signed by upper level";
    case "soap_signed_attending":
      return "Signed by attending";
    case "soap_reopened":
      return "SOAP note reopened";
    default:
      return action;
  }
}

  function getNumericValue(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getBpNumbers(bp) {
  if (!bp) return null;
  const match = String(bp).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

function getTrendDirection(current, previous) {
  if (current === null || previous === null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "same";
}

function renderTrendArrow(direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "same") return "→";
  return "—";
}

function getBpCategory(bp) {
  const parsed = getBpNumbers(bp);
  if (!parsed) return null;

  const { systolic, diastolic } = parsed;

  if (systolic < 120 && diastolic < 80) return "green";
  if (systolic < 140 && diastolic < 90) return "yellow";
  return "red";
}

function getHrCategory(hr) {
  const value = getNumericValue(hr);
  if (value === null) return null;

  if (value < 60 || value > 100) return "red";
  return "green";
}

function getSpo2Category(spo2) {
  const value = getNumericValue(spo2);
  if (value === null) return null;

  if (value < 94) return "red";
  return "green";
}

function getColorClasses(category) {
  switch (category) {
    case "green":
      return "text-green-700";
    case "yellow":
      return "text-yellow-700";
    case "red":
      return "text-red-700";
    default:
      return "text-slate-800";
  }
}

  function formatSoapStatus(status) {
    switch (status) {
      case "draft":
        return { label: "Draft", color: "bg-slate-200 text-slate-700" };
      case "awaiting_upper":
        return { label: "Awaiting Upper Level", color: "bg-yellow-100 text-yellow-800" };
      case "awaiting_attending":
        return { label: "Awaiting Attending", color: "bg-blue-100 text-blue-800" };
      case "signed":
        return { label: "Fully Signed", color: "bg-green-100 text-green-800" };
      default:
        return { label: status || "Unknown", color: "bg-slate-200 text-slate-700" };
    }
  }


  useEffect(() => {
  if (!soapAutoSaveEnabled || !selectedEncounter || soapStatus === "signed") return;

    const timeout = window.setTimeout(() => {
      saveSoapNote(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [
    soapAutoSaveEnabled,
    selectedEncounter?.id,
    selectedEncounter?.soapSubjective,
    selectedEncounter?.soapObjective,
    selectedEncounter?.soapAssessment,
    selectedEncounter?.soapPlan,
    saveSoapNote,
  ]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
const [selectedAttendingId, setSelectedAttendingId] = useState("");
const [attendingPin, setAttendingPin] = useState("");

  if (!selectedPatient) return null;

  const sortedEncounters = [...selectedPatient.encounters].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.clinicDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.clinicDate || 0).getTime();
    return bTime - aTime;
  });

  const isSoapLocked = soapStatus === "signed";
  const vitalsHistory = selectedEncounter?.vitalsHistory || [];
const latestVitals = vitalsHistory[0] || null;
const previousVitals = vitalsHistory[1] || null;

const latestBp = getBpNumbers(latestVitals?.bp);
const previousBp = getBpNumbers(previousVitals?.bp);

const latestHr = getNumericValue(latestVitals?.hr);
const previousHr = getNumericValue(previousVitals?.hr);

const latestWeight = getNumericValue(latestVitals?.weight);
const previousWeight = getNumericValue(previousVitals?.weight);

const latestPain = getNumericValue(latestVitals?.pain);
const previousPain = getNumericValue(previousVitals?.pain);

const bpTrend =
  latestBp && previousBp
    ? {
        systolic: getTrendDirection(latestBp.systolic, previousBp.systolic),
        diastolic: getTrendDirection(latestBp.diastolic, previousBp.diastolic),
      }
    : null;

const hrTrend = getTrendDirection(latestHr, previousHr);
const weightTrend = getTrendDirection(latestWeight, previousWeight);
const painTrend = getTrendDirection(latestPain, previousPain);
const bpCategory = getBpCategory(latestVitals?.bp);
const hrCategory = getHrCategory(latestVitals?.hr);
const spo2Category = getSpo2Category(latestVitals?.spo2);

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <button
        onClick={() => setActiveView("dashboard")}
        className="text-blue-600 hover:underline"
      >
        ← Back to Patients
      </button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Patient</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {getFullPatientName(selectedPatient)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            MRN: {selectedPatient.mrn || "—"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Demographics</p>
          <p className="mt-1 text-sm text-slate-700">
            DOB: {selectedPatient.dob ? formatDate(selectedPatient.dob) : "—"}
          </p>
          <p className="text-sm text-slate-700">
            Age: {selectedPatient.age || "—"}
          </p>
          <p className="text-sm text-slate-700">
            Phone: {selectedPatient.phone || "—"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Clinical Snapshot</p>
          <p className="mt-1 text-sm text-slate-700">
            Allergies: {selectedPatient.allergies?.trim() || "None listed"}
          </p>
          <p className="text-sm text-slate-700">
            Active meds: {activeMedicationCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Visit History</p>
          <p className="mt-1 text-sm text-slate-700">
            Current visit: {selectedEncounter?.clinicDate ? formatDate(selectedEncounter.clinicDate) : "—"}
          </p>
          <p className="text-sm text-slate-700">
            Last visit: {lastVisitLabel}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold">Patient Information</h3>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isLeadershipView && (
                <button
                  onClick={openEditIntake}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
                >
                  Edit Intake
                </button>
              )}

              <button
                onClick={startNewEncounter}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Start New Encounter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <p className="md:col-span-2">
              <span className="font-medium">Last 4 SSN:</span>{" "}
              {selectedPatient.last4ssn || "—"}
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                type="text"
                value={selectedPatient.phone || ""}
                onChange={(e) => updatePatientField("phone", e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Pronouns
              </label>
              <input
                type="text"
                value={selectedPatient.pronouns || ""}
                onChange={(e) => updatePatientField("pronouns", e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Pronouns"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Sex
              </label>
              <input
                type="text"
                value={selectedPatient.sex || ""}
                onChange={(e) => updatePatientField("sex", e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Sex"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Ethnicity
              </label>
              <select
                value={selectedPatient.ethnicity || ""}
                onChange={(e) => updatePatientField("ethnicity", e.target.value)}
                className="w-full rounded-lg border p-3"
              >
                <option value="">Select Ethnicity</option>
                <option>Hispanic or Latino</option>
                <option>Asian</option>
                <option>Black or African American</option>
                <option>White</option>
                <option>Middle Eastern</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
          <button
            onClick={() => setShowTimeline((prev) => !prev)}
            className="mb-4 flex w-full items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-left text-lg font-semibold text-slate-900 hover:bg-slate-100"
          >
            Visit Timeline
            <span>{showTimeline ? "▲" : "▼"}</span>
          </button>
        
        {showTimeline && (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 lg:max-h-[560px]">
            {sortedEncounters.map((encounter, index) => (
              <button
                key={encounter.id}
                onClick={() => openPatientChart(selectedPatient.id, encounter.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedEncounterId === encounter.id
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-500" />

                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        Encounter #{selectedPatient.encounters.length - index}
                      </p>

                      <p className="text-sm text-slate-500">
                        {normalizeClinicDate
                          ? normalizeClinicDate(encounter.clinicDate)
                          : encounter.clinicDate}
                      </p>

                      <p className="text-sm text-slate-700">
                        {encounter.chiefComplaint || "No chief complaint recorded"}
                      </p>

                      <p className="text-xs text-slate-500">
                        {encounter.visitLocation || "—"} •{" "}
                        {encounter.newReturning || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Room: {encounter.roomNumber || "—"} • Student: {encounter.assignedStudent || "—"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Vitals: {encounter.vitalsHistory?.length || 0} • SOAP saved: {encounter.soapSavedAt || "Not yet"}
                      </p>
                    </div>
                    
                  </div>
                  
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs ${
                      encounter.status === "Waiting"
                        ? "border-yellow-200 bg-yellow-100 text-yellow-800"
                        : encounter.status === "Assigned"
                        ? "border-green-200 bg-green-100 text-green-800"
                        : encounter.status === "In Visit"
                        ? "border-blue-200 bg-blue-100 text-blue-800"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {encounter.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {selectedEncounter && (
        <>
          <div className="flex flex-wrap gap-2">
            {spanishBadge(selectedEncounter)}
            {priorityBadge(selectedEncounter)}
          </div>

          <div
            className={`grid gap-4 xl:gap-6 ${
              isLeadershipView ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
            }`}
          >
            <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
              <h3 className="mb-4 text-lg font-semibold">Encounter Details</h3>

              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Encounter Date:</span>{" "}
                  {normalizeClinicDate
                    ? normalizeClinicDate(selectedEncounter.clinicDate)
                    : selectedEncounter.clinicDate}
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Chief Complaint
                  </label>
                  <input
                    type="text"
                    value={selectedEncounter.chiefComplaint || ""}
                    onChange={(e) =>
                      updateEncounterField("chiefComplaint", e.target.value)
                    }
                    className="w-full rounded-lg border p-3"
                    placeholder="Chief complaint"
                  />
                </div>

                <p>
                  <span className="font-medium">Visit Location:</span>{" "}
                  {selectedEncounter.visitLocation || "—"}
                </p>

                <p>
                  <span className="font-medium">Transportation:</span>{" "}
                  {selectedEncounter.transportation || "—"}
                </p>

                <p>
                  <span className="font-medium">Current Status:</span>{" "}
                  {selectedEncounter.status}
                </p>
              </div>
            </div>

            {isLeadershipView && (
              <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
                <h3 className="mb-4 text-lg font-semibold">
                  Leadership Assignment
                </h3>

                <p className="text-xs text-blue-600">
                  Showing users signed in today
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Medical Student
                    </label>

                    <p className="mb-2 text-xs text-slate-500">
                      Active Today: {activeStudents?.length || 0}
                    </p>
                    <select
                      value={assignmentForm.studentName}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          studentName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border p-3"
                    >
                      <option value="">Select medical student</option>
                      {studentNameOptions?.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Upper Level
                    </label>

                    <p className="mb-2 text-xs text-slate-500">
                      Active Today: {activeUpperLevels?.length || 0}
                    </p>
                    <select
                      value={assignmentForm.upperLevelName}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          upperLevelName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border p-3"
                    >
                      <option value="">Select upper level</option>
                      {upperLevelNameOptions?.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
               
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Room
                    </label>
                    <select
                      value={assignmentForm.roomNumber}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          roomNumber: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border p-3"
                    >
                      <option value="">Select room</option>
                      {ROOM_OPTIONS.map((room) => (
                        <option key={room.number} value={room.number}>
                          {room.label} — {room.area}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isPapRestricted(selectedEncounter) && (
                    <p className="text-sm text-red-600">
                      Pap smear patients cannot be placed in Room 9 or Room 10.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={assignEncounter}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {leadershipActionLocked ? "Saving..." : "Save Assignment"}
                    </button>

                    <button
                      onClick={() => updateEncounterStatus("In Visit")}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark In Visit
                    </button>

                    <button
                      onClick={() => updateEncounterStatus("Waiting")}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-yellow-500 px-4 py-3 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Waiting
                    </button>

                    <button
                      onClick={() => updateEncounterStatus("Completed")}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-slate-600 px-4 py-3 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Completed
                    </button>

                    <button
                      onClick={clearEncounterRoom}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-red-100 px-4 py-3 text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear Room
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
            <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Medications</h3>

                <button
                  onClick={() => {
                    setEditingMedicationId(null);
                    setNewMedication(EMPTY_MEDICATION);
                    setShowMedicationModal(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  + Add Medication
                </button>
              </div>

              <div
  className={`space-y-3 ${
    sortedMedications.length > 6
      ? "max-h-[300px] overflow-y-auto pr-1"
      : ""
  }`}
>
                {sortedMedications.length > 0 ? (
                  sortedMedications.map((med) => (
                    <div
                      key={med.id}
                      className={`rounded-xl border p-4 ${
                        med.isActive
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{med.name || "—"}</p>
                          <p className="text-sm">Dosage: {med.dosage || "—"}</p>
                          <p className="text-sm">
                            Frequency: {med.frequency || "—"}
                          </p>
                          <p className="text-sm">Route: {med.route || "—"}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                          <button
                            onClick={() => toggleMedicationActive(med.id)}
                            className={`rounded-lg px-4 py-3 text-sm ${
                              med.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {med.isActive ? "Active" : "Inactive"}
                          </button>

                          <button
                            onClick={() => startEditMedication(med)}
                            className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteMedication(med.id)}
                            className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No medications added yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Allergies</h3>

                <button
                  onClick={() => {
                    setEditingAllergyId(null);
                    setNewAllergy(EMPTY_ALLERGY);
                    setShowAllergyModal(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  + Add Allergy
                </button>
              </div>

              <div className="space-y-3">
                {(selectedPatient.allergyList || []).length > 0 ? (
                  selectedPatient.allergyList.map((allergy) => (
                    <div
                      key={allergy.id}
                      className={`rounded-xl border p-4 ${allergy.isActive
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{allergy.allergen || "—"}</p>
                          <p className="text-sm">Reaction: {allergy.reaction || "—"}</p>
                          <p className="text-sm">Severity: {allergy.severity || "—"}</p>
                          {allergy.notes ? (
                            <p className="text-sm">Notes: {allergy.notes}</p>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                          <button
                            onClick={() => startEditAllergy(allergy)}
                            className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteAllergy(allergy.id)}
                            className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No allergies added yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">Vitals</h3>

              <button
                onClick={saveVitals}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {editingVitalsIndex !== null ? "Update Vitals" : "Save Vitals"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                className="rounded-lg border p-3"
                placeholder="BP (e.g. 120/80)"
                value={currentVitals.bp}
                onChange={(e) => updateVitalsField("bp", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder="HR"
                value={currentVitals.hr}
                onChange={(e) => updateVitalsField("hr", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder="Temp °F"
                value={currentVitals.temp}
                onChange={(e) => updateVitalsField("temp", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder="RR"
                value={currentVitals.rr}
                onChange={(e) => updateVitalsField("rr", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder="SpO2 %"
                value={currentVitals.spo2}
                onChange={(e) => updateVitalsField("spo2", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder="Weight (lb)"
                value={currentVitals.weight}
                onChange={(e) => updateVitalsField("weight", e.target.value)}
              />
              <input
                className="rounded-lg border p-3"
                placeholder={`Height (e.g. 5'11")`}
                value={currentVitals.height}
                onChange={(e) => updateVitalsField("height", e.target.value)}
              />
              <input
                className="rounded-lg border bg-slate-50 p-3"
                placeholder="BMI"
                value={currentVitals.bmi}
                readOnly
              />
              <input
                className="rounded-lg border p-3"
                placeholder="Pain Score (e.g. 4/10)"
                value={currentVitals.pain}
                onChange={(e) => updateVitalsField("pain", e.target.value)}
              />
            </div>

           <div className="mt-6">
  <h4 className="mb-3 font-semibold">Vitals Trend</h4>

  {vitalsHistory.length >= 2 ? (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Blood Pressure</p>
        <p className={`mt-1 text-sm font-semibold ${getColorClasses(bpCategory)}`}>
  {latestVitals?.bp || "—"}
</p>
        <p className="text-xs text-slate-600">
          Prev: {previousVitals?.bp || "—"} •{" "}
          {bpTrend
            ? `${renderTrendArrow(bpTrend.systolic)} Sys / ${renderTrendArrow(bpTrend.diastolic)} Dia`
            : "—"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Heart Rate</p>
        <p className={`mt-1 text-sm font-semibold ${getColorClasses(hrCategory)}`}>
          {latestVitals?.hr || "—"}
        </p>
        <p className="text-xs text-slate-600">
          Prev: {previousVitals?.hr || "—"} • {renderTrendArrow(hrTrend)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
  <p className="text-xs font-medium text-slate-500">SpO2</p>
  <p className={`mt-1 text-sm font-semibold ${getColorClasses(spo2Category)}`}>
    {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "—"}
  </p>
  <p className="text-xs text-slate-600">
    Prev: {previousVitals?.spo2 ? `${previousVitals.spo2}%` : "—"}
  </p>
</div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Weight</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {latestVitals?.weight ? `${latestVitals.weight} lb` : "—"}
        </p>
        <p className="text-xs text-slate-600">
          Prev: {previousVitals?.weight ? `${previousVitals.weight} lb` : "—"} •{" "}
          {renderTrendArrow(weightTrend)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Pain</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {latestVitals?.pain || "—"}
        </p>
        <p className="text-xs text-slate-600">
          Prev: {previousVitals?.pain || "—"} • {renderTrendArrow(painTrend)}
        </p>
      </div>
    </div>
  ) : (
    <p className="mb-6 text-sm text-slate-500">
      Need at least 2 vitals entries to show a trend.
    </p>
  )}

  

  <h4 className="mb-3 font-semibold">Vitals History</h4>

              {selectedEncounter.vitalsHistory?.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[700px] w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3">Recorded</th>
                          <th className="p-3">BP</th>
                          <th className="p-3">HR</th>
                          <th className="p-3">Temp</th>
                          <th className="p-3">RR</th>
                          <th className="p-3">SpO2</th>
                          <th className="p-3">Weight</th>
                          <th className="p-3">Height</th>
                          <th className="p-3">BMI</th>
                          <th className="p-3">Pain</th>
                          <th className="p-3">Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEncounter.vitalsHistory.map((entry, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3">{entry.recordedAt}</td>
                            <td className="p-3">{entry.bp || "—"}</td>
                            <td className="p-3">{entry.hr || "—"}</td>
                            <td className="p-3">
                              {entry.temp ? `${entry.temp} °F` : "—"}
                            </td>
                            <td className="p-3">{entry.rr || "—"}</td>
                            <td className="p-3">
                              {entry.spo2 ? `${entry.spo2}%` : "—"}
                            </td>
                            <td className="p-3">
                              {entry.weight ? `${entry.weight} lb` : "—"}
                            </td>
                            <td className="p-3">{entry.height || "—"}</td>
                            <td className="p-3">{entry.bmi || "—"}</td>
                            <td className="p-3">{entry.pain || "—"}</td>
                            <td className="p-3">
                              <button
                                onClick={() => startEditVitals(entry, index)}
                                className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {selectedEncounter.vitalsHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Recorded:</span>{" "}
                            {entry.recordedAt}
                          </p>
                          <p>
                            <span className="font-medium">BP:</span>{" "}
                            {entry.bp || "—"}
                          </p>
                          <p>
                            <span className="font-medium">HR:</span>{" "}
                            {entry.hr || "—"}
                          </p>
                          <p>
                            <span className="font-medium">Temp:</span>{" "}
                            {entry.temp ? `${entry.temp} °F` : "—"}
                          </p>
                          <p>
                            <span className="font-medium">RR:</span>{" "}
                            {entry.rr || "—"}
                          </p>
                          <p>
                            <span className="font-medium">SpO2:</span>{" "}
                            {entry.spo2 ? `${entry.spo2}%` : "—"}
                          </p>
                          <p>
                            <span className="font-medium">Weight:</span>{" "}
                            {entry.weight ? `${entry.weight} lb` : "—"}
                          </p>
                          <p>
                            <span className="font-medium">Height:</span>{" "}
                            {entry.height || "—"}
                          </p>
                          <p>
                            <span className="font-medium">BMI:</span>{" "}
                            {entry.bmi || "—"}
                          </p>
                          <p>
                            <span className="font-medium">Pain:</span>{" "}
                            {entry.pain || "—"}
                          </p>
                        </div>

                        <button
                          onClick={() => startEditVitals(entry, index)}
                          className="mt-3 rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">No vitals recorded yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">SOAP Note</h3>

              <div className="flex flex-wrap items-center gap-3">
                {selectedEncounter.soapSavedAt && (
                  <span className="text-sm text-slate-500">
                    Saved: {selectedEncounter.soapSavedAt}
                  </span>
                )}

                {(() => {
                  const statusInfo = formatSoapStatus(soapStatus);
                  return (
                    <div className={`inline-block rounded-lg px-4 py-3 text-sm font-semibold ${statusInfo.color}`}>
                      SOAP Status: {statusInfo.label}
                    </div>
                  );
                })()}

                <button
                  onClick={saveSoapNote}
                  disabled={isSoapLocked || soapBusy}
                  className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soapBusy ? "Saving..." : isSoapLocked ? "SOAP Locked" : "Save Note"}
                </button>
              </div>
            </div>

            {soapUiMessage && (
              <div className="mb-3 min-h-[32px] text-sm text-slate-700">
                {soapUiMessage}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {canSubmitForUpperLevel ? (
                <button
                  onClick={submitSoapForUpperLevel}
                  disabled={soapBusy}
                  className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white"
                >
                  Submit Note for Upper Level Signature
                </button>
              ) : null}

              {canSubmitForAttending ? (
                <button
                  onClick={submitSoapForAttending}
                  disabled={soapBusy}
                  className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white"
                >
                  Submit Note for Attending Signature
                </button>
              ) : null}
            </div>

            {isSoapLocked ? (
              <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                This SOAP note has been fully signed by the attending and is now locked.
              </div>
            ) : null}

            {canReopenSoap ? (
              <button
                onClick={reopenSoapNote}
                disabled={soapBusy}
                className="mt-3 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reopen Note
              </button>
            ) : null}


            <div className="mt-4 space-y-2">
              <div className="mt-3 flex flex-wrap gap-2">
                {canSignAsUpperLevel ? (
                  <button
                    onClick={signSoapAsUpperLevel}
                    disabled={soapBusy}
                    className="rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white"
                  >
                    Sign as Upper Level
                  </button>
                ) : null}

                {canSignAsAttending ? (
  <button
    onClick={() => {
      setSelectedAttendingId("");
      setAttendingPin("");
      setShowSignModal(true);
    }}
    disabled={soapBusy}
    className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
  >
    Sign as Attending
  </button>
) : null}
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                {selectedEncounter.soapAuthorRole ? (
                  <p>
                    Author: {soapAuthorName || "Unknown User"} ({formatRoleLabel(selectedEncounter.soapAuthorRole)})
                  </p>
                ) : null}

                {selectedEncounter.upperLevelSignedAt ? (
                  <p>
                    Upper Level Signed by {upperLevelSignerName || "Unknown User"} on{" "}
                    {formatDate(selectedEncounter.upperLevelSignedAt)}
                  </p>
                ) : null}

                {selectedEncounter.attendingSignedAt ? (
                  <p>
                    Attending Signed by {attendingSignerName || "Unknown User"} on{" "}
                    {formatDate(selectedEncounter.attendingSignedAt)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Subjective
                </label>
                <textarea
                  className="min-h-[180px] w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder={`Chief complaint / HPI
Pertinent history, meds, allergies
Relevant ROS`}
                  value={selectedEncounter.soapSubjective || ""}
                  onChange={(e) =>
                    updateEncounterField("soapSubjective", e.target.value)
                  }
                  disabled={isSoapLocked}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Objective
                </label>
                <textarea
                  className="min-h-[180px] w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder={`Physical exam findings
General appearance
Focused exam
Relevant test results`}
                  value={selectedEncounter.soapObjective || ""}
                  onChange={(e) =>
                    updateEncounterField("soapObjective", e.target.value)
                  }
                  disabled={isSoapLocked}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Assessment
                </label>
                <textarea
                  className="min-h-[180px] w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder={`Most likely diagnosis
Differential
Problem list`}
                  value={selectedEncounter.soapAssessment || ""}
                  onChange={(e) =>
                    updateEncounterField("soapAssessment", e.target.value)
                  }
                  disabled={isSoapLocked}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Plan
                </label>
                <textarea
                  className="min-h-[180px] w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder={`Treatment
Labs / referrals
Patient education
Follow-up`}
                  value={selectedEncounter.soapPlan || ""}
                  onChange={(e) =>
                    updateEncounterField("soapPlan", e.target.value)
                  }
                  disabled={isSoapLocked}
                />
              </div>
            </div>
          </div>
           <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Audit Trail</h3>

        {auditLoading ? (
          <p className="text-sm text-slate-500">Loading audit trail...</p>
        ) : auditEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No audit history yet.</p>
        ) : (
          <div className="space-y-3">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-800">
                  {formatAuditAction(entry.action)}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.actor_name || "Unknown User"} •{" "}
{new Date(entry.created_at).toLocaleString()}
                </p>

                {![
  "soap_saved",
  "soap_submitted_upper",
  "soap_submitted_attending",
  "soap_signed_upper",
  "soap_signed_attending",
  "soap_reopened",
].includes(entry.action) &&
entry.details &&
Object.keys(entry.details).length > 0 ? (
  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-slate-600">
    {JSON.stringify(entry.details, null, 2)}
  </pre>
) : null}
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
      {showSignModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900">
        Attending Signature
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Select the attending and enter their 4-digit PIN to sign this note.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Attending
          </label>
          <select
            value={selectedAttendingId}
            onChange={(e) => setSelectedAttendingId(e.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="">Select attending</option>
            {activeAttendings?.map((attending) => (
              <option key={attending.id} value={attending.id}>
                {attending.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            4-Digit PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={attendingPin}
            onChange={(e) =>
              setAttendingPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            className="w-full rounded-lg border p-3"
            placeholder="Enter PIN"
          />
        </div>
      </div>
{soapUiMessage ? (
  <p className="mt-3 text-sm text-red-600">{soapUiMessage}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSelectedAttendingId("");
                  setAttendingPin("");
                }}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const success = await signSoapAsAttendingWithPin(
                    selectedAttendingId,
                    attendingPin
                  );

                  if (success) {
                    setShowSignModal(false);
                    setSelectedAttendingId("");
                    setAttendingPin("");
                  } else {
                    setAttendingPin("");
                  }
                }}
                disabled={!selectedAttendingId || attendingPin.length !== 4 || soapBusy}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {soapBusy ? "Signing..." : "Sign Note"}
              </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}