import { isPapLab, normalizePapLab } from "../lib/papResults.js";
import { labsBySourcePage } from "../lib/labReviewOrder.js";
import LabReviewInput from "./LabReviewInput.jsx";
import { importedLabFlag, needsExtractionReview, labFlagChoices, toggleLabFlag } from "../lib/labFlags.js";
import { useMemo, useState } from "react";
import { findLabByAlias } from "../lib/labCatalog.js";

function unwrapLabValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return value.value ?? null;
  return value;
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

function badgeClasses(kind) {
  switch (kind) {
    case "high":
    case "low":
      return "bg-red-100 text-red-700";
    case "suspicious":
    case "review":
      return "bg-blue-100 text-blue-700";
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
  onShowSource = null,
  onRememberRange = null,
  onlyNeedsReview = false,
  alreadySavedIndexes = new Set(),
}) {
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    labs.forEach((lab) => {
      const group = lab.sourcePage ? `Page ${lab.sourcePage}` : "Results without a page";
      initial[group] = true;
    });
    return initial;
  });

  const groupedLabs = useMemo(() => labsBySourcePage(labs), [labs]);

  function applyLabs(updater) {
    if (!onChangeLabs) return;
    onChangeLabs(updater);
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

      const clearReusedRange = lab.referenceRangeSource === "verified_default" &&
        (patch.key !== undefined || patch.unit !== undefined) && patch.referenceRangeText === undefined
        ? { referenceRangeText: "", referenceRangeSource: "", referenceRangeNeedsReview: false } : {};

      return normalizePapLab({
        ...lab,
        ...clearReusedRange,
        ...patch,
        ...(["value", "unit", "referenceRangeText", "key"].some(key => key in patch)
          ? { manualFlag: null, reportedFlag: "", resultSymbol: "", flag: "", abnormalFlag: "", hlFlag: "" } : {}),
        sourceReviewed: patch.sourceReviewed ?? false,
        _qaAction: lab._qaAction === "added" ? "added" : "edited",
        _qaOriginal: lab._qaOriginal || {
          key: lab.key || "",
          displayName: lab.displayName || "",
          value: unwrapLabValue(lab.value),
          unit: lab.unit || "",
          referenceRangeText: lab.referenceRangeText || "",
          manualFlag: lab.manualFlag ?? null,
          reportedFlag: lab.reportedFlag || "",
          rawLine: lab.rawLine || "",
          autoFilled: !!lab.autoFilled,
          missing: !!lab.missing,
          confidence: lab.confidence || "",
        },
      });
    })
  );
}

  function updateLabValue(index, newValue) {
    const value = normalizeValueForStorage(newValue);
    updateLab(index, { value, missing: value === null, autoFilled: false });
  }

  function updateLabName(index, displayName) {
    const definition = findLabByAlias(displayName);
    updateLab(index, { displayName,
      key: definition?.key || `outside-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      group: definition?.group || 'Other', custom: !definition, ...(definition?.key === 'pap_smear' ? { unit: '', expectedRangeText: '' } : {}) });
  }

  function addLab(pageLabel = "Results without a page") {
    const sourcePage = Number(pageLabel.match(/^Page (\d+)$/)?.[1]) || undefined;
    const group = sourcePage ? `Page ${sourcePage}` : "Results without a page";
    applyLabs((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        _reviewId: crypto.randomUUID(),
        displayName: "",
        group: "Other",
        sourcePage,
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
    <div className="space-y-4" style={{ overflowAnchor: "none" }}>
      <button type="button" onClick={() => addLab()} className="text-sm font-medium text-blue-700">+ Add a missing result</button>
      {groupedLabs.map(([group, rows]) => {
        const isOpen = openGroups[group] ?? true;

        return (
          <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => {
                toggleGroup(group);
                const page = rows.find(row => row.lab.sourcePage)?.lab;
                if (page) onShowSource?.(page);
              }}
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
                    if (onlyNeedsReview && (alreadySavedIndexes.has(index) || !needsExtractionReview(lab))) return null;
                    const displayValue = getDisplayValue(lab.value);
                    const displayRange = lab.referenceRangeText || lab.expectedRangeText || "";
const flag = importedLabFlag(lab);
                    const duplicateSame = lab.duplicateType === "same_encounter";
                    const duplicateRecent = lab.duplicateType === "recent";
                    const suspicious = needsExtractionReview(lab);
                    const isAbnormal = flag === "H" || flag === "L" || flag === "A";

                    return (
                      <div
                        key={lab.sourceResultId || lab._reviewId || `lab-row-${index}`}
                        className={`px-4 py-3 ${duplicateSame ? "bg-red-50/60" : duplicateRecent ? "bg-blue-50/60" : suspicious ? "bg-blue-50/40" : "bg-white"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {alreadySavedIndexes.has(index) && <p className="mb-1 text-xs font-semibold text-emerald-700">Already in patient chart — will be skipped</p>}
                            {onChangeLabs ? (
                              <LabReviewInput
                                type="text"
                                value={lab.displayName || ""}
                                onCommit={value => updateLabName(index, value)}
                                aria-label="Lab name"
                                placeholder="Lab name"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-slate-900">{lab.displayName}</div>
                            )}

                            <div className="my-2 flex flex-wrap items-center gap-3 text-xs">
                              {lab.sourcePage && <button type="button" onClick={() => onShowSource?.(lab)} className="font-medium text-blue-700">View page {lab.sourcePage}</button>}
                              {(lab.suspicious || lab.custom || lab.extractionMethod === "text_fallback" || lab.referenceRangeNeedsReview || lab.unitNeedsReview) && <label className="flex items-center gap-1 text-slate-700">
                                <input type="checkbox" checked={!!lab.sourceReviewed} onChange={event => updateLab(index, { sourceReviewed: event.target.checked, referenceRangeNeedsReview: !event.target.checked && lab.referenceRangeSource === "verified_default", unitNeedsReview: !event.target.checked && lab.unitSource === "verified_default" })} /> Verified result and range
                              </label>}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {isPapLab(lab) ? <span className="text-xs text-slate-500">Text interpretation · no units</span> : <label className="text-xs text-slate-600">Units
                                <LabReviewInput aria-label={`Units for ${lab.displayName || "lab"}`} value={lab.unit || ""} onCommit={value => updateLab(index, { unit: value, unitSource: "manual", unitNeedsReview: false, unitCleared: !value.trim() })} className="ml-2 w-28 rounded border border-slate-300 px-2 py-1" />
                              </label>}
                              <label className="text-xs text-slate-600">Report range
                                <LabReviewInput aria-label={`Range for ${lab.displayName || "lab"}`} value={lab.referenceRangeText || ""} onCommit={value => updateLab(index, { referenceRangeText: value, referenceRangeSource: "manual", referenceRangeNeedsReview: false, referenceRangeCleared: !value.trim() })} className="ml-2 w-32 rounded border border-slate-300 px-2 py-1" />
                              </label>
                            </div>
                            {onRememberRange && lab.referenceRangeText?.trim() && !lab.referenceRangeNeedsReview && (
                              <button type="button" onClick={() => onRememberRange(lab)} className="mt-2 text-xs font-medium text-blue-700">Verify &amp; reuse units / range</button>
                            )}
                            {lab.unitSource === "verified_default" && <p className="mt-1 text-xs text-amber-700">Units reused from a verified result — check this report.</p>}
                            {lab.referenceRangeSource === "verified_default" && <p className="mt-1 text-xs text-amber-700">Reused range{lab.referenceRangeNeedsReview ? " — verify for this report" : " — verified"}</p>}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {flag === "H" && pill("HIGH", "high")}
                              {flag === "L" && pill("LOW", "low")}
                              {flag === "A" && pill(lab.manualFlag === "A" ? "ABNORMAL" : "FLAGGED BY LAB", "high")}
                              {suspicious && pill("VERIFY EXTRACTION", "review")}
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
                                  <div className="whitespace-pre-wrap break-words">Source: {lab.rawLine}</div>
                                ) : null}
                                {lab.duplicateInfo ? (
                                  <div className="font-medium text-blue-700">{lab.duplicateInfo}</div>
                                ) : null}
                                {suspicious ? (
                                  <div className="font-medium text-blue-700">Check the extracted text against the report. This review label does not mean the result is abnormal.</div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={isPapLab(lab) ? "w-80 max-w-full min-w-0" : "min-w-[92px]"}>
                              <LabReviewInput
                                type="text"
                                multiline={isPapLab(lab)}
                                rows={isPapLab(lab) ? 3 : undefined}
                                aria-label={`Result for ${lab.displayName || "lab"}`}
                                value={displayValue === "—" ? "" : displayValue}
                                onCommit={value => updateLabValue(index, value)}
                                className={`w-full rounded-lg border px-3 py-2 ${isPapLab(lab) ? "text-left leading-relaxed" : "text-right"} text-sm font-semibold outline-none ${isAbnormal ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-900"}`}
                              />
                              <div role="group" aria-label={`Flag for ${lab.displayName || "lab"}`} className="mt-2 flex items-center justify-end gap-1">
                                <span className="mr-1 text-xs text-slate-500">Flag</span>
                                {labFlagChoices(lab).map(choice => (
                                  <button key={choice} type="button"
                                    aria-label={`Mark ${lab.displayName || "lab"} ${choice === "H" ? "high" : choice === "L" ? "low" : "abnormal"}`}
                                    aria-pressed={flag === choice}
                                    title={`${choice === "H" ? "High" : choice === "L" ? "Low" : "Abnormal"} — click again to clear`}
                                    onClick={() => updateLab(index, { manualFlag: toggleLabFlag(lab, choice), sourceReviewed: !!lab.sourceReviewed })}
                                    className={`min-w-8 rounded-md border px-2 py-1 text-xs font-semibold ${flag === choice ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`}
                                  >{choice}</button>
                                ))}
                                {flag && !labFlagChoices(lab).includes(flag) && <button type="button" onClick={() => updateLab(index, { manualFlag: "", sourceReviewed: !!lab.sourceReviewed })} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">Clear</button>}
                              </div>
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
