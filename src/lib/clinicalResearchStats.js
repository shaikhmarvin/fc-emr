import { researchClinicalStatus } from './researchClinicalStatus.js';
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
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
    followupDays: mean(pairs.map(p => p.days)) };
}

export function buildClinicalResearchStats(groups) {
  const cohorts = [
    { label: 'All HTN patients', labels: ['HTN+ only', 'HTN+ and DM+'], keys: ['systolic', 'diastolic'] },
    { label: 'All DM patients', labels: ['DM+ only', 'HTN+ and DM+'], keys: ['a1c'] },
  ];
  return cohorts.map(cohort => {
    const group = { rows: groups.filter(item => cohort.labels.includes(item.label)).flatMap(item => item.rows) };
    const patients = new Map();
    for (const row of group.rows) {
      if (!patients.has(row.patientId)) patients.set(row.patientId, []);
      patients.get(row.patientId).push(row);
    }
    const series = { systolic: [], diastolic: [], a1c: [] };
    for (const [patientId, rows] of patients) {
      const encounters = [...new Map(rows.map(row => [row.encounter.id, row.encounter])).values()];
      const days = [...new Set(rows.map(row => row.date))].sort().map(date => {
        const status = researchClinicalStatus({ encounters }, date);
        const bp = status.bp.map(value => value.split('/').map(Number));
        return { date, systolic: mean(bp.map(pair => pair[0])), diastolic: mean(bp.map(pair => pair[1])), a1c: mean(status.a1c.map(Number)) };
      });
      for (const key of Object.keys(series)) series[key].push({ patientId, days: days.filter(day => day[key] !== null).map(day => ({ date: day.date, value: day[key] })) });
    }
    return { label: cohort.label, measures: Object.fromEntries(Object.entries(series).filter(([key]) => cohort.keys.includes(key)).map(([key, values]) => [key, summarizeClinicalMeasure(values)])) };
  });
}
