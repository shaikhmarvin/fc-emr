import { jsPDF } from "jspdf";
import JSZip from "jszip";

function normalizeText(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function cleanFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Unknown";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
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
  if (!Array.isArray(medications) || medications.length === 0) return ["No medications on file"];
  return medications.map((med) => {
    const parts = [med?.name, med?.dosage, med?.frequency, med?.route]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    return parts.join(" • ") || "Unnamed medication";
  });
}

function condensedAllergyList(allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) return ["No allergies on file"];
  return allergies.map((allergy) => {
    const parts = [allergy?.name || allergy?.allergen, allergy?.reaction]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    return parts.join(" — ") || "Unnamed allergy";
  });
}

function latestVitalsSummary(encounter) {
  const vitalsHistory = Array.isArray(encounter?.vitalsHistory) ? encounter.vitalsHistory : [];
  const latest = vitalsHistory[0] || vitalsHistory[vitalsHistory.length - 1] || null;
  if (!latest) return ["No vitals on file"];

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

  return fields.length ? [fields.join(" | ")] : ["No vitals on file"];
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

function medicationReconciliationRows(medications) {
  if (!Array.isArray(medications) || medications.length === 0) {
    return [["No medications on file", "—", "—", "—", "—", "—", "—", "—"]];
  }

  return medications.map((med) => [
    normalizeText(med?.name),
    normalizeText(med?.dosage),
    normalizeText(med?.frequency),
    normalizeText(med?.route),
    med?.dispenseAmount ?? med?.dispense_amount ?? "—",
    med?.refillCount ?? med?.refill_count ?? "—",
    normalizeText(med?.instructions),
    med?.isActive === false ? "Inactive" : "Active",
  ]);
}

function inHouseLabRows(encounter) {
  const labs = encounter?.inHouseLabs || {};
  const rows = [];

  Object.entries(labs).forEach(([sectionName, values]) => {
    if (!values || typeof values !== "object") return;
    Object.entries(values).forEach(([testName, result]) => {
      if (result === null || result === undefined || result === "") return;
      if (typeof result === "object") {
        rows.push([
          sectionName,
          testName,
          normalizeText(result.value),
          normalizeText(result.flag),
          normalizeText(result.referenceRange || result.reference || result.range),
        ]);
      } else {
        rows.push([sectionName, testName, normalizeText(result), "—", "—"]);
      }
    });
  });

  return rows;
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

async function addLogo(doc, logoSrc, pageWidth, margin) {
  const meta = await loadImageDimensions(logoSrc);
  if (!meta) return 20;

  const maxWidth = 70;
  const maxHeight = 20;
  const scale = Math.min(maxWidth / meta.width, maxHeight / meta.height);
  const width = meta.width * scale;
  const height = meta.height * scale;

  doc.addImage(meta.src, "PNG", margin, 10, width, height, undefined, "FAST");
  return 10 + height + 4;
}

function addWrappedText(doc, text, x, y, width, options = {}) {
  const fontSize = options.fontSize || 10.5;
  const lineHeight = options.lineHeight || 5;
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensurePageSpace(doc, y, needed, marginBottom = 15) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - marginBottom) {
    doc.addPage();
    return 15;
  }
  return y;
}

function drawInfoTable(doc, startY, rows, opts = {}) {
  const margin = opts.margin || 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - margin * 2;
  const labelWidth = opts.labelWidth || 32;
  const rowPadding = 3;
  const lineHeight = 4.5;
  let y = startY;

  doc.setDrawColor(210, 214, 220);
  doc.setLineWidth(0.2);

  rows.forEach(({ label, values }) => {
    const valueLines = Array.isArray(values) ? values : [values];
    const wrapped = valueLines.flatMap((value) => doc.splitTextToSize(String(value), tableWidth - labelWidth - 6));
    const contentLines = wrapped.length ? wrapped : ["—"];
    const rowHeight = Math.max(10, contentLines.length * lineHeight + rowPadding * 2);

    y = ensurePageSpace(doc, y, rowHeight + 2);

    doc.rect(margin, y, tableWidth, rowHeight);
    doc.line(margin + labelWidth, y, margin + labelWidth, y + rowHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(label), margin + 2, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(contentLines, margin + labelWidth + 3, y + 6);

    y += rowHeight;
  });

  return y + 4;
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
  y = addWrappedText(doc, text, margin, y, width, { fontSize: 10, lineHeight: 4.5 });

  return y + 3;
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
    doc.rect(margin, y, tableWidth, headerHeight);
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
    doc.rect(margin, y, tableWidth, rowHeight);
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const patientName = fullNameFromPatient(patient, getFullPatientName);
  const narrative = getEncounterNarrative(encounter);
  const allergies = condensedAllergyList(patient?.allergies || []);
  const meds = condensedMedicationList(sortedMedications);
  const vitals = latestVitalsSummary(encounter);

  let y = await addLogo(doc, logoSrc, pageWidth, margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(patientName, margin, y + 2);
  y += 8;

  const infoRows = [
    { label: "DOB", values: [normalizeText(formatDate(patient?.dob))] },
    { label: "MRN", values: [normalizeText(patient?.mrn)] },
    { label: "Clinic Date", values: [normalizeText(formatDate(encounter?.clinicDate || encounter?.createdAt))] },
    { label: "Medications", values: meds },
    { label: "Allergies", values: allergies },
    { label: "Vitals", values: vitals },
  ];

  y = drawInfoTable(doc, y, infoRows, { margin, labelWidth: 32 });
  y = drawSection(doc, "Chief Complaint", narrative.chiefComplaint, y, { margin });
  y = drawSection(doc, "Subjective", narrative.subjective, y, { margin });
  y = drawSection(doc, "Objective", narrative.objective, y, { margin });
  y = drawSection(doc, "Assessment", narrative.assessment, y, { margin });
  y = drawSection(doc, "Plan", narrative.plan, y, { margin });

  const signatures = [
    `Student: ${normalizeText(soapAuthorName)}`,
    `Upper Level: ${normalizeText(upperLevelSignerName)}`,
    `Attending: ${normalizeText(attendingSignerName)}`,
  ];

  y = drawInfoTable(doc, y, [{ label: "Signatures", values: signatures }], { margin, labelWidth: 32 });

  const labRows = inHouseLabRows(encounter);
  if (labRows.length) {
    doc.addPage();
    y = await addLogo(doc, logoSrc, pageWidth, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${patientName} — In-House Labs`, margin, y + 2);
    y += 8;
    y = drawGridTable(
      doc,
      "In-House Labs",
      ["Section", "Test", "Value", "Flag", "Reference"],
      labRows,
      y,
      { margin, colWidths: [28, 52, 25, 18, 50] }
    );
  }

  doc.addPage();
  y = await addLogo(doc, logoSrc, pageWidth, margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${patientName} — Medication Reconciliation`, margin, y + 2);
  y += 8;
  drawGridTable(
    doc,
    "Medication Reconciliation",
    ["Medication", "Dose", "Freq", "Route", "Disp", "Refills", "Instructions", "Status"],
    medicationReconciliationRows(sortedMedications),
    y,
    { margin, colWidths: [32, 18, 19, 16, 14, 14, 44, 17] }
  );

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
