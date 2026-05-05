import { getStatusLabel } from "../utils";

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
  tonightSpecialtyNames = [],
  tonightReservedRooms = [],
}) {

  function getReservedSpecialtyForRoom(roomNumber) {
    return (tonightReservedRooms || []).find(
      (reserved) => String(reserved.roomNumber) === String(roomNumber)
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {tonightSpecialtyNames.length > 0 && (
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

      <div>
        <p className="text-sm text-slate-500">
          {isLeadershipView
            ? selectedPatient && selectedEncounter
              ? `Current patient: ${getPatientBoardName(selectedPatient)}. Click any room below to assign or reassign.`
              : "Open a patient chart first, then come here to assign them to a room."
            : "Students can view room assignments here, but only leadership can change them."}
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
              disabled={isLeadershipView ? false : !occupied || !canOpenCharts}
              onClick={() => {
                if (selectedEncounter?.soapStatus === "signed") return;

                if (isLeadershipView && selectedPatient && selectedEncounter) {
                  const selectedSpecialtyType = selectedEncounter.specialtyType;
                  const selectedRules = SPECIALTY_ROOM_RULES?.[selectedSpecialtyType];

                  if (
                    selectedRules?.allowedRooms?.length > 0 &&
                    !selectedRules.allowedRooms.includes(String(room.number))
                  ) {
                    const confirmAssign = window.confirm(
                      `This room is not preferred for ${selectedRules.label}. Assign anyway?`
                    );
                    if (!confirmAssign) return;
                  }

                  assignEncounterToRoom(room.number);
                  return;
                }

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
                }`}
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
                    }`}
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
                    {primaryEncounter.visitType !== "general" && (
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                        {rules?.label ||
                          specialtyLabelMap[primaryEncounter.specialtyType] ||
                          "Specialty"}
                      </span>
                    )}

                    {primaryEncounter.visitType === "both" && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        Dual Visit
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
                    {isLeadershipView && selectedPatient && selectedEncounter
                      ? "Click to assign current patient"
                      : "No patient assigned"}
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
