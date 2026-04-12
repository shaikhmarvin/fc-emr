import { useEffect, useMemo, useRef, useState } from "react";
import LabReviewPanel from "./LabReviewPanel";
import { fetchEncountersByPatient } from "../api/encounters";

function toneForPacket(packet) {
  if (!packet) return "border-slate-200 bg-white";

  const hasUnresolved = packet.matchStatus === "unresolved";
  const hasPossibleMatch = packet.matchStatus === "possible_match";
  const suspiciousCount = (packet.labs || []).filter((lab) => lab?.suspicious).length;
  const duplicateCount = (packet.labs || []).filter((lab) => !!lab?.duplicateType).length;
  const skipped = packet.reviewStatus === "skipped";

  if (hasUnresolved || suspiciousCount > 0) return "border-red-200 bg-red-50/70";
  if (hasPossibleMatch || duplicateCount > 0 || skipped) return "border-amber-200 bg-amber-50/70";
  if (packet.matchStatus === "matched") return "border-emerald-200 bg-emerald-50/70";

  return "border-slate-200 bg-white";
}

function getPacketReviewCounts(packet) {
  const labs = packet?.labs || [];

  return {
    suspiciousCount: labs.filter((lab) => !!lab?.suspicious).length,
    duplicateCount: labs.filter((lab) => !!lab?.duplicateType).length,
    missingCount: labs.filter((lab) => !!lab?.missing || !!lab?.autoFilled).length,
    totalCount: labs.length,
  };
}

function getPacketPriority(packet) {
  if (!packet) return 999;

  const { suspiciousCount, duplicateCount, missingCount } = getPacketReviewCounts(packet);

  if (packet.reviewStatus === "skipped") return 50;
  if (packet.reviewStatus === "saved") return 40;

  if (packet.matchStatus === "unresolved") return 0;
  if (packet.matchStatus === "possible_match") return 10;

  if (suspiciousCount > 0 || duplicateCount > 0 || missingCount > 0) return 20;

  if (packet.matchStatus === "matched") return 30;

  return 35;
}

function formatDisplayDate(value) {
  if (!value) return "—";
  return String(value);
}

function SummaryChip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function PacketQueueCard({ packet, isActive, onClick, index }) {
  const suspiciousCount = (packet.labs || []).filter((lab) => lab?.suspicious).length;
  const duplicateCount = (packet.labs || []).filter((lab) => !!lab?.duplicateType).length;
  const missingCount = (packet.labs || []).filter((lab) => lab?.missing || lab?.autoFilled).length;
  const tone = toneForPacket(packet);

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${isActive
          ? "border-blue-600 bg-blue-50 shadow-sm"
          : `${tone} hover:shadow-sm`
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {packet.extractedPatientName?.trim() || `Packet ${index + 1}`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            DOB: {packet.extractedDob || "—"}
          </p>
          <p className="text-xs text-slate-500">
            {packet.packetType || "unknown"} • {formatDisplayDate(packet.collectedDate)}
          </p>
        </div>

        <SummaryChip
          tone={
            packet.reviewStatus === "saved"
              ? "emerald"
              : packet.reviewStatus === "skipped"
                ? "amber"
                : packet.matchStatus === "unresolved"
                  ? "red"
                  : packet.matchStatus === "possible_match"
                    ? "amber"
                    : packet.matchStatus === "matched"
                      ? "blue"
                      : "slate"
          }
        >
          {packet.reviewStatus === "saved"
            ? "saved"
            : packet.reviewStatus === "skipped"
              ? "skipped"
              : packet.matchStatus === "unresolved"
                ? "unresolved"
                : packet.matchStatus === "possible_match"
                  ? "possible match"
                  : packet.matchStatus === "matched"
                    ? "matched"
                    : "unsaved"}
        </SummaryChip>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SummaryChip>{(packet.labs || []).length} labs</SummaryChip>

        {packet.matchStatus === "unresolved" ? (
          <SummaryChip tone="red">patient unresolved</SummaryChip>
        ) : null}

        {packet.matchStatus === "possible_match" ? (
          <SummaryChip tone="amber">match review</SummaryChip>
        ) : null}

        {suspiciousCount > 0 ? (
          <SummaryChip tone="amber">{suspiciousCount} suspicious</SummaryChip>
        ) : null}

        {duplicateCount > 0 ? (
          <SummaryChip tone="red">{duplicateCount} duplicate</SummaryChip>
        ) : null}

        {missingCount > 0 ? (
          <SummaryChip tone="purple">{missingCount} missing</SummaryChip>
        ) : null}
      </div>
    </button>
  );
}

function MatchPanel({
  packet,
  confirmedPatient,
  matchedPatient,
  possibleMatches,
  unresolvedReason,
  onConfirmPatient,
}) {
  const displayMatchedPatient = confirmedPatient || matchedPatient;

  if (packet.matchStatus === "matched" && displayMatchedPatient) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-emerald-900">Matched Patient</h3>
          <SummaryChip tone="emerald">confirmed</SummaryChip>
        </div>

        <p className="mt-2 text-sm font-medium text-emerald-900">
          {`${displayMatchedPatient.firstName || ""} ${displayMatchedPatient.lastName || ""}`.trim() || "Unknown patient"}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-emerald-800 sm:grid-cols-2">
          <p>DOB: {displayMatchedPatient.dob || "—"}</p>
          <p>Phone: {displayMatchedPatient.phone || "—"}</p>
          <p>MRN: {displayMatchedPatient.mrn || "—"}</p>
          <p>Last 4 SSN: {displayMatchedPatient.last4ssn || "—"}</p>
        </div>
      </div>
    );
  }

  if (packet.matchStatus === "possible_match") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-amber-900">Possible Matches</h3>
          <SummaryChip tone="amber">{possibleMatches.length} candidate{possibleMatches.length === 1 ? "" : "s"}</SummaryChip>
        </div>

        <p className="mt-2 text-sm text-amber-800">
          Review these patients before saving the packet.
        </p>

        <div className="mt-4 space-y-3">
          {possibleMatches.length > 0 ? (
            possibleMatches.map((patient, index) => (
              <div
                key={`${patient.id || index}`}
                className="rounded-xl border border-amber-200 bg-white/80 p-3"
              >
                <p className="text-sm font-semibold text-amber-900">
                  {`${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown patient"}
                </p>

                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-amber-800 sm:grid-cols-2">
                  <p>DOB: {patient.dob || "—"}</p>
                  <p>Phone: {patient.phone || "—"}</p>
                  <p>MRN: {patient.mrn || "—"}</p>
                  <p>Last 4 SSN: {patient.last4ssn || "—"}</p>
                </div>

                {onConfirmPatient ? (
                  <button
                    onClick={() => onConfirmPatient(patient)}
                    className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Confirm This Patient
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-amber-800">No possible matches listed.</p>
          )}
        </div>
      </div>
    );
  }

  if (packet.matchStatus === "unresolved") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-red-900">Unresolved Patient</h3>
          <SummaryChip tone="red">needs review</SummaryChip>
        </div>

        <p className="mt-2 text-sm text-red-800">
          This packet could not be confidently matched to a patient.
        </p>

        {unresolvedReason ? (
          <p className="mt-2 text-xs text-red-700">
            Reason: {unresolvedReason}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Match Status Unknown</h3>
    </div>
  );
}

export default function LabImportView({
  packet = null,
  packets = [],
  selectedPacketId = null,
  onSelectPacket = null,
  onBack = null,
  onSave = null,
  onConfirmPatient = null,
  onSkip = null,
  onExportDebug,
  onChangeLabs = null,
}) {
  const [reviewedLabsByPacketId, setReviewedLabsByPacketId] = useState({});
  const [saving, setSaving] = useState(false);
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState(null);
  const lastIncomingLabsJsonRef = useRef({});
  const lastPushedLabsJsonRef = useRef({});

  const reviewedLabs = useMemo(() => {
    if (!packet?.packetId) return [];
    return reviewedLabsByPacketId[packet.packetId] || packet.labs || [];
  }, [packet?.packetId, packet?.labs, reviewedLabsByPacketId]);

  const sortedPackets = useMemo(() => {
    return [...packets].sort((a, b) => {
      const priorityDiff = getPacketPriority(a) - getPacketPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const aCounts = getPacketReviewCounts(a);
      const bCounts = getPacketReviewCounts(b);

      const aNeedsReview =
        aCounts.suspiciousCount + aCounts.duplicateCount + aCounts.missingCount;
      const bNeedsReview =
        bCounts.suspiciousCount + bCounts.duplicateCount + bCounts.missingCount;

      if (bNeedsReview !== aNeedsReview) return bNeedsReview - aNeedsReview;

      const aTime = new Date(a.savedAt || a.skippedAt || 0).getTime();
      const bTime = new Date(b.savedAt || b.skippedAt || 0).getTime();

      return aTime - bTime;
    });
  }, [packets]);

  useEffect(() => {
    if (!packet?.packetId) return;

    const incomingLabs = packet.labs || [];
    const incomingJson = JSON.stringify(incomingLabs);

    lastIncomingLabsJsonRef.current[packet.packetId] = incomingJson;

    setReviewedLabsByPacketId((prev) => {
      const currentJson = JSON.stringify(prev[packet.packetId] || []);

      if (currentJson === incomingJson) {
        return prev;
      }

      return {
        ...prev,
        [packet.packetId]: incomingLabs,
      };
    });
  }, [packet?.packetId, packet?.labs]);

  useEffect(() => {
    if (!packet?.packetId) return;
    if (!onChangeLabs) return;

    const packetId = packet.packetId;
    const reviewedJson = JSON.stringify(reviewedLabs || []);
    const incomingJson = lastIncomingLabsJsonRef.current[packetId] || "";
    const lastPushedJson = lastPushedLabsJsonRef.current[packetId] || "";

    // do not write back if this is just DB/realtime data we received
    if (reviewedJson === incomingJson) return;

    // do not write again if we already pushed this exact version
    if (reviewedJson === lastPushedJson) return;

    const timeout = window.setTimeout(() => {
      lastPushedLabsJsonRef.current[packetId] = reviewedJson;
      onChangeLabs(packetId, reviewedLabs);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [packet?.packetId, reviewedLabs, onChangeLabs]);


  function normalizeEncounterDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value).trim();
    }
    return parsed.toISOString().slice(0, 10);
  }

  useEffect(() => {
    async function loadEncounters() {
      if (!packet?.confirmedPatient?.id) {
        setEncounters([]);
        setSelectedEncounterId(null);
        return;
      }

      try {
        const data = await fetchEncountersByPatient(packet.confirmedPatient.id);
        setEncounters(data || []);

        const normalizedCollectedDate = normalizeEncounterDate(packet.collectedDate);

        const exactDateMatch =
          (data || []).find(
            (enc) => normalizeEncounterDate(enc.clinic_date) === normalizedCollectedDate
          ) || null;

        if (exactDateMatch) {
          setSelectedEncounterId(exactDateMatch.id);
          return;
        }

        if (data && data.length > 0) {
          setSelectedEncounterId(data[0].id);
          return;
        }

        setSelectedEncounterId(null);
      } catch (error) {
        console.error("Failed to load encounters for confirmed patient:", error);
        setEncounters([]);
        setSelectedEncounterId(null);
      }
    }

    loadEncounters();
  }, [packet?.confirmedPatient?.id, packet?.collectedDate, packet?.packetId]);

  if (!packet) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Lab Import</h2>
          <p className="mt-2 text-sm text-slate-600">
            No lab packet selected yet.
          </p>
        </div>
      </div>
    );
  }

  const {
    extractedPatientName,
    extractedDob,
    collectedDate,
    matchStatus,
    matchedPatient,
    possibleMatches = [],
    unresolvedReason,
    confirmedPatient = null,
    packetType = "unknown",
    reviewStatus = "unsaved",
  } = packet;

  const suspiciousCount = reviewedLabs.filter((lab) => !!lab?.suspicious).length;
  const duplicateCount = reviewedLabs.filter((lab) => !!lab?.duplicateType).length;
  const missingCount = reviewedLabs.filter((lab) => !!lab?.missing || !!lab?.autoFilled).length;

  async function handleSaveLabs() {
    if (!onSave) return;

    try {
      setSaving(true);
      await onSave(reviewedLabs, selectedEncounterId);
    } finally {
      setSaving(false);
    }
  }

  function updateReviewedLabs(nextLabsOrUpdater) {
    const nextLabs =
      typeof nextLabsOrUpdater === "function"
        ? nextLabsOrUpdater(reviewedLabs)
        : nextLabsOrUpdater;

    setReviewedLabsByPacketId((prev) => ({
      ...prev,
      [packet.packetId]: nextLabs,
    }));
  }

  let saveDisabledReason = "";

if (reviewedLabs.length === 0) {
  saveDisabledReason = "No labs to save.";
} else if (reviewStatus === "skipped") {
  saveDisabledReason = "This packet has been skipped.";
} else if (!confirmedPatient) {
  saveDisabledReason = "Confirm a patient before saving.";
} else if (!selectedEncounterId) {
  saveDisabledReason = "Select an encounter before saving.";
}

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        ) : null}

        {onExportDebug ? (
          <button
            onClick={onExportDebug}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Export Debug JSON
          </button>
        ) : null}

        {onSkip ? (
          <button
            onClick={onSkip}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Skip Packet
          </button>
        ) : null}

        {onSave ? (
  <div className="flex flex-col gap-1">
    <button
      onClick={handleSaveLabs}
      disabled={
        saving ||
        reviewedLabs.length === 0 ||
        reviewStatus === "skipped" ||
        !confirmedPatient ||
        !selectedEncounterId
      }
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {saving ? "Saving..." : "Save Imported Labs"}
    </button>

    {!saving && saveDisabledReason && (
      <p className="text-xs font-medium text-amber-700">
        {saveDisabledReason}
      </p>
    )}

    {!saving && !saveDisabledReason && (
      <p className="text-xs font-medium text-emerald-700">
        Ready to save.
      </p>
    )}
  </div>
) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Parsed Packets</h2>
                <p className="text-sm text-slate-500">
                  {sortedPackets.length} packet{sortedPackets.length === 1 ? "" : "s"}
                </p>
              </div>
              <SummaryChip>
                {Math.max(
                  1,
                  sortedPackets.findIndex((p) => p.packetId === selectedPacketId) + 1
                )}{" "}
                / {sortedPackets.length}
              </SummaryChip>
            </div>

            <div className="space-y-3">
              {sortedPackets.map((p, index) => (
                <PacketQueueCard
                  key={p.packetId}
                  packet={p}
                  index={index}
                  isActive={p.packetId === selectedPacketId}
                  onClick={() => onSelectPacket?.(p.packetId)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Lab Import Review</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Review, correct, and save this packet before it goes into the chart.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <SummaryChip>{(packet.labs || []).length} labs</SummaryChip>

                {packet.matchStatus === "unresolved" ? (
                  <SummaryChip tone="red">patient unresolved</SummaryChip>
                ) : null}

                {packet.matchStatus === "possible_match" ? (
                  <SummaryChip tone="amber">match review</SummaryChip>
                ) : null}

                {suspiciousCount > 0 ? (
                  <SummaryChip tone="amber">{suspiciousCount} suspicious</SummaryChip>
                ) : null}

                {duplicateCount > 0 ? (
                  <SummaryChip tone="red">{duplicateCount} duplicate</SummaryChip>
                ) : null}

                {missingCount > 0 ? (
                  <SummaryChip tone="purple">{missingCount} missing</SummaryChip>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Extracted Patient
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {extractedPatientName || "—"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  DOB: {extractedDob || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lab Date
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDisplayDate(collectedDate)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Packet Type
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {packetType}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Review Status
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {reviewStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Detected Labs</h2>
                <p className="text-sm text-slate-600">
                  Edit values, delete mistakes, or add missing labs.
                </p>
              </div>
            </div>

            <LabReviewPanel
              labs={reviewedLabs}
              onChangeLabs={updateReviewedLabs}
            />
          </div>
        </div>

        <div className="space-y-4">
          <MatchPanel
            packet={packet}
            confirmedPatient={confirmedPatient}
            matchedPatient={matchedPatient}
            possibleMatches={possibleMatches}
            unresolvedReason={unresolvedReason}
            onConfirmPatient={onConfirmPatient}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Encounter Match</h3>
            <p className="mt-1 text-sm text-slate-600">
              Default target is the encounter whose clinic date matches the collected lab date.
            </p>

            {confirmedPatient ? (
              <>
                <select
                  value={selectedEncounterId || ""}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Select encounter</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {(enc.clinic_date || "No date")} — {(enc.chief_complaint || "No complaint")}
                    </option>
                  ))}
                </select>

                {selectedEncounterId ? (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Encounter selected for save.
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    No matching encounter found yet. Select one before saving.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Confirm a patient first to choose an encounter.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Review Summary</h3>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total labs</span>
                <span className="font-medium text-slate-900">{reviewedLabs.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Suspicious</span>
                <span className="font-medium text-slate-900">{suspiciousCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Duplicates</span>
                <span className="font-medium text-slate-900">{duplicateCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Missing / autofill</span>
                <span className="font-medium text-slate-900">{missingCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}