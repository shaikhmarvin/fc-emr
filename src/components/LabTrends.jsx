import { useMemo, useState } from 'react';
import { buildLabTrendSeries, trendChange, trendSegments } from '../lib/labTrends.js';

const formatDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Date unavailable';
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Date unavailable';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const displayNumber = value => Number(value.toPrecision(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });

export default function LabTrends({ results, filter = 'all', initialSelectedKey = '' }) {
  const series = useMemo(() => buildLabTrendSeries(results).filter(item =>
    filter === 'all' || (filter === 'abnormal' ? item.entries.some(entry => ['H', 'L', 'A'].includes(entry.flag)) : item.group === filter)
  ), [results, filter]);
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);
  const selected = series.find(item => item.key === selectedKey) ||
    series.find(item => new Set(item.entries.filter(entry => entry.numeric !== null && entry.timestamp !== null).map(entry => entry.dateKey)).size > 1) || series[0];
  if (!selected) return <p className="text-sm text-slate-500">No results for this view yet.</p>;
  const points = selected.entries.filter(entry => entry.numeric !== null && entry.timestamp !== null);
  const change = trendChange(selected.entries);
  const days = [...new Set(points.map(entry => entry.timestamp))];
  const minX = Math.min(...days), maxX = Math.max(...days);
  const values = points.map(entry => entry.numeric);
  const min = Math.min(...values), max = Math.max(...values);
  const padding = max === min ? Math.max(Math.abs(max) * .1, 1) : (max - min) * .15;
  const minY = min - padding, maxY = max + padding;
  const x = entry => maxX === minX ? 340 : 65 + (entry.timestamp - minX) / (maxX - minX) * 535;
  const y = entry => 195 - (entry.numeric - minY) / (maxY - minY) * 160;

  return <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Lab trends over time">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <label className="min-w-0 flex-1 text-sm font-semibold text-slate-800">Trend by test
        <select aria-label="Choose lab trend" value={selected.key} onChange={event => setSelectedKey(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
          {series.map(item => <option key={item.key} value={item.key}>{item.label} · {item.unit || 'Units not recorded'} · {item.entries.length} result{item.entries.length === 1 ? '' : 's'}</option>)}
        </select>
      </label>
      {change && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
        {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→'} {change.delta > 0 ? '+' : ''}{displayNumber(change.delta)} {selected.unit} since {formatDate(change.previous.dateKey)}
      </p>}
    </div>
    {points.length > 0 ? <>
      <svg viewBox="0 0 640 245" role="img" aria-label={`${selected.label} over time, ${selected.unit || 'units not recorded'}`} className="mt-3 w-full rounded-lg bg-slate-50">
        <title>{selected.label}: {points.map(entry => `${entry.dateKey}: ${entry.value}`).join('; ')}</title>
        {[0, .5, 1].map(fraction => {
          const value = minY + (maxY - minY) * fraction, top = 195 - fraction * 160;
          return <g key={fraction}><line x1="65" x2="600" y1={top} y2={top} stroke="#cbd5e1" strokeDasharray="3 4" /><text x="58" y={top + 4} textAnchor="end" fontSize="11" fill="#64748b">{displayNumber(value)}</text></g>;
        })}
        {trendSegments(selected.entries).filter(segment => segment.length > 1).map((segment, index) =>
          <polyline key={index} points={segment.map(entry => `${x(entry)},${y(entry)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" />)}
        {points.map((entry, index) => <circle key={index} cx={x(entry)} cy={y(entry)} r="4.5" fill={entry.flag ? '#dc2626' : '#2563eb'} stroke="white" strokeWidth="1.5">
          <title>{formatDate(entry.dateKey)}: {entry.value} {selected.unit}{entry.flag ? ` (${entry.flag})` : ''} · {entry.sourceLabel}</title>
        </circle>)}
        <text x="65" y="222" fontSize="11" fill="#64748b">{formatDate(points[0].dateKey)}</text>
        {days.length > 1 && <text x="600" y="222" textAnchor="end" fontSize="11" fill="#64748b">{formatDate(points.at(-1).dateKey)}</text>}
      </svg>
      {days.length < 2 && <p className="mt-2 text-xs text-slate-500">One dated measurement so far. More dates will show a trend.</p>}
      {selected.entries.some(entry => entry.numeric === null) && <p className="mt-2 text-xs text-slate-500">Qualified and text results appear below as reported; the line does not connect across them.</p>}
    </> : <p className="my-4 text-sm text-slate-600">Results are shown below in time order. Text results and “less than” values are preserved as reported.</p>}
    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label={`${selected.label} result history`}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-100"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Source</th></tr></thead>
        <tbody>{[...selected.entries].reverse().map((entry, index) => <tr key={index} className="border-t border-slate-100">
          <td className="px-3 py-2">{formatDate(entry.dateKey)}{entry.dateSource === 'visit' && <span className="block text-xs text-slate-500">Visit date</span>}</td>
          <td className="px-3 py-2 font-semibold">{String(entry.value)} {selected.unit} {entry.flag && <span className="ml-1 rounded bg-red-100 px-1 text-xs text-red-700">{entry.flag}</span>}</td>
          <td className="px-3 py-2 text-slate-500">{entry.referenceRange || '—'}</td>
          <td className="px-3 py-2 text-slate-500">{entry.sourceLabel || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
