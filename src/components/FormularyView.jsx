import { useMemo, useState } from "react";

const EMPTY_FORMULARY_ITEM = {
  name: "",
  strength: "",
  dosageForm: "",
  use: "",
  inStock: true,
  notes: "",
};

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

    setShowModal(false);
    setEditingId(null);
    setItemForm(EMPTY_FORMULARY_ITEM);
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
        return formulary.filter((item) => {
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
  }, [formulary, searchTerm, stockFilter]);

  const inStockCount = formulary.filter((item) => item.inStock).length;
  const outOfStockCount = formulary.filter((item) => !item.inStock).length;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Total Medications</p>
          <p className="mt-2 text-3xl font-bold">{formulary.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">In Stock</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{inStockCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Out of Stock</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{outOfStockCount}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Medication Formulary</h3>
            <p className="mt-1 text-sm text-slate-500">
              View and manage medications available through clinic pharmacy.
            </p>
          </div>
          {isLeadershipView && (
          <button
            onClick={openNewMedication}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Add Medication
          </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <input
            className="rounded-lg border p-3"
            placeholder="Search medication, strength, dosage form, or use"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="rounded-lg border p-3"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All Stock Statuses</option>
            <option value="in">In Stock Only</option>
            <option value="out">Out of Stock Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
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
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.strength || "—"}</td>
                  <td className="p-3">{item.dosageForm || "—"}</td>
                  <td className="p-3">{item.use || "—"}</td>
                  <td className="p-3">
                    {isLeadershipView ? (
                      <button
                        onClick={() => toggleStock(item.id)}
                        className={`rounded-full px-3 py-1 text-sm font-medium ${item.inStock
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {item.inStock ? "In Stock" : "Out of Stock"}
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${item.inStock
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {item.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    )}
                  </td>

                  <td className="p-3">{item.notes || "—"}</td>

                  <td className="p-3">
                    {isLeadershipView ? (
                      <div className="flex gap-2">
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
                      className={`rounded-lg px-3 py-2 text-sm ${selectedPatient
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                        }`}
                    >
                      Prescribe
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                {editingId !== null ? "Edit Medication" : "Add Medication"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setItemForm(EMPTY_FORMULARY_ITEM);
                }}
                className="rounded-lg border px-4 py-2"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="rounded-lg border p-3"
                placeholder="Medication Name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Strength"
                value={itemForm.strength}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, strength: e.target.value }))
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Dosage Form"
                value={itemForm.dosageForm}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, dosageForm: e.target.value }))
                }
              />

              <input
                className="rounded-lg border p-3"
                placeholder="Use"
                value={itemForm.use}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, use: e.target.value }))
                }
              />

              <textarea
                className="col-span-2 rounded-lg border p-3"
                rows="3"
                placeholder="Notes"
                value={itemForm.notes}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />

              <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium text-slate-700">Stock Status</span>
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setItemForm(EMPTY_FORMULARY_ITEM);
                }}
                className="rounded-lg border px-4 py-2"
              >
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