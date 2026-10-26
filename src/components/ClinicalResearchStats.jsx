import { useEffect, useRef, useState } from 'react';
import { buildClinicalResearchStats, filterClinicalPatients } from '../lib/clinicalResearchStats.js';
const number = value => value === null ? '—' : value.toFixed(1);
export default function ClinicalResearchStats({ groups, patients = [], dateRange, onOpenPatientChart }) {
  const [detail, setDetail] = useState(null);
  const inspect = (cohort, key, stats, filter = 'all') => setDetail({ title: cohort.label + ': ' + (key === 'a1c' ? 'A1C' : key === 'systolic' ? 'Systolic BP' : 'Diastolic BP'), stats, filter });
  const cohorts = buildClinicalResearchStats(groups, patients, dateRange);
  return <section className="mt-6 space-y-4" aria-label="BP and A1C research summaries">
    {detail && <OutcomeDetails detail={detail} patients={patients} onOpenPatientChart={onOpenPatientChart} onClose={() => setDetail(null)} />}
    <div><h3 className="text-lg font-semibold text-slate-900">BP and A1C Outcomes</h3>
      <p className="mt-1 text-sm text-slate-600">Uses patients from the selected general-clinic visits and filters. A1C also includes results saved directly to their charts by collection date within the selected dates. BP includes patients with HTN; A1C includes patients with DM.</p></div>
    {cohorts.map(cohort => <div key={cohort.label} className="rounded-xl border border-slate-200 p-4">
      <h4 className="font-semibold text-slate-900">{cohort.label}</h4>
      <div className="mt-3 overflow-x-auto"><table className="research-table"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
        {['Measure', 'Patients with data', 'Latest average', 'Latest range', 'Patients with follow-up', 'Paired first → latest', 'Average change', 'Lower / same / higher', 'Average follow-up'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}
      </tr></thead><tbody>{Object.entries(cohort.measures).map(([key, stats]) => {
        const label = key === 'a1c' ? 'A1C' : key === 'systolic' ? 'Systolic BP' : 'Diastolic BP';
        const link = (value, filter = 'available') => <button type="button" className="text-blue-700 hover:underline" onClick={() => inspect(cohort, key, stats, filter)}>{value}</button>;
        const unit = key === 'a1c' ? '%' : 'mmHg';
        return <tr key={key} className="border-t border-slate-200">
          <td data-label="Measure" className="px-3 py-3 font-medium">{link(`${label} (${unit})`, 'all')}</td>
          <td data-label="Patients with data" className="px-3 py-3">{link(stats.available)} / {link(stats.total, 'all')}<span className="block text-xs text-slate-500">{link(`${stats.missing} missing`, 'missing')}</span></td>
          <td data-label="Latest average" className="px-3 py-3">{link(number(stats.mean))}</td>
          <td data-label="Latest range" className="px-3 py-3">{link(`${number(stats.min)} – ${number(stats.max)}`)}</td>
          <td data-label="Patients with follow-up" className="px-3 py-3">{link(stats.paired, 'paired')}</td>
          <td data-label="Paired first → latest" className="px-3 py-3">{link(`${number(stats.baseline)} → ${number(stats.followup)}`, 'paired')}</td>
          <td data-label="Average change" className="px-3 py-3">{link(`${stats.change > 0 ? '+' : ''}${number(stats.change)}${key === 'a1c' ? ' percentage points' : ' mmHg'}`, 'paired')}</td>
          <td data-label="Lower / same / higher" className="px-3 py-3">{link(stats.lower, 'lower')} / {link(stats.unchanged, 'unchanged')} / {link(stats.higher, 'higher')}</td>
          <td data-label="Average follow-up" className="px-3 py-3">{link(`${number(stats.followupDays)} days`, 'paired')}</td>
        </tr>;
      })}</tbody></table></div>
      {cohort.measures.systolic && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4">
        <h5 className="font-semibold text-slate-900">HTN follow-up comparison</h5>
        <p className="mt-1 text-sm text-slate-600">Follow-up means BP recorded on at least two distinct dates within the selected filters. The comparison group has one dated BP. Patients without any BP are excluded from both groups.</p>
        <div className="mt-3 overflow-x-auto"><table className="research-table"><thead className="bg-white text-xs uppercase text-slate-500"><tr>
          {['Measure', 'Follow-up readings', 'Patients', 'First average', 'Latest average', 'Latest median', 'Latest range', 'Average change'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}
        </tr></thead><tbody>{['systolic', 'diastolic'].flatMap(key => ['withFollowup', 'withoutFollowup'].map(group => {
          const stats = cohort.measures[key], comparison = stats.followupComparison[group];
          return <tr key={key + group} className="border-t border-blue-100">
            <td className="px-3 py-3">{key === 'systolic' ? 'Systolic' : 'Diastolic'} (mmHg)</td>
            <td className="px-3 py-3">{group === 'withFollowup' ? 'Two or more dates' : 'One date'}</td>
            <td className="px-3 py-3"><button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => inspect(cohort, key, stats, group === 'withFollowup' ? 'paired' : 'single')}>{comparison.count}</button></td>
            <td className="px-3 py-3">{number(comparison.baseline)}</td>
            <td className="px-3 py-3">{number(comparison.mean)}</td>
            <td className="px-3 py-3">{number(comparison.median)}</td>
            <td className="px-3 py-3">{number(comparison.min)} – {number(comparison.max)}</td>
            <td className="px-3 py-3">{number(comparison.change)}</td>
          </tr>;
        }))}</tbody></table></div>
        <p className="mt-2 text-xs text-slate-600">Each patient contributes one latest BP. First-to-latest change is available only with follow-up. These groups may differ in starting BP and other factors; the comparison describes an association and does not establish that follow-up caused better control.</p>
      </div>}
    </div>)}
    <p className="text-xs text-slate-500">Each patient contributes one latest dated value to averages and ranges. Multiple distinct readings on the same day are averaged; identical values on that day count once. Changes compare each patient's first and latest dates within the filter, using only patients with at least two distinct dates. A1C uses collection date when available. Missing and nonnumeric values are excluded. Lower values describe observed change, not confirmed clinical improvement or an effect of clinic care. Retrospective entry and incomplete follow-up may affect these summaries.</p>
  </section>;
}

function OutcomeDetails({ detail, patients, onOpenPatientChart, onClose }) {
  const dialogRef = useRef(null);
  const [filter, setFilter] = useState(detail.filter);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  const rows = filterClinicalPatients(detail.stats.series, filter);
  return <dialog ref={dialogRef} aria-labelledby="outcome-detail-title" className="research-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="research-dialog-content">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div><h2 id="outcome-detail-title" className="text-lg font-bold text-slate-900">{detail.title}</h2><p className="text-sm text-slate-500">{rows.length} of {detail.stats.total} patients</p></div>
        <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-2">Close</button>
      </div>
      <div className="p-4"><label className="text-sm font-semibold">Reading status <select className="ml-2 rounded-lg border p-2" value={filter} onChange={event => setFilter(event.target.value)}>
        {[['all', 'All patients'], ['missing', 'Missing reading'], ['available', 'With reading'], ['paired', 'With follow-up'], ['single', 'One dated reading; no follow-up'], ['noFollowup', 'Missing follow-up (fewer than 2 dates)'], ['lower', 'Lower'], ['unchanged', 'Same'], ['higher', 'Higher']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label><p className="mt-2 text-xs text-slate-500">Missing means no valid reading in the selected dates and clinic event. Follow-up requires readings on two distinct dates.</p></div>
      <div className="research-dialog-body"><table className="research-table">
        <thead><tr>{['Patient', 'MRN', 'Reading status', 'First reading', 'Latest reading', 'Change', 'Chart'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{rows.map(item => {
          const patient = patients.find(candidate => String(candidate.id) === String(item.patientId));
          const first = item.days[0], latest = item.days.at(-1);
          const source = [...item.rows].sort((a, b) => b.date.localeCompare(a.date)).find(row => row.date === latest?.date) || [...item.rows].sort((a, b) => b.date.localeCompare(a.date))[0];
          const reading = value => value ? number(value.value) + ' on ' + value.date : 'Missing';
          return <tr key={item.patientId} className="border-t border-slate-200">
            <td data-label="Patient" className="p-3">{item.patientName || patient?.name || item.patientId}</td>
            <td data-label="MRN" className="p-3">{patient?.mrn || '—'}</td>
            <td data-label="Reading status" className="p-3">{!first ? 'Missing reading' : item.days.length < 2 ? 'Missing follow-up' : 'With follow-up'}</td>
            <td data-label="First reading" className="p-3">{reading(first)}</td>
            <td data-label="Latest reading" className="p-3">{reading(latest)}</td>
            <td data-label="Change" className="p-3">{item.days.length >= 2 ? number(latest.value - first.value) : '—'}</td>
            <td data-label="Chart" className="p-3"><button type="button" disabled={!patient || !onOpenPatientChart} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50" onClick={() => { onClose(); onOpenPatientChart?.(patient.id, source?.encounter.id); }}>Open visit</button></td>
          </tr>;
        })}{!rows.length && <tr><td colSpan={7} className="p-4 text-slate-500">No patients match this reading status.</td></tr>}</tbody>
      </table></div>
    </div>
  </dialog>;
}
