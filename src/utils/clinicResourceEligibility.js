export function isClinicResourceAvailable(resourceKey, settings, intakeForm, today = new Date()) {
  const setting = (settings || []).find((row) => row.resource_key === resourceKey);
  if (!setting?.enabled) return false;

  const patientSex = String(intakeForm?.sex || "").trim().toLowerCase();
  const patientAge = Number(intakeForm?.age);

  if (setting.sex_restriction === "female" && patientSex !== "female") return false;
  if (setting.sex_restriction === "male" && patientSex !== "male") return false;
  if (setting.min_age != null && (!patientAge || patientAge < Number(setting.min_age))) return false;
  if (setting.max_age != null && (!patientAge || patientAge > Number(setting.max_age))) return false;

  if (setting.seasonal) {
    const month = today.getMonth() + 1;
    const start = Number(setting.season_start_month);
    const end = Number(setting.season_end_month);
    if (start && end && !(start <= end
      ? month >= start && month <= end
      : month >= start || month <= end)) return false;
  }

  return true;
}
