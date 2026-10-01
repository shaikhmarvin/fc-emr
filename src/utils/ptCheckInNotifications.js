import { getEncounterVisitTypeKey } from "../constants.js";

export function canReceivePtCheckIns(role, specialtyAccess = []) {
  return role === "physical_therapy" || specialtyAccess.includes("Physical Therapy");
}

export function getNewPtCheckIns(rows, clinicDate, seenIds) {
  return rows.filter(({ encounter }) => {
    if (!encounter?.id || seenIds.has(String(encounter.id))) return false;
    if (String(encounter.clinicDate || "").slice(0, 10) !== clinicDate) return false;
    if (!["pt", "physical_therapy", "physical therapy"].includes(String(encounter.specialtyType || "").trim().toLowerCase())) return false;
    if (!["specialty_only", "both"].includes(getEncounterVisitTypeKey(encounter)) && !encounter.dualVisit) return false;
    if (["done", "completed", "cancelled"].includes(String(encounter.status || "").toLowerCase())) return false;
    if (encounter.soapStatus === "signed" || encounter.disciplineNoteStatus === "signed") return false;
    return true;
  });
}
