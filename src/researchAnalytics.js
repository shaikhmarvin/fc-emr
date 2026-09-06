import { getEncounterVisitTypeKey, isGeneralClinicEncounter } from "./constants.js";

export function normalizeDate(value) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text;
}

function ageOnDate(dob, dateValue) {
  if (!dob || !dateValue) return null;
  const birth = new Date(`${normalizeDate(dob)}T12:00:00`);
  const visit = new Date(`${normalizeDate(dateValue)}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(visit.getTime())) return null;
  let age = visit.getFullYear() - birth.getFullYear();
  const birthdayNotReached = visit.getMonth() < birth.getMonth() || (visit.getMonth() === birth.getMonth() && visit.getDate() < birth.getDate());
  if (birthdayNotReached) age -= 1;
  return age;
}

function isPositive(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "positive", "1"].includes(String(value || "").trim().toLowerCase());
}

function intakeValue(encounter, ...keys) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  for (const key of keys) {
    const direct = encounter?.[key];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
    const stored = intake?.[key];
    if (stored !== undefined && stored !== null && stored !== "") return stored;
  }
  return "";
}

export function minutesBetween(start, end) {
  const startMs = new Date(start || 0).getTime();
  const endMs = new Date(end || 0).getTime();
  if (!startMs || !endMs || endMs < startMs) return null;
  const minutes = Math.round((endMs - startMs) / 60000);
  // Zero-length intervals and encounters spanning more than a full 8-hour
  // clinic window are almost always incomplete or invalid workflow timestamps.
  return minutes >= 1 && minutes <= 480 ? minutes : null;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return "—";
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function minuteRange(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return "No valid values";
  return `${Math.min(...valid)}–${Math.max(...valid)} min`;
}

export function completionTime(encounter) {
  if (!encounter) return null;
  const refillOnly = getEncounterVisitTypeKey(encounter) === "refill_only";
  if (refillOnly) return encounter.pharmacyPickedUpAt || encounter.pharmacy_picked_up_at || null;
  return encounter.pharmacyPickedUpAt || encounter.pharmacy_picked_up_at || encounter.visitCompletedAt || encounter.visit_completed_at || encounter.doneAt || encounter.done_at || null;
}

export function isComplete(encounter) {
  if (!encounter) return false;
  if (getEncounterVisitTypeKey(encounter) === "refill_only") {
    return Boolean(completionTime(encounter)) || ["picked_up", "no_meds_needed", "meds_not_picked_up"].includes(encounter.pharmacyStatus || encounter.pharmacy_status);
  }
  return encounter.status === "done" || encounter.soapStatus === "signed" || Boolean(completionTime(encounter));
}

function flowMetrics(rows) {
  const general = rows.filter(({ encounter }) => !["refill_only", "specialty_only"].includes(getEncounterVisitTypeKey(encounter)));
  const refills = rows.filter(({ encounter }) => getEncounterVisitTypeKey(encounter) === "refill_only");
  const averageBetween = (source, start, end) => average(source.map(({ encounter }) => minutesBetween(encounter?.[start], encounter?.[end])));
  const rangeBetween = (source, start, end) => minuteRange(source.map(({ encounter }) => minutesBetween(encounter?.[start], encounter?.[end])));
  const assignedToCompleteValues = general.map(({ encounter }) => minutesBetween(encounter.studentAssignedAt, completionTime(encounter)));
  const totalClinicValues = general.map(({ encounter }) => minutesBetween(encounter.undergradCompletedAt, completionTime(encounter)));
  const refillPickupValues = refills.map(({ encounter }) => minutesBetween(encounter.undergradCompletedAt || encounter.createdAt, completionTime(encounter)));
  const pharmacyDelayValues = general.map(({ encounter }) => minutesBetween(encounter.visitCompletedAt, encounter.pharmacyPickedUpAt));
  return {
    patients: new Set(rows.map(({ patientId }) => patientId)).size,
    visits: rows.length,
    completed: rows.filter(({ encounter }) => isComplete(encounter)).length,
    cancelled: rows.filter(({ encounter }) => encounter.status === "cancelled").length,
    startedToUndergrad: averageBetween(general, "createdAt", "undergradCompletedAt"),
    startedToUndergradRange: rangeBetween(general, "createdAt", "undergradCompletedAt"),
    startedToLeadership: averageBetween(general, "createdAt", "leadershipIntakeCompletedAt"),
    startedToLeadershipRange: rangeBetween(general, "createdAt", "leadershipIntakeCompletedAt"),
    leadershipToStudent: averageBetween(general, "leadershipIntakeCompletedAt", "studentAssignedAt"),
    leadershipToStudentRange: rangeBetween(general, "leadershipIntakeCompletedAt", "studentAssignedAt"),
    studentToUpper: averageBetween(general, "studentAssignedAt", "upperLevelAssignedAt"),
    studentToUpperRange: rangeBetween(general, "studentAssignedAt", "upperLevelAssignedAt"),
    assignedToComplete: average(assignedToCompleteValues),
    assignedToCompleteRange: minuteRange(assignedToCompleteValues),
    totalClinic: average(totalClinicValues),
    totalClinicRange: minuteRange(totalClinicValues),
    refillPickup: average(refillPickupValues),
    refillPickupRange: minuteRange(refillPickupValues),
    pharmacyDelay: average(pharmacyDelayValues),
    pharmacyDelayRange: minuteRange(pharmacyDelayValues),
  };
}

export function percent(numerator, denominator) {
  return denominator ? `${((numerator / denominator) * 100).toFixed(2)}%` : "—";
}


function pharmacyCohort(patient, endDate) {
  const conditions = patient.chronicConditions || patient.chronic_conditions || [];
  const hasCondition = Array.isArray(conditions) && conditions.some((condition) =>
    !["", "none", "no", "n/a", "unknown"].includes(String(condition).trim().toLowerCase())
  );
  const historicalFlag = (patient.encounters || []).some((encounter) =>
    encounter.status !== "cancelled" && isGeneralClinicEncounter(encounter) && normalizeDate(encounter.clinicDate) &&
    (!endDate || normalizeDate(encounter.clinicDate) <= endDate) &&
    (isPositive(intakeValue(encounter, "htn")) || isPositive(intakeValue(encounter, "dm")))
  );
  return hasCondition || historicalFlag || String(patient.chronicConditionsOther || patient.chronic_conditions_other || "").trim()
    ? "Chronic condition recorded" : "No chronic condition recorded";
}

function buildPharmacyGroups(rows) {
  const eligible = rows.filter((row) => ["general", "both", "refill_only"].includes(row.visitType) && row.encounter.status !== "cancelled");
  return ["Chronic condition recorded", "No chronic condition recorded"].flatMap((cohort) => {
    const cohortRows = eligible.filter((row) => row.pharmacyCohort === cohort);
    const patients = new Set(cohortRows.map((row) => row.patientId)).size;
    const refillPatients = new Set(cohortRows.filter((row) => row.visitType === "refill_only").map((row) => row.patientId)).size;
    return ["general", "refill_only"].map((visitType) => {
      const source = cohortRows.filter((row) => visitType === "general" ? row.visitType !== "refill_only" : row.visitType === visitType);
      const outcome = (row) => row.encounter.pharmacyStatus || row.encounter.pharmacy_status || "";
      const pickedUp = source.filter((row) => outcome(row) === "picked_up" || Boolean(row.encounter.pharmacyPickedUpAt || row.encounter.pharmacy_picked_up_at));
      const notPickedUp = source.filter((row) => !pickedUp.includes(row) && outcome(row) === "meds_not_picked_up");
      const noMeds = source.filter((row) => !pickedUp.includes(row) && outcome(row) === "no_meds_needed");
      const pending = source.filter((row) => !pickedUp.includes(row) && ["waiting", "meds_ready", "patient_sent"].includes(outcome(row)));
      const unrecorded = source.filter((row) => !pickedUp.includes(row) && !notPickedUp.includes(row) && !noMeds.includes(row) && !pending.includes(row));
      return { cohort, visitType, rows: source, patients, refillPatients, cohortVisits: cohortRows.length,
        pickedUp, notPickedUp, noMeds, pending, unrecorded, resolved: pickedUp.length + notPickedUp.length };
    });
  });
}

export function buildResearchReport(patients, startDate, endDate) {
  const chronicByPatient = new Map();
  patients.forEach((patient) => {
    const encounters = (patient.encounters || []).filter((encounter) => isGeneralClinicEncounter(encounter) && encounter.status !== "cancelled");
    const htnEncounter = encounters.find((encounter) => isPositive(intakeValue(encounter, "htn")));
    const dmEncounter = encounters.find((encounter) => isPositive(intakeValue(encounter, "dm")));
    chronicByPatient.set(String(patient.id), { htn: !!htnEncounter, dm: !!dmEncounter, htnDate: normalizeDate(htnEncounter?.clinicDate), dmDate: normalizeDate(dmEncounter?.clinicDate) });
  });

  const rows = [];
  const analyticsRows = [];
  patients.forEach((patient) => {
    const allEncounters = [...(patient.encounters || [])].sort((a, b) =>
      normalizeDate(a.clinicDate).localeCompare(normalizeDate(b.clinicDate))
    );
    const patientPharmacyCohort = pharmacyCohort(patient, endDate);
    allEncounters.forEach((encounter) => {
      const date = normalizeDate(encounter.clinicDate);
      if (!date || (startDate && date < startDate) || (endDate && date > endDate)) return;
      const visitType = getEncounterVisitTypeKey(encounter);
      const patientName = [patient.first_name || patient.firstName, patient.last_name || patient.lastName].filter(Boolean).join(" ") || patient.name || `Patient ${patient.id}`;
      const femaleEligible = String(patient.sex || "").trim().toLowerCase() === "female";
      const visitAge = ageOnDate(patient.dob, date);
      const papEligible = femaleEligible && visitAge !== null && visitAge >= 21 && visitAge <= 65;
      const mammogramEligible = femaleEligible && visitAge !== null && visitAge >= 45;
      analyticsRows.push({ patientId: String(patient.id), patientName, encounter, date, visitType, pharmacyCohort: patientPharmacyCohort });
      if (["refill_only", "specialty_only"].includes(visitType)) return;
      if (encounter.status === "cancelled") return;
      const chronic = chronicByPatient.get(String(patient.id)) || { htn: false, dm: false };
      const language = isPositive(intakeValue(encounter, "spanishSpeaking")) ? "Spanish" : "English / not marked Spanish";
      const transportation = String(intakeValue(encounter, "transportation") || "Not recorded").trim();
      const pap = String(intakeValue(encounter, "papStatus") || "Not recorded").trim();
      const mammogram = String(intakeValue(encounter, "mammogramStatus", "mammogramPapSmear") || "Not recorded").trim();
      rows.push({
        patientId: String(patient.id), patientName, encounter, chronic, language, transportation, pap, mammogram, date, visitAge, femaleEligible, papEligible, mammogramEligible,
        returning: allEncounters.some((prior) => isGeneralClinicEncounter(prior) && prior.status !== "cancelled" && normalizeDate(prior.clinicDate) && normalizeDate(prior.clinicDate) < date),
        duration: minutesBetween(encounter.createdAt, encounter.visitCompletedAt || encounter.doneAt),
      });
    });
  });

  const countBy = (key, sourceRows = rows) => Object.entries(sourceRows.reduce((counts, row) => {
    const value = row[key] || "Not recorded";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]);
  const unique = (subset) => new Set(subset.map((row) => row.patientId)).size;
  const chronicRows = rows.filter((row) => row.chronic.htn || row.chronic.dm);
  const papEligibleRows = rows.filter((row) => row.papEligible);
  const mammogramEligibleRows = rows.filter((row) => row.mammogramEligible);
  const languageStats = countBy("language").map(([label, count]) => {
    const languageRows = rows.filter((row) => row.language === label);
    return [label, count, average(languageRows.map((row) => minutesBetween(row.encounter.undergradCompletedAt, completionTime(row.encounter))))];
  });
  const transportationReturnStats = countBy("transportation").map(([label]) => {
    const modeRows = rows.filter((row) => row.transportation === label);
    const patientIds = new Set(modeRows.map((row) => row.patientId));
    const returnedPatientIds = new Set(
      modeRows
        .filter((row) => rows.some((later) => later.patientId === row.patientId && later.date > row.date))
        .map((row) => row.patientId)
    );
    return { label, rows: modeRows, patients: patientIds.size, visits: modeRows.length, returnedPatients: returnedPatientIds.size, rate: percent(returnedPatientIds.size, patientIds.size) };
  });
  const groups = [
    ["HTN+ only", rows.filter((row) => row.chronic.htn && !row.chronic.dm)],
    ["DM+ only", rows.filter((row) => row.chronic.dm && !row.chronic.htn)],
    ["HTN+ and DM+", rows.filter((row) => row.chronic.htn && row.chronic.dm)],
    ["Neither recorded", rows.filter((row) => !row.chronic.htn && !row.chronic.dm)],
  ].map(([label, groupRows]) => ({ label, rows: groupRows, visits: groupRows.length, patients: unique(groupRows), returns: groupRows.filter((row) => row.returning).length, duration: average(groupRows.map((row) => row.duration)) }));

  const generalAnalyticsRows = analyticsRows.filter((row) => ["general", "both"].includes(row.visitType));
  const refillAnalyticsRows = analyticsRows.filter((row) => row.visitType === "refill_only");
  const dailyGroups = generalAnalyticsRows.reduce((groupsByDate, row) => {
    if (!groupsByDate[row.date]) groupsByDate[row.date] = [];
    groupsByDate[row.date].push(row);
    return groupsByDate;
  }, {});
  const dailyFlow = Object.entries(dailyGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dateRows]) => ({ date, ...flowMetrics(dateRows) }));

  return { pharmacyGroups: buildPharmacyGroups(analyticsRows), rows, chronicRows, papEligibleRows, mammogramEligibleRows, uniquePatients: unique(rows), chronicPatients: unique(chronicRows), chronicReturns: chronicRows.filter((row) => row.returning).length, groups, language: countBy("language"), languageStats, transportation: countBy("transportation"), transportationReturnStats, pap: countBy("pap", papEligibleRows), mammogram: countBy("mammogram", mammogramEligibleRows), flow: flowMetrics(generalAnalyticsRows), refillFlow: flowMetrics(refillAnalyticsRows), generalAnalyticsRows, refillAnalyticsRows, dailyFlow };
}
