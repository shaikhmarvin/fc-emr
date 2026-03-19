export default function MedicationModal({
  showMedicationModal,
  selectedPatient,
  editingMedicationId,
  newMedication,
  setNewMedication,
  setShowMedicationModal,
  setEditingMedicationId,
  addOrUpdateMedication,
  EMPTY_MEDICATION,
}) {
  if (!showMedicationModal || !selectedPatient) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            {editingMedicationId !== null ? "Edit Medication" : "Add Medication"}
          </h3>
          <button
            onClick={() => {
              setShowMedicationModal(false);
              setNewMedication(EMPTY_MEDICATION);
              setEditingMedicationId(null);
            }}
            className="rounded-lg border px-4 py-2"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Medication Name"
            value={newMedication.name}
            onChange={(e) =>
              setNewMedication((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Dosage"
            value={newMedication.dosage}
            onChange={(e) =>
              setNewMedication((prev) => ({ ...prev, dosage: e.target.value }))
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Frequency"
            value={newMedication.frequency}
            onChange={(e) =>
              setNewMedication((prev) => ({ ...prev, frequency: e.target.value }))
            }
          />

          <select
            className="w-full rounded-lg border p-3"
            value={newMedication.route}
            onChange={(e) =>
              setNewMedication((prev) => ({ ...prev, route: e.target.value }))
            }
          >
            <option value="">Route of Administration</option>
            <option>Oral</option>
            <option>IV</option>
            <option>IM</option>
            <option>Subcutaneous</option>
            <option>Topical</option>
            <option>Inhaled</option>
            <option>Other</option>
          </select>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="font-medium text-slate-700">Medication Active</span>
            <button
              onClick={() =>
                setNewMedication((prev) => ({
                  ...prev,
                  isActive: !prev.isActive,
                }))
              }
              className={`rounded-full px-4 py-2 text-sm ${
                newMedication.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {newMedication.isActive ? "Active" : "Inactive"}
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowMedicationModal(false);
                setNewMedication(EMPTY_MEDICATION);
                setEditingMedicationId(null);
              }}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              onClick={addOrUpdateMedication}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {editingMedicationId !== null ? "Update Medication" : "Save Medication"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}