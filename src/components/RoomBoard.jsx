import { useEffect, useState } from "react";
import { getStatusLabel } from "../utils";
import { VISIT_TYPE_BADGE_STYLES, getEncounterVisitTypeKey } from "../constants";

function normalizeName(value) {
  return (value || "").trim();
}

function isVisibleOnBoard(encounter) {
  if (!encounter) return false;
  if (!encounter.roomNumber) return false;

  // keep signed out (optional — you can remove this later if needed)
  if (encounter.soapStatus === "signed") return false;

  return (
    encounter.status === "roomed" ||
    encounter.status === "in_visit" ||
    encounter.status === "ready" ||
    encounter.status === "done" // ✅ ADD THIS
  );
}

function getEncounterTime(encounter) {
  return new Date(
    encounter?.createdAt ||
    encounter?.updatedAt ||
    encounter?.clinicDate ||
    0
  ).getTime();
}

function getRoomEncounterGroups(allEncounterRows, roomNumber) {
  const rows = (allEncounterRows || [])
    .filter(({ encounter }) => String(encounter?.roomNumber || "") === String(roomNumber))
    .filter(({ encounter }) => isVisibleOnBoard(encounter))
    .sort((a, b) => getEncounterTime(b.encounter) - getEncounterTime(a.encounter));

  if (rows.length === 0) return [];

  const groups = [];
  const seen = new Map();

  rows.forEach((row) => {
    const key = normalizeName(row.encounter?.assignedStudent) || "__unassigned__";

    if (!seen.has(key)) {
      const nextGroup = {
        key,
        assignedStudent: row.encounter?.assignedStudent || "",
        primary: row,
        history: [],
      };
      seen.set(key, nextGroup);
      groups.push(nextGroup);
      return;
    }

    seen.get(key).history.push(row);
  });

  return groups;
}

function getPrimarySlot(groups) {
  if (!groups.length) return null;

  const flattened = groups
    .map((group) => ({
      group,
      time: getEncounterTime(group.primary?.encounter),
    }))
    .sort((a, b) => b.time - a.time);

  return flattened[0]?.group || null;
}

export default function RoomBoard({
  ROOM_OPTIONS,
  selectedClinicDate,
  setSelectedClinicDate,
  canOpenCharts = true,
  roomMap,
  allEncounterRows,
  assignedCount,
  inVisitCount,
  getPatientBoardName,
  getStudentBoardName,
  spanishBadge,
  priorityBadge,
  newReturningBadge,
  diabetesBadge,
  htnBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  getStatusClasses,
  assignEncounterToRoom,
  selectedPatient,
  selectedEncounter,
  openPatientChart,
  isLeadershipView,
  SPECIALTY_ROOM_RULES,
  todayStaffRoster,
  onTodayStaffRosterChange,
  onTodayStaffRosterSave,
  specialtyNames,
  reservedRooms,
  tonightSpecialtyNames = [],
  tonightReservedRooms = [],
  boardMessage = null,
  savedBoardMessages = [],
  onDisplayBoardMessage,
  onClearBoardMessage,
  onSaveBoardMessageTemplate,
  onDeleteBoardMessageTemplate,
}) {
  const [messageDraft, setMessageDraft] = useState({
    title: "",
    body: "",
  });
  const [selectedSavedMessageId, setSelectedSavedMessageId] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");
  const [boardMessageExpanded, setBoardMessageExpanded] = useState(false);

  const activeSpecialtyNames = specialtyNames || tonightSpecialtyNames;
  const activeReservedRooms = reservedRooms || tonightReservedRooms;

  useEffect(() => {
    if (!boardMessage) return;

    setMessageDraft({
      title: boardMessage.title || "",
      body: boardMessage.body || "",
    });
  }, [boardMessage]);

  function getReservedSpecialtyForRoom(roomNumber) {
    return (activeReservedRooms || []).find(
      (reserved) => String(reserved.roomNumber) === String(roomNumber)
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {activeSpecialtyNames.length > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800 shadow-sm">
          Tonight’s Specialties: {tonightSpecialtyNames.join(", ")}
        </div>
      )}
      {isLeadershipView && (
  <div className="rounded-2xl bg-white p-3 shadow">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Room Board Date
        </p>
        <input
          type="date"
          value={selectedClinicDate || ""}
          onChange={(e) => setSelectedClinicDate?.(e.target.value)}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-500">Available</p>
          <p className="text-xl font-bold text-slate-900">
            {
              ROOM_OPTIONS.filter((room) => {
                const groups = getRoomEncounterGroups(allEncounterRows, room.number);
                return !groups.some(
                  (group) => group.primary?.encounter?.status !== "done"
                );
              }).length
            }
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-500">Waiting</p>
          <p className="text-xl font-bold text-slate-900">
            {(allEncounterRows || []).filter(
  ({ encounter }) =>
    (encounter.status === "started" ||
      encounter.status === "undergrad_complete" ||
      encounter.status === "ready") &&
    encounter.visitType !== "specialty_only" &&
    encounter.visitType !== "refill_only" &&
    encounter.soapStatus !== "signed"
).length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-500">Assigned</p>
          <p className="text-xl font-bold text-slate-900">{assignedCount}</p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-500">In Visit</p>
          <p className="text-xl font-bold text-slate-900">{inVisitCount}</p>
        </div>
      </div>
    </div>
  </div>
)}


      {isLeadershipView && (
        <div className="rounded-2xl bg-white p-3 shadow">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {[
              { key: "attendings", label: "Attendings here today", placeholder: "Dr. Prabhu, Dr. Bennett" },
              { key: "residents", label: "Residents here today", placeholder: "Resident names" },
              { key: "upperLevels", label: "Upper Levels here today", placeholder: "MS3/MS4 names" },
            ].map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {field.label}
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={todayStaffRoster?.[field.key] || ""}
                  onChange={(e) =>
                    onTodayStaffRosterChange?.((prev) => ({
                      ...(prev || {}),
                      [field.key]: e.target.value,
                    }))
                  }
                  onBlur={async (e) => {
                    const nextRoster = {
                      ...(todayStaffRoster || {}),
                      [field.key]: e.target.value,
                    };

                    onTodayStaffRosterChange?.(nextRoster);

                    try {
                      await onTodayStaffRosterSave?.(nextRoster);
                    } catch (error) {
                      console.error("Failed to save today staff roster:", error);
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {isLeadershipView && (
        <div className="rounded-2xl bg-white p-3 shadow">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => setBoardMessageExpanded((value) => !value)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Board Message
              </p>
              <p className="truncate text-sm text-slate-700">
                {boardMessage?.body
                  ? `${boardMessage.title ? `${boardMessage.title}: ` : ""}${boardMessage.body}`
                  : "No message currently showing."}
              </p>
            </button>

            <div className="flex flex-wrap gap-2">
              {boardMessage?.body ? (
                <button
                  type="button"
                  onClick={async () => {
                    setMessageBusy(true);
                    setMessageStatus("");
                    try {
                      await onClearBoardMessage?.();
                      setMessageStatus("Message cleared.");
                    } catch (error) {
                      console.error("Failed to clear board message:", error);
                      setMessageStatus(`Could not clear message: ${error.message}`);
                    } finally {
                      setMessageBusy(false);
                    }
                  }}
                  disabled={messageBusy}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear Message
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setBoardMessageExpanded((value) => !value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {boardMessageExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {messageStatus ? (
            <p className="mt-2 text-sm text-slate-600">{messageStatus}</p>
          ) : null}

          {boardMessageExpanded && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message Title
                </span>
                <input
                  value={messageDraft.title}
                  onChange={(event) =>
                    setMessageDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional title"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message
                </span>
                <textarea
                  value={messageDraft.body}
                  onChange={(event) =>
                    setMessageDraft((prev) => ({ ...prev, body: event.target.value }))
                  }
                  className="mt-1 h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Example: Please return all charts to leadership before leaving."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setMessageBusy(true);
                    setMessageStatus("");
                    try {
                      await onDisplayBoardMessage?.(messageDraft);
                      setMessageStatus("Message displayed.");
                    } catch (error) {
                      console.error("Failed to display board message:", error);
                      setMessageStatus(`Could not display message: ${error.message}`);
                    } finally {
                      setMessageBusy(false);
                    }
                  }}
                  disabled={messageBusy || !messageDraft.body.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Display Message
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setMessageBusy(true);
                    setMessageStatus("");
                    try {
                      await onSaveBoardMessageTemplate?.(messageDraft);
                      setMessageStatus("Saved for reuse.");
                    } catch (error) {
                      console.error("Failed to save board message:", error);
                      setMessageStatus(`Could not save message: ${error.message}`);
                    } finally {
                      setMessageBusy(false);
                    }
                  }}
                  disabled={messageBusy || !messageDraft.body.trim()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save for Reuse
                </button>
              </div>

            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reuse Saved Message
                </span>
                <select
                  value={selectedSavedMessageId}
                  onChange={(event) => {
                    const messageId = event.target.value;
                    setSelectedSavedMessageId(messageId);
                    const saved = savedBoardMessages.find((message) => message.id === messageId);
                    if (saved) {
                      setMessageDraft({
                        title: saved.title || "",
                        body: saved.body || "",
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose a saved message</option>
                  {savedBoardMessages.map((message) => (
                    <option key={message.id} value={message.id}>
                      {message.title || message.body.slice(0, 80)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedSavedMessageId ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setMessageBusy(true);
                      setMessageStatus("");
                      try {
                        await onDisplayBoardMessage?.(messageDraft);
                        setMessageStatus("Saved message displayed.");
                      } catch (error) {
                        console.error("Failed to display saved board message:", error);
                        setMessageStatus(`Could not display saved message: ${error.message}`);
                      } finally {
                        setMessageBusy(false);
                      }
                    }}
                    disabled={messageBusy || !messageDraft.body.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Display Saved Message
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Delete this saved board message?")) return;
                      setMessageBusy(true);
                      setMessageStatus("");
                      try {
                        await onDeleteBoardMessageTemplate?.(selectedSavedMessageId);
                        setSelectedSavedMessageId("");
                        setMessageStatus("Saved message deleted.");
                      } catch (error) {
                        console.error("Failed to delete saved board message:", error);
                        setMessageStatus(`Could not delete saved message: ${error.message}`);
                      } finally {
                        setMessageBusy(false);
                      }
                    }}
                    disabled={messageBusy}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete Saved
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                  {savedBoardMessages.length === 0
                    ? "No saved messages yet."
                    : "Pick a saved message to reuse it."}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      <div>
        <p className="text-sm text-slate-500">
          {isLeadershipView
            ? "Click an occupied room card to open that patient’s chart."
            : "Students can view room assignments here."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {ROOM_OPTIONS.map((room) => {
          const groups = getRoomEncounterGroups(allEncounterRows, room.number);
          const activeGroups = groups.filter(
            (group) => group.primary?.encounter?.status !== "done"
          );
          const primaryGroup = getPrimarySlot(activeGroups.length > 0 ? activeGroups : groups);
          const primaryRow = primaryGroup?.primary || null;
          const primaryEncounter = primaryRow?.encounter || null;
          const primaryPatient = primaryRow?.patient || null;
          const hasRoomHistory = Boolean(primaryEncounter);
          const occupied = activeGroups.length > 0;

          const reservedSpecialty = getReservedSpecialtyForRoom(room.number);

          const specialtyType = primaryEncounter?.specialtyType;
          const specialtyLabelMap = {
            pt: "Physical Therapy",
            dermatology: "Dermatology",
            ophthalmology: "Ophthalmology",
            mental_health: "Mental Health",
            addiction: "Addiction Medicine",
          };
          const isSpecialty = primaryEncounter?.visitType !== "general";
          const rules = SPECIALTY_ROOM_RULES?.[specialtyType];
          const isRestrictedRoom =
            rules?.allowedRooms?.length > 0 &&
            !rules.allowedRooms.includes(String(room.number));

          const grayRows = groups.flatMap((group) => {
            const rows = [];
            if (primaryGroup && group.key === primaryGroup.key) {
              rows.push(...group.history);
              return rows;
            }

            rows.push(group.primary, ...group.history);
            return rows;
          });

          return (
            <button
              key={room.number}
              type="button"
              disabled={!occupied || !canOpenCharts}
              onClick={() => {
                if (canOpenCharts && occupied && primaryPatient && primaryEncounter) {
                  openPatientChart(primaryPatient.id, primaryEncounter.id);
                }
              }}
              className={`min-h-[220px] rounded-2xl border p-3 text-left shadow transition ${hasRoomHistory
                ? primaryEncounter.status === "done"
                  ? "border-slate-300 bg-slate-100 opacity-70"
                  : primaryEncounter.status === "in_visit"
                    ? "border-blue-200 bg-blue-50"
                    : "border-yellow-200 bg-yellow-50"
                : reservedSpecialty
                  ? "border-violet-300 bg-violet-50 hover:bg-violet-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{room.label}</p>
                  <p className="text-xs text-slate-500">{room.area}</p>

                  {reservedSpecialty && (
                    <p className="mt-1 text-xs font-medium text-violet-700">
                      {reservedSpecialty.specialty || reservedSpecialty.label} Reserved
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${occupied
                    ? "bg-slate-200 text-slate-700"
                    : "bg-emerald-100 text-emerald-700"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {occupied ? "Occupied" : "Available"}
                </span>
              </div>

              {hasRoomHistory ? (
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {getPatientBoardName(primaryPatient)}
                    </p>

                    {isSpecialty && rules && rules.allowedRooms.length > 0 && isRestrictedRoom && (
                      <div className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Not preferred room for {rules.label}
                      </div>
                    )}

                    <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                      <p>
                        <span className="font-medium">Student:</span>{" "}
                        {getStudentBoardName(primaryEncounter.assignedStudent)}
                      </p>

                      {primaryEncounter.assignedUpperLevel && (
                        <p>
                          <span className="font-medium">Upper:</span>{" "}
                          {getStudentBoardName(primaryEncounter.assignedUpperLevel)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getEncounterVisitTypeKey(primaryEncounter) !== "general" && (
  <span
    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
      VISIT_TYPE_BADGE_STYLES[getEncounterVisitTypeKey(primaryEncounter)]?.badgeClass
    }`}
  >
    {VISIT_TYPE_BADGE_STYLES[getEncounterVisitTypeKey(primaryEncounter)]?.label}
  </span>
)}

                    {newReturningBadge?.(primaryEncounter)}
                    {priorityBadge(primaryEncounter)}
                    {spanishBadge(primaryEncounter)}
                    {htnBadge?.(primaryEncounter)}
                    {diabetesBadge?.(primaryEncounter)}
                    {fluBadge?.(primaryEncounter)}
                    {elevatorBadge(primaryEncounter)}
                    {papBadge?.(primaryEncounter)}
                  </div>

                  <div className="pt-1">
                    <span className={getStatusClasses(primaryEncounter.status)}>
                      {getStatusLabel(primaryEncounter.status, primaryEncounter.soapStatus)}
                    </span>
                  </div>

                  {grayRows.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {grayRows.slice(0, 3).map(({ patient, encounter }) => (
                        <div
                          key={encounter.id}
                          className="rounded-lg border border-slate-300 bg-slate-200/70 px-2.5 py-2 text-xs text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canOpenCharts) return;
                            openPatientChart(patient.id, encounter.id);
                          }}
                        >
                          <div className="font-medium text-slate-800">
                            {getPatientBoardName(patient)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            {encounter.assignedStudent ? (
                              <span>Student: {getStudentBoardName(encounter.assignedStudent)}</span>
                            ) : (
                              <span>SOAP pending</span>
                            )}

                            {encounter.assignedUpperLevel && (
                              <span>
                                {encounter.assignedStudent ? " • " : ""}
                                Upper: {getStudentBoardName(encounter.assignedUpperLevel)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {grayRows.length > 3 && (
                        <div className="rounded-lg border border-slate-300 bg-slate-200/70 px-2.5 py-2 text-xs text-slate-600">
                          +{grayRows.length - 3} more in this room
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[140px] items-center justify-center">
                  <p className="text-center text-sm text-slate-400">
                    No patient assigned
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
