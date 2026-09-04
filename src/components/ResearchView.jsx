import { useEffect, useMemo, useRef, useState } from "react";
import "./ResearchView.css";
import { buildResearchReport, normalizeDate, minutesBetween, completionTime, isComplete, percent } from "../researchAnalytics.js";

function Metric({ label, value, helper, onClick }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component type={onClick ? "button" : undefined} onClick={onClick} className={`research-metric min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left sm:p-4 ${onClick ? "transition hover:border-blue-300 hover:bg-blue-50" : ""}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
      {helper ? <p className="mt-1 break-words text-xs text-slate-500">{helper}</p> : null}
    </Component>
  );
}

function Breakdown({ title, values, total, onSelect }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {values.length ? values.map(([label, count]) => (
          <button type="button" onClick={() => onSelect?.(label)} key={label} className="flex w-full flex-col items-start justify-between gap-1 rounded-lg px-1 py-1 text-left text-sm hover:bg-blue-50 sm:flex-row sm:items-center sm:gap-3">
            <span className="break-words text-slate-600">{label}</span>
            <span className="shrink-0 font-semibold text-slate-900">{count} <span className="font-normal text-slate-400">({percent(count, total)})</span></span>
          </button>
        )) : <p className="text-sm text-slate-500">No recorded responses.</p>}
      </div>
    </div>
  );
}

export default function ResearchView({ patients = [], isResearchOwner = false, leadershipAccessEnabled = false, onLeadershipAccessChange }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today.slice(0, 4)}-01-01`);
  const [endDate, setEndDate] = useState(today);
  const [drilldown, setDrilldown] = useState(null);
  const [study, setStudy] = useState("patients");
  const [dailyPage, setDailyPage] = useState(0);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!drilldown) return;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [drilldown]);

  const report = useMemo(() => buildResearchReport(patients, startDate, endDate), [patients, startDate, endDate]);

  function showRows(title, sourceRows, recordedField = "Encounter included") {
    setDrilldown({
      title,
      rows: sourceRows.map((row) => ({
        patient: row.patientName,
        date: row.date || normalizeDate(row.encounter?.clinicDate),
        encounterId: row.encounter?.id,
        value: recordedField === "Pharmacy outcome" ? (row.encounter.pharmacyPickedUpAt || row.encounter.pharmacy_picked_up_at ? "picked up" : (row.encounter.pharmacyStatus || row.encounter.pharmacy_status || "Not recorded").replaceAll("_", " ")) : recordedField === "Language" ? row.language : recordedField === "Transportation" ? row.transportation : recordedField === "PAP smear" ? row.pap : recordedField === "Mammogram" ? row.mammogram : recordedField,
        source: recordedField.startsWith("HTN")
          ? `Historical intake/badge${row.chronic?.htnDate ? ` on ${row.chronic.htnDate}` : ""}`
          : recordedField.startsWith("DM")
            ? `Historical intake/badge${row.chronic?.dmDate ? ` on ${row.chronic.dmDate}` : ""}`
            : ["Language", "Transportation", "PAP smear", "Mammogram"].includes(recordedField)
              ? "Saved encounter intake"
              : "Encounter workflow timestamps/status",
      })),
    });
  }

  function showTiming(title, sourceRows, startField, endSelector = completionTime) {
    setDrilldown({
      title,
      rows: sourceRows.map((row) => {
        const start = typeof startField === "function" ? startField(row.encounter) : row.encounter?.[startField];
        const end = typeof endSelector === "function" ? endSelector(row.encounter) : row.encounter?.[endSelector];
        const minutes = minutesBetween(start, end);
        return { patient: row.patientName, date: row.date, encounterId: row.encounter?.id, value: minutes === null ? "Not calculable" : `${minutes} minutes`, source: `${start ? new Date(start).toLocaleString() : "Missing start"} → ${end ? new Date(end).toLocaleString() : "missing end"}${minutes === null && start && end ? " · outside valid 1–480 minute range" : ""}` };
      }),
    });
  }

  return (
    <div className="research-view min-w-0 p-2 sm:p-4 lg:p-5">
      {drilldown ? (
        <dialog ref={dialogRef} aria-labelledby="research-detail-title" className="research-dialog" onCancel={() => setDrilldown(null)} onClick={(event) => { if (event.target === event.currentTarget) setDrilldown(null); }}>
          <div className="research-dialog-content" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div><h2 id="research-detail-title" className="text-lg font-bold text-slate-900">{drilldown.title}</h2><p className="text-sm text-slate-500">{drilldown.rows.length} contributing data point(s), with recording source.</p></div>
              <button type="button" onClick={() => setDrilldown(null)} className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            <div className="research-dialog-body">
              <table className="research-table"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Clinic date</th><th className="px-4 py-3">Encounter</th><th className="px-4 py-3">Recorded value</th><th className="px-4 py-3">How recorded</th></tr></thead><tbody className="divide-y divide-slate-200">{drilldown.rows.map((row, index) => <tr key={`${row.encounterId}-${index}`}><td data-label="Patient" className="px-4 py-3 font-medium text-slate-900">{row.patient}</td><td data-label="Clinic date" className="whitespace-nowrap px-4 py-3">{row.date || "—"}</td><td data-label="Encounter" className="px-4 py-3 text-xs text-slate-500">{row.encounterId || "—"}</td><td data-label="Recorded value" className="px-4 py-3">{row.value}</td><td data-label="How recorded" className="px-4 py-3 text-slate-600">{row.source}</td></tr>)}</tbody></table>
            </div>
          </div>
        </dialog>
      ) : null}
      <div className="min-w-0 rounded-2xl bg-white p-3 shadow sm:p-4 lg:p-5">
        <div className="research-header">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Research Tracker</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Language, disease, transportation, screening, and return analyses include general-clinic visits only. Refill visits appear separately in pharmacy use and wait-time comparisons. HTN+ and DM+ carry forward from general-clinic intakes.</p>
          </div>
          <div className="research-filters">
            {isResearchOwner ? (
              <button type="button" onClick={() => onLeadershipAccessChange?.(!leadershipAccessEnabled)} className={`rounded-lg border px-3 py-2 text-sm font-semibold sm:col-span-2 ${leadershipAccessEnabled ? "border-amber-300 bg-amber-50 text-amber-800" : "border-blue-300 bg-blue-50 text-blue-800"}`}>
                {leadershipAccessEnabled ? "Make Private to Me" : "Make Public to Leadership"}
              </button>
            ) : null}
            <label className="min-w-0 text-xs font-semibold text-slate-600">From<input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setDailyPage(0); }} className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="min-w-0 text-xs font-semibold text-slate-600">Through<input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setDailyPage(0); }} className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
        </div>

        <nav aria-label="Research studies" className="research-navigation">
          {[["patients", "Patients & returns"], ["times", "Visit times"], ["pharmacy", "Pharmacy & refills"], ["screening", "Screening"]].map(([key, label]) => (
            <button key={key} type="button" aria-current={study === key ? "page" : undefined} aria-controls="research-study-panel" onClick={() => { setStudy(key); setDailyPage(0); }} className={study === key ? "research-nav-active" : ""}>{label}</button>
          ))}
        </nav>
        <div id="research-study-panel" className="research-study-panel">
        {study === "patients" && <section aria-label="Patients and return visits">
<h2 className="text-lg font-semibold text-slate-900">Patients and return visits</h2>
<p className="mt-1 text-sm text-slate-600">Disease groups, transportation, and follow-up patterns for general-clinic visits.</p>
        <div className="research-metrics mt-5">
          <Metric label="Patients" value={report.uniquePatients} helper={`${report.rows.length} general visits`} onClick={() => showRows("General-clinic patients and visits", report.rows)} />
          <Metric label="Chronic-disease patients" value={report.chronicPatients} helper="HTN+ or DM+" onClick={() => showRows("Chronic-disease data points", report.chronicRows, "HTN/DM historical flag")} />
          <Metric label="Chronic-disease visits" value={report.chronicRows.length} onClick={() => showRows("Chronic-disease general visits", report.chronicRows)} />
          <Metric label="Chronic return visits" value={report.chronicReturns} onClick={() => showRows("Chronic return visits", report.chronicRows.filter((row) => row.returning), "Returning visit")} />
          <Metric label="Chronic return rate" value={percent(report.chronicReturns, report.chronicRows.length)} helper="Return visits ÷ chronic visits" onClick={() => showRows("Chronic return-rate denominator", report.chronicRows, "Prior saved general-clinic visit")} />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200">
          <table className="research-table">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Disease group</th><th className="px-4 py-3">Patients</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3">Return visits</th><th className="px-4 py-3">Return rate</th><th className="px-4 py-3">Avg visit minutes</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{report.groups.map((group) => <tr key={group.label} onClick={() => showRows(group.label, group.rows, group.label)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} className="cursor-pointer hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"><td data-label="Disease group" className="px-4 py-3 font-semibold text-slate-900">{group.label}</td><td data-label="Patients" className="px-4 py-3">{group.patients}</td><td data-label="Visits" className="px-4 py-3">{group.visits}</td><td data-label="Return visits" className="px-4 py-3">{group.returns}</td><td data-label="Return rate" className="px-4 py-3">{percent(group.returns, group.visits)}</td><td data-label="Avg visit minutes" className="px-4 py-3">{group.duration}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Return visits require an earlier non-cancelled general-clinic visit in saved history; refill and specialty visits do not qualify. Visit-time comparisons are operational measures and not validated measures of clinical complexity.</p>

          <div className="mt-6 min-w-0 rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Transportation and return visits</h3>
            <p className="mt-1 text-xs text-slate-500">Evaluated per general-clinic visit. Patients are unique within a mode but may appear under multiple modes when their transportation changes.</p>
            <div className="mt-3 rounded-lg border border-slate-200">
              <table className="research-table"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Transportation reported</th><th className="px-4 py-3">Visit share</th><th className="px-4 py-3">Unique patients</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3">Patients with later visit</th><th className="px-4 py-3">Return likelihood</th></tr></thead><tbody className="divide-y divide-slate-200">{report.transportationReturnStats.map((mode) => <tr key={mode.label} onClick={() => showRows(`Transportation return data: ${mode.label}`, mode.rows, "Transportation")} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} className="cursor-pointer hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"><td data-label="Transportation reported" className="px-4 py-3 font-semibold text-slate-900">{mode.label}</td><td data-label="Visit share" className="px-4 py-3">{percent(mode.visits, report.rows.length)}</td><td data-label="Unique patients" className="px-4 py-3">{mode.patients}</td><td data-label="Visits" className="px-4 py-3">{mode.visits}</td><td data-label="Patients with later visit" className="px-4 py-3">{mode.returnedPatients}</td><td data-label="Return likelihood" className="px-4 py-3 font-semibold text-blue-700">{mode.rate}</td></tr>)}</tbody></table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Unique-patient columns should not be summed across modes. Return likelihood is observational and does not establish causation.</p>
          </div>
        </section>}
        {study === "times" && <section aria-label="Visit times">
<h2 className="text-lg font-semibold text-slate-900">Visit times</h2>
<div className="research-time-comparisons">          <div className="min-w-0 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="font-semibold text-indigo-950">General vs. refill patient wait times</h3>
            <p className="mt-1 text-sm text-indigo-800">Kept separate so refill encounters never affect general-clinic averages.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Metric label="General clinic average" value={report.flow.totalClinic === "—" ? "—" : `${report.flow.totalClinic} min`} helper={`Undergrad complete → visit completion · Range: ${report.flow.totalClinicRange}`} onClick={() => showTiming("General clinic wait-time data", report.generalAnalyticsRows, "undergradCompletedAt")} />
              <Metric label="Refill patient average" value={report.refillFlow.refillPickup === "—" ? "—" : `${report.refillFlow.refillPickup} min`} helper={`${report.refillFlow.visits} refill encounter(s) · Range: ${report.refillFlow.refillPickupRange}`} onClick={() => showTiming("Refill wait-time data", report.refillAnalyticsRows, (encounter) => encounter.undergradCompletedAt || encounter.createdAt)} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Language and average visit time</h3>
            <p className="mt-1 text-xs text-slate-500">General clinic only: undergrad complete → visit completion.</p>
            <div className="mt-3 space-y-2">{!report.languageStats.length && <p className="text-sm text-slate-500">No general-clinic visits in this date range.</p>}{report.languageStats.map(([label, count, avgMinutes]) => <button type="button" key={label} onClick={() => showTiming(`${label} general-clinic visit times`, report.rows.filter((row) => row.language === label), "undergradCompletedAt")} className="grid w-full grid-cols-1 gap-1 rounded-lg px-1 py-2 text-left text-sm hover:bg-blue-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3"><span className="break-words text-slate-600">{label}</span><span className="font-semibold text-slate-900">{count} <span className="font-normal text-slate-400">({percent(count, report.rows.length)})</span></span><span className="font-semibold text-blue-700 sm:min-w-20 sm:text-right">{avgMinutes === "—" ? "—" : `${avgMinutes} min avg`}</span></button>)}</div>
          </div>
</div>        <div className="mt-6 min-w-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clinic Flow Analytics</h2>
            <p className="mt-1 text-sm text-slate-600">General-clinic workflow times across the selected period, followed by a clinic-date comparison.</p>
            <p className="mt-1 text-xs text-slate-500">Timing values must be between 1 minute and 8 hours. Values outside that range are marked Not calculable and excluded from averages and ranges.</p>
          </div>
          <div className="research-metrics mt-4">
            <Metric label="Unique patients" value={report.flow.patients} helper={`${report.flow.visits} general encounters`} onClick={() => showRows("General flow encounters", report.generalAnalyticsRows)} />
            <Metric label="Completed visits" value={report.flow.completed} onClick={() => showRows("Completed general visits", report.generalAnalyticsRows.filter((row) => isComplete(row.encounter)), "Completed workflow status")} />
            <Metric label="LWOBS / cancelled" value={report.flow.cancelled} onClick={() => showRows("Cancelled general visits", report.generalAnalyticsRows.filter((row) => row.encounter.status === "cancelled"), "Cancelled status")} />
            <Metric label="Average total clinic time" value={report.flow.totalClinic === "—" ? "—" : `${report.flow.totalClinic} min`} helper={`Range: ${report.flow.totalClinicRange}`} onClick={() => showTiming("General total clinic time", report.generalAnalyticsRows, "undergradCompletedAt")} />
            <Metric label="Started → undergrad complete" value={report.flow.startedToUndergrad === "—" ? "—" : `${report.flow.startedToUndergrad} min`} helper={`Range: ${report.flow.startedToUndergradRange}`} onClick={() => showTiming("Started to undergrad complete", report.generalAnalyticsRows, "createdAt", "undergradCompletedAt")} />
            <Metric label="Started → leadership complete" value={report.flow.startedToLeadership === "—" ? "—" : `${report.flow.startedToLeadership} min`} helper={`Range: ${report.flow.startedToLeadershipRange}`} onClick={() => showTiming("Started to leadership complete", report.generalAnalyticsRows, "createdAt", "leadershipIntakeCompletedAt")} />
            <Metric label="Leadership → student assigned" value={report.flow.leadershipToStudent === "—" ? "—" : `${report.flow.leadershipToStudent} min`} helper={`Range: ${report.flow.leadershipToStudentRange}`} onClick={() => showTiming("Leadership complete to student assigned", report.generalAnalyticsRows, "leadershipIntakeCompletedAt", "studentAssignedAt")} />
            <Metric label="Student → upper-level assigned" value={report.flow.studentToUpper === "—" ? "—" : `${report.flow.studentToUpper} min`} helper={`Range: ${report.flow.studentToUpperRange}`} onClick={() => showTiming("Student to upper-level assigned", report.generalAnalyticsRows, "studentAssignedAt", "upperLevelAssignedAt")} />
            <Metric label="Assigned → complete" value={report.flow.assignedToComplete === "—" ? "—" : `${report.flow.assignedToComplete} min`} helper={`Range: ${report.flow.assignedToCompleteRange}`} onClick={() => showTiming("Assigned to complete", report.generalAnalyticsRows, "studentAssignedAt")} />
            <Metric label="Visit complete → pickup" value={report.flow.pharmacyDelay === "—" ? "—" : `${report.flow.pharmacyDelay} min`} helper={`Range: ${report.flow.pharmacyDelayRange}`} onClick={() => showTiming("Visit complete to medication pickup", report.generalAnalyticsRows, "visitCompletedAt", "pharmacyPickedUpAt")} />
          </div>

          <div className="research-pagination mt-6 mb-3">
            <div><h3 className="font-semibold text-slate-900">Clinic times by date</h3><p className="text-xs text-slate-500">{report.dailyFlow.length} clinic dates · 10 per page</p></div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={dailyPage === 0} onClick={() => setDailyPage((page) => page - 1)}>Previous</button>
              <span className="text-sm text-slate-600">{dailyPage + 1} / {Math.max(1, Math.ceil(report.dailyFlow.length / 10))}</span>
              <button type="button" disabled={(dailyPage + 1) * 10 >= report.dailyFlow.length} onClick={() => setDailyPage((page) => page + 1)}>Next</button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200">
            <table className="research-table">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Clinic date</th><th className="px-3 py-3">Patients</th><th className="px-3 py-3">Complete</th><th className="px-3 py-3">LWOBS</th><th className="px-3 py-3">Total clinic</th><th className="px-3 py-3">Start → UG</th><th className="px-3 py-3">Start → leadership</th><th className="px-3 py-3">Leadership → assigned</th><th className="px-3 py-3">Assigned → complete</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{report.dailyFlow.slice(dailyPage * 10, (dailyPage + 1) * 10).map((day) => <tr key={day.date} onClick={() => showRows(`General clinic encounters: ${day.date}`, report.generalAnalyticsRows.filter((row) => row.date === day.date))} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} className="cursor-pointer hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"><td data-label="Clinic date" className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">{day.date}</td><td data-label="Patients" className="px-3 py-3">{day.patients}</td><td data-label="Complete" className="px-3 py-3">{day.completed}</td><td data-label="LWOBS" className="px-3 py-3">{day.cancelled}</td><td data-label="Total clinic" className="px-3 py-3">{day.totalClinic === "—" ? "—" : `${day.totalClinic}m`}</td><td data-label="Start → UG" className="px-3 py-3">{day.startedToUndergrad === "—" ? "—" : `${day.startedToUndergrad}m`}</td><td data-label="Start → leadership" className="px-3 py-3">{day.startedToLeadership === "—" ? "—" : `${day.startedToLeadership}m`}</td><td data-label="Leadership → assigned" className="px-3 py-3">{day.leadershipToStudent === "—" ? "—" : `${day.leadershipToStudent}m`}</td><td data-label="Assigned → complete" className="px-3 py-3">{day.assignedToComplete === "—" ? "—" : `${day.assignedToComplete}m`}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        </section>}
        {study === "pharmacy" && <>
        <section className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">In-house pharmacy use</h2>
          <p className="mt-1 text-sm text-slate-600">Compare recorded medication pickups and refill use for patients with and without a recorded chronic condition. General visits and refill visits stay separate; cancelled and specialty-only visits are excluded.</p>
          <p className="mt-2 text-xs text-slate-500">Chronic status uses the patient’s current chronic-condition list and HTN/DM flags recorded through the end date. No recorded condition does not confirm absence of disease. These are observed use rates, not an estimate of the pharmacy’s causal benefit.</p>
          <div className="mt-4 space-y-4">
            {["Chronic condition recorded", "No chronic condition recorded"].map((cohort) => {
              const groups = report.pharmacyGroups.filter((group) => group.cohort === cohort);
              const summary = groups[0];
              return (
                <div key={cohort} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{cohort}</h3>
                  <p className="mt-1 text-sm text-slate-600">Patients with a refill visit: <strong>{summary.refillPatients} / {summary.patients} ({percent(summary.refillPatients, summary.patients)})</strong> of patients with a general or refill visit in the selected period.</p>
                  <div className="mt-3 min-w-0">
                    <table className="research-table">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                        {["Visit type", "Visits / cohort visits", "Picked up / resolved", "Not picked up", "Pending", "No meds needed", "Not recorded"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-200">{groups.map((group) => {
                        const label = group.visitType === "general" ? "General clinic" : "Refill only";
                        return <tr key={group.visitType}>
                          <td data-label="Visit type" className="px-3 py-3 font-semibold text-slate-900">{label}</td>
                          <td data-label="Visits / cohort visits" className="px-3 py-3"><button type="button" className="text-blue-700 hover:underline" onClick={() => showRows(`${cohort}: ${label}`, group.rows)}>{group.rows.length} / {group.cohortVisits} ({percent(group.rows.length, group.cohortVisits)})</button></td>
                          <td data-label="Picked up / resolved" className="px-3 py-3"><button type="button" className="text-blue-700 hover:underline" onClick={() => showRows(`${cohort}: ${label} pickup outcomes`, [...group.pickedUp, ...group.notPickedUp], "Pharmacy outcome")}>{group.pickedUp.length} / {group.resolved} ({percent(group.pickedUp.length, group.resolved)})</button></td>
                          {[["Not picked up", group.notPickedUp], ["Pending", group.pending], ["No meds needed", group.noMeds], ["Not recorded", group.unrecorded]].map(([outcome, source]) => <td data-label={outcome} key={outcome} className="px-3 py-3"><button type="button" className="text-blue-700 hover:underline" onClick={() => showRows(`${cohort}: ${label} — ${outcome}`, source, "Pharmacy outcome")}>{source.length}</button></td>)}
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Pickup rate = encounters marked picked up ÷ encounters with a resolved pickup outcome (picked up or not picked up). Pending, unrecorded, and no-medication visits are shown separately and excluded from that denominator. Counts describe visits, not individual medications. Click a count to inspect its source visits.</p>
        </section>

        </>}
        {study === "screening" && <section aria-label="Screening">
<h2 className="text-lg font-semibold text-slate-900">Preventive screening</h2>
<p className="mt-1 text-sm text-slate-600">Recorded screening responses from eligible general-clinic visits.</p>
<div className="research-screening-grid">          <Breakdown title="PAP smear response — females ages 21–65" values={report.pap} total={report.papEligibleRows.length} onSelect={(value) => showRows(`PAP smear: ${value} (females ages 21–65)`, report.papEligibleRows.filter((row) => row.pap === value), "PAP smear")} />
          <Breakdown title="Mammogram response — females ages 45+" values={report.mammogram} total={report.mammogramEligibleRows.length} onSelect={(value) => showRows(`Mammogram: ${value} (females ages 45+)`, report.mammogramEligibleRows.filter((row) => row.mammogram === value), "Mammogram")} />
</div></section>}
</div>
      </div>
    </div>
  );
}

