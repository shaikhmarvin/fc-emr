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
}) {

  const [queueAssignmentDrafts, setQueueAssignmentDrafts] = useState({});

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

        <div className="space-y-4">
          {userRole === "leadership" && unassignedRows.length > 0 && (
            <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Unassigned / New Patients
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
                className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm hover:bg-slate-50"
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
                    <div className="mt-2 flex flex-col gap-2">
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm"
                        value={getDraftValue(encounter, "assignedStudent")}
                        onChange={(e) =>
                          updateDraft(encounter.id, "assignedStudent", e.target.value)
                        }
                      >
                        <option value="">Assign Student</option>
                        {studentNameOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm"
                        value={getDraftValue(encounter, "assignedUpperLevel")}
                        onChange={(e) =>
                          updateDraft(encounter.id, "assignedUpperLevel", e.target.value)
                        }
                      >
                        <option value="">Assign Upper</option>
                        {upperLevelNameOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm"
                        value={getDraftValue(encounter, "roomNumber")}
                        onChange={(e) =>
                          updateDraft(encounter.id, "roomNumber", e.target.value)
                        }
                      >
                        <option value="">Assign Room</option>
                        {ROOM_OPTIONS.map((room) => (
                          <option key={room.number} value={room.number}>
                            {room.displayLabel || `${room.label} — ${room.area}`}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => submitDraft(encounter)}
                        className="rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Assign / Start Visit
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
              <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assigned / In Progress
              </div>

              {assignedRows.map(({ patient, encounter }) => (
                <div
                  key={encounter.id}
                  onClick={(e) => {
                    if (e.target.closest("select, button")) return;
                    openPatientChart(patient.id, encounter.id);
                  }}
                  className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm hover:bg-slate-50"
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
      </div>
    </div>
  );
}