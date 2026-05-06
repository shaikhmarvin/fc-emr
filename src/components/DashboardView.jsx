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

  const analyticsRows = getAnalyticsRows();

  const completedRows = analyticsRows.filter(
    ({ encounter }) => encounter?.status === "done"
  );

  const activeRows = analyticsRows.filter(
    ({ encounter }) =>
      encounter?.status !== "done" && encounter?.status !== "cancelled"
  );

  const cancelledRows = analyticsRows.filter(
    ({ encounter }) => encounter?.status === "cancelled"
  );

  const pharmacyRows = analyticsRows.filter(
    ({ encounter }) => encounter?.pharmacyReadyAt || encounter?.pharmacyPickedUpAt
  );

  const clinicFlowComplete =
    analyticsRows.length > 0 &&
    activeRows.length === 0;

  const avgCreatedToUndergrad = getAverageFor(
    analyticsRows,
    "createdAt",
    "undergradCompletedAt"
  );

  const avgUndergradToStudentAssigned = getAverageFor(
    analyticsRows,
    "undergradCompletedAt",
    "studentAssignedAt"
  );

  const avgStudentToUpperAssigned = getAverageFor(
    analyticsRows,
    "studentAssignedAt",
    "upperLevelAssignedAt"
  );

  const avgStudentAssignedToDone = getAverageFor(
    analyticsRows,
    "studentAssignedAt",
    "doneAt"
  );

  const avgCreatedToDone = getAverageFor(
    analyticsRows,
    "createdAt",
    "doneAt"
  );

  const avgPharmacyReadyToPickup = getAverageFor(
    pharmacyRows,
    "pharmacyReadyAt",
    "pharmacyPickedUpAt"
  );

  const firstPatientStartedAt = getFirstTime(analyticsRows, "createdAt");
  const lastPatientAssignedAt = getLastTime(analyticsRows, "studentAssignedAt");
  const lastUpperLevelAssignedAt = getLastTime(analyticsRows, "upperLevelAssignedAt");
  const lastVisitCompletedAt = getLastTime(analyticsRows, "doneAt");
  const lastPharmacyPickupAt = getLastTime(analyticsRows, "pharmacyPickedUpAt");
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
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
                  label="Registration → Undergrad Complete"
                  value={formatMinutes(avgCreatedToUndergrad)}
                />
                <AnalyticsMetric
                  label="Undergrad Complete → Student Assigned"
                  value={formatMinutes(avgUndergradToStudentAssigned)}
                />
                <AnalyticsMetric
                  label="Student Assigned → Upper Level Assigned"
                  value={formatMinutes(avgStudentToUpperAssigned)}
                />
                <AnalyticsMetric
                  label="Student Assigned → Done"
                  value={formatMinutes(avgStudentAssignedToDone)}
                />
                <AnalyticsMetric
                  label="Total Visit Time"
                  value={formatMinutes(avgCreatedToDone)}
                  subtext="Created → Done"
                />
                <AnalyticsMetric
                  label="Pharmacy Ready → Picked Up"
                  value={formatMinutes(avgPharmacyReadyToPickup)}
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
                  label="Last Student Assigned"
                  value={formatTime(lastPatientAssignedAt)}
                />
                <AnalyticsMetric
                  label="Last Upper Level Assigned"
                  value={formatTime(lastUpperLevelAssignedAt)}
                />
                <AnalyticsMetric
                  label="Last Visit Completed"
                  value={formatTime(lastVisitCompletedAt)}
                />
                <AnalyticsMetric
                  label="Last Pharmacy Pickup"
                  value={formatTime(lastPharmacyPickupAt)}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              These numbers are calculated from existing encounter timestamps:
              created, undergrad complete, student assigned, upper level assigned, done,
              pharmacy ready, and pharmacy pickup.
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

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-gray-700">
                  Clinic Date:
                </label>

                <input
                  type="date"
                  value={selectedClinicDate}
                  onChange={(e) => setSelectedClinicDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:w-auto"
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
  {canViewAnalytics && (
    <button
      type="button"
      onClick={() => setShowAnalytics(true)}
      className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 sm:w-auto"
    >
      📊 Analytics
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