import { useEffect, useMemo, useState } from "react";
import { formatDate, getStatusLabel } from "../utils";
import { getClinicAlert } from "../utils/clinicAlerts";
import { VISIT_TYPE_BADGE_STYLES, getEncounterVisitTypeKey } from "../constants";

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

function getAreaBadgeClasses(area) {
  const normalized = String(area || "").toLowerCase();
  if (normalized.includes("up")) {
    return "border-sky-300 bg-sky-200 text-sky-950";
  }
  if (normalized.includes("down")) {
    return "border-emerald-300 bg-emerald-200 text-emerald-950";
  }
  return "border-slate-300 bg-slate-200 text-slate-950";
}

function getAreaLabel(area) {
  const value = String(area || "").trim();
  if (!value) return "Area";
  return value
    .replace(/\s*\/\s*/g, " / ")
    .replace(/procedure room/i, "Procedure")
    .replace(/upstairs\s*\/\s*no pap/i, "Upstairs / No PAP")
    .replace(/downstairs/i, "Downstairs")
    .replace(/upstairs/i, "Upstairs");
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
  htnBadge,
  elevatorBadge,
  fluBadge,
  papBadge,
  getStatusClasses,
  todayStaffRoster,
  selectedClinicDate,
  tonightReservedRooms = [],
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const roster = useMemo(
    () =>
      todayStaffRoster || {
        attendings: "",
        residents: "",
        upperLevels: "",
      },
    [todayStaffRoster]
  );

  function getReservedSpecialtyForRoom(roomNumber) {
    return (tonightReservedRooms || []).find(
      (reserved) => String(reserved.roomNumber) === String(roomNumber)
    );
  }



  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900 p-2 text-white xl:p-3">
      <div className="mb-2 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-2 2xl:gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 2xl:gap-3">
            <div className="shrink-0 rounded-xl border border-slate-600 bg-slate-800/55 px-2.5 py-1.5 shadow">
              <h1 className="text-[clamp(1rem,1.25vw,1.45rem)] font-extrabold leading-tight">Free Clinic Board</h1>
              <p className="text-[0.7rem] font-semibold leading-tight text-slate-300 xl:text-xs">Live Display</p>
            </div>

            {(roster.attendings || roster.residents || roster.upperLevels) && (
              <div className="flex min-w-[360px] flex-1 flex-wrap justify-center gap-1.5 xl:gap-2">
                {[
                  { label: "Attendings", value: roster.attendings, tone: "text-sky-200" },
                  { label: "Residents / Fellows", value: roster.residents, tone: "text-violet-200" },
                  { label: "MS III / IV", value: roster.upperLevels, tone: "text-emerald-200" },
                ].map((section) => {
                  const names = String(section.value || "")
                    .split(",")
                    .map((name) => name.trim())
                    .filter(Boolean);

                  const maxNames = section.label === "MS III / IV" ? 15 : 10;
                  const compactNames = names.length > 6;
                  const veryCompactNames = names.length > 10;

                  return (
                    <div
                      key={section.label}
                      className="min-w-[12rem] flex-1 rounded-xl border border-slate-600 bg-slate-800/70 px-2 py-1.5 shadow"
                    >
                      <div className={`mb-1 border-b border-slate-600 pb-0.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wide leading-tight xl:text-[0.72rem] ${section.tone}`}>
                        {section.label}
                      </div>

                      <div className="grid grid-cols-3 justify-center gap-x-2 gap-y-0.5">
                        {names.slice(0, maxNames).map((name, idx) => (
                          <div
                            key={`${section.label}-${idx}`}
                            className={`whitespace-normal break-words text-center font-bold leading-tight text-white ${veryCompactNames ? "text-[0.62rem] xl:text-[0.7rem]" : compactNames ? "text-[0.7rem] xl:text-xs" : "text-xs xl:text-sm"}`}
                            title={name}
                          >
                            {idx + 1}. {name}
                          </div>
                        ))}
                      </div>

                      {names.length > maxNames && (
                        <div className="mt-0.5 text-center text-[10px] font-semibold text-slate-300">
                          +{names.length - maxNames} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex min-w-fit shrink-0 items-start justify-end gap-2 xl:gap-3">
            {/* Info Panel */}
            <div className="min-w-0 rounded-xl bg-slate-800/85 px-3 py-2 text-slate-100 shadow">
              <p className="mb-0.5 text-sm font-bold text-white xl:mb-1 xl:text-base">Connect Here</p>

              <p className="text-[0.68rem] leading-4 xl:text-xs">
                <span className="font-semibold">Site:</span>{" "}
                <span className="break-all">{CLINIC_URL}</span>
              </p>

              <p className="text-[0.68rem] leading-4 xl:text-xs">
                <span className="font-semibold">WiFi:</span> {WIFI_NAME}
              </p>

              <p className="text-[0.68rem] leading-4 xl:text-xs">
                <span className="font-semibold">Password:</span> {WIFI_PASSWORD}
              </p>
            </div>

            {/* QR Code */}
            <div className="hidden rounded-xl bg-white p-1.5 shadow lg:block">
              <img src={QR_SRC} alt="QR Code" className="h-20 w-20" />
            </div>

            {/* Time */}
            <div className="shrink-0 text-right text-xs text-slate-300 xl:text-sm">
              {formatDate(now)}
              <br />
              {now.toLocaleTimeString()}
            </div>
          </div>
        </div>

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
              className={`mt-1.5 rounded-lg border px-2 py-1 text-center text-xs font-extrabold leading-tight xl:text-sm ${colorMap[alert.level]}`}
            >
              {alert.message}
            </div>
          );
        })()}
      </div>

      <div className="mb-2 shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-center shadow">
        <p className="text-base font-extrabold text-amber-950 xl:text-lg">
          ⚠️ Please inform board when your room is CLEANED & EMPTY!
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <div
          className="grid h-full auto-rows-fr gap-2.5 xl:gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(clamp(220px, 18vw, 320px), 1fr))" }}
        >
          {ROOM_OPTIONS.map((room) => {
            const reservedSpecialty = getReservedSpecialtyForRoom(room.number);
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
                className={`flex min-h-[145px] flex-col overflow-hidden rounded-2xl border p-2.5 shadow xl:min-h-[158px] xl:p-3 ${occupied
                    ? primaryEncounter.status === "roomed"
                      ? "border-green-300 bg-green-100 text-slate-900"
                      : primaryEncounter.status === "in_visit"
                        ? "border-blue-300 bg-blue-100 text-slate-900"
                        : "border-yellow-300 bg-yellow-100 text-slate-900"
                    : "border-slate-700 bg-slate-800 text-white"
                  }`}
              >
                <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[clamp(1.25rem,1.65vw,1.95rem)] font-black leading-tight">{room.label}</p>
                  <div
                    className={`max-w-[48%] shrink-0 truncate rounded-full border px-1.5 py-0.5 text-center text-[clamp(0.6rem,0.75vw,0.82rem)] font-black uppercase tracking-wide ${getAreaBadgeClasses(
                      room.area
                    )}`}
                    title={room.area || "Area"}
                  >
                    {getAreaLabel(room.area)}
                  </div>
                </div>

                {reservedSpecialty && (
                  <div className="mb-1.5 truncate rounded bg-violet-200 px-2 py-0.5 text-xs font-extrabold text-violet-950" title={`${reservedSpecialty.specialty || reservedSpecialty.label} Reserved`}>
                    {(reservedSpecialty.specialty || reservedSpecialty.label)} Reserved
                  </div>
                )}

                {occupied ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                    <p className="truncate text-[clamp(1.65rem,2.15vw,2.65rem)] font-black leading-tight" title={getPatientBoardName(primaryPatient)}>
                      {getPatientBoardName(primaryPatient)}
                    </p>

                    <div className="space-y-1 rounded-lg px-0 py-0.5 text-slate-950">
                      <p className="flex min-w-0 items-baseline gap-1.5 leading-tight" title={getStudentBoardName(primaryEncounter.assignedStudent)}>
                        <span className="shrink-0 text-[clamp(0.78rem,0.9vw,1rem)] font-bold tracking-wide">Student:</span>
                        <span className="min-w-0 truncate text-[clamp(0.95rem,1.15vw,1.35rem)] font-semibold">{getStudentBoardName(primaryEncounter.assignedStudent)}</span>
                      </p>

                      {primaryEncounter.assignedUpperLevel && (
                        <p className="flex min-w-0 items-baseline gap-1.5 leading-tight" title={getStudentBoardName(primaryEncounter.assignedUpperLevel)}>
                          <span className="shrink-0 text-[clamp(0.78rem,0.9vw,1rem)] font-bold tracking-wide">Upper:</span>
                          <span className="min-w-0 truncate text-[clamp(0.95rem,1.15vw,1.35rem)] font-semibold">{getStudentBoardName(primaryEncounter.assignedUpperLevel)}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 overflow-hidden">
                      {getEncounterVisitTypeKey(primaryEncounter) !== "general" && (
  <span
    className={`rounded-full border px-2 py-0.5 text-xs font-extrabold ${
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
                      {diabetesBadge(primaryEncounter)}
                      {fluBadge?.(primaryEncounter)}
                      {elevatorBadge(primaryEncounter)}
                      {papBadge?.(primaryEncounter)}
                    </div>

                    <span
                      className={`inline-block self-start rounded-full border px-2 py-0.5 text-xs font-extrabold ${getStatusClasses(
                        primaryEncounter.status
                      )}`}
                    >
                      {getStatusLabel(primaryEncounter.status, primaryEncounter.soapStatus)}
                    </span>

                    {grayRows.length > 0 && (
                      <div className="mt-auto space-y-1 pt-1">
                        {grayRows.slice(0, 2).map(({ patient, encounter }) => (
                          <div
                            key={encounter.id}
                            className="rounded-lg bg-slate-500/25 px-2 py-1 text-sm font-bold text-slate-950"
                          >
                            <div className="truncate font-extrabold leading-tight">
  {getPatientBoardName(patient)}
</div>

<div className="mt-0.5 truncate text-xs font-bold opacity-90">
  {encounter.assignedStudent ? `Student: ${getStudentBoardName(encounter.assignedStudent)}` : ""}
  {encounter.assignedUpperLevel
    ? `${encounter.assignedStudent ? " • " : ""}Upper: ${getStudentBoardName(encounter.assignedUpperLevel)}`
    : ""}
</div>
                          </div>
                        ))}

                        {grayRows.length > 2 && (
                          <div className="rounded-lg bg-slate-500/25 px-2 py-1 text-sm font-bold text-slate-950">
                            +{grayRows.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center space-y-2 text-center">
                    <p className="text-[clamp(1.35rem,1.85vw,2rem)] font-black opacity-90">Available</p>
                    <p className="text-[clamp(0.9rem,1.1vw,1.15rem)] font-bold opacity-70">No patient assigned</p>
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
