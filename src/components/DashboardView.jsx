import { useState } from "react";
import PatientSearch from "./PatientSearch";
import PatientTable from "./PatientTable";
import { downloadSignedEncountersZip } from "../utils/pdfGenerator";
import logo from "../assets/free-clinic-logo.png";

export default function DashboardView({
  isLeadershipView,
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
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
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
              ? `Clinic Date (${selectedClinicDate})`
              : "All Encounters"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow">
          <button
            onClick={handleExportSignedRecords}
            disabled={exportingRecords}
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingRecords
              ? "Exporting..."
              : selectedClinicDate
                ? "Export Records for Selected Date"
                : "Export Signed Records"}
          </button>
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
        {selectedClinicDate ? selectedClinicDate : "All selected clinic dates"}
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