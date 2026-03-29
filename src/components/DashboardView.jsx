import { useState } from "react";
import PatientSearch from "./PatientSearch";
import PatientTable from "./PatientTable";

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
                className={`w-full rounded-lg border px-4 py-2 text-sm sm:w-auto ${
                  selectedClinicDate === ""
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

      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Total Patients</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">
            {filteredVisiblePatients.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Awaiting Assignment</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">
            {
              visibleEncounterRows.filter(
  ({ encounter }) =>
    (encounter.status === "started" ||
  encounter.status === "undergrad_complete" ||
  encounter.status === "ready") &&
encounter.soapStatus !== "signed"
).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Assigned</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">{visibleEncounterRows.filter(
  ({ encounter }) => encounter.status === "roomed" &&
encounter.soapStatus !== "signed"
).length}</p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">In Visit</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">{visibleEncounterRows.filter(
  ({ encounter }) => encounter.status === "in_visit" &&
encounter.soapStatus !== "signed"
).length}</p>
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