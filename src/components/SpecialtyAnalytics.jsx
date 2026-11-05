import { useMemo } from 'react';
import { buildSpecialtyAnalytics } from '../utils/specialtyAnalytics.js';

export default function SpecialtyAnalytics({ patients, historyPatients = patients, programEntries = [], startDate, endDate, onInspect }) {
  const report = useMemo(() => buildSpecialtyAnalytics(patients, startDate, endDate, programEntries, historyPatients), [patients, historyPatients, startDate, endDate, programEntries]);
  function inspect(title, rows, source) {
    onInspect({ title, rows: rows.map(row => ({ patient: row.patientName, patientId: row.patientId, date: row.date, encounterId: row.encounter?.id, value: row.recordedProgram && row.recordedProgram !== row.program ? row.program + ' · Saved as ' + row.recordedProgram : row.program, source })) });
  }
  function count(title, rows, source) {
    return rows === null ? <span className="text-slate-400" title="No comparable Ophthalmology tracker total">N/A</span>
      : <button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => inspect(title, rows, source)}>{rows.length}</button>;
  }
  return <section aria-label="Specialty tracking" className="space-y-4">
    <h2 className="text-lg font-semibold text-slate-900">Specialty tracker</h2>
    <div className="overflow-x-auto"><table className="research-table">
      <thead><tr>{['Specialty', 'Patients seen', 'Total patients on tracker', 'Clinic visits', 'Repeat patients', 'Patients not yet seen'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
      <tbody>{report.groups.map(group => <tr key={group.program}>
        <td className="px-3 py-3 font-semibold">{group.program}</td>
        <td className="px-3 py-3">{count(group.program + ': patients seen', group.patientsSeen, 'Unique patients with completed specialty visits in the selected dates and clinic event')}</td>
        <td className="px-3 py-3">{count(group.program + ': tracker patients', group.trackerPatients, 'Unique patients currently on the specialty tracker; includes all tracker statuses')}</td>
        <td className="px-3 py-3">{count(group.program + ': clinic visits', group.visits, 'Completed specialty visits in the selected dates and clinic event; one visit per patient per date')}</td>
        <td className="px-3 py-3">{count(group.program + ': repeat patients', group.repeatPatients, 'Patients with completed specialty visits on two or more dates in this period')}</td>
        <td className="px-3 py-3">{count(group.program + ': patients not yet seen', group.notSeen, 'Tracker patients with no completed visit for this specialty in chart history through the selected end date')}</td>
      </tr>)}</tbody>
    </table></div>
    <p className="text-xs text-slate-500">Patients seen, clinic visits, and repeat patients use the selected dates and clinic event. Clinic visits count completed patient visits, once per patient per date. Repeat patients were seen on at least two dates. Tracker totals count unique patients across all current tracker statuses. Patients not yet seen have no completed visit for that specialty anywhere in chart history through the selected end date. Mental Health and Addiction Medicine share one row; historical visits and tracker entries under either label are combined, with duplicate patients and same-day visits counted once. Ophtho tracker totals and patients not yet seen are unavailable.</p>
  </section>;
}
