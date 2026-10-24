import { useMemo, useState } from 'react';
import { buildLabTrendSeries } from '../lib/labTrends.js';
import LabTrends from './LabTrends.jsx';

const dateLabel = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Date unavailable';
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const flagLabel = flag => ({ H: 'High', L: 'Low', A: 'Flagged' }[flag] || flag);
function ResultFlag({ flag }) {
  return flag ? <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">{flagLabel(flag)}</span> : null;
}

export default function ChartLabResults({ results = [] }) {
  const [view, setView] = useState('latest');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [trendKey, setTrendKey] = useState('');
  const series = useMemo(() => buildLabTrendSeries(results), [results]);
  const groups = [...new Set(series.map(item => item.group || 'Other'))].sort();
  const visible = series.filter(item => (group === 'all' || (item.group || 'Other') === group) &&
    item.label.toLowerCase().includes(search.toLowerCase().trim()) &&
    (!flaggedOnly || item.entries.some(entry => ['H', 'L', 'A'].includes(entry.flag))));
  const visibleKeys = new Set(visible.map(item => item.key));
  const visibleResults = visible.flatMap(item => item.entries.map(entry => ({ ...entry, seriesKey: item.key, label: item.label, unit: item.unit })));
  const dates = new Set(series.flatMap(item => item.entries.filter(entry => entry.timestamp !== null).map(entry => entry.dateKey)));
  const latestDate = [...dates].sort().at(-1);
  const flaggedCount = series.flatMap(item => item.entries).filter(entry => ['H', 'L', 'A'].includes(entry.flag)).length;
  const grouped = groups.map(label => ({ label, items: visible.filter(item => (item.group || 'Other') === label) })).filter(block => block.items.length);
  const openTrend = key => { setTrendKey(key); setView('trends'); };

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Patient laboratory results">
    <header className="border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">Patient laboratory</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h3 className="text-2xl font-semibold tracking-tight">Results at a glance</h3><p className="mt-1 text-sm text-slate-300">Across all visits · latest dated results first</p></div>
        <div className="flex flex-wrap gap-x-7 gap-y-3">
          {[[series.length, 'Tests tracked'], [dates.size, 'Collection / visit dates'], [flaggedCount, 'Flagged results in history']].map(([value, label]) => <div key={label}><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-slate-300">{label}</p></div>)}
        </div>
      </div>
      {latestDate && <p className="mt-4 text-xs text-slate-300">Most recent result date: <span className="font-medium text-white">{dateLabel(latestDate)}</span></p>}
    </header>
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Lab result view" className="inline-flex rounded-xl bg-slate-100 p-1">
          {[['latest', 'Latest results'], ['trends', 'Trends'], ['history', 'Full history']].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>)}
        </div>
        <span className="text-xs text-slate-500">{visible.length} of {series.length} tests</span>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center">
        <label className="min-w-0 flex-1"><span className="sr-only">Search lab tests</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a test, e.g. A1C or creatinine" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
        <label><span className="sr-only">Lab group</span><select value={group} onChange={event => setGroup(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm lg:max-w-64"><option value="all">All lab groups</option>{groups.map(label => <option key={label}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm text-slate-600"><input type="checkbox" checked={flaggedOnly} onChange={event => setFlaggedOnly(event.target.checked)} className="h-4 w-4 accent-rose-600" />Flagged tests</label>
      </div>
      {!visible.length ? <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center"><p className="font-semibold text-slate-800">{series.length ? 'No matching tests' : 'No saved lab results yet'}</p><p className="mt-2 text-sm text-slate-500">{series.length ? 'Try another search or clear the filters.' : 'Saved in-house and imported results will appear here.'}</p>{series.length > 0 && <button type="button" onClick={() => { setSearch(''); setGroup('all'); setFlaggedOnly(false); }} className="mt-4 text-sm font-semibold text-teal-700">Clear filters</button>}</div> : <>
        {view === 'latest' && <div className="space-y-6">{grouped.map(block => <section key={block.label}>
          <div className="mb-3 flex items-center gap-3"><span className="h-5 w-1 rounded-full bg-teal-500" /><h4 className="font-semibold text-slate-900">{block.label}</h4><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{block.items.length}</span></div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{block.items.map(item => {
            const dated = item.entries.filter(entry => entry.timestamp !== null);
            const latest = dated.at(-1);
            const entries = latest ? item.entries.filter(entry => entry.dateKey === latest.dateKey) : item.entries;
            const undated = item.entries.filter(entry => entry.timestamp === null).length;
            return <article key={item.key} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm">
              <h5 className="text-sm font-semibold text-slate-700">{item.label}</h5>
              <div className="mt-3 space-y-3">{entries.map((entry, index) => <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-2"><p className={`break-words text-2xl font-semibold tracking-tight ${entry.flag ? 'text-rose-700' : 'text-slate-900'}`}>{String(entry.value)} <span className="text-sm font-normal tracking-normal text-slate-500">{item.unit}</span></p><ResultFlag flag={entry.flag} /></div>
                <p className="mt-1 text-xs text-slate-500">Reference: {entry.referenceRange || 'Not recorded'}</p>
              </div>)}</div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{dateLabel(latest?.dateKey)}<span className="block">{[...new Set(entries.map(entry => entry.sourceLabel || 'Source unavailable'))].join(' · ')}</span></span><button type="button" onClick={() => openTrend(item.key)} className="rounded-lg bg-teal-50 px-3 py-2 font-semibold text-teal-800">View trend →</button></div>
              {latest && undated > 0 && <p className="mt-2 text-xs text-amber-700">{undated} undated result(s) in full history</p>}
            </article>;
          })}</div>
        </section>)}</div>}
        {view === 'trends' && <LabTrends key={trendKey || 'default'} initialSelectedKey={visibleKeys.has(trendKey) ? trendKey : ''} results={visibleResults} />}
        {view === 'history' && <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200" role="region" aria-label="All laboratory result history" tabIndex={0}><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr>{['Date', 'Test / group', 'Result', 'Reference', 'Source'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{[...visibleResults].sort((a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity) || a.label.localeCompare(b.label)).map((entry, index) => <tr key={entry.seriesKey + index} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-4 text-slate-500">{dateLabel(entry.dateKey)}{entry.dateSource === 'visit' && <span className="block text-xs">Visit date</span>}</td><td className="px-4 py-4 font-medium text-slate-900">{entry.label}<span className="block text-xs font-normal text-slate-500">{entry.group || 'Other'}</span></td><td className="px-4 py-4"><span className="mr-2 font-semibold">{String(entry.value)} {entry.unit}</span><ResultFlag flag={entry.flag} /></td><td className="px-4 py-4 text-slate-500">{entry.referenceRange || '—'}</td><td className="px-4 py-4 text-slate-500">{entry.sourceLabel || '—'}</td></tr>)}</tbody></table></div>}
      </>}
    </div>
  </section>;
}
