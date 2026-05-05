import { useMemo, useState } from "react";

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

function getPatientDisplayName(patient, getFullPatientName) {
  return (
    getFullPatientName?.(patient) ||
    [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") ||
    patient?.preferredName ||
    patient?.name ||
    "Patient"
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function labTypeLabel(value) {
  switch (value) {
    case "in_house":
      return "In-house";
    case "out_of_house":
      return "Out-of-house";
    case "both":
      return "Both";
    case "not_needed":
      return "No labs";
    default:
      return "Not selected";
  }
}

function labStatusBadge(encounter) {
  const status = encounter?.labStatus || "none";

  if (status === "collected") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
        Collected
      </span>
    );
  }

  if (status === "unable_to_collect") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
        Unable to collect
      </span>
    );
  }

  if (status === "not_needed") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
        No labs
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
      Pending
    </span>
  );
}

export default function LabQueueView({
  labEncounterRows,
  openPatientChart,
  getFullPatientName,
  onUpdateLabTracking,
}) {
  const [queueSearch, setQueueSearch] = useState("");
  const [busyEncounterId, setBusyEncounterId] = useState(null);
  const [showCleared, setShowCleared] = useState(false);

  const visibleRows = useMemo(() => {
    const query = normalizeSearchText(queueSearch);

    return (labEncounterRows || []).filter(({ patient, encounter }) => {
      if (!showCleared && encounter?.labStatus === "not_needed") return false;

      if (!query) return true;

      const name = normalizeSearchText(getPatientDisplayName(patient, getFullPatientName));
      const dob = normalizeSearchText(patient?.dob);
      const card = normalizeSearchText(getDailyCardNumber(patient, encounter));
      const room = normalizeSearchText(encounter?.roomNumber || encounter?.room);

      return (
        name.includes(query) ||
        dob.includes(query) ||
        card.includes(query) ||
        room.includes(query)
      );
    });
  }, [labEncounterRows, queueSearch, showCleared, getFullPatientName]);

  async function updateLab(encounterId, updates) {
    try {
      setBusyEncounterId(encounterId);
      await onUpdateLabTracking?.(encounterId, updates);
    } finally {
      setBusyEncounterId(null);
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Lab Queue</h3>
            <p className="mt-1 text-sm text-slate-500">
              Today’s active patients only. Track specimen collection without requiring lab orders.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showCleared}
                onChange={(e) => setShowCleared(e.target.checked)}
              />
              Show cleared
            </label>

            <input
              className="w-full rounded-lg border p-3 lg:w-80"
              placeholder="Search by name, DOB, room, or daily card #"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
            />
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            No patients showing in the lab queue.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRows.map(({ patient, encounter }) => {
              const dailyCardNumber = getDailyCardNumber(patient, encounter);
              const busy = busyEncounterId === encounter.id;

              return (
                <div
                  key={encounter.id}
                  className="rounded-xl border bg-white p-3 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <button
                      type="button"
                      onClick={() => openPatientChart?.(patient.id, encounter.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {dailyCardNumber ? `#${dailyCardNumber} — ` : ""}
                          {getPatientDisplayName(patient, getFullPatientName)}
                        </p>
                        {labStatusBadge(encounter)}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>DOB: {patient?.dob || "—"}</span>
                        <span>Age: {patient?.age || "—"}</span>
                        <span>Sex: {patient?.sex || "—"}</span>
                        <span>Room: {encounter?.roomNumber || "—"}</span>
                        <span>Status: {encounter?.status || "—"}</span>
                      </div>

                      <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <span className="block font-semibold uppercase tracking-wide text-slate-400">Lab type</span>
                          {labTypeLabel(encounter?.labType)}
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <span className="block font-semibold uppercase tracking-wide text-slate-400">Collected</span>
                          {formatDateTime(encounter?.labCollectedAt)}
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <span className="block font-semibold uppercase tracking-wide text-slate-400">Unable</span>
                          {formatDateTime(encounter?.labUnableAt)}
                        </div>
                      </div>
                    </button>

                    <div className="flex w-full flex-col gap-2 lg:w-72">
                      <select
                        value={encounter?.labType || ""}
                        onChange={(e) =>
                          updateLab(encounter.id, {
                            labType: e.target.value,
                            labStatus: e.target.value === "not_needed" ? "not_needed" : encounter?.labStatus || "pending",
                          })
                        }
                        disabled={busy}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        <option value="">Select lab type</option>
                        <option value="in_house">In-house</option>
                        <option value="out_of_house">Out-of-house</option>
                        <option value="both">Both</option>
                        <option value="not_needed">No labs / clear from queue</option>
                      </select>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateLab(encounter.id, {
                              labStatus: "collected",
                              labCollectedAt: new Date().toISOString(),
                              labUnableAt: null,
                            })
                          }
                          className="min-h-[40px] rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Specimen Collected
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateLab(encounter.id, {
                              labStatus: "unable_to_collect",
                              labUnableAt: new Date().toISOString(),
                              labCollectedAt: null,
                            })
                          }
                          className="min-h-[40px] rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Unable to Collect
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          updateLab(encounter.id, {
                            labType: "not_needed",
                            labStatus: "not_needed",
                            labCollectedAt: null,
                            labUnableAt: null,
                          })
                        }
                        className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        No Labs / Clear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
