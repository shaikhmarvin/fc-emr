export default function ClinicSummaryView({
  selectedClinicDate,
  setSelectedClinicDate,
  clinicSummary,
  setClinicSummary,
  newPatientCount,
  returningPatientCount,
  totalPatientCount,
  exportClinicSummaryToWord,
}) {
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Clinic Summary
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review nightly totals and enter manual counts before exporting.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-slate-700">
              Clinic Date:
            </label>
            <input
              type="date"
              value={selectedClinicDate}
              onChange={(e) => setSelectedClinicDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />

            <button
  onClick={exportClinicSummaryToWord}
  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
>
  Export to Word
</button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">New Patients</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {newPatientCount}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Returning Patients</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {returningPatientCount}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total Patients</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalPatientCount}
            </p>
          </div>
        </div>
        <div className="mt-6">
  <h3 className="mb-2 text-md font-semibold text-slate-800">
    Clinic Staff
  </h3>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {[
      { label: "Attendings", key: "attendingNames" },
      { label: "Residents", key: "residentNames" },
      { label: "MS3 / MS4", key: "ms34Names" },
      { label: "MS1 / MS2", key: "ms12Names" },
    ].map(({ label, key }) => (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={clinicSummary[key]}
          onChange={(e) =>
            setClinicSummary((prev) => ({
              ...prev,
              [key]: e.target.value,
            }))
          }
        />
      </div>
    ))}
  </div>
</div>
<div className="mt-6">
  <h3 className="mb-2 text-md font-semibold text-slate-800">
    Clinic Numbers
  </h3>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[
      { label: "Refill", key: "refillCount" },
      { label: "LWOBS", key: "lwobsCount" },
      { label: "Labs", key: "labsCount" },
      { label: "Mental Health", key: "mentalHealthCount" },
      { label: "Ophthalmology", key: "ophthalmologyCount" },
      { label: "Social Work", key: "socialWorkCount" },
      { label: "Zoom", key: "zoomCount" },
      { label: "Phone", key: "phoneCount" },
    ].map(({ label, key }) => (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={clinicSummary[key]}
          onChange={(e) =>
            setClinicSummary((prev) => ({
              ...prev,
              [key]: e.target.value,
            }))
          }
        />
      </div>
    ))}
  </div>
</div>
      </div>
    </div>
  );
}