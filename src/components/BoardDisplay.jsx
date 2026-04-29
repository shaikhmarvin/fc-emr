import { useEffect, useState } from "react";
import { getStatusLabel } from "../utils";
import { getClinicAlert } from "../utils/clinicAlerts";

const CLINIC_URL = "https://fc-emr.vercel.app/"; // CHANGE THIS
const WIFI_NAME = "Volunteers"; // CHANGE THIS
const WIFI_PASSWORD = "StarToast76"; // CHANGE THIS

const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
  CLINIC_URL
)}`;

function isVisibleOnBoard(encounter) {
  if (!encounter) return false;
  if (!encounter.roomNumber) return false;
  if (encounter.soapStatus === "signed") return false;
  return (
    encounter.status === "roomed" ||
    encounter.status === "in_visit" ||
    encounter.status === "ready"
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

function getRoomRows(allEncounterRows, roomNumber) {
  return (allEncounterRows || [])
    .filter(({ encounter }) => String(encounter?.roomNumber || "") === String(roomNumber))
    .filter(({ encounter }) => isVisibleOnBoard(encounter))
    .sort((a, b) => getEncounterTime(b.encounter) - getEncounterTime(a.encounter));
}

export default function BoardDisplay({
  ROOM_OPTIONS,
  roomMap,
  allEncounterRows,
  getPatientBoardName,
  getStudentBoardName,
  spanishBadge,
  priorityBadge,
  newReturningBadge,
  diabetesBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  getStatusClasses,
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900 p-3 text-white">
<div className="mb-2 flex items-start justify-between">
  <div>
    <h1 className="text-3xl font-bold">Free Clinic Room Board</h1>
    <p className="text-sm text-slate-300">Live Display</p>

{(() => {
  const alert = getClinicAlert(now);
  if (!alert) return null;

  const colorMap = {
    low: "bg-blue-100 text-blue-900 border-blue-300",
    medium: "bg-yellow-100 text-yellow-900 border-yellow-300",
    high: "bg-orange-100 text-orange-900 border-orange-300",
    critical: "bg-red-100 text-red-900 border-red-300",
  };

  return (
    <div
      className={`mt-1 rounded-lg border px-3 py-1 text-xs font-semibold ${colorMap[alert.level]}`}
    >
      {alert.message}
    </div>
  );
})()}
  </div>

  <div className="flex items-start gap-4">
    {/* Info Panel */}
    <div className="rounded-xl bg-slate-800/85 px-4 py-3 text-slate-100 shadow">
      <p className="mb-1 text-xl font-bold text-white">Connect Here</p>

      <p className="text-sm leading-6">
        <span className="font-semibold">Site:</span>{" "}
        <span className="break-all">{CLINIC_URL}</span>
      </p>

      <p className="text-sm leading-6">
        <span className="font-semibold">WiFi:</span> {WIFI_NAME}
      </p>

      <p className="text-sm leading-6">
        <span className="font-semibold">Password:</span> {WIFI_PASSWORD}
      </p>
    </div>

    {/* QR Code */}
    <div className="rounded-xl bg-white p-2 shadow">
      <img src={QR_SRC} alt="QR Code" className="h-24 w-24" />
    </div>

    {/* Time */}
    <div className="text-right text-sm text-slate-300">
      {now.toLocaleDateString()}
      <br />
      {now.toLocaleTimeString()}
    </div>
  </div>
</div>

<div className="mb-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-center shadow">
  <p className="text-sm font-bold text-amber-900">
    ⚠️ Please inform board when your room is CLEANED & EMPTY!
  </p>
</div>

      <div className="min-h-0 flex-1">
  <div className="grid h-full grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {ROOM_OPTIONS.map((room) => {
          const computedRows = getRoomRows(allEncounterRows, room.number);
          const fallbackRows =
            computedRows.length > 0
              ? computedRows
              : (() => {
                  const slot = roomMap?.[room.number];
                  if (
                    slot &&
                    slot.encounter &&
                    slot.encounter.status !== "done" &&
                    slot.encounter.soapStatus !== "signed"
                  ) {
                    return [slot];
                  }
                  return [];
                })();

          const rows = fallbackRows;
          const primaryRow = rows[0] || null;
          const primaryEncounter = primaryRow?.encounter || null;
          const primaryPatient = primaryRow?.patient || null;
          const occupied = Boolean(primaryEncounter);
          const grayRows = rows.slice(1);

          return (
            <div
              key={room.number}
              className={`min-h-[170px] rounded-2xl border p-2.5 shadow ${
                occupied
                  ? primaryEncounter.status === "roomed"
                    ? "border-green-300 bg-green-100 text-slate-900"
                    : primaryEncounter.status === "in_visit"
                    ? "border-blue-300 bg-blue-100 text-slate-900"
                    : "border-yellow-300 bg-yellow-100 text-slate-900"
                  : "border-slate-700 bg-slate-800 text-white"
              }`}
            >
              <div className="mb-2">
                <p className="text-xl font-bold">{room.label}</p>
                <p className="text-xs opacity-70">{room.area}</p>
              </div>

              {occupied ? (
                <div className="space-y-1.5">
                  <p className="text-lg font-semibold leading-tight">
                    {getPatientBoardName(primaryPatient)}
                  </p>

                  <p className="text-sm">
                    {getStudentBoardName(primaryEncounter.assignedStudent)}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {primaryEncounter.visitType === "both" && (
                      <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                        Dual Visit
                      </span>
                    )}

                    {newReturningBadge?.(primaryEncounter)}
                    {primaryEncounter.dailyNumber && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        #{primaryEncounter.dailyNumber}
                      </span>
                    )}
                    {priorityBadge(primaryEncounter)}
                    {spanishBadge(primaryEncounter)}
                    {diabetesBadge(primaryEncounter)}
                    {fluBadge?.(primaryEncounter)}
                    {elevatorBadge(primaryEncounter)}
                    {papBadge?.(primaryEncounter)}
                  </div>

                  <span
                    className={`inline-block rounded-full border px-2 py-1 text-xs ${getStatusClasses(
                      primaryEncounter.status
                    )}`}
                  >
                    {getStatusLabel(primaryEncounter.status, primaryEncounter.soapStatus)}
                  </span>

                  {grayRows.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {grayRows.slice(0, 2).map(({ patient, encounter }) => (
                        <div
                          key={encounter.id}
                          className="rounded-lg bg-slate-400/30 px-2 py-1.5 text-xs text-slate-800"
                        >
                          <div className="font-medium leading-tight">
                            {getPatientBoardName(patient)}
                          </div>
                        </div>
                      ))}

                      {grayRows.length > 2 && (
                        <div className="rounded-lg bg-slate-400/30 px-2 py-1.5 text-xs text-slate-800">
                          +{grayRows.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold opacity-80">Available</p>
                  <p className="text-xs opacity-60">No patient assigned</p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
