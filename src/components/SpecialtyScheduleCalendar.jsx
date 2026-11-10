import { useState } from "react";

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "long", year: "numeric", timeZone: "UTC",
});
const dateLabel = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long", timeZone: "UTC",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SpecialtyScheduleCalendar({ byDate, nextDate, today }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMonth, setViewMonth] = useState("");
  const dates = [...byDate.keys()].sort();
  const previousClinicDate = dates.findLast(day => day < today);
  const date = selectedDate || nextDate || dates.at(-1) || today;
  const month = viewMonth || date.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const roster = byDate.get(date) || [];

  function moveMonth(offset) {
    const nextMonth = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    setViewMonth(nextMonth.toISOString().slice(0, 7));
  }

  return (
    <section aria-label="Specialty scheduling history" className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="rounded px-3 py-1 hover:bg-slate-100">‹</button>
          <h4 className="text-sm font-semibold">{monthLabel.format(firstDay)}</h4>
          <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="rounded px-3 py-1 hover:bg-slate-100">›</button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
          {weekdays.map(day => <span key={day} className="py-1 text-xs text-slate-500">{day}</span>)}
          {Array.from({ length: firstDay.getUTCDay() }, (_, i) => <span key={`empty-${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const dayDate = `${month}-${String(day).padStart(2, "0")}`;
            const hasAttempts = byDate.has(dayDate);
            return (
              <button
                key={dayDate}
                type="button"
                aria-pressed={date === dayDate}
                aria-label={dateLabel.format(new Date(dayDate)) + (hasAttempts ? ", scheduling activity" : "")}
                onClick={() => setSelectedDate(dayDate)}
                className={`relative rounded py-2 ${date === dayDate ? "bg-slate-200 font-semibold" : "hover:bg-slate-100"}`}
              >
                {day}
                {hasAttempts && <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-green-600" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-600" />
          Scheduling activity
        </p>
        {previousClinicDate && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-blue-700 underline"
            onClick={() => {
              setViewMonth(previousClinicDate.slice(0, 7));
              setSelectedDate(previousClinicDate);
            }}
          >
            View last clinic with scheduling activity
          </button>
        )}
      </div>
      <div>
        <h4 className="text-sm font-semibold">{dateLabel.format(new Date(date))}</h4>
        {roster.length ? (
          <ul className="mt-2 divide-y divide-slate-200 text-sm">
            {roster.map(row => (
              <li key={row.id} className="flex flex-wrap justify-between gap-x-3 py-2">
                <span>{row.patientName || "Unnamed patient"}{row.appointmentSlot && ` · ${row.appointmentSlot}`}</span>
                <span className={row.status === "No Show" ? "font-medium text-red-700" : "text-slate-600"}>{row.status}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-500">No scheduling activity for this date.</p>}
      </div>
    </section>
  );
}
