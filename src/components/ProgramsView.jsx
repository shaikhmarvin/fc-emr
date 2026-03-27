import { useEffect, useMemo, useState } from "react";
import { PT_TIME_SLOTS, ROOM_OPTIONS } from "../constants";
import { fetchProgramSettings, updateProgramSetting } from "../api/programSettings";

const PROGRAM_TYPES = [
  "Physical Therapy",
  "Dermatology",
  "Ophthalmology",
  "Mental Health",
  "Counseling",
  "Addiction Medicine",
  "Mammogram"

];

const PROGRAM_STATUSES = [
  "New Referral",
  "Attempted Contact",
  "Scheduled",
  "Backup",
  "Completed",
  "Unable to Reach",
  "Declined",
];

export default function ProgramsView({
  programEntries,
  addProgramEntry,
  updateProgramEntry,
  removeProgramEntry,
  patients,
  selectedClinicDate,
  leadershipOptions = [],
}) {
  const [activeTab, setActiveTab] = useState("Tracker");

  const [nextProgramDates, setNextProgramDates] = useState({});

  const [patientSearch, setPatientSearch] = useState({
    name: "",
    mrn: "",
    dob: "",
  });

  const [filters, setFilters] = useState({
    patient: "",
    dob: "",
    programType: "",
  });

  const [specialtyFilters, setSpecialtyFilters] = useState(
  PROGRAM_TYPES.reduce((acc, type) => {
    acc[type] = { patient: "", dob: "" };
    return acc;
  }, {})
);

  const [expandedEntryIds, setExpandedEntryIds] = useState([]);
  const [showAddReferral, setShowAddReferral] = useState(false);

  const [newEntry, setNewEntry] = useState({
    patientId: "",
    patientName: "",
    mrn: "",
    dob: "",
    phone: "",
    programType: "Physical Therapy",
    reason: "",
    assignedCoordinator: "",
    status: "New Referral",
    notes: "",
    specialtyDate: selectedClinicDate || "",
    scheduleType: "",
    schedulePosition: null,
    appointmentSlot: "",
  });

  const filteredPatientOptions = useMemo(() => {
    return patients
      .filter((patient) => {
        const fullName =
          `${patient.firstName || ""} ${patient.lastName || ""}`.trim().toLowerCase();

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

  const [programSettings, setProgramSettings] = useState([]);
  const [editingSettings, setEditingSettings] = useState({});
  const [programRooms, setProgramRooms] = useState({});

  useEffect(() => {
    loadProgramSettings();
  }, []);

  async function loadProgramSettings() {
    const data = await fetchProgramSettings();
    const rows = data || [];

    setProgramSettings(rows);

    setNextProgramDates(
      rows.reduce((acc, row) => {
        acc[row.program_type] = row.next_specialty_date || "";
        return acc;
      }, {})
    );
    setProgramRooms(
  rows.reduce((acc, row) => {
    acc[row.program_type] = row.rooms_assigned?.rooms || [];
    return acc;
  }, {})
);
  }

  const trackerEntries = useMemo(() => {
    return programEntries
      .filter((entry) => {
        const patientText = (entry.patientName || "").toLowerCase();

        const matchesPatient =
          !filters.patient ||
          patientText.includes(filters.patient.toLowerCase());

        const matchesDob =
          !filters.dob || entry.dob === filters.dob;

        const matchesProgram =
          !filters.programType || entry.programType === filters.programType;

        return matchesPatient && matchesDob && matchesProgram;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [programEntries, filters]);

  const specialtyEntries = useMemo(() => {
    return PROGRAM_TYPES.reduce((acc, type) => {
      acc[type] = programEntries
        .filter((entry) => entry.programType === type)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return acc;
    }, {});
  }, [programEntries]);

  function handleSelectPatient(patient) {
    setNewEntry((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      mrn: patient.mrn || "",
      dob: patient.dob || "",
      phone: patient.phone || "",
      specialtyDate: nextProgramDates[prev.programType] || prev.specialtyDate || "",
    }));

    setPatientSearch({ name: "", mrn: "", dob: "" });
  }

  function handleAddEntry() {
    if (
      !newEntry.patientId ||
      !newEntry.patientName ||
      !newEntry.programType ||
      !newEntry.reason.trim() ||
      !newEntry.assignedCoordinator.trim()
    ) {
      alert("Please fill out patient, program, reason, and coordinator.");
      return;
    }

    const entry = {
      id: Date.now(),
      patientId: newEntry.patientId,
      patientName: newEntry.patientName,
      mrn: newEntry.mrn,
      dob: newEntry.dob,
      phone: newEntry.phone,
      programType: newEntry.programType,
      reason: newEntry.reason,
      assignedCoordinator: newEntry.assignedCoordinator,
      status: newEntry.status,
      specialtyDate: newEntry.specialtyDate,
      scheduleType: "",
      schedulePosition: null,
      appointmentSlot: "",
      notes: newEntry.notes,
      createdAt: new Date().toISOString(),
    };

    addProgramEntry(entry);
    setActiveTab(entry.programType);

    setNewEntry({
      patientId: "",
      patientName: "",
      mrn: "",
      dob: "",
      phone: "",
      programType: "Physical Therapy",
      reason: "",
      assignedCoordinator: "",
      status: "New Referral",
      notes: "",
      specialtyDate: nextProgramDates["Physical Therapy"] || "",
      scheduleType: "",
      schedulePosition: null,
      appointmentSlot: "",
    });
  }

  function getProgramConfig(type) {
    const setting = programSettings.find((p) => p.program_type === type);

    if (!setting) {
      if (type === "Physical Therapy") {
        return {
          schedulingType: "timed",
          primarySlots: PT_TIME_SLOTS,
          primaryCount: PT_TIME_SLOTS.length,
          backupCount: 3,
        };
      }

      if (type === "Dermatology") {
        return {
          schedulingType: "count",
          primaryCount: 7,
          backupCount: 3,
        };
      }

      if (type === "Ophthalmology") {
        return {
          schedulingType: "count",
          primaryCount: 8,
          backupCount: 3,
        };
      }

      if (type === "Mental Health") {
        return {
          schedulingType: "count",
          primaryCount: 8,
          backupCount: 3,
        };
      }

      if (type === "Counseling") {
        return {
          schedulingType: "count",
          primaryCount: 8,
          backupCount: 3,
        };
      }

      if (type === "Addiction Medicine") {
        return {
          schedulingType: "count",
          primaryCount: 8,
          backupCount: 3,
        };
      }
    }

    return {
      schedulingType: type === "Physical Therapy" ? "timed" : "count",
      primaryCount: setting?.primary_count ?? 0,
      backupCount: setting?.backup_count ?? 0,
      primarySlots:
        type === "Physical Therapy"
          ? setting?.pt_slots?.length
            ? setting.pt_slots
            : PT_TIME_SLOTS
          : [],
    };
  }

  function handleDeleteEntry(entryId) {
    const confirmed = window.confirm("Delete this referral entry?");
    if (!confirmed) return;
    removeProgramEntry(entryId);
  }

  function handleAssignPrimary(entry, slotOrPosition) {
    if (entry.programType === "Physical Therapy") {
      const conflict = programEntries.some(
        (item) =>
          item.id !== entry.id &&
          item.programType === "Physical Therapy" &&
          item.specialtyDate === (entry.specialtyDate || nextProgramDates["Physical Therapy"]) &&
          item.scheduleType === "primary" &&
          item.appointmentSlot === slotOrPosition
      );

      if (conflict) {
        alert("That PT slot is already taken.");
        return;
      }

      updateProgramEntry(entry.id, "specialtyDate", entry.specialtyDate || nextProgramDates["Physical Therapy"] || "");
      updateProgramEntry(entry.id, "scheduleType", "primary");
      updateProgramEntry(entry.id, "schedulePosition", null);
      updateProgramEntry(entry.id, "appointmentSlot", slotOrPosition);
      updateProgramEntry(entry.id, "status", "Scheduled");
      return;
    }

    const config = getProgramConfig(entry.programType);
    const conflict = programEntries.some(
      (item) =>
        item.id !== entry.id &&
        item.programType === entry.programType &&
        item.specialtyDate === (entry.specialtyDate || nextProgramDates[entry.programType]) &&
        item.scheduleType === "primary" &&
        item.schedulePosition === slotOrPosition
    );

    if (conflict) {
      alert("That primary slot is already taken.");
      return;
    }

    updateProgramEntry(entry.id, "specialtyDate", entry.specialtyDate || nextProgramDates[entry.programType] || "");
    updateProgramEntry(entry.id, "scheduleType", "primary");
    updateProgramEntry(entry.id, "schedulePosition", slotOrPosition);
    updateProgramEntry(entry.id, "appointmentSlot", "");
    updateProgramEntry(entry.id, "status", "Scheduled");
  }

  function handleAssignBackup(entry, backupPosition) {
    const conflict = programEntries.some(
      (item) =>
        item.id !== entry.id &&
        item.programType === entry.programType &&
        item.specialtyDate === (entry.specialtyDate || nextProgramDates[entry.programType]) &&
        item.scheduleType === "backup" &&
        item.schedulePosition === backupPosition
    );

    if (conflict) {
      alert("That backup slot is already taken.");
      return;
    }

    updateProgramEntry(entry.id, "specialtyDate", entry.specialtyDate || nextProgramDates[entry.programType] || "");
    updateProgramEntry(entry.id, "scheduleType", "backup");
    updateProgramEntry(entry.id, "schedulePosition", backupPosition);
    updateProgramEntry(entry.id, "appointmentSlot", "");
    updateProgramEntry(entry.id, "status", "Backup");
  }

  function handleUnassign(entry) {
    updateProgramEntry(entry.id, "scheduleType", "");
    updateProgramEntry(entry.id, "schedulePosition", null);
    updateProgramEntry(entry.id, "appointmentSlot", "");
    if (entry.status === "Scheduled" || entry.status === "Backup") {
      updateProgramEntry(entry.id, "status", "Attempted Contact");
    }
  }

  function formatDisplayDate(date) {
    if (!date) return "—";
    const [year, month, day] = String(date).split("-");
    if (!year || !month || !day) return date;
    return `${month}/${day}/${year}`;
  }

  function renderTracker() {
    return (
      <div className="space-y-6">
        <Card>
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-slate-900">
        Add Referral Entry
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Create a new specialty referral from intake.
      </p>
    </div>

    <button
      onClick={() => setShowAddReferral((prev) => !prev)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        showAddReferral
          ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
          : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      {showAddReferral ? "Hide Form" : "+ Add New Entry"}
    </button>
  </div>

  {showAddReferral && (
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
          Referral Details
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

          <Field label="DOB">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              value={newEntry.dob}
              readOnly
            />
          </Field>

          <Field label="Program Type">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.programType}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  programType: e.target.value,
                  specialtyDate:
                    nextProgramDates[e.target.value] || prev.specialtyDate,
                }))
              }
            >
              {PROGRAM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Coordinator">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.assignedCoordinator}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  assignedCoordinator: e.target.value,
                }))
              }
            >
              <option value="">Select coordinator</option>
              {leadershipOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.status}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              {PROGRAM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Specialty Date">
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.specialtyDate}
              onChange={(e) =>
                setNewEntry((prev) => ({
                  ...prev,
                  specialtyDate: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Reason" className="md:col-span-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.reason}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <textarea
              className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newEntry.notes}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="mt-4">
          <button
            onClick={handleAddEntry}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add Referral
          </button>
        </div>
      </div>
    </div>
  )}
</Card>

        <Card>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Search Patient">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.patient}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, patient: e.target.value }))
                }
              />
            </Field>

            <Field label="Search DOB">
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.dob}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dob: e.target.value }))
                }
              />
            </Field>

            <Field label="Program">
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.programType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, programType: e.target.value }))
                }
              >
                <option value="">All programs</option>
                {PROGRAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({ patient: "", dob: "", programType: "" })
                }
                className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {trackerEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No referral entries found.</p>
          ) : (
            <div className="space-y-4">
              {trackerEntries.map((entry) => {
                const isExpanded = expandedEntryIds.includes(entry.id);

                return (
                  <div
                    key={entry.id}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 border-l-4 ${getStatusBorderColor(
                      entry.status
                    )}`}
                  >
                    {/* COLLAPSED HEADER */}
                    <button
                      onClick={() =>
                        setExpandedEntryIds((prev) =>
                          prev.includes(entry.id)
                            ? prev.filter((id) => id !== entry.id)
                            : [...prev, entry.id]
                        )
                      }
                      className="w-full text-left"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                        <ReadOnlyField label="Patient" value={entry.patientName} />
                        <ReadOnlyField label="Phone" value={entry.phone || "—"} />
                        <ReadOnlyField label="Program" value={entry.programType} />

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Status
                          </label>
                          <StatusBadge status={entry.status} />
                        </div>

                        <ReadOnlyField
                          label="Specialty Date"
                          value={formatDisplayDate(entry.specialtyDate)}
                        />
                      </div>
                    </button>

                    {/* EXPANDED CONTENT */}
                    {isExpanded && (
                      <>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <ReadOnlyField label="MRN" value={entry.mrn || "—"} />
                          <ReadOnlyField label="DOB" value={entry.dob || "—"} />

                          <Field label="Coordinator">
                            <select
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.assignedCoordinator || ""}
                              onChange={(e) =>
                                updateProgramEntry(
                                  entry.id,
                                  "assignedCoordinator",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">Select coordinator</option>
                              {leadershipOptions.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Specialty Date">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.specialtyDate || ""}
                              onChange={(e) =>
                                updateProgramEntry(entry.id, "specialtyDate", e.target.value)
                              }
                            />
                          </Field>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Status
                            </label>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={entry.status} />
                              <select
                                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                value={entry.status}
                                onChange={(e) =>
                                  updateProgramEntry(entry.id, "status", e.target.value)
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
                        </div>

                        <div className="mt-4">
                          <Field label="Reason">
                            <input
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.reason || ""}
                              onChange={(e) =>
                                updateProgramEntry(entry.id, "reason", e.target.value)
                              }
                            />
                          </Field>
                        </div>

                        <div className="mt-4">
                          <Field label="Notes">
                            <textarea
                              className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={entry.notes || ""}
                              onChange={(e) =>
                                updateProgramEntry(entry.id, "notes", e.target.value)
                              }
                            />
                          </Field>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => setActiveTab(entry.programType)}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Open {entry.programType}
                          </button>

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

  function renderSpecialtyTab(programType) {
    const config = getProgramConfig(programType);
    const specialtyDate = nextProgramDates[programType] || "";

    const currentFilters = specialtyFilters[programType] || {
  patient: "",
  dob: "",
};

const entries = (specialtyEntries[programType] || []).filter((entry) => {
  const matchesDate =
    !specialtyDate || entry.specialtyDate === specialtyDate;

  const patientText = (entry.patientName || "").toLowerCase();

  const matchesPatient =
    !currentFilters.patient ||
    patientText.includes(currentFilters.patient.toLowerCase());

  const matchesDob =
    !currentFilters.dob || entry.dob === currentFilters.dob;

  return matchesDate && matchesPatient && matchesDob;
});

    const unscheduledEntries = entries.filter(
      (entry) => !entry.scheduleType && entry.status !== "Completed" && entry.status !== "Declined"
    );

    const primaryEntries = entries.filter((entry) => entry.scheduleType === "primary");
    const backupEntries = entries.filter((entry) => entry.scheduleType === "backup");

    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={`Next ${programType} Date`}>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={nextProgramDates[programType] || ""}
                  onChange={async (e) => {
                    const value = e.target.value;

                    setNextProgramDates((prev) => ({
                      ...prev,
                      [programType]: value,
                    }));

                    await updateProgramSetting(programType, {
                      next_specialty_date: value,
                    });

                    await loadProgramSettings();
                  }}
                />
              </Field>

              <ReadOnlyField
                label="Primary Capacity"
                value={
                  config.schedulingType === "timed"
                    ? `${config.primarySlots.length} slots`
                    : `${config.primaryCount} spots`
                }
              />

              <ReadOnlyField
                label="Backup Capacity"
                value={`${config.backupCount} spots`}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">
                Edit Capacity
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {programType === "Physical Therapy" ? (
                  <Field label="PT Slots (comma separated)">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={
                        editingSettings[programType]?.pt_slots?.join(", ") ??
                        config.primarySlots.join(", ")
                      }
                      onChange={(e) =>
                        setEditingSettings((prev) => ({
                          ...prev,
                          [programType]: {
                            ...prev[programType],
                            pt_slots: e.target.value
                              .split(",")
                              .map((slot) => slot.trim())
                              .filter(Boolean),
                          },
                        }))
                      }
                    />
                  </Field>
                ) : (
                  <Field label="Primary Count">
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={
                        editingSettings[programType]?.primary_count ??
                        config.primaryCount
                      }
                      onChange={(e) =>
                        setEditingSettings((prev) => ({
                          ...prev,
                          [programType]: {
                            ...prev[programType],
                            primary_count: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </Field>
                )}

                <Field label="Backup Count">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={
                      editingSettings[programType]?.backup_count ??
                      config.backupCount
                    }
                    onChange={(e) =>
                      setEditingSettings((prev) => ({
                        ...prev,
                        [programType]: {
                          ...prev[programType],
                          backup_count: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      const updates = editingSettings[programType];
                      if (!updates) return;

                      await updateProgramSetting(programType, updates);
                      await loadProgramSettings();

                      setEditingSettings((prev) => {
                        const copy = { ...prev };
                        delete copy[programType];
                        return copy;
                      });
                    }}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save Capacity
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
  <h4 className="mb-3 text-sm font-semibold text-slate-900">
    Assigned Rooms
  </h4>

  <div className="flex flex-wrap gap-2">
    {ROOM_OPTIONS.map((room) => {
      const isSelected = (programRooms[programType] || []).includes(room.number);

      return (
        <button
          key={room.number}
          onClick={() => {
            const current = programRooms[programType] || [];

            const updated = isSelected
              ? current.filter((r) => r !== room.number)
              : [...current, room.number];

            setProgramRooms((prev) => ({
              ...prev,
              [programType]: updated,
            }));
          }}
          className={`px-3 py-2 rounded-lg text-sm border ${
            isSelected
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          {room.label}
        </button>
      );
    })}
  </div>

  <button
    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
    onClick={async () => {
      await updateProgramSetting(programType, {
        rooms_assigned: {
          rooms: programRooms[programType] || [],
        },
      });
      await loadProgramSettings();
    }}
  >
    Save Rooms
  </button>
</div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Unscheduled {programType} Referrals
          </h3>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
  <Field label="Search Patient">
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      value={specialtyFilters[programType]?.patient || ""}
      onChange={(e) =>
        setSpecialtyFilters((prev) => ({
          ...prev,
          [programType]: {
            ...prev[programType],
            patient: e.target.value,
          },
        }))
      }
    />
  </Field>

  <Field label="Search DOB">
    <input
      type="date"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      value={specialtyFilters[programType]?.dob || ""}
      onChange={(e) =>
        setSpecialtyFilters((prev) => ({
          ...prev,
          [programType]: {
            ...prev[programType],
            dob: e.target.value,
          },
        }))
      }
    />
  </Field>

  <div className="flex items-end">
    <button
      onClick={() =>
        setSpecialtyFilters((prev) => ({
          ...prev,
          [programType]: { patient: "", dob: "" },
        }))
      }
      className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
    >
      Clear Filters
    </button>
  </div>
</div>

          {unscheduledEntries.length === 0 ? (
  <p className="text-sm text-slate-500">No unscheduled referrals.</p>
) : (
  <div className="space-y-3">
    {unscheduledEntries.map((entry) => {
      const isExpanded = expandedEntryIds.includes(entry.id);

      return (
        <div
          key={entry.id}
          className={`rounded-2xl border border-slate-200 bg-white p-4 border-l-4 ${getStatusBorderColor(
            entry.status
          )}`}
        >
          <button
            onClick={() =>
              setExpandedEntryIds((prev) =>
                prev.includes(entry.id)
                  ? prev.filter((id) => id !== entry.id)
                  : [...prev, entry.id]
              )
            }
            className="w-full text-left"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <ReadOnlyField label="Patient" value={entry.patientName} />
              <ReadOnlyField label="Phone" value={entry.phone || "—"} />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <StatusBadge status={entry.status} />
              </div>

              <ReadOnlyField label="Reason" value={entry.reason || "—"} />
            </div>
          </button>

          {isExpanded && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ReadOnlyField label="MRN" value={entry.mrn || "—"} />
                <ReadOnlyField label="DOB" value={entry.dob || "—"} />

                <Field label="Coordinator">
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={entry.assignedCoordinator || ""}
                    onChange={(e) =>
                      updateProgramEntry(
                        entry.id,
                        "assignedCoordinator",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Select coordinator</option>
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
                    <StatusBadge status={entry.status} />
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      value={entry.status}
                      onChange={(e) =>
                        updateProgramEntry(entry.id, "status", e.target.value)
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
              </div>

              <div className="mt-4">
                <Field label="Notes">
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={entry.notes || ""}
                    onChange={(e) =>
                      updateProgramEntry(entry.id, "notes", e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {config.schedulingType === "timed" ? (
                  config.primarySlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleAssignPrimary(entry, slot)}
                      className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
                    >
                      Assign {slot}
                    </button>
                  ))
                ) : (
                  Array.from({ length: config.primaryCount }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handleAssignPrimary(entry, i + 1)}
                      className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
                    >
                      Primary {i + 1}
                    </button>
                  ))
                )}

                {Array.from({ length: config.backupCount }).map((_, i) => (
                  <button
                    key={`backup-${i + 1}`}
                    onClick={() => handleAssignBackup(entry, i + 1)}
                    className="rounded-lg bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200"
                  >
                    Backup {i + 1}
                  </button>
                ))}

                <button
                  onClick={() =>
                    updateProgramEntry(entry.id, "status", "Declined")
                  }
                  className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                >
                  Declined
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

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {programType} Scheduler
          </h3>

          {!specialtyDate ? (
            <p className="text-sm text-slate-500">Set a specialty date first.</p>
          ) : config.schedulingType === "timed" ? (
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Primary Slots
                </h4>
                <div className="space-y-2">
                  {config.primarySlots.map((slot) => {
                    const assigned = primaryEntries.find(
                      (entry) => entry.appointmentSlot === slot
                    );

                    return (
                      <SchedulerRow
                        key={slot}
                        label={slot}
                        entry={assigned}
                        onUnassign={handleUnassign}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Backups
                </h4>
                <div className="space-y-2">
                  {Array.from({ length: config.backupCount }).map((_, i) => {
                    const assigned = backupEntries.find(
                      (entry) => entry.schedulePosition === i + 1
                    );

                    return (
                      <SchedulerRow
                        key={i + 1}
                        label={`Backup ${i + 1}`}
                        entry={assigned}
                        onUnassign={handleUnassign}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Primary List
                </h4>
                <div className="space-y-2">
                  {Array.from({ length: config.primaryCount }).map((_, i) => {
                    const assigned = primaryEntries.find(
                      (entry) => entry.schedulePosition === i + 1
                    );

                    return (
                      <SchedulerRow
                        key={i + 1}
                        label={`Primary ${i + 1}`}
                        entry={assigned}
                        onUnassign={handleUnassign}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Backup List
                </h4>
                <div className="space-y-2">
                  {Array.from({ length: config.backupCount }).map((_, i) => {
                    const assigned = backupEntries.find(
                      (entry) => entry.schedulePosition === i + 1
                    );

                    return (
                      <SchedulerRow
                        key={i + 1}
                        label={`Backup ${i + 1}`}
                        entry={assigned}
                        onUnassign={handleUnassign}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">
          Specialty Referral Tracker
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Track specialty referrals, outreach, and scheduling.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {["Tracker", ...PROGRAM_TYPES].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isActive
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === "Tracker" ? renderTracker() : renderSpecialtyTab(activeTab)}
    </div>
  );
}

function getStatusStyles(status) {
  switch (status) {
    case "New Referral":
      return "bg-slate-100 text-slate-700";
    case "Attempted Contact":
      return "bg-blue-100 text-blue-700";
    case "Scheduled":
      return "bg-green-100 text-green-700";
    case "Backup":
      return "bg-yellow-100 text-yellow-700";
    case "Unable to Reach":
      return "bg-orange-100 text-orange-700";
    case "Declined":
      return "bg-red-100 text-red-700";
    case "Completed":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBorderColor(status) {
  switch (status) {
    case "New Referral":
      return "border-l-slate-400";
    case "Attempted Contact":
      return "border-l-blue-400";
    case "Scheduled":
      return "border-l-green-500";
    case "Backup":
      return "border-l-yellow-400";
    case "Unable to Reach":
      return "border-l-orange-400";
    case "Declined":
      return "border-l-red-500";
    case "Completed":
      return "border-l-slate-500";
    default:
      return "border-l-slate-300";
  }
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyles(
        status
      )}`}
    >
      {status || "—"}
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

function SchedulerRow({ label, entry, onUnassign }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-sm text-slate-600 flex items-center gap-2">
          {entry ? (
            <>
              <span>{entry.patientName} • {entry.phone || "No phone"}</span>
              <StatusBadge status={entry.status} />
            </>
          ) : (
            "OPEN"
          )}
        </div>
      </div>

      {entry ? (
        <button
          onClick={() => onUnassign(entry)}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}