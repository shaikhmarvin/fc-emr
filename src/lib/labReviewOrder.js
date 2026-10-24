// Presentation order only: preserve each lab's clinical group and original edit index.
export function labsBySourcePage(labs = []) {
  const pages = new Map();
  labs.forEach((lab, index) => {
    const page = Number(lab.sourcePage);
    const pageNumber = Number.isInteger(page) && page > 0 ? page : null;
    if (!pages.has(pageNumber)) pages.set(pageNumber, []);
    pages.get(pageNumber).push({ lab, index });
  });
  return [...pages.entries()].sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity)).map(([page, rows]) => {
    rows.sort((a, b) => {
      const aRow = Number(String(a.lab.sourceRowId || '').match(/^row-(\d+)$/)?.[1]);
      const bRow = Number(String(b.lab.sourceRowId || '').match(/^row-(\d+)$/)?.[1]);
      if (aRow && bRow && aRow !== bRow) return aRow - bRow;
      if (Number.isFinite(a.lab.sourceBox?.y) && Number.isFinite(b.lab.sourceBox?.y)) {
        return a.lab.sourceBox.y - b.lab.sourceBox.y || (a.lab.sourceBox.x || 0) - (b.lab.sourceBox.x || 0) || a.index - b.index;
      }
      return a.index - b.index;
    });
    return [page ? `Page ${page}` : 'Results without a page', rows];
  });
}
