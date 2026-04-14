import {
  LAB_ALIAS_INDEX,
  findLabByAlias,
  valueLooksSuspicious,
} from "./labCatalog";
import { LAB_PANELS } from "./labCatalog";

const UMC_REFERENCE_RANGES = {
  // CBC
  wbc: "4.3-10.7",
  rbc: "4.00-5.60",
  hemoglobin: "12.6-17.4",
  hematocrit: "37.0-53.0",
  mcv: "79.0-96.0",
  mch: "26.0-34.0",
  mchc: "31.0-37.0",
  rdw: "11.5-14.5",
  platelets: "150-400",
  mpv: "7.4-10.4",

  // Differential
  neutrophils_percent: "40.0-74.0",
  lymphocytes_percent: "19.0-48.0",
  monocytes_percent: "3.4-9.0",
  eosinophils_percent: "0.0-7.0",
  basophils_percent: "0.0-1.5",
  immature_granulocytes_percent: "0.0-0.4",
  anc: "1.56-6.13",
  absolute_lymphocytes: "1.18-3.74",
  absolute_monocytes: "0.24-0.86",
  absolute_eosinophils: "0.04-0.36",
  absolute_basophils: "0.01-0.08",

  // Chemistry
  sodium: "136-145",
  potassium: "3.5-5.1",
  chloride: "98-107",
  co2: "22-29",
  anion_gap: "7-16",
  glucose: "70-99",
  bun: "6-20",
  creatinine: "0.67-1.17",
  egfr: "60+",
  calcium: "8.6-10.0",
  phosphorus: "2.5-4.5",
  magnesium: "1.6-2.6",

  // Liver
  total_protein: "6.4-8.3",
  albumin: "3.5-5.2",
  globulin: "2.3-3.5",
  ag_ratio: "1.0-2.0",
  total_bilirubin: "0.0-1.2",
  direct_bilirubin: "0.0-0.3",
  ast: "0-40",
  alt: "0-41",
  alkaline_phosphatase: "40-129",
  ggt: "8-61",

  // Diabetes / endocrine
  a1c: "4.0-5.6",
  estimated_average_glucose: "70-114",
  insulin: "2.6-24.9",

  // Thyroid
  tsh: "0.27-4.20",
  free_t4: "0.93-1.70",
  total_t4: "4.5-11.7",
  free_t3: "2.0-4.4",
  total_t3: "80-200",

  // Lipids
  total_cholesterol: "0-199",
  hdl: "40+",
  ldl: "0-99",
  triglycerides: "0-149",
  non_hdl: "0-129",
  chol_hdl_ratio: "0-5.0",

  // Iron studies
  iron: "59-158",
  tibc: "250-450",
  uibc: "112-347",
  iron_saturation: "20-50",
  ferritin: "30-400",
  transferrin: "200-360",

  // Vitamins
  vitamin_d_25oh: "30-100",
  vitamin_b12: "232-1245",
  folate: "4.8+",

  // Coagulation
  pt: "11.8-14.6",
  inr: "0.9-1.1",
  ptt: "25.0-37.0",

  // Urinalysis / urine protein
  urine_specific_gravity: "1.005-1.030",
  urine_ph: "5.0-8.0",
  urine_rbc: "0-2",
  urine_wbc: "0-5",
  albumin_creatinine_ratio: "0-30",
};

function normalizeLine(line = "") {
  return String(line || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w./%+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(line = "") {
  return normalizeLine(line).replace(/[^a-z0-9]/g, "");
}

function tokenizeLine(line = "") {
  return String(line || "")
    .split(/[\s/(),:%+-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOcrNumericLine(line = "") {
  let cleaned = String(line || "");

  cleaned = cleaned
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")
    .replace(/(?<=\d)\s+(?=\d)/g, "")
    .replace(/\bO(?=\d)/g, "0")
    .replace(/(?<=\d)O\b/g, "0")
    .replace(/(?<=\d)O(?=\d)/g, "0")
    .replace(/\bI(?=\d)/g, "1")
    .replace(/(?<=\d)I\b/g, "1")
    .replace(/(?<=\d)I(?=\d)/g, "1")
    .replace(/\bL(?=\d)/gi, "1")
    .replace(/(?<=\d)L\b/gi, "1")
    .replace(/(?<=\d)L(?=\d)/gi, "1");

  return cleaned;
}

function extractNumberFromLine(line = "") {
  const cleaned = normalizeOcrNumericLine(line).trim();
  if (!cleaned) return null;

  const match = cleaned.match(/[<>]?\s*[-+]?\d+(?:\.\d+)?/);
  if (!match) return null;

  const raw = match[0].replace(/\s+/g, "");
  const value = parseFloat(raw.replace(/[<>]/g, ""));
  return Number.isNaN(value) ? null : value;
}

function extractAllNumbersFromLine(line = "") {
  const cleaned = normalizeOcrNumericLine(line);
  const matches = cleaned.match(/[<>]?\s*[-+]?\d+(?:\.\d+)?/g) || [];

  return matches
    .map((value) => parseFloat(String(value).replace(/\s+/g, "").replace(/[<>]/g, "")))
    .filter((value) => !Number.isNaN(value));
}

function withDebugMeta(labResult, debugMeta = {}) {
  return {
    ...labResult,
    debugMeta: {
      parseMethod: debugMeta.parseMethod || null,
      matchIndex:
        Number.isInteger(debugMeta.matchIndex) ? debugMeta.matchIndex : null,
      valueLineIndex:
        Number.isInteger(debugMeta.valueLineIndex) ? debugMeta.valueLineIndex : null,
      valueSourceLine: debugMeta.valueSourceLine || "",
      candidateNumbers: Array.isArray(debugMeta.candidateNumbers)
        ? debugMeta.candidateNumbers
        : [],
      debugCandidates: Array.isArray(debugMeta.debugCandidates)
        ? debugMeta.debugCandidates
        : [],
      rangeUsed: debugMeta.rangeUsed || "",
    },
  };
}

function parseExpectedRange(expectedRangeText = "") {
  const text = String(expectedRangeText || "").trim();
  if (!text) return null;

  if (/\b\d+\+\b/.test(text)) {
    const match = text.match(/(\d+(?:\.\d+)?)\+/);
    if (!match) return null;
    const min = parseFloat(match[1]);
    if (Number.isNaN(min)) return null;
    return { min, max: Infinity };
  }

  const match = text.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const min = parseFloat(match[1]);
  const max = parseFloat(match[2]);

  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

function getReferenceRangeText(lab) {
  if (!lab) return "";
  return UMC_REFERENCE_RANGES[lab.key] || "";
}

function computeResultSymbol(value, referenceRangeText = "") {
  if (value === null || value === undefined || value === "") return "";

  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (Number.isNaN(numeric)) return "";

  const parsedRange = parseExpectedRange(referenceRangeText);
  if (!parsedRange) return "";

  if (numeric < parsedRange.min) return "L";
  if (numeric > parsedRange.max) return "H";
  return "";
}

function rescueNumericValueByRange(value, lab) {
  if (value == null || !lab) return value;

  const num = Number(value);
  if (!isFinite(num)) return value;

  const min = lab?.expectedRange?.min;
  const max = lab?.expectedRange?.max;

  if (min == null || max == null) return value;

  // If already in range, keep it
  if (num >= min && num <= max) return num;

  // 🔒 Only allow decimal rescue for specific labs (safe whitelist)
  const safeDecimalLabs = [
    "creatinine",
    "bilirubin",
    "hemoglobin a1c",
    "a1c",
    "tsh",
    "free t4",
    "t4",
    "vitamin d",
    "b12",
    "ferritin",
    "iron",
  ];

  const labName = (lab.displayName || "").toLowerCase();

  const allowDecimalRescue = safeDecimalLabs.some((term) =>
    labName.includes(term)
  );

  if (!allowDecimalRescue) {
    return num; // 🚫 do NOT scale for things like ALT, triglycerides, etc.
  }

  // Try dividing by 10 or 100 ONLY for allowed labs
  const div10 = num / 10;
  if (div10 >= min && div10 <= max) return div10;

  const div100 = num / 100;
  if (div100 >= min && div100 <= max) return div100;

  return num;
}

function extractCategoricalValue(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return null;

  // negative / absent results first
  if (normalized.includes("not detected")) return "Not Detected";
  if (normalized.includes("non-reactive")) return "Non-Reactive";
  if (normalized.includes("non reactive")) return "Non-Reactive";
  if (normalized.includes("nonreactive")) return "Non-Reactive";
  if (normalized.includes("negative")) return "Negative";

  // positive / present results after
  if (normalized.includes("detected")) return "Detected";
  if (normalized.includes("reactive")) return "Reactive";
  if (normalized.includes("positive")) return "Positive";
  if (normalized.includes("equivocal")) return "Equivocal";
  if (normalized.includes("indeterminate")) return "Indeterminate";

  return null;
}

function lineIsPureValue(line = "") {
  const raw = String(line || "").trim();
  if (!raw) return false;

  const cleaned = normalizeOcrNumericLine(raw);

  if (/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) return true;
  if (extractCategoricalValue(raw)) return true;

  return false;
}

function isMissingValueLine(line = "") {
  const value = String(line || "").trim().toLowerCase();
  return (
    value === "—" ||
    value === "-" ||
    value === "--" ||
    value === "na" ||
    value === "n/a"
  );
}

function looksLikeRangeOnlyLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return false;

  if (/\b\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?\b/.test(normalized)) return true;
  if (/^[<>]=?\s*\d+(\.\d+)?$/.test(normalized)) return true;
  if (
    /^(mg dl|mmol l|g dl|u l|k ul|m ul|f l|pg ml|ng dl|ml min|sec|ratio)$/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

function isMorphologyNarrativeLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return false;

  const phrases = [
    "platelet estimate",
    "rbc morphology",
    "burr cells",
    "elliptocytes",
    "microcytosis",
    "polychromasia",
    "target cells",
    "general hematology",
    "reflex",
    "cancelled laboratory orders",
    "department status canceled",
    "result comments",
    "confirmed alert value",
    "result called to and read back by",
  ];

  return phrases.some((phrase) => normalized.includes(phrase));
}

function isIgnoredNarrativeLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return true;

  const hardStopPhrases = [
    "interpretation",
    "diagnostic considerations",
    "clinical suspicion",
    "recommend additional testing",
    "false positive",
    "test methodology",
    "bioplex",
    "electrochemiluminescence",
    "average blood glucose",
    "poor control",
    "action suggested",
    "goal",
    "reference interval",
    "adult levels",
    "optimal",
    "borderline",
    "high risk",
    "very high",
    "zeta/ax retransmission",
    "this is a continuation of a previous fax",
    "confirmed alert value",
    "result called to and read back by",
    "result comments",
    "cancelled laboratory orders",
    "department status canceled",
    "please call in am",
    "average blood glucose",
"level of control",
"poor control",
"action suggested",
"goal",
"additional",
"new reference range as of",
"specimens containing high amounts of hbf",
"specimens containing hbs and hbc variants",
  ];

  if (hardStopPhrases.some((p) => normalized.includes(p))) {
    return true;
  }

  if (
    normalized.includes("procedure") ||
    normalized.includes("result") ||
    normalized.includes("units") ||
    normalized.includes("reference range") ||
    normalized.includes("result symbol") ||
    normalized.includes("footnote symbol")
  ) {
    return true;
  }

  if (
    normalized.includes("retransmission") ||
    normalized.includes("fax") ||
    normalized.includes("zztexas")
  ) {
    return true;
  }

  if (normalized.length > 90) return true;

  return false;
}

function isHeaderLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return true;

  return [
    "cbc",
    "chemistry",
    "hiv",
    "immunology",
    "molecular diagnostics",
    "procedure",
    "result",
    "units",
    "reference range",
    "collected date time",
    "collected",
    "specimen type",
  ].includes(normalized);
}

function shouldSkipLine(line = "") {
  return isIgnoredNarrativeLine(line);
}

function isLikelyHeaderLine(line = "") {
  return isHeaderLine(line);
}

function looksLikeRangeLine(line = "") {
  return looksLikeRangeOnlyLine(line);
}

const UMC_STAFF_IGNORE_LIST = [
  "fiona prabhu",
  "fiona prabhu md",
  "prabhu fiona",
  "dale dunn",
  "dunn dale",
];

function isIgnoredUmcStaffLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return false;

  return UMC_STAFF_IGNORE_LIST.some((name) => normalized.includes(name));
}

function isLikelyMultiLabSummaryLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return false;

  const summaryTargets = [
    "hepatitis a ab igg",
    "hepatitis a ab igm",
    "hepatitis b core ab igg",
    "hepatitis b surface ag",
    "hepatitis c ab igg",
    "syphilis screen",
    "hiv screen",
    "chlamydia trachomatis",
    "neisseria gonorrhoeae",
  ];

  let hits = 0;

  for (const target of summaryTargets) {
    if (normalized.includes(target)) {
      hits += 1;
    }
  }

  return hits >= 2;
}

function isUmcLabText(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return false;

  return (
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab")
  );
}

function isBoundaryLine(line = "") {
  const normalized = normalizeLine(line);
  if (!normalized) return true;

  return (
    normalized.startsWith("patient") ||
    normalized.startsWith("dob") ||
    normalized.startsWith("mrn") ||
    normalized === "cbc" ||
    normalized === "chemistry" ||
    normalized === "hiv" ||
    normalized === "immunology" ||
    normalized === "molecular diagnostics"
  );
}

function isAddressOrLocationLine(line = "") {
  const raw = String(line || "").trim();
  const normalized = normalizeLine(raw);

  if (!normalized) return false;

  return (
    /^\d/.test(raw) ||
    /\b\d{5}\b/.test(raw) ||
    normalized.includes("street") ||
    normalized.includes("st ") ||
    normalized.includes(" st.") ||
    normalized.includes("avenue") ||
    normalized.includes(" ave") ||
    normalized.includes("road") ||
    normalized.includes(" rd") ||
    normalized.includes("drive") ||
    normalized.includes(" dr") ||
    normalized.includes("boulevard") ||
    normalized.includes(" blvd") ||
    normalized.includes("lubbock") ||
    normalized.includes("texas") ||
    normalized.includes("zztexas") ||
    normalized.includes("coulter")
  );
}

function isGarbageNumericLine(line = "") {
  const raw = String(line || "").trim();
  if (!raw) return false;

  if (/^(01|02|03|\^1|\^2|\^)$/.test(raw)) return true;
  if (/^\d{5,}$/.test(raw)) return true;
  if (/^[*]{3,}$/.test(raw)) return true;
  if (/^[^\x00-\x7F]+$/.test(raw)) return true;

  return false;
}

function isLikelyValueLine(line = "", lab = null) {
  const raw = String(line || "").trim();
  if (!raw) return false;

  if (isMissingValueLine(raw)) return true;
  if (extractCategoricalValue(raw)) return true;
  if (/^[-+]?\d+(?:\.\d+)?$/.test(normalizeOcrNumericLine(raw))) return true;

  if (lab?.resultType === "numeric") {
    const numbers = extractAllNumbersFromLine(raw);
    if (numbers.length === 1 && raw.length <= 20) return true;
  }

  return false;
}

function findLabMatch(line = "") {
  const raw = String(line || "").trim();
  if (!raw) return null;
  if (isIgnoredNarrativeLine(raw)) return null;
  if (isHeaderLine(raw)) return null;

  const normalizedLine = normalizeLine(raw);
  const compactLine = normalizeCompact(raw);
  const tokens = tokenizeLine(raw).map((token) => normalizeCompact(token));
    if (normalizedLine.includes("true sodium level")) {
    return null;
  }

  if (
    normalizedLine.includes("rdw sd") ||
    compactLine.includes("rdwsd")
  ) {
    return null;
  }

  if (normalizedLine.includes("tsh 3rd generation")) {
    return findLabByAlias("tsh 3rd generation") || findLabByAlias("tsh");
  }

  if (normalizedLine.includes("t4 free")) {
    return findLabByAlias("t4 free") || findLabByAlias("free t4");
  }

  if (
    normalizedLine.includes("hepatitis a ab igg") ||
    normalizedLine.includes("hav igg")
  ) {
    return findLabByAlias("hepatitis a ab igg") || findLabByAlias("hepatitis a antibody");
  }

  if (normalizedLine.includes("hepatitis a ab igm")) {
    return findLabByAlias("hepatitis a ab igm") || findLabByAlias("hepatitis a igm");
  }

  if (
    normalizedLine.includes("hepatitis b core ab igg") ||
    normalizedLine.includes("hep b core ab igg")
  ) {
    return findLabByAlias("hepatitis b core ab igg") || findLabByAlias("hepatitis b core antibody");
  }

  if (
    normalizedLine.includes("hepatitis b surface ag") ||
    normalizedLine.includes("hep b surface ag")
  ) {
    return findLabByAlias("hepatitis b surface ag") || findLabByAlias("hepatitis b surface antigen");
  }

  if (
    normalizedLine.includes("hepatitis c ab igg") ||
    normalizedLine.includes("hep c ab igg")
  ) {
    return findLabByAlias("hepatitis c ab igg") || findLabByAlias("hepatitis c antibody");
  }

  if (
    normalizedLine.includes("non hdl") ||
    compactLine.includes("nonhdl")
  ) {
    return findLabByAlias("non hdl") || findLabByAlias("non-hdl");
  }

  if (
    normalizedLine === "hdlc" ||
    normalizedLine.includes("hdl cholesterol") ||
    compactLine === "hdlc"
  ) {
    return findLabByAlias("hdl");
  }

  if (
    normalizedLine.includes("ldl calculated") ||
    compactLine.includes("ldlcalculated")
  ) {
    return findLabByAlias("ldl calculated") || findLabByAlias("ldl");
  }

  if (normalizedLine.includes("potassium level")) {
    return findLabByAlias("potassium level") || findLabByAlias("potassium");
  }

  if (normalizedLine.includes("sodium level")) {
    return findLabByAlias("sodium level") || findLabByAlias("sodium");
  }

  if (normalizedLine.includes("chloride level")) {
    return findLabByAlias("chloride level") || findLabByAlias("chloride");
  }

  if (normalizedLine.includes("glucose level")) {
    return findLabByAlias("glucose level") || findLabByAlias("glucose");
  }

  if (
    normalizedLine.includes("hiv screen") ||
    normalizedLine.includes("hiv 1 2") ||
    normalizedLine.includes("hiv 1/2") ||
    compactLine.includes("hivscreen") ||
    compactLine.includes("hiv12")
  ) {
    return findLabByAlias("hiv screen") || findLabByAlias("hiv");
  }

  if (
    normalizedLine.includes("syphilis screen") ||
    normalizedLine.includes("syphilis total antibody") ||
    compactLine.includes("syphilisscreen")
  ) {
    return findLabByAlias("syphilis screen") || findLabByAlias("syphilis");
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const alias in LAB_ALIAS_INDEX) {
    const lab = findLabByAlias(alias);
    if (!lab) continue;

    const aliasVariants = [lab.displayName, ...(lab.aliases || [])]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    for (const aliasVariant of aliasVariants) {
      const normalizedAlias = normalizeLine(aliasVariant);
      const compactAlias = normalizeCompact(aliasVariant);
      if (!normalizedAlias || !compactAlias) continue;

      let matched = false;
      let score = 0;

      if (compactAlias.length <= 2) {
        matched =
          normalizedLine === normalizedAlias ||
          compactLine === compactAlias;
        score = matched ? compactAlias.length : 0;
      } else if (compactAlias.length <= 3) {
        matched =
          normalizedLine === normalizedAlias ||
          compactLine === compactAlias ||
          tokens.includes(compactAlias);
        score = matched ? compactAlias.length : 0;
      } else {
        const safeAlias = escapeRegex(normalizedAlias);
        const regex = new RegExp(`\\b${safeAlias}\\b`, "i");
        matched = regex.test(normalizedLine) || compactLine === compactAlias;
        score = matched ? compactAlias.length : 0;
      }

      if (!matched) continue;

      if (normalizedLine === normalizedAlias || compactLine === compactAlias) {
        score += 25;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = lab;
      }
    }
  }

  return bestMatch;
}

function scoreCandidateValue(lab, line, offset) {
  const raw = String(line || "").trim();
  if (!raw) return -Infinity;

  let score = 0;

  if (isAddressOrLocationLine(raw)) {
    return -Infinity;
  }

  if (extractCategoricalValue(raw)) {
    score += 100;
  }

  const numbers = extractAllNumbersFromLine(raw);
  if (numbers.length > 0) {
    score += 70;
  }

  if (/^[-+]?\d+(?:\.\d+)?$/.test(normalizeOcrNumericLine(raw))) {
    score += 25;
  }

  if (lab?.resultType === "numeric" && numbers.length > 0) {
    const range = parseExpectedRange(lab.expectedRangeText || "");
    if (range) {
      const rescued = rescueNumericValueByRange(numbers[0], lab);
      if (rescued >= range.min && rescued <= range.max) {
        score += 35;
      }
    }
  }

  score -= offset * 4;

  if (looksLikeRangeOnlyLine(raw)) score -= 50;
  if (isIgnoredNarrativeLine(raw)) score -= 100;
  if (isHeaderLine(raw)) score -= 100;

  return score;
}

function findBestValueCandidate(lines = [], startIndex = 0, lab = null) {
  const maxLookahead = 6;
  const debugCandidates = [];

  for (let offset = 1; offset <= maxLookahead; offset += 1) {
    const index = startIndex + offset;
    const raw = String(lines[index] || "").trim();

    if (!raw) continue;

    if (
      isHeaderLine(raw) ||
      isIgnoredNarrativeLine(raw) ||
      isMorphologyNarrativeLine(raw) ||
      isIgnoredUmcStaffLine(raw) ||
      isLikelyMultiLabSummaryLine(raw) ||
      looksLikeRangeOnlyLine(raw) ||
      isAddressOrLocationLine(raw) ||
      isGarbageNumericLine(raw)
    ) {
      continue;
    }

    if (isBoundaryLine(raw)) break;

    const matchedOtherLab = findLabMatch(raw);
    if (matchedOtherLab && matchedOtherLab.key !== lab?.key) {
      break;
    }

    const candidateNumbers = extractAllNumbersFromLine(raw);
    debugCandidates.push({
      index,
      line: raw,
      candidateNumbers,
    });

    if (lab?.resultType === "categorical") {
      const cat = extractCategoricalValue(raw);
      if (cat) {
        return {
          line: raw,
          value: cat,
          index,
          candidateNumbers: [],
          debugCandidates,
        };
      }
      continue;
    }

    if (isLikelyValueLine(raw, lab)) {
      const value = rescueNumericValueByRange(
        extractNumberFromLine(raw),
        lab
      );

      return {
        line: raw,
        value,
        index,
        candidateNumbers,
        debugCandidates,
      };
    }

    if (candidateNumbers.length > 0) {
      const range = parseExpectedRange(lab?.expectedRangeText || "");

      if (range) {
        for (const n of candidateNumbers) {
          const rescued = rescueNumericValueByRange(n, lab);
          if (rescued >= range.min && rescued <= range.max) {
            return {
              line: raw,
              value: rescued,
              index,
              candidateNumbers,
              debugCandidates,
            };
          }
        }
      }

      return {
        line: raw,
        value: rescueNumericValueByRange(candidateNumbers[0], lab),
        index,
        candidateNumbers,
        debugCandidates,
      };
    }
  }

  return null;
}

function buildParsedLab(
  lab,
  rawLine,
  valueSourceLine,
  inlineValue = null,
  debugMeta = {}
) {
  let value = null;
  let missing = false;

  if (inlineValue !== null && inlineValue !== undefined) {
    value = inlineValue;
  } else if (isMissingValueLine(valueSourceLine)) {
    missing = true;
  } else if (lab.resultType === "categorical") {
    value = extractCategoricalValue(valueSourceLine);
  } else if (lab.resultType === "numeric") {
    value = extractNumberFromLine(valueSourceLine);
    value = rescueNumericValueByRange(value, lab);
  }

  if (value === null || value === undefined || value === "") {
    missing = true;
  }

  const effectiveRawLine =
    lab.resultType === "categorical" &&
    valueSourceLine &&
    String(valueSourceLine).trim()
      ? String(valueSourceLine).trim()
      : String(rawLine || valueSourceLine || "").trim();

    const referenceRangeText = getReferenceRangeText(lab);
  const resultSymbol =
    lab.resultType === "numeric"
      ? computeResultSymbol(value, referenceRangeText)
      : "";

  return withDebugMeta(
    {
      key: lab.key,
      displayName: lab.displayName,
      group: lab.group,
      value,
      rawLine: effectiveRawLine,
      suspicious: valueLooksSuspicious(lab, value),

      // parser-only
      expectedRangeText: lab.expectedRangeText || "",

      // display-only
      referenceRangeText,
      resultSymbol,

      missing,
      autoFilled: false,
      confidence:
        missing
          ? "low"
          : inlineValue !== null && inlineValue !== undefined
          ? "high"
          : "medium",
      duplicateType: null,
      duplicateInfo: null,
    },
    {
      rangeUsed: lab.expectedRangeText || "",
      ...debugMeta,
      valueSourceLine: debugMeta.valueSourceLine || effectiveRawLine,
    }
  );
}

function dedupeParsedLabs(results = []) {
  const bestByKey = new Map();

  function score(item) {
    let total = 0;

    if (item.value !== null && item.value !== undefined && item.value !== "") total += 100;
    if (!item.autoFilled) total += 20;
    if (!item.missing) total += 10;
    if (item.confidence === "high") total += 10;
    if (String(item.rawLine || "").length <= 60) total += 5;

    const raw = normalizeLine(item.rawLine || "");
    const valueText = normalizeLine(String(item.value || ""));

    if (
      raw.includes("non-reactive") ||
      raw.includes("non reactive") ||
      raw.includes("nonreactive") ||
      raw.includes("not detected") ||
      raw.includes("negative") ||
      valueText === "non-reactive" ||
      valueText === "non reactive" ||
      valueText === "not detected" ||
      valueText === "negative"
    ) {
      total += 80;
    }

    if (
      raw === "reactive" ||
      raw.startsWith("reactive ") ||
      raw.endsWith(" reactive") ||
      valueText === "reactive"
    ) {
      total -= 30;
    }

    if (
      item.key === "hiv_1_2_ab_ag" &&
      (
        raw.includes("non-reactive") ||
        raw.includes("non reactive") ||
        raw.includes("nonreactive")
      )
    ) {
      total += 120;
    }

    if (
      [
        "hepatitis_a_antibody",
        "hepatitis_a_igm",
        "hepatitis_b_core_antibody",
        "hepatitis_b_surface_antigen",
        "hepatitis_c_antibody",
      ].includes(item.key) &&
      (
        raw.includes("non-reactive") ||
        raw.includes("non reactive") ||
        raw.includes("nonreactive")
      )
    ) {
      total += 120;
    }

    return total;
  }

  for (const item of results) {
    const dedupeKey = item.key || normalizeCompact(item.displayName || "");
    if (!dedupeKey) continue;

    const existing = bestByKey.get(dedupeKey);
    if (!existing || score(item) > score(existing)) {
      bestByKey.set(dedupeKey, item);
    }
  }

  return Array.from(bestByKey.values());
}

function expandPanels(results) {
  const foundKeys = new Set(results.map((r) => r.key));
  const expanded = [...results];
  const expandedPanels = new Set();

  for (const panelName in LAB_PANELS) {
    const panelKeys = LAB_PANELS[panelName];

    if (expandedPanels.has(panelName)) continue;

    const panelDetected = panelKeys.some((key) => foundKeys.has(key));
    if (!panelDetected) continue;

    if (
      panelName === "CBC with Differential" &&
      expandedPanels.has("CBC")
    ) {
      continue;
    }

    expandedPanels.add(panelName);

    for (const key of panelKeys) {
      if (foundKeys.has(key)) continue;

      const isInfectiousKey =
        key === "hiv_1_2_ab_ag" ||
        key === "syphilis_screen" ||
        key === "chlamydia" ||
        key === "gonorrhea" ||
        key === "trichomonas";

      if (isInfectiousKey) {
        const alreadyRepresented = expanded.some((item) => item.key === key);
        if (alreadyRepresented) continue;

        const packetAlreadyHasRealInfectiousValues = expanded.some(
          (item) =>
            ["hiv_1_2_ab_ag", "syphilis_screen", "chlamydia", "gonorrhea", "trichomonas"].includes(item.key) &&
            item.value !== null &&
            item.value !== undefined &&
            item.value !== ""
        );

        if (packetAlreadyHasRealInfectiousValues) continue;
      }

      const labDef = findLabByAlias(key) || {};

            expanded.push({
        key,
        displayName: labDef.displayName || key,
        group: labDef.group || "Other",
        value: null,
        rawLine: "panel autofill",
        suspicious: false,
        autoFilled: true,

        expectedRangeText: labDef.expectedRangeText || "",
        referenceRangeText: getReferenceRangeText(labDef),
        resultSymbol: "",

        missing: true,
        confidence: "low",
      });
      foundKeys.add(key);
    }
  }

  return expanded;
}

function checkDuplicates(labs = [], existingLabs = [], currentEncounterDate = null) {
  return labs.map((lab) => {
    let duplicateType = null;
    let duplicateInfo = null;

    for (const existing of existingLabs || []) {
      if (existing.key !== lab.key) continue;

      if (existing.date === currentEncounterDate) {
        duplicateType = "same_encounter";
        duplicateInfo = "Already exists in this encounter";
        break;
      }

      const diffDays =
        Math.abs(new Date(existing.date) - new Date(currentEncounterDate)) /
        (1000 * 60 * 60 * 24);

      if (diffDays <= 30) {
        duplicateType = "recent";
        duplicateInfo = "Similar lab in last 30 days";
      }
    }

    return {
      ...lab,
      duplicateType,
      duplicateInfo,
    };
  });
}

function shouldUseStructuredParsing(lines = [], index = 0, matchedLab = null) {
  const current = String(lines[index] || "").trim();
  const prev1 = normalizeLine(lines[index - 1] || "");
  const prev2 = normalizeLine(lines[index - 2] || "");
  const next1 = normalizeLine(lines[index + 1] || "");
  const next2 = normalizeLine(lines[index + 2] || "");
  const next3 = normalizeLine(lines[index + 3] || "");
  const currentNorm = normalizeLine(current);

  if (!current || !matchedLab) return false;

  // Ordinary chemistry/CBC line-list rows should NOT use structured parsing
  // because they already have same-line / next-line values.
  if (
    lineIsPureValue(lines[index + 1]) ||
    lineIsPureValue(lines[index + 2]) ||
    parseInlineLabValueFromSameLine(current, matchedLab) !== null
  ) {
    return false;
  }

  // True structured blocks usually sit right under a Procedure header
  // and have Result immediately after the test name.
  const precededByProcedure =
    prev1 === "procedure" || prev2 === "procedure";

  const followedByResultSoon =
    next1 === "result" || next2 === "result" || next3 === "result";

  if (precededByProcedure && followedByResultSoon) {
    return true;
  }

  // Explicit whitelist for UMC structured single-result tests
  const structuredKeys = new Set([
    "egfr",
    "tsh",
    "free_t4",
    "t4_free",
    "hemoglobin_a1c",
    "a1c",
    "syphilis_screen",
    "hiv_1_2_ab_ag",
    "hepatitis_a_antibody",
    "hepatitis_a_igm",
    "hepatitis_b_core_antibody",
    "hepatitis_b_surface_antigen",
    "hepatitis_c_antibody",
  ]);

  if (structuredKeys.has(matchedLab.key) && followedByResultSoon) {
    return true;
  }

  return false;
}

function findStructuredResultValue(
  lines = [],
  startIndex = 0,
  matchedLab = null,
  umcMode = false
) {
  const maxLookahead = umcMode ? 6 : 6;
  let sawResultLabel = false;
    const immediateNext = lines[startIndex + 1];
  if (lineIsPureValue(immediateNext)) {
    return {
      line: immediateNext,
      value:
        matchedLab?.resultType === "categorical"
          ? extractCategoricalValue(immediateNext)
          : rescueNumericValueByRange(
              extractNumberFromLine(immediateNext),
              matchedLab
            ),
    };
  }
  

  for (let offset = 1; offset < maxLookahead; offset += 1) {
    const index = startIndex + offset;
    const raw = String(lines[index] || "").trim();
    if (!raw) continue;

    const normalized = normalizeLine(raw);
    if (!normalized) continue;

    if (
      normalized.startsWith("patient") ||
      normalized.startsWith("dob") ||
      normalized.startsWith("mrn")
    ) {
      break;
    }

    if (sawResultLabel && /^collected date time$/i.test(raw)) break;
    if (sawResultLabel && /^procedure$/i.test(raw)) break;
        if (sawResultLabel) {
      const otherLabAfterResult = findLabMatch(raw);
      if (otherLabAfterResult && otherLabAfterResult.key !== matchedLab?.key) {
        break;
      }
    }

    if (/^result$/i.test(raw)) {
      sawResultLabel = true;
      continue;
    }

        if (
      isHeaderLine(raw) ||
      isMorphologyNarrativeLine(raw) ||
      looksLikeRangeOnlyLine(raw) ||
      isIgnoredNarrativeLine(raw) ||
      isIgnoredUmcStaffLine(raw) ||
      isLikelyMultiLabSummaryLine(raw) ||
      isAddressOrLocationLine(raw) ||
      isGarbageNumericLine(raw)
    ) {
      continue;
    }

    if (!sawResultLabel) {
      const otherLab = findLabMatch(raw);

      if (otherLab && otherLab.key !== matchedLab?.key) {
        if (umcMode) {
          continue;
        }
        break;
      }

      continue;
    }

    if (matchedLab?.resultType === "categorical") {
      const cat = extractCategoricalValue(raw);
      if (cat) {
        return {
          line: raw,
          value: cat,
        };
      }
      continue;
    }

    const numbers = extractAllNumbersFromLine(raw);
    if (numbers.length === 0) continue;

    const range = parseExpectedRange(matchedLab?.expectedRangeText || "");

    if (range) {
      for (const n of numbers) {
        const rescued = rescueNumericValueByRange(n, matchedLab);
        if (rescued >= range.min && rescued <= range.max) {
          return {
            line: raw,
            value: rescued,
          };
        }
      }
    }

    return {
      line: raw,
      value: rescueNumericValueByRange(numbers[0], matchedLab),
    };
  }

  return null;
}


function parseInlineLabValueFromSameLine(line, lab) {
  const raw = String(line || "").trim();
  if (!raw || !lab) return null;

  const normalized = normalizeLine(raw);

  // 🔥 categorical FIRST (most important fix)
  const categorical = extractCategoricalValue(raw);
  if (categorical) return categorical;

  // 🔥 aggressively extract trailing number
  const match = raw.match(/([-+]?\d+(?:\.\d+)?)(?!.*\d)/);
  if (match && lab.resultType === "numeric") {
    const value = parseFloat(match[1]);
    if (!Number.isNaN(value)) {
      return rescueNumericValueByRange(value, lab);
    }
  }

  return null;
}

function isUmcThyroidSingleTestPacket(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return false;

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc) return false;

  const thyroidHits = [
    "tsh 3rd generation",
    "t4 free",
    "free t4",
    "thyroid",
  ].filter((term) => normalized.includes(term)).length;

  if (thyroidHits === 0) return false;

  const hasStructuredPanelSignals =
    normalized.includes("sodium level") ||
    normalized.includes("potassium level") ||
    normalized.includes("glucose level") ||
    normalized.includes("creatinine") ||
    normalized.includes("bun") ||
    normalized.includes("cbc") ||
    normalized.includes("wbc") ||
    normalized.includes("platelet") ||
    normalized.includes("cholesterol") ||
    normalized.includes("triglycerides") ||
    normalized.includes("ast") ||
    normalized.includes("alt") ||
    normalized.includes("alkaline phosphatase") ||
    normalized.includes("hemoglobin a1c");

  // only treat it as a thyroid-only packet when it really looks thyroid-only
  return !hasStructuredPanelSignals;
}

function parseUmcThyroidSingleTestPacket(rawText = "") {
  if (!isUmcThyroidSingleTestPacket(rawText)) return [];

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const procedureNames = [];
  const numericResults = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normalized = normalizeLine(line);

    if (!normalized) continue;

    if (normalized === "procedure") {
      const next = String(lines[i + 1] || "").trim();
      const matchedLab = findLabMatch(next);
      if (matchedLab) {
        procedureNames.push({
          lab: matchedLab,
          rawLine: next,
        });
      }
      continue;
    }

    if (normalized === "result") {
      for (let j = i + 1; j < lines.length; j += 1) {
        const candidate = String(lines[j] || "").trim();
        if (!candidate) continue;

        if (
          isHeaderLine(candidate) ||
          isIgnoredNarrativeLine(candidate) ||
          looksLikeRangeOnlyLine(candidate)
        ) {
          continue;
        }

        const number = extractNumberFromLine(candidate);
        if (number !== null && number !== undefined) {
          numericResults.push({
            rawLine: candidate,
            value: number,
          });
          break;
        }
      }
    }
  }

  if (procedureNames.length === 0 || numericResults.length === 0) return [];

  const results = [];

  for (let i = 0; i < procedureNames.length && i < numericResults.length; i += 1) {
    const { lab, rawLine } = procedureNames[i];
    const numeric = numericResults[i];

    results.push(
      buildParsedLab(
        lab,
        rawLine,
        numeric.rawLine,
        rescueNumericValueByRange(numeric.value, lab)
      )
    );
  }

  return results;
}

export function extractPatientNameFromLabText(rawText = "") {
  if (!rawText) return null;

  const lines = String(rawText)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  function isAddressLike(line) {
    const normalized = normalizeLine(line);

    return (
      /^\d/.test(String(line || "").trim()) ||
      /\b\d{5}\b/.test(line) ||
      normalized.includes("street") ||
      normalized.includes("st ") ||
      normalized.includes(" st.") ||
      normalized.includes("avenue") ||
      normalized.includes(" ave") ||
      normalized.includes("road") ||
      normalized.includes(" rd") ||
      normalized.includes("drive") ||
      normalized.includes(" dr") ||
      normalized.includes("boulevard") ||
      normalized.includes(" blvd") ||
      normalized.includes("lubbock") ||
      normalized.includes("texas") ||
      normalized.includes("zztexas") ||
      normalized.includes("coulter")
    );
  }

  function isValidName(line) {
    const normalized = normalizeLine(line);

    if (!normalized) return false;

    if (!line.includes(",")) return false;
    if (isIgnoredUmcStaffLine(line)) return false;
    if (isAddressLike(line)) return false;

    if (
      normalized.includes("dob") ||
      normalized.includes("mrn") ||
      normalized.includes("account") ||
      normalized.includes("physician") ||
      normalized.includes("lab") ||
      normalized.includes("collected") ||
      normalized.includes("specimen") ||
      normalized.includes("reference range") ||
      normalized.includes("result") ||
      normalized.includes("units") ||
      normalized.length < 3
    ) {
      return false;
    }

    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return false;

    const combined = parts.join(" ");
    if (!/[A-Za-z]/.test(combined)) return false;

    return true;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normalized = normalizeLine(line);

    if (normalized.startsWith("patient")) {
      const after = line.split(":")[1]?.trim();
      if (after && isValidName(after)) {
        return after;
      }

      const next = lines[i + 1];
      if (next && isValidName(next)) {
        return next;
      }

      const prev = lines[i - 1];
      if (prev && isValidName(prev)) {
        return prev;
      }
    }
  }

  for (const line of lines.slice(0, 20)) {
    if (isValidName(line)) {
      return line;
    }
  }

  return null;
}

export function formatPatientName(name = "") {
  if (!name) return "";

  const parts = name.split(",");
  if (parts.length < 2) return name;

  const last = parts[0].trim();
  const first = parts[1].trim();

  return `${first} ${last}`;
}

function upsertOverrideLab(parsedLabs = [], overrideLab = null) {
  if (!overrideLab || !overrideLab.key) return parsedLabs || [];

  const next = [...(parsedLabs || [])];
  const index = next.findIndex((lab) => lab.key === overrideLab.key);

  if (index >= 0) {
    next[index] = {
      ...next[index],
      ...overrideLab,
      suspicious: overrideLab.suspicious ?? next[index].suspicious ?? false,
      missing: overrideLab.missing ?? false,
      autoFilled: false,
      confidence: "high",
    };
  } else {
    next.push({
      ...overrideLab,
      autoFilled: false,
      confidence: "high",
    });
  }

  return next;
}

function parseUmcA1cOverride(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return null;

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc || !normalized.includes("hemoglobin a1c")) return null;

  const a1cLab =
    findLabByAlias("hemoglobin a1c") ||
    findLabByAlias("a1c");

  if (!a1cLab) return null;

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const norm = normalizeLine(lines[i]);

    if (!norm.includes("hemoglobin a1c")) continue;

    const nearbyWindow = lines
      .slice(Math.max(0, i - 2), Math.min(lines.length, i + 8))
      .map((line) => normalizeLine(line));

    const looksLikeRealResultBlock =
      nearbyWindow.includes("procedure") &&
      nearbyWindow.includes("result");

    if (!looksLikeRealResultBlock) continue;

    let sawResult = false;

    for (let j = i; j < Math.min(lines.length, i + 12); j += 1) {
      const raw = lines[j];
      const rawNorm = normalizeLine(raw);

      if (!rawNorm) continue;

      if (rawNorm === "result") {
        sawResult = true;
        continue;
      }

      if (!sawResult) continue;

      if (
        rawNorm.includes("average blood glucose") ||
        rawNorm.includes("poor control") ||
        rawNorm.includes("normal") ||
        rawNorm.includes("action") ||
        rawNorm.includes("suggested") ||
        rawNorm.includes("goal") ||
        rawNorm.includes("new reference range") ||
        rawNorm.includes("specimens containing")
      ) {
        break;
      }

      const numbers = extractAllNumbersFromLine(raw);
      if (!numbers.length) continue;

      const candidate = numbers.find((n) => n >= 3 && n <= 20);
      if (candidate === undefined) continue;

      return buildParsedLab(
        a1cLab,
        "Hemoglobin A1C",
        raw,
        candidate
      );
    }
  }

  return null;
}

function parseUmcEgfrOverride(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return null;

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc || !normalized.includes("egfr")) return null;

  const egfrLab =
    findLabByAlias("egfr") ||
    findLabByAlias("e gfr") ||
    findLabByAlias("estimated gfr");

  if (!egfrLab) return null;

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const norm = normalizeLine(lines[i]);

    if (!norm.includes("egfr")) continue;

    // Case 1: same-line numeric result
    const sameLineNums = extractAllNumbersFromLine(lines[i]).filter(
      (n) => n >= 10 && n <= 250
    );
    if (sameLineNums.length > 0) {
      return buildParsedLab(egfrLab, "eGFR (IDMS)", lines[i], sameLineNums[0]);
    }

    // Case 2: look backward first for the actual Result row
    for (let j = Math.max(0, i - 4); j < i; j += 1) {
      const look = lines[j];
      const lookNorm = normalizeLine(look);

      if (!lookNorm) continue;
      if (lookNorm === "result") continue;
      if (
        lookNorm.includes("reference range") ||
        lookNorm.includes("footnote") ||
        lookNorm.includes("units") ||
        lookNorm === "01" ||
        lookNorm === "^1" ||
        lookNorm === "^2"
      ) {
        continue;
      }

      const nums = extractAllNumbersFromLine(look).filter(
        (n) => n >= 10 && n <= 250
      );
      if (nums.length > 0) {
        return buildParsedLab(egfrLab, "eGFR (IDMS)", look, nums[0]);
      }
    }

    // Case 3: then look forward, but reject tiny footnote numbers
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j += 1) {
      const look = lines[j];
      const lookNorm = normalizeLine(look);

      if (!lookNorm) continue;
      if (
        lookNorm.includes("reference range") ||
        lookNorm.includes("footnote") ||
        lookNorm.includes("units") ||
        lookNorm === "01" ||
        lookNorm === "^1" ||
        lookNorm === "^2"
      ) {
        continue;
      }

      const nums = extractAllNumbersFromLine(look).filter(
        (n) => n >= 10 && n <= 250
      );
      if (nums.length > 0) {
        return buildParsedLab(egfrLab, "eGFR (IDMS)", look, nums[0]);
      }
    }
  }

  return null;
}

function parseUmcLdlOverride(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return null;

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc || !normalized.includes("ldl calculated")) return null;

  const ldlLab = findLabByAlias("ldl calculated") || findLabByAlias("ldl");
  if (!ldlLab) return null;

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const norm = normalizeLine(lines[i]);
    if (!norm.includes("ldl calculated")) continue;

    // same-line value first
    const sameLineNums = extractAllNumbersFromLine(lines[i]).filter(
      (n) => n >= 20 && n <= 250
    );
    if (sameLineNums.length > 0) {
      return buildParsedLab(ldlLab, "LDL Calculated", lines[i], sameLineNums[0]);
    }

    // immediate forward numeric value only
    for (let j = i + 1; j < Math.min(lines.length, i + 3); j += 1) {
      const look = lines[j];
      const lookNorm = normalizeLine(look);

      if (!lookNorm) continue;
      if (
        lookNorm.includes("adult levels") ||
        lookNorm.includes("optimal") ||
        lookNorm.includes("near optimal") ||
        lookNorm.includes("borderline") ||
        lookNorm.includes("very high") ||
        lookNorm.includes("calculated from") ||
        lookNorm === "^1" ||
        lookNorm === "^2" ||
        lookNorm === "01"
      ) {
        continue;
      }

      const nums = extractAllNumbersFromLine(look).filter(
        (n) => n >= 20 && n <= 250
      );
      if (nums.length > 0) {
        return buildParsedLab(ldlLab, "LDL Calculated", look, nums[0]);
      }
    }
  }

  return null;
}

function parseUmcDifferentialPercentOverrides(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return [];

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc || !normalized.includes("differential")) return [];

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const configs = [
    {
      contains: "automated segmented",
      alias: "segmented neutrophils",
      rawLabel: "Automated Segmented Neutrophils",
    },
    {
      contains: "automated lymphocytes",
      alias: "lymphocytes",
      rawLabel: "Automated Lymphocytes",
    },
    {
      contains: "automated monocytes",
      alias: "monocytes",
      rawLabel: "Automated Monocytes",
    },
    {
      contains: "automated eosinophils",
      alias: "eosinophils",
      rawLabel: "Automated Eosinophils",
    },
    {
      contains: "automated basophils",
      alias: "basophils",
      rawLabel: "Automated Basophils",
    },
  ];

  const overrides = [];

  for (const config of configs) {
    const lab = findLabByAlias(config.alias);
    if (!lab) continue;

    for (const line of lines) {
      const norm = normalizeLine(line);
      if (!norm.includes(config.contains)) continue;

      const nums = extractAllNumbersFromLine(line).filter(
        (n) => n >= 0 && n <= 100
      );

      if (!nums.length) continue;

      overrides.push(
        buildParsedLab(lab, config.rawLabel, line, nums[0])
      );
      break;
    }
  }

  return overrides;
}

function parseUmcHivPage(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return [];

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc || !normalized.includes("hiv screen")) return [];

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const otherLabHits = lines.filter((line) => {
    const lab = findLabMatch(line);
    return lab && lab.key !== "hiv_1_2_ab_ag";
  }).length;

  // only hijack true HIV-focused packets
  if (otherLabHits > 3) return [];

  const hivLab = findLabMatch("HIV Screen");
  if (!hivLab) return [];

  let sawResult = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normalizedLine = normalizeLine(line);

    if (/^result$/i.test(line)) {
      sawResult = true;
      continue;
    }

    if (!sawResult) continue;

    if (
      isHeaderLine(line) ||
      isIgnoredNarrativeLine(line) ||
      isIgnoredUmcStaffLine(line) ||
      isLikelyMultiLabSummaryLine(line)
    ) {
      continue;
    }

    if (normalizedLine.includes("non reactive") || normalizedLine.includes("nonreactive")) {
      return [buildParsedLab(hivLab, "HIV Screen", line, "Non-Reactive")];
    }

    if (normalizedLine.includes("not detected")) {
      return [buildParsedLab(hivLab, "HIV Screen", line, "Not Detected")];
    }

    if (
      normalizedLine === "reactive" ||
      normalizedLine.startsWith("reactive ") ||
      normalizedLine.endsWith(" reactive")
    ) {
      return [buildParsedLab(hivLab, "HIV Screen", line, "Reactive")];
    }
  }

  return [];
}

function parseUmcImmunologyRows(rawText = "") {
  const normalized = normalizeLine(rawText);
  if (!normalized) return [];

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  const hasHepatitisRows =
    normalized.includes("hepatitis a ab igg") ||
    normalized.includes("hepatitis a ab igm") ||
    normalized.includes("hepatitis b core ab igg") ||
    normalized.includes("hepatitis b surface ag") ||
    normalized.includes("hepatitis c ab igg");

  if (!hasUmc || !hasHepatitisRows) return [];

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const results = [];

  function pushExactSameLine(label) {
    const lab = findLabMatch(label);
    if (!lab) return;

    for (const line of lines) {
      const normalizedLine = normalizeLine(line);
      if (!normalizedLine.includes(normalizeLine(label))) continue;

      // skip list/summary lines
      if (
        normalizedLine.includes("please note") ||
        normalizedLine.includes("test methodology") ||
        normalizedLine.includes("hepatitis a ab igg hepatitis a ab igm") ||
        normalizedLine.includes("reference range")
      ) {
        continue;
      }

      if (normalizedLine.includes("non reactive") || normalizedLine.includes("nonreactive")) {
        results.push(buildParsedLab(lab, label, line, "Non-Reactive"));
        return;
      }

      if (normalizedLine.includes("not detected")) {
        results.push(buildParsedLab(lab, label, line, "Not Detected"));
        return;
      }

      // only allow reactive if non-reactive is not present on same line
      if (
        normalizedLine.includes("reactive") &&
        !normalizedLine.includes("non reactive") &&
        !normalizedLine.includes("nonreactive")
      ) {
        results.push(buildParsedLab(lab, label, line, "Reactive"));
        return;
      }
    }
  }

  pushExactSameLine("Hepatitis A Ab IgG");
  pushExactSameLine("Hepatitis A Ab IgM");
  pushExactSameLine("Hepatitis B Core Ab IgG");
  pushExactSameLine("Hepatitis B Surface Ag");
  pushExactSameLine("Hepatitis C Ab IgG");

  return dedupeParsedLabs(results);
}

function applyUmcKnownRowOverrides(rawText = "", parsedLabs = []) {
  const normalized = normalizeLine(rawText);
  if (!normalized) return parsedLabs || [];

  const hasUmc =
    normalized.includes("umc health system") ||
    normalized.includes("umc hospital lab");

  if (!hasUmc) return parsedLabs || [];

  const lines = String(rawText || "")
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const nextLabs = [...(parsedLabs || [])];

  function upsertLab(label, value, rawLine) {
    const matchedLab = findLabMatch(label);
    if (!matchedLab) return;

    const replacement = buildParsedLab(
      matchedLab,
      label,
      rawLine || label,
      value
    );

    const existingIndex = nextLabs.findIndex((lab) => lab.key === matchedLab.key);

    if (existingIndex >= 0) {
      nextLabs[existingIndex] = {
        ...nextLabs[existingIndex],
        ...replacement,
        suspicious: false,
        confidence: "high",
        autoFilled: false,
        missing: value === null || value === undefined,
      };
    } else {
      nextLabs.push(replacement);
    }
  }

  function extractNearbyCategorical(anchorLabel, lookahead = 12) {
    const anchorNorm = normalizeLine(anchorLabel);

    for (let i = 0; i < lines.length; i += 1) {
      const lineNorm = normalizeLine(lines[i]);
      if (!lineNorm.includes(anchorNorm)) continue;

      for (let j = i; j < Math.min(lines.length, i + lookahead); j += 1) {
        const raw = lines[j];
        const norm = normalizeLine(raw);
        if (!norm) continue;

        if (
          norm.includes("please note") ||
          norm.includes("test methodology") ||
          norm.includes("interpretation") ||
          norm.includes("diagnostic considerations") ||
          norm.includes("pending lab summary")
        ) {
          break;
        }

        if (norm.includes("non reactive") || norm.includes("nonreactive")) {
          return { rawLine: raw, value: "Non-Reactive" };
        }

        if (norm.includes("not detected")) {
          return { rawLine: raw, value: "Not Detected" };
        }

        if (
          norm === "reactive" ||
          norm.startsWith("reactive ") ||
          norm.endsWith(" reactive")
        ) {
          return { rawLine: raw, value: "Reactive" };
        }
      }
    }

    return null;
  }

  function extractExactLineOrNearbyCategorical(label) {
    const labelNorm = normalizeLine(label);

    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const norm = normalizeLine(raw);
      if (!norm.includes(labelNorm)) continue;

      if (
        norm.includes("hepatitis a ab igg hepatitis a ab igm") ||
        norm.includes("please note") ||
        norm.includes("test methodology")
      ) {
        continue;
      }

      if (norm.includes("non reactive") || norm.includes("nonreactive")) {
        return { rawLine: raw, value: "Non-Reactive" };
      }

      if (norm.includes("not detected")) {
        return { rawLine: raw, value: "Not Detected" };
      }

      if (
        norm.includes("reactive") &&
        !norm.includes("non reactive") &&
        !norm.includes("nonreactive")
      ) {
        return { rawLine: raw, value: "Reactive" };
      }

      for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
        const rawNext = lines[j];
        const normNext = normalizeLine(rawNext);

        if (!normNext) continue;

        if (
          normNext.includes("please note") ||
          normNext.includes("test methodology") ||
          normNext.includes("reference range")
        ) {
          break;
        }

        if (normNext.includes("non reactive") || normNext.includes("nonreactive")) {
          return { rawLine: rawNext, value: "Non-Reactive" };
        }

        if (normNext.includes("not detected")) {
          return { rawLine: rawNext, value: "Not Detected" };
        }

        if (
          normNext === "reactive" ||
          normNext.startsWith("reactive ") ||
          normNext.endsWith(" reactive")
        ) {
          return { rawLine: rawNext, value: "Reactive" };
        }
      }
    }

    return null;
  }

  function extractForwardNumericByRange(label, lookahead = 14) {
    const matchedLab = findLabMatch(label);
    if (!matchedLab) return null;

    const range = parseExpectedRange(matchedLab.expectedRangeText || "");
    if (!range) return null;

    const labelNorm = normalizeLine(label);

    for (let i = 0; i < lines.length; i += 1) {
      const lineNorm = normalizeLine(lines[i]);
      if (!lineNorm.includes(labelNorm)) continue;

      const rawCandidates = [];
      const rescuedCandidates = [];

      for (let j = i + 1; j < Math.min(lines.length, i + lookahead); j += 1) {
        const raw = lines[j];

        if (isAddressOrLocationLine(raw)) continue;

        const nums = extractAllNumbersFromLine(raw);

        for (const n of nums) {
          if (n >= range.min && n <= range.max) {
            rawCandidates.push({ rawLine: raw, value: n });
            continue;
          }

          const rescued = rescueNumericValueByRange(n, matchedLab);
          if (rescued >= range.min && rescued <= range.max) {
            rescuedCandidates.push({ rawLine: raw, value: rescued });
          }
        }
      }

      if (rawCandidates.length > 0) {
        const filtered = rawCandidates.filter((c) => c.value > 2);

        if (filtered.length > 0) {
          return filtered[0];
        }

        return rawCandidates[0];
      }

      if (rescuedCandidates.length > 0) {
        return rescuedCandidates[0];
      }
    }

    return null;
  }

  const hivResult = extractNearbyCategorical("HIV Screen", 12);
  if (hivResult) upsertLab("HIV Screen", hivResult.value, hivResult.rawLine);

  const hepAigg = extractExactLineOrNearbyCategorical("Hepatitis A Ab IgG");
  if (hepAigg) upsertLab("Hepatitis A Ab IgG", hepAigg.value, hepAigg.rawLine);

  const hepAigm = extractExactLineOrNearbyCategorical("Hepatitis A Ab IgM");
  if (hepAigm) upsertLab("Hepatitis A Ab IgM", hepAigm.value, hepAigm.rawLine);

  const hepBcore = extractExactLineOrNearbyCategorical("Hepatitis B Core Ab IgG");
  if (hepBcore) upsertLab("Hepatitis B Core Ab IgG", hepBcore.value, hepBcore.rawLine);

  const hepBsAg = extractExactLineOrNearbyCategorical("Hepatitis B Surface Ag");
  if (hepBsAg) upsertLab("Hepatitis B Surface Ag", hepBsAg.value, hepBsAg.rawLine);

  const hepCAb = extractExactLineOrNearbyCategorical("Hepatitis C Ab IgG");
  if (hepCAb) upsertLab("Hepatitis C Ab IgG", hepCAb.value, hepCAb.rawLine);

  const sodiumResult = extractForwardNumericByRange("Sodium Level", 14);
  if (sodiumResult) upsertLab("Sodium Level", sodiumResult.value, "Sodium Level");

  const chlorideResult = extractForwardNumericByRange("Chloride Level", 14);
  if (chlorideResult) upsertLab("Chloride Level", chlorideResult.value, "Chloride Level");

  // Fix: "Anion Gap without Potassium" broken row
  const anionGapResult = extractForwardNumericByRange("Anion Gap", 20);

  if (anionGapResult) {
    upsertLab("Anion Gap", anionGapResult.value, "Anion Gap without Potassium");
  }

  return nextLabs;
}

function mergeBrokenLabelLines(lines = []) {
  const merged = [];

  for (let i = 0; i < lines.length; i++) {
    let current = lines[i];
    const next = lines[i + 1];

    if (
      current &&
      next &&
      current.length < 25 &&
      !extractAllNumbersFromLine(current).length &&
      !extractCategoricalValue(current) &&
      !isHeaderLine(current)
    ) {
      const combined = `${current} ${next}`;
      if (findLabMatch(combined)) {
        merged.push(combined);
        i++; // skip next
        continue;
      }
    }

    merged.push(current);
  }

  return merged;
}

function normalizeCbcInterleaving(lines = []) {
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const a = String(lines[i] || "").trim();
    const b = String(lines[i + 1] || "").trim();
    const c = String(lines[i + 2] || "").trim();
    const d = String(lines[i + 3] || "").trim();
    const e = String(lines[i + 4] || "").trim();
    const f = String(lines[i + 5] || "").trim();
    const g = String(lines[i + 6] || "").trim();

    const aC = normalizeCompact(a);
    const bC = normalizeCompact(b);
    const cC = normalizeCompact(c);

    // MPV / NRBC / NRBC Absolute / 10.4 / fL / 0.0 / 0.000
    if (
      aC === "mpv" &&
      bC.includes("nrbc") &&
      cC.includes("nrbcabsolute") &&
      extractNumberFromLine(d) !== null
    ) {
      out.push(a);
      out.push(d);
      if (e) out.push(e);

      out.push(b);
      if (extractNumberFromLine(f) !== null) out.push(f);

      out.push(c);
      if (extractNumberFromLine(g) !== null) {
        out.push(g);
        i += 6;
      } else {
        i += 5;
      }
      continue;
    }

    // NRBC% / NRBC Absolute / 0.0 / /100WBC / 0.000
    if (
      aC.includes("nrbc") &&
      bC.includes("nrbcabsolute") &&
      extractNumberFromLine(c) !== null
    ) {
      out.push(a);
      out.push(c);

      out.push(b);
      if (extractNumberFromLine(e) !== null) {
        out.push(e);
        i += 4;
        continue;
      }
    }

    out.push(a);
  }

  return out;
}

function mergeDifferentialLabelLines(lines = []) {
  const merged = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = String(lines[i] || "").trim();
    const next = String(lines[i + 1] || "").trim();

    if (!current) continue;

    const combined = `${current} ${next}`.trim();
    const compact = normalizeCompact(combined);

    const shouldMerge =
      compact.includes("automatedabsoluteneutrophils") ||
      compact.includes("automatedabsolutelymphs") ||
      compact.includes("automatedabsolutemonocytes") ||
      compact.includes("automatedabsoluteeosinophils") ||
      compact.includes("automatedabsolutebasophils") ||
      compact.includes("automatedimmaturegranulocytes") ||
      compact.includes("automatedsegmentedneutrophils") ||
      compact.includes("automatedlymphocytes") ||
      compact.includes("automatedmonocytes") ||
      compact.includes("automatedeosinophils") ||
      compact.includes("automatedbasophils");

    if (shouldMerge) {
      merged.push(combined);
      i += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

export function parseLabsFromText(
  rawText = "",
  existingLabs = [],
  currentEncounterDate = null
) {
  if (!rawText) return [];

  const umcThyroidResults = parseUmcThyroidSingleTestPacket(rawText);
  if (umcThyroidResults.length > 0) {
    const deduped = dedupeParsedLabs(umcThyroidResults);
    const expanded = expandPanels(deduped);
    return checkDuplicates(expanded, existingLabs, currentEncounterDate);
  }

  const umcHivResults = parseUmcHivPage(rawText);
  const umcImmunologyResults = parseUmcImmunologyRows(rawText);

  let lines = String(rawText || "")
  .split("\n")
  .map((line) => String(line || "").trim())
  .filter(Boolean);

lines = mergeBrokenLabelLines(lines);
lines = mergeDifferentialLabelLines(lines);
lines = normalizeCbcInterleaving(lines);

  const results = [...umcHivResults, ...umcImmunologyResults];
  const consumed = new Set();
  const umcMode = isUmcLabText(rawText);

  for (let i = 0; i < lines.length; i += 1) {
  const currentLine = String(lines[i] || "").trim();
  if (!currentLine) continue;

  if (
    isHeaderLine(currentLine) ||
    isIgnoredNarrativeLine(currentLine) ||
    isMorphologyNarrativeLine(currentLine) ||
    isIgnoredUmcStaffLine(currentLine) ||
    isLikelyMultiLabSummaryLine(currentLine)
  ) {
    continue;
  }

  const matchedLab = findLabMatch(currentLine);
  if (!matchedLab) continue;

  const inlineValue = parseInlineLabValueFromSameLine(currentLine, matchedLab);
  if (inlineValue !== null && inlineValue !== undefined) {
    results.push(buildParsedLab(matchedLab, currentLine, currentLine, inlineValue));
    consumed.add(i);
    continue;
  }

  const nextLine = lines[i + 1] || "";
  const nextTwoLine = lines[i + 2] || "";

    // IMPORTANT:
    // allow structured parsing for UMC too, otherwise UMC "Procedure / Result" rows get missed
    const useStructured = shouldUseStructuredParsing(lines, i, matchedLab);
const structuredValue = useStructured
  ? findStructuredResultValue(lines, i, matchedLab, umcMode)
  : null;

if (structuredValue) {
  results.push(
    buildParsedLab(
      matchedLab,
      currentLine,
      structuredValue.line,
      structuredValue.value,
      {
        parseMethod: "structured_result",
        matchIndex: i,
        valueLineIndex: null,
        valueSourceLine: structuredValue.line,
      }
    )
  );
  consumed.add(i);
  continue;
}

    if (isLikelyValueLine(nextLine, matchedLab)) {
      results.push(buildParsedLab(matchedLab, currentLine, nextLine));
      consumed.add(i);
      consumed.add(i + 1);
      continue;
    }

    // Allow 2-line lookahead even if nextLine is noisy (units / OCR junk)
// Allow 2-line lookahead even if nextLine is noisy (units / OCR junk)
if (
  !isBoundaryLine(nextLine) &&
  !isIgnoredNarrativeLine(nextLine) &&
  isLikelyValueLine(nextTwoLine, matchedLab)
) {
  results.push(buildParsedLab(matchedLab, currentLine, nextTwoLine));
  consumed.add(i);
  consumed.add(i + 2);
  continue;
}

    const bestCandidate = findBestValueCandidate(lines, i, matchedLab);
if (bestCandidate) {
  results.push(
    buildParsedLab(
      matchedLab,
      currentLine,
      bestCandidate.line,
      bestCandidate.value,
      {
        parseMethod: "best_candidate",
        matchIndex: i,
        valueLineIndex: bestCandidate.index,
        valueSourceLine: bestCandidate.line,
        candidateNumbers: bestCandidate.candidateNumbers || [],
        debugCandidates: bestCandidate.debugCandidates || [],
      }
    )
  );
  consumed.add(i);
  continue;
}

    results.push({
      key: matchedLab.key,
      displayName: matchedLab.displayName,
      group: matchedLab.group,
      value: null,
      rawLine: currentLine,
      suspicious: false,
      expectedRangeText: matchedLab.expectedRangeText || "",
      missing: true,
      confidence: "low",
      autoFilled: false,
      duplicateType: null,
      duplicateInfo: null,
    });

    consumed.add(i);
  }

  let deduped = dedupeParsedLabs(results);

  // UMC-specific row repairs first
  deduped = applyUmcKnownRowOverrides(rawText, deduped);

  // A1c override
  const a1cOverride = parseUmcA1cOverride(rawText);
  if (a1cOverride) {
    deduped = upsertOverrideLab(deduped, a1cOverride);
  }

  // eGFR override
  const egfrOverride = parseUmcEgfrOverride(rawText);
  if (egfrOverride) {
    deduped = deduped.filter(
      (lab) => !lab.key || String(lab.key).toLowerCase() !== "egfr"
    );
    deduped = upsertOverrideLab(deduped, egfrOverride);
  }

  // LDL override
  const ldlOverride = parseUmcLdlOverride(rawText);
  if (ldlOverride) {
    deduped = deduped.filter(
      (lab) => !lab.key || String(lab.key).toLowerCase() !== "ldl"
    );
    deduped = upsertOverrideLab(deduped, ldlOverride);
  }

  // Differential % override
  const differentialOverrides = parseUmcDifferentialPercentOverrides(rawText);
  for (const overrideLab of differentialOverrides) {
    deduped = upsertOverrideLab(deduped, overrideLab);
  }

  const expanded = expandPanels(deduped);
  return checkDuplicates(expanded, existingLabs, currentEncounterDate);
}