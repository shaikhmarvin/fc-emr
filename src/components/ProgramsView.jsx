import { useMemo, useState } from "react";
import { useRef } from "react";

const PROGRAM_TYPES = [
  "Physical Therapy",
  "Dermatology",
  "Mental Health",
  "Addiction Medicine",
];

const PROGRAM_STATUSES = [
  "Interested",
  "Contacted",
  "Scheduled",
  "Completed",
  "No Show",
];

const PROGRAM_DETAIL_FIELDS = {
  "Physical Therapy": [
    { key: "followUpMonth", label: "Follow up Needed", type: "select", options: ["", "Yes", "No", "As Needed"] },
    { key: "lastSeenPt", label: "Last Seen for Physical Therapy", type: "date" },
  ],
  Dermatology: [],
  "Mental Health": [],
  "Addiction Medicine": [],
};

const SPECIALTY_CAPACITY = {
  "Physical Therapy": {
    primarySlots: ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM"],
    backupCount: 3,
    schedulingType: "timed",
  },
  "Dermatology": {
    primaryCount: 7,
    backupCount: 3,
    schedulingType: "count",
  },
  "Mental Health": {
    primaryCount: 8,
    backupCount: 3,
    schedulingType: "count",
  },
  "Addiction Medicine": {
    primaryCount: 8,
    backupCount: 3,
    schedulingType: "count",
  },
};

export default function ProgramsView({
  programEntries,
  addProgramEntry,
  updateProgramEntry,
  removeProgramEntry,
  patients,
  selectedClinicDate,
}) {
  const reasonRef = useRef(null);
  const [newEntry, setNewEntry] = useState({
    patientId: "",
    encounterId: "",
    clinicDate: selectedClinicDate || "",
    programType: "Physical Therapy",
    reason: "",
    assignedCoordinator: "",
    status: "Interested",
    notes: "",
    programDetails: {},
  });

  const [nextProgramDates, setNextProgramDates] = useState({
    "Physical Therapy": "",
    "Dermatology": "",
    "Mental Health": "",
    "Addiction Medicine": "",
  });

  const [patientSearch, setPatientSearch] = useState({
    name: "",
    mrn: "",
    dob: "",
  });
  function formatLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  }
  const [activeProgramTab, setActiveProgramTab] = useState("Physical Therapy");

  function updateProgramDetailField(key, value) {
    setNewEntry((prev) => ({
      ...prev,
      programDetails: {
        ...(prev.programDetails || {}),
        [key]: value,
      },
    }));
  }

  function formatDisplayDate(date) {
    if (!date) return "—";

    const [year, month, day] = date.split("-");
    return `${month}/${day}/${year}`;
  }
  function handleAddEntry() {
    const selectedPatient = patients.find((p) => p.id === newEntry.patientId);

    if (
      !selectedPatient ||
      !newEntry.programType ||
      !newEntry.reason.trim() ||
      !newEntry.assignedCoordinator.trim() ||
      !newEntry.status
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    const selectedEncounter =
      selectedPatient.encounters.find((e) => e.id === newEntry.encounterId) || null;

    const entry = {
      id: Date.now(),
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim(),
      encounterId: selectedEncounter?.id || "",
      clinicDate: newEntry.clinicDate || "",
      programType: newEntry.programType,
      reason: newEntry.reason,
      assignedCoordinator: newEntry.assignedCoordinator,
      status: newEntry.status,
      notes: newEntry.notes,
      programDetails: newEntry.programDetails || {},
      createdAt: new Date().toISOString(),
      scheduleType: "", // "primary" or "backup"
      appointmentSlot: "", // only for PT

    };

    addProgramEntry(entry);
    setActiveProgramTab(entry.programType);

    setNewEntry({
      patientId: "",
      encounterId: "",
      clinicDate: selectedClinicDate || "",
      programType: "Physical Therapy",
      reason: "",
      assignedCoordinator: "",
      status: "Interested",
      notes: "",
      programDetails: {},
    });
  }

  function updateEntry(entryId, field, value) {
    updateProgramEntry(entryId, field, value);
  }

  function deleteEntry(entryId) {
    const confirmed = window.confirm("Delete this program entry?");
    if (!confirmed) return;

    removeProgramEntry(entryId);
  }

  const selectedPatient = patients.find((p) => p.id === newEntry.patientId);
  const encounterOptions = useMemo(() => {
    return [...(selectedPatient?.encounters || [])].sort((a, b) => {
      return new Date(b.clinicDate) - new Date(a.clinicDate);
    });
  }, [selectedPatient]);

  const [filters, setFilters] = useState({
    status: "",
    clinicDate: "",
  });

  const filteredPatientOptions = useMemo(() => {
    return patients
      .filter((patient) => {
        const fullName =
          `${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase();

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
        const aName = `${a.firstName || ""} ${a.lastName || ""}`;
        const bName = `${b.firstName || ""} ${b.lastName || ""}`;
        return aName.localeCompare(bName);
      });
  }, [patients, patientSearch]);

  const filteredEntries = useMemo(() => {
    return programEntries.filter((entry) => {
      const matchesStatus = !filters.status || entry.status === filters.status;
      const matchesClinicDate =
        !filters.clinicDate || entry.clinicDate === filters.clinicDate;

      return matchesStatus && matchesClinicDate;
    });
  }, [programEntries, filters]);

  const groupedEntries = useMemo(() => {
    return PROGRAM_TYPES.reduce((acc, type) => {
      acc[type] = filteredEntries
        .filter((entry) => entry.programType === type)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return acc;
    }, {});
  }, [filteredEntries]);

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-xl font-semibold text-slate-900">Specialty Programs</h2>
        <p className="mt-1 text-sm text-slate-600">
          Track specialty interest, scheduling, and clinic follow-up.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Upcoming Specialty Dates
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROGRAM_TYPES.map((program) => (
            <div key={program}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {program}
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={nextProgramDates[program] || ""}
                onChange={(e) =>
                  setNextProgramDates((prev) => ({
                    ...prev,
                    [program]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Add Program Entry
        </h3>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
<div className="space-y-6">

          {/* STEP 1: PROGRAM */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-4 text-sm font-semibold text-slate-900">
              Step 1: Choose Program
            </h4>

            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.programType}
              onChange={(e) => {
                const program = e.target.value;

                setNewEntry((prev) => ({
                  ...prev,
                  programType: program,
                  programDetails: {},
                  clinicDate: nextProgramDates[program] || prev.clinicDate,
                }));
              }}
            >
              {PROGRAM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: PATIENT */}
<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  {/* LEFT: SEARCH */}
  <div className="rounded-xl border border-slate-200 p-4">
    <h4 className="mb-4 text-sm font-semibold text-slate-900">
      Step 2: Find Patient
    </h4>

    <div className="space-y-3">
      <input
        placeholder="Search Name"
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={patientSearch.name}
        onChange={(e) =>
          setPatientSearch((prev) => ({ ...prev, name: e.target.value }))
        }
      />

      <input
        placeholder="Search MRN"
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={patientSearch.mrn}
        onChange={(e) =>
          setPatientSearch((prev) => ({ ...prev, mrn: e.target.value }))
        }
      />

      <input
        type="date"
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={patientSearch.dob}
        onChange={(e) =>
          setPatientSearch((prev) => ({ ...prev, dob: e.target.value }))
        }
      />

      <div className="max-h-40 overflow-y-auto border rounded-lg">
        {filteredPatientOptions.slice(0, 10).map((patient) => {
          const fullName = `${patient.firstName} ${patient.lastName}`;
          const latestEncounter = [...(patient.encounters || [])]
            .sort((a, b) => new Date(b.clinicDate) - new Date(a.clinicDate))[0];

          return (
            <button
              key={patient.id}
              type="button"
              onClick={() => {
                setNewEntry((prev) => ({
                  ...prev,
                  patientId: patient.id,
                  encounterId: latestEncounter?.id || "",
                  clinicDate:
                    nextProgramDates[prev.programType] || prev.clinicDate || "",
                }));

                setPatientSearch({ name: "", mrn: "", dob: "" });

                setTimeout(() => {
                  reasonRef.current?.focus();
                }, 0);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-100 ${
                newEntry.patientId === patient.id ? "bg-slate-200" : ""
              }`}
            >
              <div className="font-medium">{fullName}</div>
              <div className="text-xs text-slate-500">
                MRN: {patient.mrn || "—"} | DOB: {patient.dob || "—"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>

  {/* RIGHT: SELECTED + ENCOUNTER */}
  <div className="rounded-xl border border-slate-200 p-4">
    <h4 className="mb-4 text-sm font-semibold text-slate-900">
      Selected Patient
    </h4>

    {selectedPatient && (
      <div className="rounded-lg bg-slate-100 p-2 text-sm text-slate-800 mb-3">
        {selectedPatient.firstName} {selectedPatient.lastName}
      </div>
    )}

    <label className="mb-1 block text-sm font-medium text-slate-700">
      Encounter
    </label>

    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      value={newEntry.encounterId}
      onChange={(e) => {
        const encounterId = e.target.value;
        setNewEntry((prev) => ({
          ...prev,
          encounterId,
          clinicDate: prev.clinicDate || nextProgramDates[prev.programType] || "",
        }));
      }}
    >
      <option value="">Select encounter</option>
      {encounterOptions.map((encounter) => (
        <option key={encounter.id} value={encounter.id}>
          {encounter.clinicDate || "Unknown date"} —{" "}
          {encounter.chiefComplaint || "No chief complaint"}
        </option>
      ))}
    </select>
  </div>
</div>
<div className="flex items-center gap-3 py-2">
  <div className="h-[2px] flex-1 bg-slate-300"></div>
  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Scheduling & Tracking
  </span>
  <div className="h-[2px] flex-1 bg-slate-300"></div>
</div>
<div className="rounded-2xl bg-slate-50 p-4 space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">
  Clinic Scheduling
</h3>
        <div className="mb-6 flex flex-wrap gap-2">
          {PROGRAM_TYPES.map((type) => {
            const isActive = activeProgramTab === type;

            return (
              <button
                key={type}
                onClick={() => {
                  setActiveProgramTab(type);
                  setPatientSearch({ name: "", mrn: "", dob: "" });
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow border-2 border-slate-200">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {activeProgramTab} Scheduler
          </h3>

          {(() => {
            const program = activeProgramTab;
            const config = SPECIALTY_CAPACITY[program];
            const date = nextProgramDates[program];

            const entries = (groupedEntries[program] || []).filter(
              (e) => e.clinicDate === date
            );

            if (!date) {
              return <p className="text-sm text-slate-500">Set a clinic date first.</p>;
            }

            if (config.schedulingType === "timed") {
              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800">Primary Slots</h4>
                    {config.primarySlots.map((slot) => {
                      const assigned = entries.find(
                        (e) => e.appointmentSlot === slot && e.scheduleType === "primary"
                      );

                      return (
                        <div key={slot} className="flex justify-between border-b py-2">
                          <span>{slot}</span>
                          <span>{assigned?.patientName || "OPEN"}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-800">Backups</h4>
                    {Array.from({ length: config.backupCount }).map((_, i) => {
                      const backup = entries.filter(
                        (e) => e.scheduleType === "backup"
                      )[i];

                      return (
                        <div key={i} className="flex justify-between border-b py-2">
                          <span>Backup {i + 1}</span>
                          <span>{backup?.patientName || "OPEN"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          

            // COUNT-BASED (Derm, MH, Addiction)
            return (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-800">Scheduled</h4>
                  {Array.from({ length: config.primaryCount }).map((_, i) => {
                    const assigned = entries.filter(
                      (e) => e.scheduleType === "primary"
                    )[i];

                    return (
                      <div key={i} className="flex justify-between border-b py-2">
                        <span>{i + 1}</span>
                        <span>{assigned?.patientName || "OPEN"}</span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <h4 className="font-medium text-slate-800">Backups</h4>
                  {Array.from({ length: config.backupCount }).map((_, i) => {
                    const backup = entries.filter(
                      (e) => e.scheduleType === "backup"
                    )[i];

                    return (
                      <div key={i} className="flex justify-between border-b py-2">
                        <span>Backup {i + 1}</span>
                        <span>{backup?.patientName || "OPEN"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Specialty Interest Tracker
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Filter by Status
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">All statuses</option>
                {PROGRAM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Filter by Clinic Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.clinicDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    clinicDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    status: "",
                    clinicDate: "",
                  })
                }
                className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No program entries match the current filters.</p>
          ) : (
            <div className="space-y-6">
              {[activeProgramTab].map((programType) => {
                const entries = groupedEntries[programType] || [];

                return (
                  <div
                    key={programType}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-slate-900">
                        {programType}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {entries.length} {entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    {entries.length === 0 ? (
                      <p className="text-sm text-slate-500">No entries for this program.</p>
                    ) : (
                      <div className="space-y-5">
                        {entries.map((entry) => (

                          <div
                            key={entry.id}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Patient
                                </label>
                                <div className="text-sm font-medium text-slate-900">
                                  {entry.patientName}
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Program
                                </label>
                                <div className="text-sm text-slate-900">
                                  {entry.programType}
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Clinic Date
                                </label>
                                <div className="text-sm text-slate-900">
                                  {formatDisplayDate(entry.clinicDate)}
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Status
                                </label>
                                <select
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={entry.status}
                                  onChange={(e) =>
                                    updateEntry(entry.id, "status", e.target.value)
                                  }
                                >
                                  {PROGRAM_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Coordinator
                                </label>
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={entry.assignedCoordinator || ""}
                                  onChange={(e) =>
                                    updateEntry(
                                      entry.id,
                                      "assignedCoordinator",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                            </div>

                            <div className="mt-4">
                              <label className="mb-1 block text-xs font-medium text-slate-500">
                                Reason for Interest/CC
                              </label>
                              <input
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                value={entry.reason || ""}
                                onChange={(e) =>
                                  updateEntry(entry.id, "reason", e.target.value)
                                }
                              />
                            </div>

                            <div className="mt-4">
                              <label className="mb-1 block text-xs font-medium text-slate-500">
                                Notes
                              </label>
                              <textarea
                                className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                value={entry.notes || ""}
                                onChange={(e) =>
                                  updateEntry(entry.id, "notes", e.target.value)
                                }
                              />
                            </div>
                            {entry.programDetails && Object.keys(entry.programDetails).length > 0 && (
                              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                                <label className="mb-2 block text-xs font-medium text-slate-500">
                                  Program Details
                                </label>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {Object.entries(entry.programDetails).map(([key, value]) => (
                                    <div key={formatLabel(key)} className="text-sm text-slate-700">
                                      <span className="font-medium">{formatLabel(key)}:</span>{" "}
                                      {typeof value === "boolean"
                                        ? value
                                          ? "Yes"
                                          : "No"
                                        : value || "—"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
  <button
    onClick={() => updateEntry(entry.id, "scheduleType", "primary")}
    className="rounded bg-green-100 px-3 py-1 text-sm text-green-700"
  >
    Assign Primary
  </button>

  <button
    onClick={() => updateEntry(entry.id, "scheduleType", "backup")}
    className="rounded bg-yellow-100 px-3 py-1 text-sm text-yellow-700"
  >
    Assign Backup
  </button>

  {entry.programType === "Physical Therapy" && entry.scheduleType === "primary" && (
    <select
      className="rounded border px-2 py-1 text-sm"
      value={entry.appointmentSlot || ""}
      onChange={(e) =>
        updateEntry(entry.id, "appointmentSlot", e.target.value)
      }
    >
      <option value="">Select Slot</option>
      {SPECIALTY_CAPACITY["Physical Therapy"].primarySlots.map((slot) => (
        <option key={slot} value={slot}>
          {slot}
        </option>
      ))}
    </select>
  )}
</div>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                            >
                              Delete Entry
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
        </div>
      </div>
    </div>
  );
}