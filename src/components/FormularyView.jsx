import { useMemo, useState } from "react";

const EMPTY_FORMULARY_ITEM = {
  name: "",
  strength: "",
  dosageForm: "",
  use: "",
  inStock: true,
  notes: "",
};

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function StockBadge({ inStock, onClick, clickable = false }) {
  const badgeClass = inStock
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";

  if (clickable) {
    return (
      <button
        onClick={onClick}
        className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}
      >
        {inStock ? "In Stock" : "Out of Stock"}
      </button>
    );
  }

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}>
      {inStock ? "In Stock" : "Out of Stock"}
    </span>
  );
}

export default function FormularyView({
  formulary,
  onAddMedication,
  onEditMedication,
  onDeleteMedication,
  onToggleStock,
  onPrescribeMedication,
  selectedPatient,
  isLeadershipView,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_FORMULARY_ITEM);

  function resetModalState() {
    setShowModal(false);
    setEditingId(null);
    setItemForm(EMPTY_FORMULARY_ITEM);
  }

  function openNewMedication() {
    setEditingId(null);
    setItemForm(EMPTY_FORMULARY_ITEM);
    setShowModal(true);
  }

  function openEditMedication(item) {
    setEditingId(item.id);
    setItemForm({
      name: item.name || "",
      strength: item.strength || "",
      dosageForm: item.dosageForm || "",
      use: item.use || "",
      inStock: item.inStock ?? true,
      notes: item.notes || "",
    });
    setShowModal(true);
  }

  async function saveMedication() {
    if (!itemForm.name.trim()) return;

    try {
      if (editingId !== null) {
        await onEditMedication(editingId, itemForm);
      } else {
        await onAddMedication(itemForm);
      }

      resetModalState();
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save medication");
    }
  }

  async function deleteMedication(id) {
    try {
      await onDeleteMedication(id);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete medication");
    }
  }

  async function toggleStock(id) {
    try {
      await onToggleStock(id);
    } catch (error) {
      console.error("Toggle failed:", error);
      alert("Failed to update stock");
    }
  }

  const filteredFormulary = useMemo(() => {
  const filtered = formulary.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.strength || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.dosageForm || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.use || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in" && item.inStock) ||
      (stockFilter === "out" && !item.inStock);

    return matchesSearch && matchesStock;
  });

  // 🔥 ADD THIS SORT
  return filtered.sort((a, b) => {
    // 1. sort by name
    const nameCompare = (a.name || "").localeCompare(b.name || "");
    if (nameCompare !== 0) return nameCompare;

    // 2. extract numeric dose from strength
    const getDose = (med) => {
      const match = String(med.strength || "").match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    return getDose(a) - getDose(b);
  });

}, [formulary, searchTerm, stockFilter]);

  const inStockCount = formulary.filter((item) => item.inStock).length;
  const outOfStockCount = formulary.filter((item) => !item.inStock).length;

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
          <p className="text-sm text-slate-500">Total Medications</p>
          <p className="mt-2 text-2xl font-bold sm:text-3xl">{formulary.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
          <p className="text-sm text-slate-500">In Stock</p>
          <p className="mt-2 text-2xl font-bold text-green-600 sm:text-3xl">
            {inStockCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
          <p className="text-sm text-slate-500">Out of Stock</p>
          <p className="mt-2 text-2xl font-bold text-red-600 sm:text-3xl">
            {outOfStockCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Medication Formulary</h3>
            <p className="mt-1 text-sm text-slate-500">
              View and manage medications available through clinic pharmacy.
            </p>
          </div>
          {isLeadershipView && (
            <button
              onClick={openNewMedication}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto"
            >
              + Add Medication
            </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Search formulary">
            <input
              className="w-full rounded-lg border p-3"
              placeholder="Search medication, strength, dosage form, or use"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Field>

          <Field label="Stock filter">
            <select
              className="w-full rounded-lg border p-3"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in">In Stock Only</option>
              <option value="out">Out of Stock Only</option>
            </select>
          </Field>
        </div>

        <div className="space-y-3 sm:hidden">
          {filteredFormulary.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-slate-900">{item.name}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {[item.strength, item.dosageForm].filter(Boolean).join(" • ") || "No strength or dosage form"}
                  </p>
                </div>
                <StockBadge
                  inStock={item.inStock}
                  clickable={isLeadershipView}
                  onClick={() => toggleStock(item.id)}
                />
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>
                  <span className="font-medium text-slate-500">Use:</span>{" "}
                  {item.use || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-500">Notes:</span>{" "}
                  {item.notes || "—"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <button
                  onClick={() => onPrescribeMedication(item)}
                  disabled={!selectedPatient}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    selectedPatient
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  Add to Med List
                </button>

                {isLeadershipView ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditMedication(item)}
                      className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMedication(item.id)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">View only</div>
                )}
              </div>
            </div>
          ))}

          {filteredFormulary.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No formulary medications match the current filters.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Medication</th>
                <th className="p-3">Strength</th>
                <th className="p-3">Dosage Form</th>
                <th className="p-3">Use</th>
                <th className="p-3">Status</th>
                <th className="p-3">Notes</th>
                <th className="p-3">Actions</th>
                <th className="p-3">Prescribe</th>
              </tr>
            </thead>
            <tbody>
              {filteredFormulary.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.strength || "—"}</td>
                  <td className="p-3">{item.dosageForm || "—"}</td>
                  <td className="p-3">{item.use || "—"}</td>
                  <td className="p-3">
                    <StockBadge
                      inStock={item.inStock}
                      clickable={isLeadershipView}
                      onClick={() => toggleStock(item.id)}
                    />
                  </td>

                  <td className="p-3">{item.notes || "—"}</td>

                  <td className="p-3">
                    {isLeadershipView ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditMedication(item)}
                          className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMedication(item.id)}
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">View only</span>
                    )}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() => onPrescribeMedication(item)}
                      disabled={!selectedPatient}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        selectedPatient
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                      }`}
                    >
                      Add to Med List
                    </button>
                  </td>
                </tr>
              ))}

              {filteredFormulary.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={8}>
                    No formulary medications match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-semibold">
                {editingId !== null ? "Edit Medication" : "Add Medication"}
              </h3>
              <button onClick={resetModalState} className="rounded-lg border px-4 py-2">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Medication Name">
                <input
                  className="w-full rounded-lg border p-3"
                  placeholder="Medication Name"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </Field>

              <Field label="Strength">
                <input
                  className="w-full rounded-lg border p-3"
                  placeholder="Strength"
                  value={itemForm.strength}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, strength: e.target.value }))
                  }
                />
              </Field>

              <Field label="Dosage Form">
                <input
                  className="w-full rounded-lg border p-3"
                  placeholder="Dosage Form"
                  value={itemForm.dosageForm}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, dosageForm: e.target.value }))
                  }
                />
              </Field>

              <Field label="Use">
                <input
                  className="w-full rounded-lg border p-3"
                  placeholder="Use"
                  value={itemForm.use}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, use: e.target.value }))
                  }
                />
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <textarea
                  className="w-full rounded-lg border p-3"
                  rows="3"
                  placeholder="Notes"
                  value={itemForm.notes}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </Field>

              <div className="sm:col-span-2 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-slate-700">Stock Status</span>
                <button
                  onClick={() =>
                    setItemForm((prev) => ({
                      ...prev,
                      inStock: !prev.inStock,
                    }))
                  }
                  className={`rounded-full px-4 py-2 text-sm ${
                    itemForm.inStock
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {itemForm.inStock ? "In Stock" : "Out of Stock"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={resetModalState} className="rounded-lg border px-4 py-2">
                Cancel
              </button>

              <button
                onClick={saveMedication}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {editingId !== null ? "Save Changes" : "Add Medication"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
