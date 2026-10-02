import { isWhdScheduled } from "./womensHealthSchedule.js";
import { isGeneralClinicEncounter } from "../constants.js";

export function womensHealthAppointments(entries, patients, date) {
  return entries.filter(entry => isWhdScheduled(entry) && entry.specialtyDate === date)
    .map(entry => {
      const patient = patients.find(patient => String(patient.id) === String(entry.patientId));
      const checkedIn = Boolean(patient?.encounters?.some(encounter =>
        String(encounter.clinicDate || "").slice(0, 10) === date &&
        encounter.status !== "cancelled" && isGeneralClinicEncounter(encounter)));
      return { entry, patient, checkedIn };
    }).sort((a, b) => a.entry.appointmentSlot.localeCompare(b.entry.appointmentSlot) || a.entry.patientName.localeCompare(b.entry.patientName));
}
