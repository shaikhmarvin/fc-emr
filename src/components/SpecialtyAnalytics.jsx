import { useMemo } from 'react';
import { buildSpecialtyAnalytics } from '../utils/specialtyAnalytics.js';
import { percent } from '../researchAnalytics.js';
export default function SpecialtyAnalytics({ patients, startDate, endDate, onInspect }) {
  const report = useMemo(() => buildSpecialtyAnalytics(patients, startDate, endDate), [patients, startDate, endDate]);
  function inspect(title, rows, source) {
    onInspect({ title, rows: rows.map(row => ({ patient: row.patientName, patientId: row.patientId, date: row.date, encounterId: row.encounter.id, value: row.program || 'Recorded interest / need', source })) });
  }
  const count = (title, rows, number, source) => <button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => inspect(title, rows, source)}>{number}</button>;
  return <section aria-label="Specialty tracking" className="space-y-4">
    <h2 className="text-lg font-semibold text-slate-900">Specialty use and interest</h2>
    <div className="research-metrics">
      <div className="research-metric rounded-xl bg-slate-50 p-4"><p>Specialty use rate</p><p className="text-2xl font-bold">{count('Specialty users', report.used, percent(report.specialtyPatients, report.patients), 'Unique specialty users ÷ all non-cancelled clinic patients')}</p><p className="text-xs text-slate-500">{report.specialtyPatients} of {report.patients} patients</p></div>
      <div className="research-metric rounded-xl bg-slate-50 p-4"><p>Specialty visits</p><p className="text-2xl font-bold">{count('Specialty visits', report.used, report.used.length, 'Non-cancelled specialty encounters')}</p></div>
    </div>
    <div className="overflow-x-auto"><table className="research-table"><thead><tr>{['Specialty', 'Patients / use rate', 'Visits', 'Completed / rate', 'Interest / need', 'Interest rate', 'Not yet used', 'Repeat patients', 'LWOBS'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{report.groups.map(g => <tr key={g.program}>
      <td className="px-3 py-3 font-semibold">{g.program}</td>
      <td className="px-3 py-3">{count(g.program + ' users', g.used, g.patients + ' / ' + percent(g.patients, report.patients), 'Unique specialty users ÷ all clinic patients')}</td>
      <td className="px-3 py-3">{count(g.program + ' visits', g.used, g.used.length, 'Non-cancelled specialty visits')}</td>
      <td className="px-3 py-3">{count(g.program + ' completed visits', g.completed, g.completed.length + ' / ' + percent(g.completed.length, g.used.length), 'Completed ÷ non-cancelled specialty visits')}</td>
      <td className="px-3 py-3">{count(g.program + ' interest / need', g.interested, g.interestedPatients, 'Positive or free-text specialty intake response; includes Maybe')}</td>
      <td className="px-3 py-3">{count(g.program + ' assessed interest', g.assessed, percent(g.interestedPatients, g.assessedPatients), 'Interested patients ÷ patients with a recorded response (excludes blank / N/A)')}</td>
      <td className="px-3 py-3">{count(g.program + ' interest without subsequent use', g.unmet, g.unmetPatients, 'No same-specialty non-cancelled visit on or after interest date within selected range')}</td>
      <td className="px-3 py-3">{count(g.program + ' repeat patients', g.repeat, g.repeatPatients, 'Completed specialty visits on two or more distinct dates within selected range')}</td>
      <td className="px-3 py-3">{count(g.program + ' LWOBS', g.cancelled, g.cancelled.length, 'Cancelled specialty encounters')}</td>
    </tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">Uses the selected dates and clinic event. Use means a non-cancelled specialty check-in; completed care requires a completed encounter. Interest / need comes from recorded specialty intake responses, including free text and Maybe, and is not a clinical diagnosis. Interest rate excludes blank and N/A responses. Not yet used means no same-specialty visit on or after the recorded interest within this period. Repeat patients require completed visits on different dates. Patients may appear in multiple specialties; counts should not be added across rows.</p>
  </section>;
}
