function getRegistrationStatusBadge(status) {
  switch (status) {
    case "started":
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
          Started
        </span>
      );

    case "undergrad_complete":
      return (
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
          Undergrad Complete
        </span>
      );

    case "ready":
      return (
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
          Ready
        </span>
      );

    case "cancelled":
      return (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
          Cancelled
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {status || "Unknown"}
        </span>
      );
  }
}


export default function RegistrationView({
  registrationRows,
  openUndergradRegistration,
  openLeadershipRegistration,
  getFullPatientName,
  formatDate,
  userRole,
  isLeadershipView,
  onRemoveFromRegistration
}) {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Registration</h1>
        <p className="mt-2 text-sm text-slate-600">
  {userRole === "undergraduate"
    ? "Complete initial registration details for arriving patients."
    : "Finish intake and prepare patients for assignment."}
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
  <div className="flex flex-wrap items-center gap-2">
    <h2 className="text-lg font-semibold text-slate-900">
      {getFullPatientName(patient)}
    </h2>
    {getRegistrationStatusBadge(encounter.status)}
  </div>

  <div className="mt-1 text-sm text-slate-600">
    DOB: {formatDate(patient.dob) || "—"}
  </div>

  <div className="mt-1 text-sm text-slate-600">
    Started: {encounter.createdAt ? new Date(encounter.createdAt).toLocaleString() : "—"}
  </div>
</div>

                <div className="flex flex-col gap-2 sm:flex-row">
  {userRole === "undergraduate" && (
    <button
      onClick={() => openUndergradRegistration(patient.id, encounter.id)}
      className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Complete Undergrad Intake
    </button>
  )}

  {isLeadershipView && (
    <button
      onClick={() => openLeadershipRegistration(patient.id, encounter.id)}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Leadership Intake
    </button>
  )}
  {isLeadershipView && (
  <button
    onClick={() => onRemoveFromRegistration(patient.id, encounter.id)}
    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
  >
    Remove
  </button>
)}
</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}