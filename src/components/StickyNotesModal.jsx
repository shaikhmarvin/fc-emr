import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createStickyNoteInSupabase,
  deleteStickyNoteInSupabase,
  fetchStickyNotes,
  updateStickyNoteInSupabase,
} from "../api/stickyNotes";
import { formatDate, getFullPatientName } from "../utils";

const EMPTY_NOTE_FORM = {
  title: "",
  body: "",
  patientId: "",
  color: "yellow",
};

const NOTE_COLORS = [
  { value: "yellow", label: "Yellow", className: "bg-yellow-50 border-yellow-200" },
  { value: "blue", label: "Blue", className: "bg-blue-50 border-blue-200" },
  { value: "green", label: "Green", className: "bg-emerald-50 border-emerald-200" },
  { value: "pink", label: "Pink", className: "bg-rose-50 border-rose-200" },
];

function getColorClass(color) {
  return NOTE_COLORS.find((item) => item.value === color)?.className || NOTE_COLORS[0].className;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getPatientLabel(patient) {
  return patient ? getFullPatientName(patient) : "";
}

function getStickyNotesErrorMessage(error) {
  const message = error?.message || "";

  if (
    message.includes("public.sticky_notes") ||
    message.toLowerCase().includes("schema cache")
  ) {
    return "Sticky notes are not set up in Supabase yet. Run the sticky_notes SQL migration, then refresh the app.";
  }

  return `Failed to load notes: ${message}`;
}

export default function StickyNotesModal({
  show,
  onClose,
  currentUserId,
  patients,
  initialPatientId,
  onOpenPatientChart,
}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientOptions, setShowPatientOptions] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [form, setForm] = useState(EMPTY_NOTE_FORM);
  const initializedOpenKeyRef = useRef("");

  const patientById = useMemo(() => {
    const map = new Map();
    (patients || []).forEach((patient) => {
      map.set(String(patient.id), patient);
    });
    return map;
  }, [patients]);

  const sortedPatients = useMemo(
    () =>
      [...(patients || [])].sort((a, b) =>
        getPatientLabel(a).localeCompare(getPatientLabel(b))
      ),
    [patients]
  );

  const selectedPatient = form.patientId ? patientById.get(String(form.patientId)) : null;

  const filteredPatientOptions = useMemo(() => {
    const query = normalize(patientSearch);

    return sortedPatients
      .filter((patient) => {
        if (!query) return true;

        const haystack = [
          getPatientLabel(patient),
          patient.dob || "",
          patient.mrn || "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .slice(0, 25);
  }, [patientSearch, sortedPatients]);

  const filteredNotes = useMemo(() => {
    const query = normalize(search);

    return notes.filter((note) => {
      if (!query) return true;

      const patient = note.patientId ? patientById.get(String(note.patientId)) : null;
      const haystack = [
        note.title,
        note.body,
        getPatientLabel(patient),
        patient?.dob || "",
        patient?.mrn || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [notes, patientById, search]);

  const loadNotes = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    setMessage("");

    try {
      const loaded = await fetchStickyNotes();
      setNotes(loaded);
    } catch (error) {
      console.error("Failed to load sticky notes:", error);
      setMessage(getStickyNotesErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const resetForm = useCallback((patientId = "") => {
    setEditingNoteId(null);
    setForm({
      ...EMPTY_NOTE_FORM,
      patientId: patientId || "",
    });
    const patient = patientId ? patientById.get(String(patientId)) : null;
    setPatientSearch(getPatientLabel(patient));
    setShowPatientOptions(false);
  }, [patientById]);

  useEffect(() => {
    if (!show) {
      initializedOpenKeyRef.current = "";
      return;
    }

    const openKey = String(initialPatientId || "");
    if (initializedOpenKeyRef.current === openKey) return;

    initializedOpenKeyRef.current = openKey;
    resetForm(initialPatientId || "");
  }, [show, initialPatientId, resetForm]);

  useEffect(() => {
    if (!show) return;

    loadNotes();
  }, [show, loadNotes]);

  async function saveNote() {
    const title = form.title.trim();
    const body = form.body.trim();

    if (!body) {
      setMessage("Enter a note before saving.");
      return;
    }

    if (!currentUserId) {
      setMessage("Sign in again before saving notes.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (editingNoteId) {
        const saved = await updateStickyNoteInSupabase(editingNoteId, {
          title,
          body,
          patientId: form.patientId || null,
          color: form.color,
        });

        setNotes((prev) =>
          prev.map((note) => (note.id === saved.id ? saved : note))
        );
      } else {
        const saved = await createStickyNoteInSupabase({
          userId: currentUserId,
          patientId: form.patientId || null,
          title,
          body,
          color: form.color,
        });

        setNotes((prev) => [saved, ...prev]);
      }

      resetForm(initialPatientId || "");
    } catch (error) {
      console.error("Failed to save sticky note:", error);
      setMessage(`Failed to save note: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    if (!window.confirm("Delete this sticky note?")) return;

    try {
      await deleteStickyNoteInSupabase(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));

      if (editingNoteId === noteId) {
        resetForm(initialPatientId || "");
      }
    } catch (error) {
      console.error("Failed to delete sticky note:", error);
      setMessage(`Failed to delete note: ${error.message}`);
    }
  }

  function startEdit(note) {
    setEditingNoteId(note.id);
    setForm({
      title: note.title || "",
      body: note.body || "",
      patientId: note.patientId || "",
      color: note.color || "yellow",
    });
    const patient = note.patientId ? patientById.get(String(note.patientId)) : null;
    setPatientSearch(getPatientLabel(patient));
    setShowPatientOptions(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Sticky Notes</h2>
            <p className="text-sm text-slate-500">
              Private to your account. Attach notes to a patient when useful.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[360px_1fr]">
          <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Example: Labs follow-up"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Note
                </label>
                <textarea
                  value={form.body}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, body: event.target.value }))
                  }
                  className="h-40 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Write a sticky note..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Attach to patient
                </label>
                <div className="relative">
                  <input
                    value={patientSearch}
                    onFocus={() => setShowPatientOptions(true)}
                    onBlur={() => window.setTimeout(() => setShowPatientOptions(false), 120)}
                    onChange={(event) => {
                      setPatientSearch(event.target.value);
                      setShowPatientOptions(true);
                      if (form.patientId && event.target.value !== getPatientLabel(selectedPatient)) {
                        setForm((prev) => ({ ...prev, patientId: "" }));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Type a patient name, DOB, or MRN"
                  />

                  {showPatientOptions ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, patientId: "" }));
                          setPatientSearch("");
                          setShowPatientOptions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        No patient attached
                      </button>

                      {filteredPatientOptions.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-slate-500">
                          No patients match that search.
                        </div>
                      ) : (
                        filteredPatientOptions.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, patientId: patient.id }));
                              setPatientSearch(getPatientLabel(patient));
                              setShowPatientOptions(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                          >
                            <span className="block font-medium text-slate-900">
                              {getPatientLabel(patient)}
                            </span>
                            <span className="text-xs text-slate-500">
                              DOB {patient.dob ? formatDate(patient.dob) : "-"} | MRN {patient.mrn || "-"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, color: color.value }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.color === color.value
                        ? "border-slate-900 text-slate-900"
                        : "border-slate-300 text-slate-600"
                        } ${color.className}`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {message ? (
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {message}
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
                </button>

                {editingNoteId ? (
                  <button
                    type="button"
                    onClick={() => resetForm(initialPatientId || "")}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    New
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-5">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Search title, note, patient name, DOB, or MRN
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Search sticky notes"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-sm text-slate-500">Loading notes...</p>
              ) : filteredNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  No sticky notes found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {filteredNotes.map((note) => {
                    const patient = note.patientId ? patientById.get(String(note.patientId)) : null;

                    return (
                      <div
                        key={note.id}
                        className={`rounded-xl border p-4 shadow-sm ${getColorClass(note.color)}`}
                      >
                        {note.title ? (
                          <h3 className="mb-2 text-base font-semibold text-slate-950">
                            {note.title}
                          </h3>
                        ) : (
                          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Untitled Note
                          </h3>
                        )}

                        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                          {note.body}
                        </div>

                        <div className="mt-4 space-y-1 text-xs text-slate-600">
                          {patient ? (
                            <button
                              type="button"
                              onClick={() => onOpenPatientChart?.(patient.id)}
                              className="text-left font-medium text-blue-700 hover:underline"
                            >
                              {getPatientLabel(patient)} | DOB {patient.dob ? formatDate(patient.dob) : "-"} | MRN {patient.mrn || "-"}
                            </button>
                          ) : (
                            <p>No patient attached</p>
                          )}

                          <p>
                            Updated {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : "-"}
                          </p>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(note)}
                            className="rounded-lg border border-slate-300 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote(note.id)}
                            className="rounded-lg border border-red-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-white"
                          >
                            Delete
                          </button>
                        </div>
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
  );
}
