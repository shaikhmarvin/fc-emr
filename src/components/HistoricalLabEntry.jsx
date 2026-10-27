import { useState } from 'react';
import { LAB_CATALOG, findLabByKey } from '../lib/labCatalog.js';

const empty = { key: 'a1c', collectedDate: '', value: '', units: findLabByKey('a1c').unit, source: '', referenceRange: '', flag: '' };
const tests = [...LAB_CATALOG].sort((a, b) => a.displayName.localeCompare(b.displayName));

export default function HistoricalLabEntry({ onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const update = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setError(''); setSaved(''); };
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await onSave(draft);
      setSaved('Historical lab saved to the chart under its collection date.');
      setDraft(previous => ({ ...previous, value: '', referenceRange: '', flag: '' }));
    } catch (failure) { setError(failure.message || 'Could not save this result. Please try again.'); }
    finally { setBusy(false); }
  }
  const field = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 font-normal';
  return <section className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4" aria-label="Historical lab entry">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">{open ? 'Hide historical lab entry' : 'Add historical lab'}</button>
    {open && <form onSubmit={save} className="mt-4 space-y-4">
      <p className="text-sm text-slate-600">Enter results from before EMR use or another clinic. Use the original collection date; the result will appear in lab history and trends without adding a visit.</p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Collection date<input required type="date" value={draft.collectedDate} onChange={event => update('collectedDate', event.target.value)} className={field} /></label>
        <label className="text-sm font-semibold">Test<select value={draft.key} onChange={event => { const test = findLabByKey(event.target.value); setDraft(previous => ({ ...previous, key: test.key, units: test.unit || '', value: '', referenceRange: '', flag: '' })); setError(''); setSaved(''); }} className={field}>{tests.map(test => <option key={test.key} value={test.key}>{test.displayName}</option>)}</select></label>
        <label className="text-sm font-semibold">Result<input required value={draft.value} onChange={event => update('value', event.target.value)} className={field} /></label>
        <label className="text-sm font-semibold">Units<input value={draft.units} onChange={event => update('units', event.target.value)} className={field} /></label>
        <label className="text-sm font-semibold">Reference range (optional)<input value={draft.referenceRange} onChange={event => update('referenceRange', event.target.value)} className={field} /></label>
        <label className="text-sm font-semibold">Reported flag<select value={draft.flag} onChange={event => update('flag', event.target.value)} className={field}><option value="">None reported</option><option value="H">High</option><option value="L">Low</option><option value="A">Abnormal</option></select></label>
        <label className="text-sm font-semibold sm:col-span-2">Source / original record<input required placeholder="e.g. paper chart, outside clinic, lab report" value={draft.source} onChange={event => update('source', event.target.value)} className={field} /></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-teal-800">{saved}</p>}
      <button disabled={busy} type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save historical lab'}</button>
    </form>}
  </section>;
}
