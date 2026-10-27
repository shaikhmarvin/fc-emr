export default function ResearchDetailSort({ value, onChange }) {
  return <label className="text-sm font-semibold text-slate-700">Sort by
    <select value={value} onChange={event => onChange(event.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white p-2 font-normal">
      <option value="newest">Newest date</option>
      <option value="oldest">Oldest date</option>
      <option value="patient">Patient name (A–Z)</option>
    </select>
  </label>;
}
