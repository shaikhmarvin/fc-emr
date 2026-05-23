export default function AllergyModal({
  showAllergyModal,
  selectedPatient,
  editingAllergyId,
  newAllergy,
  setNewAllergy,
  setShowAllergyModal,
  setEditingAllergyId,
  addOrUpdateAllergy,
  EMPTY_ALLERGY,
}) {
  if (!showAllergyModal || !selectedPatient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingAllergyId ? "Edit Allergy" : "Add Allergy"}
          </h3>
          <button
            onClick={() => {
              setShowAllergyModal(false);
              setEditingAllergyId(null);
              setNewAllergy(EMPTY_ALLERGY);
            }}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Allergen
            </label>
            <input
              type="text"
              value={newAllergy.allergen}
              onChange={(e) =>
                setNewAllergy((prev) => ({ ...prev, allergen: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
              placeholder="e.g. Penicillin"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reaction
            </label>
            <input
              type="text"
              value={newAllergy.reaction}
              onChange={(e) =>
                setNewAllergy((prev) => ({ ...prev, reaction: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
              placeholder="e.g. Rash"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Severity
            </label>
            <select
              value={newAllergy.severity}
              onChange={(e) =>
                setNewAllergy((prev) => ({ ...prev, severity: e.target.value }))
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select severity</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={newAllergy.notes}
              onChange={(e) =>
                setNewAllergy((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="min-h-[100px] w-full rounded-lg border p-3"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allergy-active"
              type="checkbox"
              checked={newAllergy.isActive}
              onChange={(e) =>
                setNewAllergy((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            <label htmlFor="allergy-active" className="text-sm text-slate-700">
              Active allergy
            </label>
          </div>

          <button
            onClick={addOrUpdateAllergy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
          >
            {editingAllergyId ? "Save Allergy" : "Add Allergy"}
          </button>
        </div>
      </div>
    </div>
  );
}