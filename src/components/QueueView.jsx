import { useState } from "react";
import { getStatusClasses, getStatusLabel } from "../utils";
export default function QueueView({
  userRole,
  searchForm,
  waitingEncounterRows,
  openPatientChart,
  getPatientBoardName,
  spanishBadge,
  priorityBadge,
  diabetesBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  formatWaitTime,
  studentNameOptions,
  upperLevelNameOptions,
  ROOM_OPTIONS,
  onAssignFromQueue,
  refillRequests,
  canRefill,
  patients,
  activeAttendings,
  onApproveRefillRequest,
  onApproveRefillAsSignedInAttending,
  profileNameMap,
  onDeleteRefillRequest,
}) {

  const [queueAssignmentDrafts, setQueueAssignmentDrafts] = useState({});
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
  function dualVisitBadge(encounter) {
    if (encounter.visitType === "both") {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
          Dual Visit
        </span>
      );
    }
    return null;
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

  function getRoomQueueLabel(room, encounter) {
    if (!room?.occupied) return "Available";
    if (roomMatchesDraftAssignment(room, encounter)) return "Same Student/Provider";
    return "In Use";
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

  const unassignedRows =
    userRole === "leadership"
      ? waitingEncounterRows.filter(
        ({ encounter }) =>
          !encounter.assignedStudent && !encounter.assignedUpperLevel
      )
      : waitingEncounterRows;

  const assignedRows =
    userRole === "leadership"
      ? waitingEncounterRows.filter(
        ({ encounter }) =>
          encounter.assignedStudent || encounter.assignedUpperLevel
      )
      : [];
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {userRole === "attending"
                ? "Awaiting Signature"
                : userRole === "student" || userRole === "upper_level"
                  ? "My Queue"
                  : "Waiting Queue"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {userRole === "attending"
                ? "Patients awaiting attending signature."
                : userRole === "student"
                  ? "Patients assigned to you that are still waiting."
                  : userRole === "upper_level"
                    ? "Patients assigned to you that are still waiting."
                    : "Bus/Public Transport patients are automatically shown first."}
            </p>
          </div>

          <input
            className="w-full rounded-lg border p-3 lg:w-80"
            placeholder="Search by MRN, first name, last name, DOB, last 4 SSN"
            value={`${searchForm.mrn} ${searchForm.firstName} ${searchForm.lastName} ${searchForm.last4ssn}`.trim()}
            readOnly
          />
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
                      <div className="text-sm font-semibold text-slate-800">
                        {patient ? getPatientBoardName(patient) : `Patient ${req.patient_id}`}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Medication: {displayMedication?.name || req.medication_id}
                      </div>

                      {payload && (
                        <div className="mt-1 text-xs font-medium text-purple-600">
                          Updated refill details
                        </div>
                      )}

                      <div className="mt-1 text-xs text-slate-500">
                        Dosage: {displayMedication?.dosage || "—"} • Frequency: {displayMedication?.frequency || "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Dispense: {displayMedication?.dispenseAmount || "—"} • Refills: {displayMedication?.refillCount ?? "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
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
                                <span className="text-slate-500">{field.before}</span>{" "}
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
        {(userRole === "leadership" ? unassignedRows : waitingEncounterRows).map(
          ({ patient, encounter }) => (
            <div
              key={encounter.id}
              onClick={(e) => {
                if (e.target.closest("select, button")) return;
                openPatientChart(patient.id, encounter.id);
              }}
              className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex flex-col gap-2">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {getPatientBoardName(patient)} ({patient.age})
                  </p>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                  >
                    {getStatusLabel(encounter.status, encounter.soapStatus)}
                  </span>
                </div>

                {/* Chief complaint */}
                <p className="text-sm text-slate-600">
                  {encounter.chiefComplaint || "No chief complaint"}
                </p>

                {/* Secondary info */}
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span>MRN: {patient.mrn || "—"}</span>
                  <span>Wait: {formatWaitTime(encounter.createdAt)}</span>
                </div>

                {/* Assignment info */}
                <p className="text-xs text-slate-500">
                  Student: {encounter.assignedStudent || "—"} • Upper: {encounter.assignedUpperLevel || "—"}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {dualVisitBadge(encounter)}
                  {priorityBadge(encounter)}
                  {spanishBadge(encounter)}
                  {diabetesBadge?.(encounter)}
                  {fluBadge?.(encounter)}
                  {elevatorBadge(encounter)}
                  {papBadge?.(encounter)}
                </div>

                {/* Leadership controls */}
                {userRole === "leadership" && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <select
                      className="min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm"
                      value={getDraftValue(encounter, "assignedStudent")}
                      onChange={(e) =>
                        updateDraft(encounter.id, "assignedStudent", e.target.value)
                      }
                    >
                      <option value="">Student</option>
                      {studentNameOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm"
                      value={getDraftValue(encounter, "assignedUpperLevel")}
                      onChange={(e) =>
                        updateDraft(encounter.id, "assignedUpperLevel", e.target.value)
                      }
                    >
                      <option value="">Upper Level</option>
                      {upperLevelNameOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm"
                      value={getDraftValue(encounter, "roomNumber")}
                      onChange={(e) =>
                        updateDraft(encounter.id, "roomNumber", e.target.value)
                      }
                    >
                      <option value="">Room</option>
                      {ROOM_OPTIONS.map((room) => (
                        <option key={room.number} value={room.number}>
                          {(room.displayLabel || `${room.label} — ${room.area}`) +
                            ` (${getRoomQueueLabel(room, encounter)})`}
                        </option>
                      ))}
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

        {waitingEncounterRows.length === 0 && (
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
                  if (e.target.closest("select, button")) return;
                  openPatientChart(patient.id, encounter.id);
                }}
                className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">
                      {getPatientBoardName(patient)} ({patient.age})
                    </p>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(encounter.status)}`}
                    >
                      {getStatusLabel(encounter.status, encounter.soapStatus)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    {encounter.chiefComplaint || "No chief complaint"}
                  </p>

                  <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>MRN: {patient.mrn || "—"}</span>
                    <span>Wait: {formatWaitTime(encounter.createdAt)}</span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Student: {encounter.assignedStudent || "—"} • Upper: {encounter.assignedUpperLevel || "—"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {dualVisitBadge(encounter)}
                    {priorityBadge(encounter)}
                    {spanishBadge(encounter)}
                    {diabetesBadge?.(encounter)}
                    {fluBadge?.(encounter)}
                    {elevatorBadge(encounter)}
                    {papBadge?.(encounter)}
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

            <p className="mt-2 text-sm text-slate-600">
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
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={refillPin}
                  onChange={(e) =>
                    setRefillPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-full rounded-lg border px-3 py-3 text-sm"
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