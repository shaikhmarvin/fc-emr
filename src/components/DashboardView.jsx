import PatientSearch from "./PatientSearch";
import PatientTable from "./PatientTable";

export default function DashboardView({
  isLeadershipView,
  canEditMrn,
  canEditPatient,
  canDeletePatient,
  deletePatientCompletely,
  endClinicReset,
  selectedClinicDate,
  setSelectedClinicDate,
  filteredVisiblePatients,
  visibleEncounterRows,
  assignedCount,
  inVisitCount,
  searchForm,
  setSearchForm,
  patientRecordsTitle,
  openPatientFromFilteredView,
  getFullPatientName,
}) {
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
                All Encounters
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

        {isLeadershipView && (
          <button
            onClick={endClinicReset}
            className="w-full rounded-lg bg-red-700 px-4 py-3 text-white hover:bg-red-800 sm:w-auto"
          >
            End Clinic Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Total Patients</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">
            {filteredVisiblePatients.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Waiting</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">
            {
              visibleEncounterRows.filter(
                ({ encounter }) => encounter.status === "Waiting"
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">Assigned</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">{assignedCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-sm text-slate-500">In Visit</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">{inVisitCount}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
  <PatientSearch searchForm={searchForm} setSearchForm={setSearchForm} />
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
/>
    </div>
  );

 
}