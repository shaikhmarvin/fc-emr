import { useMemo, useState } from "react";

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text;
}

function ageOnDate(dob, dateValue) {
  if (!dob || !dateValue) return null;
  const birth = new Date(`${normalizeDate(dob)}T12:00:00`);
  const visit = new Date(`${normalizeDate(dateValue)}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(visit.getTime())) return null;
  let age = visit.getFullYear() - birth.getFullYear();
  const birthdayNotReached = visit.getMonth() < birth.getMonth() || (visit.getMonth() === birth.getMonth() && visit.getDate() < birth.getDate());
  if (birthdayNotReached) age -= 1;
  return age;
}

function isPositive(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "positive", "1"].includes(String(value || "").trim().toLowerCase());
}

function intakeValue(encounter, ...keys) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  for (const key of keys) {
    const direct = encounter?.[key];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
    const stored = intake?.[key];
    if (stored !== undefined && stored !== null && stored !== "") return stored;
  }
  return "";
}

function minutesBetween(start, end) {
  const startMs = new Date(start || 0).getTime();
  const endMs = new Date(end || 0).getTime();
  if (!startMs || !endMs || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return "—";
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function completionTime(encounter) {
  if (!encounter) return null;
  const refillOnly = (encounter.visitType || encounter.visit_type) === "refill_only";
  if (refillOnly) return encounter.pharmacyPickedUpAt || encounter.pharmacy_picked_up_at || null;
  return encounter.pharmacyPickedUpAt || encounter.pharmacy_picked_up_at || encounter.visitCompletedAt || encounter.visit_completed_at || encounter.doneAt || encounter.done_at || null;
}

function isComplete(encounter) {
  if (!encounter) return false;
  if ((encounter.visitType || encounter.visit_type) === "refill_only") {
    return Boolean(completionTime(encounter)) || ["picked_up", "no_meds_needed", "meds_not_picked_up"].includes(encounter.pharmacyStatus || encounter.pharmacy_status);
  }
  return encounter.status === "done" || encounter.soapStatus === "signed" || Boolean(completionTime(encounter));
}

function flowMetrics(rows) {
  const general = rows.filter(({ encounter }) => !["refill_only", "specialty_only"].includes(encounter.visitType || encounter.visit_type || "general"));
  const refills = rows.filter(({ encounter }) => (encounter.visitType || encounter.visit_type) === "refill_only");
  const averageBetween = (source, start, end) => average(source.map(({ encounter }) => minutesBetween(encounter?.[start], encounter?.[end])));
  return {
    patients: new Set(rows.map(({ patientId }) => patientId)).size,
    visits: rows.length,
    completed: rows.filter(({ encounter }) => isComplete(encounter)).length,
    cancelled: rows.filter(({ encounter }) => encounter.status === "cancelled").length,
    startedToUndergrad: averageBetween(general, "createdAt", "undergradCompletedAt"),
    startedToLeadership: averageBetween(general, "createdAt", "leadershipIntakeCompletedAt"),
    leadershipToStudent: averageBetween(general, "leadershipIntakeCompletedAt", "studentAssignedAt"),
    studentToUpper: averageBetween(general, "studentAssignedAt", "upperLevelAssignedAt"),
    assignedToComplete: average(general.map(({ encounter }) => minutesBetween(encounter.studentAssignedAt, completionTime(encounter)))),
    totalClinic: average(general.map(({ encounter }) => minutesBetween(encounter.undergradCompletedAt, completionTime(encounter)))),
    refillPickup: average(refills.map(({ encounter }) => minutesBetween(encounter.undergradCompletedAt || encounter.createdAt, completionTime(encounter)))),
    pharmacyDelay: average(general.map(({ encounter }) => minutesBetween(encounter.visitCompletedAt, encounter.pharmacyPickedUpAt))),
  };
}

function percent(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}

function Metric({ label, value, helper, onClick }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component type={onClick ? "button" : undefined} onClick={onClick} className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-left ${onClick ? "transition hover:border-blue-300 hover:bg-blue-50" : ""}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </Component>
  );
}

function Breakdown({ title, values, total, onSelect }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {values.length ? values.map(([label, count]) => (
          <button type="button" onClick={() => onSelect?.(label)} key={label} className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left text-sm hover:bg-blue-50">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold text-slate-900">{count} <span className="font-normal text-slate-400">({percent(count, total)})</span></span>
          </button>
        )) : <p className="text-sm text-slate-500">No recorded responses.</p>}
      </div>
    </div>
  );
}

export default function ResearchView({ patients = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today.slice(0, 4)}-01-01`);
  const [endDate, setEndDate] = useState(today);
  const [drilldown, setDrilldown] = useState(null);

  const report = useMemo(() => {
    const chronicByPatient = new Map();
    patients.forEach((patient) => {
      const encounters = patient.encounters || [];
      const htnEncounter = encounters.find((encounter) => isPositive(intakeValue(encounter, "htn")));
      const dmEncounter = encounters.find((encounter) => isPositive(intakeValue(encounter, "dm")));
      chronicByPatient.set(String(patient.id), { htn: !!htnEncounter, dm: !!dmEncounter, htnDate: normalizeDate(htnEncounter?.clinicDate), dmDate: normalizeDate(dmEncounter?.clinicDate) });
    });

    const rows = [];
    const analyticsRows = [];
    patients.forEach((patient) => {
      const allEncounters = [...(patient.encounters || [])].sort((a, b) =>
        normalizeDate(a.clinicDate).localeCompare(normalizeDate(b.clinicDate))
      );
      allEncounters.forEach((encounter, index) => {
        const date = normalizeDate(encounter.clinicDate);
        if (!date || (startDate && date < startDate) || (endDate && date > endDate)) return;
        const visitType = encounter.visitType || encounter.visit_type || "general";
        const patientName = [patient.first_name || patient.firstName, patient.last_name || patient.lastName].filter(Boolean).join(" ") || patient.name || `Patient ${patient.id}`;
        const femaleEligible = String(patient.sex || "").trim().toLowerCase() === "female";
        const visitAge = ageOnDate(patient.dob, date);
        const papEligible = femaleEligible && visitAge !== null && visitAge >= 21 && visitAge <= 65;
        const mammogramEligible = femaleEligible && visitAge !== null && visitAge >= 45;
        analyticsRows.push({ patientId: String(patient.id), patientName, encounter, date, visitType });
        if (["refill_only", "specialty_only"].includes(visitType)) return;
        if (encounter.status === "cancelled") return;
        const chronic = chronicByPatient.get(String(patient.id)) || { htn: false, dm: false };
        const language = isPositive(intakeValue(encounter, "spanishSpeaking")) ? "Spanish" : "English / not marked Spanish";
        const transportation = String(intakeValue(encounter, "transportation") || "Not recorded").trim();
        const pap = String(intakeValue(encounter, "papStatus") || "Not recorded").trim();
        const mammogram = String(intakeValue(encounter, "mammogramStatus", "mammogramPapSmear") || "Not recorded").trim();
        const factors = [chronic.htn, chronic.dm, language === "Spanish", transportation !== "Not recorded" && transportation !== "Own Transportation", papEligible && pap !== "Not recorded", mammogramEligible && mammogram !== "Not recorded"].filter(Boolean).length;
        rows.push({
          patientId: String(patient.id), patientName, encounter, chronic, language, transportation, pap, mammogram, factors, date, visitAge, femaleEligible, papEligible, mammogramEligible,
          returning: index > 0 || String(intakeValue(encounter, "newReturning")).toLowerCase() === "returning",
          duration: minutesBetween(encounter.createdAt, encounter.visitCompletedAt || encounter.doneAt),
        });
      });
    });

    const countBy = (key, sourceRows = rows) => Object.entries(sourceRows.reduce((counts, row) => {
      const value = row[key] || "Not recorded";
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {})).sort((a, b) => b[1] - a[1]);
    const unique = (subset) => new Set(subset.map((row) => row.patientId)).size;
    const chronicRows = rows.filter((row) => row.chronic.htn || row.chronic.dm);
    const papEligibleRows = rows.filter((row) => row.papEligible);
    const mammogramEligibleRows = rows.filter((row) => row.mammogramEligible);
    const groups = [
      ["HTN+ only", rows.filter((row) => row.chronic.htn && !row.chronic.dm)],
      ["DM+ only", rows.filter((row) => row.chronic.dm && !row.chronic.htn)],
      ["HTN+ and DM+", rows.filter((row) => row.chronic.htn && row.chronic.dm)],
      ["Neither recorded", rows.filter((row) => !row.chronic.htn && !row.chronic.dm)],
    ].map(([label, groupRows]) => ({ label, rows: groupRows, visits: groupRows.length, patients: unique(groupRows), returns: groupRows.filter((row) => row.returning).length, factors: groupRows.length ? (groupRows.reduce((sum, row) => sum + row.factors, 0) / groupRows.length).toFixed(1) : "—", duration: average(groupRows.map((row) => row.duration)) }));

    const generalAnalyticsRows = analyticsRows.filter((row) => !["refill_only", "specialty_only"].includes(row.visitType));
    const refillAnalyticsRows = analyticsRows.filter((row) => row.visitType === "refill_only");
    const dailyGroups = generalAnalyticsRows.reduce((groupsByDate, row) => {
      if (!groupsByDate[row.date]) groupsByDate[row.date] = [];
      groupsByDate[row.date].push(row);
      return groupsByDate;
    }, {});
    const dailyFlow = Object.entries(dailyGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dateRows]) => ({ date, ...flowMetrics(dateRows) }));

    return { rows, chronicRows, papEligibleRows, mammogramEligibleRows, uniquePatients: unique(rows), chronicPatients: unique(chronicRows), chronicReturns: chronicRows.filter((row) => row.returning).length, groups, language: countBy("language"), transportation: countBy("transportation"), pap: countBy("pap", papEligibleRows), mammogram: countBy("mammogram", mammogramEligibleRows), flow: flowMetrics(generalAnalyticsRows), refillFlow: flowMetrics(refillAnalyticsRows), generalAnalyticsRows, refillAnalyticsRows, dailyFlow };
  }, [patients, startDate, endDate]);

  function showRows(title, sourceRows, recordedField = "Encounter included") {
    setDrilldown({
      title,
      rows: sourceRows.map((row) => ({
        patient: row.patientName,
        date: row.date || normalizeDate(row.encounter?.clinicDate),
        encounterId: row.encounter?.id,
        value: recordedField === "Language" ? row.language : recordedField === "Transportation" ? row.transportation : recordedField === "PAP smear" ? row.pap : recordedField === "Mammogram" ? row.mammogram : recordedField,
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
        return { patient: row.patientName, date: row.date, encounterId: row.encounter?.id, value: minutes === null ? "Not calculable" : `${minutes} minutes`, source: `${start ? new Date(start).toLocaleString() : "Missing start"} → ${end ? new Date(end).toLocaleString() : "missing end"}` };
      }),
    });
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {drilldown ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => setDrilldown(null)}>
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div><h2 className="text-lg font-bold text-slate-900">{drilldown.title}</h2><p className="text-sm text-slate-500">{drilldown.rows.length} contributing data point(s), with recording source.</p></div>
              <button type="button" onClick={() => setDrilldown(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Clinic date</th><th className="px-4 py-3">Encounter</th><th className="px-4 py-3">Recorded value</th><th className="px-4 py-3">How recorded</th></tr></thead><tbody className="divide-y divide-slate-200">{drilldown.rows.map((row, index) => <tr key={`${row.encounterId}-${index}`}><td className="px-4 py-3 font-medium text-slate-900">{row.patient}</td><td className="whitespace-nowrap px-4 py-3">{row.date || "—"}</td><td className="px-4 py-3 text-xs text-slate-500">{row.encounterId || "—"}</td><td className="px-4 py-3">{row.value}</td><td className="px-4 py-3 text-slate-600">{row.source}</td></tr>)}</tbody></table>
            </div>
          </div>
        </div>
      ) : null}
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Research Tracker</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">General-clinic visits only. Longitudinal counts come from saved intakes; HTN+ and DM+ carry forward when any historical intake or badge identified the disease.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-600">From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Through<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Patients" value={report.uniquePatients} helper={`${report.rows.length} general visits`} onClick={() => showRows("General-clinic patients and visits", report.rows)} />
          <Metric label="Chronic-disease patients" value={report.chronicPatients} helper="HTN+ or DM+" onClick={() => showRows("Chronic-disease data points", report.chronicRows, "HTN/DM historical flag")} />
          <Metric label="Chronic-disease visits" value={report.chronicRows.length} onClick={() => showRows("Chronic-disease general visits", report.chronicRows)} />
          <Metric label="Chronic return visits" value={report.chronicReturns} onClick={() => showRows("Chronic return visits", report.chronicRows.filter((row) => row.returning), "Returning visit")} />
          <Metric label="Chronic return rate" value={percent(report.chronicReturns, report.chronicRows.length)} helper="Return visits ÷ chronic visits" onClick={() => showRows("Chronic return-rate denominator", report.chronicRows, "Return status from visit history/intake")} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Disease group</th><th className="px-4 py-3">Patients</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3">Return visits</th><th className="px-4 py-3">Return rate</th><th className="px-4 py-3">Avg tracked factors</th><th className="px-4 py-3">Avg visit minutes</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{report.groups.map((group) => <tr key={group.label} onClick={() => showRows(group.label, group.rows, group.label)} className="cursor-pointer hover:bg-blue-50"><td className="px-4 py-3 font-semibold text-slate-900">{group.label}</td><td className="px-4 py-3">{group.patients}</td><td className="px-4 py-3">{group.visits}</td><td className="px-4 py-3">{group.returns}</td><td className="px-4 py-3">{percent(group.returns, group.visits)}</td><td className="px-4 py-3">{group.factors}</td><td className="px-4 py-3">{group.duration}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Tracked-factor and visit-time columns are operational proxies for comparison, not validated measures of clinical complexity.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Breakdown title="Language" values={report.language} total={report.rows.length} onSelect={(value) => showRows(`Language: ${value}`, report.rows.filter((row) => row.language === value), "Language")} />
          <Breakdown title="Transportation" values={report.transportation} total={report.rows.length} onSelect={(value) => showRows(`Transportation: ${value}`, report.rows.filter((row) => row.transportation === value), "Transportation")} />
          <Breakdown title="PAP smear response — females ages 21–65" values={report.pap} total={report.papEligibleRows.length} onSelect={(value) => showRows(`PAP smear: ${value} (females ages 21–65)`, report.papEligibleRows.filter((row) => row.pap === value), "PAP smear")} />
          <Breakdown title="Mammogram response — females ages 45+" values={report.mammogram} total={report.mammogramEligibleRows.length} onSelect={(value) => showRows(`Mammogram: ${value} (females ages 45+)`, report.mammogramEligibleRows.filter((row) => row.mammogram === value), "Mammogram")} />
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clinic Flow Analytics</h2>
            <p className="mt-1 text-sm text-slate-600">The former Dashboard analytics, calculated across the selected research period and by clinic date for longitudinal comparison.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Unique patients" value={report.flow.patients} helper={`${report.flow.visits} general encounters`} onClick={() => showRows("General flow encounters", report.generalAnalyticsRows)} />
            <Metric label="Completed visits" value={report.flow.completed} onClick={() => showRows("Completed general visits", report.generalAnalyticsRows.filter((row) => isComplete(row.encounter)), "Completed workflow status")} />
            <Metric label="LWOBS / cancelled" value={report.flow.cancelled} onClick={() => showRows("Cancelled general visits", report.generalAnalyticsRows.filter((row) => row.encounter.status === "cancelled"), "Cancelled status")} />
            <Metric label="Average total clinic time" value={report.flow.totalClinic === "—" ? "—" : `${report.flow.totalClinic} min`} onClick={() => showTiming("General total clinic time", report.generalAnalyticsRows, "undergradCompletedAt")} />
            <Metric label="Started → undergrad complete" value={report.flow.startedToUndergrad === "—" ? "—" : `${report.flow.startedToUndergrad} min`} onClick={() => showTiming("Started to undergrad complete", report.generalAnalyticsRows, "createdAt", "undergradCompletedAt")} />
            <Metric label="Started → leadership complete" value={report.flow.startedToLeadership === "—" ? "—" : `${report.flow.startedToLeadership} min`} onClick={() => showTiming("Started to leadership complete", report.generalAnalyticsRows, "createdAt", "leadershipIntakeCompletedAt")} />
            <Metric label="Leadership → student assigned" value={report.flow.leadershipToStudent === "—" ? "—" : `${report.flow.leadershipToStudent} min`} onClick={() => showTiming("Leadership complete to student assigned", report.generalAnalyticsRows, "leadershipIntakeCompletedAt", "studentAssignedAt")} />
            <Metric label="Student → upper-level assigned" value={report.flow.studentToUpper === "—" ? "—" : `${report.flow.studentToUpper} min`} onClick={() => showTiming("Student to upper-level assigned", report.generalAnalyticsRows, "studentAssignedAt", "upperLevelAssignedAt")} />
            <Metric label="Assigned → complete" value={report.flow.assignedToComplete === "—" ? "—" : `${report.flow.assignedToComplete} min`} onClick={() => showTiming("Assigned to complete", report.generalAnalyticsRows, "studentAssignedAt")} />
            <Metric label="Visit complete → pickup" value={report.flow.pharmacyDelay === "—" ? "—" : `${report.flow.pharmacyDelay} min`} onClick={() => showTiming("Visit complete to medication pickup", report.generalAnalyticsRows, "visitCompletedAt", "pharmacyPickedUpAt")} />
          </div>

          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="font-semibold text-indigo-950">General vs. refill patient wait times</h3>
            <p className="mt-1 text-sm text-indigo-800">Kept separate so refill encounters never affect general-clinic averages.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Metric label="General clinic average" value={report.flow.totalClinic === "—" ? "—" : `${report.flow.totalClinic} min`} helper="Undergrad complete → visit completion" onClick={() => showTiming("General clinic wait-time data", report.generalAnalyticsRows, "undergradCompletedAt")} />
              <Metric label="Refill patient average" value={report.refillFlow.refillPickup === "—" ? "—" : `${report.refillFlow.refillPickup} min`} helper={`${report.refillFlow.visits} refill encounter(s): check-in → medication pickup`} onClick={() => showTiming("Refill wait-time data", report.refillAnalyticsRows, (encounter) => encounter.undergradCompletedAt || encounter.createdAt)} />
            </div>
          </div>

          <h3 className="mb-2 mt-6 font-semibold text-slate-900">Longitudinal clinic times</h3>
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-[1100px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Clinic date</th><th className="px-3 py-3">Patients</th><th className="px-3 py-3">Complete</th><th className="px-3 py-3">LWOBS</th><th className="px-3 py-3">Total clinic</th><th className="px-3 py-3">Start → UG</th><th className="px-3 py-3">Start → leadership</th><th className="px-3 py-3">Leadership → assigned</th><th className="px-3 py-3">Assigned → complete</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{report.dailyFlow.map((day) => <tr key={day.date} onClick={() => showRows(`General clinic encounters: ${day.date}`, report.generalAnalyticsRows.filter((row) => row.date === day.date))} className="cursor-pointer hover:bg-blue-50"><td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">{day.date}</td><td className="px-3 py-3">{day.patients}</td><td className="px-3 py-3">{day.completed}</td><td className="px-3 py-3">{day.cancelled}</td><td className="px-3 py-3">{day.totalClinic === "—" ? "—" : `${day.totalClinic}m`}</td><td className="px-3 py-3">{day.startedToUndergrad === "—" ? "—" : `${day.startedToUndergrad}m`}</td><td className="px-3 py-3">{day.startedToLeadership === "—" ? "—" : `${day.startedToLeadership}m`}</td><td className="px-3 py-3">{day.leadershipToStudent === "—" ? "—" : `${day.leadershipToStudent}m`}</td><td className="px-3 py-3">{day.assignedToComplete === "—" ? "—" : `${day.assignedToComplete}m`}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
