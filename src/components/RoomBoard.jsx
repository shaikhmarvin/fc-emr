import { getStatusLabel } from "../utils";
export default function RoomBoard({
  ROOM_OPTIONS,
  roomMap,
  allEncounterRows,
  assignedCount,
  inVisitCount,
  getPatientBoardName,
  getStudentBoardName,
  spanishBadge,
  priorityBadge,
  diabetesBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  getStatusClasses,
  assignEncounterToRoom,
  selectedPatient,
  selectedEncounter,
  openPatientChart,
  isLeadershipView,
}) {
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 shadow">
          <p className="text-sm text-slate-500">Available Rooms</p>
          <p className="mt-1 text-2xl font-bold">
            {
              ROOM_OPTIONS.filter(
                (room) =>
                  !roomMap[room.number] ||
                  roomMap[room.number]?.encounter.status === "done" ||
                  roomMap[room.number]?.encounter.soapStatus === "signed"
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow">
          <p className="text-sm text-slate-500">Awaiting Assignment</p>
          <p className="mt-1 text-2xl font-bold">
            {allEncounterRows.filter(
              ({ encounter }) =>
                (encounter.status === "started" ||
                  encounter.status === "undergrad_complete" ||
                  encounter.status === "ready") &&
                encounter.soapStatus !== "signed"
            ).length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow">
          <p className="text-sm text-slate-500">Assigned</p>
          <p className="mt-1 text-2xl font-bold">{assignedCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow">
          <p className="text-sm text-slate-500">In Visit</p>
          <p className="mt-1 text-2xl font-bold">{inVisitCount}</p>
        </div>
      </div>

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
          const slot = roomMap[room.number];
          const occupied =
            Boolean(slot) &&
            slot?.encounter?.status !== "done" &&
            slot?.encounter?.soapStatus !== "signed";

          return (
            <button
              key={room.number}
              type="button"
              disabled={isLeadershipView ? false : !occupied}
              onClick={() => {
                if (selectedEncounter?.soapStatus === "signed") return;

                if (isLeadershipView && selectedPatient && selectedEncounter) {
                  assignEncounterToRoom(room.number);
                  return;
                }

                if (occupied && slot?.patient && slot?.encounter) {
                  openPatientChart(slot.patient.id, slot.encounter.id);
                }
              }}
              className={`min-h-[180px] rounded-2xl border p-3 text-left shadow transition ${occupied
                  ? slot.encounter.status === "in_visit"
                    ? "border-blue-200 bg-blue-50"
                    : "border-yellow-200 bg-yellow-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {room.label}
                  </p>
                  <p className="text-xs text-slate-500">{room.area}</p>
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

              {occupied ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-800">
                    {getPatientBoardName(slot.patient)}
                  </p>

                  <p className="text-sm text-slate-600">
                    Student: {getStudentBoardName(slot.encounter.assignedStudent)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {priorityBadge(slot.encounter)}
                    {spanishBadge(slot.encounter)}
                    {diabetesBadge?.(slot.encounter)}
                     {fluBadge?.(slot.encounter)}
                    {elevatorBadge(slot.encounter)}
                    {papBadge?.(slot.encounter)}
                  </div>

                  <div className="pt-1">
                    <span className={getStatusClasses(slot.encounter.status)}>
                      {getStatusLabel(slot.encounter.status, slot.encounter.soapStatus)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-[110px] items-center justify-center">
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