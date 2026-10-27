const tokens = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]+/g) || [];
export function matchesLabPatientSearch(patient, search) {
  const query = String(search || '').trim().toLowerCase();
  const dob = String(patient.dob || '');
  const parts = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dates = [dob];
  if (parts) {
    const [, year, month, day] = parts;
    for (const separator of ['-', '/']) {
      dates.push(`${month}${separator}${day}${separator}${year}`);
      dates.push(`${Number(month)}${separator}${Number(day)}${separator}${year}`);
    }
  }
  return `${patient.firstName || ''} ${patient.lastName || ''} ${patient.mrn || ''} ${dates.join(' ')}`.toLowerCase().includes(query);
}

function similarity(a, b) {
  if (a === b) return 1;
  if (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] !== b[j - 1]));
    row = next;
  }
  return 1 - row[b.length] / Math.max(a.length, b.length);
}
export function labNameSuggestionScore(extractedName, patient) {
  const observed = tokens(extractedName).filter(word => !['patient', 'name', 'mr', 'mrs', 'ms', 'jr', 'sr'].includes(word));
  const expected = tokens(`${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`).filter(word => !['jr', 'sr'].includes(word));
  if (!observed.length || !expected.length) return 0;
  const choices = [];
  observed.forEach((a, i) => expected.forEach((b, j) => {
    if (Math.min(a.length, b.length) < 3) return;
    const score = similarity(a, b);
    if (score >= 0.7) choices.push({ i, j, score, weight: Math.min(a.length, b.length) * score });
  }));
  const usedObserved = new Set(), usedExpected = new Set(); let weight = 0;
  for (const choice of choices.sort((a, b) => b.weight - a.weight)) {
    if (usedObserved.has(choice.i) || usedExpected.has(choice.j)) continue;
    usedObserved.add(choice.i); usedExpected.add(choice.j); weight += choice.weight;
  }
  const coverage = weight / expected.join('').length;
  const precision = weight / observed.join('').length;
  return coverage >= 0.5 && precision >= 0.6 ? Math.round(100 * (coverage + precision) / 2) : 0;
}
