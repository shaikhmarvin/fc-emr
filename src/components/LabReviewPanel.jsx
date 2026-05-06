import { useMemo, useState } from "react";

const GROUP_ORDER = [
  "CBC",
  "Differential",
  "Chemistry",
  "Renal",
  "Liver",
  "Lipids",
  "Diabetes / Endocrine",
  "Thyroid",
  "Iron Studies",
  "Vitamins",
  "Infectious Disease / STD",
  "Hepatitis / Antibodies",
  "Urine",
  "Other",
];

function unwrapLabValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return value.value ?? null;
  return value;
}

function parseRange(rangeText = "") {
  const text = String(rangeText || "").trim();
  if (!text) return null;

  const plusMatch = text.match(/(-?\d+(?:\.\d+)?)\+/);
  if (plusMatch) {
    const min = Number(plusMatch[1]);
    if (!Number.isNaN(min)) {
      return { min, max: Infinity };
    }
  }

  const rangeMatch = text.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (!rangeMatch) return null;

  const min = Number(rangeMatch[1]);
  const max = Number(rangeMatch[2]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;

  return { min, max };
}

function computeFlag(value, rangeText = "") {
  const unwrapped = unwrapLabValue(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === "") return "";

  const numeric = Number(String(unwrapped).replace(/,/g, "").trim());
  if (Number.isNaN(numeric)) return "";

  const parsedRange = parseRange(rangeText);
  if (!parsedRange) return "";

  if (numeric < parsedRange.min) return "L";
  if (numeric > parsedRange.max) return "H";
  return "";
}

function getDisplayValue(value) {
  const unwrapped = unwrapLabValue(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === "") return "—";
  return String(unwrapped);
}

function normalizeValueForStorage(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function sortGroups(entries = []) {
  return [...entries].sort(([a], [b]) => {
    const aIndex = GROUP_ORDER.indexOf(a);
    const bIndex = GROUP_ORDER.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function groupLabs(labs = []) {
  const grouped = {};

  labs.forEach((lab, index) => {
    const group = lab?.group || "Other";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push({ lab, index });
  });

  return sortGroups(Object.entries(grouped));
}

function badgeClasses(kind) {
  switch (kind) {
    case "high":
    case "low":
      return "bg-red-100 text-red-700";
    case "suspicious":
      return "bg-amber-100 text-amber-700";
    case "duplicate_same":
      return "bg-red-100 text-red-700";
    case "duplicate_recent":
      return "bg-blue-100 text-blue-700";
    case "autofill":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function pill(label, kind) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClasses(kind)}`}
    >
      {label}
    </span>
  );
}

export default function LabReviewPanel({
  labs = [],
  onChangeLabs = null,
  onAuditEvent = null,
}) {
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    labs.forEach((lab) => {
      const group = lab?.group || "Other";
      initial[group] = true;
    });
    return initial;
  });

  const groupedLabs = useMemo(() => groupLabs(labs), [labs]);

  function applyLabs(updater) {
    if (!onChangeLabs) return;
    const nextLabs = typeof updater === "function" ? updater(labs) : updater;
    onChangeLabs(nextLabs);
  }

  function toggleGroup(group) {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }

  function updateLab(index, patch) {
  applyLabs((prev) =>
    prev.map((lab, i) => {
      if (i !== index) return lab;

      return {
        ...lab,
        ...patch,
        _qaAction: lab._qaAction === "added" ? "added" : "edited",
        _qaOriginal: lab._qaOriginal || {
          key: lab.key || "",
          displayName: lab.displayName || "",
          value: unwrapLabValue(lab.value),
          unit: lab.unit || "",
          rawLine: lab.rawLine || "",
          autoFilled: !!lab.autoFilled,
          missing: !!lab.missing,
          confidence: lab.confidence || "",
        },
      };
    })
  );
}

  function updateLabValue(index, newValue) {
    updateLab(index, { value: normalizeValueForStorage(newValue) });
  }

  function updateLabName(index, displayName) {
    updateLab(index, { displayName });
  }

  function addLab(group) {
    applyLabs((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        displayName: "",
        group,
        value: null,
        rawLine: "manual",
        suspicious: false,
        missing: false,
        autoFilled: false,
        duplicateType: null,
        duplicateInfo: null,
        expectedRangeText: "",
        custom: true,
        confidence: "manual",
        _qaAction: "added",
        _qaOriginal: null,
      },
    ]);

    setOpenGroups((prev) => ({
      ...prev,
      [group]: true,
    }));
  }

  function deleteLab(index) {
  const deletedLab = labs[index];

  if (onAuditEvent && deletedLab) {
    onAuditEvent({
      action: "deleted",
      lab: deletedLab,
    });
  }

  applyLabs((prev) => prev.filter((_, i) => i !== index));
}

  return (
    <div className="space-y-4">
      {groupedLabs.map(([group, rows]) => {
        const isOpen = openGroups[group] ?? true;

        return (
          <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{group}</div>
                <div className="text-xs text-slate-500">{rows.length} lab{rows.length === 1 ? "" : "s"}</div>
              </div>
              <div className="text-lg font-semibold text-slate-500">{isOpen ? "−" : "+"}</div>
            </button>

            {isOpen && (
              <div>
                <div className="border-b border-slate-100 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => addLab(group)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    + Add lab
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {rows.map(({ lab, index }) => {
                    const displayValue = getDisplayValue(lab.value);
                    const displayRange = lab.referenceRangeText || lab.expectedRangeText || "";
const flag = computeFlag(lab.value, displayRange);
                    const duplicateSame = lab.duplicateType === "same_encounter";
                    const duplicateRecent = lab.duplicateType === "recent";
                    const suspicious = !!lab.suspicious;
                    const isAbnormal = flag === "H" || flag === "L";

                    return (
                      <div
                        key={`${lab.key || "lab"}-${index}`}
                        className={`px-4 py-3 ${duplicateSame ? "bg-red-50/60" : duplicateRecent ? "bg-blue-50/60" : suspicious ? "bg-amber-50/60" : "bg-white"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {lab.custom ? (
                              <input
                                type="text"
                                value={lab.displayName || ""}
                                onChange={(e) => updateLabName(index, e.target.value)}
                                placeholder="Lab name"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-slate-900">{lab.displayName}</div>
                            )}

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {flag === "H" && pill("HIGH", "high")}
                              {flag === "L" && pill("LOW", "low")}
                              {suspicious && pill("CHECK", "suspicious")}
                              {duplicateSame && pill("DUP SAME VISIT", "duplicate_same")}
                              {duplicateRecent && pill("RECENT DUP", "duplicate_recent")}
                              {lab.autoFilled && pill("AUTOFILLED", "autofill")}
                            </div>

                            {(lab.expectedRangeText || lab.rawLine || lab.duplicateInfo || suspicious) && (
                              <div className="mt-2 space-y-1 text-xs text-slate-500">
                                {displayRange ? (
  <div>Range: {displayRange}</div>
) : null}
                                {lab.rawLine ? (
                                  <div className="truncate">Source: {lab.rawLine}</div>
                                ) : null}
                                {lab.duplicateInfo ? (
                                  <div className="font-medium text-blue-700">{lab.duplicateInfo}</div>
                                ) : null}
                                {suspicious ? (
                                  <div className="font-medium text-amber-700">Value looks unusual — review before saving.</div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="min-w-[92px]">
                              <input
                                type="text"
                                value={displayValue === "—" ? "" : displayValue}
                                onChange={(e) => updateLabValue(index, e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2 text-right text-sm font-semibold outline-none ${isAbnormal ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-900"}`}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteLab(index)}
                              className="rounded-lg border border-transparent px-2 py-2 text-sm text-red-500 hover:border-red-200 hover:bg-red-50"
                              aria-label={`Delete ${lab.displayName || "lab"}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
