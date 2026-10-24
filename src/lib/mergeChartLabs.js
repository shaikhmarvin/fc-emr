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
    const partialMatches = sameReport.filter(old => {
      if ((old.key || old.displayName) !== (lab.key || lab.displayName)) return false;
      const oldDate = text(old.collectedDate || old.collectionDate);
      const newDate = text(lab.collectedDate || lab.collectionDate);
      const oldUnit = text(old.unit || old.units).replace(/μ/g, 'µ');
      const newUnit = text(lab.unit || lab.units).replace(/μ/g, 'µ');
      // Known differences distinguish specimens/assays even if another field is blank.
      if (oldDate && newDate && oldDate !== newDate) return false;
      if (oldUnit && newUnit && oldUnit !== newUnit) return false;
      return !oldDate || !newDate || !oldUnit || !newUnit;
    });
    // One compatible result with the identical value is a safe repeat. Preserve
    // the original object, including its flags and incomplete source metadata.
    if (partialMatches.length === 1 && valueKey(partialMatches[0].value) === valueKey(lab.value)) {
      skipped += 1;
      continue;
    }
    if (partialMatches.length) throw new Error(`${lab.displayName || lab.key}: a saved result from this document has incomplete date or units, and this row cannot be matched safely. Compare it with the saved result and remove this row from the import if it is a repeat. The chart was not changed.`);
    // Old imports may predate document IDs. Do not guess whether they are a new specimen.
    const legacy = merged.some(old => !old.sourceDocumentId && !old.sourceImportPacketId &&
      identity(old) === identity(lab) && valueKey(old.value) === valueKey(lab.value));
    if (legacy) throw new Error(`${lab.displayName || lab.key}: a matching older result is already in this visit. Remove this repeated row from the import before saving. The existing result will be preserved.`);
    merged.push(lab); added += 1;
  }
  return { labs: merged, added, skipped };
}
