import { useMemo, useState } from "react";

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text;
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

function percent(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}

function Metric({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Breakdown({ title, values, total }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {values.length ? values.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold text-slate-900">{count} <span className="font-normal text-slate-400">({percent(count, total)})</span></span>
          </div>
        )) : <p className="text-sm text-slate-500">No recorded responses.</p>}
      </div>
    </div>
  );
}

export default function ResearchView({ patients = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today.slice(0, 4)}-01-01`);
  const [endDate, setEndDate] = useState(today);

  const report = useMemo(() => {
    const chronicByPatient = new Map();
    patients.forEach((patient) => {
      const encounters = patient.encounters || [];
      chronicByPatient.set(String(patient.id), {
        htn: encounters.some((encounter) => isPositive(intakeValue(encounter, "htn"))),
        dm: encounters.some((encounter) => isPositive(intakeValue(encounter, "dm"))),
      });
    });

    const rows = [];
    patients.forEach((patient) => {
      const allEncounters = [...(patient.encounters || [])].sort((a, b) =>
        normalizeDate(a.clinicDate).localeCompare(normalizeDate(b.clinicDate))
      );
      allEncounters.forEach((encounter, index) => {
        const date = normalizeDate(encounter.clinicDate);
        if (!date || (startDate && date < startDate) || (endDate && date > endDate)) return;
        if (encounter.status === "cancelled") return;
        const chronic = chronicByPatient.get(String(patient.id)) || { htn: false, dm: false };
        const language = isPositive(intakeValue(encounter, "spanishSpeaking")) ? "Spanish" : "English / not marked Spanish";
        const transportation = String(intakeValue(encounter, "transportation") || "Not recorded").trim();
        const pap = String(intakeValue(encounter, "papStatus") || "Not recorded").trim();
        const mammogram = String(intakeValue(encounter, "mammogramStatus", "mammogramPapSmear") || "Not recorded").trim();
        const factors = [chronic.htn, chronic.dm, language === "Spanish", transportation !== "Not recorded" && transportation !== "Own Transportation", pap !== "Not recorded", mammogram !== "Not recorded"].filter(Boolean).length;
        rows.push({
          patientId: String(patient.id), encounter, chronic, language, transportation, pap, mammogram, factors,
          returning: index > 0 || String(intakeValue(encounter, "newReturning")).toLowerCase() === "returning",
          duration: minutesBetween(encounter.createdAt, encounter.visitCompletedAt || encounter.doneAt),
        });
      });
    });

    const countBy = (key) => Object.entries(rows.reduce((counts, row) => {
      const value = row[key] || "Not recorded";
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {})).sort((a, b) => b[1] - a[1]);
    const unique = (subset) => new Set(subset.map((row) => row.patientId)).size;
    const chronicRows = rows.filter((row) => row.chronic.htn || row.chronic.dm);
    const groups = [
      ["HTN+", rows.filter((row) => row.chronic.htn)],
      ["DM+", rows.filter((row) => row.chronic.dm)],
      ["HTN+ and DM+", rows.filter((row) => row.chronic.htn && row.chronic.dm)],
      ["Neither recorded", rows.filter((row) => !row.chronic.htn && !row.chronic.dm)],
    ].map(([label, groupRows]) => ({ label, visits: groupRows.length, patients: unique(groupRows), returns: groupRows.filter((row) => row.returning).length, factors: groupRows.length ? (groupRows.reduce((sum, row) => sum + row.factors, 0) / groupRows.length).toFixed(1) : "—", duration: average(groupRows.map((row) => row.duration)) }));

    return { rows, chronicRows, uniquePatients: unique(rows), chronicPatients: unique(chronicRows), chronicReturns: chronicRows.filter((row) => row.returning).length, groups, language: countBy("language"), transportation: countBy("transportation"), pap: countBy("pap"), mammogram: countBy("mammogram") };
  }, [patients, startDate, endDate]);

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Research Tracker</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Longitudinal counts from saved intakes. HTN+ and DM+ carry forward when any historical intake or badge identified the disease.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-600">From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Through<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Patients" value={report.uniquePatients} helper={`${report.rows.length} visits`} />
          <Metric label="Chronic-disease patients" value={report.chronicPatients} helper="HTN+ or DM+" />
          <Metric label="Chronic-disease visits" value={report.chronicRows.length} />
          <Metric label="Chronic return visits" value={report.chronicReturns} />
          <Metric label="Chronic return rate" value={percent(report.chronicReturns, report.chronicRows.length)} helper="Return visits ÷ chronic visits" />
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Disease group</th><th className="px-4 py-3">Patients</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3">Return visits</th><th className="px-4 py-3">Return rate</th><th className="px-4 py-3">Avg tracked factors</th><th className="px-4 py-3">Avg visit minutes</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{report.groups.map((group) => <tr key={group.label}><td className="px-4 py-3 font-semibold text-slate-900">{group.label}</td><td className="px-4 py-3">{group.patients}</td><td className="px-4 py-3">{group.visits}</td><td className="px-4 py-3">{group.returns}</td><td className="px-4 py-3">{percent(group.returns, group.visits)}</td><td className="px-4 py-3">{group.factors}</td><td className="px-4 py-3">{group.duration}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Tracked-factor and visit-time columns are operational proxies for comparison, not validated measures of clinical complexity.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Breakdown title="Language" values={report.language} total={report.rows.length} />
          <Breakdown title="Transportation" values={report.transportation} total={report.rows.length} />
          <Breakdown title="PAP smear response" values={report.pap} total={report.rows.length} />
          <Breakdown title="Mammogram response" values={report.mammogram} total={report.rows.length} />
        </div>
      </div>
    </div>
  );
}
