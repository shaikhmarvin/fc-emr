import { importedLabFlag, needsExtractionReview } from './labFlags.js';

export const LAB_PIPELINE_VERSION = 'lab-document-review-2026-10-23-v4-column-boundaries';
const fields = ['key', 'displayName', 'value', 'unit', 'referenceRangeText', 'manualFlag', 'reportedFlag'];
const unwrap = value => value && typeof value === 'object' ? value.value ?? null : value ?? null;
export function labBaseline(lab) {
  return { key: lab.key || '', displayName: lab.displayName || '', value: unwrap(lab.value), unit: lab.unit || '',
    referenceRangeText: lab.referenceRangeText || '', manualFlag: lab.manualFlag ?? null,
    reportedFlag: lab.reportedFlag || '', rawLine: lab.rawLine || '' };
}
export const captureImportBaseline = lab => ({ ...lab, _importOriginal: lab._importOriginal || labBaseline(lab) });

function changes(before, after) {
  if (!before) return null;
  return Object.fromEntries(fields.filter(field => Object.hasOwn(before, field) &&
    JSON.stringify(field === 'value' ? unwrap(before[field]) : before[field] ?? null) !==
    JSON.stringify(field === 'value' ? unwrap(after[field]) : after[field] ?? null))
    .map(field => [field, { before: before[field] ?? null, after: after[field] ?? null }]));
}
const patientSummary = patient => patient ? { id: patient.id, firstName: patient.firstName, lastName: patient.lastName, dob: patient.dob, mrn: patient.mrn } : null;
const resultId = lab => lab.sourceResultId || (lab.sourcePage && lab.sourceRowId ? `${lab.sourcePage}:${lab.sourceRowId}` : null);

export function buildLabDiagnostics({ packets = [], traces = {}, auditRows = [], auditError = null,
  activeBatchId, selectedPacketId, reviewState = {}, lastAttempt = null, legacySnapshot = null }) {
  const currentPackets = packets.map(packet => packet.packetId === reviewState.packetId && reviewState.labs
    ? { ...packet, labs: reviewState.labs } : packet);
  const packetReports = currentPackets.map(packet => {
    const trace = traces[packet.sourceDocument?.runId];
    const pages = new Set((packet.sourceDocument?.pages || []).map(page => page.pageNumber));
    const initialLabs = (trace?.initialPackets || []).flatMap(initial => initial.labs || []).filter(lab => pages.has(lab.sourcePage));
    const currentIds = new Set((packet.labs || []).map(resultId).filter(Boolean));
    const removed = initialLabs.filter(lab => resultId(lab) && !currentIds.has(resultId(lab)));
    const deletedEvents = reviewState.deletedByPacket?.[packet.packetId] || [];
    for (const event of deletedEvents) {
      const lab = event.lab || event;
      if (!removed.some(item => resultId(item) && resultId(item) === resultId(lab))) removed.push(lab);
    }
    const memberIds = packet.memberPacketIds || [packet.packetId];
    const savedAudit = auditRows.filter(row => memberIds.includes(row.packet_id));
    const labs = (packet.labs || []).map(lab => {
      const final = labBaseline(lab);
      const reviewerChanges = changes(lab._qaOriginal, final);
      const totalChanges = changes(lab._importOriginal || lab._qaOriginal, final);
      return { id: resultId(lab), ...final, effectiveFlag: importedLabFlag(lab),
        originalImport: lab._importOriginal || null, reviewBaseline: lab._qaOriginal || null,
        reviewerChanges, totalChanges,
        automaticChangesBeforeReview: changes(lab._importOriginal, lab._qaOriginal || final),
        manuallyAdded: lab._qaAction === 'added', verified: !!lab.sourceReviewed,
        needsReview: needsExtractionReview(lab), referenceRangeSource: lab.referenceRangeSource || 'unrecorded',
        reusedRangeNeedsReview: !!lab.referenceRangeNeedsReview,
        parsing: { method: lab.debugMeta?.parseMethod || lab.debug?.parseMethod || lab.extractionMethod || 'unrecorded',
          extractionMethod: lab.extractionMethod || null, confidence: lab.extractionConfidence ?? lab.confidence ?? null,
          sourcePage: lab.sourcePage ?? null, sourceRowId: lab.sourceRowId || null, sourceBox: lab.sourceBox || null,
          details: lab.debugMeta || lab.debug || null },
      };
    });
    const fieldChangeCounts = Object.fromEntries(fields.map(field => [field, labs.filter(lab => lab.reviewerChanges?.[field]).length]));
    const compared = labs.filter(lab => lab.reviewerChanges !== null && !lab.manuallyAdded);
    const modified = compared.filter(lab => Object.keys(lab.reviewerChanges).length);
    return { packetId: packet.packetId, memberPacketIds: memberIds, reviewStatus: packet.reviewStatus,
      sourceDocument: packet.sourceDocument || null,
      matching: { extractedName: packet.extractedPatientName, extractedDob: packet.extractedDob,
        matchStatus: packet.matchStatus, confirmedPatient: patientSummary(packet.confirmedPatient),
        possibleMatches: (packet.possibleMatches || []).map(patientSummary), unresolvedReason: packet.unresolvedReason || '',
        selectedEncounterId: packet.packetId === reviewState.packetId ? reviewState.selectedEncounterId : packet.matchedEncounterId || null },
      summary: { currentLabs: labs.length, baselineComparedLabs: compared.length, reviewerModifiedLabs: modified.length,
        unchangedLabs: compared.length - modified.length, manuallyAddedLabs: labs.filter(lab => lab.manuallyAdded).length,
        removedLabs: removed.length, persistedDeletionAuditRows: savedAudit.filter(row => row.action === 'deleted').length,
        automaticAdjustedLabs: labs.filter(lab => lab.automaticChangesBeforeReview && Object.keys(lab.automaticChangesBeforeReview).length).length,
        baselineUnavailableLabs: labs.filter(lab => !lab.originalImport).length,
        verifiedLabs: labs.filter(lab => lab.verified).length, needsReviewLabs: labs.filter(lab => lab.needsReview).length,
        reusedRanges: labs.filter(lab => lab.referenceRangeSource === 'verified_default').length,
        fieldChangeCounts, reviewerCorrectionRate: compared.length ? modified.length / compared.length : null },
      removalHistoryAvailability: { originalTraceAvailable: !!trace?.initialPackets,
        localDeletionEvents: deletedEvents.length, persistedAuditAvailable: !auditError },
      labs, removedLabs: removed.map(labBaseline), persistedAudit: savedAudit,
      sourceText: packet.sourceRawText || packet.rawText || '',
      reviewedPagesThisSession: packet.packetId === reviewState.packetId ? reviewState.reviewedPages || [] : [],
    };
  });
  const totals = {};
  for (const packet of packetReports) for (const [key, value] of Object.entries(packet.summary)) {
    if (typeof value === 'number' && key !== 'reviewerCorrectionRate') totals[key] = (totals[key] || 0) + value;
  }
  const byTest = new Map(), parseMethods = {};
  for (const packet of packetReports) {
    for (const lab of packet.labs) {
      const key = lab.key || lab.displayName;
      if (!byTest.has(key)) byTest.set(key, { key, displayName: lab.displayName, observed: 0, reviewerModified: 0,
        manuallyAdded: 0, removed: 0, automaticallyAdjusted: 0, verified: 0, needsReview: 0 });
      const item = byTest.get(key);
      item.observed += 1;
      item.reviewerModified += Number(!lab.manuallyAdded && !!lab.reviewerChanges && Object.keys(lab.reviewerChanges).length > 0);
      item.manuallyAdded += Number(lab.manuallyAdded);
      item.automaticallyAdjusted += Number(!!lab.automaticChangesBeforeReview && Object.keys(lab.automaticChangesBeforeReview).length > 0);
      item.verified += Number(lab.verified);
      item.needsReview += Number(lab.needsReview);
      parseMethods[lab.parsing.method] = (parseMethods[lab.parsing.method] || 0) + 1;
    }
    for (const lab of packet.removedLabs) {
      const key = lab.key || lab.displayName;
      if (!byTest.has(key)) byTest.set(key, { key, displayName: lab.displayName, observed: 0, reviewerModified: 0,
        manuallyAdded: 0, removed: 0, automaticallyAdjusted: 0, verified: 0, needsReview: 0 });
      byTest.get(key).removed += 1;
    }
  }
  return { schema: 'lab-import-debug-v3', pipelineVersion: LAB_PIPELINE_VERSION, exportedAt: new Date().toISOString(),
    overview: { activeBatchId, selectedPacketId, packetCount: packetReports.length, ...totals,
      reviewerCorrectionRate: totals.baselineComparedLabs ? totals.reviewerModifiedLabs / totals.baselineComparedLabs : null },
    pipelineRuns: [...new Set(currentPackets.map(packet => packet.sourceDocument?.runId).filter(Boolean))].map(runId => ({
      runId, available: !!traces[runId], trace: traces[runId] || null,
    })),
    improvementTargets: { parseMethods, byTest: [...byTest.values()].sort((a, b) =>
      (b.reviewerModified + b.manuallyAdded + b.removed) - (a.reviewerModified + a.manuallyAdded + a.removed)) },
    packets: packetReports, lastAttempt, auditAvailability: { available: !auditError, error: auditError }, legacySnapshot,
    limitations: ['Reviewer correction rates are not a measure of clinical accuracy.',
      'Detailed OCR/page traces are retained on the importing browser. They may be unavailable on another device or after browser storage is cleared.',
      'Older imports may lack original baselines, timings, geometry, or deleted-row history. Unavailable data is not treated as zero errors.',
      'Export includes report text and patient matching identifiers, but excludes source file bytes, API credentials, and unrelated chart notes.'],
  };
}
