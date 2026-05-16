
import { jsPDF } from "jspdf";
import JSZip from "jszip";

function normalizeText(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function cleanFilePart(value) {
  return (
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Unknown"
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function fullNameFromPatient(patient, getFullPatientName) {
  if (typeof getFullPatientName === "function") {
    const v = getFullPatientName(patient);
    if (v) return v;
  }
  const parts = [patient?.firstName, patient?.middleName, patient?.lastName]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return parts.join(" ") || patient?.name || "Unknown Patient";
}

function condensedMedicationList(medications) {
  if (!Array.isArray(medications) || medications.length === 0) {
    return "No medications on file";
  }
  return medications
    .map((med) => {
      const parts = [med?.name, med?.dosage, med?.frequency, med?.route]
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      return parts.join(" • ") || "Unnamed medication";
    })
    .join("  |  ");
}

function condensedAllergyList(allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) {
    return "No allergies on file";
  }
  return allergies
    .map((allergy) => {
      const parts = [allergy?.name || allergy?.allergen, allergy?.reaction]
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      return parts.join(" — ") || "Unnamed allergy";
    })
    .join("  |  ");
}

function latestVitalsSummary(encounter) {
  const vitalsHistory = Array.isArray(encounter?.vitalsHistory)
    ? encounter.vitalsHistory
    : [];
  const latest = vitalsHistory[0] || vitalsHistory[vitalsHistory.length - 1] || null;
  if (!latest) return "No vitals on file";

  const fields = [
    latest.bp && `BP ${latest.bp}`,
    latest.hr && `HR ${latest.hr}`,
    latest.temp && `Temp ${latest.temp}`,
    latest.rr && `RR ${latest.rr}`,
    latest.spo2 && `SpO2 ${latest.spo2}`,
    latest.weight && `Wt ${latest.weight}`,
    latest.height && `Ht ${latest.height}`,
    latest.bmi && `BMI ${latest.bmi}`,
    latest.pain && `Pain ${latest.pain}`,
  ].filter(Boolean);

  return fields.length ? fields.join(" | ") : "No vitals on file";
}

function getEncounterNarrative(encounter) {
  return {
    chiefComplaint: normalizeText(encounter?.chiefComplaint),
    subjective: normalizeText(encounter?.soapSubjective),
    objective: normalizeText(encounter?.soapObjective),
    assessment: normalizeText(encounter?.soapAssessment),
    plan: normalizeText(encounter?.soapPlan),
  };
}

const IN_HOUSE_LAB_EXPORT_CONFIG = [
  { section: "iSTAT", sectionKey: "istat", fieldKey: "na", label: "Na", reference: "138-146 mEq/L", type: "numeric", low: 138, high: 146 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "k", label: "K", reference: "3.5-4.9 mEq/L", type: "numeric", low: 3.5, high: 4.9 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "cl", label: "Cl", reference: "98-109 mEq/L", type: "numeric", low: 98, high: 109 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "iCa", label: "iCa", reference: "1.2-1.32 mEq/L", type: "numeric", low: 1.2, high: 1.32 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "glucose", label: "Glucose", reference: "Fast: 70-110 | 2-h post: <120", type: "numeric", low: 70, high: 110 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "tco2", label: "TCO2", reference: "", type: "text" },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "bun", label: "BUN", reference: "8-26 mg/dL", type: "numeric", low: 8, high: 26 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "creatinine", label: "Creatinine", reference: "0.6-1.3 mg/dL", type: "numeric", low: 0.6, high: 1.3 },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "hct", label: "HCT", reference: "M: 41-53% | F: 36-46%", type: "text" },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "hgb", label: "Hgb", reference: "M: >14 mg/dL | F: >12 mg/dL", type: "text" },
  { section: "iSTAT", sectionKey: "istat", fieldKey: "anGap", label: "AnGap", reference: "", type: "text" },

  { section: "Core", sectionKey: "core", fieldKey: "bloodGlucose", label: "Blood Glucose", reference: "", type: "text" },
  { section: "Core", sectionKey: "core", fieldKey: "a1c", label: "HbA1C", reference: "", type: "text" },
  { section: "Core", sectionKey: "core", fieldKey: "hiv", label: "HIV", reference: "", type: "categorical" },

  { section: "Microalbumin / Creatinine", sectionKey: "microalbumin", fieldKey: "albumin", label: "Albumin", reference: "", type: "text" },
  { section: "Microalbumin / Creatinine", sectionKey: "microalbumin", fieldKey: "creatinine", label: "Creatinine", reference: "", type: "text" },
  { section: "Microalbumin / Creatinine", sectionKey: "microalbumin", fieldKey: "acRatio", label: "A/C Ratio", reference: "", type: "text" },

  { section: "Lipids", sectionKey: "lipids", fieldKey: "hdl", label: "HDL", reference: "N: >40", type: "numeric", low: 40, high: null, invert: true },
  { section: "Lipids", sectionKey: "lipids", fieldKey: "triglycerides", label: "Triglycerides", reference: "N: <150", type: "numeric", low: null, high: 150 },
  { section: "Lipids", sectionKey: "lipids", fieldKey: "ldl", label: "LDL", reference: "N: <130", type: "numeric", low: null, high: 130 },
  { section: "Lipids", sectionKey: "lipids", fieldKey: "tcHdl", label: "TC/HDL", reference: "", type: "text" },
  { section: "Lipids", sectionKey: "lipids", fieldKey: "totalCholesterol", label: "Total Cholesterol", reference: "N: <200", type: "numeric", low: null, high: 200 },

  { section: "Antigen Testing", sectionKey: "rapid", fieldKey: "flu", label: "Flu", reference: "", type: "categorical" },
  { section: "Antigen Testing", sectionKey: "rapid", fieldKey: "strep", label: "Strep", reference: "", type: "categorical" },
  { section: "Antigen Testing", sectionKey: "rapid", fieldKey: "guaiac", label: "Guaiac", reference: "", type: "categorical" },
  { section: "Antigen Testing", sectionKey: "rapid", fieldKey: "hcg", label: "HCG", reference: "", type: "categorical" },
  { section: "Antigen Testing", sectionKey: "rapid", fieldKey: "mono", label: "Mono", reference: "", type: "categorical" },
];

function normalizeInHouseLabValue(result) {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return {
      value: result.value ?? "",
      flag: result.flag ?? "",
      referenceRange: result.referenceRange || result.reference || result.range || "",
    };
  }

  return {
    value: result ?? "",
    flag: "",
    referenceRange: "",
  };
}

function normalizeCategoricalLabValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (["positive", "+", "pos", "reactive", "detected"].includes(text)) return "Positive";
  if (["negative", "-", "neg", "non-reactive", "not detected"].includes(text)) return "Negative";
  if (text === "indeterminate") return "Indeterminate";
  return String(value).trim();
}

function automaticInHouseFlag(config, value, storedFlag = "") {
  if (storedFlag) return storedFlag;
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (config.type === "categorical") {
    const normalized = normalizeCategoricalLabValue(raw);
    return normalized === "Positive" ? "H" : "";
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return "";

  if (config.invert) {
    if (config.low != null && numeric <= config.low) return "L";
    return "";
  }

  if (config.low != null && numeric < config.low) return "L";
  if (config.high != null && numeric >= config.high) return "H";
  return "";
}

function inHouseLabRows(encounter) {
  const labs = encounter?.inHouseLabs || {};
  const rows = [];

  IN_HOUSE_LAB_EXPORT_CONFIG.forEach((config) => {
    const section = labs?.[config.sectionKey];
    if (!section || typeof section !== "object") return;

    const entry = normalizeInHouseLabValue(section?.[config.fieldKey]);
    const rawValue = entry.value;
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") return;

    const displayValue =
      config.type === "categorical"
        ? normalizeCategoricalLabValue(rawValue)
        : normalizeText(rawValue);

    rows.push([
      config.label,
      displayValue,
      normalizeText(automaticInHouseFlag(config, rawValue, entry.flag)),
      normalizeText(entry.referenceRange || config.reference),
    ]);
  });

  return rows;
}

function inHouseNursingNotes(encounter) {
  const notes = encounter?.inHouseLabs?.nursingNotes;
  const text = String(notes || "").trim();
  return text || "";
}

function getDosesPerDay(frequency) {
  const freq = String(frequency || "").trim().toLowerCase();
  switch (freq) {
    case "daily":
    case "qd":
      return 1;
    case "bid":
    case "twice daily":
      return 2;
    case "tid":
    case "three times daily":
      return 3;
    case "qid":
    case "four times daily":
      return 4;
    case "weekly":
      return 1 / 7;
    default:
      return null;
  }
}

function getMedicationSupplyInfo(med) {
  const dispense = Number(med?.dispenseAmount ?? med?.dispense_amount);
  const dosesPerDay = getDosesPerDay(med?.frequency);
  const refillCount = Number(med?.refillCount ?? med?.refill_count);

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

  const safeRefills = Number.isFinite(refillCount) && refillCount >= 0 ? refillCount : 0;
  const totalDaysCovered = daysUntilRefill * (safeRefills + 1);

  const today = new Date();
  const refillDue = new Date();
  refillDue.setDate(today.getDate() + daysUntilRefill);

  const runout = new Date();
  runout.setDate(today.getDate() + totalDaysCovered);

  return {
    daysUntilRefill,
    refillDueDate: refillDue.toLocaleDateString(),
    totalDaysCovered,
    runoutDate: runout.toLocaleDateString(),
  };
}

function medicationOrigin(med, encounter) {
  const currentEncounterId = encounter?.id;
  const sourceEncounterId = med?.lastUpdatedEncounterId ?? med?.last_updated_encounter_id ?? med?.encounterId ?? med?.encounter_id;
  if (currentEncounterId && sourceEncounterId && String(currentEncounterId) === String(sourceEncounterId)) {
    return "This Encounter";
  }
  return sourceEncounterId ? "Previous Encounter" : "—";
}

function medicationAddedDate(med) {
  return formatDisplayDate(med?.createdAt || med?.created_at || med?.addedAt || med?.added_at);
}

function loadImageDimensions(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height, src });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function addLogo(doc, logoSrc, margin) {
  const meta = await loadImageDimensions(logoSrc);
  if (!meta) return 18;

  const maxWidth = 74;
  const maxHeight = 18;
  const scale = Math.min(maxWidth / meta.width, maxHeight / meta.height);
  const width = meta.width * scale;
  const height = meta.height * scale;

  doc.addImage(meta.src, "PNG", margin, 10, width, height, undefined, "FAST");
  return 10 + height + 4;
}

function ensurePageSpace(doc, y, needed, marginBottom = 15) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - marginBottom) {
    doc.addPage();
    return 15;
  }
  return y;
}

function drawWrappedLine(doc, label, text, x, y, width, opts = {}) {
  const labelWidth = opts.labelWidth || 24;
  const fontSize = opts.fontSize || 10;
  const lineHeight = opts.lineHeight || 4.5;
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(String(text || "—"), width - labelWidth);
  doc.text(lines, x + labelWidth, y);
  return y + Math.max(1, lines.length) * lineHeight;
}

function drawSection(doc, title, text, startY, opts = {}) {
  const margin = opts.margin || 14;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = ensurePageSpace(doc, startY, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(title, margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, margin, y);
  return y + lines.length * 4.5 + 3;
}

function drawGridTable(doc, title, headers, rows, startY, opts = {}) {
  const margin = opts.margin || 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - margin * 2;
  const colWidths = opts.colWidths || headers.map(() => tableWidth / headers.length);
  const lineHeight = 4;
  const padding = 2;
  let y = startY;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(title, margin, y);
    y += 4;

    const headerHeight = 8;
    let x = margin;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, tableWidth, headerHeight, "F");
    headers.forEach((header, idx) => {
      doc.rect(x, y, colWidths[idx], headerHeight);
      doc.text(String(header), x + padding, y + 5);
      x += colWidths[idx];
    });
    y += headerHeight;
  };

  drawHeader();

  rows.forEach((row) => {
    const wrappedCells = row.map((cell, idx) => doc.splitTextToSize(String(cell), colWidths[idx] - padding * 2));
    const rowLineCount = Math.max(...wrappedCells.map((lines) => Math.max(lines.length, 1)));
    const rowHeight = Math.max(8, rowLineCount * lineHeight + padding * 2);

    if (y + rowHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
      drawHeader();
    }

    let x = margin;
    row.forEach((_, idx) => {
      doc.rect(x, y, colWidths[idx], rowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(wrappedCells[idx], x + padding, y + 5);
      x += colWidths[idx];
    });
    y += rowHeight;
  });

  return y + 4;
}

function drawMedicationReconciliationPage(doc, medications, encounter, patientName, startY, margin) {
  let y = startY;
  const width = doc.internal.pageSize.getWidth() - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${patientName} — Medication Reconciliation`, margin, y + 2);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Medication Reconciliation", margin, y);
  y += 6;

  if (!Array.isArray(medications) || medications.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No medications on file", margin, y);
    return y + 6;
  }

  medications.forEach((med) => {
    const supply = getMedicationSupplyInfo(med);
    const row1 = [
      normalizeText(med?.name),
      normalizeText(med?.dosage),
      normalizeText(med?.frequency),
      normalizeText(med?.route),
      med?.isActive === false ? "Inactive" : "Active",
    ].join(" — ");

    const detail1 = [
      `Disp: ${normalizeText(med?.dispenseAmount ?? med?.dispense_amount)}`,
      `Refills: ${normalizeText(med?.refillCount ?? med?.refill_count)}`,
      `Added: ${medicationAddedDate(med)}`,
      `Origin: ${medicationOrigin(med, encounter)}`,
    ].join(" | ");

    const detail2 = [
      `Days Until Refill: ${normalizeText(supply.daysUntilRefill)}`,
      `Refill Due: ${normalizeText(supply.refillDueDate)}`,
      `Total Coverage: ${normalizeText(supply.totalDaysCovered)}${supply.totalDaysCovered ? " days" : ""}`,
      `Runout: ${normalizeText(supply.runoutDate)}`,
    ].join(" | ");

    const instructionText = med?.instructions ? `Instructions: ${String(med.instructions).trim()}` : "";

    const estimateHeight = 8 +
      Math.max(1, doc.splitTextToSize(row1, width - 6).length) * 4.5 +
      Math.max(1, doc.splitTextToSize(detail1, width - 6).length) * 4 +
      Math.max(1, doc.splitTextToSize(detail2, width - 6).length) * 4 +
      (instructionText ? Math.max(1, doc.splitTextToSize(instructionText, width - 6).length) * 4 : 0) +
      8;

    y = ensurePageSpace(doc, y, estimateHeight);

    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, width, estimateHeight - 2, 2, 2);

    let innerY = y + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const row1Lines = doc.splitTextToSize(row1, width - 6);
    doc.text(row1Lines, margin + 3, innerY);
    innerY += row1Lines.length * 4.5 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.25);
    const detail1Lines = doc.splitTextToSize(detail1, width - 6);
    doc.text(detail1Lines, margin + 3, innerY);
    innerY += detail1Lines.length * 4 + 1;

    const detail2Lines = doc.splitTextToSize(detail2, width - 6);
    doc.text(detail2Lines, margin + 3, innerY);
    innerY += detail2Lines.length * 4 + 1;

    if (instructionText) {
      const instructionLines = doc.splitTextToSize(instructionText, width - 6);
      doc.text(instructionLines, margin + 3, innerY);
      innerY += instructionLines.length * 4;
    }

    y += estimateHeight + 2;
  });

  return y;
}

async function buildEncounterPdfDoc({
  patient,
  encounter,
  sortedMedications = [],
  logoSrc,
  getFullPatientName,
  soapAuthorName,
  upperLevelSignerName,
  attendingSignerName,
}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const margin = 14;
  const patientName = fullNameFromPatient(patient, getFullPatientName);
  const narrative = getEncounterNarrative(encounter);
  const isSigned = encounter?.soapStatus === "signed";

  let y = await addLogo(doc, logoSrc, margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(patientName, margin, y + 2);
  y += 8;

  if (!isSigned) {
    doc.setTextColor(200, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("UNSIGNED DRAFT – NOT YET SIGNED", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `DOB ${normalizeText(formatDate(patient?.dob))}   MRN ${normalizeText(patient?.mrn)}   Clinic Date ${normalizeText(formatDate(encounter?.clinicDate || encounter?.createdAt))}`,
    margin,
    y
  );
  y += 6;

  y = drawWrappedLine(doc, "Medications", condensedMedicationList(sortedMedications), margin, y, 180, { labelWidth: 24, fontSize: 10, lineHeight: 4.5 });
  y = drawWrappedLine(doc, "Allergies", condensedAllergyList(patient?.allergies || []), margin, y, 180, { labelWidth: 24, fontSize: 10, lineHeight: 4.5 });
  y = drawWrappedLine(doc, "Vitals", latestVitalsSummary(encounter), margin, y, 180, { labelWidth: 24, fontSize: 10, lineHeight: 4.5 });
  y += 2;

  y = drawSection(doc, "Chief Complaint", narrative.chiefComplaint, y, { margin });
  y = drawSection(doc, "Subjective", narrative.subjective, y, { margin });
  y = drawSection(doc, "Objective", narrative.objective, y, { margin });
  y = drawSection(doc, "Assessment", narrative.assessment, y, { margin });
  y = drawSection(doc, "Plan", narrative.plan, y, { margin });

  const signaturesLine = `Student: ${normalizeText(soapAuthorName)} | Upper Level: ${isSigned ? normalizeText(upperLevelSignerName) : "Pending"} | Attending: ${isSigned ? normalizeText(attendingSignerName) : "Pending"}`;
  y = drawWrappedLine(doc, "Signatures", signaturesLine, margin, y, 180, { labelWidth: 20, fontSize: 10, lineHeight: 4.5 });

  const labRows = inHouseLabRows(encounter);
  const nursingNotes = inHouseNursingNotes(encounter);
  if (labRows.length || nursingNotes) {
    doc.addPage();
    y = await addLogo(doc, logoSrc, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${patientName} — In-House Labs`, margin, y + 2);
    y += 8;

    if (labRows.length) {
      y = drawGridTable(doc, "In-House Labs", ["Test", "Value", "Flag", "Reference"], labRows, y, {
        margin,
        colWidths: [58, 28, 16, 84],
      });
    }

    if (nursingNotes) {
      y = drawSection(doc, "Nursing Notes", nursingNotes, y + 2, { margin });
    }
  }

  doc.addPage();
  y = await addLogo(doc, logoSrc, margin);
  drawMedicationReconciliationPage(doc, sortedMedications, encounter, patientName, y, margin);

  return doc;
}

export async function downloadEncounterPdf(args) {
  const doc = await buildEncounterPdfDoc(args);
  const patientName = fullNameFromPatient(args.patient, args.getFullPatientName).split(/\s+/);
  const firstName = cleanFilePart(patientName.slice(0, -1).join("_") || patientName[0]);
  const lastName = cleanFilePart(patientName[patientName.length - 1]);
  const clinicDate = cleanFilePart(formatDate(args.encounter?.clinicDate || args.encounter?.createdAt));
  const filename = `${clinicDate}_${lastName}_${firstName}.pdf`;
  doc.save(filename);
}

export async function downloadSignedEncountersZip({ rows, logoSrc, getFullPatientName }) {
  const zip = new JSZip();

  for (const row of rows || []) {
    const patient = row?.patient || {};
    const encounter = row?.encounter || {};
    const sortedMedications = row?.sortedMedications || row?.medications || patient?.medications || [];
    const soapAuthorName = row?.soapAuthorName || row?.studentName || encounter?.soapAuthorName || "—";
    const upperLevelSignerName = row?.upperLevelSignerName || encounter?.upperLevelSignerName || "—";
    const attendingSignerName = row?.attendingSignerName || encounter?.attendingSignerName || "—";

    const doc = await buildEncounterPdfDoc({
      patient,
      encounter,
      sortedMedications,
      logoSrc,
      getFullPatientName,
      soapAuthorName,
      upperLevelSignerName,
      attendingSignerName,
    });

    const patientName = fullNameFromPatient(patient, getFullPatientName).split(/\s+/);
    const firstName = cleanFilePart(patientName.slice(0, -1).join("_") || patientName[0]);
    const lastName = cleanFilePart(patientName[patientName.length - 1]);
    const clinicDate = cleanFilePart(formatDate(encounter?.clinicDate || encounter?.createdAt));
    const filename = `${clinicDate}_${lastName}_${firstName}.pdf`;

    zip.file(filename, doc.output("arraybuffer"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signed_records_${formatDate(new Date())}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
