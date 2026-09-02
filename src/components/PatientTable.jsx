import { formatDate } from "../utils";
import { VISIT_TYPE_BADGE_STYLES } from "../constants";

export default function PatientTable({
  title,
  patients,
  onSelectPatient,
  getFullPatientName,
  canEditMrn,
  canEditPatient,
  canDeletePatient,
  deletePatientCompletely,
  selectedPatientId,
  getPatientVisitTypeSummary,
  getPatientClinicContext,
}) {
  return (
    <div className="rounded-2xl bg-white shadow">
      <div className="border-b px-4 py-4 sm:px-5">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">MRN</th>
              <th className="p-3">DOB</th>
              <th className="p-3">Last 4 SSN</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Encounters</th>
              {getPatientClinicContext && <th className="p-3">Today&apos;s clinic</th>}
              {canDeletePatient && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const clinicContext = getPatientClinicContext?.(patient);
              return (
              <tr
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`cursor-pointer border-t hover:bg-slate-50 active:bg-slate-100 ${clinicContext?.inClinic ? "bg-emerald-50/60" : ""} ${selectedPatientId === patient.id
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : ""
                  }`}
              >
                <td className="px-4 py-3">
  <div className="flex flex-col gap-1">
    <span className="font-semibold text-slate-800">
      {getFullPatientName(patient)}
    </span>

    {getPatientVisitTypeSummary && (
      <span
        className={`w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${
          VISIT_TYPE_BADGE_STYLES[getPatientVisitTypeSummary(patient)]?.badgeClass ||
          VISIT_TYPE_BADGE_STYLES.general.badgeClass
        }`}
      >
        {VISIT_TYPE_BADGE_STYLES[getPatientVisitTypeSummary(patient)]?.label ||
          "General"}
      </span>
    )}
  </div>
</td>

                <td className="px-4 py-3">{patient.mrn || "—"}</td>

                <td className="px-4 py-3">{formatDate(patient.dob) || "—"}</td>

                <td className="px-4 py-3">{patient.last4ssn || "—"}</td>

                <td className="px-4 py-3">{patient.phone || "—"}</td>

                <td className="px-4 py-3">{patient.encounters.length}</td>

                {getPatientClinicContext && (
                  <td className="min-w-64 px-4 py-3">
                    {clinicContext?.inClinic ? (
                      <div className="space-y-1">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">In clinic today</span>
                        <p className="text-sm font-semibold text-slate-800">{clinicContext.assignment}</p>
                        <p className="text-sm text-slate-700">{clinicContext.reason}</p>
                        <p className="text-xs text-slate-500">{clinicContext.status}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Not in clinic today</span>
                    )}
                  </td>
                )}

                {canDeletePatient && (
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePatientCompletely(patient.id);
                      }}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
              );
            })}

            {patients.length === 0 && (
              <tr>
                <td
                  className="p-4 text-slate-500"
                  colSpan={6 + (getPatientClinicContext ? 1 : 0) + (canDeletePatient ? 1 : 0)}
                >
                  No matching patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y lg:hidden">
        {patients.map((patient) => {
          const clinicContext = getPatientClinicContext?.(patient);
          return (
          <button
            key={patient.id}
            type="button"
            onClick={() => onSelectPatient(patient.id)}
            className={`block w-full px-4 py-4 text-left hover:bg-slate-50 ${clinicContext?.inClinic ? "bg-emerald-50/60" : ""}`}
          >
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-900">
                {getFullPatientName(patient)}
              </p>
              {getPatientVisitTypeSummary && (
  <span
    className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${
      VISIT_TYPE_BADGE_STYLES[getPatientVisitTypeSummary(patient)]?.badgeClass ||
      VISIT_TYPE_BADGE_STYLES.general.badgeClass
    }`}
  >
    {VISIT_TYPE_BADGE_STYLES[getPatientVisitTypeSummary(patient)]?.label ||
      "General"}
  </span>
)}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>MRN: {patient.mrn || "—"}</span>
                <span>DOB: {formatDate(patient.dob) || "—"}</span>
                <span>SSN: {patient.last4ssn || "—"}</span>
                <span>Phone: {patient.phone || "—"}</span>
                <span className="col-span-2">
                  Encounters: {patient.encounters.length}
                </span>
              </div>
              {getPatientClinicContext && (
                <div className={`rounded-lg border p-3 ${clinicContext?.inClinic ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  {clinicContext?.inClinic ? (
                    <div className="space-y-1">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">In clinic today</span>
                      <p className="text-sm font-semibold text-slate-800">Assigned: {clinicContext.assignment}</p>
                      <p className="text-sm text-slate-700">Here for: {clinicContext.reason}</p>
                      <p className="text-xs text-slate-500">{clinicContext.status}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Not in clinic today</p>
                  )}
                </div>
              )}
            </div>
          </button>
          );
        })}

        {patients.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No matching patients found.
          </div>
        )}
      </div>
    </div>
  );
}
