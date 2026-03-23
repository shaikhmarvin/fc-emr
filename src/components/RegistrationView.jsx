export default function RegistrationView({
  registrationRows,
  openUndergradRegistration,
  openLeadershipRegistration,
  getFullPatientName,
  formatDate,
}) {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Registration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete undergraduate registration details or finish leadership intake.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {registrationRows.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            No patients waiting in registration.
          </div>
        ) : (
          registrationRows.map(({ patient, encounter }) => (
            <div
              key={encounter.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {getFullPatientName(patient)}
                  </h2>
                  <div className="mt-1 text-sm text-slate-600">
                    DOB: {formatDate(patient.dob) || "—"} · Status: {encounter.status}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Started: {encounter.createdAt ? new Date(encounter.createdAt).toLocaleString() : "—"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => openUndergradRegistration(patient.id, encounter.id)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Complete Undergrad Intake
                  </button>

                  <button
                    onClick={() => openLeadershipRegistration(patient.id, encounter.id)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Leadership Intake
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}