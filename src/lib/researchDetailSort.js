export function sortResearchDetails(rows, order, getDate = row => row.date, getName = row => row.patient) {
  return [...rows].sort((a, b) => {
    const nameOrder = String(getName(a) || '').localeCompare(String(getName(b) || ''), undefined, { sensitivity: 'base', numeric: true });
    const aDate = getDate(a) || '', bDate = getDate(b) || '';
    if (order === 'patient') return nameOrder || bDate.localeCompare(aDate);
    if (!aDate || !bDate) return aDate ? -1 : bDate ? 1 : nameOrder;
    return (order === 'oldest' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate)) || nameOrder;
  });
}
