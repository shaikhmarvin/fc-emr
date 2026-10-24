import { buildClinicalResearchStats } from '../lib/clinicalResearchStats.js';
const number = value => value === null ? '—' : value.toFixed(1);
export default function ClinicalResearchStats({ groups }) {
  const cohorts = buildClinicalResearchStats(groups);
  return <section className="mt-6 space-y-4" aria-label="BP and A1C research summaries">
    <div><h3 className="text-lg font-semibold text-slate-900">BP and A1C Outcomes</h3>
      <p className="mt-1 text-sm text-slate-600">Updates from saved readings as values are entered. Uses the selected dates and clinic event, with general-clinic visits only. BP includes all patients with HTN; A1C includes all patients with DM. Patients with both conditions contribute to each relevant outcome.</p></div>
    {cohorts.map(cohort => <div key={cohort.label} className="rounded-xl border border-slate-200 p-4">
      <h4 className="font-semibold text-slate-900">{cohort.label}</h4>
      <div className="mt-3 overflow-x-auto"><table className="research-table"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
        {['Measure', 'Patients with data', 'Latest average', 'Latest range', 'Patients with follow-up', 'Paired first → latest', 'Average change', 'Lower / same / higher', 'Average follow-up'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}
      </tr></thead><tbody>{Object.entries(cohort.measures).map(([key, stats]) => {
        const label = key === 'a1c' ? 'A1C' : key === 'systolic' ? 'Systolic BP' : 'Diastolic BP';
        const unit = key === 'a1c' ? '%' : 'mmHg';
        return <tr key={key} className="border-t border-slate-200">
          <td data-label="Measure" className="px-3 py-3 font-medium">{label} ({unit})</td>
          <td data-label="Patients with data" className="px-3 py-3">{stats.available} / {stats.total}<span className="block text-xs text-slate-500">{stats.missing} missing</span></td>
          <td data-label="Latest average" className="px-3 py-3">{number(stats.mean)}</td>
          <td data-label="Latest range" className="px-3 py-3">{number(stats.min)} – {number(stats.max)}</td>
          <td data-label="Patients with follow-up" className="px-3 py-3">{stats.paired}</td>
          <td data-label="Paired first → latest" className="px-3 py-3">{number(stats.baseline)} → {number(stats.followup)}</td>
          <td data-label="Average change" className="px-3 py-3">{stats.change > 0 ? '+' : ''}{number(stats.change)}{key === 'a1c' ? ' percentage points' : ' mmHg'}</td>
          <td data-label="Lower / same / higher" className="px-3 py-3">{stats.lower} / {stats.unchanged} / {stats.higher}</td>
          <td data-label="Average follow-up" className="px-3 py-3">{number(stats.followupDays)} days</td>
        </tr>;
      })}</tbody></table></div>
    </div>)}
    <p className="text-xs text-slate-500">Each patient contributes one latest dated value to averages and ranges. Multiple distinct readings on the same day are averaged; identical values on that day count once. Changes compare each patient's first and latest dates within the filter, using only patients with at least two distinct dates. A1C uses collection date when available. Missing and nonnumeric values are excluded. Lower values describe observed change, not confirmed clinical improvement or an effect of clinic care. Retrospective entry and incomplete follow-up may affect these summaries.</p>
  </section>;
}
