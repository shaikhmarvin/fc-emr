import { getStatusClasses, getStatusLabel } from "../utils";
import { useEffect, useMemo, useState } from "react";
import OphthalmologySoapForm from "./OphthalmologySoapForm";
export default function ChartView({
  selectedPatient,
  selectedEncounter,
  selectedEncounterId,
  normalizeClinicDate,
  setActiveView,
  startNewEncounter,
  deleteEncounter,
  canStartEncounter,
  isLeadershipView,
  getFullPatientName,
  lastVisitLabel,
  openPatientChart,
  spanishBadge,
  priorityBadge,
  papBadge,
  diabetesBadge,
  elevatorBadge,
  fluBadge,
  assignmentForm,
  setAssignmentForm,
  studentNameOptions,
  assignedStudentNames,
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
  saveEncounterField,
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
  saveInHouseLabs,
  saveSendOutLabs,
  soapDraft,
  updateSoapDraftField,
  openPatientEditModal,
  canRefill,
  currentUserId,
  onStartRefillRequest,
  refillRequests,
  profileNameMap,
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

  function getDosesPerDay(frequency) {
    switch ((frequency || "").toLowerCase()) {
      case "daily":
        return 1;
      case "bid":
        return 2;
      case "tid":
        return 3;
      case "qid":
        return 4;
      case "weekly":
        return 1 / 7;
      default:
        return null;
    }
  }
  function getMedicationSupplyInfo(med) {
    const dispense = Number(med?.dispenseAmount);
    const dosesPerDay = getDosesPerDay(med?.frequency);
    const refillCount = Number(med?.refillCount);

    if (!dispense || !dosesPerDay || dosesPerDay <= 0) {
      return {
        daysUntilRefill: "",
        refillDueDate: "",
        totalDaysCovered: "",
        runoutDate: "",
      };
    }

    const daysUntilRefill = Math.floor(dispense / dosesPerDay);
    if (!daysUntilRefill || daysUntilRefill < 1) {
      return {
        daysUntilRefill: "",
        refillDueDate: "",
        totalDaysCovered: "",
        runoutDate: "",
      };
    }

    const safeRefills =
      Number.isFinite(refillCount) && refillCount >= 0 ? refillCount : 0;

    const totalDaysCovered = daysUntilRefill * (safeRefills + 1);

    const today = new Date();

    const refillDue = new Date();
    refillDue.setDate(today.getDate() + daysUntilRefill);

    const runout = new Date();
    runout.setDate(today.getDate() + totalDaysCovered);

    return {
      daysUntilRefill: daysUntilRefill,
      refillDueDate: refillDue.toLocaleDateString(),
      totalDaysCovered: totalDaysCovered,
      runoutDate: runout.toLocaleDateString(),
    };
  }

  function groupImportedLabs(labs = []) {
    return labs.reduce((groups, lab) => {
      const group = lab.group || "Other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(lab);
      return groups;
    }, {});
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

  function getSpecialtyTypeLabel(type) {
    switch (type) {
      case "pt":
        return "Physical Therapy";
      case "dermatology":
        return "Dermatology";
      case "mental_health":
        return "Mental Health";
      case "addiction":
        return "Addiction Medicine";
      default:
        return type || "Specialty";
    }
  }

  function getVisitTypeLabel(visitType) {
    switch (visitType) {
      case "specialty_only":
        return "Specialty Only";
      case "both":
        return "General + Specialty";
      default:
        return "General Clinic";
    }
  }



  const [showTimeline, setShowTimeline] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showSendOutLabs, setShowSendOutLabs] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedAttendingId, setSelectedAttendingId] = useState("");
  const [attendingPin, setAttendingPin] = useState("");
  const [chiefComplaintDraft, setChiefComplaintDraft] = useState("");
  const rapidResultOptions = [
    { value: "", label: "—" },
    { value: "positive", label: "Positive" },
    { value: "negative", label: "Negative" },
  ];

  const hivOptions = [
    { value: "", label: "—" },
    { value: "negative", label: "Negative" },
    { value: "positive", label: "Positive" },
    { value: "indeterminate", label: "Indeterminate" },
  ];

  const uaOptions = {
    leukocytes: ["", "Neg", "Trace", "Small", "Mod", "Large"],
    nitrite: ["", "Neg", "Positive"],
    urobilinogen: ["", "0.2", "1", "2", "4", "8"],
    protein: ["", "Neg", "Trace", "30", "100", "800", ">2000"],
    ph: ["", "5.0", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5"],
    blood: ["", "Neg", "Trace", "Small", "Mod", "Large"],
    specificGravity: ["", "1.000", "1.005", "1.010", "1.015", "1.020", "1.025", "1.030"],
    ketones: ["", "Neg", "Trace/5", "Small/15", "Mod/40", "Large/80", "Very Large/160"],
    bilirubin: ["", "Neg", "Small", "Mod", "Large"],
    glucose: ["", "Neg", "100", "250", "500", "1000", ">2000"],
  };


  function updateInHouseLabSection(sectionKey, fieldKey, value) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};

    saveInHouseLabs({
      ...currentLabs,
      [sectionKey]: {
        ...(currentLabs[sectionKey] || {}),
        [fieldKey]: value,
      },
    });
  }

  function updateInHouseNestedLabSection(sectionKey, subsectionKey, fieldKey, value) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};
    const currentSection = currentLabs[sectionKey] || {};

    saveInHouseLabs({
      ...currentLabs,
      [sectionKey]: {
        ...currentSection,
        [subsectionKey]: {
          ...(currentSection[subsectionKey] || {}),
          [fieldKey]: value,
        },
      },
    });
  }

  function updateInHouseLabRoot(fieldKey, value) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};

    saveInHouseLabs({
      ...currentLabs,
      [fieldKey]: value,
    });
  }

  if (!selectedPatient) return null;

  const sortedEncounters = [...selectedPatient.encounters].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.clinicDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.clinicDate || 0).getTime();
    return bTime - aTime;
  });

  const approvedRefillHistory = (refillRequests || [])
    .filter((req) => {
      const status = String(req.status || "").toLowerCase();
      return (
        String(req.patient_id) === String(selectedPatient?.id) &&
        status === "approved"
      );
    })
    .sort((a, b) => {
      const aTime = new Date(a.approved_at || a.created_at || 0).getTime();
      const bTime = new Date(b.approved_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });



  const legacySendOutLabs = selectedEncounter?.sendOutLabs || {};
  const importedSendOutLabs = Array.isArray(selectedEncounter?.importedSendOutLabs)
    ? selectedEncounter.importedSendOutLabs
    : [];
  const isEncounterLocked = selectedEncounter?.soapStatus === "signed";
  const isSoapLocked = isEncounterLocked; // keep for compatibility
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
  const isSpecialtyVisit =
    selectedEncounter?.visitType === "specialty_only" ||
    selectedEncounter?.visitType === "both";
  const normalizedAssignedStudent = String(assignmentForm.studentName || "").trim().toLowerCase();
  const normalizedAssignedUpperLevel = String(assignmentForm.upperLevelName || "").trim().toLowerCase();

  function roomMatchesCurrentAssignment(room) {
    const roomStudents = (room.assignedStudentsInRoom || []).map((name) =>
      String(name || "").trim().toLowerCase()
    );
    const roomUpperLevels = (room.assignedUpperLevelsInRoom || []).map((name) =>
      String(name || "").trim().toLowerCase()
    );

    if (normalizedAssignedStudent && roomStudents.includes(normalizedAssignedStudent)) {
      return true;
    }

    if (
      !normalizedAssignedStudent &&
      normalizedAssignedUpperLevel &&
      roomUpperLevels.includes(normalizedAssignedUpperLevel)
    ) {
      return true;
    }

    return false;
  }

  function getRoomUsageLabel(room) {
    if (!room?.occupied) {
      return {
        dot: "bg-green-500",
        badge: "bg-green-100 text-green-700",
        text: "Available",
        helper: "",
      };
    }

    if (roomMatchesCurrentAssignment(room)) {
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700",
        text: "Same Student/Provider",
        helper: "This room is already being used by this same student/provider.",
      };
    }

    return {
      dot: "bg-red-500",
      badge: "bg-red-100 text-red-700",
      text: "Different Student/Provider",
      helper: room.occupiedBy
        ? `Currently in use by ${room.occupiedBy}`
        : "Currently in use",
    };
  }

  const specialtyBadgeText = isSpecialtyVisit
    ? `${getVisitTypeLabel(selectedEncounter?.visitType)}${selectedEncounter?.specialtyType
      ? ` • ${getSpecialtyTypeLabel(selectedEncounter.specialtyType)}`
      : ""
    }`
    : "";

  useEffect(() => {
    setChiefComplaintDraft(selectedEncounter?.chiefComplaint || "");
  }, [selectedEncounter?.id, selectedEncounter?.chiefComplaint]);

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <button
        onClick={() => setActiveView("dashboard")}
        className="text-blue-600 hover:underline"
      >
        ← Back to Patients
      </button>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Patient Snapshot
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-slate-800">
                {getFullPatientName(selectedPatient)}
              </p>
              <p className="text-sm text-slate-500">
                MRN: {selectedPatient.mrn || "—"}
              </p>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>DOB: {selectedPatient.dob ? formatDate(selectedPatient.dob) : "—"}</p>
              <p>Age: {selectedPatient.age || "—"}</p>
              <p>Phone: {selectedPatient.phone || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Visit Snapshot
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                Allergies: {(selectedPatient.allergyList || []).length > 0
                  ? `${selectedPatient.allergyList.filter((a) => a.isActive).length} active`
                  : "None listed"}
              </p>
              <p>Active meds: {activeMedicationCount}</p>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>
                Current visit: {selectedEncounter?.clinicDate ? formatDate(selectedEncounter.clinicDate) : "—"}
              </p>
              <p>Last visit: {lastVisitLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {isLeadershipView && (
          <button
            onClick={openEditIntake}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
          >
            Edit Intake
          </button>
        )}

        {(isLeadershipView || selectedPatient) && (
          <button
            onClick={openPatientEditModal}
            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Edit Patient Info
          </button>
        )}

        {canStartEncounter ? (
          <button
            onClick={startNewEncounter}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Start New Encounter
          </button>
        ) : null}
      </div>

      {isSpecialtyVisit && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-violet-800">
              Specialty Visit
            </span>
          </div>

          <div className="mt-1 text-sm text-violet-700">
            {specialtyBadgeText}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">

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
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedEncounterId === encounter.id
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
                          {encounter.visitLocation || "—"} • {encounter.newReturning || "—"}
                        </p>

                        <p className="text-xs font-medium text-slate-700">
                          {getVisitTypeLabel(encounter.visitType)}
                          {encounter.specialtyType
                            ? ` • ${getSpecialtyTypeLabel(encounter.specialtyType)}`
                            : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          Room: {encounter.roomNumber || "—"} • Student: {encounter.assignedStudent || "—"}
                        </p>

                        <p className="text-xs text-slate-500">
                          Vitals: {encounter.vitalsHistory?.length || 0} • SOAP saved: {encounter.soapSavedAt || "Not yet"}
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`inline-block rounded-full border px-3 py-1 text-xs ${getStatusClasses(encounter.status)}`}
                      >
                        {getStatusLabel(encounter.status, encounter.soapStatus)}
                      </span>

                      {canStartEncounter ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEncounter(encounter.id);
                          }}
                          className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          Delete Encounter
                        </button>
                      ) : null}
                    </div>
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
            {priorityBadge(selectedEncounter)}
            {spanishBadge(selectedEncounter)}
            {diabetesBadge?.(selectedEncounter)}
            {fluBadge?.(selectedEncounter)}
            {elevatorBadge?.(selectedEncounter)}
            {papBadge?.(selectedEncounter)}
          </div>

          <div
            className={`grid gap-4 xl:gap-6 ${isLeadershipView ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
              }`}
          >
            <div className="rounded-2xl bg-white p-4 shadow">
              <h3 className="mb-4 text-lg font-semibold">Encounter Details</h3>

              <div className="space-y-3 text-sm">

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Chief Complaint
                  </label>
                  <input
                    type="text"
                    value={chiefComplaintDraft}
                    onChange={(e) => {
                      if (isEncounterLocked) return;
                      setChiefComplaintDraft(e.target.value);
                    }}
                    onBlur={async (e) => {
                      if (isEncounterLocked) return;

                      const nextValue = e.target.value;
                      updateEncounterField("chiefComplaint", nextValue);
                      await saveEncounterField("chiefComplaint", nextValue);
                    }}
                    disabled={isEncounterLocked}
                    className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
                  />
                </div>

                <p>
                  <span className="font-medium">Encounter Status:</span>{" "}
                  {selectedEncounter.status}
                </p>

                <p>
                  <span className="font-medium">SOAP Status:</span>{" "}
                  {formatSoapStatus(soapStatus).label}
                </p>
              </div>
            </div>

            {isLeadershipView && selectedEncounter?.visitType !== "specialty_only" && (
              <div className="rounded-2xl bg-white p-4 shadow">
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
                      className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                    >
                      <option value="">Select medical student</option>
                      {studentNameOptions?.map((name) => {
                        const isAssigned =
                          assignedStudentNames?.has(name) &&
                          assignmentForm.studentName !== name;

                        return (
                          <option key={name} value={name}>
                            {isAssigned ? `${name} (Assigned)` : name}
                          </option>
                        );
                      })}
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
                      className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
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
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Room
                      </label>

                      {(() => {
                        const selectedRoom = ROOM_OPTIONS.find(
                          (room) => String(room.number) === String(assignmentForm.roomNumber)
                        );

                        if (!selectedRoom) return null;

                        const roomUsage = getRoomUsageLabel(selectedRoom);

                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${roomUsage.dot}`}
                            />

                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${roomUsage.badge}`}
                            >
                              {roomUsage.text}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <select
                      value={assignmentForm.roomNumber}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          roomNumber: e.target.value,
                        }))
                      }
                      className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                    >
                      <option value="">Select room</option>
                      {ROOM_OPTIONS.map((room) => (
                        <option key={room.number} value={room.number}>
                          {room.displayLabel || `${room.label} — ${room.area}`}
                          {room.occupied
                            ? roomMatchesCurrentAssignment(room)
                              ? " (Same Student/Provider)"
                              : " (In Use)"
                            : " (Available)"}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const selectedRoom = ROOM_OPTIONS.find(
                        (room) => String(room.number) === String(assignmentForm.roomNumber)
                      );

                      if (!selectedRoom) return null;

                      const roomUsage = getRoomUsageLabel(selectedRoom);

                      if (!selectedRoom.occupied) return null;

                      return (
                        <div className="mt-1 space-y-1 text-right">
                          <p className="text-xs text-slate-500">
                            {roomUsage.helper}
                          </p>

                          {selectedRoom.activeEncounterCount > 1 ? (
                            <p className="text-xs text-slate-400">
                              {selectedRoom.activeEncounterCount} active encounters in this room
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  {isPapRestricted(selectedEncounter) && (
                    <p className="text-sm text-red-600">
                      Pap smear patients cannot be placed in Room 9 or Room 10.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      onClick={assignEncounter}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {leadershipActionLocked ? "Saving..." : "Assign / Start Visit"}
                    </button>

                    <button
                      onClick={clearEncounterRoom}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Complete Visit / Free Room
                    </button>

                    <button
                      onClick={() => updateEncounterStatus("ready")}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-yellow-500 px-4 py-3 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Return to Ready
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Medications</h3>

                <button
                  onClick={() => {
                    if (isEncounterLocked) return;
                    setEditingMedicationId(null);
                    setNewMedication(EMPTY_MEDICATION);
                    setShowMedicationModal(true);
                  }}
                  disabled={isEncounterLocked}
                  className={`rounded-lg px-4 py-2 text-white ${isEncounterLocked
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  + Add Medication
                </button>
              </div>

              <div
                className={`space-y-3 ${sortedMedications.length > 6
                  ? "max-h-[300px] overflow-y-auto pr-1"
                  : ""
                  }`}
              >
                {sortedMedications.length > 0 ? (
                  sortedMedications.map((med) => (
                    <div
                      key={med.id}
                      className={`rounded-xl border p-4 ${med.isActive
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{med.name || "—"}</p>

                              {med.lastUpdatedEncounterId === selectedEncounter?.id && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  Updated This Visit
                                </span>
                              )}
                            </div>

                            <p className="text-sm">Dosage: {med.dosage || "—"}</p>
                            <p className="text-sm">Frequency: {med.frequency || "—"}</p>
                            <p className="text-sm">Route: {med.route || "—"}</p>

                            <p className="text-sm">
                              Dispense: {med.dispenseAmount || "—"}
                            </p>

                            <p className="text-sm">
                              Refills: {med.refillCount ?? "0"}
                            </p>

                            {med.instructions ? (
                              <p className="text-sm">Instructions: {med.instructions}</p>
                            ) : null}

                            {(() => {
                              const supply = getMedicationSupplyInfo(med);

                              if (!supply.daysUntilRefill) return null;

                              return (
                                <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                  <p>Days Until Refill: {supply.daysUntilRefill}</p>
                                  <p>Refill Due: {supply.refillDueDate}</p>
                                  <p>Total Coverage: {supply.totalDaysCovered} days</p>
                                  <p>Estimated Runout: {supply.runoutDate}</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                          <button
                            onClick={() => {
                              if (isEncounterLocked) return;
                              toggleMedicationActive(med.id);
                            }}
                            className={`rounded-lg px-4 py-3 text-sm ${med.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                              }`}
                          >
                            {med.isActive ? "Active" : "Inactive"}
                          </button>

                          <button
                            onClick={() => {
                              if (isEncounterLocked) return;
                              startEditMedication(med);
                            }}
                            className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              if (isEncounterLocked) return;
                              deleteMedication(med.id);
                            }}
                            className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700"
                          >
                            Delete
                          </button>

                          {canRefill && (
                            <button
                              onClick={() => {
                                if (isEncounterLocked) return;
                                onStartRefillRequest(med);
                              }}
                              className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white"
                            >
                              Refill
                            </button>
                          )}
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

            <div className="mt-6 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-800">
                Refill History
              </h4>

              {approvedRefillHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {approvedRefillHistory.map((req) => {
                    const medication = (selectedPatient.medicationList || []).find(
                      (med) => String(med.id) === String(req.medication_id)
                    );

                    const approvedPayload = req.request_payload || null;
                    const approvedMedication = approvedPayload
                      ? {
                        name: approvedPayload.name || medication?.name || "",
                        dosage: approvedPayload.dosage || medication?.dosage || "",
                        frequency: approvedPayload.frequency || medication?.frequency || "",
                        route: approvedPayload.route || medication?.route || "",
                        dispenseAmount:
                          approvedPayload.dispenseAmount ?? medication?.dispenseAmount ?? "",
                        refillCount:
                          approvedPayload.refillCount ?? medication?.refillCount ?? "",
                        instructions:
                          approvedPayload.instructions || medication?.instructions || "",
                      }
                      : medication;

                    return (
                      <div
                        key={req.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {approvedMedication?.name || "Medication"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Approved: {req.approved_at ? formatDate(req.approved_at) : "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Approved by: {profileNameMap?.[req.approved_by] || "Unknown User"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Requested by: {profileNameMap?.[req.requested_by] || "Unknown User"}
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
                          <div>Dosage: {approvedMedication?.dosage || "—"}</div>
                          <div>Frequency: {approvedMedication?.frequency || "—"}</div>
                          <div>Route: {approvedMedication?.route || "—"}</div>
                          <div>Dispense: {approvedMedication?.dispenseAmount || "—"}</div>
                          <div>Refills: {approvedMedication?.refillCount ?? "—"}</div>
                          {(() => {
                            const supply = getMedicationSupplyInfo(approvedMedication);

                            if (!supply.daysUntilRefill) return null;

                            return (
                              <>
                                <div>Days Until Refill: {supply.daysUntilRefill}</div>
                                <div>Total Coverage: {supply.totalDaysCovered} days</div>
                                <div>Estimated Runout: {supply.runoutDate}</div>
                              </>
                            );
                          })()}
                        </div>

                        {approvedMedication?.instructions ? (
                          <div className="mt-1 text-xs text-slate-600">
                            Instructions: {approvedMedication.instructions}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No approved refill history yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Allergies</h3>

                <button
                  onClick={() => {
                    if (isEncounterLocked) return;
                    setEditingAllergyId(null);
                    setNewAllergy(EMPTY_ALLERGY);
                    setShowAllergyModal(true);
                  }}
                  disabled={isEncounterLocked}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  + Add Allergy
                </button>
              </div>

              <div
                className={`${(selectedPatient.allergyList || []).length > 5
                  ? "max-h-[260px] overflow-y-auto pr-1"
                  : ""
                  } space-y-3`}
              >
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

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                          <button
                            onClick={() => {
                              if (isEncounterLocked) return;
                              startEditAllergy(allergy);
                            }}
                            className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              if (isEncounterLocked) return;
                              deleteAllergy(allergy.id);
                            }}
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
                onClick={() => {
                  if (isEncounterLocked) return;
                  saveVitals();
                }}
                disabled={isEncounterLocked}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {editingVitalsIndex !== null ? "Update Vitals" : "Save Vitals"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="BP (e.g. 120/80)"
                value={currentVitals.bp}
                onChange={(e) => updateVitalsField("bp", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="HR"
                value={currentVitals.hr}
                onChange={(e) => updateVitalsField("hr", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Temp °F"
                value={currentVitals.temp}
                onChange={(e) => updateVitalsField("temp", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="RR"
                value={currentVitals.rr}
                onChange={(e) => updateVitalsField("rr", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="SpO2 %"
                value={currentVitals.spo2}
                onChange={(e) => updateVitalsField("spo2", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Weight (lb)"
                value={currentVitals.weight}
                onChange={(e) => updateVitalsField("weight", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder={`Height (e.g. 5'11")`}
                value={currentVitals.height}
                onChange={(e) => updateVitalsField("height", e.target.value)}
                disabled={isEncounterLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="BMI"
                value={currentVitals.bmi}
                readOnly
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Pain Score (e.g. 4/10)"
                value={currentVitals.pain}
                onChange={(e) => updateVitalsField("pain", e.target.value)}
                disabled={isEncounterLocked}
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
                                onClick={() => {
                                  if (isEncounterLocked) return;
                                  startEditVitals(entry, index);
                                }}
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
                          onClick={() => {
                            if (isEncounterLocked) return;
                            startEditVitals(entry, index);
                          }}
                          disabled={isEncounterLocked}
                          className="mt-3 rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <button
              onClick={() => setShowLabs((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              In-House Labs
              <span>{showLabs ? "▲" : "▼"}</span>
            </button>

            {showLabs && (
              <div className="mt-4 space-y-6">

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">iSTAT Panel</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Na</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.na || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "na", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">K</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.k || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "k", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Cl</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.cl || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "cl", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">iCa</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.ica || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "ica", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Glucose</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.glucose || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "glucose", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">TCO2</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.tco2 || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "tco2", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">BUN</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.bun || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "bun", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Creatinine</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.creatinine || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "creatinine", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">HCT</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.hct || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "hct", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Hgb</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.hgb || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "hgb", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Anion Gap</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.istat?.anionGap || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("istat", "anionGap", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Core Labs</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Blood Glucose</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.core?.bloodGlucose || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("core", "bloodGlucose", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">HbA1C</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.core?.a1c || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("core", "a1c", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">HIV</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.core?.hiv || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("core", "hiv", e.target.value);
                        }}
                      >
                        <option value="">Select</option>
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="indeterminate">Indeterminate</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Lipids</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">HDL</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.lipids?.hdl || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("lipids", "hdl", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Triglycerides</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.lipids?.triglycerides || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("lipids", "triglycerides", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">LDL</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.lipids?.ldl || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("lipids", "ldl", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">TC/HDL</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.lipids?.tcHdl || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("lipids", "tcHdl", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Total Cholesterol</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.lipids?.totalCholesterol || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("lipids", "totalCholesterol", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Microalbumin / Creatinine</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Albumin</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.microalbumin?.albumin || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("microalbumin", "albumin", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Creatinine</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.microalbumin?.creatinine || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("microalbumin", "creatinine", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">A/C Ratio</label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.microalbumin?.acRatio || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("microalbumin", "acRatio", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Urinalysis</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Leukocytes</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.leukocytes || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "leukocytes", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.leukocytes.map((option) => (
                          <option key={option || "blank-leukocytes"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Nitrite</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.nitrite || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "nitrite", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.nitrite.map((option) => (
                          <option key={option || "blank-nitrite"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Urobilinogen</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.urobilinogen || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "urobilinogen", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.urobilinogen.map((option) => (
                          <option key={option || "blank-urobilinogen"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Protein</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.protein || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "protein", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.protein.map((option) => (
                          <option key={option || "blank-protein"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">pH</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.ph || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "ph", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.ph.map((option) => (
                          <option key={option || "blank-ph"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Blood</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.blood || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "blood", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.blood.map((option) => (
                          <option key={option || "blank-blood"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Specific Gravity</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.specificGravity || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "specificGravity", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.specificGravity.map((option) => (
                          <option key={option || "blank-sg"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Ketones</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.ketones || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "ketones", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.ketones.map((option) => (
                          <option key={option || "blank-ketones"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Bilirubin</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.bilirubin || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "bilirubin", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.bilirubin.map((option) => (
                          <option key={option || "blank-bilirubin"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Urine Glucose</label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                        value={selectedEncounter.inHouseLabs?.urinalysis?.glucose || ""}
                        onChange={(e) => {
                          if (isEncounterLocked) return;
                          updateInHouseLabSection("urinalysis", "glucose", e.target.value);
                        }}
                        disabled={isEncounterLocked}
                      >
                        {uaOptions.glucose.map((option) => (
                          <option key={option || "blank-ua-glucose"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Rapid Tests</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      { key: "flu", label: "Flu" },
                      { key: "strep", label: "Strep" },
                      { key: "guaiac", label: "Guaiac" },
                      { key: "hcg", label: "HCG" },
                      { key: "mono", label: "Mono" },
                    ].map((test) => {
                      const currentValue = selectedEncounter.inHouseLabs?.rapid?.[test.key] || "";

                      return (
                        <div key={test.key}>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            {test.label}
                          </label>

                          <div className="flex gap-2">
                            {["positive", "negative"].map((val) => {
                              const isActive = currentValue === val;

                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    if (isEncounterLocked) return;
                                    updateInHouseLabSection(
                                      "rapid",
                                      test.key,
                                      currentValue === val ? "" : val
                                    )
                                  }
                                  }
                                  className={`rounded-lg border px-3 py-2 text-sm ${isActive
                                    ? "border-blue-600 bg-blue-100 text-blue-800"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                  {val === "positive" ? "Positive" : "Negative"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Nursing Notes</h4>
                  <textarea
                    className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                    rows={4}
                    placeholder="Nursing notes"
                    value={selectedEncounter.inHouseLabs?.nursingNotes || ""}
                    onChange={(e) => {
                      if (isEncounterLocked) return;
                      updateInHouseLabRoot("nursingNotes", e.target.value);
                    }}
                    disabled={isEncounterLocked}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <button
              onClick={() => setShowSendOutLabs((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              Send-Out Labs
              <span>{showSendOutLabs ? "▲" : "▼"}</span>
            </button>

            {showSendOutLabs && (
              <div className="mt-4 space-y-6">
                {/* Legacy send-out workflow stays visible */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={legacySendOutLabs?.ordered || false}
                      onChange={(e) =>
                        saveSendOutLabs({
                          ...legacySendOutLabs,
                          ordered: e.target.checked,
                        })
                      }
                    />
                    Send-Out Labs Ordered
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={legacySendOutLabs?.received || false}
                      onChange={(e) =>
                        saveSendOutLabs({
                          ...legacySendOutLabs,
                          received: e.target.checked,
                        })
                      }
                    />
                    Results Received
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={!legacySendOutLabs?.received}
                      checked={legacySendOutLabs?.patientNotified || false}
                      onChange={(e) =>
                        saveSendOutLabs({
                          ...legacySendOutLabs,
                          patientNotified: e.target.checked,
                        })
                      }
                    />
                    Patient Notified
                  </label>

                  <textarea
                    className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                    placeholder="Labs ordered / notes"
                    value={legacySendOutLabs?.notes || ""}
                    onChange={(e) =>
                      saveSendOutLabs({
                        ...legacySendOutLabs,
                        notes: e.target.value,
                      })
                    }
                  />

                  <textarea
                    className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                    placeholder="Result summary"
                    value={legacySendOutLabs?.resultSummary || ""}
                    onChange={(e) =>
                      saveSendOutLabs({
                        ...legacySendOutLabs,
                        resultSummary: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Imported OCR labs display below legacy controls */}
                {importedSendOutLabs.length > 0 ? (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Imported outside labs saved for this encounter.
                    </div>

                    {Object.entries(groupImportedLabs(importedSendOutLabs)).map(
                      ([group, labs]) => (
                        <div
                          key={group}
                          className="overflow-hidden rounded-xl border border-slate-200"
                        >
                          <div className="bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
                            {group}
                          </div>

                          <div className="divide-y divide-slate-100">
                            {labs.map((lab, index) => (
                              <div
                                key={`${lab.key || lab.displayName || "lab"}-${index}`}
                                className="flex items-start justify-between gap-4 px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    {lab.displayName || lab.key || "Lab"}
                                  </div>

                                  {lab.expectedRangeText ? (
                                    <div className="mt-1 text-xs text-slate-500">
                                      Expected: {lab.expectedRangeText}
                                    </div>
                                  ) : null}

                                  {lab.suspicious ? (
                                    <div className="mt-1 text-xs font-medium text-yellow-700">
                                      Value looks unusual — review saved result
                                    </div>
                                  ) : null}
                                </div>

                                <div className="shrink-0 text-sm font-semibold text-slate-900">
                                  {lab.value !== null &&
                                    lab.value !== undefined &&
                                    lab.value !== ""
                                    ? String(lab.value)
                                    : "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
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

            <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
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
              <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
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

            {selectedEncounter?.specialtyType === "ophthalmology" ? (
  <OphthalmologySoapForm
    soapDraft={soapDraft}
    updateSoapDraftField={updateSoapDraftField}
    isSoapLocked={isSoapLocked}
  />
) : (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Subjective
      </label>
      <textarea
        className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
        value={soapDraft.soapSubjective || ""}
        onChange={(e) =>
          updateSoapDraftField("soapSubjective", e.target.value)
        }
        disabled={isSoapLocked}
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Objective
      </label>
      <textarea
        className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
        value={soapDraft.soapObjective || ""}
        onChange={(e) =>
          updateSoapDraftField("soapObjective", e.target.value)
        }
        disabled={isSoapLocked}
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Assessment
      </label>
      <textarea
        className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
        value={soapDraft.soapAssessment || ""}
        onChange={(e) =>
          updateSoapDraftField("soapAssessment", e.target.value)
        }
        disabled={isSoapLocked}
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Plan
      </label>
      <textarea
        className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
        value={soapDraft.soapPlan || ""}
        onChange={(e) =>
          updateSoapDraftField("soapPlan", e.target.value)
        }
        disabled={isSoapLocked}
      />
    </div>
  </div>
)}
          </div>

                    <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <button
              onClick={() => setShowAudit((prev) => !prev)}
              className="mb-4 flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              Audit Trail
              <span>{showAudit ? "▲" : "▼"}</span>
            </button>

              {showAudit && (
                <>
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
                </>
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
                      className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
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
                      pattern="[0-9]*"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={4}
                      name="attending-signature-pin"
                      value={attendingPin}
                      onChange={(e) =>
                        setAttendingPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
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
      )}
  
