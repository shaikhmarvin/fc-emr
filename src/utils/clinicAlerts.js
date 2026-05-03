export function getClinicAlert(now = new Date()) {
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  if (dayOfWeek !== 3) return null;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const time = (h, m) => h * 60 + m;

  const labsWarning = time(19, 45);       // 7:45 PM
  const labsDone = time(20, 0);           // 8:00 PM

  const pharmacyWarning = time(20, 15);   // 8:15 PM
  const pharmacyDone = time(20, 30);      // 8:30 PM

  const attendingWarning = time(20, 45);  // 8:45 PM
  const attendingCritical = time(20, 55); // 8:55 PM
  const attendingsLeave = time(21, 0);    // 9:00 PM

  const alertsEnd = time(22, 0);          // 10:00 PM

  if (totalMinutes >= attendingsLeave && totalMinutes < alertsEnd) {
    return {
      message: "Attendings have left for the night.",
      level: "critical",
    };
  }

  if (totalMinutes >= attendingCritical && totalMinutes < attendingsLeave) {
    return {
      message: "⚠️ 5 minutes until attendings leave. Finalize notes and signatures NOW.",
      level: "critical",
    };
  }

  if (totalMinutes >= attendingWarning && totalMinutes < attendingCritical) {
    return {
      message: "⚠️ Attendings leave at 9:00 PM. Submit notes and signatures soon.",
      level: "high",
    };
  }

  if (totalMinutes >= pharmacyDone && totalMinutes < attendingWarning) {
    return {
      message: "Pharmacy is done for the night. Focus on final signatures and closing workflow.",
      level: "medium",
    };
  }

  if (totalMinutes >= pharmacyWarning && totalMinutes < pharmacyDone) {
    return {
      message: "⚠️ Pharmacy closes at 8:30 PM. Finish medication pickup/refill workflow soon.",
      level: "medium",
    };
  }

  if (totalMinutes >= labsDone && totalMinutes < pharmacyWarning) {
    return {
      message: "Labs are done for the night. Avoid new labs unless specifically approved.",
      level: "medium",
    };
  }

  if (totalMinutes >= labsWarning && totalMinutes < labsDone) {
    return {
      message: "⚠️ Labs are done at 8:00 PM. Last call for any needed labs.",
      level: "low",
    };
  }

  return null;
}