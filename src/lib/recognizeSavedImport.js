import { mergeChartLabs } from './mergeChartLabs.js';
import { labsReadyToSave } from './labDocument.js';
import { PATIENT_CHART_TARGET } from './labSaveTarget.js';

// Recognition only: never writes results or marks an unmatched row verified.
export function recognizeSavedImport(labs, packet, encounters, selectedEncounterId, patientLabs = []) {
  const matchedIndexes = new Set(), conflicts = [];
  const target = selectedEncounterId === PATIENT_CHART_TARGET ? { importedSendOutLabs: patientLabs } : encounters.find(enc => String(enc.id) === String(selectedEncounterId));
  if (!target) return { matchedIndexes, conflicts, completedPages: [] };
  const readLabs = enc => enc.imported_send_out_labs || enc.importedSendOutLabs || [];
  const existing = readLabs(target);
  const elsewhere = [...encounters.filter(enc => enc !== target).flatMap(readLabs), ...(selectedEncounterId === PATIENT_CHART_TARGET ? [] : patientLabs)];
  const memberIds = packet.memberPacketIds?.length ? packet.memberPacketIds : [packet.packetId];
  labs.forEach((lab, index) => {
    if (!labsReadyToSave([lab]).length) return;
    const incoming = { ...lab, sourceImportPacketId: packet.packetId,
      sourceDocumentId: packet.sourceDocument?.id || null,
      collectedDate: lab.collectedDate || packet.collectedDate || '' };
    try {
      if (mergeChartLabs(existing, [incoming], memberIds, elsewhere).skipped === 1) matchedIndexes.add(index);
    } catch (error) { conflicts.push({ index, message: error.message }); }
  });
  const pages = [...new Set(labs.map(lab => lab.sourcePage).filter(Boolean))];
  const completedPages = pages.filter(page => labs.every((lab, index) => lab.sourcePage !== page || matchedIndexes.has(index)));
  return { matchedIndexes, conflicts, completedPages };
}
