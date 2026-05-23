import { useMemo, useState } from "react";

const PAP_STATUSES = [
  "Pending Application",
  "Pending POI",
  "Faxed",
  "Approved",
  "Denied",
  "Discontinued",
  "Need Follow-Up",
  "Refill In Progress",
  "Completed",
];

function getTodayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PAPView({
  papEntries,
  addPapEntry,
  updatePapEntry,
  removePapEntry,
  patients,
  leadershipOptions = [],
}) {
  const [patientSearch, setPatientSearch] = useState({
    name: "",
    mrn: "",
    dob: "",
  });

  const [listSearch, setListSearch] = useState({
    patient: "",
    medication: "",
  });

  const [filters, setFilters] = useState({
    dueFilter: "",
  });

  const [expandedEntryIds, setExpandedEntryIds] = useState([]);

  const [papDrafts, setPapDrafts] = useState({});

  const [showAddPapEntry, setShowAddPapEntry] = useState(false);

  const [newEntry, setNewEntry] = useState({
    patientId: "",
    patientName: "",
    mrn: "",
    phone: "",
    medication: "",
    company: "",
    status: "Pending Application",
    startedDate: getTodayInputValue(),
    assignedLeadership: "",
    approvalUntilDate: "",
    nextFollowUpDate: "",
    nextRefillDate: "",
    denialReason: "",
    discontinuedReason: "",
    prescriptionChangeNotes: "",
    todoNotes: "",
    generalNotes: "",
  });

  const showNewApprovalFields = newEntry.status === "Approved";

  const showNewRefillFields =
    newEntry.status === "Approved" ||
    newEntry.status === "Refill In Progress";

  const showNewFollowUpField = [
    "Pending Application",
    "Pending POI",
    "Faxed",
    "Need Follow-Up",
    "Refill In Progress",
  ].includes(newEntry.status);

  const showNewDenialReason = newEntry.status === "Denied";
  const showNewDiscontinuedReason = newEntry.status === "Discontinued";

  const showNewPrescriptionChangeNotes =
    newEntry.status === "Approved" ||
    newEntry.status === "Refill In Progress";

  function getPapDraftValue(entry, field) {
  return papDrafts[entry.id]?.[field] ?? entry[field] ?? "";
}

function setPapDraftValue(entryId, field, value) {
  setPapDrafts((prev) => ({
    ...prev,
    [entryId]: {
      ...prev[entryId],
      [field]: value,
    },
  }));
}

function clearPapDraftValue(entryId, field) {
  setPapDrafts((prev) => {
    if (!prev[entryId]) return prev;

    const nextEntryDraft = { ...prev[entryId] };
    delete nextEntryDraft[field];

    if (Object.keys(nextEntryDraft).length === 0) {
      const next = { ...prev };
      delete next[entryId];
      return next;
    }

    return {
      ...prev,
      [entryId]: nextEntryDraft,
    };
  });
}

function savePapDraftValue(entry, field) {
  setPapDrafts((prev) => {
    const value =
      prev[entry.id]?.[field] ?? entry[field] ?? "";

    updatePapEntry(entry.id, field, value);

    if (!prev[entry.id]) return prev;

    const nextEntryDraft = { ...prev[entry.id] };
    delete nextEntryDraft[field];

    if (Object.keys(nextEntryDraft).length === 0) {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    }

    return {
      ...prev,
      [entry.id]: nextEntryDraft,
    };
  });
}

  const filteredPatientOptions = useMemo(() => {
    return patients
      .filter((patient) => {
        const fullName =
          `${patient.firstName || ""} ${patient.lastName || ""}`
            .trim()
            .toLowerCase();

        const matchesName =
          !patientSearch.name ||
          fullName.includes(patientSearch.name.toLowerCase());

        const matchesMrn =
          !patientSearch.mrn ||
          String(patient.mrn || "")
            .toLowerCase()
            .includes(patientSearch.mrn.toLowerCase());

        const matchesDob =
          !patientSearch.dob || patient.dob === patientSearch.dob;

        return matchesName && matchesMrn && matchesDob;
      })
      .sort((a, b) => {
        const aName = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const bName = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return aName.localeCompare(bName);
      });
  }, [patients, patientSearch]);

  const filteredEntries = useMemo(() => {
    return papEntries
      .filter((entry) => {
        const dueState = getDueState(entry);

        const matchesDue =
          !filters.dueFilter ||
          (filters.dueFilter === "due_soon" && dueState === "due_soon") ||
          (filters.dueFilter === "overdue" && dueState === "overdue") ||
          (filters.dueFilter === "none" && dueState === "none");

        const patientText = (entry.patientName || "").toLowerCase();
        const medicationText = (entry.medication || "").toLowerCase();

        const matchesPatient =
          !listSearch.patient ||
          patientText.includes(listSearch.patient.toLowerCase());

        const matchesMedication =
          !listSearch.medication ||
          medicationText.includes(listSearch.medication.toLowerCase());

        return matchesDue && matchesPatient && matchesMedication;
      })
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [papEntries, filters, listSearch]);

  const papCounts = useMemo(() => {
    return {
      total: papEntries.length,
      pending: papEntries.filter((entry) =>
        ["Pending Application", "Pending POI", "Faxed"].includes(entry.status)
      ).length,
      approved: papEntries.filter((entry) => entry.status === "Approved").length,
      needFollowUp: papEntries.filter((entry) => entry.status === "Need Follow-Up").length,
      overdue: papEntries.filter((entry) => getDueState(entry) === "overdue").length,
    };
  }, [papEntries]);

  function handleSelectPatient(patient) {
    setNewEntry((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      mrn: patient.mrn || "",
      phone: patient.phone || "",
    }));

    setPatientSearch({ name: "", mrn: "", dob: "" });
  }

  function handleAddEntry() {
    if (
      !newEntry.patientId ||
      !newEntry.patientName ||
      !newEntry.medication.trim() ||
      !newEntry.company.trim() ||
      !newEntry.assignedLeadership.trim()
    ) {
      alert(
        "Please select a patient and fill out medication, company, and assigned leadership."
      );
      return;
    }

    const entry = {
      id: Date.now(),
      patientId: newEntry.patientId,
      patientName: newEntry.patientName,
      mrn: newEntry.mrn,
      phone: newEntry.phone,
      medication: newEntry.medication,
      company: newEntry.company,
      status: newEntry.status,
      startedDate: newEntry.startedDate || getTodayInputValue(),
      assignedLeadership: newEntry.assignedLeadership,
      approvalUntilDate: newEntry.approvalUntilDate,
      nextFollowUpDate: newEntry.nextFollowUpDate,
      nextRefillDate: newEntry.nextRefillDate,
      denialReason: newEntry.denialReason,
      discontinuedReason: newEntry.discontinuedReason,
      prescriptionChangeNotes: newEntry.prescriptionChangeNotes,
      todoNotes: newEntry.todoNotes,
      generalNotes: newEntry.generalNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPapEntry(entry);

    setNewEntry({
      patientId: "",
      patientName: "",
      mrn: "",
      phone: "",
      medication: "",
      company: "",
      status: "Pending Application",
      startedDate: getTodayInputValue(),
      assignedLeadership: "",
      approvalUntilDate: "",
      nextFollowUpDate: "",
      nextRefillDate: "",
      denialReason: "",
      discontinuedReason: "",
      prescriptionChangeNotes: "",
      todoNotes: "",
      generalNotes: "",
    });
  }

  function handleDeleteEntry(entryId) {
    const confirmed = window.confirm("Delete this PAP entry?");
    if (!confirmed) return;
    removePapEntry(entryId);
  }

  function toggleExpanded(entryId) {
    setExpandedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Patient Assistance Program Tracker</h2>
        <p className="mt-1 text-sm text-slate-600">
          Track patient assistance applications, approvals, refill timing, and follow-ups.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Total Cases" value={papCounts.total} />
        <SummaryCard label="Pending" value={papCounts.pending} />
        <SummaryCard label="Approved" value={papCounts.approved} />
        <SummaryCard label="Need Follow-Up" value={papCounts.needFollowUp} />
        <SummaryCard label="Overdue" value={papCounts.overdue} />
      </div>

      <Card>
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-slate-900">Add PAP Entry</h3>
      <p className="mt-1 text-sm text-slate-500">
        Create a new PAP case when you start working on an application.
      </p>
    </div>

    <button
  type="button"
  onClick={() => setShowAddPapEntry((prev) => !prev)}
  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
    showAddPapEntry
      ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
      : "bg-green-600 text-white hover:bg-green-700"
  }`}
>
  {showAddPapEntry ? "Hide Form" : "+ Add New Entry"}
</button>
  </div>

  {showAddPapEntry && (
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="mb-4 text-sm font-semibold text-slate-900">
          Find Patient
        </h4>

        <div className="space-y-3">
          <Field label="Search Name">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={patientSearch.name}
              onChange={(e) =>
                setPatientSearch((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </Field>

          <Field label="Search MRN">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={patientSearch.mrn}
              onChange={(e) =>
                setPatientSearch((prev) => ({ ...prev, mrn: e.target.value }))
              }
            />
          </Field>

          <Field label="Search DOB">
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={patientSearch.dob}
              onChange={(e) =>
                setPatientSearch((prev) => ({ ...prev, dob: e.target.value }))
              }
            />
          </Field>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {filteredPatientOptions.slice(0, 12).map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelectPatient(patient)}
                className={`w-full border-b px-3 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                  newEntry.patientId === patient.id ? "bg-slate-100" : ""
                }`}
              >
                <div className="font-medium text-slate-900">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="text-xs text-slate-500">
                  MRN: {patient.mrn || "—"} | DOB: {patient.dob || "—"} | Phone:{" "}
                  {patient.phone || "—"}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="mb-4 text-sm font-semibold text-slate-900">
          PAP Details
        </h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Selected Patient">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              value={newEntry.patientName}
              readOnly
            />
          </Field>

          <Field label="Phone">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              value={newEntry.phone}
              readOnly
            />
          </Field>

          <Field label="MRN">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              value={newEntry.mrn}
              readOnly
            />
          </Field>

          <Field label="Started Date">
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              value={newEntry.startedDate}
              readOnly
            />
          </Field>

          <Field label="Medication">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.medication}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, medication: e.target.value }))
              }
            />
          </Field>

          <Field label="Company">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.company}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, company: e.target.value }))
              }
            />
          </Field>

          <Field label="Status">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.status}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              {PAP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assigned Leadership">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.assignedLeadership}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  assignedLeadership: e.target.value,
                }))
              }
            >
              <option value="">Select leadership</option>
              {leadershipOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          {showNewFollowUpField && (
            <Field label="Next Follow-Up Date">
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.nextFollowUpDate}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    nextFollowUpDate: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          {showNewRefillFields && (
            <Field label="Next Refill Date">
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.nextRefillDate}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    nextRefillDate: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          {showNewApprovalFields && (
            <Field label="Approval Until Date">
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.approvalUntilDate}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    approvalUntilDate: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          {showNewDenialReason && (
            <Field label="Denial Reason" className="md:col-span-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.denialReason}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    denialReason: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          {showNewDiscontinuedReason && (
            <Field label="Discontinued Reason" className="md:col-span-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.discontinuedReason}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    discontinuedReason: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          {showNewPrescriptionChangeNotes && (
            <Field label="Prescription Change Notes" className="md:col-span-2">
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newEntry.prescriptionChangeNotes}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    prescriptionChangeNotes: e.target.value,
                  }))
                }
              />
            </Field>
          )}

          <Field label="To-Do Notes" className="md:col-span-2">
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.todoNotes}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, todoNotes: e.target.value }))
              }
            />
          </Field>

          <Field label="General Notes" className="md:col-span-2">
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.generalNotes}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  generalNotes: e.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleAddEntry}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add PAP Entry
          </button>

          <button
            type="button"
            onClick={() => setShowAddPapEntry(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}
</Card>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Search Patient">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={listSearch.patient}
              onChange={(e) =>
                setListSearch((prev) => ({ ...prev, patient: e.target.value }))
              }
            />
          </Field>

          <Field label="Search Medication">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={listSearch.medication}
              onChange={(e) =>
                setListSearch((prev) => ({ ...prev, medication: e.target.value }))
              }
            />
          </Field>

          <Field label="Due Filter">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.dueFilter}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dueFilter: e.target.value }))
              }
            >
              <option value="">All</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="none">No Due Alert</option>
            </select>
          </Field>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No PAP entries found.</p>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const dueState = getDueState(entry);
              const isExpanded = expandedEntryIds.includes(entry.id);

              const showApprovalFields = entry.status === "Approved";

              const showRefillFields =
                entry.status === "Approved" ||
                entry.status === "Refill In Progress";

              const showFollowUpField = [
                "Pending Application",
                "Pending POI",
                "Faxed",
                "Need Follow-Up",
                "Refill In Progress",
              ].includes(entry.status);

              const showDenialReason = entry.status === "Denied";
              const showDiscontinuedReason = entry.status === "Discontinued";

              const showPrescriptionChangeNotes =
                entry.status === "Approved" ||
                entry.status === "Refill In Progress";

              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl border border-slate-200 bg-white p-4 border-l-4 ${getPapBorderColor(
                    entry.status,
                    dueState
                  )}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id)}
                    className="w-full text-left"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                      <ReadOnlyField label="Patient" value={entry.patientName} />
                      <ReadOnlyField label="Medication" value={entry.medication || "—"} />
                      <ReadOnlyField label="Company" value={entry.company || "—"} />
                      <ReadOnlyField label="Started Date" value={entry.startedDate || "—"} />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <div className="flex items-center gap-2">
                          <PapStatusBadge status={entry.status} />
                          {dueState !== "none" && <DueBadge dueState={dueState} />}
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ReadOnlyField label="MRN" value={entry.mrn || "—"} />
                        <ReadOnlyField label="Phone" value={entry.phone || "—"} />

                        <Field label="Assigned Leadership">
                          <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={entry.assignedLeadership || ""}
                            onChange={(e) =>
                              updatePapEntry(
                                entry.id,
                                "assignedLeadership",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select leadership</option>
                            {leadershipOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Status
                          </label>
                          <div className="flex items-center gap-2">
                            <PapStatusBadge status={entry.status} />
                            <select
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                              value={entry.status}
                              onChange={(e) =>
                                updatePapEntry(entry.id, "status", e.target.value)
                              }
                            >
                              {PAP_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {showFollowUpField && (
                          <Field label="Next Follow-Up Date">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.nextFollowUpDate || ""}
                              onChange={(e) =>
                                updatePapEntry(entry.id, "nextFollowUpDate", e.target.value)
                              }
                            />
                          </Field>
                        )}

                        {showRefillFields && (
                          <Field label="Next Refill Date">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.nextRefillDate || ""}
                              onChange={(e) =>
                                updatePapEntry(entry.id, "nextRefillDate", e.target.value)
                              }
                            />
                          </Field>
                        )}

                        {showApprovalFields && (
                          <Field label="Approval Until Date">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.approvalUntilDate || ""}
                              onChange={(e) =>
                                updatePapEntry(entry.id, "approvalUntilDate", e.target.value)
                              }
                            />
                          </Field>
                        )}
                      </div>

                      {showDenialReason && (
  <div className="mt-4">
    <Field label="Denial Reason">
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={getPapDraftValue(entry, "denialReason")}
        onChange={(e) =>
          setPapDraftValue(entry.id, "denialReason", e.target.value)
        }
        onBlur={() => savePapDraftValue(entry, "denialReason")}
      />
    </Field>
  </div>
)}

                      {showDiscontinuedReason && (
  <div className="mt-4">
    <Field label="Discontinued Reason">
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={getPapDraftValue(entry, "discontinuedReason")}
        onChange={(e) =>
          setPapDraftValue(entry.id, "discontinuedReason", e.target.value)
        }
        onBlur={() => savePapDraftValue(entry, "discontinuedReason")}
      />
    </Field>
  </div>
)}

                      {showPrescriptionChangeNotes && (
  <div className="mt-4">
    <Field label="Prescription Change Notes">
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={getPapDraftValue(entry, "prescriptionChangeNotes")}
        onChange={(e) =>
          setPapDraftValue(entry.id, "prescriptionChangeNotes", e.target.value)
        }
        onBlur={() => savePapDraftValue(entry, "prescriptionChangeNotes")}
      />
    </Field>
  </div>
)}

                      <div className="mt-4">
  <Field label="To-Do Notes">
    <textarea
      className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      value={getPapDraftValue(entry, "todoNotes")}
      onChange={(e) =>
        setPapDraftValue(entry.id, "todoNotes", e.target.value)
      }
      onBlur={() => savePapDraftValue(entry, "todoNotes")}
    />
  </Field>
</div>

                      <div className="mt-4">
  <Field label="General Notes">
    <textarea
      className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      value={getPapDraftValue(entry, "generalNotes")}
      onChange={(e) =>
        setPapDraftValue(entry.id, "generalNotes", e.target.value)
      }
      onBlur={() => savePapDraftValue(entry, "generalNotes")}
    />
  </Field>
</div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function getDueState(entry) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateString = entry.nextRefillDate || entry.nextFollowUpDate;
  if (!dateString) return "none";

  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) return "none";

  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due_soon";
  return "none";
}

function getPapStatusStyles(status) {
  switch (status) {
    case "Pending Application":
      return "bg-slate-100 text-slate-700";
    case "Pending POI":
      return "bg-blue-100 text-blue-700";
    case "Faxed":
      return "bg-cyan-100 text-cyan-700";
    case "Approved":
      return "bg-green-100 text-green-700";
    case "Denied":
      return "bg-red-100 text-red-700";
    case "Discontinued":
      return "bg-slate-200 text-slate-800";
    case "Need Follow-Up":
      return "bg-yellow-100 text-yellow-700";
    case "Refill In Progress":
      return "bg-purple-100 text-purple-700";
    case "Completed":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPapBorderColor(status, dueState) {
  if (dueState === "overdue") return "border-l-red-500";
  if (dueState === "due_soon") return "border-l-yellow-400";

  switch (status) {
    case "Approved":
      return "border-l-green-500";
    case "Denied":
      return "border-l-red-500";
    case "Need Follow-Up":
      return "border-l-yellow-400";
    case "Refill In Progress":
      return "border-l-purple-500";
    case "Pending POI":
      return "border-l-blue-400";
    case "Faxed":
      return "border-l-cyan-400";
    case "Discontinued":
      return "border-l-slate-500";
    case "Completed":
      return "border-l-slate-500";
    default:
      return "border-l-slate-300";
  }
}

function PapStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPapStatusStyles(
        status
      )}`}
    >
      {status || "—"}
    </span>
  );
}

function DueBadge({ dueState }) {
  const label = dueState === "overdue" ? "Overdue" : "Due Soon";
  const classes =
    dueState === "overdue"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function Card({ children }) {
  return <div className="rounded-2xl bg-white p-4 shadow">{children}</div>;
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {value}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}