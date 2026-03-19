export default function QueueView({
  searchForm,
  waitingEncounterRows,
  openPatientChart,
  getPatientBoardName,
  spanishBadge,
  priorityBadge,
  elevatorBadge,
  formatWaitTime,
}) {
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Waiting Queue</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bus/Public Transport patients are automatically shown first.
            </p>
          </div>

          <input
            className="w-full rounded-lg border p-3 lg:w-80"
            placeholder="Search by MRN, first name, last name, DOB, last 4 SSN"
            value={`${searchForm.mrn} ${searchForm.firstName} ${searchForm.lastName} ${searchForm.last4ssn}`.trim()}
            readOnly
          />
        </div>

        <div className="divide-y">
          {waitingEncounterRows.map(({ patient, encounter }) => (
            <div
              key={encounter.id}
              onClick={() => openPatientChart(patient.id, encounter.id)}
              className="flex cursor-pointer flex-col gap-3 px-2 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">
                  {getPatientBoardName(patient)} ({patient.age})
                </p>
                <p className="text-sm text-slate-500">
                  MRN: {patient.mrn || "—"}
                </p>
                <p className="text-sm text-slate-500">
                  {encounter.chiefComplaint || "No chief complaint"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {spanishBadge(encounter)}
                  {priorityBadge(encounter)}
                  {elevatorBadge(encounter)}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-yellow-700">Waiting</p>
                <p className="text-sm text-slate-500">
                  {formatWaitTime(encounter.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {waitingEncounterRows.length === 0 && (
            <div className="px-5 py-6 text-slate-500">
              No patients currently waiting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}