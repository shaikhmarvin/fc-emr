import { useMemo, useState } from 'react';
import { buildResearchStudies } from '../researchStudies.js';
import { percent } from '../researchAnalytics.js';

function StudyTable({ columns, rows }) {
  return <div className="mt-3 rounded-xl border border-slate-200"><table className="research-table">
    <thead className="bg-slate-50 text-xs text-slate-600"><tr>{columns.map(column => <th key={column} className="p-3">{column}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-200">{rows.length ? rows.map((cells, i) => <tr key={i}>{cells.map((cell, j) => <td key={columns[j]} data-label={columns[j]} className="p-3">{cell}</td>)}</tr>) : <tr><td colSpan={columns.length} className="p-4 text-slate-500">No eligible visits in this period.</td></tr>}</tbody>
  </table></div>;
}

export default function ResearchStudies({ report, endDate, study, onInspect }) {
  const data = useMemo(() => buildResearchStudies(report, endDate), [report, endDate]);
  const [windowDays, setWindowDays] = useState(30);
  const [clinicDate, setClinicDate] = useState('');
  const inspect = (label, rows) => onInspect({ title: label, rows: rows.map(row => ({ patient: row.patientName, date: row.date, encounterId: row.encounter.id, value: row.researchValue || 'Included visit', source: row.researchSource || 'Saved encounter' })) });
  const count = (label, rows) => <button type="button" className="text-blue-700 underline decoration-blue-200 underline-offset-2" onClick={() => inspect(label, rows)}>{rows.length}</button>;
  const followup = data.followup.find(window => window.days === windowDays);
  const stages = clinicDate ? data.daily.find(day => day.date === clinicDate)?.stages || [] : data.stages;
  const bottleneck = [...stages].filter(stage => stage.valid).sort((a, b) => b.median - a.median)[0];
  const pickupGroups = ['general', 'refill_only'].map(visitType => {
    const cohorts = report.pharmacyGroups.filter(group => group.visitType === visitType);
    const collect = key => cohorts.flatMap(group => group[key]).map(row => ({ ...row,
      researchValue: row.encounter.pharmacyPickedUpAt || row.encounter.pharmacy_picked_up_at ? 'picked up' : (row.encounter.pharmacyStatus || row.encounter.pharmacy_status || 'Not recorded').replaceAll('_', ' '),
      researchSource: 'Saved pharmacy outcome / pickup timestamp',
    }));
    return { label: visitType === 'general' ? 'General clinic' : 'Refill only', rows: collect('rows'), pickedUp: collect('pickedUp'), resolved: [...collect('pickedUp'), ...collect('notPickedUp')], notPickedUp: collect('notPickedUp'), pending: collect('pending'), noMeds: collect('noMeds'), unrecorded: collect('unrecorded') };
  });

  if (study === 'patients') return <section aria-label="Follow-up research" className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
    <h2 className="text-lg font-semibold text-slate-900">30 / 60 / 90-day follow-up</h2>
    <p className="mt-1 text-sm text-slate-600">Question: How does observed return to general clinic differ by transportation and recorded HTN/DM group?</p>
    <label className="mt-3 block text-sm font-medium">Follow-up window <select className="ml-2 rounded-lg border bg-white p-2" value={windowDays} onChange={event => setWindowDays(Number(event.target.value))}>{[30, 60, 90].map(days => <option key={days} value={days}>{days} days</option>)}</select></label>
    <p className="mt-3 text-sm text-slate-700">{count('All index visits', followup.rows)} index patients · {count('Missing index transportation', data.missingTransport)} missing transportation · {count('Invalid clinic dates excluded', data.invalidDates)} invalid clinic dates excluded</p>
    <StudyTable columns={['Group', 'Eligible patients', 'Returned within window', 'Return share', 'Insufficient follow-up']} rows={[followup, ...followup.groups].map(group => [group.label, count(`${group.label}: eligible at ${windowDays} days`, group.eligible), count(`${group.label}: returned within ${windowDays} days`, group.returned), percent(group.returned.length, group.eligible.length), count(`${group.label}: insufficient follow-up`, group.excluded)])} />
    <p className="mt-3 text-xs text-slate-600">One index visit per patient: the earliest non-cancelled general visit in the selected period, not necessarily their first-ever visit. Returns must occur on a later clinic date within the window. Eligibility requires the full window through the selected end date. Transportation is taken from the index visit, including Not recorded. HTN/DM groups use current profile diagnoses and saved history through the end date, not verified status at the index visit. Only saved visits in the selected clinic event count; no recorded return does not establish absence of care elsewhere. These are unadjusted associations.</p>
  </section>;

  if (study === 'times') return <section aria-label="Workflow bottleneck research" className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
    <h2 className="text-lg font-semibold text-slate-900">Workflow bottlenecks</h2>
    <p className="mt-1 text-sm text-slate-600">Question: Which recorded workflow stage takes longest, and does this differ across clinic dates?</p>
    <label className="mt-3 block text-sm font-medium">Compare clinic date <select className="ml-2 rounded-lg border bg-white p-2" value={clinicDate} onChange={event => setClinicDate(event.target.value)}><option value="">All selected dates</option>{data.daily.map(day => <option key={day.date}>{day.date}</option>)}</select></label>
    <p className="mt-3 text-sm text-slate-700">{bottleneck ? `Longest observed median: ${bottleneck.label} (${bottleneck.median} min, ${bottleneck.valid} usable visits).` : 'No usable workflow intervals for this selection.'}</p>
    <StudyTable columns={['Stage', 'Usable / assessed', 'Median minutes', '90th percentile minutes', 'Missing timestamps', 'Invalid intervals']} rows={stages.map(stage => [stage.label, <button type="button" className="text-blue-700 underline" onClick={() => inspect(stage.label, stage.rows)}>{stage.valid} / {stage.rows.length}</button>, stage.median, stage.p90, count(`${stage.label}: missing timestamps`, stage.rows.filter(row => row.reason === 'Missing timestamp')), count(`${stage.label}: invalid intervals`, stage.rows.filter(row => row.reason === 'Invalid interval'))])} />
    <p className="mt-3 text-xs text-slate-600">Non-cancelled general visits only. Each stage has its own denominator; missing or invalid intervals are excluded from its median and 90th percentile. Valid intervals are rounded to 1–480 minutes. The 90th percentile uses the nearest-rank method. Medication pickup applies only when both timestamps exist; missing pickup does not imply delay. Different sample sizes can affect stage comparisons. Workflow intervals include care and processing time, not just waiting.</p>
  </section>;

  if (study === 'pharmacy') return <section aria-label="Refill pattern research" className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
    <h2 className="text-lg font-semibold text-slate-900">Medication pickup comparison</h2>
    <p className="mt-1 text-sm text-slate-600">Question: How do resolved pickup outcomes differ between general and refill-only visits?</p>
    <StudyTable columns={['Visit type', 'Visits', 'Picked up', 'Resolved outcomes', 'Pickup share', 'Not picked up', 'Pending', 'No medication needed', 'Not recorded']} rows={pickupGroups.map(group => [group.label, count(`${group.label}: all visits`, group.rows), count(`${group.label}: picked up`, group.pickedUp), count(`${group.label}: resolved`, group.resolved), percent(group.pickedUp.length, group.resolved.length), count(`${group.label}: not picked up`, group.notPickedUp), count(`${group.label}: pending`, group.pending), count(`${group.label}: no medication needed`, group.noMeds), count(`${group.label}: not recorded`, group.unrecorded)])} />
    <p className="mt-3 mb-5 text-xs text-slate-600">Pickup share = picked up ÷ resolved outcomes (picked up or not picked up). Pending, missing outcomes, and no-medication visits are excluded from that denominator. A pickup timestamp takes precedence over status. Counts represent encounters, not individual prescriptions or medication adherence. Cancelled and specialty-only visits are excluded.</p>
    <h2 className="text-lg font-semibold text-slate-900">General and refill care patterns</h2>
    <p className="mt-1 text-sm text-slate-600">Question: How do patients move between general and refill-only visits, and how long passes between them?</p>
    <p className="mt-3 text-sm text-slate-700">{count('Eligible general and refill visits', data.pharmacyRows)} visits assessed · {data.ambiguous} adjacent pairs excluded because a visit date has multiple encounters.</p>
    <StudyTable columns={['Consecutive visit pattern', 'Visit pairs', 'Unique patients', 'Share of eligible pairs', 'Median days between']} rows={data.transitions.map(group => [group.label, count(group.label, group.rows), group.patients, group.share, group.median])} />
    <p className="mt-3 text-xs text-slate-600">Consecutive non-cancelled general or refill visits within the selected period and clinic event; specialty-only visits are ignored. Same-day order is unknown, so pairs touching a date with multiple encounters are excluded. A patient can contribute multiple pairs and appear in multiple patterns. No eligible pairs means no rate or median is calculated. Pickup outcomes and their resolved-outcome denominators appear below.</p>
  </section>;
  return null;
}
