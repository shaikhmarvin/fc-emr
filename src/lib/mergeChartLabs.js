const text = value => String(value ?? '').trim();
const valueKey = value => {
  if (value && typeof value === 'object') value = value.value;
  const raw = text(value);
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) return String(Number(raw));
  return raw.toLowerCase().replace(/\s/g, '').replace(/(?<=[a-z])-(?=[a-z])/g, '');
};
const identity = lab => JSON.stringify([lab.key || text(lab.displayName).toLowerCase(),
  text(lab.collectedDate || lab.collectionDate), text(lab.unit || lab.units).replace(/μ/g, 'µ')]);

// Reprocessing is additive. It cannot silently revise or remove a saved result.
export function mergeChartLabs(existing, incoming, memberPacketIds = [], knownElsewhere = []) {
  const merged = [...existing];
  let added = 0, skipped = 0;
  for (const lab of incoming) {
    const sameReport = [...merged, ...knownElsewhere].filter(old =>
      (lab.sourceDocumentId && old.sourceDocumentId === lab.sourceDocumentId) ||
      memberPacketIds.includes(old.sourceImportPacketId));
    const matches = sameReport.filter(old => identity(old) === identity(lab));
    if (matches.some(old => valueKey(old.value) === valueKey(lab.value))) {
      skipped += 1;
      continue;
    }
    if (matches.length) throw new Error(`${lab.displayName || lab.key}: this document already has a different saved result. The chart was not changed. Review the existing result before importing a correction.`);
    const ambiguous = sameReport.some(old => (old.key || old.displayName) === (lab.key || lab.displayName) &&
      ((!text(old.collectedDate || old.collectionDate) || !text(lab.collectedDate || lab.collectionDate)) ||
        !text(old.unit || old.units) || !text(lab.unit || lab.units)));
    if (ambiguous) throw new Error(`${lab.displayName || lab.key}: a saved result from this document is missing a matching date or units. Review it before adding another copy. The chart was not changed.`);
    // Old imports may predate document IDs. Do not guess whether they are a new specimen.
    const legacy = merged.some(old => !old.sourceDocumentId && !old.sourceImportPacketId &&
      identity(old) === identity(lab) && valueKey(old.value) === valueKey(lab.value));
    if (legacy) throw new Error(`${lab.displayName || lab.key}: a matching older result is already in this visit. Remove this repeated row from the import before saving. The existing result will be preserved.`);
    merged.push(lab); added += 1;
  }
  return { labs: merged, added, skipped };
}
