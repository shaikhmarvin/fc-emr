import { researchClinicalStatus } from './researchClinicalStatus.js';
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null;
};
export function compareClinicalFollowup(series) {
  const summarize = rows => {
    const latest = rows.map(row => row.days.at(-1).value);
    return { count: rows.length, mean: mean(latest), median: median(latest),
      min: latest.length ? Math.min(...latest) : null, max: latest.length ? Math.max(...latest) : null,
      baseline: mean(rows.map(row => row.days[0].value)),
      change: mean(rows.filter(row => row.days.length >= 2).map(row => row.days.at(-1).value - row.days[0].value)) };
  };
  return { withFollowup: summarize(series.filter(row => row.days.length >= 2)),
    withoutFollowup: summarize(series.filter(row => row.days.length === 1)), missing: series.filter(row => !row.days.length).length };
}
export function summarizeClinicalMeasure(series) {
  const available = series.filter(item => item.days.length);
  const latest = available.map(item => item.days.at(-1).value);
  const pairs = available.filter(item => item.days.length >= 2).map(item => ({
    patientId: item.patientId, first: item.days[0], last: item.days.at(-1),
    delta: item.days.at(-1).value - item.days[0].value,
    days: Math.round((Date.parse(item.days.at(-1).date) - Date.parse(item.days[0].date)) / 86400000),
  }));
  return { total: series.length, available: available.length, missing: series.length - available.length,
    mean: mean(latest), min: latest.length ? Math.min(...latest) : null, max: latest.length ? Math.max(...latest) : null,
    paired: pairs.length, baseline: mean(pairs.map(p => p.first.value)), followup: mean(pairs.map(p => p.last.value)),
    change: mean(pairs.map(p => p.delta)), lower: pairs.filter(p => p.delta < -1e-9).length,
    higher: pairs.filter(p => p.delta > 1e-9).length, unchanged: pairs.filter(p => Math.abs(p.delta) <= 1e-9).length,
    followupDays: mean(pairs.map(p => p.days)), followupComparison: compareClinicalFollowup(series), series };
}

export function buildClinicalResearchStats(groups, patients = [], dateRange = {}) {
  const cohorts = [
    { label: 'All HTN patients', labels: ['HTN+ only', 'HTN+ and DM+'], keys: ['systolic', 'diastolic'] },
    { label: 'All DM patients', labels: ['DM+ only', 'HTN+ and DM+'], keys: ['a1c'] },
  ];
  return cohorts.map(cohort => {
    const group = { rows: groups.filter(item => cohort.labels.includes(item.label)).flatMap(item => item.rows) };
    const cohortPatients = new Map();
    for (const row of group.rows) {
      if (!cohortPatients.has(row.patientId)) cohortPatients.set(row.patientId, []);
      cohortPatients.get(row.patientId).push(row);
    }
    const series = { systolic: [], diastolic: [], a1c: [] };
    for (const [patientId, rows] of cohortPatients) {
      const encounters = [...new Map(rows.map(row => [row.encounter.id, row.encounter])).values()];
      const chartLabs = (patients.find(patient => String(patient.id) === String(patientId))?.importedSendOutLabs || []).filter(lab => {
        const date = lab.collectedDate;
        return date && (dateRange.startDate ? date >= dateRange.startDate : rows.some(row => row.date === date))
          && (!dateRange.endDate || date <= dateRange.endDate)
          && (!dateRange.clinicEvent || rows.some(row => row.date === date));
      });
      const days = [...new Set([...rows.map(row => row.date), ...chartLabs.map(lab => lab.collectedDate)])].sort().map(date => {
        const status = researchClinicalStatus({ encounters, importedSendOutLabs: chartLabs }, date);
        const bp = status.bp.map(value => value.split('/').map(Number));
        return { date, systolic: mean(bp.map(pair => pair[0])), diastolic: mean(bp.map(pair => pair[1])), a1c: mean(status.a1c.map(Number)) };
      });
      for (const key of Object.keys(series)) series[key].push({ patientId, patientName: rows[0].patientName, rows, days: days.filter(day => day[key] !== null).map(day => ({ date: day.date, value: day[key] })) });
    }
    return { label: cohort.label, measures: Object.fromEntries(Object.entries(series).filter(([key]) => cohort.keys.includes(key)).map(([key, values]) => [key, summarizeClinicalMeasure(values)])) };
  });
}

export function filterClinicalPatients(series, filter) {
  return series.filter(item => {
    const count = item.days.length;
    const delta = count >= 2 ? item.days.at(-1).value - item.days[0].value : null;
    return filter === 'all' || (filter === 'missing' && !count) || (filter === 'available' && count > 0)
      || (filter === 'paired' && count >= 2) || (filter === 'noFollowup' && count < 2)
      || (filter === 'single' && count === 1)
      || (filter === 'lower' && delta !== null && delta < -1e-9)
      || (filter === 'higher' && delta !== null && delta > 1e-9)
      || (filter === 'unchanged' && delta !== null && Math.abs(delta) <= 1e-9);
  });
}
