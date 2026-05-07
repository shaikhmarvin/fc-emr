import { useEffect, useState } from "react";
import { formatDate, getStatusLabel } from "../utils";
import { getClinicAlert } from "../utils/clinicAlerts";
import { fetchStaffRoster } from "../api/clinicStaffRoster";
import { supabase } from "../lib/supabase";

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

  const [displayRoster, setDisplayRoster] = useState({
    attendings: "",
    residents: "",
    upperLevels: "",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedClinicDate) return;

    let cancelled = false;

    setDisplayRoster({
      attendings: "",
      residents: "",
      upperLevels: "",
    });

    async function loadRoster() {
      const roster = await fetchStaffRoster(selectedClinicDate);
      if (!cancelled) {
        setDisplayRoster(roster);
      }
    }

    loadRoster();

    const channel = supabase
      .channel(`board_display_staff_roster_${selectedClinicDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_staff_roster",
          filter: `clinic_date=eq.${selectedClinicDate}`,
        },
        loadRoster
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedClinicDate]);

  const roster =
    todayStaffRoster?.attendings ||
      todayStaffRoster?.residents ||
      todayStaffRoster?.upperLevels
      ? todayStaffRoster
      : displayRoster;

  function getReservedSpecialtyForRoom(roomNumber) {
    return (tonightReservedRooms || []).find(
      (reserved) => String(reserved.roomNumber) === String(roomNumber)
    );
  }



  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900 p-3 text-white">
      <div className="mb-2 grid shrink-0 grid-cols-[minmax(210px,0.8fr)_minmax(360px,1.6fr)_minmax(260px,0.9fr)] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight xl:text-3xl">Free Clinic Room Board</h1>
          <p className="text-xs text-slate-300 xl:text-sm">Live Display</p>

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
                className={`mt-1 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight xl:text-xs ${colorMap[alert.level]}`}
              >
                {alert.message}
              </div>
            );
          })()}
        </div>

        <div className="min-w-0">
          {(roster.attendings || roster.residents || roster.upperLevels) && (
            <div className="grid grid-cols-3 gap-1.5 xl:gap-2">
              {[
                { label: "Attendings", value: roster.attendings },
                { label: "Residents / Fellows", value: roster.residents },
                { label: "MS III / IV", value: roster.upperLevels },
              ].map((section) => {
                const names = String(section.value || "")
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean);

                const maxNames = section.label === "MS III / IV" ? 12 : 8;

                return (
                  <div
                    key={section.label}
                    className="min-w-0 rounded-xl border border-slate-500 bg-slate-800/90 px-2 py-1.5 shadow xl:px-3 xl:py-2"
                  >
                    <div className="mb-1 border-b border-slate-500 pb-0.5 text-center text-[11px] font-extrabold leading-tight text-white xl:text-xs">
                      {section.label}
                    </div>

                    <div className="grid grid-cols-1 gap-x-2 gap-y-0.5 sm:[grid-template-columns:repeat(auto-fit,minmax(90px,1fr))]">
                      {names.slice(0, maxNames).map((name, idx) => (
                        <div
                          key={`${section.label}-${idx}`}
                          className="min-w-0 truncate text-[11px] font-bold leading-tight text-white xl:text-xs 2xl:text-sm"
                          title={name}
                        >
                          {idx + 1}. {name}
                        </div>
                      ))}
                    </div>

                    {names.length > maxNames && (
                      <div className="mt-0.5 text-[10px] font-semibold text-slate-300">
                        +{names.length - maxNames} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-start justify-end gap-2 xl:gap-3">
          {/* Info Panel */}
          <div className="min-w-0 rounded-xl bg-slate-800/85 px-3 py-2 text-slate-100 shadow xl:px-4 xl:py-3">
            <p className="mb-0.5 text-base font-bold text-white xl:mb-1 xl:text-lg">Connect Here</p>

            <p className="text-xs leading-5 xl:text-sm">
              <span className="font-semibold">Site:</span>{" "}
              <span className="break-all">{CLINIC_URL}</span>
            </p>

            <p className="text-xs leading-5 xl:text-sm">
              <span className="font-semibold">WiFi:</span> {WIFI_NAME}
            </p>

            <p className="text-xs leading-5 xl:text-sm">
              <span className="font-semibold">Password:</span> {WIFI_PASSWORD}
            </p>
          </div>

          {/* QR Code */}
          <div className="hidden rounded-xl bg-white p-1.5 shadow lg:block xl:p-2">
            <img src={QR_SRC} alt="QR Code" className="h-20 w-20 xl:h-24 xl:w-24" />
          </div>

          {/* Time */}
          <div className="shrink-0 text-right text-xs text-slate-300 xl:text-sm">
            {formatDate(now)}
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
                className={`min-h-[170px] rounded-2xl border p-2.5 shadow ${occupied
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
                  {reservedSpecialty && (
                    <div className="mt-0.5 rounded bg-violet-200 px-1 py-0.5 text-[10px] font-bold text-violet-900">
                      {(reservedSpecialty.specialty || reservedSpecialty.label)} Reserved
                    </div>
                  )}
                </div>

                {occupied ? (
                  <div className="space-y-1.5">
                    <p className="text-lg font-semibold leading-tight">
                      {getPatientBoardName(primaryPatient)}
                    </p>

                    <div className="space-y-0.5 text-sm">
  <p>
    <span className="font-semibold">Student:</span>{" "}
    {getStudentBoardName(primaryEncounter.assignedStudent)}
  </p>

  {primaryEncounter.assignedUpperLevel && (
    <p>
      <span className="font-semibold">Upper:</span>{" "}
      {getStudentBoardName(primaryEncounter.assignedUpperLevel)}
    </p>
  )}
</div>

                    <div className="flex flex-wrap gap-1">
                      {primaryEncounter.visitType === "both" && (
                        <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                          Dual Visit
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

<div className="mt-0.5 text-[11px] opacity-80">
  {encounter.assignedStudent ? `Student: ${getStudentBoardName(encounter.assignedStudent)}` : ""}
  {encounter.assignedUpperLevel
    ? `${encounter.assignedStudent ? " • " : ""}Upper: ${getStudentBoardName(encounter.assignedUpperLevel)}`
    : ""}
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
