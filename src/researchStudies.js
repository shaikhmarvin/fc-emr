import { minutesBetween, percent } from './researchAnalytics.js';

function dayNumber(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const milliseconds = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === date ? milliseconds / 86400000 : null;
}

function timestamp(encounter, key) {
  if (key === 'studentStartAt') return encounter.studentStartAt || encounter.studentAssignedAt || encounter.student_assigned_at;
  return encounter[key] || encounter[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)];
}

export const workflowStages = [
  ['Patient Checked In → Leadership Registration Complete', 'createdAt', 'leadershipIntakeCompletedAt'],
  ['Leadership Registration Complete → Student Start Time', 'leadershipIntakeCompletedAt', 'studentStartAt'],
  ['Student Start Time → Upper-Level Assigned', 'studentStartAt', 'upperLevelAssignedAt'],
  ['Upper-level → visit complete', 'upperLevelAssignedAt', encounter => timestamp(encounter, 'visitCompletedAt') || timestamp(encounter, 'doneAt')],
  ['Visit complete → medication pickup', 'visitCompletedAt', 'pharmacyPickedUpAt'],
];

function summarizeStage(rows, [label, start, end]) {
  const details = rows.map(row => {
    const from = timestamp(row.encounter, start);
    const to = typeof end === 'function' ? end(row.encounter) : timestamp(row.encounter, end);
    const minutes = minutesBetween(from, to);
    const reason = !from || !to ? 'Missing timestamp' : minutes === null ? 'Invalid interval' : null;
    return { ...row, minutes, reason, researchValue: minutes === null ? reason : `${minutes} minutes`, researchSource: `${from || 'Missing start'} → ${to || 'Missing end'}` };
  });
  const valid = details.filter(row => row.minutes !== null);
  const sorted = valid.map(row => row.minutes).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { label, rows: details, valid: valid.length,
    missing: details.filter(row => row.reason === 'Missing timestamp').length,
    invalid: details.filter(row => row.reason === 'Invalid interval').length,
    median: sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : '—',
    p90: sorted.length ? sorted[Math.ceil(sorted.length * .9) - 1] : '—',
  };
}

export function buildResearchStudies(report, endDate) {
  const rows = report.rows.filter(row => dayNumber(row.date) !== null);
  const byPatient = new Map();
  rows.forEach(row => {
    if (!byPatient.has(row.patientId)) byPatient.set(row.patientId, []);
    byPatient.get(row.patientId).push(row);
  });
  const indices = [...byPatient.values()].map(visits => [...visits].sort((a, b) => a.date.localeCompare(b.date) || String(a.encounter.id).localeCompare(String(b.encounter.id)))[0]);
  const endDay = dayNumber(endDate);
  const followup = [30, 60, 90].map(days => {
    const source = indices.map(index => {
      const next = byPatient.get(index.patientId).filter(row => row.date > index.date).sort((a, b) => a.date.localeCompare(b.date))[0];
      const gap = next ? dayNumber(next.date) - dayNumber(index.date) : null;
      const eligible = endDay !== null && endDay - dayNumber(index.date) >= days;
      const returned = eligible && gap !== null && gap <= days;
      return { ...index, eligible, returned, researchValue: !eligible ? 'Insufficient follow-up' : returned ? `Returned in ${gap} days` : `No return within ${days} days`, researchSource: `Index encounter ${index.encounter.id} on ${index.date}; next general visit: ${next ? `${next.date} (${next.encounter.id})` : 'none recorded through end date'}` };
    });
    const group = (label, subset) => {
      const eligible = subset.filter(row => row.eligible);
      return { label, rows: subset, eligible, returned: eligible.filter(row => row.returned), excluded: subset.filter(row => !row.eligible) };
    };
    return { days, ...group('All patients', source),
      groups: [
        ...[['HTN+ only', c => c.htn && !c.dm], ['DM+ only', c => c.dm && !c.htn], ['HTN+ and DM+', c => c.htn && c.dm], ['Neither recorded', c => !c.htn && !c.dm]].map(([label, matches]) => group(label, source.filter(row => matches(row.chronic)))),
        ...[...new Set(source.map(row => row.transportation))].sort().map(mode => group(`Transportation: ${mode}`, source.filter(row => row.transportation === mode))),
      ],
    };
  });
  const stages = workflowStages.map(stage => summarizeStage(rows, stage));
  const daily = [...new Set(rows.map(row => row.date))].sort().reverse().map(date => ({ date, stages: workflowStages.map(stage => summarizeStage(rows.filter(row => row.date === date), stage)) }));
  const pharmacyRows = [...report.generalAnalyticsRows, ...report.refillAnalyticsRows].filter(row => row.encounter.status !== 'cancelled' && dayNumber(row.date) !== null);
  const transitions = [];
  const pharmacyPatients = new Map();
  pharmacyRows.forEach(row => {
    if (!pharmacyPatients.has(row.patientId)) pharmacyPatients.set(row.patientId, []);
    pharmacyPatients.get(row.patientId).push(row);
  });
  const type = row => row.visitType === 'refill_only' ? 'Refill' : 'General';
  let ambiguous = 0;
  pharmacyPatients.forEach(visits => {
    const ordered = [...visits].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1], current = ordered[i];
      // Same-day ordering is unknown; also exclude pairs touching a date with multiple visits.
      if (ordered.filter(row => row.date === previous.date).length > 1 || ordered.filter(row => row.date === current.date).length > 1) { ambiguous++; continue; }
      const days = dayNumber(current.date) - dayNumber(previous.date);
      transitions.push({ ...current, transition: `${type(previous)} → ${type(current)}`, days,
        researchValue: `${type(previous)} → ${type(current)} in ${days} days`, researchSource: `${previous.encounter.id} (${previous.date}) → ${current.encounter.id} (${current.date})` });
    }
  });
  return { followup, stages, daily, missingTransport: indices.filter(row => row.transportation === 'Not recorded'), invalidDates: report.rows.filter(row => dayNumber(row.date) === null),
    transitions: ['General → General', 'General → Refill', 'Refill → General', 'Refill → Refill'].map(label => {
      const source = transitions.filter(row => row.transition === label);
      const sorted = source.map(row => row.days).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return { label, rows: source, patients: new Set(source.map(row => row.patientId)).size, median: sorted.length ? sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 : '—', share: percent(source.length, transitions.length) };
    }), ambiguous, pharmacyRows,
  };
}
