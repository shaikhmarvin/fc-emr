import { getStatusClasses, getStatusLabel } from "../utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import OphthalmologySoapForm from "./OphthalmologySoapForm";
import { downloadEncounterPdf } from "../utils/pdfGenerator";
import logo from "../assets/free-clinic-logo.png";
import { getClinicAlert } from "../utils/clinicAlerts";
export default function ChartView({
  selectedPatient,
  selectedEncounter,
  selectedEncounterId,
  normalizeClinicDate,
  setActiveView,
  startNewEncounter,
  deleteEncounter,
  canStartEncounter,
  isLeadershipView,
  getFullPatientName,
  lastVisitLabel,
  openPatientChart,
  spanishBadge,
  priorityBadge,
  newReturningBadge,
  papBadge,
  pharmacyStatusBadge,
  dualVisitBadge,
  diabetesBadge,
  elevatorBadge,
  fluBadge,
  assignmentForm,
  setAssignmentForm,
  studentNameOptions,
  assignedStudentNames,
  upperLevelNameOptions,
  ROOM_OPTIONS,
  isPapRestricted,
  assignEncounter,
  leadershipActionLocked,
  updateEncounterStatus,
  clearEncounterRoom,
  sortedMedications,
  activeMedicationCount,
  toggleMedicationActive,
  startEditMedication,
  deleteMedication,
  setEditingMedicationId,
  setNewMedication,
  setShowMedicationModal,
  EMPTY_MEDICATION,
  startEditAllergy,
  deleteAllergy,
  setShowAllergyModal,
  setEditingAllergyId,
  setNewAllergy,
  EMPTY_ALLERGY,
  updatePatientField,
  currentVitals,
  updateVitalsField,
  saveVitals,
  editingVitalsIndex,
  startEditVitals,
  saveSoapNote,
  soapAutoSaveEnabled,
  updateEncounterField,
  saveEncounterField,
  openEditIntake,
  formatDate,
  soapStatus,
  canSignAsUpperLevel,
  canSignAsAttending,
  signSoapAsUpperLevel,
  signSoapAsAttending,
  canSubmitForUpperLevel,
  canSubmitForAttending,
  submitSoapForUpperLevel,
  submitSoapForAttending,
  soapBusy,
  soapUiMessage,
  formatRoleLabel,
  canReopenSoap,
  reopenSoapNote,
  auditEntries,
  auditLoading,
  soapAuthorName,
  upperLevelSignerName,
  attendingSignerName,
  activeStudents,
  activeUpperLevels,
  activeAttendings,
  signSoapAsAttendingWithPin,
  saveInHouseLabs,
  saveSendOutLabs,
  soapDraft,
  updateSoapDraftField,
  openPatientEditModal,
  canRefill,
  currentUserId,
  onStartRefillRequest,
  refillRequests,
  profileNameMap,
  setSkipUpperLevelApproval,
}) {


  function formatAuditAction(action) {
    switch (action) {
      case "soap_saved":
        return "SOAP note saved";
      case "soap_submitted_upper":
        return "Submitted to upper level";
      case "soap_submitted_attending":
        return "Submitted to attending";
      case "soap_signed_upper":
        return "Signed by upper level";
      case "soap_signed_attending":
        return "Signed by attending";
      case "soap_reopened":
        return "SOAP note reopened";
      case "skip_upper_level_approved":
        return "Skip Upper Level approved";
      case "skip_upper_level_removed":
        return "Skip Upper Level removed";
      default:
        return action;
    }
  }

  function getNumericValue(value) {
    if (value === null || value === undefined) return null;
    const match = String(value).match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function getBpNumbers(bp) {
    if (!bp) return null;
    const match = String(bp).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (!match) return null;

    return {
      systolic: Number(match[1]),
      diastolic: Number(match[2]),
    };
  }

  function getTrendDirection(current, previous) {
    if (current === null || previous === null) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  }

  function getDosesPerDay(frequency) {
    switch ((frequency || "").toLowerCase()) {
      case "daily":
        return 1;
      case "bid":
        return 2;
      case "tid":
        return 3;
      case "qid":
        return 4;
      case "weekly":
        return 1 / 7;
      default:
        return null;
    }
  }
  function getMedicationSupplyInfo(med) {
  const dispense = Number(med?.dispenseAmount);
  const dosesPerDay = getDosesPerDay(med?.frequency);
  const refillCount = Number(med?.refillCount);

  if (!dispense || !dosesPerDay || dosesPerDay <= 0) {
    return {
      daysUntilRefill: "",
      refillDueDate: "",
      totalDaysCovered: "",
      runoutDate: "",
    };
  }

  const daysUntilRefill = Math.floor(dispense / dosesPerDay);

  if (!daysUntilRefill || daysUntilRefill < 1) {
    return {
      daysUntilRefill: "",
      refillDueDate: "",
      totalDaysCovered: "",
      runoutDate: "",
    };
  }

  const safeRefills =
    Number.isFinite(refillCount) && refillCount >= 0 ? refillCount : 0;

  const totalDaysCovered = daysUntilRefill * (safeRefills + 1);

  const rawStartDate =
    med?.startedDate ||
    med?.medicationStartedAt ||
    med?.medication_started_at ||
    "";

  const startDate = rawStartDate
    ? new Date(`${rawStartDate}T12:00:00`)
    : new Date();

  const refillDue = new Date(startDate);
  refillDue.setDate(startDate.getDate() + daysUntilRefill);

  const runout = new Date(startDate);
  runout.setDate(startDate.getDate() + totalDaysCovered);

  return {
    daysUntilRefill,
    refillDueDate: refillDue.toLocaleDateString(),
    totalDaysCovered,
    runoutDate: runout.toLocaleDateString(),
  };
}

  const LAB_GROUP_ORDER = [
    "CBC",
    "Chemistry / Renal",
    "Liver",
    "Diabetes",
    "Lipids",
    "Thyroid / Endocrine",
    "Infectious",
    "Urine",
    "Other",
  ];

  const IN_HOUSE_LAB_CONFIG = [
    { group: "Chemistry / Renal", label: "Sodium", path: ["istat", "na"] },
    { group: "Chemistry / Renal", label: "Potassium", path: ["istat", "k"] },
    { group: "Chemistry / Renal", label: "Chloride", path: ["istat", "cl"] },
    { group: "Chemistry / Renal", label: "Ionized Calcium", path: ["istat", "ica"] },
    { group: "Diabetes", label: "Glucose", path: ["istat", "glucose"] },
    { group: "Chemistry / Renal", label: "TCO2", path: ["istat", "tco2"] },
    { group: "Chemistry / Renal", label: "BUN", path: ["istat", "bun"] },
    { group: "Chemistry / Renal", label: "Creatinine", path: ["istat", "creatinine"] },
    { group: "CBC", label: "Hematocrit", path: ["istat", "hct"] },
    { group: "CBC", label: "Hemoglobin", path: ["istat", "hgb"] },
    { group: "Chemistry / Renal", label: "Anion Gap", path: ["istat", "anionGap"] },

    { group: "Diabetes", label: "Blood Glucose", path: ["core", "bloodGlucose"] },
    { group: "Diabetes", label: "A1c", path: ["core", "a1c"] },
    { group: "Infectious", label: "HIV", path: ["core", "hiv"] },

    { group: "Lipids", label: "Total Cholesterol", path: ["lipids", "totalCholesterol"] },
    { group: "Lipids", label: "Triglycerides", path: ["lipids", "triglycerides"] },
    { group: "Lipids", label: "HDL", path: ["lipids", "hdl"] },
    { group: "Lipids", label: "LDL", path: ["lipids", "ldl"] },
    { group: "Lipids", label: "TC / HDL", path: ["lipids", "tcHdl"] },

    { group: "Urine", label: "Urine Albumin", path: ["microalbumin", "albumin"] },
    { group: "Urine", label: "Urine Creatinine", path: ["microalbumin", "creatinine"] },
    { group: "Urine", label: "Albumin / Creatinine Ratio", path: ["microalbumin", "acRatio"] },

    { group: "Urine", label: "Leukocytes", path: ["urinalysis", "leukocytes"] },
    { group: "Urine", label: "Nitrite", path: ["urinalysis", "nitrite"] },
    { group: "Urine", label: "Urobilinogen", path: ["urinalysis", "urobilinogen"] },
    { group: "Urine", label: "Protein", path: ["urinalysis", "protein"] },
    { group: "Urine", label: "pH", path: ["urinalysis", "ph"] },
    { group: "Urine", label: "Blood", path: ["urinalysis", "blood"] },
    { group: "Urine", label: "Specific Gravity", path: ["urinalysis", "specificGravity"] },
    { group: "Urine", label: "Ketones", path: ["urinalysis", "ketones"] },
    { group: "Urine", label: "Bilirubin", path: ["urinalysis", "bilirubin"] },
    { group: "Urine", label: "Urine Glucose", path: ["urinalysis", "glucose"] },

    { group: "Infectious", label: "Flu", path: ["rapid", "flu"] },
    { group: "Infectious", label: "Strep", path: ["rapid", "strep"] },
    { group: "Other", label: "Guaiac", path: ["rapid", "guaiac"] },
    { group: "Other", label: "HCG", path: ["rapid", "hcg"] },
    { group: "Other", label: "Mono", path: ["rapid", "mono"] },

    { group: "Other", label: "Nursing Notes", path: ["nursingNotes"] },
  ];

  function getNestedValue(obj, path = []) {
    return path.reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, obj);
  }

  function formatSignatureDateTime(value) {
    if (!value) return "—";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);

    return parsed.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getLabTypeLabel(value) {
  switch (value) {
    case "in_house":
      return "In-house";
    case "out_of_house":
      return "Out-of-house";
    case "both":
      return "Both";
    case "not_needed":
      return "No labs";
    default:
      return "Not set";
  }
}

function getLabStatusLabel(value) {
  switch (value) {
    case "pending":
      return "Pending";
    case "collected":
      return "Specimen collected";
    case "unable_to_collect":
      return "Unable to collect";
    case "resulted":
      return "Resulted";
    case "not_needed":
      return "No labs";
    default:
      return "Not started";
  }
}

function formatLabDateTime(value) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


  function hasMeaningfulLabValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  }

  function normalizeLabDate(value) {
    if (!value) return "";

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    const str = String(value).trim();

    const yyyyMmDd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyyMmDd) return str;

    const mmDdYyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmDdYyyy) {
      const [, mm, dd, yyyy] = mmDdYyyy;
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }

    return str;
  }

  function formatLabHeaderDate(dateKey) {
    if (!dateKey) return "Unknown";
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString();
  }

  function normalizeLabName(rawName) {
    const cleaned = String(rawName || "")
      .replace(/\s+/g, " ")
      .trim();

    const map = {
      wbc: "WBC",
      "white blood cell count": "WBC",
      rbc: "RBC",
      hemoglobin: "Hemoglobin",
      hgb: "Hemoglobin",
      hematocrit: "Hematocrit",
      hct: "Hematocrit",
      mcv: "MCV",
      mch: "MCH",
      mchc: "MCHC",
      rdw: "RDW",
      platelets: "Platelets",
      platelet: "Platelets",
      sodium: "Sodium",
      potassium: "Potassium",
      chloride: "Chloride",
      glucose: "Glucose",
      "blood glucose": "Blood Glucose",
      bun: "BUN",
      creatinine: "Creatinine",
      "anion gap": "Anion Gap",
      "ionized calcium": "Ionized Calcium",
      calcium: "Calcium",
      tco2: "TCO2",
      bicarbonate: "TCO2",
      alt: "ALT",
      ast: "AST",
      alkphos: "Alk Phos",
      "alk phos": "Alk Phos",
      bilirubin: "Bilirubin",
      albumin: "Albumin",
      protein: "Protein",
      "total cholesterol": "Total Cholesterol",
      triglycerides: "Triglycerides",
      hdl: "HDL",
      ldl: "LDL",
      "tc / hdl": "TC / HDL",
      "a1c": "A1c",
      "hba1c": "A1c",
      tsh: "TSH",
      hiv: "HIV",
      rpr: "RPR",
      flu: "Flu",
      strep: "Strep",
      guaiac: "Guaiac",
      hcg: "HCG",
      mono: "Mono",
      leukocytes: "Leukocytes",
      nitrite: "Nitrite",
      urobilinogen: "Urobilinogen",
      "specific gravity": "Specific Gravity",
      ketones: "Ketones",
      "urine glucose": "Urine Glucose",
      "urine albumin": "Urine Albumin",
      "urine creatinine": "Urine Creatinine",
      "albumin / creatinine ratio": "Albumin / Creatinine Ratio",
      "albumin/creatinine ratio": "Albumin / Creatinine Ratio",
      "nursing notes": "Nursing Notes",
      "tsh 3rd generation": "TSH",
      "tsh third generation": "TSH",

      "ldl calculated": "LDL",
      "non-hdl cholesterol": "Non-HDL Cholesterol",

      "hemoglobin a1c": "A1c",
      "hgb a1c": "A1c",

      "hiv screen": "HIV",

      "chlamydia trachomatis pcr": "Chlamydia PCR",
      "neisseria gonorrhoeae pcr": "Gonorrhea PCR",
    };

    const key = cleaned.toLowerCase();
    return map[key] || cleaned;
  }

  function inferLabGroup(label, explicitGroup = "") {
    const group = String(explicitGroup || "").trim();
    if (group) {
      if (/cbc/i.test(group)) return "CBC";
      if (/chem|renal|bmp|cmp|electrolyte/i.test(group)) return "Chemistry / Renal";
      if (/liver|hepatic/i.test(group)) return "Liver";
      if (/diabet|a1c|glucose/i.test(group)) return "Diabetes";
      if (/lipid|cholesterol|triglyceride/i.test(group)) return "Lipids";
      if (/thyroid|endocrine/i.test(group)) return "Thyroid / Endocrine";
      if (/infect|std|hiv|rpr|syphilis|hepatitis/i.test(group)) return "Infectious";
      if (/urine|ua|microalbumin/i.test(group)) return "Urine";
      return group;
    }

    const lower = String(label || "").toLowerCase();

    if (/(wbc|rbc|hemoglobin|hematocrit|mcv|mch|mchc|rdw|platelet)/i.test(lower)) return "CBC";
    if (/(sodium|potassium|chloride|bun|creatinine|anion gap|ionized calcium|tco2|calcium)/i.test(lower)) return "Chemistry / Renal";
    if (/(ast|alt|alk phos|bilirubin|albumin)/i.test(lower)) return "Liver";
    if (/(glucose|a1c|hba1c)/i.test(lower)) return "Diabetes";
    if (/(cholesterol|triglycerides|hdl|ldl|tc \/ hdl)/i.test(lower)) return "Lipids";
    if (/(tsh|t4|t3)/i.test(lower)) return "Thyroid / Endocrine";
    if (/(hiv|rpr|syphilis|hepatitis|flu|strep|mono)/i.test(lower)) return "Infectious";
    if (/(urine|leukocytes|nitrite|urobilinogen|specific gravity|ketones|microalbumin|albumin \/ creatinine ratio)/i.test(lower)) return "Urine";

    return "Other";
  }

  function getLabFlag(rawFlag, value) {
    const flag = String(rawFlag || "").trim().toUpperCase();
    if (flag === "H" || flag === "L") return flag;

    const lowerValue = String(value || "").trim().toLowerCase();
    if (lowerValue === "positive" || lowerValue === "detected" || lowerValue === "reactive") {
      return "H";
    }

    return "";
  }

  function isAbnormalFlag(flag) {
    return flag === "H" || flag === "L";
  }

  function getLabFlagClasses(flag) {
    if (flag === "H") return "text-red-700";
    if (flag === "L") return "text-blue-700";
    return "text-slate-900";
  }

  function truncateLabValue(value) {
    const text = String(value ?? "").trim();
    if (!text) return "—";
    if (text.length <= 42) return text;
    return `${text.slice(0, 42)}…`;
  }

  function flattenInHouseLabs(encounter) {
    const inHouseLabs = encounter?.inHouseLabs || {};
    const dateKey = normalizeLabDate(encounter?.clinicDate || encounter?.createdAt);

    return IN_HOUSE_LAB_CONFIG
      .map((config) => {
        const rawEntry = getNestedValue(inHouseLabs, config.path);
        if (!hasMeaningfulLabValue(rawEntry)) return null;

        const entry =
          rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
            ? rawEntry
            : { value: rawEntry, flag: "", referenceRange: "" };

        if (!hasMeaningfulLabValue(entry.value)) return null;

        const label = normalizeLabName(config.label);
        const [sectionKey, fieldKey] = config.path;
        const autoReference = getInHouseReference(sectionKey, fieldKey);
        const autoFlag = getAutomaticInHouseFlag(sectionKey, fieldKey, entry.value);

        return {
          analyte: label,
          group: config.group || inferLabGroup(label),
          dateKey,
          value: entry.value,
          valueText: truncateLabValue(entry.value),
          fullValueText: String(entry.value ?? "").trim(),
          unitText: "",
          sourceLabel: "In-house",
          flag: autoFlag,
          referenceRange: autoReference,
        };
      })
      .filter(Boolean);
  }

  function flattenImportedLabs(encounter) {
    const importedLabs = Array.isArray(encounter?.importedSendOutLabs)
      ? encounter.importedSendOutLabs
      : [];

    return importedLabs
      .map((lab) => {
        const rawValue = lab?.value;
        if (!hasMeaningfulLabValue(rawValue)) return null;

        const analyte = normalizeLabName(
          lab?.displayName || lab?.normalizedName || lab?.key || "Lab"
        );

        const dateKey = normalizeLabDate(
          lab?.collectionDate ||
          lab?.collectedAt ||
          lab?.date ||
          encounter?.clinicDate ||
          encounter?.createdAt
        );

        return {
          analyte,
          group: inferLabGroup(analyte, lab?.group),
          dateKey,
          value: rawValue,
          valueText: truncateLabValue(rawValue),
          fullValueText: String(rawValue ?? "").trim(),
          unitText: String(lab?.units || lab?.unit || "").trim(),
          sourceLabel: "Outside",
          flag: String(
            lab?.resultSymbol ||
            lab?.flag ||
            lab?.abnormalFlag ||
            lab?.hlFlag ||
            ""
          ).trim(),
          referenceRange: String(
            lab?.referenceRangeText ||
            lab?.referenceRange ||
            lab?.reference_range ||
            lab?.range ||
            lab?.normalRange ||
            lab?.expectedRange ||
            ""
          ).trim(),
        };
      })
      .filter(Boolean);
  }

  function buildLongitudinalLabData(encounters = []) {
    const allResults = encounters.flatMap((encounter) => [
      ...flattenInHouseLabs(encounter),
      ...flattenImportedLabs(encounter),
    ]);

    const dateKeys = [...new Set(allResults.map((result) => result.dateKey).filter(Boolean))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const rowsByAnalyte = new Map();
    let abnormalCount = 0;

    allResults.forEach((result) => {
      if (isAbnormalFlag(result.flag)) abnormalCount += 1;

      if (!rowsByAnalyte.has(result.analyte)) {
        rowsByAnalyte.set(result.analyte, {
          analyte: result.analyte,
          group: result.group || "Other",
          valuesByDate: {},
          abnormal: false,
        });
      }

      const row = rowsByAnalyte.get(result.analyte);

      if (!row.valuesByDate[result.dateKey]) {
        row.valuesByDate[result.dateKey] = [];
      }

      row.valuesByDate[result.dateKey].push(result);

      if (isAbnormalFlag(result.flag)) {
        row.abnormal = true;
      }
    });

    const groupedRows = LAB_GROUP_ORDER.map((group) => ({
      group,
      rows: [...rowsByAnalyte.values()]
        .filter((row) => row.group === group)
        .sort((a, b) => a.analyte.localeCompare(b.analyte)),
    })).filter((groupBlock) => groupBlock.rows.length > 0);

    return {
      dateKeys,
      groupedRows,
      abnormalCount,
    };
  }

  function renderTrendArrow(direction) {
    if (direction === "up") return "↑";
    if (direction === "down") return "↓";
    if (direction === "same") return "→";
    return "—";
  }

  function getBpCategory(bp) {
    const parsed = getBpNumbers(bp);
    if (!parsed) return null;

    const { systolic, diastolic } = parsed;

    if (systolic < 120 && diastolic < 80) return "green";
    if (systolic < 140 && diastolic < 90) return "yellow";
    return "red";
  }

  function getHrCategory(hr) {
    const value = getNumericValue(hr);
    if (value === null) return null;

    if (value < 60 || value > 100) return "red";
    return "green";
  }

  function getSpo2Category(spo2) {
    const value = getNumericValue(spo2);
    if (value === null) return null;

    if (value < 94) return "red";
    return "green";
  }

  function getColorClasses(category) {
    switch (category) {
      case "green":
        return "text-green-700";
      case "yellow":
        return "text-yellow-700";
      case "red":
        return "text-red-700";
      default:
        return "text-slate-800";
    }
  }

  function formatSoapStatus(status) {
    switch (status) {
      case "draft":
        return { label: "Draft", color: "bg-slate-200 text-slate-700" };
      case "awaiting_upper":
        return { label: "Awaiting Upper Level", color: "bg-yellow-100 text-yellow-800" };
      case "awaiting_attending":
        return { label: "Awaiting Attending", color: "bg-blue-100 text-blue-800" };
      case "signed":
        return { label: "Fully Signed", color: "bg-green-100 text-green-800" };
      default:
        return { label: status || "Unknown", color: "bg-slate-200 text-slate-700" };
    }
  }

  function getSpecialtyTypeLabel(type) {
    switch (type) {
      case "pt":
        return "Physical Therapy";
      case "dermatology":
        return "Dermatology";
      case "mental_health":
        return "Mental Health";
      case "addiction":
        return "Addiction Medicine";
      default:
        return type || "Specialty";
    }
  }

  function getVisitTypeLabel(visitType) {
  switch (visitType) {
    case "specialty_only":
    case "specialty":
      return "Specialty";
    case "both":
      return "General + Specialty";
    default:
      return "General";
  }
}





  function normalizeAssignmentName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function getAssignmentPersonName(person) {
    if (!person) return "";

    if (typeof person === "string") {
      return profileNameMap?.[person] || person;
    }

    return (
      person.fullName ||
      person.full_name ||
      person.displayName ||
      person.display_name ||
      person.name ||
      profileNameMap?.[person.id] ||
      profileNameMap?.[person.user_id] ||
      person.email ||
      ""
    );
  }

  function activeAssignmentNameSet(list) {
    const set = new Set();

    (list || []).forEach((person) => {
      const displayName = getAssignmentPersonName(person);
      if (displayName) set.add(normalizeAssignmentName(displayName));

      if (person?.id && profileNameMap?.[person.id]) {
        set.add(normalizeAssignmentName(profileNameMap[person.id]));
      }

      if (person?.user_id && profileNameMap?.[person.user_id]) {
        set.add(normalizeAssignmentName(profileNameMap[person.user_id]));
      }
    });

    return set;
  }

  function mergeActiveAssignmentOptions(options, activeList) {
    const names = new Set((options || []).filter(Boolean));

    (activeList || []).forEach((person) => {
      const displayName = getAssignmentPersonName(person);
      if (displayName) names.add(displayName);
    });

    return [...names];
  }

  function sortActiveAssignmentsFirst(options, activeSet) {
    return [...(options || [])].sort((a, b) => {
      const aActive = activeSet.has(normalizeAssignmentName(a));
      const bActive = activeSet.has(normalizeAssignmentName(b));

      if (aActive !== bActive) return aActive ? -1 : 1;
      return String(a).localeCompare(String(b));
    });
  }

  const [showTimeline, setShowTimeline] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showSendOutLabs, setShowSendOutLabs] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedAttendingId, setSelectedAttendingId] = useState("");
  const [openAssignmentMenu, setOpenAssignmentMenu] = useState(null);
  const [attendingPin, setAttendingPin] = useState("");
  const [chiefComplaintDraft, setChiefComplaintDraft] = useState("");
  const [labFilter, setLabFilter] = useState("all");
  const rapidResultOptions = [
    { value: "", label: "—" },
    { value: "positive", label: "Positive" },
    { value: "negative", label: "Negative" },
  ];

  const hivOptions = [
    { value: "", label: "—" },
    { value: "negative", label: "Negative" },
    { value: "positive", label: "Positive" },
    { value: "indeterminate", label: "Indeterminate" },
  ];

  const uaOptions = {
    leukocytes: ["", "Neg", "Trace", "Small", "Mod", "Large"],
    nitrite: ["", "Neg", "Positive"],
    urobilinogen: ["", "0.2", "1", "2", "4", "8"],
    protein: ["", "Neg", "Trace", "30", "100", "800", ">2000"],
    ph: ["", "5.0", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5"],
    blood: ["", "Neg", "Trace", "Small", "Mod", "Large"],
    specificGravity: ["", "1.000", "1.005", "1.010", "1.015", "1.020", "1.025", "1.030"],
    ketones: ["", "Neg", "Trace/5", "Small/15", "Mod/40", "Large/80", "Very Large/160"],
    bilirubin: ["", "Neg", "Small", "Mod", "Large"],
    glucose: ["", "Neg", "100", "250", "500", "1000", ">2000"],
  };

  const inHouseReferenceRanges = {
    istat: {
      na: "138-146 mEq/L",
      k: "3.5-4.9 mEq/L",
      cl: "98-109 mEq/L",
      iCa: "1.2-1.32 mEq/L",
      glucose: "Fast: 70-110 | 2-h post: <120",
      tco2: "",
      bun: "8-26 mg/dL",
      creatinine: "0.6-1.3 mg/dL",
      hct: "M: 41-53% | F: 36-46%",
      hgb: "M: >14 mg/dL | F: >12 mg/dL",
      anGap: "",
    },
    core: {
      bloodGlucose: "",
      a1c: "",
      hiv: "",
    },
    microalbumin: {
      albumin: "",
      creatinine: "",
      acRatio: "",
    },
    lipids: {
      totalCholesterol: "N: <200",
      triglycerides: "N: <150",
      hdl: "N: >40",
      ldl: "N: <130",
      tcHdl: "",
    },
    rapid: {
      flu: "",
      strep: "",
      guaiac: "",
      hcg: "",
      mono: "",
    },
  };

  function getInHouseReference(sectionKey, fieldKey) {
    return inHouseReferenceRanges?.[sectionKey]?.[fieldKey] || "";
  }

  function parseNumeric(value) {
    const n = Number(String(value ?? "").trim());
    return Number.isFinite(n) ? n : null;
  }

  function getAutomaticInHouseFlag(sectionKey, fieldKey, value) {
    const text = String(value ?? "").trim();
    if (!text) return "";

    const lower = text.toLowerCase();

    if (
      lower === "positive" ||
      lower === "detected" ||
      lower === "reactive" ||
      lower === "+"
    ) {
      return "H";
    }

    if (
      lower === "negative" ||
      lower === "non-reactive" ||
      lower === "not detected" ||
      lower === "-"
    ) {
      return "";
    }

    const numeric = parseNumeric(text);
    if (numeric === null) return "";

    if (sectionKey === "istat") {
      switch (fieldKey) {
        case "na":
          return numeric < 138 ? "L" : numeric > 146 ? "H" : "";
        case "k":
          return numeric < 3.5 ? "L" : numeric > 4.9 ? "H" : "";
        case "cl":
          return numeric < 98 ? "L" : numeric > 109 ? "H" : "";
        case "iCa":
          return numeric < 1.2 ? "L" : numeric > 1.32 ? "H" : "";
        case "glucose":
          return numeric < 70 ? "L" : numeric > 110 ? "H" : "";
        case "bun":
          return numeric < 8 ? "L" : numeric > 26 ? "H" : "";
        case "creatinine":
          return numeric < 0.6 ? "L" : numeric > 1.3 ? "H" : "";
        default:
          return "";
      }
    }

    if (sectionKey === "lipids") {
      switch (fieldKey) {
        case "totalCholesterol":
          return numeric >= 200 ? "H" : "";
        case "triglycerides":
          return numeric >= 150 ? "H" : "";
        case "hdl":
          return numeric <= 40 ? "L" : "";
        case "ldl":
          return numeric >= 130 ? "H" : "";
        default:
          return "";
      }
    }

    return "";
  }


  function normalizeInHouseLabEntry(entry) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return {
        value: entry.value ?? "",
        flag: entry.flag ?? "",
        referenceRange: entry.referenceRange ?? "",
      };
    }

    return {
      value: entry ?? "",
      flag: "",
      referenceRange: "",
    };
  }

  function calculateACRatio(albumin, creatinine) {
    const a = Number(albumin);
    const c = Number(creatinine);

    if (!a || !c) return "";

    // avoid divide by zero + bad values
    if (!Number.isFinite(a) || !Number.isFinite(c) || c === 0) return "";

    return (a / c).toFixed(2);
  }

  function calculateTCHDLRatio(totalCholesterol, hdl) {
    const tc = Number(totalCholesterol);
    const goodHdl = Number(hdl);

    if (!tc || !goodHdl) return "";
    if (!Number.isFinite(tc) || !Number.isFinite(goodHdl) || goodHdl === 0) return "";

    return (tc / goodHdl).toFixed(2);
  }

  function updateInHouseLabSection(sectionKey, fieldKey, patch) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};
    const currentEntry = normalizeInHouseLabEntry(currentLabs?.[sectionKey]?.[fieldKey]);

    const nextLabs = {
      ...currentLabs,
      [sectionKey]: {
        ...(currentLabs[sectionKey] || {}),
        [fieldKey]: {
          ...currentEntry,
          ...patch,
        },
      },
    };

    updateEncounterField("inHouseLabs", nextLabs);
    return nextLabs;
  }

  function updateInHouseNestedLabSection(sectionKey, subsectionKey, fieldKey, patch) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};
    const currentSection = currentLabs[sectionKey] || {};
    const currentEntry = normalizeInHouseLabEntry(
      currentSection?.[subsectionKey]?.[fieldKey]
    );

    const nextLabs = {
      ...currentLabs,
      [sectionKey]: {
        ...currentSection,
        [subsectionKey]: {
          ...(currentSection[subsectionKey] || {}),
          [fieldKey]: {
            ...currentEntry,
            ...patch,
          },
        },
      },
    };

    updateEncounterField("inHouseLabs", nextLabs);
    return nextLabs;
  }

  function updateInHouseLabRoot(fieldKey, value) {
    const currentLabs = selectedEncounter?.inHouseLabs || {};

    const nextLabs = {
      ...currentLabs,
      [fieldKey]: value,
    };

    updateEncounterField("inHouseLabs", nextLabs);
  }

  async function persistInHouseLabs(nextLabs = null) {
    if (!selectedEncounter) return;
    await saveInHouseLabs(nextLabs || selectedEncounter?.inHouseLabs || {});
  }



  async function handleExportEncounterPdf() {
    if (!selectedPatient || !selectedEncounter) return;

    await downloadEncounterPdf({
      patient: selectedPatient,
      encounter: selectedEncounter,
      sortedMedications,
      logoSrc: logo,
      getFullPatientName,
      soapAuthorName,
      upperLevelSignerName,
      attendingSignerName,
    });
  }

  if (!selectedPatient) return null;

  const sortedEncounters = [...selectedPatient.encounters].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.clinicDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.clinicDate || 0).getTime();
    return bTime - aTime;
  });

  const longitudinalLabData = useMemo(() => {
    return buildLongitudinalLabData(sortedEncounters);
  }, [sortedEncounters]);

  const approvedRefillHistory = (refillRequests || [])
    .filter((req) => {
      const status = String(req.status || "").toLowerCase();
      return (
        String(req.patient_id) === String(selectedPatient?.id) &&
        status === "approved"
      );
    })
    .sort((a, b) => {
      const aTime = new Date(a.approved_at || a.created_at || 0).getTime();
      const bTime = new Date(b.approved_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });



  const legacySendOutLabs = selectedEncounter?.sendOutLabs || {};
  const importedSendOutLabs = Array.isArray(selectedEncounter?.importedSendOutLabs)
    ? selectedEncounter.importedSendOutLabs
    : [];
  const isSoapLocked = selectedEncounter?.soapStatus === "signed";
  const isSupportDataLocked = false;
  const clinicAlert = getClinicAlert(new Date());
  const vitalsHistory = selectedEncounter?.vitalsHistory || [];
  const latestVitals = vitalsHistory[0] || null;
  const previousVitals = vitalsHistory[1] || null;

  const latestBp = getBpNumbers(latestVitals?.bp);
  const previousBp = getBpNumbers(previousVitals?.bp);

  const latestHr = getNumericValue(latestVitals?.hr);
  const previousHr = getNumericValue(previousVitals?.hr);

  const latestWeight = getNumericValue(latestVitals?.weight);
  const previousWeight = getNumericValue(previousVitals?.weight);

  const latestPain = getNumericValue(latestVitals?.pain);
  const previousPain = getNumericValue(previousVitals?.pain);

  const bpTrend =
    latestBp && previousBp
      ? {
        systolic: getTrendDirection(latestBp.systolic, previousBp.systolic),
        diastolic: getTrendDirection(latestBp.diastolic, previousBp.diastolic),
      }
      : null;

  const hrTrend = getTrendDirection(latestHr, previousHr);
  const weightTrend = getTrendDirection(latestWeight, previousWeight);
  const painTrend = getTrendDirection(latestPain, previousPain);
  const bpCategory = getBpCategory(latestVitals?.bp);
  const hrCategory = getHrCategory(latestVitals?.hr);
  const spo2Category = getSpo2Category(latestVitals?.spo2);
  const isSpecialtyVisit =
    selectedEncounter?.visitType === "specialty_only" ||
    selectedEncounter?.visitType === "both";
  const soapStatusInfo = formatSoapStatus(soapStatus);
  const activeStudentNames = activeAssignmentNameSet(activeStudents);
  const activeUpperLevelNames = activeAssignmentNameSet(activeUpperLevels);

  const sortedStudentNameOptions = sortActiveAssignmentsFirst(
    mergeActiveAssignmentOptions(studentNameOptions, activeStudents),
    activeStudentNames
  );

  const sortedUpperLevelNameOptions = sortActiveAssignmentsFirst(
    mergeActiveAssignmentOptions(upperLevelNameOptions, activeUpperLevels),
    activeUpperLevelNames
  );

  const normalizedAssignedStudent = String(assignmentForm.studentName || "").trim().toLowerCase();
  const normalizedAssignedUpperLevel = String(assignmentForm.upperLevelName || "").trim().toLowerCase();

  const canShowSkipUpperControls =
    isLeadershipView &&
    selectedEncounter?.soapStatus !== "awaiting_attending" &&
    selectedEncounter?.soapStatus !== "signed";

  function roomMatchesCurrentAssignment(room) {
    const roomStudents = (room.assignedStudentsInRoom || []).map((name) =>
      String(name || "").trim().toLowerCase()
    );
    const roomUpperLevels = (room.assignedUpperLevelsInRoom || []).map((name) =>
      String(name || "").trim().toLowerCase()
    );

    if (normalizedAssignedStudent && roomStudents.includes(normalizedAssignedStudent)) {
      return true;
    }

    if (
      !normalizedAssignedStudent &&
      normalizedAssignedUpperLevel &&
      roomUpperLevels.includes(normalizedAssignedUpperLevel)
    ) {
      return true;
    }

    return false;
  }

  function getRoomUsageLabel(room) {
    if (!room?.occupied) {
      return {
        dot: "bg-green-500",
        badge: "bg-green-100 text-green-700",
        text: "Available",
        helper: "",
      };
    }

    if (roomMatchesCurrentAssignment(room)) {
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700",
        text: "Same Student/Provider",
        helper: "This room is already being used by this same student/provider.",
      };
    }

    return {
      dot: "bg-red-500",
      badge: "bg-red-100 text-red-700",
      text: "Different Student/Provider",
      helper: room.occupiedBy
        ? `Currently in use by ${room.occupiedBy}`
        : "Currently in use",
    };
  }

  function getRoomOptionDisplay(room) {
  const roomUsage = getRoomUsageLabel(room);

  if (!room?.occupied) {
    return {
      label: "🟢 Available",
      optionClass: "bg-green-50 text-green-900",
      selectClass: "border-green-300 bg-green-50 text-green-900",
    };
  }

  if (roomMatchesCurrentAssignment(room)) {
    return {
      label: "🔵 Same Student/Provider",
      optionClass: "bg-blue-50 text-blue-900",
      selectClass: "border-blue-300 bg-blue-50 text-blue-900",
    };
  }

  return {
    label: room.occupiedBy ? `🔴 In Use - ${room.occupiedBy}` : "🔴 In Use",
    optionClass: "bg-red-50 text-red-900",
    selectClass: "border-red-300 bg-red-50 text-red-900",
  };
}

function getSelectedRoomOptionClass() {
  const selectedRoom = ROOM_OPTIONS.find(
    (room) => String(room.number) === String(assignmentForm.roomNumber)
  );

  if (!selectedRoom) return "border-slate-300 bg-white text-slate-900";

  return getRoomOptionDisplay(selectedRoom).selectClass;
}

  const specialtyBadgeText = isSpecialtyVisit
    ? `${getVisitTypeLabel(selectedEncounter?.visitType)}${selectedEncounter?.specialtyType
      ? ` • ${getSpecialtyTypeLabel(selectedEncounter.specialtyType)}`
      : ""
    }`
    : "";

  useEffect(() => {
    setChiefComplaintDraft(selectedEncounter?.chiefComplaint || "");
  }, [selectedEncounter?.id, selectedEncounter?.chiefComplaint]);

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <button
        onClick={() => setActiveView("dashboard")}
        className="text-blue-600 hover:underline"
      >
        ← Back to Patients
      </button>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Patient Snapshot
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-slate-800">
                {getFullPatientName(selectedPatient)}
              </p>
              <p className="text-sm text-slate-500">
                MRN: {selectedPatient.mrn || "—"}
              </p>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>DOB: {selectedPatient.dob ? formatDate(selectedPatient.dob) : "—"}</p>
              <p>Age: {selectedPatient.age || "—"}</p>
              <p>Phone: {selectedPatient.phone || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Visit Snapshot
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                Allergies: {(selectedPatient.allergyList || []).length > 0
                  ? `${selectedPatient.allergyList.filter((a) => a.isActive).length} active`
                  : "None listed"}
              </p>
              <p>Active meds: {activeMedicationCount}</p>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>
                Current visit: {selectedEncounter?.clinicDate ? formatDate(selectedEncounter.clinicDate) : "—"}
              </p>
              <p>Last visit: {lastVisitLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {isLeadershipView && (
          <button
            onClick={openEditIntake}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
          >
            Edit Intake
          </button>
        )}

        {(isLeadershipView || selectedPatient) && (
          <button
            onClick={openPatientEditModal}
            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Edit Patient Info
          </button>
        )}

        {canStartEncounter ? (
          <button
            onClick={startNewEncounter}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Start New Encounter
          </button>
        ) : null}
      </div>

      {specialtyBadgeText && (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
    <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
      Visit Type
    </span>

    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
      {specialtyBadgeText}
    </span>
  </div>
)}
      <div className="grid grid-cols-1 gap-4">

        <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
          <button
            onClick={() => setShowTimeline((prev) => !prev)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-lg font-semibold text-slate-900 hover:bg-slate-100"
          >
            Visit Timeline
            <span>{showTimeline ? "▲" : "▼"}</span>
          </button>

          {showTimeline && (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 lg:max-h-[560px]">
              {sortedEncounters.map((encounter, index) => (
                <button
                  key={encounter.id}
                  onClick={() => openPatientChart(selectedPatient.id, encounter.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${selectedEncounterId === encounter.id
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-500" />

                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">
                          Encounter #{selectedPatient.encounters.length - index}
                        </p>

                        <p className="text-sm text-slate-500">
                          {normalizeClinicDate
                            ? normalizeClinicDate(encounter.clinicDate)
                            : encounter.clinicDate}
                        </p>

                        <p className="text-sm text-slate-700">
                          {encounter.chiefComplaint || "No chief complaint recorded"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {encounter.visitLocation || "—"} • {encounter.newReturning || "—"}
                        </p>

                        <p className="text-xs font-medium text-slate-700">
                          {getVisitTypeLabel(encounter.visitType)}
                          {encounter.specialtyType
                            ? ` • ${getSpecialtyTypeLabel(encounter.specialtyType)}`
                            : ""}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>Room: {encounter.roomNumber || "—"}</span>
                          <span>Student: {encounter.assignedStudent || "—"}</span>
                          <span>Vitals: {encounter.vitalsHistory?.length || 0}</span>
                          <span>SOAP saved: {encounter.soapSavedAt || "Not yet"}</span>
                        </div>
                      </div>

                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`inline-block rounded-full border px-3 py-1 text-xs ${getStatusClasses(encounter.status)}`}
                      >
                        {getStatusLabel(encounter.status, encounter.soapStatus)}
                      </span>

                      {canStartEncounter ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEncounter(encounter.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteEncounter(encounter.id);
                            }
                          }}
                          className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer"
                        >
                          Delete Encounter
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>


      </div>

      {selectedEncounter && (
        <>
          <div className="flex flex-wrap gap-2">
            {newReturningBadge?.(selectedEncounter)}
            {dualVisitBadge?.(selectedEncounter)}
            {selectedEncounter.dailyNumber && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                #{selectedEncounter.dailyNumber}
              </span>
            )}
            {priorityBadge(selectedEncounter)}
            {spanishBadge(selectedEncounter)}
            {diabetesBadge?.(selectedEncounter)}
            {fluBadge?.(selectedEncounter)}
            {elevatorBadge?.(selectedEncounter)}
            {papBadge?.(selectedEncounter)}
            {pharmacyStatusBadge?.(selectedEncounter)}
          </div>

          <div
            className={`grid gap-4 xl:gap-6 ${isLeadershipView ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
              }`}
          >
            <div className="rounded-2xl bg-white p-4 shadow">
              <h3 className="mb-4 text-lg font-semibold">Encounter Details</h3>

              <div className="space-y-3 text-sm">

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Chief Complaint
                  </label>
                  <input
                    type="text"
                    value={chiefComplaintDraft}
                    onChange={(e) => {
                      if (isSupportDataLocked) return;
                      setChiefComplaintDraft(e.target.value);
                    }}
                    onBlur={async (e) => {
                      if (isSupportDataLocked) return;

                      const nextValue = e.target.value;
                      updateEncounterField("chiefComplaint", nextValue);
                      await saveEncounterField("chiefComplaint", nextValue);
                    }}
                    disabled={isSupportDataLocked}
                    className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Encounter Status
                    </p>
                    <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs ${getStatusClasses(selectedEncounter.status)}`}>
                      {getStatusLabel(selectedEncounter.status, selectedEncounter.soapStatus)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      SOAP Status
                    </p>
                    <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${soapStatusInfo.color}`}>
                      {soapStatusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isLeadershipView && selectedEncounter?.visitType !== "specialty_only" && (
              <div className="rounded-2xl bg-white p-4 shadow">
                <h3 className="mb-4 text-lg font-semibold">
                  Leadership Assignment
                </h3>

                <p className="text-xs text-blue-600">
                  Showing users signed in today
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Medical Student
                    </label>

                    <p className="mb-2 text-xs text-slate-500">
                      Active Today: {activeStudents?.length || 0}
                    </p>

                    <div className="relative">
                      <input
                        className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base ${
                          activeStudentNames.has(normalizeAssignmentName(assignmentForm.studentName))
                            ? "border-green-500 bg-green-50 font-semibold text-green-800"
                            : "border-slate-300"
                        }`}
                        value={assignmentForm.studentName}
                        onChange={(e) => {
                          setAssignmentForm((prev) => ({
                            ...prev,
                            studentName: e.target.value,
                          }));
                          setOpenAssignmentMenu("chart-student");
                        }}
                        onFocus={() => setOpenAssignmentMenu("chart-student")}
                        onBlur={() => {
                          setTimeout(() => setOpenAssignmentMenu(null), 150);
                        }}
                        placeholder="Type or select medical student"
                      />

                      {openAssignmentMenu === "chart-student" && (
                        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                          {sortedStudentNameOptions.length > 0 ? (
                            sortedStudentNameOptions.map((name) => {
                              const isActive = activeStudentNames.has(normalizeAssignmentName(name));
                              const isSelected =
                                normalizeAssignmentName(assignmentForm.studentName) ===
                                normalizeAssignmentName(name);
                              const isAssigned =
                                assignedStudentNames?.has(name) &&
                                assignmentForm.studentName !== name;

                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setAssignmentForm((prev) => ({
                                      ...prev,
                                      studentName: name,
                                    }));
                                    setOpenAssignmentMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                    isSelected
                                      ? "bg-blue-50 font-semibold text-blue-700"
                                      : isActive
                                        ? "bg-green-50 font-semibold text-green-800"
                                        : "text-slate-700"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                        isActive ? "bg-green-500" : "bg-slate-300"
                                      }`}
                                    />
                                    <span className="truncate">
                                      {isAssigned ? `${name} (Assigned)` : name}
                                    </span>
                                  </span>

                                  {isActive && (
                                    <span className="shrink-0 text-[11px] font-medium text-green-700">
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              No saved student options. You can still type a name manually.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Upper Level
                    </label>

                    <p className="mb-2 text-xs text-slate-500">
                      Active Today: {activeUpperLevels?.length || 0}
                    </p>

                    <div className="relative">
                      <input
                        className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base ${
                          activeUpperLevelNames.has(normalizeAssignmentName(assignmentForm.upperLevelName))
                            ? "border-green-500 bg-green-50 font-semibold text-green-800"
                            : "border-slate-300"
                        }`}
                        value={assignmentForm.upperLevelName}
                        onChange={(e) => {
                          setAssignmentForm((prev) => ({
                            ...prev,
                            upperLevelName: e.target.value,
                          }));
                          setOpenAssignmentMenu("chart-upper");
                        }}
                        onFocus={() => setOpenAssignmentMenu("chart-upper")}
                        onBlur={() => {
                          setTimeout(() => setOpenAssignmentMenu(null), 150);
                        }}
                        placeholder="Type or select upper level"
                      />

                      {openAssignmentMenu === "chart-upper" && (
                        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                          {sortedUpperLevelNameOptions.length > 0 ? (
                            sortedUpperLevelNameOptions.map((name) => {
                              const isActive = activeUpperLevelNames.has(normalizeAssignmentName(name));
                              const isSelected =
                                normalizeAssignmentName(assignmentForm.upperLevelName) ===
                                normalizeAssignmentName(name);

                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setAssignmentForm((prev) => ({
                                      ...prev,
                                      upperLevelName: name,
                                    }));
                                    setOpenAssignmentMenu(null);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                    isSelected
                                      ? "bg-blue-50 font-semibold text-blue-700"
                                      : isActive
                                        ? "bg-green-50 font-semibold text-green-800"
                                        : "text-slate-700"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                        isActive ? "bg-green-500" : "bg-slate-300"
                                      }`}
                                    />
                                    <span className="truncate">{name}</span>
                                  </span>

                                  {isActive && (
                                    <span className="shrink-0 text-[11px] font-medium text-green-700">
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              No saved upper-level options. You can still type a name manually.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Room
                      </label>

                      {(() => {
                        const selectedRoom = ROOM_OPTIONS.find(
                          (room) => String(room.number) === String(assignmentForm.roomNumber)
                        );

                        if (!selectedRoom) return null;

                        const roomUsage = getRoomUsageLabel(selectedRoom);

                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${roomUsage.dot}`}
                            />

                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${roomUsage.badge}`}
                            >
                              {roomUsage.text}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <select
  value={assignmentForm.roomNumber}
  onChange={(e) =>
    setAssignmentForm((prev) => ({
      ...prev,
      roomNumber: e.target.value,
    }))
  }
  className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm font-medium sm:text-base ${getSelectedRoomOptionClass()}`}
>
  <option value="">Select room</option>
  {ROOM_OPTIONS.map((room) => {
    const roomDisplay = getRoomOptionDisplay(room);

    return (
      <option
        key={room.number}
        value={room.number}
        className={roomDisplay.optionClass}
      >
        {room.displayLabel || `${room.label} — ${room.area}`} ({roomDisplay.label})
      </option>
    );
  })}
</select>

                    {(() => {
                      const selectedRoom = ROOM_OPTIONS.find(
                        (room) => String(room.number) === String(assignmentForm.roomNumber)
                      );

                      if (!selectedRoom) return null;

                      const roomUsage = getRoomUsageLabel(selectedRoom);

                      if (!selectedRoom.occupied) return null;

                      return (
                        <div className="mt-1 space-y-1 text-right">
                          <p className="text-xs text-slate-500">
                            {roomUsage.helper}
                          </p>

                          {selectedRoom.activeEncounterCount > 1 ? (
                            <p className="text-xs text-slate-400">
                              {selectedRoom.activeEncounterCount} active encounters in this room
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  {isPapRestricted(selectedEncounter) && (
                    <p className="text-sm text-red-600">
                      Pap smear patients cannot be placed in Room 9 or Room 10.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      onClick={assignEncounter}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {leadershipActionLocked ? "Saving..." : "Assign / Start Visit"}
                    </button>

                    <button
                      onClick={clearEncounterRoom}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Complete Visit / Free Room
                    </button>

                    <button
                      onClick={() => updateEncounterStatus("ready")}
                      disabled={leadershipActionLocked}
                      className="rounded-lg bg-yellow-500 px-4 py-3 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Return to Ready
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Active Treatment
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">Medications</h3>
                </div>

                <button
                  onClick={() => {
                    setEditingMedicationId(null);
                    setNewMedication(EMPTY_MEDICATION);
                    setShowMedicationModal(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  + Add Medication
                </button>
              </div>

              <div
                className={`space-y-3 ${sortedMedications.length > 6
                  ? "max-h-[320px] overflow-y-auto pr-1"
                  : ""
                  }`}
              >
                {sortedMedications.length > 0 ? (
                  sortedMedications.map((med) => (
                    <div
                      key={med.id}
                      className={`rounded-xl border p-3 ${med.isActive
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">{med.name || "—"}</p>

                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${med.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                              }`}>
                              {med.isActive ? "Active" : "Inactive"}
                            </span>

                            {med.lastUpdatedEncounterId === selectedEncounter?.id && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                Updated This Visit
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dose</span>
                              <span className="mt-1 block font-medium text-slate-800">{med.dosage || "—"}</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Frequency</span>
                              <span className="mt-1 block font-medium text-slate-800">{med.frequency || "—"}</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Route</span>
                              <span className="mt-1 block font-medium text-slate-800">{med.route || "—"}</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dispense</span>
                              <span className="mt-1 block font-medium text-slate-800">{med.dispenseAmount || "—"}</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Refills</span>
                              <span className="mt-1 block font-medium text-slate-800">{med.refillCount ?? "0"}</span>
                            </div>
                          </div>

                          {med.instructions ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Instructions</span>
                              <span className="mt-1 block">{med.instructions}</span>
                            </div>
                          ) : null}

                          {(() => {
                            const supply = getMedicationSupplyInfo(med);

                            if (!supply.daysUntilRefill) return null;

                            return (
                              <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="block font-semibold text-slate-500">Days Until Refill</span>
                                  <span className="mt-1 block text-slate-700">{supply.daysUntilRefill}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="block font-semibold text-slate-500">Refill Due</span>
                                  <span className="mt-1 block text-slate-700">{supply.refillDueDate}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="block font-semibold text-slate-500">Total Coverage</span>
                                  <span className="mt-1 block text-slate-700">{supply.totalDaysCovered} days</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="block font-semibold text-slate-500">Estimated Runout</span>
                                  <span className="mt-1 block text-slate-700">{supply.runoutDate}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-1">
                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              toggleMedicationActive(med.id);
                            }}
                            className={`rounded-lg px-4 py-2.5 text-sm font-medium ${med.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                              }`}
                          >
                            {med.isActive ? "Mark Inactive" : "Mark Active"}
                          </button>

                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              startEditMedication(med);
                            }}
                            className="rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              deleteMedication(med.id);
                            }}
                            className="rounded-lg bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700"
                          >
                            Delete
                          </button>

                          {canRefill && (
                            <button
                              onClick={() => {
                                if (isSupportDataLocked) return;
                                onStartRefillRequest(med);
                              }}
                              className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white"
                            >
                              Refill
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No medications added yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medication Changes</p>
                <h4 className="text-sm font-semibold text-slate-800">Refill History</h4>
              </div>

              {approvedRefillHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {approvedRefillHistory.map((req) => {
                    const medication = (selectedPatient.medicationList || []).find(
                      (med) => String(med.id) === String(req.medication_id)
                    );

                    const approvedPayload = req.request_payload || null;
                    const approvedMedication = approvedPayload
                      ? {
                        name: approvedPayload.name || medication?.name || "",
                        dosage: approvedPayload.dosage || medication?.dosage || "",
                        frequency: approvedPayload.frequency || medication?.frequency || "",
                        route: approvedPayload.route || medication?.route || "",
                        dispenseAmount:
                          approvedPayload.dispenseAmount ?? medication?.dispenseAmount ?? "",
                        refillCount:
                          approvedPayload.refillCount ?? medication?.refillCount ?? "",
                        instructions:
                          approvedPayload.instructions || medication?.instructions || "",
                      }
                      : medication;

                    return (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {approvedMedication?.name || "Medication"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Approved: {req.approved_at ? formatDate(req.approved_at) : "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Approved by: {profileNameMap?.[req.approved_by] || "Unknown User"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Requested by: {profileNameMap?.[req.requested_by] || "Unknown User"}
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
                          <div>Dosage: {approvedMedication?.dosage || "—"}</div>
                          <div>Frequency: {approvedMedication?.frequency || "—"}</div>
                          <div>Route: {approvedMedication?.route || "—"}</div>
                          <div>Dispense: {approvedMedication?.dispenseAmount || "—"}</div>
                          <div>Refills: {approvedMedication?.refillCount ?? "—"}</div>
                          {(() => {
                            const supply = getMedicationSupplyInfo(approvedMedication);

                            if (!supply.daysUntilRefill) return null;

                            return (
                              <>
                                <div>Days Until Refill: {supply.daysUntilRefill}</div>
                                <div>Total Coverage: {supply.totalDaysCovered} days</div>
                                <div>Estimated Runout: {supply.runoutDate}</div>
                              </>
                            );
                          })()}
                        </div>

                        {approvedMedication?.instructions ? (
                          <div className="mt-1 text-xs text-slate-600">
                            Instructions: {approvedMedication.instructions}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No approved refill history yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Allergies</h3>

                <button
                  onClick={() => {
                    setEditingAllergyId(null);
                    setNewAllergy(EMPTY_ALLERGY);
                    setShowAllergyModal(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  + Add Allergy
                </button>
              </div>

              <div
                className={`${(selectedPatient.allergyList || []).length > 5
                  ? "max-h-[260px] overflow-y-auto pr-1"
                  : ""
                  } space-y-3`}
              >
                {(selectedPatient.allergyList || []).length > 0 ? (
                  selectedPatient.allergyList.map((allergy) => (
                    <div
                      key={allergy.id}
                      className={`rounded-xl border p-4 ${allergy.isActive
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{allergy.allergen || "—"}</p>
                          <p className="text-sm">Reaction: {allergy.reaction || "—"}</p>
                          <p className="text-sm">Severity: {allergy.severity || "—"}</p>
                          {allergy.notes ? (
                            <p className="text-sm">Notes: {allergy.notes}</p>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              startEditAllergy(allergy);
                            }}
                            className="rounded-lg bg-slate-200 px-4 py-3 text-sm text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              deleteAllergy(allergy.id);
                            }}
                            className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No allergies added yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">Vitals</h3>

              <button
                onClick={() => {
                  if (isSupportDataLocked) return;
                  saveVitals();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {editingVitalsIndex !== null ? "Update Vitals" : "Save Vitals"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="BP (e.g. 120/80)"
                value={currentVitals.bp}
                onChange={(e) => updateVitalsField("bp", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="HR"
                value={currentVitals.hr}
                onChange={(e) => updateVitalsField("hr", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Temp °F"
                value={currentVitals.temp}
                onChange={(e) => updateVitalsField("temp", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="RR"
                value={currentVitals.rr}
                onChange={(e) => updateVitalsField("rr", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="SpO2 %"
                value={currentVitals.spo2}
                onChange={(e) => updateVitalsField("spo2", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Weight (lb)"
                value={currentVitals.weight}
                onChange={(e) => updateVitalsField("weight", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder={`Height (e.g. 5'11")`}
                value={currentVitals.height}
                onChange={(e) => updateVitalsField("height", e.target.value)}
                disabled={isSupportDataLocked}
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="BMI"
                value={currentVitals.bmi}
                readOnly
              />
              <input
                className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                placeholder="Pain Score (e.g. 4/10)"
                value={currentVitals.pain}
                onChange={(e) => updateVitalsField("pain", e.target.value)}
                disabled={isSupportDataLocked}
              />
            </div>

            <div className="mt-6">
              <h4 className="mb-3 font-semibold">Vitals Trend</h4>

              {vitalsHistory.length >= 2 ? (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-500">Blood Pressure</p>
                    <p className={`mt-1 text-sm font-semibold ${getColorClasses(bpCategory)}`}>
                      {latestVitals?.bp || "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Prev: {previousVitals?.bp || "—"} •{" "}
                      {bpTrend
                        ? `${renderTrendArrow(bpTrend.systolic)} Sys / ${renderTrendArrow(bpTrend.diastolic)} Dia`
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Heart Rate</p>
                    <p className={`mt-1 text-sm font-semibold ${getColorClasses(hrCategory)}`}>
                      {latestVitals?.hr || "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Prev: {previousVitals?.hr || "—"} • {renderTrendArrow(hrTrend)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">SpO2</p>
                    <p className={`mt-1 text-sm font-semibold ${getColorClasses(spo2Category)}`}>
                      {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Prev: {previousVitals?.spo2 ? `${previousVitals.spo2}%` : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Weight</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {latestVitals?.weight ? `${latestVitals.weight} lb` : "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Prev: {previousVitals?.weight ? `${previousVitals.weight} lb` : "—"} •{" "}
                      {renderTrendArrow(weightTrend)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Pain</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {latestVitals?.pain || "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Prev: {previousVitals?.pain || "—"} • {renderTrendArrow(painTrend)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mb-6 text-sm text-slate-500">
                  Need at least 2 vitals entries to show a trend.
                </p>
              )}



              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent Entries</p>
                  <h4 className="font-semibold text-slate-900">Vitals History</h4>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {selectedEncounter.vitalsHistory?.length || 0} recorded
                </span>
              </div>

              {selectedEncounter.vitalsHistory?.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
                    <table className="min-w-[700px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="p-3 font-semibold">Recorded</th>
                          <th className="p-3 font-semibold">BP</th>
                          <th className="p-3 font-semibold">HR</th>
                          <th className="p-3 font-semibold">Temp</th>
                          <th className="p-3 font-semibold">RR</th>
                          <th className="p-3 font-semibold">SpO2</th>
                          <th className="p-3 font-semibold">Weight</th>
                          <th className="p-3 font-semibold">Height</th>
                          <th className="p-3 font-semibold">BMI</th>
                          <th className="p-3 font-semibold">Pain</th>
                          <th className="p-3 font-semibold">Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEncounter.vitalsHistory.map((entry, index) => (
                          <tr key={index} className="border-t border-slate-200 align-top">
                            <td className="p-3 text-slate-700">{entry.recordedAt}</td>
                            <td className="p-3 font-medium text-slate-900">{entry.bp || "—"}</td>
                            <td className="p-3">{entry.hr || "—"}</td>
                            <td className="p-3">{entry.temp ? `${entry.temp} °F` : "—"}</td>
                            <td className="p-3">{entry.rr || "—"}</td>
                            <td className="p-3">{entry.spo2 ? `${entry.spo2}%` : "—"}</td>
                            <td className="p-3">{entry.weight ? `${entry.weight} lb` : "—"}</td>
                            <td className="p-3">{entry.height || "—"}</td>
                            <td className="p-3">{entry.bmi || "—"}</td>
                            <td className="p-3">{entry.pain || "—"}</td>
                            <td className="p-3">
                              <button
                                onClick={() => {
                                  if (isSupportDataLocked) return;
                                  startEditVitals(entry, index);
                                }}
                                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 lg:hidden">
                    {selectedEncounter.vitalsHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{entry.recordedAt}</p>
                          <button
                            onClick={() => {
                              if (isSupportDataLocked) return;
                              startEditVitals(entry, index);
                            }}
                            disabled={isSupportDataLocked}
                            className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">BP</span>{entry.bp || "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">HR</span>{entry.hr || "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Temp</span>{entry.temp ? `${entry.temp} °F` : "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">RR</span>{entry.rr || "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">SpO2</span>{entry.spo2 ? `${entry.spo2}%` : "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pain</span>{entry.pain || "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weight</span>{entry.weight ? `${entry.weight} lb` : "—"}</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">BMI</span>{entry.bmi || "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">No vitals recorded yet.</p>
              )}
            </div>
          </div>


          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Lab Collection</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Specimen tracking from the lab queue.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {getLabStatusLabel(selectedEncounter?.labStatus)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lab type</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {getLabTypeLabel(selectedEncounter?.labType)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {getLabStatusLabel(selectedEncounter?.labStatus)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collected at</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatLabDateTime(selectedEncounter?.labCollectedAt)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unable at</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatLabDateTime(selectedEncounter?.labUnableAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <button
              onClick={() => setShowSendOutLabs((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              In-House Labs
              <span>{showSendOutLabs ? "▲" : "▼"}</span>
            </button>

            {showSendOutLabs && selectedEncounter && (
              <div className="mt-4 space-y-6">

                {/* iSTAT Panel */}
                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">iSTAT Panel</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

                    {[
                      ["na", "Na"],
                      ["k", "K"],
                      ["cl", "Cl"],
                      ["ica", "iCa"],
                      ["glucose", "Glucose"],
                      ["tco2", "TCO2"],
                      ["bun", "BUN"],
                      ["creatinine", "Creatinine"],
                      ["hct", "Hct"],
                      ["hgb", "Hgb"],
                      ["anionGap", "Anion Gap"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {label}
                          {getInHouseReference("istat", key) ? (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({getInHouseReference("istat", key)})
                            </span>
                          ) : null}
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                          value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.istat?.[key]).value}
                          onChange={(e) => {
                            if (isSupportDataLocked) return;
                            updateInHouseLabSection("istat", key, { value: e.target.value });
                          }}
                          onBlur={() => persistInHouseLabs()}
                          disabled={isSupportDataLocked}
                        />
                      </div>
                    ))}

                  </div>
                </div>

                {/* Core */}
                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Core</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Blood Glucose
                        {getInHouseReference("core", "bloodGlucose") ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({getInHouseReference("core", "bloodGlucose")})
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2"
                        value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.core?.bloodGlucose).value}
                        onChange={(e) => {
                          if (isSupportDataLocked) return;
                          updateInHouseLabSection("core", "bloodGlucose", { value: e.target.value });
                        }}
                        onBlur={() => persistInHouseLabs()}
                        disabled={isSupportDataLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        A1c
                        {getInHouseReference("core", "a1c") ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({getInHouseReference("core", "a1c")})
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2"
                        value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.core?.a1c).value}
                        onChange={(e) => {
                          if (isSupportDataLocked) return;
                          updateInHouseLabSection("core", "a1c", { value: e.target.value });
                        }}
                        onBlur={() => persistInHouseLabs()}
                        disabled={isSupportDataLocked}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        HIV
                        {getInHouseReference("core", "hiv") ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({getInHouseReference("core", "hiv")})
                          </span>
                        ) : null}
                      </label>
                      <select
                        className="min-h-[44px] w-full rounded-lg border px-3 py-2"
                        value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.core?.hiv).value}
                        onChange={(e) => {
                          if (isSupportDataLocked) return;
                          updateInHouseLabSection("core", "hiv", { value: e.target.value });
                        }}
                        onBlur={() => persistInHouseLabs()}
                        disabled={isSupportDataLocked}
                      >
                        {hivOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Microalbumin / Creatinine */}
                  <div>
                    <h4 className="mb-3 font-semibold text-slate-800">Microalbumin / Creatinine</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {[
                        ["albumin", "Albumin"],
                        ["creatinine", "Creatinine"],
                        ["acRatio", "A/C Ratio"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            {label}
                            {getInHouseReference("microalbumin", key) ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({getInHouseReference("microalbumin", key)})
                              </span>
                            ) : null}
                          </label>
                          {key === "acRatio" ? (
                            <input
                              type="text"
                              className="min-h-[44px] w-full rounded-lg border bg-slate-100 px-3 py-2 text-slate-700"
                              value={calculateACRatio(
                                normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.microalbumin?.albumin).value,
                                normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.microalbumin?.creatinine).value
                              )}
                              readOnly
                            />
                          ) : (
                            <input
                              type="number"
                              step="any"
                              className="min-h-[44px] w-full rounded-lg border px-3 py-2"
                              value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.microalbumin?.[key]).value}
                              onChange={(e) => {
                                if (isSupportDataLocked) return;
                                updateInHouseLabSection("microalbumin", key, { value: e.target.value });
                              }}
                              onBlur={() => persistInHouseLabs()}
                              disabled={isSupportDataLocked}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lipids */}
                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Lipids</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    {[
                      ["totalCholesterol", "Total Cholesterol"],
                      ["triglycerides", "Triglycerides"],
                      ["hdl", "HDL"],
                      ["ldl", "LDL"],
                      ["tcHdl", "TC / HDL"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {label}
                          {getInHouseReference("lipids", key) ? (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({getInHouseReference("lipids", key)})
                            </span>
                          ) : null}
                        </label>
                        {key === "tcHdl" ? (
                          <input
                            type="text"
                            className="min-h-[44px] w-full rounded-lg border bg-slate-100 px-3 py-2 text-slate-700"
                            value={calculateTCHDLRatio(
                              normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.lipids?.totalCholesterol).value,
                              normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.lipids?.hdl).value
                            )}
                            readOnly
                          />
                        ) : (
                          <input
                            type="number"
                            step="any"
                            className="min-h-[44px] w-full rounded-lg border px-3 py-2"
                            value={normalizeInHouseLabEntry(selectedEncounter.inHouseLabs?.lipids?.[key]).value}
                            onChange={(e) => {
                              if (isSupportDataLocked) return;
                              updateInHouseLabSection("lipids", key, { value: e.target.value });
                            }}
                            onBlur={() => persistInHouseLabs()}
                            disabled={isSupportDataLocked}
                          />
                        )}
                      </div>
                    ))}

                  </div>
                </div>

                {/* Antigen Testing */}
                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">Antigen Testing</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      ["flu", "Flu"],
                      ["strep", "Strep"],
                      ["guaiac", "Guaiac"],
                      ["hcg", "HCG"],
                      ["mono", "Mono"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {label}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "positive", label: "Positive" },
                            { value: "negative", label: "Negative" },
                          ].map((option) => {
                            const currentValue = normalizeInHouseLabEntry(
                              selectedEncounter.inHouseLabs?.rapid?.[key]
                            ).value;

                            const isActive = currentValue === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={async () => {
                                  if (isSupportDataLocked) return;
                                  const nextLabs = updateInHouseLabSection("rapid", key, {
                                    value: isActive ? "" : option.value,
                                  });
                                  await persistInHouseLabs(nextLabs);
                                }}
                                disabled={isSupportDataLocked}
                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${isActive
                                  ? option.value === "positive"
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="mb-2 font-semibold text-slate-800">Notes</h4>
                  <textarea
                    value={selectedEncounter.inHouseLabs?.nursingNotes || ""}
                    onChange={(e) => {
                      if (isSupportDataLocked) return;
                      updateInHouseLabRoot("nursingNotes", e.target.value);
                    }}
                    onBlur={() => persistInHouseLabs()}
                    className="w-full rounded-lg border px-3 py-2"
                    rows={3}
                    placeholder="Enter any lab notes..."
                    disabled={isSupportDataLocked}
                  />
                </div>

              </div>
            )}
          </div>



          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <button
              onClick={() => setShowLabs((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-lg font-semibold text-slate-900"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Longitudinal Trends
                </p>
                <p className="text-lg font-semibold text-slate-900">Full Lab View</p>
              </div>
              <span>{showLabs ? "▲" : "▼"}</span>
            </button>

            {showLabs && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "abnormal", label: "Abnormal only" },
                    ...longitudinalLabData.groupedRows.map((groupBlock) => ({
                      key: groupBlock.group,
                      label: groupBlock.group,
                    })),
                  ].map((chip) => {
                    const active = labFilter === chip.key;

                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => setLabFilter(chip.key)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${active
                          ? "border-blue-600 bg-blue-100 text-blue-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dates tracked</span>
                    <span className="mt-1 block text-lg font-semibold text-slate-900">{longitudinalLabData.dateKeys.length}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Abnormal results</span>
                    <span className="mt-1 block text-lg font-semibold text-slate-900">{longitudinalLabData.abnormalCount}</span>
                  </div>
                </div>

                {longitudinalLabData.dateKeys.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No saved lab results yet.
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
                      <table className="min-w-[900px] border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-20 w-[170px] border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-800">
                              Lab
                            </th>

                            {longitudinalLabData.dateKeys.map((dateKey) => (
                              <th
                                key={dateKey}
                                className="border-b border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold text-slate-800"
                              >
                                {formatLabHeaderDate(dateKey)}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {longitudinalLabData.groupedRows
                            .filter((groupBlock) => {
                              if (labFilter === "all" || labFilter === "abnormal") return true;
                              return groupBlock.group === labFilter;
                            })
                            .map((groupBlock) => {
                              const visibleRows = groupBlock.rows.filter((row) => {
                                if (labFilter === "abnormal") return row.abnormal;
                                return true;
                              });

                              if (visibleRows.length === 0) return null;

                              return (
                                <Fragment key={groupBlock.group}>
                                  <tr>
                                    <td
                                      colSpan={longitudinalLabData.dateKeys.length + 1}
                                      className="border-b border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    >
                                      {groupBlock.group}
                                    </td>
                                  </tr>

                                  {visibleRows.map((row) => (
                                    <tr key={row.analyte}>
                                      <td className="sticky left-0 z-10 w-[170px] border-b border-r border-slate-200 bg-white px-3 py-2 font-medium text-slate-900">
                                        {row.analyte}
                                      </td>

                                      {longitudinalLabData.dateKeys.map((dateKey) => {
                                        const cellResults = row.valuesByDate[dateKey] || [];

                                        return (
                                          <td
                                            key={`${row.analyte}-${dateKey}`}
                                            className="min-w-[140px] border-b border-slate-200 px-2 py-2 align-top"
                                          >
                                            {cellResults.length === 0 ? (
                                              <span className="text-slate-300">—</span>
                                            ) : (
                                              <div className="space-y-2">
                                                {cellResults.map((result, index) => (
                                                  <div
                                                    key={`${row.analyte}-${dateKey}-${index}`}
                                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                                    title={result.fullValueText}
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="min-w-0">
                                                        <div className={`text-base font-semibold ${getLabFlagClasses(result.flag)}`}>
                                                          {result.valueText}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                          {result.sourceLabel}
                                                          {result.unitText ? ` • ${result.unitText}` : ""}
                                                        </div>
                                                        {result.referenceRange ? (
                                                          <div className="text-xs text-slate-400">
                                                            Ref: {result.referenceRange}
                                                          </div>
                                                        ) : null}
                                                      </div>

                                                      {result.flag ? (
                                                        <span
                                                          className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${result.flag === "H"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-blue-100 text-blue-700"
                                                            }`}
                                                        >
                                                          {result.flag}
                                                        </span>
                                                      ) : null}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </Fragment>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-4 lg:hidden">
                      {longitudinalLabData.groupedRows
                        .filter((groupBlock) => {
                          if (labFilter === "all" || labFilter === "abnormal") return true;
                          return groupBlock.group === labFilter;
                        })
                        .map((groupBlock) => {
                          const visibleRows = groupBlock.rows.filter((row) => {
                            if (labFilter === "abnormal") return row.abnormal;
                            return true;
                          });

                          if (visibleRows.length === 0) return null;

                          return (
                            <div key={groupBlock.group} className="space-y-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {groupBlock.group}
                              </div>

                              {visibleRows.map((row) => {
                                const allResults = Object.values(row.valuesByDate || {}).flat();

                                if (allResults.length === 0) return null;

                                return (
                                  <div
                                    key={row.analyte}
                                    className="rounded-xl border border-slate-200 bg-white p-3"
                                  >
                                    <div className="mb-2 text-sm font-semibold text-slate-800">
                                      {row.analyte}
                                    </div>

                                    <div className="space-y-2">
                                      {allResults.map((result, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="text-xs font-medium text-slate-500">
                                                {formatLabHeaderDate(result.dateKey)}
                                              </div>
                                              <div className={`mt-1 text-base font-semibold ${getLabFlagClasses(result.flag)}`}>
                                                {result.valueText}
                                              </div>
                                              <div className="text-xs text-slate-500">
                                                {result.sourceLabel}
                                                {result.unitText ? ` • ${result.unitText}` : ""}
                                              </div>
                                              {result.referenceRange ? (
                                                <div className="text-xs text-slate-400">
                                                  Ref: {result.referenceRange}
                                                </div>
                                              ) : null}
                                            </div>

                                            {result.flag ? (
                                              <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${result.flag === "H"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-blue-100 text-blue-700"
                                                  }`}
                                              >
                                                {result.flag}
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>



          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            SOAP note workflow is temporarily hidden for trial runs.
          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <button
              onClick={() => setShowAudit((prev) => !prev)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-lg font-semibold text-slate-900"
            >
              Audit Trail
              <span>{showAudit ? "▲" : "▼"}</span>
            </button>

            {showAudit && (
              <>
                {auditLoading ? (
                  <p className="text-sm text-slate-500">Loading audit trail...</p>
                ) : auditEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No audit history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {auditEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {formatAuditAction(entry.action)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.actor_name || "Unknown User"} •{" "}
                          {new Date(entry.created_at).toLocaleString()}
                        </p>

                        {![
                          "soap_saved",
                          "soap_submitted_upper",
                          "soap_submitted_attending",
                          "soap_signed_upper",
                          "soap_signed_attending",
                          "soap_reopened",
                        ].includes(entry.action) &&
                          entry.details &&
                          Object.keys(entry.details).length > 0 ? (
                          <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-slate-600">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
      {false && showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Attending Signature
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Select the attending and enter their 4-digit PIN to sign this note.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Attending
                </label>
                <select
                  value={selectedAttendingId}
                  onChange={(e) => setSelectedAttendingId(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base"
                >
                  <option value="">Select attending</option>
                  {activeAttendings?.map((attending) => (
                    <option key={attending.id} value={attending.id}>
                      {attending.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  4-Digit PIN
                </label>
                <input
                  id="attending-signature-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  name="one-time-code"
                  value={attendingPin}
                  onChange={(e) =>
                    setAttendingPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onPaste={(e) => e.preventDefault()}
                  placeholder="Enter PIN"
                />
              </div>
            </div>
            {soapUiMessage ? (
              <p className="mt-3 text-sm text-red-600">{soapUiMessage}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSelectedAttendingId("");
                  setAttendingPin("");
                }}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const success = await signSoapAsAttendingWithPin(
                    selectedAttendingId,
                    attendingPin
                  );

                  if (success) {
                    setShowSignModal(false);
                    setSelectedAttendingId("");
                    setAttendingPin("");
                  } else {
                    setAttendingPin("");
                  }
                }}
                disabled={!selectedAttendingId || attendingPin.length !== 4 || soapBusy}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {soapBusy ? "Signing..." : "Sign Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

