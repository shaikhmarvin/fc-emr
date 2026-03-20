export default function QueueView({
  userRole,
  searchForm,
  waitingEncounterRows,
  openPatientChart,
  getPatientBoardName,
  spanishBadge,
  priorityBadge,
  elevatorBadge,
  formatWaitTime,
  studentNameOptions,
  upperLevelNameOptions,
  onAssignFromQueue,
  
}) {

  const unassignedRows =
  userRole === "leadership"
    ? waitingEncounterRows.filter(
        ({ encounter }) =>
          !encounter.assignedStudent && !encounter.assignedUpperLevel
      )
    : waitingEncounterRows;

const assignedRows =
  userRole === "leadership"
    ? waitingEncounterRows.filter(
        ({ encounter }) =>
          encounter.assignedStudent || encounter.assignedUpperLevel
      )
    : [];
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
  {userRole === "attending"
    ? "Awaiting Signature"
    : userRole === "student" || userRole === "upper_level"
    ? "My Queue"
    : "Waiting Queue"}
</h3>
            <p className="mt-1 text-sm text-slate-500">
  {userRole === "attending"
    ? "Patients awaiting attending signature."
    : userRole === "student"
    ? "Patients assigned to you that are still waiting."
    : userRole === "upper_level"
    ? "Patients assigned to you that are still waiting."
    : "Bus/Public Transport patients are automatically shown first."}
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
  {userRole === "leadership" && unassignedRows.length > 0 && (
  <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
    Unassigned / New Patients
  </div>
)}
  {(userRole === "leadership" ? unassignedRows : waitingEncounterRows).map(
    ({ patient, encounter }) => (
    <div
      key={encounter.id}
      onClick={(e) => {
        if (e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
        openPatientChart(patient.id, encounter.id);
      }}
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
        <p className="text-sm text-slate-500">
          Student: {encounter.assignedStudent || "—"} • Upper Level: {encounter.assignedUpperLevel || "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          {spanishBadge(encounter)}
          {priorityBadge(encounter)}
          {elevatorBadge(encounter)}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left sm:items-end sm:text-right">
        <p className="text-sm font-medium text-slate-700">
          {encounter.soapStatus === "awaiting_attending"
            ? "Awaiting Signature"
            : encounter.status || "—"}
        </p>

        <p className="text-sm text-slate-500">
          {formatWaitTime(encounter.createdAt)}
        </p>

        {/* 👇 LEADERSHIP ASSIGNMENT UI */}
        
            {userRole === "leadership" && (
  <>
    <select
      className="border rounded p-1 text-xs"
      defaultValue={encounter.assignedStudent || ""}
      onChange={(e) =>
        onAssignFromQueue(encounter.id, {
          assignedStudent: e.target.value,
        })
      }
    >
      <option value="">Assign Student</option>
      {studentNameOptions.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>

    <select
      className="border rounded p-1 text-xs"
      defaultValue={encounter.assignedUpperLevel || ""}
      onChange={(e) =>
        onAssignFromQueue(encounter.id, {
          assignedUpperLevel: e.target.value,
        })
      }
    >
      <option value="">Assign Upper</option>
      {upperLevelNameOptions.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  </>
)}

      </div>
    </div>
  ))}

          {waitingEncounterRows.length === 0 && (
            <div className="px-5 py-6 text-slate-500">
              No patients currently waiting.
            </div>
          )}
          {userRole === "leadership" && assignedRows.length > 0 && (
  <>
    <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
      Assigned / In Progress
    </div>

    {assignedRows.map(({ patient, encounter }) => (
      <div
        key={encounter.id}
        onClick={(e) => {
          if (e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
          openPatientChart(patient.id, encounter.id);
        }}
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
          <p className="text-sm text-slate-500">
            Student: {encounter.assignedStudent || "—"} • Upper Level: {encounter.assignedUpperLevel || "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            {spanishBadge(encounter)}
            {priorityBadge(encounter)}
            {elevatorBadge(encounter)}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-left sm:items-end sm:text-right">
          <p className="text-sm font-medium text-slate-700">
            {encounter.soapStatus === "awaiting_attending"
              ? "Awaiting Signature"
              : encounter.status || "—"}
          </p>

          <p className="text-sm text-slate-500">
            {formatWaitTime(encounter.createdAt)}
          </p>

        </div>
      </div>
    ))}
  </>
)}
        </div>
      </div>
    </div>
  );
}