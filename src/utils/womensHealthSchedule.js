export const WHD_SLOTS = ["10:00", "11:00", "12:00"];
export const WHD_DEFAULT_CAPACITIES = { "10:00": 8, "11:00": 8, "12:00": 8 };

export function whdSlotLabel(slot) {
  return { "10:00": "10:00 AM", "11:00": "11:00 AM", "12:00": "12:00 PM" }[slot] || slot;
}

export function isWhdScheduled(entry) {
  return entry.programType === "Women's Health Day" && entry.status === "Accepted" && Boolean(entry.specialtyDate && entry.appointmentSlot);
}

export function whdSlotEntries(entries, date, slot) {
  return entries.filter((entry) => isWhdScheduled(entry) && entry.specialtyDate === date && entry.appointmentSlot === slot);
}
