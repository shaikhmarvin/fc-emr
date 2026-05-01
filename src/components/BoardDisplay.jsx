import { useEffect, useState } from "react";
import { getStatusLabel } from "../utils";
import { getClinicAlert } from "../utils/clinicAlerts";
import { fetchTodayStaffRoster } from "../api/clinicStaffRoster";
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
    let cancelled = false;

    async function loadRoster() {
      const roster = await fetchTodayStaffRoster();
      if (!cancelled) {
        setDisplayRoster(roster);
      }
    }

    loadRoster();

    const channel = supabase
      .channel("board_display_staff_roster")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_staff_roster",
        },
        loadRoster
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

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
      <div className="relative mb-2 flex min-h-[150px] items-start justify-between">
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

        <div className="absolute left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 px-4">
          {(roster.attendings || roster.residents || roster.upperLevels) && (
            <div className="mt-2 grid max-w-5xl grid-cols-3 gap-2">
              {[
                { label: "Attendings", value: roster.attendings },
                { label: "Residents / Fellows", value: roster.residents },
                { label: "MS III / IV", value: roster.upperLevels },
              ].map((section) => {
                const names = String(section.value || "")
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean);

                return (
                  <div
                    key={section.label}
                    className="rounded-xl border border-slate-500 bg-slate-800/90 px-3 py-2 shadow"
                  >
                    <div className="mb-1 border-b border-slate-500 pb-1 text-center text-sm font-extrabold text-white">
                      {section.label}
                    </div>

                    <div className="grid grid-cols-1 gap-0.5">
                      {names.slice(0, section.label === "MS III / IV" ? 8 : 5).map((name, idx) => (
                        <div
                          key={`${section.label}-${idx}`}
                          className="truncate text-base font-bold leading-tight text-white"
                        >
                          {idx + 1}. {name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
