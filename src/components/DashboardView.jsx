import { useState } from "react";
import PatientSearch from "./PatientSearch";
import PatientTable from "./PatientTable";
import { downloadSignedEncountersZip } from "../utils/pdfGenerator";
import logo from "../assets/free-clinic-logo.png";
import { formatDate } from "../utils";

export default function DashboardView({
  isLeadershipView,
  canViewAnalytics,
  canEditMrn,
  canEditUndergradFields,
  canEditAllPatientFields,
  canEditPatient,
  canDeletePatient,
  deletePatientCompletely,
  openPatientEditModal,
  dashboardSelectedPatient,
  selectedClinicDate,
  setSelectedClinicDate,
  filteredVisiblePatients,
  visibleEncounterRows,
  allEncounterRows,
  searchForm,
  setSearchForm,
  patientRecordsTitle,
  openPatientFromFilteredView,
  getFullPatientName,
  finalizeClinicDay,
}) {

  const pendingLabEncounters = allEncounterRows.filter(
    ({ encounter }) =>
      encounter.sendOutLabs?.ordered &&
      !encounter.sendOutLabs?.received
  );

  const notifyPatientEncounters = allEncounterRows.filter(
    ({ encounter }) =>
      encounter.sendOutLabs?.received &&
      !encounter.sendOutLabs?.patientNotified
  );

  const [showLabFollowUp, setShowLabFollowUp] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);

  const [showFinalizeReview, setShowFinalizeReview] = useState(false);

  const [finalizingClinicDay, setFinalizingClinicDay] = useState(false);

  const [finalizeMessage, setFinalizeMessage] = useState("");

  const [exportingRecords, setExportingRecords] = useState(false);

  async function handleExportSignedRecords() {
    try {
      setExportingRecords(true);

      const rowsForExport = allEncounterRows.filter(({ encounter }) => {
        if (!encounter) return false;
        if (!selectedClinicDate) {
          return encounter.soapStatus === "signed" || !!encounter.attendingSignedAt;
        }
        return (
          encounter.clinicDate === selectedClinicDate &&
          (encounter.soapStatus === "signed" || !!encounter.attendingSignedAt)
        );
      });

      await downloadSignedEncountersZip({
        rows: rowsForExport,
        logoSrc: logo,
        getFullPatientName,
      });
    } catch (error) {
      console.error("Failed to export signed records:", error);
      alert(error.message || "Failed to export signed records.");
    } finally {
      setExportingRecords(false);
    }
  }

  const labFollowUpCount =
    pendingLabEncounters.length + notifyPatientEncounters.length;

  function formatPhone(phone) {
    if (!phone) return "No phone on file";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) return phone;

    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  function toTime(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  function minutesBetween(start, end) {
    const startTime = toTime(start);
    const endTime = toTime(end);

    if (!startTime || !endTime || endTime < startTime) return null;

    return Math.round((endTime - startTime) / 60000);
  }

  function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) return "—";

    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) return `${hours} hr`;

    return `${hours} hr ${remainingMinutes} min`;
  }

  function averageMinutes(values) {
    const usableValues = values.filter(
      (value) => value !== null && value !== undefined && !Number.isNaN(value)
    );

    if (usableValues.length === 0) return null;

    return Math.round(
      usableValues.reduce((sum, value) => sum + value, 0) / usableValues.length
    );
  }

  function formatTime(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getAnalyticsRows() {
    const rows = selectedClinicDate ? visibleEncounterRows : allEncounterRows;

    return rows.filter(({ encounter }) => {
      if (!encounter) return false;
      if (!selectedClinicDate) return true;
      return encounter.clinicDate === selectedClinicDate;
    });
  }

  function getUniquePatientCount(rows) {
    return new Set(
      rows
        .map(({ patient }) => patient?.id)
        .filter(Boolean)
    ).size;
  }

  function getAverageFor(rows, startField, endField) {
    return averageMinutes(
      rows.map(({ encounter }) =>
        minutesBetween(encounter?.[startField], encounter?.[endField])
      )
    );
  }

  function getEncounterCompletionTime(encounter) {
    if (!encounter) return null;

    const visitType = encounter.visitType || encounter.visit_type;

    if (visitType === "refill_only") {
      return encounter.pharmacyPickedUpAt || encounter.pharmacy_picked_up_at || null;
    }

    return (
      encounter.pharmacyPickedUpAt ||
      encounter.pharmacy_picked_up_at ||
      encounter.visitCompletedAt ||
      encounter.visit_completed_at ||
      encounter.doneAt ||
      encounter.done_at ||
      null
    );
  }

  function isEncounterComplete(encounter) {
    if (!encounter) return false;

    if ((encounter.visitType || encounter.visit_type) === "refill_only") {
      const pharmacyStatus =
        encounter.pharmacyStatus || encounter.pharmacy_status;

      return Boolean(
        encounter.pharmacyPickedUpAt ||
        encounter.pharmacy_picked_up_at ||
        ["picked_up", "no_meds_needed", "meds_not_picked_up"].includes(
          pharmacyStatus
        )
      );
    }

    if (encounter.status === "done" || encounter.soapStatus === "signed") return true;
    return Boolean(getEncounterCompletionTime(encounter));
  }

  function getAverageToCompletion(rows, startField) {
    return averageMinutes(
      rows.map(({ encounter }) =>
        minutesBetween(encounter?.[startField], getEncounterCompletionTime(encounter))
      )
    );
  }

  function getLastCompletionTime(rows) {
    const times = rows
      .map(({ encounter }) => toTime(getEncounterCompletionTime(encounter)))
      .filter(Boolean);

    if (times.length === 0) return null;

    return new Date(Math.max(...times)).toISOString();
  }

  function getFirstMeaningfulStartTime(encounter) {
    return (
      encounter?.undergradCompletedAt ||
      encounter?.undergrad_completed_at ||
      encounter?.createdAt ||
      encounter?.created_at ||
      null
    );
  }

  function getAverageFromStartToCompletion(rows) {
    return averageMinutes(
      rows.map(({ encounter }) =>
        minutesBetween(getFirstMeaningfulStartTime(encounter), getEncounterCompletionTime(encounter))
      )
    );
  }

  function getFirstTime(rows, field) {
    const times = rows
      .map(({ encounter }) => toTime(encounter?.[field]))
      .filter(Boolean);

    if (times.length === 0) return null;

    return new Date(Math.min(...times)).toISOString();
  }

  function getLastTime(rows, field) {
    const times = rows
      .map(({ encounter }) => toTime(encounter?.[field]))
      .filter(Boolean);

    if (times.length === 0) return null;

    return new Date(Math.max(...times)).toISOString();
  }

  function getLastLabUpdate(rows) {
    const times = rows
      .flatMap(({ encounter }) => [
        toTime(encounter?.labCollectedAt),
        toTime(encounter?.labUnableAt),
      ])
      .filter(Boolean);

    if (times.length === 0) return null;

    return new Date(Math.max(...times)).toISOString();
  }

  function AnalyticsMetric({ label, value, subtext }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
      </div>
    );
  }

  function getVisitType(encounter) {
    return encounter?.visitType || encounter?.visit_type || "general";
  }

  function isGeneralClinicEncounter(encounter) {
    const visitType = getVisitType(encounter);
    return visitType === "general" || visitType === "both" || !visitType;
  }

  function isRefillOnlyEncounter(encounter) {
    return getVisitType(encounter) === "refill_only";
  }

  function getRefillCheckInStart(encounter) {
    return (
      encounter?.undergradCompletedAt ||
      encounter?.undergrad_completed_at ||
      encounter?.createdAt ||
      encounter?.created_at ||
      null
    );
  }

  const finalizeCandidateRows = visibleEncounterRows.filter(
    ({ encounter }) =>
      encounter &&
      encounter.status !== "cancelled" &&
      !isEncounterComplete(encounter)
  );

  const canOpenAnalyticsForSelectedDate =
    Boolean(selectedClinicDate) && finalizeCandidateRows.length === 0;

  const analyticsRows = showAnalytics ? getAnalyticsRows() : [];

  const generalAnalyticsRows = showAnalytics
    ? analyticsRows.filter(({ encounter }) => isGeneralClinicEncounter(encounter))
    : [];

  const refillOnlyAnalyticsRows = showAnalytics
    ? analyticsRows.filter(({ encounter }) => isRefillOnlyEncounter(encounter))
    : [];

  const completedRows = showAnalytics
    ? analyticsRows.filter(({ encounter }) => isEncounterComplete(encounter))
    : [];

  const activeRows = showAnalytics
    ? analyticsRows.filter(
      ({ encounter }) =>
        !isEncounterComplete(encounter) && encounter?.status !== "cancelled"
    )
    : [];

  const clinicFlowComplete = showAnalytics ? activeRows.length === 0 : false;

  const cancelledRows = showAnalytics
    ? analyticsRows.filter(({ encounter }) => encounter?.status === "cancelled")
    : [];

  const pharmacyRows = showAnalytics
    ? analyticsRows.filter(
      ({ encounter }) =>
        encounter?.pharmacyReadyAt || encounter?.pharmacyPickedUpAt
    )
    : [];

  const avgUndergradIntakeToUndergradComplete = showAnalytics
    ? getAverageFor(generalAnalyticsRows, "createdAt", "undergradCompletedAt")
    : null;

  const avgUndergradIntakeToLeadershipComplete = showAnalytics
    ? getAverageFor(generalAnalyticsRows, "createdAt", "leadershipIntakeCompletedAt")
    : null;

  const avgLeadershipCompleteToStudentAssigned = showAnalytics
    ? getAverageFor(
      generalAnalyticsRows,
      "leadershipIntakeCompletedAt",
      "studentAssignedAt"
    )
    : null;

  const avgAssignedToUpperLevelAssigned = showAnalytics
    ? getAverageFor(generalAnalyticsRows, "studentAssignedAt", "upperLevelAssignedAt")
    : null;

  const avgUpperLevelAssignedToComplete = showAnalytics
    ? getAverageToCompletion(generalAnalyticsRows, "upperLevelAssignedAt")
    : null;

  const avgGeneralAssignedToComplete = showAnalytics
    ? getAverageToCompletion(generalAnalyticsRows, "studentAssignedAt")
    : null;

  const avgRefillOnlyCheckInToPickup = showAnalytics
    ? averageMinutes(
      refillOnlyAnalyticsRows.map(({ encounter }) =>
        minutesBetween(getRefillCheckInStart(encounter), getEncounterCompletionTime(encounter))
      )
    )
    : null;

  const avgPharmacyReadyToPickup = showAnalytics
    ? getAverageFor(pharmacyRows, "pharmacyReadyAt", "pharmacyPickedUpAt")
    : null;

  const avgGeneralTotalClinicTime = showAnalytics
    ? averageMinutes(
      generalAnalyticsRows.map(({ encounter }) =>
        minutesBetween(
          encounter?.undergradCompletedAt,
          getEncounterCompletionTime(encounter)
        )
      )
    )
    : null;

  const avgGeneralVisitCompleteToMedsPickedUp = showAnalytics
    ? averageMinutes(
      generalAnalyticsRows.map(({ encounter }) =>
        minutesBetween(
          encounter?.visitCompletedAt,
          encounter?.pharmacyPickedUpAt
        )
      )
    )
    : null;

  const firstPatientStartedAt = showAnalytics
    ? getFirstTime(analyticsRows, "createdAt")
    : null;
  const lastVisitCompletedAt = showAnalytics
    ? getLastCompletionTime(analyticsRows)
    : null;
  const lastPharmacyPickupAt = showAnalytics
    ? getLastTime(analyticsRows, "pharmacyPickedUpAt")
    : null;
  const lastLabUpdateAt = showAnalytics ? getLastLabUpdate(analyticsRows) : null;

  async function handleFinalizeClinicDay() {
    if (!selectedClinicDate) {
      alert("Select a clinic date before finalizing the day.");
      return;
    }

    if (!finalizeClinicDay || finalizeCandidateRows.length === 0) return;

    const confirmed = window.confirm(
      `This will close ${finalizeCandidateRows.length} active encounter${finalizeCandidateRows.length === 1 ? "" : "s"
      } for ${formatDate(selectedClinicDate)} and then calculate the final analytics. Continue?`
    );

    if (!confirmed) return;

    try {
      setFinalizingClinicDay(true);
      setFinalizeMessage("");

      await finalizeClinicDay(finalizeCandidateRows);

      setShowFinalizeReview(false);
      setFinalizeMessage(
        `Finalized ${finalizeCandidateRows.length} active encounter${finalizeCandidateRows.length === 1 ? "" : "s"
        } for ${formatDate(selectedClinicDate)}.`
      );
      setShowAnalytics(true);
    } catch (error) {
      console.error("Failed to finalize clinic day:", error);
      alert(error.message || "Failed to finalize clinic day.");
    } finally {
      setFinalizingClinicDay(false);
    }
  }
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      {isLeadershipView && showFinalizeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Finalize Clinic Day
                </h2>
                <p className="text-sm text-slate-500">
                  Review active encounters before closing {formatDate(selectedClinicDate)}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFinalizeReview(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {finalizeCandidateRows.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                No active encounters need to be closed for this date. You can open analytics now.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This will set these encounters to complete for end-of-clinic reporting. Cancelled/LWOBS encounters are left unchanged.
                </div>

                <div className="max-h-80 divide-y overflow-y-auto rounded-xl border border-slate-200">
                  {finalizeCandidateRows.map(({ patient, encounter }) => (
                    <div
                      key={encounter.id}
                      className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getFullPatientName(patient)}
                        </p>
                        <p className="text-xs text-slate-500">
                          DOB: {formatDate(patient?.dob)} · Visit: {encounter?.visitType || "general"} · Status: {encounter?.status || "unknown"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        Will close
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowFinalizeReview(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalizeClinicDay}
                disabled={finalizingClinicDay || finalizeCandidateRows.length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {finalizingClinicDay ? "Finalizing..." : "Finalize and Calculate Analytics"}
              </button>
            </div>
          </div>
        </div>
      )}
      {canViewAnalytics && showAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  📈 Analytics
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedClinicDate
                    ? `Clinic date: ${formatDate(selectedClinicDate)}`
                    : "All clinic dates"}
                </p>
              </div>

              <button
                onClick={() => setShowAnalytics(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsMetric
                label="Unique Patients"
                value={getUniquePatientCount(analyticsRows)}
              />
              <AnalyticsMetric
                label="Completed Visits"
                value={completedRows.length}
              />
              <AnalyticsMetric
                label="Active Visits"
                value={activeRows.length}
              />
              <AnalyticsMetric
                label="LWOBS / Cancelled"
                value={cancelledRows.length}
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Clinic Flow Status
                  </h3>
                  <p className="text-sm text-slate-500">
                    Flow is complete when no same-day encounters are still active.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${clinicFlowComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                    }`}
                >
                  {clinicFlowComplete ? "Complete" : "Still Active"}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 font-semibold text-slate-900">
                Average Wait / Flow Times
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnalyticsMetric
                  label="Total Clinic Time"
                  value={formatMinutes(avgGeneralTotalClinicTime)}
                  subtext="General clinic: undergrad complete → visit complete or meds picked up"
                />
                <AnalyticsMetric
                  label="Started → Undergrad Complete"
                  value={formatMinutes(avgUndergradIntakeToUndergradComplete)}
                />
                <AnalyticsMetric
                  label="Started → Leadership Complete"
                  value={formatMinutes(avgUndergradIntakeToLeadershipComplete)}
                />
                <AnalyticsMetric
                  label="Leadership Complete → Student Assigned"
                  value={formatMinutes(avgLeadershipCompleteToStudentAssigned)}
                />
                <AnalyticsMetric
                  label="Assigned → Upper-Level Assigned"
                  value={formatMinutes(avgAssignedToUpperLevelAssigned)}
                />
                <AnalyticsMetric
                  label="Upper-Level Assigned → Complete"
                  value={formatMinutes(avgUpperLevelAssignedToComplete)}
                />
                <AnalyticsMetric
                  label="Assigned → Complete"
                  value={formatMinutes(avgGeneralAssignedToComplete)}
                  subtext="General clinic total visit time"
                />
                <AnalyticsMetric
                  label="Refill Check-In → Meds Picked Up"
                  value={formatMinutes(avgRefillOnlyCheckInToPickup)}
                  subtext="Refill-only wait time"
                />
                <AnalyticsMetric
                  label="Visit Complete → Meds Picked Up"
                  value={formatMinutes(avgGeneralVisitCompleteToMedsPickedUp)}
                  subtext="General clinic pharmacy delay after visit completion"
                />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 font-semibold text-slate-900">
                Clinic Milestones
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AnalyticsMetric
                  label="First Patient Started"
                  value={formatTime(firstPatientStartedAt)}
                />
                <AnalyticsMetric
                  label="Last Visit Complete"
                  value={formatTime(lastVisitCompletedAt)}
                />
                <AnalyticsMetric
                  label="Last Pharmacy Pickup"
                  value={formatTime(lastPharmacyPickupAt)}
                />
                <AnalyticsMetric
                  label="Last Lab Update"
                  value={formatTime(lastLabUpdateAt)}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Analytics only open after the selected clinic day has no active encounters. General clinic timing uses student assignment through completion as total visit time. Refill-only wait time uses check-in through medications picked up.
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="rounded-xl bg-white p-3 shadow">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                onClick={() => setSelectedClinicDate("")}
                className={`w-full rounded-lg border px-4 py-2 text-sm sm:w-auto ${selectedClinicDate === ""
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
                  }`}
              >
                All Dates
              </button>

              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Clinic Date
                </label>

                <input
                  type="date"
                  value={selectedClinicDate || ""}
                  onChange={(e) => setSelectedClinicDate(e.target.value)}
                  className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Showing:{" "}
            {selectedClinicDate
              ? `Clinic Date (${formatDate(selectedClinicDate)})`
              : "All Encounters"}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow sm:flex-row sm:items-center">
          {canViewAnalytics && canOpenAnalyticsForSelectedDate && (
            <button
              type="button"
              onClick={() => setShowAnalytics(true)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 sm:w-auto"
            >
              📊 Analytics
            </button>
          )}

          {isLeadershipView && selectedClinicDate && (
            <button
              type="button"
              onClick={() => {
                setFinalizeMessage("");
                setShowFinalizeReview(true);
              }}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:w-auto"
            >
              End Clinic / Finalize Day
            </button>
          )}

          {isLeadershipView && (
            <button
              type="button"
              onClick={handleExportSignedRecords}
              disabled={exportingRecords}
              className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {exportingRecords
                ? "Exporting..."
                : selectedClinicDate
                  ? "Export Records for Selected Date"
                  : "Export Signed Records"}
            </button>
          )}
        </div>
      </div>

      {finalizeMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {finalizeMessage}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Today&apos;s Clinic Snapshot
            </p>

            <div className="mt-2 flex items-end gap-3">
              <p className="text-5xl font-extrabold tracking-tight text-slate-900">
                {filteredVisiblePatients.length}
              </p>
              <p className="pb-2 text-lg font-semibold text-slate-600">
                Total Patients
              </p>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {selectedClinicDate ? formatDate(selectedClinicDate) : "All selected clinic dates"}
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">General</span>
                <span className="text-xl font-bold text-slate-900">
                  {
                    filteredVisiblePatients.filter((patient) => {
                      const encounters = visibleEncounterRows.filter(
                        ({ patient: rowPatient }) => rowPatient.id === patient.id
                      );

                      const hasGeneral = encounters.some(
                        ({ encounter }) => encounter?.visitType === "general"
                      );

                      const hasSpecialty = encounters.some(
                        ({ encounter }) => encounter?.visitType === "specialty_only"
                      );

                      return hasGeneral && !hasSpecialty;
                    }).length
                  }
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-amber-800">
                  General + Specialty
                </span>
                <span className="text-xl font-bold text-amber-900">
                  {
                    filteredVisiblePatients.filter((patient) => {
                      const encounters = visibleEncounterRows.filter(
                        ({ patient: rowPatient }) => rowPatient.id === patient.id
                      );

                      const hasGeneral = encounters.some(
                        ({ encounter }) => encounter?.visitType === "general"
                      );

                      const hasSpecialty = encounters.some(
                        ({ encounter }) => encounter?.visitType === "specialty_only"
                      );

                      return hasGeneral && hasSpecialty;
                    }).length
                  }
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-violet-800">
                  Specialty Only
                </span>
                <span className="text-xl font-bold text-violet-900">
                  {
                    filteredVisiblePatients.filter((patient) => {
                      const encounters = visibleEncounterRows.filter(
                        ({ patient: rowPatient }) => rowPatient.id === patient.id
                      );

                      const hasGeneral = encounters.some(
                        ({ encounter }) => encounter?.visitType === "general"
                      );

                      const hasSpecialty = encounters.some(
                        ({ encounter }) => encounter?.visitType === "specialty_only"
                      );

                      return !hasGeneral && hasSpecialty;
                    }).length
                  }
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-emerald-800">
                  Refill Only
                </span>
                <span className="text-xl font-bold text-emerald-900">
                  {
                    visibleEncounterRows.filter(
                      ({ encounter }) => encounter?.visitType === "refill_only"
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["Derm", "dermatology"],
              ["PT", "pt"],
              ["MH", "mental_health"],
              ["Addiction", "addiction"],
              ["Ophtho", "ophthalmology"],
            ].map(([label, key]) => {
              const count = visibleEncounterRows.filter(({ encounter }) => {
                const specialty = String(encounter?.specialtyType || "").toLowerCase();
                return specialty === key;
              }).length;

              return (
                <span
                  key={key}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {label} {count}
                </span>
              );
            })}

            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
              LWOBS{" "}
              {
                visibleEncounterRows.filter(
                  ({ encounter }) => encounter?.status === "cancelled"
                ).length
              }
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PatientSearch searchForm={searchForm} setSearchForm={setSearchForm} />

          {(canEditUndergradFields || canEditAllPatientFields) && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={openPatientEditModal}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                Edit Patient Info
              </button>

              {canDeletePatient && dashboardSelectedPatient && (
                <button
                  onClick={() => deletePatientCompletely(dashboardSelectedPatient.id)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete Patient
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow">
        <button
          onClick={() => setShowLabFollowUp((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Lab Follow-Up</h3>

            {labFollowUpCount > 0 ? (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                {labFollowUpCount}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                0
              </span>
            )}
          </div>

          <span className="text-sm text-slate-500">
            {showLabFollowUp ? "▲" : "▼"}
          </span>
        </button>

        {showLabFollowUp && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-yellow-700">
                Awaiting Results
              </h4>

              {pendingLabEncounters.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
              ) : (
                <div className="space-y-2">
                  {pendingLabEncounters.map(({ patient, encounter }) => (
                    <button
                      key={encounter.id}
                      onClick={() => openPatientFromFilteredView(patient.id, encounter.id)}
                      className="w-full rounded-lg border p-2 text-left hover:bg-yellow-50"
                    >
                      <p className="font-medium">{getFullPatientName(patient)}</p>
                      <p className="text-sm text-slate-600">
                        {formatPhone(patient.phone)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {encounter.sendOutLabs?.notes || "Send-out labs ordered"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-red-700">
                Notify Patient
              </h4>

              {notifyPatientEncounters.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
              ) : (
                <div className="space-y-2">
                  {notifyPatientEncounters.map(({ patient, encounter }) => (
                    <button
                      key={encounter.id}
                      onClick={() => openPatientFromFilteredView(patient.id, encounter.id)}
                      className="w-full rounded-lg border p-2 text-left hover:bg-red-50"
                    >
                      <p className="font-medium">{getFullPatientName(patient)}</p>
                      <p className="text-sm text-slate-600">
                        {formatPhone(patient.phone)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {encounter.sendOutLabs?.resultSummary || "Results received"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <PatientTable
        title={patientRecordsTitle}
        patients={filteredVisiblePatients}
        onSelectPatient={openPatientFromFilteredView}
        getFullPatientName={getFullPatientName}
        canEditMrn={canEditMrn}
        canEditPatient={canEditPatient}
        canDeletePatient={canDeletePatient}
        deletePatientCompletely={deletePatientCompletely}
        selectedPatientId={dashboardSelectedPatient?.id}
      />
    </div>
  );


}