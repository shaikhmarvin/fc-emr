import { useState } from "react";
import { formatDate, getStatusClasses, getStatusLabel } from "../utils";
export default function QueueView({
  userRole,
  searchForm,
  waitingEncounterRows,
  selectedClinicDate,
  setSelectedClinicDate,
  openPatientChart,
  getPatientBoardName,
  spanishBadge,
  priorityBadge,
  newReturningBadge,
  diabetesBadge,
  htnBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  dualVisitBadge,
  formatWaitTime,
  studentNameOptions,
  upperLevelNameOptions,
  activeStudents,
  activeUpperLevels,
  ROOM_OPTIONS,
  onAssignFromQueue,
  onMarkMedicationsReady,
  onMarkPatientSentToPharmacy,
  onClearPharmacyStatus,
  onMarkMedicationsPickedUp,
  refillRequests,
  canRefill,
  patients,
  activeAttendings,
  onApproveRefillRequest,
  onApproveRefillAsSignedInAttending,
  profileNameMap,
  onDeleteRefillRequest,
  programEntries,
  specialtyAccess,
  papEntries,
}) {

  const [queueAssignmentDrafts, setQueueAssignmentDrafts] = useState({});
  const [queueSearch, setQueueSearch] = useState("");
const [prioritizeRefillOnly, setPrioritizeRefillOnly] = useState(false);
  const [pharmacyStatusFilter, setPharmacyStatusFilter] = useState("all");
  const [ophthoPriorityView, setOphthoPriorityView] = useState(false);
  const [openAssignmentMenu, setOpenAssignmentMenu] = useState(null);
  const [showRefillApproveModal, setShowRefillApproveModal] = useState(false);
  const [selectedRefillRequest, setSelectedRefillRequest] = useState(null);
  const [selectedAttendingId, setSelectedAttendingId] = useState("");
  const [refillPin, setRefillPin] = useState("");
  const [refillApproveBusy, setRefillApproveBusy] = useState(false);
  const [refillApproveMessage, setRefillApproveMessage] = useState("");
  const [directApproveBusyId, setDirectApproveBusyId] = useState(null);
  const [deleteRefillBusyId, setDeleteRefillBusyId] = useState(null);

  function getDraftValue(encounter, field) {
    return queueAssignmentDrafts[encounter.id]?.[field] ?? encounter[field] ?? "";
  }

  function updateDraft(encounterId, field, value) {
    setQueueAssignmentDrafts((prev) => ({
      ...prev,
      [encounterId]: {
        ...prev[encounterId],
        [field]: value,
      },
    }));
  }

  function submitDraft(encounter) {
    const draft = queueAssignmentDrafts[encounter.id] || {};

    onAssignFromQueue(encounter.id, {
      assignedStudent: draft.assignedStudent ?? encounter.assignedStudent ?? "",
      assignedUpperLevel:
        draft.assignedUpperLevel ?? encounter.assignedUpperLevel ?? "",
      roomNumber: draft.roomNumber ?? encounter.roomNumber ?? "",
    });
  }

  function getPharmacyDisplayName(patient) {
    const name =
      getPatientBoardName?.(patient) ||
      patient?.preferredName ||
      patient?.name ||
      "";

    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Patient";
    if (parts.length === 1) return parts[0];

    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  function getFullQueuePatientName(patient) {
  const first = patient?.firstName?.trim() || "";
  const last = patient?.lastName?.trim() || "";

  if (!first && !last) {
    return (
      patient?.preferredName ||
      patient?.name ||
      "Patient"
    );
  }

  return `${first} ${last}`.trim();
}


  const normalizedSpecialtyAccess = Array.isArray(specialtyAccess)
    ? specialtyAccess
    : [];
  const canUseOphthoQueueTools = normalizedSpecialtyAccess.includes("Ophthalmology");
  const canUseSocialWorkQueueTools = userRole === "social_work";
  const canUseWholeClinicQueueTools = canUseOphthoQueueTools || canUseSocialWorkQueueTools;
  const canUsePharmacyQueue =
    userRole === "pharmacy" ||
    userRole === "undergraduate" ||
    (canRefill && userRole !== "leadership" && userRole !== "attending");
  const canMarkMedicationsReady = userRole === "pharmacy";
  const canBypassPharmacyReadyForPickup =
    userRole === "undergraduate" ||
    (canRefill && userRole !== "pharmacy" && userRole !== "leadership" && userRole !== "attending");
  const canMarkMedicationsPickedUp = canUsePharmacyQueue;

  function getEncounterIntakeFlag(encounter, field) {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};
    const value = encounter?.[field] ?? intakeData?.[field];
    return value === true || value === "true" || value === "Yes";
  }

  function isPatientOnOphthoList(patient, encounter) {
    return (programEntries || []).some((entry) => {
      if (entry.programType !== "Ophthalmology") return false;
      if (["Completed", "Declined"].includes(entry.status)) return false;

      const samePatientId =
        entry.patientId && patient?.id && String(entry.patientId) === String(patient.id);
      const samePatientDemographics =
        entry.patientName &&
        patient &&
        normalizeName(entry.patientName) === normalizeName(getFullQueuePatientName(patient)) &&
        (!entry.dob || !patient.dob || entry.dob === patient.dob);

      return samePatientId || samePatientDemographics;
    });
  }

  function getOphthoPriorityScore(row) {
    const { patient, encounter } = row;
    let score = 0;

    if (isPatientOnOphthoList(patient, encounter)) score += 100;
    if (getEncounterIntakeFlag(encounter, "dm")) score += 50;
    if (getEncounterIntakeFlag(encounter, "htn")) score += 25;

    return score;
  }

  function isGeneralVisitComplete(encounter) {
    return (
      encounter?.status === "done" ||
      encounter?.soapStatus === "signed" ||
      Boolean(encounter?.visitCompletedAt || encounter?.visit_completed_at || encounter?.doneAt || encounter?.done_at)
    );
  }

  function getPharmacyDailyNumber(patient, encounter) {
    return getDailyCardNumber(patient, encounter)
      ? `#${getDailyCardNumber(patient, encounter)} — `
      : "";
  }

  function pharmacyStatusBadge(encounter) {
    if (encounter?.pharmacyStatus === "meds_ready") {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
          Meds Ready
        </span>
      );
    }

    if (encounter?.pharmacyStatus === "patient_sent") {
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          Sent to Pharmacy
        </span>
      );
    }

    if (encounter?.pharmacyStatus === "picked_up") {
      return (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
          Medications Picked Up
        </span>
      );
    }

    return null;
  }

  function getCompactPatientLabel(patient, encounter) {
    const dailyNumber = getDailyCardNumber(patient, encounter);
    return `${dailyNumber ? `#${dailyNumber} — ` : ""}${getFullQueuePatientName(patient)}`;
  }


  function normalizeSearchText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function getDailyCardNumber(patient, encounter) {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};

    return (
      encounter?.dailyNumber ??
      encounter?.daily_number ??
      intakeData?.dailyNumber ??
      intakeData?.daily_number ??
      intakeData?.cardNumber ??
      intakeData?.card_number ??
      intakeData?.queueNumber ??
      intakeData?.queue_number ??
      encounter?.cardNumber ??
      encounter?.card_number ??
      encounter?.queueNumber ??
      encounter?.queue_number ??
      patient?.dailyNumber ??
      patient?.daily_number ??
      patient?.cardNumber ??
      patient?.card_number ??
      patient?.queueNumber ??
      patient?.queue_number ??
      ""
    );
  }

  function getLeadershipQueueNotes(encounter) {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};

    return (
      encounter?.notes ||
      encounter?.leadershipNotes ||
      encounter?.leadership_notes ||
      intakeData?.notes ||
      intakeData?.leadershipNotes ||
      intakeData?.leadership_notes ||
      ""
    );
  }

  function getRefillMedicationRequest(encounter) {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};
    return (
      encounter?.refillMedicationRequest ||
      encounter?.refill_medication_request ||
      intakeData?.refillMedicationRequest ||
      intakeData?.refill_medication_request ||
      ""
    );
  }

  function isPatientOnActivePap(patient) {
    return (papEntries || []).some((entry) => {
      const status = String(entry?.status || "").toLowerCase();
      if (!["pending application", "pending poi"].includes(status)) return false;

      const sameId = entry?.patientId && patient?.id && String(entry.patientId) === String(patient.id);
      const sameMrn = entry?.mrn && patient?.mrn && String(entry.mrn) === String(patient.mrn);
      const sameNameDob =
        entry?.patientName &&
        normalizeName(entry.patientName) === normalizeName(getFullQueuePatientName(patient)) &&
        (!entry?.dob || !patient?.dob || entry.dob === patient.dob);

      return sameId || sameMrn || sameNameDob;
    });
  }

  function rowMatchesQueueSearch(patient, encounter) {
    const query = normalizeSearchText(queueSearch);
    if (!query) return true;

    const boardName = normalizeSearchText(getPatientBoardName(patient));
    const fullName = normalizeSearchText(getFullQueuePatientName(patient));
    const firstName = normalizeSearchText(patient?.firstName || patient?.first_name);
    const lastName = normalizeSearchText(patient?.lastName || patient?.last_name);
    const preferredName = normalizeSearchText(patient?.preferredName || patient?.preferred_name);
    const mrn = normalizeSearchText(patient?.mrn);
    const dob = normalizeSearchText(patient?.dob);
    const dailyCardNumber = normalizeSearchText(getDailyCardNumber(patient, encounter));

    return (
      boardName.includes(query) ||
      fullName.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query) ||
      preferredName.includes(query) ||
      mrn.includes(query) ||
      dob.includes(query) ||
      dailyCardNumber.includes(query)
    );
  }

  function normalizeAssignmentName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function roomMatchesDraftAssignment(room, encounter) {
    const draftStudent = normalizeAssignmentName(
      getDraftValue(encounter, "assignedStudent")
    );
    const draftUpper = normalizeAssignmentName(
      getDraftValue(encounter, "assignedUpperLevel")
    );

    const roomStudents = (room.assignedStudentsInRoom || []).map((name) =>
      normalizeAssignmentName(name)
    );

    const roomUpperLevels = (room.assignedUpperLevelsInRoom || []).map((name) =>
      normalizeAssignmentName(name)
    );

    if (draftStudent && roomStudents.includes(draftStudent)) {
      return true;
    }

    if (!draftStudent && draftUpper && roomUpperLevels.includes(draftUpper)) {
      return true;
    }

    return false;
  }

  function getRoomQueueDisplay(room, encounter) {
  if (!room?.occupied) {
    return {
      label: "🟢 Available",
      optionClass: "bg-green-50 text-green-900",
      selectClass: "border-green-300 bg-green-50 text-green-900",
    };
  }

  if (roomMatchesDraftAssignment(room, encounter)) {
    return {
      label: "🔵 Same Student/Provider",
      optionClass: "bg-blue-50 text-blue-900",
      selectClass: "border-blue-300 bg-blue-50 text-blue-900",
    };
  }

  return {
    label: room.occupiedBy ? `🔴 In Use - ${room.occupiedBy}` : "🔴 In Use",
    optionClass: "bg-red-50 text-red-900",
    selectClass: "border-red-300 bg-red-50 text-red-900",
  };
}

function getSelectedRoomQueueClass(encounter) {
  const selectedRoomNumber = getDraftValue(encounter, "roomNumber");
  const selectedRoom = ROOM_OPTIONS.find(
    (room) => String(room.number) === String(selectedRoomNumber)
  );

  if (!selectedRoom) return "border-slate-300 bg-white text-slate-900";

  return getRoomQueueDisplay(selectedRoom, encounter).selectClass;
}

  const pendingRefills = (refillRequests || []).filter((r) => {
    const status = String(r.status || "pending").toLowerCase();
    return status === "pending";
  });

  function getPatientFromRefill(req) {
    return (patients || []).find(
      (patient) => String(patient.id) === String(req.patient_id)
    );
  }

  function getMedicationFromRefill(req) {
    const patient = getPatientFromRefill(req);
    if (!patient || !patient.medicationList) return null;

    return patient.medicationList.find(
      (med) => String(med.id) === String(req.medication_id)
    );
  }

  function getChangedFields(originalMedication, updatedMedication) {
    if (!originalMedication || !updatedMedication) return [];

    const fields = [
      { key: "dosage", label: "Dosage" },
      { key: "frequency", label: "Frequency" },
      { key: "route", label: "Route" },
      { key: "dispenseAmount", label: "Dispense" },
      { key: "refillCount", label: "Refills" },
      { key: "instructions", label: "Instructions" },
    ];

    return fields
      .map((field) => {
        const beforeValue =
          originalMedication[field.key] === undefined ||
            originalMedication[field.key] === null ||
            originalMedication[field.key] === ""
            ? "—"
            : String(originalMedication[field.key]);

        const afterValue =
          updatedMedication[field.key] === undefined ||
            updatedMedication[field.key] === null ||
            updatedMedication[field.key] === ""
            ? "—"
            : String(updatedMedication[field.key]);

        if (beforeValue === afterValue) return null;

        return {
          label: field.label,
          before: beforeValue,
          after: afterValue,
        };
      })
      .filter(Boolean);
  }

  function openApproveRefillModal(req) {
    setSelectedRefillRequest(req);
    setSelectedAttendingId(activeAttendings?.[0]?.id ?? "");
    setRefillPin("");
    setRefillApproveMessage("");
    setShowRefillApproveModal(true);
  }

  async function submitRefillApproval() {
    if (!selectedRefillRequest) return;
    if (!selectedAttendingId) {
      setRefillApproveMessage("Please select an attending.");
      return;
    }

    try {
      setRefillApproveBusy(true);
      setRefillApproveMessage("");

      await onApproveRefillRequest(
        selectedRefillRequest.id,
        selectedAttendingId,
        refillPin
      );

      setShowRefillApproveModal(false);
      setSelectedRefillRequest(null);
      setSelectedAttendingId("");
      setRefillPin("");
    } catch (error) {
      console.error("Failed to approve refill:", error);
      setRefillApproveMessage(error.message || "Failed to approve refill.");
    } finally {
      setRefillApproveBusy(false);
    }
  }

  async function approveRefillAsSignedInAttending(req) {
    try {
      setDirectApproveBusyId(req.id);
      await onApproveRefillAsSignedInAttending(req.id);

      alert("Refill approved");
    } catch (error) {
      console.error("Failed to approve refill as signed-in attending:", error);
      alert(error.message || "Failed to approve refill.");
    } finally {
      setDirectApproveBusyId(null);
    }
  }

  async function removeRefillRequest(req) {
    const confirmed = window.confirm(
      "Remove this refill request?"
    );
    if (!confirmed) return;

    try {
      setDeleteRefillBusyId(req.id);
      await onDeleteRefillRequest(req.id);
    } catch (error) {
      console.error("Failed to remove refill request:", error);
      alert(error.message || "Failed to remove refill request.");
    } finally {
      setDeleteRefillBusyId(null);
    }
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function getPersonDisplayName(person) {
    if (!person) return "";

    if (typeof person === "string") {
      return profileNameMap?.[person] || person;
    }

    return (
      person.fullName ||
      person.full_name ||
      person.displayName ||
      person.display_name ||
      person.name ||
      profileNameMap?.[person.id] ||
      profileNameMap?.[person.user_id] ||
      person.email ||
      ""
    );
  }

  function activeNameSet(list) {
    const set = new Set();

    (list || []).forEach((person) => {
      const displayName = getPersonDisplayName(person);
      if (displayName) set.add(normalizeName(displayName));

      if (person?.id && profileNameMap?.[person.id]) {
        set.add(normalizeName(profileNameMap[person.id]));
      }

      if (person?.user_id && profileNameMap?.[person.user_id]) {
        set.add(normalizeName(profileNameMap[person.user_id]));
      }
    });

    return set;
  }

  const activeStudentNames = activeNameSet(activeStudents);
  const activeUpperLevelNames = activeNameSet(activeUpperLevels);

  function mergeActiveIntoOptions(options, activeList) {
    const names = new Set((options || []).filter(Boolean));

    (activeList || []).forEach((person) => {
      const displayName = getPersonDisplayName(person);
      if (displayName) names.add(displayName);
    });

    return [...names];
  }

  function sortActiveFirst(options, activeSet) {
    return [...(options || [])].sort((a, b) => {
      const aActive = activeSet.has(normalizeName(a));
      const bActive = activeSet.has(normalizeName(b));

      if (aActive !== bActive) return aActive ? -1 : 1;
      return String(a).localeCompare(String(b));
    });
  }

  const sortedStudentNameOptions = sortActiveFirst(
    mergeActiveIntoOptions(studentNameOptions, activeStudents),
    activeStudentNames
  );

  const sortedUpperLevelNameOptions = sortActiveFirst(
    mergeActiveIntoOptions(upperLevelNameOptions, activeUpperLevels),
    activeUpperLevelNames
  );


  function filterAssignmentOptions(options, value) {
    const query = normalizeName(value);
    if (!query) return options;

    return (options || []).filter((name) => normalizeName(name).includes(query));
  }

  function isRefillOnlyEncounter(encounter) {
  return (
    encounter?.visitType === "refill_only" ||
    encounter?.visit_type === "refill_only"
  );
}

function isSpecialtyOnlyEncounter(encounter) {
  return (
    encounter?.visitType === "specialty_only" ||
    encounter?.visit_type === "specialty_only"
  );
}

function getEncounterSpecialtyName(encounter) {
  const intakeData = encounter?.intakeData || encounter?.intake_data || {};
  const rawSpecialty =
    encounter?.specialtyType ||
    encounter?.specialty_type ||
    intakeData?.specialtyType ||
    intakeData?.specialty_type ||
    "";

  const specialtyMap = {
    ophthalmology: "Ophthalmology",
    ophtho: "Ophthalmology",
    pt: "PT",
    physical_therapy: "PT",
    "physical therapy": "PT",
    dermatology: "Dermatology",
    derm: "Dermatology",
    mental_health: "Mental Health",
    "mental health": "Mental Health",
    addiction_medicine: "Addiction Medicine",
    "addiction medicine": "Addiction Medicine",
    social_work: "Social Work",
    "social work": "Social Work",
  };

  const key = String(rawSpecialty).trim().toLowerCase();
  return specialtyMap[key] || rawSpecialty;
}

function getVisitReasonLabel(encounter) {
  const intakeData = encounter?.intakeData || encounter?.intake_data || {};
  const visitType =
    encounter?.visitType ||
    encounter?.visit_type ||
    intakeData?.visitType ||
    intakeData?.visit_type ||
    "general";
  const specialtyName = getEncounterSpecialtyName(encounter);

  if (visitType === "refill_only") return "Refill Only";
  if (visitType === "specialty_only") {
    return specialtyName ? `${specialtyName} Only` : "Specialty Only";
  }
  if (visitType === "both") {
    return specialtyName ? `General + ${specialtyName}` : "General + Specialty";
  }
  if (specialtyName) return `General + ${specialtyName}`;
  return "General";
}

function getVisitReasonBadgeClasses(encounter) {
  const intakeData = encounter?.intakeData || encounter?.intake_data || {};
  const visitType =
    encounter?.visitType ||
    encounter?.visit_type ||
    intakeData?.visitType ||
    intakeData?.visit_type ||
    "general";

  if (visitType === "refill_only") {
    return "bg-purple-100 text-purple-900 ring-purple-200";
  }
  if (visitType === "specialty_only") {
    return "bg-amber-100 text-amber-900 ring-amber-200";
  }
  if (visitType === "both" || getEncounterSpecialtyName(encounter)) {
    return "bg-indigo-100 text-indigo-900 ring-indigo-200";
  }
  return "bg-slate-100 text-slate-900 ring-slate-200";
}

function isPharmacyWorkflowEncounter(encounter) {
  return (
    isRefillOnlyEncounter(encounter) ||
    isSpecialtyOnlyEncounter(encounter)
  );
}

function getPharmacyStatusRank(encounter) {
  if (encounter?.pharmacyStatus === "meds_ready") return 0;
  if (encounter?.pharmacyStatus === "picked_up") return 3;
  if (encounter?.pharmacyStatus === "patient_sent") return 2;
  return 1;
}

function rowMatchesPharmacyStatusFilter(encounter) {
  const status = encounter?.pharmacyStatus || "waiting";

  if (pharmacyStatusFilter === "waiting") return status === "waiting";
  if (pharmacyStatusFilter === "ready") return status === "meds_ready";
  if (pharmacyStatusFilter === "sent") return status === "patient_sent";
  if (pharmacyStatusFilter === "picked_up") return status === "picked_up";

  return true;
}

const pharmacyRows = (waitingEncounterRows || []).filter(
  ({ patient, encounter }) =>
    rowMatchesQueueSearch(patient, encounter) &&
    rowMatchesPharmacyStatusFilter(encounter)
);

const sortedPharmacyRows = [...pharmacyRows].sort((a, b) => {
  const statusDiff = getPharmacyStatusRank(a.encounter) - getPharmacyStatusRank(b.encounter);
  if (statusDiff !== 0) return statusDiff;

  if (prioritizeRefillOnly) {
    const aRefillOnly = isRefillOnlyEncounter(a.encounter);
    const bRefillOnly = isRefillOnlyEncounter(b.encounter);

    if (aRefillOnly !== bRefillOnly) {
      return aRefillOnly ? -1 : 1;
    }
  }

  return new Date(a.encounter?.createdAt || 0) - new Date(b.encounter?.createdAt || 0);
});

const filteredWaitingEncounterRows = (waitingEncounterRows || []).filter(
  ({ patient, encounter }) => {
    if (isRefillOnlyEncounter(encounter) && !canUsePharmacyQueue) return false;
    if (isSpecialtyOnlyEncounter(encounter) && !canUseWholeClinicQueueTools && !canUsePharmacyQueue) return false;
    if (canUsePharmacyQueue && !rowMatchesPharmacyStatusFilter(encounter)) return false;

    return rowMatchesQueueSearch(patient, encounter);
  }
);

  const pharmacyReadyRows = (waitingEncounterRows || []).filter(
    ({ encounter }) => encounter?.pharmacyStatus === "meds_ready"
  );

  function getVisitSortRank(encounter) {
    const unassigned = !encounter?.assignedStudent && !encounter?.assignedUpperLevel;
    if (unassigned && !isGeneralVisitComplete(encounter)) return 0;
    if (encounter?.status === "in_visit" || encounter?.status === "roomed") return 1;
    if (isGeneralVisitComplete(encounter)) return 3;
    return 2;
  }

  const sortedFilteredWaitingEncounterRows = [...filteredWaitingEncounterRows].sort((a, b) => {
    if (canUsePharmacyQueue) {
      const aReady = a.encounter?.pharmacyStatus === "meds_ready";
      const bReady = b.encounter?.pharmacyStatus === "meds_ready";
      if (aReady !== bReady) return aReady ? -1 : 1;

      if (prioritizeRefillOnly) {
        const aRefillOnly = isRefillOnlyEncounter(a.encounter);
        const bRefillOnly = isRefillOnlyEncounter(b.encounter);
        if (aRefillOnly !== bRefillOnly) return aRefillOnly ? -1 : 1;
      }
    }

    if (canUseOphthoQueueTools && ophthoPriorityView) {
      const scoreDiff = getOphthoPriorityScore(b) - getOphthoPriorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
    }

    const rankDiff = getVisitSortRank(a.encounter) - getVisitSortRank(b.encounter);
    if (rankDiff !== 0) return rankDiff;

    return new Date(a.encounter?.createdAt || 0) - new Date(b.encounter?.createdAt || 0);
  });

  const unassignedRows =
    userRole === "leadership"
      ? sortedFilteredWaitingEncounterRows.filter(
        ({ encounter }) =>
          !encounter.assignedStudent && !encounter.assignedUpperLevel
      )
      : sortedFilteredWaitingEncounterRows;

  const assignedRows =
    userRole === "leadership"
      ? sortedFilteredWaitingEncounterRows.filter(
        ({ encounter }) =>
          encounter.assignedStudent || encounter.assignedUpperLevel
      )
      : [];
  if (userRole === "pharmacy") {
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {userRole === "undergraduate" ? "Undergrad Pharmacy Queue" : canRefill && userRole !== "pharmacy" ? "Refill / Pharmacy Queue" : "Pharmacy Medication Queue"}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-800">
              Pharmacy marks medications ready. Undergrad, refill, or pharmacy can mark pickup after delivery.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-80">
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic Date</label>
  <input
    type="date"
    value={selectedClinicDate || ""}
    onChange={(e) => setSelectedClinicDate?.(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
  />
  <input
    className="w-full rounded-lg border p-3"
    placeholder="Search by name, DOB, or daily card #"
    value={queueSearch}
    onChange={(e) => setQueueSearch(e.target.value)}
  />

  <label className="flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800">
    <input
      type="checkbox"
      checked={prioritizeRefillOnly}
      onChange={(e) => setPrioritizeRefillOnly(e.target.checked)}
      className="h-4 w-4"
    />
    Prioritize refill-only
  </label>

  <select
    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
    value={pharmacyStatusFilter}
    onChange={(e) => setPharmacyStatusFilter(e.target.value)}
  >
    <option value="all">All medication statuses</option>
    <option value="waiting">Waiting / Not Ready</option>
    <option value="ready">Medications Ready</option>
    <option value="sent">Patient Sent</option>
    <option value="picked_up">Medications Picked Up</option>
  </select>
</div>
        </div>

        {sortedPharmacyRows.length === 0 ? (
          <div className="px-5 py-6 text-slate-500">
            No patients currently waiting for pharmacy.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPharmacyRows.map(({ patient, encounter }) => (
              <div
                key={encounter.id}
                onClick={(e) => {
                  if (e.target.closest("button")) return;
                  openPatientChart(patient.id, encounter.id);
                }}
                className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-950">
                      {getDailyCardNumber(patient, encounter)
                        ? `#${getDailyCardNumber(patient, encounter)} — `
                        : ""}
                      {getFullQueuePatientName(patient)} ({patient.age || "—"})
                    </p>

                    <div className="flex flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                      >
                        {getStatusLabel(encounter.status, encounter.soapStatus)}
                      </span>
                      {pharmacyStatusBadge(encounter)}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-900">
                    {encounter.chiefComplaint || "No chief complaint"}
                  </p>

                  {isRefillOnlyEncounter(encounter) && getRefillMedicationRequest(encounter) && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
                      <span className="font-semibold">Refill request:</span>{" "}
                      {getRefillMedicationRequest(encounter)}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 text-xs font-medium text-slate-800">
                    <span>DOB: {formatDate(patient.dob)}</span>
                    <span>MRN: {patient.mrn || "—"}</span>
                    <span>Wait: {formatWaitTime(encounter.createdAt)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isRefillOnlyEncounter(encounter) && (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        Refill Only
                      </span>
                    )}

                    {isSpecialtyOnlyEncounter(encounter) && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Specialty Only
                      </span>
                    )}

                    {dualVisitBadge?.(encounter)}
                    {newReturningBadge?.(encounter)}
                    {priorityBadge?.(encounter)}
                    {spanishBadge?.(encounter)}
                    {htnBadge?.(encounter)}
                    {diabetesBadge?.(encounter)}
                    {fluBadge?.(encounter)}
                    {elevatorBadge?.(encounter)}
                    {papBadge?.(encounter)}
                  </div>

                  {!encounter?.pharmacyStatus || encounter?.pharmacyStatus === "waiting" ? (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onMarkMedicationsReady?.(encounter.id)}
                        className="min-h-[40px] flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Medications Ready
                      </button>
                    </div>
                  ) : null}

                  {encounter?.pharmacyStatus === "meds_ready" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onMarkMedicationsPickedUp?.(encounter.id)}
                        className="min-h-[40px] flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Medications Picked Up
                      </button>

                      <button
                        type="button"
                        onClick={() => onClearPharmacyStatus?.(encounter.id)}
                        className="min-h-[40px] rounded-lg bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                      >
                        Undo
                      </button>
                    </div>
                  )}

                  {encounter?.pharmacyStatus === "patient_sent" && (
                    <button
                      type="button"
                      onClick={() => onMarkMedicationsPickedUp?.(encounter.id)}
                      className="mt-2 min-h-[40px] w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Medications Picked Up
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      {canUsePharmacyQueue && pharmacyReadyRows.length > 0 && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-emerald-950 sm:text-lg">
                Medications Ready
              </h2>
              <p className="text-xs text-emerald-800 sm:text-sm">
                Patients ready for medication pickup/delivery. These also sort to the top of the queue below.
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
              {pharmacyReadyRows.length} ready
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {pharmacyReadyRows.map(({ patient, encounter }) => (
              <div
                key={encounter.id}
                className="flex flex-col gap-2 rounded-xl bg-white p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => openPatientChart(patient.id, encounter.id)}
                  className="min-w-0 text-left"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-slate-950">
                      {getCompactPatientLabel(patient, encounter)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${getVisitReasonBadgeClasses(encounter)}`}
                    >
                      {getVisitReasonLabel(encounter)}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    DOB: {formatDate(patient.dob)}
                  </div>
                </button>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onMarkPatientSentToPharmacy?.(encounter.id)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Patient Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkMedicationsPickedUp?.(encounter.id)}
                    className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Picked Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {userRole === "attending"
                ? "Awaiting Signature"
                : canUseOphthoQueueTools
                  ? "Ophtho Queue"
                  : canUseSocialWorkQueueTools
                    ? "Social Work Queue"
                    : userRole === "student" || userRole === "upper_level"
                    ? "My Queue"
                    : "Waiting Queue"}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {userRole === "attending"
                ? "Patients awaiting attending signature."
                : canUseOphthoQueueTools
                  ? "All clinic patients for the selected date except refill-only, including completed general visits. Use the checkbox to prioritize DM / HTN / Ophtho list."
                  : canUseSocialWorkQueueTools
                    ? "All clinic patients for the selected date except refill-only, including completed and in-visit patients."
                    : userRole === "student"
                    ? "Patients assigned to you that are still waiting."
                    : userRole === "upper_level"
                      ? "Patients assigned to you that are still waiting."
                      : "Bus/Public Transport patients are automatically shown first."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-80">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic Date</label>
            <input
              type="date"
              value={selectedClinicDate || ""}
              onChange={(e) => setSelectedClinicDate?.(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
            />

            <input
              className="w-full rounded-lg border p-3"
              placeholder="Search by name, DOB, or daily card #"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
            />

            {canUsePharmacyQueue && (
              <>
                <label className="flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800">
                  <input
                    type="checkbox"
                    checked={prioritizeRefillOnly}
                    onChange={(e) => setPrioritizeRefillOnly(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Prioritize refill-only
                </label>

                <select
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                  value={pharmacyStatusFilter}
                  onChange={(e) => setPharmacyStatusFilter(e.target.value)}
                >
                  <option value="all">All medication statuses</option>
                  <option value="waiting">Waiting / Not Ready</option>
                  <option value="ready">Medications Ready</option>
                  <option value="sent">Patient Sent</option>
                  <option value="picked_up">Medications Picked Up</option>
                </select>
              </>
            )}

            {canUseOphthoQueueTools && (
              <label className="flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800">
                <input
                  type="checkbox"
                  checked={ophthoPriorityView}
                  onChange={(e) => setOphthoPriorityView(e.target.checked)}
                  className="h-4 w-4"
                />
                Prioritize DM / HTN / Ophtho list
              </label>
            )}
          </div>
        </div>

        {canRefill && pendingRefills.length > 0 && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-lg font-semibold text-blue-700">
              Pending Refill Requests
            </h2>

            <div className="mt-3 space-y-2">
              {pendingRefills.map((req) => {
                const patient = getPatientFromRefill(req);
                const medication = getMedicationFromRefill(req);
                const payload = req.request_payload || null;

                const displayMedication = payload
                  ? {
                    name: payload.name || medication?.name || "",
                    dosage: payload.dosage || medication?.dosage || "",
                    frequency: payload.frequency || medication?.frequency || "",
                    route: payload.route || medication?.route || "",
                    dispenseAmount:
                      payload.dispenseAmount ?? medication?.dispenseAmount ?? "",
                    refillCount:
                      payload.refillCount ?? medication?.refillCount ?? "",
                    instructions:
                      payload.instructions || medication?.instructions || "",
                  }
                  : medication;

                const changedFields = payload
                  ? getChangedFields(medication, displayMedication)
                  : [];

                return (
                  <div
                    key={req.id}
                    className="rounded-lg border border-blue-100 bg-white p-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (patient) {
                          openPatientChart(patient.id);
                        }
                      }}
                      className="w-full text-left hover:bg-blue-50"
                    >
                      <div className="text-sm font-bold text-slate-950">
                        {patient ? getPatientBoardName(patient) : `Patient ${req.patient_id}`}
                      </div>

                      <div className="mt-1 text-sm font-medium text-slate-900">
                        Medication: {displayMedication?.name || req.medication_id}
                      </div>

                      {payload && (
                        <div className="mt-1 text-xs font-medium text-purple-600">
                          Updated refill details
                        </div>
                      )}

                      <div className="mt-1 text-xs font-medium text-slate-800">
                        Dosage: {displayMedication?.dosage || "—"} • Frequency: {displayMedication?.frequency || "—"}
                      </div>

                      <div className="mt-1 text-xs font-medium text-slate-800">
                        Dispense: {displayMedication?.dispenseAmount || "—"} • Refills: {displayMedication?.refillCount ?? "—"}
                      </div>

                      <div className="mt-1 text-xs font-medium text-slate-800">
                        Requested by: {profileNameMap?.[req.requested_by] || "Unknown User"}
                      </div>

                      {changedFields.length > 0 && (
                        <div className="mt-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                            Compare old vs new
                          </div>

                          <div className="mt-2 space-y-1">
                            {changedFields.map((field) => (
                              <div
                                key={field.label}
                                className="text-xs text-slate-600"
                              >
                                <span className="font-medium text-slate-700">{field.label}:</span>{" "}
                                <span className="text-slate-800 font-medium">{field.before}</span>{" "}
                                <span className="font-semibold text-purple-700">→</span>{" "}
                                <span className="text-slate-800">{field.after}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {userRole === "attending" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveRefillAsSignedInAttending(req);
                          }}
                          disabled={directApproveBusyId === req.id}
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {directApproveBusyId === req.id ? "Approving..." : "Approve Refill"}
                        </button>
                      ) : canRefill ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openApproveRefillModal(req);
                          }}
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          Approve Refill
                        </button>
                      ) : null}

                      {canRefill && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRefillRequest(req);
                          }}
                          disabled={deleteRefillBusyId === req.id}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deleteRefillBusyId === req.id ? "Removing..." : "Remove Request"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {userRole === "leadership" && unassignedRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-amber-800 shadow-sm">
            Awaiting Assignment
          </div>
        )}
        {(userRole === "leadership" ? unassignedRows : sortedFilteredWaitingEncounterRows).map(
          ({ patient, encounter }) => (
            <div
              key={encounter.id}
              onClick={(e) => {
                if (e.target.closest("select, input, button")) return;
                openPatientChart(patient.id, encounter.id);
              }}
              className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex flex-col gap-2">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-950">
                    {getDailyCardNumber(patient, encounter)
                      ? `#${getDailyCardNumber(patient, encounter)} — `
                      : ""}
                    {getFullQueuePatientName(patient)} ({patient.age})
                  </p>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                  >
                    {getStatusLabel(encounter.status, encounter.soapStatus)}
                  </span>
                </div>

                {/* Chief complaint */}
                <p className="text-sm font-medium text-slate-900">
                  {encounter.chiefComplaint || "No chief complaint"}
                </p>

                {isRefillOnlyEncounter(encounter) && getRefillMedicationRequest(encounter) && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
                    <span className="font-semibold">Requested refill(s):</span>{" "}
                    <span className="whitespace-pre-wrap">{getRefillMedicationRequest(encounter)}</span>
                  </div>
                )}

                {getLeadershipQueueNotes(encounter) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    <span className="font-semibold">Leadership note:</span>{" "}
                    <span className="line-clamp-2">
                      {getLeadershipQueueNotes(encounter)}
                    </span>
                  </div>
                )}

                {/* Secondary info */}
                <div className="flex flex-wrap gap-x-3 text-xs font-medium text-slate-800">
  <span>DOB: {formatDate(patient.dob)}</span>
  <span>MRN: {patient.mrn || "—"}</span>
  <span>Wait: {formatWaitTime(encounter.createdAt)}</span>
</div>

                {/* Assignment info */}
                <p className="text-xs font-medium text-slate-800">
                  Student: {encounter.assignedStudent || "—"} • Upper: {encounter.assignedUpperLevel || "—"}
                  {encounter.skipUpperLevel ? " • Skip Upper Approved" : ""}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {dualVisitBadge?.(encounter)}
                  {newReturningBadge?.(encounter)}
                  {getDailyCardNumber(patient, encounter) && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      Daily #{getDailyCardNumber(patient, encounter)}
                    </span>
                  )}
                  {priorityBadge(encounter)}
                  {spanishBadge(encounter)}
                  {htnBadge?.(encounter)}
                  {diabetesBadge?.(encounter)}
                  {isPatientOnOphthoList(patient, encounter) && (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                      Ophtho List
                    </span>
                  )}
                  {canUseSocialWorkQueueTools && isPatientOnActivePap(patient) && (
                    <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                      Patient Assistance Program
                    </span>
                  )}
                  {canUseWholeClinicQueueTools && isGeneralVisitComplete(encounter) && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Completed Visit
                    </span>
                  )}
                  {fluBadge?.(encounter)}
                  {elevatorBadge(encounter)}
                  {papBadge?.(encounter)}
                </div>

{canMarkMedicationsReady && !encounter?.pharmacyStatus && (
  <button
    type="button"
    onClick={() => onMarkMedicationsReady?.(encounter.id)}
    className="mt-2 min-h-[40px] rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
  >
    Medications Ready
  </button>
)}

{canMarkMedicationsPickedUp &&
  encounter?.pharmacyStatus !== "picked_up" &&
  (canBypassPharmacyReadyForPickup ||
    encounter?.pharmacyStatus === "meds_ready" ||
    encounter?.pharmacyStatus === "patient_sent") && (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => onMarkMedicationsPickedUp?.(encounter.id)}
        className="min-h-[40px] flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Medications Picked Up
      </button>

      {canMarkMedicationsReady && encounter?.pharmacyStatus === "meds_ready" && (
        <button
          type="button"
          onClick={() => onClearPharmacyStatus?.(encounter.id)}
          className="min-h-[40px] rounded-lg bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          Undo Medication Status
        </button>
      )}
    </div>
)}

{canMarkMedicationsPickedUp &&
  encounter?.pharmacyStatus === "picked_up" && (
    <div className="mt-2 flex gap-2">
      <div className="min-h-[40px] flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
        Medications Picked Up
      </div>

      {canMarkMedicationsReady && (
        <button
          type="button"
          onClick={() => onMarkMedicationsReady?.(encounter.id)}
          className="min-h-[40px] rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Meds Ready Again
        </button>
      )}
    </div>
)}

                {/* Leadership controls */}
                {userRole === "leadership" && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Student
                      </label>

                      <div className="relative">
                        <input
                          className={`min-h-[40px] w-full rounded-lg px-3 py-2 text-sm ${activeStudentNames.has(
                            normalizeName(getDraftValue(encounter, "assignedStudent"))
                          )
                            ? "border-green-500 bg-green-50 text-green-800 font-semibold"
                            : "border-slate-300"
                            }`}
                          value={getDraftValue(encounter, "assignedStudent")}
                          onChange={(e) => {
                            updateDraft(encounter.id, "assignedStudent", e.target.value);
                            setOpenAssignmentMenu(`${encounter.id}-student`);
                          }}
                          onFocus={() => setOpenAssignmentMenu(`${encounter.id}-student`)}
                          onBlur={() => {
                            setTimeout(() => setOpenAssignmentMenu(null), 150);
                          }}
                          placeholder="Student name"
                        />

                        {openAssignmentMenu === `${encounter.id}-student` && (
                          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                            {filterAssignmentOptions(
                              sortedStudentNameOptions,
                              getDraftValue(encounter, "assignedStudent")
                            ).map((name) => {
                              const isActive = activeStudentNames.has(normalizeName(name));
                              const isSelected =
                                normalizeName(getDraftValue(encounter, "assignedStudent")) ===
                                normalizeName(name);

                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    updateDraft(encounter.id, "assignedStudent", name);
                                    setOpenAssignmentMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${isSelected ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700"
                                    }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? "bg-green-500" : "bg-slate-300"
                                        }`}
                                    />
                                    <span className="truncate">{name}</span>
                                  </span>

                                  {isActive && (
                                    <span className="shrink-0 text-[11px] font-medium text-green-700">
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Active Today: {activeStudents?.length || 0}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Upper Level
                      </label>

                      <div className="relative">
                        <input
                          className={`min-h-[40px] w-full rounded-lg px-3 py-2 text-sm ${activeUpperLevelNames.has(
                            normalizeName(getDraftValue(encounter, "assignedUpperLevel"))
                          )
                            ? "border-green-500 bg-green-50 text-green-800 font-semibold"
                            : "border-slate-300"
                            }`}
                          value={getDraftValue(encounter, "assignedUpperLevel")}
                          onChange={(e) => {
                            updateDraft(encounter.id, "assignedUpperLevel", e.target.value);
                            setOpenAssignmentMenu(`${encounter.id}-upper`);
                          }}
                          onFocus={() => setOpenAssignmentMenu(`${encounter.id}-upper`)}
                          onBlur={() => {
                            setTimeout(() => setOpenAssignmentMenu(null), 150);
                          }}
                          placeholder="Upper level name"
                        />

                        {openAssignmentMenu === `${encounter.id}-upper` && (
                          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                            {filterAssignmentOptions(
                              sortedUpperLevelNameOptions,
                              getDraftValue(encounter, "assignedUpperLevel")
                            ).map((name) => {
                              const isActive = activeUpperLevelNames.has(normalizeName(name));
                              const isSelected =
                                normalizeName(getDraftValue(encounter, "assignedUpperLevel")) ===
                                normalizeName(name);

                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    updateDraft(encounter.id, "assignedUpperLevel", name);
                                    setOpenAssignmentMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${isSelected ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700"
                                    }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? "bg-green-500" : "bg-slate-300"
                                        }`}
                                    />
                                    <span className="truncate">{name}</span>
                                  </span>

                                  {isActive && (
                                    <span className="shrink-0 text-[11px] font-medium text-green-700">
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Active Today: {activeUpperLevels?.length || 0}
                      </p>
                    </div>

                    <select
  className={`min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm font-medium ${getSelectedRoomQueueClass(
    encounter
  )}`}
  value={getDraftValue(encounter, "roomNumber")}
  onChange={(e) =>
    updateDraft(encounter.id, "roomNumber", e.target.value)
  }
>
  <option value="">Room</option>
  {ROOM_OPTIONS.map((room) => {
    const roomDisplay = getRoomQueueDisplay(room, encounter);

    return (
      <option
        key={room.number}
        value={room.number}
        className={roomDisplay.optionClass}
      >
        {(room.displayLabel || `${room.label} — ${room.area}`) +
          ` (${roomDisplay.label})`}
      </option>
    );
  })}
</select>



                    <button
                      type="button"
                      onClick={() => submitDraft(encounter)}
                      className="min-h-[40px] rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Assign / Start
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

        {sortedFilteredWaitingEncounterRows.length === 0 && (
          <div className="px-5 py-6 text-slate-500">
            No patients currently waiting.
          </div>
        )}
        {userRole === "leadership" && assignedRows.length > 0 && (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-800 shadow-sm">
              Already Assigned / In Progress
            </div>

            {assignedRows.map(({ patient, encounter }) => (
              <div
                key={encounter.id}
                onClick={(e) => {
                  if (e.target.closest("select, input, button")) return;
                  openPatientChart(patient.id, encounter.id);
                }}
                className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-950">
                      {getDailyCardNumber(patient, encounter)
                        ? `#${getDailyCardNumber(patient, encounter)} — `
                        : ""}
                      {getFullQueuePatientName(patient)} ({patient.age})
                    </p>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                    >
                      {getStatusLabel(encounter.status, encounter.soapStatus)}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-900">
                    {encounter.chiefComplaint || "No chief complaint"}
                  </p>
                  {getLeadershipQueueNotes(encounter) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      <span className="font-semibold">Leadership note:</span>{" "}
                      <span className="line-clamp-2">
                        {getLeadershipQueueNotes(encounter)}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 text-xs font-medium text-slate-800">
  <span>DOB: {formatDate(patient.dob)}</span>
  <span>MRN: {patient.mrn || "—"}</span>
  <span>Wait: {formatWaitTime(encounter.createdAt)}</span>
</div>

                  <p className="text-xs font-medium text-slate-800">
                    Student: {encounter.assignedStudent || "—"} • Upper: {encounter.assignedUpperLevel || "—"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {dualVisitBadge(encounter)}
                    {newReturningBadge?.(encounter)}
                    {getDailyCardNumber(patient, encounter) && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        Daily #{getDailyCardNumber(patient, encounter)}
                      </span>
                    )}
                    {priorityBadge(encounter)}
                    {spanishBadge(encounter)}
                    {htnBadge?.(encounter)}
                    {diabetesBadge?.(encounter)}
                    {isPatientOnOphthoList(patient, encounter) && (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                        Ophtho List
                      </span>
                    )}
                    {fluBadge?.(encounter)}
                    {elevatorBadge(encounter)}
                    {papBadge?.(encounter)}
                    <div className="flex flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                      >
                        {getStatusLabel(encounter.status, encounter.soapStatus)}
                      </span>
                      {pharmacyStatusBadge(encounter)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {showRefillApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Approve Refill
            </h3>

            <p className="mt-2 text-sm font-medium text-slate-900">
              Select the attending and enter the 4-digit PIN to approve this refill request.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Attending
                </label>
                <select
                  value={selectedAttendingId}
                  onChange={(e) => setSelectedAttendingId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-3 text-sm"
                >
                  <option value="">Select attending</option>
                  {(activeAttendings || []).map((attending) => (
                    <option key={attending.id} value={attending.id}>
                      {attending.full_name || "Unnamed Attending"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  4-digit PIN
                </label>
                <input
                  id="refill-approval-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  name="one-time-code"
                  value={refillPin}
                  onChange={(e) =>
                    setRefillPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onPaste={(e) => e.preventDefault()}
                  placeholder="Enter PIN"
                />
              </div>

              {refillApproveMessage ? (
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {refillApproveMessage}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefillApproveModal(false);
                    setSelectedRefillRequest(null);
                    setSelectedAttendingId("");
                    setRefillPin("");
                    setRefillApproveMessage("");
                  }}
                  className="flex-1 rounded-lg bg-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitRefillApproval}
                  disabled={refillApproveBusy || !selectedAttendingId || refillPin.length !== 4}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refillApproveBusy ? "Approving..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}