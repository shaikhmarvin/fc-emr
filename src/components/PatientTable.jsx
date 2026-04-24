import { formatDate } from "../utils";

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
              {canDeletePatient && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`cursor-pointer border-t hover:bg-slate-50 active:bg-slate-100 ${selectedPatientId === patient.id
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : ""
                  }`}
              >
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {getFullPatientName(patient)}
                </td>

                <td className="px-4 py-3">{patient.mrn || "—"}</td>

                <td className="px-4 py-3">{formatDate(patient.dob) || "—"}</td>

                <td className="px-4 py-3">{patient.last4ssn || "—"}</td>

                <td className="px-4 py-3">{patient.phone || "—"}</td>

                <td className="px-4 py-3">{patient.encounters.length}</td>

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
            ))}

            {patients.length === 0 && (
              <tr>
                <td
                  className="p-4 text-slate-500"
                  colSpan={canDeletePatient ? 7 : 6}
                >
                  No matching patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y lg:hidden">
        {patients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => onSelectPatient(patient.id)}
            className="block w-full px-4 py-4 text-left hover:bg-slate-50"
          >
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-900">
                {getFullPatientName(patient)}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>MRN: {patient.mrn || "—"}</span>
                <span>DOB: {formatDate(patient.dob) || "—"}</span>
                <span>SSN: {patient.last4ssn || "—"}</span>
                <span>Phone: {patient.phone || "—"}</span>
                <span className="col-span-2">
                  Encounters: {patient.encounters.length}
                </span>
              </div>
            </div>
          </button>
        ))}

        {patients.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No matching patients found.
          </div>
        )}
      </div>
    </div>
  );
}