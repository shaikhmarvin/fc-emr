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

  function closeModal() {
    setShowMedicationModal(false);
    setNewMedication(EMPTY_MEDICATION);
    setEditingMedicationId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingMedicationId !== null ? "Edit Medication" : "Add Medication"}
          </h3>
          <button
            onClick={closeModal}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Medication Name
            </label>
            <input
              type="text"
              value={newMedication.name}
              onChange={(e) =>
                setNewMedication((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
              placeholder="e.g. Metformin"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dosage
            </label>
            <input
              type="text"
              value={newMedication.dosage}
              onChange={(e) =>
                setNewMedication((prev) => ({ ...prev, dosage: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
              placeholder="e.g. 500 mg"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Frequency
            </label>
            <select
              value={newMedication.frequency}
              onChange={(e) =>
                setNewMedication((prev) => ({ ...prev, frequency: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select frequency</option>
              <option value="Daily">Daily</option>
              <option value="BID">BID</option>
              <option value="TID">TID</option>
              <option value="QID">QID</option>
              <option value="PRN">PRN</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Route
            </label>
            <select
              value={newMedication.route}
              onChange={(e) =>
                setNewMedication((prev) => ({ ...prev, route: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select route</option>
              <option value="Oral">Oral</option>
              <option value="IV">IV</option>
              <option value="IM">IM</option>
              <option value="Subcutaneous">Subcutaneous</option>
              <option value="Topical">Topical</option>
              <option value="Inhaled">Inhaled</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Dispense Amount (#)
              </label>
              <input
                type="number"
                value={newMedication.dispenseAmount}
                onChange={(e) =>
                  setNewMedication((prev) => ({
                    ...prev,
                    dispenseAmount: e.target.value,
                  }))
                }
                className="w-full rounded-lg border p-3"
                placeholder="e.g. 30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Refills
              </label>
              <input
                type="number"
                value={newMedication.refillCount}
                onChange={(e) =>
                  setNewMedication((prev) => ({
                    ...prev,
                    refillCount: e.target.value,
                  }))
                }
                className="w-full rounded-lg border p-3"
                placeholder="e.g. 2"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Instructions / Notes
            </label>
            <textarea
              value={newMedication.instructions}
              onChange={(e) =>
                setNewMedication((prev) => ({
                  ...prev,
                  instructions: e.target.value,
                }))
              }
              className="w-full rounded-lg border p-3"
              rows={3}
              placeholder="e.g. Take with food, 2 tabs in morning, PRN for pain"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="medication-active"
              type="checkbox"
              checked={newMedication.isActive}
              onChange={(e) =>
                setNewMedication((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
            />
            <label htmlFor="medication-active" className="text-sm text-slate-700">
              Active medication
            </label>
          </div>

          <button
            onClick={addOrUpdateMedication}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
          >
            {editingMedicationId !== null ? "Save Medication" : "Add Medication"}
          </button>
        </div>
      </div>
    </div>
  );
}