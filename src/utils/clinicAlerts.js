export function getClinicAlert(now = new Date()) {
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  if (dayOfWeek !== 3) return null;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const time = (h, m) => h * 60 + m;

  const lastCallLabs = time(20, 0);   // 8:00 PM
  const labsClosed = time(20, 15);    // 8:15 PM
  const notesWarning = time(20, 30);  // 8:30 PM
  const notesUrgent = time(20, 45);   // 8:45 PM
  const notesCritical = time(20, 55); // 8:55 PM
  const attendingsLeave = time(21, 0); // 9:00 PM
  const alertsEnd = time(22, 0);       // 10:00 PM

  if (totalMinutes >= notesCritical && totalMinutes < attendingsLeave) {
    return {
      message: "⚠️ 5 minutes left. Finalize notes NOW.",
      level: "critical",
    };
  }

  if (totalMinutes >= notesUrgent && totalMinutes < notesCritical) {
    return {
      message: "⚠️ 15 minutes until attendings leave. Submit notes.",
      level: "high",
    };
  }

  if (totalMinutes >= notesWarning && totalMinutes < notesUrgent) {
    return {
      message: "Attendings leave at 9:00 PM. Please submit notes.",
      level: "medium",
    };
  }

  if (totalMinutes >= labsClosed && totalMinutes < notesWarning) {
    return {
      message: "It is after 8:15 PM. Avoid new labs unless approved.",
      level: "medium",
    };
  }

  if (totalMinutes >= lastCallLabs && totalMinutes < labsClosed) {
    return {
      message: "Last call for labs at 8:15 PM.",
      level: "low",
    };
  }

  if (totalMinutes >= attendingsLeave && totalMinutes < alertsEnd) {
    return {
      message: "Attendings have left for the night.",
      level: "critical",
    };
  }

  return null;
}