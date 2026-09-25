import { useState } from "react";
import { WHD_SLOTS, WHD_DEFAULT_CAPACITIES, whdSlotLabel, whdSlotEntries, isWhdScheduled } from "../utils/womensHealthSchedule";

export default function WomensHealthSchedule({ entries, settings, canEditSettings, onSaveSettings, onUpdate }) {
  const [dateOverride, setDateOverride] = useState(null);
  const date = dateOverride ?? settings?.eventDate ?? "";
  const capacities = settings?.slotCapacities || WHD_DEFAULT_CAPACITIES;
  const [capacityDraft, setCapacityDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [choices, setChoices] = useState({});
  const whdEntries = entries.filter((entry) => entry.programType === "Women's Health Day");
  const waitlist = whdEntries.filter((entry) => !isWhdScheduled(entry) && entry.status !== "Declined" && `${entry.patientName} ${entry.dob} ${entry.mrn}`.toLowerCase().includes(search.toLowerCase()));
  const legacySlots = [...new Set(whdEntries.filter((entry) => isWhdScheduled(entry) && entry.specialtyDate === date && !WHD_SLOTS.includes(entry.appointmentSlot)).map((entry) => entry.appointmentSlot))];

  async function saveCapacities() {
    const next = Object.fromEntries(WHD_SLOTS.map((slot) => [slot, Number((capacityDraft || capacities)[slot])]));
    if (WHD_SLOTS.some((slot) => (capacityDraft || capacities)[slot] === "" || !Number.isInteger(next[slot]) || next[slot] < 0)) {
      setMessage("Enter a whole number of places, zero or greater, for each time.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSaveSettings({ ...settings, slotCapacities: next });
      setCapacityDraft(null);
      setMessage("Appointment capacities saved.");
    } catch (error) {
      setMessage(error.message || "Could not save appointment capacities.");
    } finally { setBusy(false); }
  }

  async function schedule(entry, slot) {
    if (!date || !slot) { setMessage("Choose an event date and appointment time first."); return; }
    if (whdSlotEntries(whdEntries, date, slot).filter((item) => item.id !== entry.id).length >= capacities[slot]) {
      setMessage("That appointment time is full. Choose another time."); return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onUpdate(entry.id, { status: "Accepted", specialtyDate: date, appointmentSlot: slot });
    } catch (error) { setMessage(error.message || "Could not schedule patient."); }
    finally { setBusy(false); }
  }

  async function returnToWaitlist(entry) {
    setBusy(true);
    setMessage("");
    try {
      await onUpdate(entry.id, { status: "Pending Acceptance", specialtyDate: "", appointmentSlot: "" });
    } catch (error) { setMessage(error.message || "Could not return patient to the waitlist."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-5 rounded-2xl bg-white p-5 shadow">
    <h3 className="text-lg font-semibold">Women’s Health Day Schedule</h3>
    <label className="block text-sm font-medium">Event date
      <input type="date" value={date} disabled={busy} onChange={(event) => setDateOverride(event.target.value)} className="ml-3 rounded-lg border p-2" />
    </label>
    {canEditSettings && <fieldset disabled={busy} className="rounded-xl border p-4">
      <legend className="px-2 font-medium">Places per appointment time</legend>
      <p className="mb-3 text-sm text-slate-600">These capacities apply to all event dates. Zero closes a time to new bookings.</p>
      <div className="flex flex-wrap items-end gap-3">
        {WHD_SLOTS.map((slot) => <label key={slot} className="text-sm">{whdSlotLabel(slot)}
          <input type="number" min="0" step="1" value={(capacityDraft || capacities)[slot]} onChange={(event) => setCapacityDraft({ ...(capacityDraft || capacities), [slot]: event.target.value })} className="mt-1 block w-24 rounded-lg border p-2" />
        </label>)}
        <button type="button" onClick={saveCapacities} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Save capacities</button>
      </div>
    </fieldset>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    {!date && <p className="text-sm text-slate-600">Choose a date to view appointments and schedule patients.</p>}
    {date && <div className="grid gap-4 lg:grid-cols-3">
      {[...WHD_SLOTS, ...legacySlots].map((slot) => {
        const scheduled = whdSlotEntries(whdEntries, date, slot);
        return <div key={slot} className="rounded-xl border p-4">
          <h4 className="font-semibold">{whdSlotLabel(slot)}</h4>
          <p className="mb-3 text-sm text-slate-600">{scheduled.length} scheduled{WHD_SLOTS.includes(slot) ? ` / ${capacities[slot]} places · ${Math.max(0, capacities[slot] - scheduled.length)} available` : " · Existing appointment time"}</p>
          {scheduled.length === 0 && <p className="text-sm text-slate-500">No patients scheduled.</p>}
          {scheduled.map((entry) => <div key={entry.id} className="mb-3 rounded-lg bg-slate-50 p-3">
            <p className="font-medium">{entry.patientName}</p>
            <p className="text-sm">DOB: {entry.dob || "—"} · {entry.phone || "No phone"}</p>
            <p className="text-sm">Reason: {entry.reason || "—"}</p><p className="text-sm">Clinician preference: {entry.clinicianGenderPreference || "Not recorded"}</p>
            <label className="mt-2 block text-sm">Move to another time
              <select value="" disabled={busy} onChange={(event) => schedule(entry, event.target.value)} className="mt-1 w-full rounded-lg border p-2">
                <option value="">Choose time</option>
                {WHD_SLOTS.filter((time) => time !== slot).map((time) => <option key={time} value={time} disabled={whdSlotEntries(whdEntries, date, time).length >= capacities[time]}>{whdSlotLabel(time)}</option>)}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={() => returnToWaitlist(entry)} className="mt-2 text-sm font-medium text-purple-700">Return to waitlist</button>
          </div>)}
        </div>;
      })}
    </div>}
    <h4 className="font-semibold">Waitlist — schedule a patient</h4>
    <p className="text-sm text-slate-600">Scheduling marks the patient Accepted. Patients with an existing appointment stay on their scheduled date; use the tracker to change the date.</p>
    <input aria-label="Search waitlist" placeholder="Search name, DOB, or MRN" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border p-2" />
    {waitlist.length === 0 && <p className="text-sm text-slate-500">No matching patients awaiting scheduling.</p>}
    {waitlist.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      <div className="min-w-48 flex-1"><p className="font-medium">{entry.patientName}</p><p className="text-sm">DOB: {entry.dob || "—"} · {entry.status}</p><p className="text-sm">Reason: {entry.reason || "—"}</p><p className="text-sm">Clinician preference: {entry.clinicianGenderPreference || "Not recorded"}</p></div>
      <select aria-label={`Appointment time for ${entry.patientName}`} disabled={busy || !date} value={choices[entry.id] || ""} onChange={(event) => setChoices({ ...choices, [entry.id]: event.target.value })} className="rounded-lg border p-2">
        <option value="">Choose time</option>
        {WHD_SLOTS.map((slot) => { const remaining = Math.max(0, capacities[slot] - whdSlotEntries(whdEntries, date, slot).length); return <option key={slot} value={slot} disabled={!remaining}>{whdSlotLabel(slot)} — {remaining} available</option>; })}
      </select>
      <button type="button" disabled={busy || !date || !choices[entry.id]} onClick={() => schedule(entry, choices[entry.id])} className="rounded-lg bg-purple-700 px-4 py-2 text-white disabled:opacity-50">Schedule</button>
    </div>)}
  </section>;
}
