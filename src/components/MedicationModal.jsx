import { useEffect, useMemo, useRef } from "react";

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
  isRefillRequestMode,
}) {
  if (!showMedicationModal || !selectedPatient) return null;

  const primaryInputRef = useRef(null);

  useEffect(() => {
    if (!showMedicationModal) return;
    const timer = window.setTimeout(() => {
      primaryInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [showMedicationModal, isRefillRequestMode]);

  function closeModal() {
    setShowMedicationModal(false);
    setNewMedication(EMPTY_MEDICATION);
    setEditingMedicationId(null);
  }

  function getDosesPerDay(frequency) {
    switch ((frequency || "").toLowerCase()) {
      case "daily":
        return 1;
      case "bid":
        return 2;
      case "tid":
        return 3;
      case "qid":
        return 4;
      case "weekly":
        return 1 / 7;
      default:
        return null;
    }
  }

  function getPresetDispense(days) {
    const dosesPerDay = getDosesPerDay(newMedication.frequency);
    if (!dosesPerDay || dosesPerDay <= 0) return "";
    return String(Math.round(days * dosesPerDay));
  }

  function applySupplyPreset(days) {
    const nextDispense = getPresetDispense(days);
    if (!nextDispense) return;

    setNewMedication((prev) => ({
      ...prev,
      dispenseAmount: nextDispense,
    }));
  }

  const estimatedDaysUntilRefill = useMemo(() => {
    const dispense = Number(newMedication.dispenseAmount);
    const dosesPerDay = getDosesPerDay(newMedication.frequency);

    if (!dispense || !dosesPerDay || dosesPerDay <= 0) return "";
    const daysSupply = Math.floor(dispense / dosesPerDay);

    return daysSupply > 0 ? String(daysSupply) : "";
  }, [newMedication.dispenseAmount, newMedication.frequency]);

  const estimatedTotalDaysCovered = useMemo(() => {
    const daysUntilRefill = Number(estimatedDaysUntilRefill);
    const refillCount = Number(newMedication.refillCount);

    if (!daysUntilRefill) return "";
    const safeRefillCount = Number.isFinite(refillCount) && refillCount >= 0 ? refillCount : 0;
    const totalDays = daysUntilRefill * (safeRefillCount + 1);

    return totalDays > 0 ? String(totalDays) : "";
  }, [estimatedDaysUntilRefill, newMedication.refillCount]);

  const estimatedRunoutDate = useMemo(() => {
    const totalDaysCovered = Number(estimatedTotalDaysCovered);
    if (!totalDaysCovered) return "";

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + totalDaysCovered);

    return baseDate.toLocaleDateString();
  }, [estimatedTotalDaysCovered]);

  const refillDueDate = useMemo(() => {
    const daysUntilRefill = Number(estimatedDaysUntilRefill);
    if (!daysUntilRefill) return "";

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + daysUntilRefill);

    return baseDate.toLocaleDateString();
  }, [estimatedDaysUntilRefill]);

  const supplyPresets = [
    { label: "1 Week", days: 7 },
    { label: "2 Weeks", days: 14 },
    { label: "1 Month", days: 30 },
    { label: "3 Months", days: 90 },
  ];

  const showSupplyTools =
    Boolean(newMedication.frequency) &&
    getDosesPerDay(newMedication.frequency) !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-semibold">
              {isRefillRequestMode
                ? "Refill Request"
                : editingMedicationId !== null
                ? "Edit Medication"
                : "Add Medication"}
            </h3>

            {isRefillRequestMode ? (
              <p className="mt-1 text-sm text-slate-500">
                Update refill details before submitting. This does not immediately
                change the patient’s medication list.
              </p>
            ) : null}
          </div>

          <button
            onClick={closeModal}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Medication Name
              </label>
              <input
                ref={primaryInputRef}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Frequency
                </label>
                <select
                  value={newMedication.frequency}
                  onChange={(e) =>
                    setNewMedication((prev) => ({
                      ...prev,
                      frequency: e.target.value,
                    }))
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
            </div>

            {showSupplyTools ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Quick supply
                  </span>

                  {supplyPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applySupplyPreset(preset.days)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    Days Until Refill: {estimatedDaysUntilRefill || "—"}
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    Refill Due Date: {refillDueDate || "—"}
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    Total Days Covered: {estimatedTotalDaysCovered || "—"}
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    Estimated Runout: {estimatedRunoutDate || "—"}
                  </div>
                </div>
              </div>
            ) : null}

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

            {!isRefillRequestMode ? (
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
                <label
                  htmlFor="medication-active"
                  className="text-sm text-slate-700"
                >
                  Active medication
                </label>
              </div>
            ) : null}

            <button
              onClick={addOrUpdateMedication}
              className={`w-full rounded-lg px-4 py-3 text-white ${
                isRefillRequestMode
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isRefillRequestMode
                ? "Submit Refill Request"
                : editingMedicationId !== null
                ? "Save Medication"
                : "Add Medication"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
