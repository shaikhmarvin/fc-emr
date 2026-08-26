import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { createPatientInSupabase, updatePatientInSupabase, mergePatientsByMrnInSupabase, mergePatientsInSupabase } from "./api/patients";
import {
  parseLabsFromText,
  extractPatientNameFromLabText as extractPatientNameFromLabTextFromParser,
  formatPatientName,
} from "./lib/labParser";
window.testLabParser = parseLabsFromText;
import LabImportView from "./components/LabImportView";
import LabQueueView from "./components/LabQueueView";
import {
  createEncounterInSupabase,
  updateEncounterInSupabase,
  assignNextRefillNumberInSupabase,
  createMedicationInSupabase,
  updateMedicationInSupabase,
  deleteMedicationInSupabase,
  deleteEncounterInSupabase,
  createRefillRequest,
  fetchRefillRequests,
  approveRefillRequestInSupabase,
  deleteRefillRequestInSupabase,
  deleteRefillRequestsForPatient,
  completePhysicalTherapyNoteInSupabase,
} from "./api/encounters";
import {
  fetchStaffRoster,
  saveStaffRoster,
} from "./api/clinicStaffRoster";
import { useAuthSession } from "./hooks/useAuthSession";
import { useClinicData } from "./hooks/useClinicData";
import {
  fetchClinicResourceSettings,
  updateClinicResourceSetting,
} from "./api/clinicResourceSettings";
import {
  clearActiveBoardMessage,
  deleteBoardMessageTemplate,
  displayBoardMessage,
  fetchBoardMessages,
  saveBoardMessageTemplate,
} from "./api/boardMessages";
import ToastStack from "./components/ToastStack";
import { canStartIntake, canManageRoomBoard, canEditFormulary, canPrescribe, canChart, canUseLabQueue, } from "./utils/permissions";
import { fetchProfiles, updateProfileRole, updateProfileDetails, saveClinicalSignature } from "./api/profiles";
import { fetchChartingSettings, setMedicalSoapEnabled } from "./api/chartingSettings";
import {
  saveSocialWorkNote as saveSocialWorkNoteInSupabase,
  completeSocialWorkNote as completeSocialWorkNoteInSupabase,
} from "./api/socialWorkNotes";
import { createAuditLog, fetchAuditLogForEncounter } from "./api/audit";
import { sendPasswordReset } from "./api/auth";
import PatientSearch from "./components/PatientSearch";
import PatientTable from "./components/PatientTable";
import PatientInfoEditModal from "./components/PatientInfoEditModal";
import SignaturePadModal from "./components/SignaturePadModal";
import { deletePatientInSupabase } from "./api/patients";
import QueueView from "./components/QueueView";
import RoomBoard from "./components/RoomBoard";
import MedicationModal from "./components/MedicationModal";
import { createAllergyInSupabase, updateAllergyInSupabase, deleteAllergyInSupabase, } from "./api/allergies";
import AllergyModal from "./components/AllergyModal";
import IntakeModal from "./components/IntakeModal";
import UndergradIntakeView from "./components/UndergradIntakeView";
import RegistrationView from "./components/RegistrationView";
import SpecialtyQueueView from "./components/SpecialtyQueueView";
import UndergradRegistrationModal from "./components/UndergradRegistrationModal";
import ChartView from "./components/ChartView";
import BoardDisplay from "./components/BoardDisplay";
import {
  fetchFormularyItems,
  createFormularyItemInSupabase,
  updateFormularyItemInSupabase,
  deleteFormularyItemInSupabase,
} from "./api/formulary";
import FormularyView from "./components/FormularyView";
import AppSidebar from "./components/AppSidebar";
import UserManagementView from "./components/UserManagementView";
import AppHeader from "./components/AppHeader";
import StickyNotesModal from "./components/StickyNotesModal";
import DashboardView from "./components/DashboardView";
import ClinicSummaryView from "./components/ClinicSummaryView";
import ResearchView from "./components/ResearchView";
import { fetchResearchAccess, setResearchLeadershipAccess } from "./api/researchAccess";
import ProgramsView from "./components/ProgramsView";
import { fetchProgramSettings } from "./api/programSettings";
import PAPView from "./components/PAPView";
import {
  fetchProgramEntries,
  resetPhysicalTherapyStatusesForMonthEnd,
  createProgramEntryInSupabase,
  updateProgramEntryInSupabase,
  deleteProgramEntryInSupabase,
  deleteProgramEntriesForPatient,
} from "./api/programs";
import {
  fetchPapEntries,
  createPapEntryInSupabase,
  updatePapEntryInSupabase,
  deletePapEntryInSupabase,
  deletePapEntriesForPatient,
} from "./api/pap";
import {
  ROOM_OPTIONS,
  EMPTY_FORM,
  EMPTY_VITALS,
  EMPTY_MEDICATION,
  EMPTY_SEARCH,
  PT_TIME_SLOTS,
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  VISIT_TYPE_BADGE_STYLES,
} from "./constants";
import {
  calculateAge,
  getPatientBoardName,
  getFullPatientName,
  getStudentBoardName,
  formatWaitTime,
  isPapRestricted,
  getStatusClasses,
  calculateBmi,
  normalizeBp,
  normalizePain,
  normalizeHeight,
  createEncounterFromIntake,
  formatDate,
  formatClinicDate,
  normalizeClinicDate,
  canAssignRoom,
  mapDbStatusToUi,
  findPotentialDuplicatePatient,
  patientMatchesSearch,
  sortEncountersByDate,
} from "./utils";

function newReturningBadge(encounter) {
  const value = String(encounter?.newReturning || encounter?.new_returning || "").trim().toLowerCase();

  if (value === "new") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        New
      </span>
    );
  }

  if (value === "returning") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
        Returning
      </span>
    );
  }

  return null;
}

function PatientMergeComparisonModal({
  show,
  sourcePatient,
  targetPatient,
  intendedMrn,
  getFullPatientName,
  sourceDescription = "This chart will be merged and removed.",
  targetDescription,
  mergeSummary = "Merging moves encounters, medications, allergies, refill requests, PAP entries, and specialty tracker entries into the chart being kept.",
  actionLabel = "Merge Patients",
  onClose,
  onMerge,
}) {
  if (!show || !sourcePatient || !targetPatient) return null;

  const formatLocation = (patient) =>
    [patient.city, patient.state, patient.zipCode].filter(Boolean).join(", ") || "—";
  const formatEmergencyContact = (patient) =>
    [
      patient.emergencyContactName,
      patient.emergencyContactRelation,
      patient.emergencyContactPhone,
    ].filter(Boolean).join(" / ") || "—";

  const fields = [
    ["Name", getFullPatientName(sourcePatient), getFullPatientName(targetPatient)],
    ["DOB", sourcePatient.dob || "—", targetPatient.dob || "—"],
    ["MRN", intendedMrn || sourcePatient.mrn || "—", targetPatient.mrn || "—"],
    ["Phone", sourcePatient.phone || "—", targetPatient.phone || "—"],
    ["Last 4 SSN", sourcePatient.last4ssn || "—", targetPatient.last4ssn || "—"],
    ["Address", sourcePatient.address || "—", targetPatient.address || "—"],
    ["City/State/ZIP", formatLocation(sourcePatient), formatLocation(targetPatient)],
    ["Emergency Contact", formatEmergencyContact(sourcePatient), formatEmergencyContact(targetPatient)],
    ["Encounters", String(sourcePatient.encounters?.length || 0), String(targetPatient.encounters?.length || 0)],
  ];

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 px-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Possible Duplicate Patient</h2>
            <p className="mt-1 text-sm text-slate-600">
              MRN {intendedMrn || targetPatient.mrn} already belongs to another chart. Compare the records before merging.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Close
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Current Chart</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{getFullPatientName(sourcePatient)}</p>
            <p className="text-sm text-slate-600">{sourceDescription}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Chart To Keep</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{getFullPatientName(targetPatient)}</p>
            <p className="text-sm text-slate-600">{targetDescription || `This chart keeps MRN ${targetPatient.mrn || intendedMrn}.`}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[140px_1fr_1fr] bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="px-3 py-2">Field</div>
              <div className="border-l border-slate-200 px-3 py-2">Current Chart</div>
              <div className="border-l border-slate-200 px-3 py-2">Chart To Keep</div>
            </div>

            {fields.map(([label, sourceValue, targetValue]) => {
              const differs = String(sourceValue) !== String(targetValue);

              return (
                <div
                  key={label}
                  className={`grid grid-cols-[140px_1fr_1fr] border-t border-slate-200 text-sm ${differs ? "bg-amber-50/50" : "bg-white"}`}
                >
                  <div className="px-3 py-2 font-semibold text-slate-700">{label}</div>
                  <div className="border-l border-slate-200 px-3 py-2 text-slate-900">{sourceValue}</div>
                  <div className="border-l border-slate-200 px-3 py-2 text-slate-900">{targetValue}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {mergeSummary}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onMerge}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const WIDE_MERGE_REVIEW_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "preferredName", label: "Preferred Name" },
  { key: "dob", label: "DOB" },
  { key: "mrn", label: "MRN" },
  { key: "phone", label: "Phone" },
  { key: "last4ssn", label: "Last 4 SSN" },
  { key: "sex", label: "Sex" },
  { key: "ethnicity", label: "Ethnicity" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zipCode", label: "ZIP" },
  { key: "emergencyContactName", label: "Emergency Contact Name" },
  { key: "emergencyContactRelation", label: "Emergency Contact Relation" },
  { key: "emergencyContactPhone", label: "Emergency Contact Phone" },
  { key: "incomeRange", label: "Income Range" },
  { key: "spanishOnly", label: "Spanish Only" },
  { key: "ttuStudent", label: "TTU Student", type: "boolean" },
  { key: "fired", label: "Fired", type: "boolean" },
  { key: "firedAt", label: "Fired Date" },
  { key: "firedReason", label: "Fired Reason" },
];

function getMergeFieldValue(patient, field) {
  const value = patient?.[field.key];
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

function getMergeUpdateValue(field, value) {
  if (field.type === "boolean") {
    return String(value || "").toLowerCase() === "yes";
  }
  return value || "";
}

function normalizePatientMergeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getPatientMergeName(patient) {
  return `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
}

function mergeNameDistance(left = "", right = "") {
  const a = normalizePatientMergeText(left);
  const b = normalizePatientMergeText(right);

  if (!a) return b.length;
  if (!b) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function patientsLookMergeSimilar(left, right) {
  const leftName = getPatientMergeName(left);
  const rightName = getPatientMergeName(right);
  const leftFull = normalizePatientMergeText(leftName);
  const rightFull = normalizePatientMergeText(rightName);
  const leftFirst = normalizePatientMergeText(left?.firstName);
  const rightFirst = normalizePatientMergeText(right?.firstName);
  const leftLast = normalizePatientMergeText(left?.lastName);
  const rightLast = normalizePatientMergeText(right?.lastName);
  const leftMrn = String(left?.mrn || "").trim().toLowerCase();
  const rightMrn = String(right?.mrn || "").trim().toLowerCase();

  if (leftMrn && rightMrn && leftMrn === rightMrn) {
    return { matches: true, reason: "same MRN" };
  }

  if (leftFull && leftFull === rightFull) {
    return { matches: true, reason: "same normalized name" };
  }

  if (
    leftLast &&
    rightLast &&
    leftLast === rightLast &&
    leftFirst &&
    rightFirst &&
    (leftFirst[0] === rightFirst[0] ||
      leftFirst.startsWith(rightFirst) ||
      rightFirst.startsWith(leftFirst))
  ) {
    return { matches: true, reason: "same DOB and compatible first/last name" };
  }

  const distance = mergeNameDistance(leftName, rightName);
  const maxLength = Math.max(leftFull.length, rightFull.length);
  if (maxLength >= 5 && distance <= (maxLength <= 8 ? 1 : 2)) {
    return { matches: true, reason: "same DOB and similar name spelling" };
  }

  return { matches: false, reason: "" };
}

function buildWideMergeCandidates(patients = []) {
  const candidates = [];

  for (let i = 0; i < patients.length; i += 1) {
    for (let j = i + 1; j < patients.length; j += 1) {
      const patientA = patients[i];
      const patientB = patients[j];
      const dobA = String(patientA?.dob || "").trim();
      const dobB = String(patientB?.dob || "").trim();

      if (!dobA || !dobB || dobA !== dobB) continue;

      const match = patientsLookMergeSimilar(patientA, patientB);
      if (!match.matches) continue;

      candidates.push({
        id: `${patientA.id}-${patientB.id}`,
        patientA,
        patientB,
        reason: match.reason,
      });
    }
  }

  return candidates.sort((left, right) => {
    const leftCount =
      (left.patientA.encounters?.length || 0) +
      (left.patientB.encounters?.length || 0);
    const rightCount =
      (right.patientA.encounters?.length || 0) +
      (right.patientB.encounters?.length || 0);
    return rightCount - leftCount;
  });
}

function getPatientMergeCountLabel(patient) {
  const encounterCount = patient?.encounters?.length || 0;
  const medicationCount = patient?.medicationList?.length || 0;
  const allergyCount = patient?.allergyList?.length || 0;
  return `${encounterCount} encounters, ${medicationCount} meds, ${allergyCount} allergies`;
}

function WidePatientMergeReviewModal({
  show,
  candidates,
  getFullPatientName,
  onClose,
  onMerge,
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedCandidateId) ||
    candidates[0] ||
    null;

  const defaultKeepId = selectedCandidate
    ? (selectedCandidate.patientA.encounters?.length || 0) >=
      (selectedCandidate.patientB.encounters?.length || 0)
      ? selectedCandidate.patientA.id
      : selectedCandidate.patientB.id
    : "";

  const [keepPatientId, setKeepPatientId] = useState(defaultKeepId);
  const [fieldValues, setFieldValues] = useState({});
  const [isMerging, setIsMerging] = useState(false);

  const keepPatient =
    selectedCandidate?.patientA.id === keepPatientId
      ? selectedCandidate?.patientA
      : selectedCandidate?.patientB;
  const mergePatient =
    selectedCandidate?.patientA.id === keepPatientId
      ? selectedCandidate?.patientB
      : selectedCandidate?.patientA;

  useEffect(() => {
    if (!show || !selectedCandidate) return;

    const nextKeepId =
      (selectedCandidate.patientA.encounters?.length || 0) >=
      (selectedCandidate.patientB.encounters?.length || 0)
        ? selectedCandidate.patientA.id
        : selectedCandidate.patientB.id;

    setKeepPatientId(nextKeepId);
  }, [selectedCandidateId, selectedCandidate, show]);

  useEffect(() => {
    if (!show || !keepPatient || !mergePatient) return;

    const nextValues = {};
    WIDE_MERGE_REVIEW_FIELDS.forEach((field) => {
      const keepValue = getMergeFieldValue(keepPatient, field);
      const mergeValue = getMergeFieldValue(mergePatient, field);
      nextValues[field.key] = keepValue || mergeValue;
    });
    setFieldValues(nextValues);
  }, [show, keepPatient, mergePatient]);

  if (!show) return null;

  async function handleMerge() {
    if (!keepPatient || !mergePatient) return;

    const updates = {};
    WIDE_MERGE_REVIEW_FIELDS.forEach((field) => {
      updates[field.key] = getMergeUpdateValue(field, fieldValues[field.key]);
    });

    setIsMerging(true);
    try {
      await onMerge({
        sourcePatientId: mergePatient.id,
        targetPatientId: keepPatient.id,
        updates,
      });
    } finally {
      setIsMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                EMR-Wide Duplicate Review
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Review likely duplicates by same DOB and same/similar names. Choose the chart to keep, then confirm the final patient information.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isMerging}
              className="self-start rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            No likely duplicates found from the currently loaded patient records.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
            <div className="min-h-0 overflow-y-auto border-b bg-slate-50 p-4 lg:border-b-0 lg:border-r">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Likely duplicate pairs ({candidates.length})
              </p>
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                      selectedCandidate?.id === candidate.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-semibold text-slate-950">
                      {getFullPatientName(candidate.patientA)}
                    </div>
                    <div className="font-semibold text-slate-950">
                      {getFullPatientName(candidate.patientB)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      DOB {candidate.patientA.dob || "unknown"} - {candidate.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedCandidate && keepPatient && mergePatient && (
              <div className="min-h-0 overflow-y-auto p-5">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[selectedCandidate.patientA, selectedCandidate.patientB].map((patient) => {
                    const isKeep = String(patient.id) === String(keepPatientId);
                    return (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => setKeepPatientId(patient.id)}
                        className={`rounded-xl border p-4 text-left ${
                          isKeep
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {isKeep ? "Chart To Keep" : "Will Merge Into Kept Chart"}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          {getFullPatientName(patient)}
                        </p>
                        <p className="text-sm text-slate-600">
                          DOB {patient.dob || "-"} - MRN {patient.mrn || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getPatientMergeCountLabel(patient)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  This will move encounters, medications, allergies, refill requests, PAP entries, program entries, and sticky notes from the duplicate chart into the kept chart, then remove the duplicate chart.
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[170px_1fr_1fr_1.1fr] bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600">
                      <div className="px-3 py-2">Field</div>
                      <div className="border-l px-3 py-2">Kept Chart</div>
                      <div className="border-l px-3 py-2">Merging Chart</div>
                      <div className="border-l px-3 py-2">Final Value</div>
                    </div>
                    {WIDE_MERGE_REVIEW_FIELDS.map((field) => {
                      const keepValue = getMergeFieldValue(keepPatient, field);
                      const mergeValue = getMergeFieldValue(mergePatient, field);
                      const differs = keepValue !== mergeValue;

                      return (
                        <div
                          key={field.key}
                          className={`grid grid-cols-[170px_1fr_1fr_1.1fr] border-t text-sm ${
                            differs ? "bg-amber-50/60" : "bg-white"
                          }`}
                        >
                          <div className="px-3 py-2 font-semibold text-slate-700">
                            {field.label}
                          </div>
                          <div className="border-l px-3 py-2 text-slate-900">
                            {keepValue || "-"}
                          </div>
                          <div className="border-l px-3 py-2 text-slate-900">
                            {mergeValue || "-"}
                          </div>
                          <div className="border-l px-3 py-2">
                            {field.type === "boolean" ? (
                              <select
                                value={fieldValues[field.key] || "No"}
                                onChange={(event) =>
                                  setFieldValues((prev) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            ) : (
                              <input
                                value={fieldValues[field.key] || ""}
                                onChange={(event) =>
                                  setFieldValues((prev) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            )}
                            {differs && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFieldValues((prev) => ({
                                      ...prev,
                                      [field.key]: keepValue,
                                    }))
                                  }
                                  className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                                >
                                  Use kept
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFieldValues((prev) => ({
                                      ...prev,
                                      [field.key]: mergeValue,
                                    }))
                                  }
                                  className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                                >
                                  Use merging
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={!selectedCandidate || isMerging}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMerging ? "Merging..." : "Merge Reviewed Records"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getDailyVisitNumber(row) {
  const patient = row?.patient || {};
  const encounter = row?.encounter || {};

  // This is the temporary number on the paper card for today's clinic.
  // MRN is intentionally NOT used because it gets added later.
  const candidates = [
    encounter.dailyNumber, encounter.daily_number,
    encounter.cardNumber, encounter.card_number,
    encounter.queueNumber, encounter.queue_number,
    encounter.visitNumber, encounter.visit_number,
    encounter.registrationNumber, encounter.registration_number,
    encounter.patientNumber, encounter.patient_number,
    patient.dailyNumber, patient.daily_number,
    patient.cardNumber, patient.card_number,
    patient.queueNumber, patient.queue_number,
    patient.visitNumber, patient.visit_number,
    patient.registrationNumber, patient.registration_number,
    patient.patientNumber, patient.patient_number,
  ];

  for (const value of candidates) {
    const match = String(value || "").match(/\d+/);
    if (match) return Number(match[0]);
  }

  return Number.POSITIVE_INFINITY;
}

function sortRowsByDailyNumberThenTime(a, b) {
  const aNumber = getDailyVisitNumber(a);
  const bNumber = getDailyVisitNumber(b);

  if (aNumber !== bNumber) return aNumber - bNumber;

  const aTime = new Date(a?.encounter?.createdAt || 0).getTime();
  const bTime = new Date(b?.encounter?.createdAt || 0).getTime();
  return aTime - bTime;
}

function normalizeStudentNameForMatch(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNameEditDistance(left = "", right = "") {
  const a = String(left);
  const b = String(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previousDiagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const previousRowValue = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previousDiagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previousDiagonal = previousRowValue;
    }
  }

  return row[b.length];
}

function areLikelySameStudentName(left, right) {
  const a = normalizeStudentNameForMatch(left);
  const b = normalizeStudentNameForMatch(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aParts = a.split(" ");
  const bParts = b.split(" ");
  if (aParts.length < 2 || aParts.length !== bParts.length) return false;

  const aFirst = aParts[0];
  const bFirst = bParts[0];
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];
  const firstExact = aFirst === bFirst;
  const lastExact = aLast === bLast;
  const firstClose =
    Math.min(aFirst.length, bFirst.length) >= 4 && getNameEditDistance(aFirst, bFirst) <= 1;
  const lastClose =
    Math.min(aLast.length, bLast.length) >= 4 && getNameEditDistance(aLast, bLast) <= 1;

  // Require either the first or last name to match exactly. This corrects a
  // small typo without accidentally merging two different students.
  return (firstExact && lastClose) || (lastExact && firstClose);
}

function buildAssignedStudentSummary(rows = []) {
  const ignoredNames = new Set(["unassigned", "none", "n/a", "na", "-"]);
  const groups = [];

  rows.forEach(({ encounter }) => {
    const assignment = encounter?.assignedStudent || encounter?.assigned_student || "";

    String(assignment)
      .split("/")
      .map((name) => name.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .forEach((name) => {
        if (ignoredNames.has(normalizeStudentNameForMatch(name))) return;

        let group = groups.find((candidate) =>
          candidate.variants.some((variant) => areLikelySameStudentName(variant.name, name))
        );

        if (!group) {
          group = { variants: [] };
          groups.push(group);
        }

        const normalized = normalizeStudentNameForMatch(name);
        const existingVariant = group.variants.find(
          (variant) => normalizeStudentNameForMatch(variant.name) === normalized
        );

        if (existingVariant) existingVariant.count += 1;
        else group.variants.push({ name, count: 1 });
      });
  });

  return groups
    .map((group) =>
      [...group.variants].sort(
        (a, b) => b.count - a.count || b.name.length - a.name.length
      )[0]?.name
    )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

function getEncounterIntakeValue(encounter, ...keys) {
  const intakeData = encounter?.intakeData || encounter?.intake_data || {};

  for (const key of keys) {
    if (encounter?.[key] !== undefined && encounter?.[key] !== null && encounter?.[key] !== "") {
      return encounter[key];
    }

    if (intakeData?.[key] !== undefined && intakeData?.[key] !== null && intakeData?.[key] !== "") {
      return intakeData[key];
    }
  }

  return undefined;
}

function priorityBadge(encounter) {
  const transportation = getEncounterIntakeValue(encounter, "transportation");

  if (transportation === "Bus/Public Transport") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        Bus Priority
      </span>
    );
  }

  return null;
}

function spanishBadge(encounter) {
  const spanishSpeaking = getEncounterIntakeValue(encounter, "spanishSpeaking");

  if (spanishSpeaking === true || spanishSpeaking === "true" || spanishSpeaking === "Yes") {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
        Spanish
      </span>
    );
  }

  return null;
}

function htnBadge(encounter) {
  const hasHTN = getEncounterIntakeValue(encounter, "htn");

  if (hasHTN === true || hasHTN === "true" || hasHTN === "Yes") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
        HTN
      </span>
    );
  }

  return null;
}

function diabetesBadge(encounter) {
  const hasDM = getEncounterIntakeValue(encounter, "dm");

  if (hasDM === true || hasDM === "true" || hasDM === "Yes") {
    return (
      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
        DM
      </span>
    );
  }

  return null;
}

function fluBadge(encounter) {
  const fluShot = getEncounterIntakeValue(encounter, "fluShot");

  if (fluShot === "Interested" || fluShot === "Yes") {
    return (
      <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
        Flu
      </span>
    );
  }

  return null;
}

function elevatorBadge(encounter) {
  const needsElevator = getEncounterIntakeValue(encounter, "needsElevator");

  if (needsElevator === true || needsElevator === "true" || needsElevator === "Yes") {
    return (
      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
        Elevator
      </span>
    );
  }

  return null;
}

function papBadge(encounter) {
  const papStatus = getEncounterIntakeValue(encounter, "papStatus");

  if (papStatus === "Interested") {
    return (
      <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">
        Pap
      </span>
    );
  }

  return null;
}

function dualVisitBadge(encounter) {
  const intakeData = encounter?.intakeData || encounter?.intake_data || {};

  const visitType =
    encounter?.visitType ||
    encounter?.visit_type ||
    intakeData?.visitType ||
    intakeData?.visit_type ||
    "";

  const specialtyType =
    encounter?.specialtyType ||
    encounter?.specialty_type ||
    intakeData?.specialtyType ||
    intakeData?.specialty_type ||
    "";

  const isDualVisit =
    visitType === "both" ||
    encounter?.dualVisit === true ||
    intakeData?.dualVisit === true ||
    (visitType === "general" && Boolean(specialtyType));

  if (!isDualVisit) return null;

  const specialtyMap = {
    dermatology: "Derm",
    derm: "Derm",
    physical_therapy: "PT",
    physicaltherapy: "PT",
    pt: "PT",
    mental_health: "Mental Health",
    mentalhealth: "Mental Health",
    counseling: "Mental Health",
    addiction: "Addiction",
    ophthalmology: "Ophthalmology",
    optometry: "Optometry",
  };

  const specialtyLabel =
    specialtyMap[String(specialtyType).toLowerCase()] ||
    specialtyType ||
    "Specialty";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${VISIT_TYPE_BADGE_STYLES.both.badgeClass}`}>
      General + {specialtyLabel}
    </span>
  );
}

function pharmacyStatusBadge(encounter) {
  if (encounter?.pharmacyStatus === "meds_ready") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
        Meds Ready
      </span>
    );
  }

  if (encounter?.pharmacyStatus === "patient_sent") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
        Sent to Pharmacy
      </span>
    );
  }

  if (encounter?.pharmacyStatus === "picked_up") {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
        Meds Picked Up
      </span>
    );
  }

  if (encounter?.pharmacyStatus === "no_meds_needed") {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
        No Medications This Visit
      </span>
    );
  }

  if (encounter?.pharmacyStatus === "meds_not_picked_up") {
    return (
      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
        Meds Not Picked Up
      </span>
    );
  }

  return null;
}

async function runGoogleOCR(base64Images) {
  const { data, error } = await supabase.functions.invoke("google-ocr", {
    body: { images: base64Images },
  });

  if (error) {
    console.error("OCR error object:", error);

    try {
      const bodyText = await error.context?.text?.();
      console.error("OCR error body:", bodyText);
      throw new Error(bodyText || error.message || "OCR request failed");
    } catch {
      throw new Error(error.message || "OCR request failed");
    }
  }

  return data?.texts || [];
}

async function runGoogleOCRInChunks(base64Images = [], chunkSize = 16) {
  const allTexts = [];

  for (let i = 0; i < base64Images.length; i += chunkSize) {
    const chunk = base64Images.slice(i, i + chunkSize);
    const texts = await runGoogleOCR(chunk);
    allTexts.push(...(texts || []));
  }

  return allTexts;
}


function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeLabCounts(labs = []) {
  let missing_count = 0;
  let autofilled_count = 0;
  let needs_review_count = 0;
  let valued_count = 0;
  let suspicious_count = 0;
  let duplicate_count = 0;

  labs.forEach((lab) => {
    const isMissing = lab.missing === true || lab.value == null || lab.value === "";
    const isAutofilled = lab.autoFilled === true;

    const isSuspicious =
      lab.suspicious === true ||
      lab.duplicateType === "same_encounter" ||
      lab.duplicateType === "recent";

    if (isMissing) missing_count++;
    if (!isMissing) valued_count++;
    if (isAutofilled) autofilled_count++;
    if (isSuspicious) suspicious_count++;
    if (lab.duplicateType) duplicate_count++;
    if (isSuspicious || isMissing) needs_review_count++;
  });

  return {
    total_count: labs.length,
    valued_count,
    missing_count,
    autofilled_count,
    suspicious_count,
    duplicate_count,
    needs_review_count,
    fill_percent: labs.length ? Math.round((valued_count / labs.length) * 100) : 0,
  };
}

function categorizeLabsForExport(labs = []) {
  const trueMissingLabs = [];
  const panelPlaceholders = [];
  const suspiciousLabs = [];

  labs.forEach((lab) => {
    const isMissing = lab.missing === true || lab.value == null || lab.value === "";
    const isAutofilled = lab.autoFilled === true;

    const isSuspicious =
      lab.suspicious === true ||
      lab.duplicateType === "same_encounter" ||
      lab.duplicateType === "recent";

    // 🔴 TRUE missing (should exist but no value)
    if (isMissing && !isAutofilled) {
      trueMissingLabs.push(lab);
    }

    // ⚪ panel placeholders (expected but intentionally blank)
    if (isMissing && isAutofilled) {
      panelPlaceholders.push(lab);
    }

    // 🟡 suspicious
    if (isSuspicious) {
      suspiciousLabs.push(lab);
    }
  });

  return {
    trueMissingLabs,
    panelPlaceholders,
    suspiciousLabs,
  };
}

export default function App() {
  async function testSupabaseConnection() {
    const { error } = await supabase.from("patients").select("*").limit(1);

    if (error) {
      console.error(error);
      showToast({
        title: "Supabase error",
        message: error.message,
        type: "error",
      });
    } else {
      showToast({
        title: "Connection works",
        message: "Supabase is reachable.",
        type: "success",
      });
    }
  }

  const [toasts, setToasts] = useState([]);

  function dismissToast(toastId) {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }

  function showToast({
    title = "Notice",
    message = "",
    type = "info",
    duration = 3500,
    onClick = null,
    actionLabel = "",
  }) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setToasts((prev) => [
      ...prev,
      { id, title, message, type, onClick, actionLabel },
    ]);

    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }

  const {
    session,
    userRole,
    authReady,
    isLeadershipView,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authFullName,
    setAuthFullName,
    authClassification,
    setAuthClassification,
    authLoading,
    authMessage,
    handleSignUp,
    handleSignIn,
    handleSignOut,
    handleResetSession,
    needsOnboarding,
    onboardingFullName,
    setOnboardingFullName,
    onboardingClassification,
    setOnboardingClassification,
    handleCompleteOnboarding,
    authRole,
    setAuthRole,
    authPin,
    setAuthPin,
    authPinConfirm,
    setAuthPinConfirm,
    canRefillAccess,
  } = useAuthSession();

  useEffect(() => {
    const lastButtonActivation = new WeakMap();
    const repeatClickBufferMs = 900;

    function preventRapidRepeatButtonClick(event) {
      const button = event.target instanceof Element
        ? event.target.closest("button")
        : null;
      if (!button || button.disabled) return;

      const now = performance.now();
      const lastActivatedAt = lastButtonActivation.get(button);
      if (lastActivatedAt !== undefined && now - lastActivatedAt < repeatClickBufferMs) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      lastButtonActivation.set(button, now);
    }

    document.addEventListener("click", preventRapidRepeatButtonClick, true);
    return () => {
      document.removeEventListener("click", preventRapidRepeatButtonClick, true);
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function updateLastSeen() {
      try {
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", session.user.id);

        await loadProfiles(); // refresh UI immediately
      } catch (err) {
        console.error("Failed to update last_seen_at:", err);
      }
    }

    updateLastSeen();
  }, [session]);

  async function addFormularyItem(itemForm) {
    try {
      const saved = await createFormularyItemInSupabase(itemForm);
      setFormulary((prev) => [saved, ...prev]);
    } catch (error) {
      console.error("Failed to add formulary item:", error);
      alert(error.message);
    }
  }

  async function editFormularyItem(itemId, itemForm) {
    try {
      const saved = await updateFormularyItemInSupabase(itemId, itemForm);
      setFormulary((prev) =>
        prev.map((item) => (item.id === itemId ? saved : item))
      );
    } catch (error) {
      console.error("Failed to update formulary item:", error);
      alert(error.message);
    }
  }

  async function removeFormularyItem(itemId) {
    try {
      await deleteFormularyItemInSupabase(itemId);
      setFormulary((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Failed to delete formulary item:", error);
      alert(error.message);
    }
  }

  async function toggleFormularyStock(itemId) {
    const item = formulary.find((entry) => entry.id === itemId);
    if (!item) return;

    try {
      const saved = await updateFormularyItemInSupabase(itemId, {
        inStock: !item.inStock,
      });

      setFormulary((prev) =>
        prev.map((entry) => (entry.id === itemId ? saved : entry))
      );
    } catch (error) {
      console.error("Failed to toggle stock:", error);
      alert(error.message);
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(async () => {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.user.id);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  const canOpenIntake = canStartIntake(userRole);
  const canManageRooms = canManageRoomBoard(userRole);
  const canModifyFormulary = canEditFormulary(userRole);
  const canPrescribeMeds = canPrescribe(userRole);
  const canChartInEncounter = canChart(userRole);
  const isLeadership = userRole === "leadership";
  const [authMode, setAuthMode] = useState("login");
  const [showPatientInfoEditModal, setShowPatientInfoEditModal] = useState(false);
  const [pendingPatientMerge, setPendingPatientMerge] = useState(null);
  const [pendingUndergradRegistrationMerge, setPendingUndergradRegistrationMerge] = useState(null);
  const [showWideMergeReview, setShowWideMergeReview] = useState(false);
  const [dashboardSelectedPatientId, setDashboardSelectedPatientId] = useState(null);
  const [formulary, setFormulary] = useState([]);
  const [formularyLoaded, setFormularyLoaded] = useState(false);

  function getNextSoapStatus(authorRole) {
    if (authorRole === "student" || authorRole === "leadership") {
      return "awaiting_upper";
    }

    if (authorRole === "upper_level") {
      return "awaiting_attending";
    }

    if (authorRole === "attending") {
      return "signed";
    }

    return "draft";
  }

  function canUpperLevelSignSoap(role, encounter) {
    if (role !== "upper_level") return false;
    return encounter?.soapStatus === "awaiting_upper";
  }

  function canSubmitSoapForUpperLevel(role, encounter) {
    if (!encounter) return false;
    return (
      (role === "student" || role === "leadership") &&
      (encounter.soapStatus === "draft" || !encounter.soapStatus)
    );
  }

  function canSubmitSoapForAttending(role, encounter) {
    if (!encounter) return false;

    const isDraft = encounter.soapStatus === "draft" || !encounter.soapStatus;
    const skipUpperApproved = !!encounter.skipUpperLevel;

    return (
      (role === "upper_level" && isDraft) ||
      ((role === "student" || role === "leadership") && isDraft && skipUpperApproved)
    );
  }

  function canAttendingSignSoap(role, encounter) {
    if (!encounter) return false;

    if (role !== "attending" || !!encounter.attendingSignedAt) return false;

    return encounter.soapStatus === "awaiting_attending";
  }

  function canUseAttendingPin(role, encounter) {
    if (!encounter || !!encounter.attendingSignedAt) return false;
    if (!["student", "upper_level", "leadership"].includes(role)) return false;
    return encounter.soapStatus === "awaiting_attending";
  }

  function formatRoleLabel(role) {
    switch (role) {
      case "student":
        return "Student";
      case "upper_level":
        return "Upper Level";
      case "attending":
        return "Attending";
      case "leadership":
        return "Leadership";
      default:
        return role || "Unknown";
    }
  }

  function getMissingSoapFields(source, encounter = selectedEncounter) {
    if (!source) return [];

    const isOphthoEncounter =
      encounter?.specialtyType === "ophthalmology";

    if (isOphthoEncounter) {
      const ophtho = {
        ...EMPTY_OPHTHO_NOTE,
        ...(source.ophthalmologyNote || {}),
      };

      const missing = [];

      if (!(ophtho.hpi || "").trim()) missing.push("Chief Complaint & HPI");
      if (!(ophtho.ocularHistory || "").trim()) missing.push("Medical / Ocular History");
      if (!(ophtho.assessment || "").trim()) missing.push("Assessment");
      if (!(ophtho.plan || "").trim()) missing.push("Plan");

      return missing;
    }

    const missing = [];

    if (!(source.soapSubjective || "").trim()) missing.push("Subjective");
    if (!(source.soapObjective || "").trim()) missing.push("Objective");
    if (!(source.soapAssessment || "").trim()) missing.push("Assessment");
    if (!(source.soapPlan || "").trim()) missing.push("Plan");

    return missing;
  }

  function showSoapMessage(message) {
    setSoapUiMessage(message);
    window.clearTimeout(window.__soapMessageTimeout);
    window.__soapMessageTimeout = window.setTimeout(() => {
      setSoapUiMessage("");
    }, 2500);
  }

  async function logAuditEvent(action, details = {}) {
    if (!selectedEncounter || !selectedPatient || !session?.user?.id) return;

    try {
      await createAuditLog({
        encounterId: selectedEncounter.id,
        patientId: selectedPatient.id,
        actorUserId: session.user.id,
        actorName: profileNameMap[session.user.id] || authFullName || "Unknown User",
        actorRole: userRole || "",
        action,
        details,
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  async function loadAuditLog() {
    if (!isLeadershipView) {
      setAuditEntries([]);
      return;
    }

    if (!selectedEncounter?.id) {
      setAuditEntries([]);
      return;
    }

    try {
      setAuditLoading(true);
      const rows = await fetchAuditLogForEncounter(selectedEncounter.id);
      setAuditEntries(rows);
    } catch (error) {
      console.error("Failed to load audit log:", error);
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  }

  function setIsLeadershipView() {
    // no-op now that role comes from auth
  }

  const EMPTY_UNDERGRAD_REGISTRATION_FORM = {
    firstName: "",
    lastName: "",
    dob: "",
    mrn: "",
    addressLine1: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    last4Ssn: "",
    incomeRange: "",
    spanishOnly: "",
    chronicConditions: [],
    chronicConditionsOther: "",
    dailyNumber: "",
    refillNumber: "",
    visitType: "general",
    specialtyType: "",
    refillMedicationRequest: "",
  };

  const [showUndergradRegistrationModal, setShowUndergradRegistrationModal] = useState(false);
  const [undergradRegistrationForm, setUndergradRegistrationForm] = useState(
    EMPTY_UNDERGRAD_REGISTRATION_FORM
  );
  const [registrationPatientId, setRegistrationPatientId] = useState(null);
  const [registrationEncounterId, setRegistrationEncounterId] = useState(null);

  const [activeView, setActiveView] = useState(() => {
    return window.localStorage.getItem("active-view") || "dashboard";
  });
  const [pharmacyToast, setPharmacyToast] = useState(null);
  const [lastPharmacyToastKey, setLastPharmacyToastKey] = useState("");

  useEffect(() => {
    if (!userRole) return;

    if (userRole === "undergraduate") {
      setActiveView("undergrad-intake");
      return;
    }

    if (userRole === "pharmacy") {
      setActiveView("pharmacy-queue");
      return;
    }

    if (userRole === "social_work") {
      setActiveView("queue");
      return;
    }

    if (userRole === "physical_therapy") {
      setActiveView("specialty-queue");
      return;
    }

    if (userRole === "lab") {
      setActiveView("lab-queue");
      return;
    }

    if (
      userRole === "student" ||
      userRole === "upper_level" ||
      userRole === "attending"
    ) {
      setActiveView("queue");
      return;
    }

    // Leadership should keep whatever page was saved in localStorage.
  }, [userRole]);

  useEffect(() => {
    if (!activeView) return;

    window.localStorage.setItem("active-view", activeView);
  }, [activeView]);

  const canLabQueueAccess = canUseLabQueue(userRole);
  const canRefill = canRefillAccess || userRole === "attending" || userRole === "leadership";
  const canAccessDashboard =
    userRole === "leadership" ||
    userRole === "undergraduate" ||
    userRole === "upper_level" ||
    userRole === "attending" ||
    canRefill;


  const [clinicSummary, setClinicSummary] = useState({
    refillCount: "",
    labsCount: "",
    mentalHealthCount: "",
    addictionMedicineCount: "",
    ptCount: "",
    dermatologyCount: "",
    socialWorkCount: "",
    ophthalmologyCount: "",
    lwobsCount: "",
    zoomCount: "",
    phoneCount: "",
    attendingNames: "",
    residentNames: "",
    ms34Names: "",
    ms12Names: "",
  });
  const [summaryClinicDate, setSummaryClinicDate] = useState(formatClinicDate());

  const [summaryRefreshStatus, setSummaryRefreshStatus] = useState("");
  const [programEntries, setProgramEntries] = useState([]);
  const [programsLoaded, setProgramsLoaded] = useState(false);
  const [programSettings, setProgramSettings] = useState([]);
  const [clinicResourceSettings, setClinicResourceSettings] = useState([]);
  const [clinicResourceSettingsLoaded, setClinicResourceSettingsLoaded] = useState(false);
  const [researchLeadershipAccess, setResearchLeadershipAccessState] = useState(false);
  const [activeBoardMessage, setActiveBoardMessage] = useState(null);
  const [savedBoardMessages, setSavedBoardMessages] = useState([]);
  const todayIso = formatClinicDate();
  const isResearchOwner = String(session?.user?.email || "").trim().toLowerCase() === "marvin.shaikh@ttuhsc.edu";
  const canAccessResearch = isResearchOwner || (isLeadershipView && researchLeadershipAccess);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const loadAccess = async () => {
      try {
        const enabled = await fetchResearchAccess();
        if (!cancelled) setResearchLeadershipAccessState(enabled);
      } catch (error) {
        console.error("Failed to load research access setting:", error);
        if (!cancelled) setResearchLeadershipAccessState(false);
      }
    };
    loadAccess();
    const channel = supabase.channel("research-access-settings-realtime").on("postgres_changes", { event: "*", schema: "public", table: "research_access_settings" }, loadAccess).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [session]);

  async function handleResearchLeadershipAccessChange(enabled) {
    if (!isResearchOwner) return;
    const previous = researchLeadershipAccess;
    setResearchLeadershipAccessState(enabled);
    try {
      const saved = await setResearchLeadershipAccess(enabled);
      setResearchLeadershipAccessState(saved);
    } catch (error) {
      setResearchLeadershipAccessState(previous);
      alert(`Failed to change Research Tracker access: ${error.message}`);
    }
  }

  const tonightSpecialtyPrograms = useMemo(() => {
    return (programSettings || []).filter(
      (program) =>
        program?.next_specialty_date &&
        String(program.next_specialty_date).slice(0, 10) === todayIso
    );
  }, [programSettings, todayIso]);

  const tonightSpecialtyNames = tonightSpecialtyPrograms.map(
    (program) => program.program_type
  );

  const tonightReservedRooms = tonightSpecialtyPrograms.flatMap((program) =>
    (program.rooms_assigned?.rooms || []).map((roomNumber) => ({
      roomNumber: String(roomNumber),
      specialty: program.program_type,
    }))
  );


  const [papEntries, setPapEntries] = useState([]);
  const [papLoaded, setPapLoaded] = useState(false);


  useEffect(() => {
    const needsClinicResourceSettings = [
      "dashboard",
      "registration",
      "undergrad-intake",
      "queue",
    ].includes(activeView);
    if (!session || clinicResourceSettingsLoaded || !needsClinicResourceSettings) return;

    async function loadClinicResourceSettings() {
      try {
        const rows = await fetchClinicResourceSettings();
        setClinicResourceSettings(rows || []);
        setClinicResourceSettingsLoaded(true);
      } catch (error) {
        console.error("Failed to load clinic resource settings:", error);
        showToast({
          title: "Settings error",
          message: "Unable to load intake resource settings.",
          type: "error",
        });
      }
    }

    loadClinicResourceSettings();
  }, [session, clinicResourceSettingsLoaded, activeView]);

  const loadBoardMessages = useCallback(async () => {
    if (!session) return;

    try {
      const result = await fetchBoardMessages();
      setActiveBoardMessage(result.activeMessage);
      setSavedBoardMessages(result.savedMessages);
    } catch (error) {
      console.error("Failed to load board messages:", error);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    loadBoardMessages();

    const refreshFromOtherTab = (event) => {
      if (event.key !== "clinic-board-message-refresh") return;
      loadBoardMessages();
    };

    window.addEventListener("storage", refreshFromOtherTab);

    const channel = supabase
      .channel("clinic_board_messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_board_messages" },
        () => {
          loadBoardMessages();
        }
      )
      .subscribe();

    const fallbackInterval = window.setInterval(() => {
      loadBoardMessages();
    }, 60000);

    return () => {
      window.removeEventListener("storage", refreshFromOtherTab);
      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [session, loadBoardMessages]);

  useEffect(() => {
    const needsPapEntries =
      activeView === "queue" ||
      activeView === "pharmacy-queue" ||
      activeView === "pap";
    if (!session || papLoaded || !needsPapEntries) return;

    async function loadPapEntries() {
      try {
        const rows = await fetchPapEntries();
        setPapEntries(rows);
        setPapLoaded(true);
      } catch (error) {
        console.error("Failed to load PAP entries:", error);
      }
    }

    loadPapEntries();
  }, [session, papLoaded, activeView]);

  useEffect(() => {
    const needsProgramEntries =
      activeView === "queue" ||
      activeView === "pharmacy-queue" ||
      activeView === "programs" ||
      activeView === "dashboard" ||
      activeView === "registration" ||
      activeView === "undergrad-intake";
    if (!session || programsLoaded || !needsProgramEntries) return;

    async function loadProgramEntries() {
      try {
        if (userRole === "leadership") {
          try {
            await resetPhysicalTherapyStatusesForMonthEnd();
          } catch (resetError) {
            console.error("Failed to run PT month-end status reset:", resetError);
          }
        }

        const rows = await fetchProgramEntries();
        setProgramEntries(rows);
        setProgramsLoaded(true);
      } catch (error) {
        console.error("Failed to load program entries:", error);
      }
    }

    loadProgramEntries();
  }, [session, programsLoaded, userRole, activeView]);

  useEffect(() => {
    if (!session) return;

    async function loadProgramSettingsForBoard() {
      try {
        const rows = await fetchProgramSettings();
        setProgramSettings(rows || []);
      } catch (error) {
        console.error("Failed to load program settings:", error);
      }
    }

    loadProgramSettingsForBoard();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("program-settings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "program_settings",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setProgramSettings((prev) =>
              prev.filter(
                (row) =>
                  String(row.program_type) !== String(payload.old?.program_type)
              )
            );
            return;
          }

          const nextRow = payload.new;
          if (!nextRow?.program_type) return;

          setProgramSettings((prev) => {
            const exists = prev.some(
              (row) => String(row.program_type) === String(nextRow.program_type)
            );

            if (!exists) return [...prev, nextRow];

            return prev.map((row) =>
              String(row.program_type) === String(nextRow.program_type)
                ? nextRow
                : row
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);


  async function addProgramEntry(entry) {
    setProgramEntries((prev) => [entry, ...prev]);

    try {
      const saved = await createProgramEntryInSupabase(entry);

      setProgramEntries((prev) =>
        prev.map((item) => (item.id === entry.id ? saved : item))
      );
    } catch (error) {
      console.error("Failed to create program entry:", error);
      alert(`Failed to save program entry: ${error.message}`);

      setProgramEntries((prev) => prev.filter((item) => item.id !== entry.id));
    }
  }

  async function updateProgramEntry(entryId, field, value) {
    const previousEntries = [...programEntries];

    setProgramEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );

    try {
      const saved = await updateProgramEntryInSupabase(entryId, { [field]: value });

      setProgramEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? saved : entry))
      );
    } catch (error) {
      console.error("Failed to update program entry:", error);
      alert(`Failed to update program entry: ${error.message}`);
      setProgramEntries(previousEntries);
    }
  }

  async function updateProgramEntryFields(entryId, updates) {
    const previousEntries = [...programEntries];

    setProgramEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
    );

    try {
      const saved = await updateProgramEntryInSupabase(entryId, updates);

      setProgramEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? saved : entry))
      );
    } catch (error) {
      console.error("Failed to update program entry:", error);
      alert(`Failed to update program entry: ${error.message}`);
      setProgramEntries(previousEntries);
    }
  }

  async function removeProgramEntry(entryId) {
    const previousEntries = [...programEntries];

    setProgramEntries((prev) => prev.filter((entry) => entry.id !== entryId));

    try {
      await deleteProgramEntryInSupabase(entryId);
    } catch (error) {
      console.error("Failed to delete program entry:", error);
      alert(`Failed to delete program entry: ${error.message}`);
      setProgramEntries(previousEntries);
    }
  }

  async function addPapEntry(entry) {
    try {
      const saved = await createPapEntryInSupabase(entry);

      setPapEntries((prev) => [saved, ...prev]);
      return saved;
    } catch (error) {
      console.error("Failed to create PAP entry:", error);
      alert(`Failed to save PAP entry: ${error.message}`);
      return null;
    }
  }

  async function updatePapEntry(entryId, field, value) {
    const previousEntries = [...papEntries];

    setPapEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );

    try {
      const saved = await updatePapEntryInSupabase(entryId, { [field]: value });

      setPapEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? saved : entry))
      );
    } catch (error) {
      console.error("Failed to update PAP entry:", error);
      alert(`Failed to update PAP entry: ${error.message}`);
      setPapEntries(previousEntries);
    }
  }

  async function removePapEntry(entryId) {
    const previousEntries = [...papEntries];

    setPapEntries((prev) => prev.filter((entry) => entry.id !== entryId));

    try {
      await deletePapEntryInSupabase(entryId);
    } catch (error) {
      console.error("Failed to delete PAP entry:", error);
      alert(`Failed to delete PAP entry: ${error.message}`);
      setPapEntries(previousEntries);
    }
  }

  useEffect(() => {
    if (!session || formularyLoaded || activeView !== "formulary") return;

    async function loadFormulary() {
      try {
        const rows = await fetchFormularyItems();
        console.log("FORMULARY FROM DB:", rows); // debug
        setFormulary(rows);
        setFormularyLoaded(true);
      } catch (error) {
        console.error("Failed to load formulary:", error);
      }
    }

    loadFormulary();
  }, [session, formularyLoaded, activeView]);

  async function loadRefillRequests() {
    try {
      const rows = await fetchRefillRequests();
      setRefillRequests(rows);
    } catch (error) {
      console.error("Failed to load refill requests:", error);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadRefillRequests();
  }, [session]);

  async function syncClinicSummaryStaffRoster(clinicDate = summaryClinicDate) {
    if (!clinicDate) return;

    const roster = await fetchStaffRoster(clinicDate);
    setClinicSummary((prev) => ({
      ...prev,
      attendingNames: roster.attendings || "",
      residentNames: roster.residents || "",
      ms34Names: roster.upperLevels || "",
    }));
  }

  async function refreshClinicSummaryData() {
    try {
      setSummaryRefreshStatus("Refreshing...");

      await Promise.all([
        refreshClinicData(),
        loadRefillRequests(),
        loadProfiles(),
        syncClinicSummaryStaffRoster(),
      ]);

      applyAutoClinicNumbers();

      setSummaryRefreshStatus("Refreshed");

      setTimeout(() => {
        setSummaryRefreshStatus("");
      }, 2000);
    } catch (error) {
      console.error("Failed to refresh clinic summary:", error);
      setSummaryRefreshStatus("Refresh failed");
      alert(`Failed to refresh clinic summary: ${error.message}`);
    }
  }


  // Formulary realtime disabled to reduce Supabase memory/realtime load.
  // Formulary still loads on sign-in and updates optimistically after saves.

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("refill-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "refill_requests",
        },
        (payload) => {
          console.log("REFILL REALTIME:", payload);

          if (payload.eventType === "INSERT") {
            setRefillRequests((prev) => {
              const exists = prev.some((r) => String(r.id) === String(payload.new.id));
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          }

          if (payload.eventType === "UPDATE") {
            setRefillRequests((prev) => {
              let changed = false;

              const updated = prev.map((r) => {
                if (String(r.id) === String(payload.new.id)) {
                  changed = true;
                  return payload.new;
                }
                return r;
              });

              return changed ? updated : prev;
            });
          }

          if (payload.eventType === "DELETE") {
            setRefillRequests((prev) =>
              prev.filter((r) => r.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Global profiles realtime disabled. User Management reloads profiles when opened,
  // and each signed-in user still has their own approval listener in useAuthSession.

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const isSubmittingIntakeRef = useRef(false);
  const [labImportRawText, setLabImportRawText] = useState("");
  const [labImportDebugSnapshot, setLabImportDebugSnapshot] = useState(null);
  const [labImportPacket, setLabImportPacket] = useState(null);
  const [labImportPackets, setLabImportPackets] = useState([]);
  const [selectedLabImportPacketId, setSelectedLabImportPacketId] = useState(null);
  const [activeLabImportBatchId, setActiveLabImportBatchId] = useState(null);
  const [labImportLoading, setLabImportLoading] = useState(false);
  const [ocrUploading, setOcrUploading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [intakeTab, setIntakeTab] = useState(0);
  const [intakeForm, setIntakeForm] = useState(EMPTY_FORM);
  const [searchForm, setSearchForm] = useState(EMPTY_SEARCH);
  const [debouncedSearchForm, setDebouncedSearchForm] = useState(EMPTY_SEARCH);
  const isBoardDisplayMode =
    new URLSearchParams(window.location.search).get("display") === "board";
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState(null);
  const dashboardScrollYRef = useRef(
    Number(window.sessionStorage.getItem("dashboard-scroll-y")) || 0
  );
  const shouldRestoreDashboardScrollRef = useRef(false);
  const [showStickyNotesModal, setShowStickyNotesModal] = useState(false);
  const [stickyNotesInitialPatientId, setStickyNotesInitialPatientId] = useState("");
  const [todayStaffRoster, setTodayStaffRoster] = useState({
    attendings: "",
    residents: "",
    upperLevels: "",
  });
  const [refillRequests, setRefillRequests] = useState([]);
  const { patients, setPatients, refreshClinicData } = useClinicData({
    authReady,
    session,
    userRole,
    isBoardDisplayMode,
  });

  function rememberDashboardScrollPosition() {
    if (activeView !== "dashboard") return;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    dashboardScrollYRef.current = scrollY;
    window.sessionStorage.setItem("dashboard-scroll-y", String(scrollY));
  }

  function returnToDashboard() {
    shouldRestoreDashboardScrollRef.current = true;
    setActiveView("dashboard");
  }

  function returnFromPatientChart() {
    if (userRole === "social_work") {
      setActiveView("queue");
      return;
    }

    if (userRole === "physical_therapy") {
      setActiveView("specialty-queue");
      return;
    }

    returnToDashboard();
  }

  useEffect(() => {
    if (activeView !== "dashboard") return;
    if (!shouldRestoreDashboardScrollRef.current) return;

    const restoreScroll = () => {
      window.scrollTo({
        top: dashboardScrollYRef.current || 0,
        left: 0,
        behavior: "auto",
      });
      shouldRestoreDashboardScrollRef.current = false;
    };

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restoreScroll);
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [activeView]);



  async function saveClinicResourceSetting(resourceKey, updates) {
    const previousSettings = [...clinicResourceSettings];

    setClinicResourceSettings((prev) =>
      prev.map((setting) =>
        setting.resource_key === resourceKey
          ? { ...setting, ...updates }
          : setting
      )
    );

    try {
      const saved = await updateClinicResourceSetting(resourceKey, updates);

      setClinicResourceSettings((prev) =>
        prev.map((setting) =>
          setting.resource_key === resourceKey ? saved : setting
        )
      );
    } catch (error) {
      console.error("Failed to save clinic resource setting:", error);
      setClinicResourceSettings(previousSettings);
      alert(`Failed to save setting: ${error.message}`);
    }
  }

  const dashboardSelectedPatient =
    patients.find((p) => p.id === dashboardSelectedPatientId) || null;

  const pendingMergeSourcePatient = pendingPatientMerge
    ? patients.find((patient) => String(patient.id) === String(pendingPatientMerge.sourcePatientId)) || null
    : null;

  const pendingMergeTargetPatient = pendingPatientMerge
    ? patients.find((patient) => String(patient.id) === String(pendingPatientMerge.targetPatientId)) || null
    : null;

  const pendingUndergradRegistrationSourcePatient = pendingUndergradRegistrationMerge
    ? patients.find((patient) => String(patient.id) === String(pendingUndergradRegistrationMerge.sourcePatientId)) || null
    : null;

  const pendingUndergradRegistrationTargetPatient = pendingUndergradRegistrationMerge
    ? patients.find((patient) => String(patient.id) === String(pendingUndergradRegistrationMerge.targetPatientId)) || null
    : null;

  const duplicateMrnPatientsForSelected = useMemo(() => {
    if (!dashboardSelectedPatient?.mrn) return [];

    const selectedMrn = String(dashboardSelectedPatient.mrn).trim().toLowerCase();
    if (!selectedMrn) return [];

    return patients.filter(
      (patient) =>
        String(patient.id) !== String(dashboardSelectedPatient.id) &&
        String(patient.mrn || "").trim().toLowerCase() === selectedMrn
    );
  }, [dashboardSelectedPatient, patients]);

  const wideMergeCandidates = useMemo(
    () => buildWideMergeCandidates(patients),
    [patients]
  );

  function findPatientByMrn(mrn, excludePatientId = null) {
    const normalizedMrn = String(mrn || "").trim().toLowerCase();
    if (!normalizedMrn) return null;

    return (
      patients.find(
        (patient) =>
          (!excludePatientId || String(patient.id) !== String(excludePatientId)) &&
          String(patient.mrn || "").trim().toLowerCase() === normalizedMrn
      ) || null
    );
  }

  function getEncounterVisitKind(encounter = {}) {
    const visitType = String(encounter.visitType || encounter.visit_type || "general");

    if (visitType === "specialty_only") return "specialty";
    if (visitType === "both") return "both";
    if (visitType === "refill_only") return "refill";
    return "general";
  }

  function findSameDayEncounter(patient, sourceEncounter, visitType) {
    if (!patient || !sourceEncounter) return null;

    const sourceClinicDate = normalizeClinicDate(sourceEncounter.clinicDate);
    const sourceDailyNumber = String(sourceEncounter.dailyNumber || "").trim();
    const candidates = (patient.encounters || []).filter((encounter) => {
      if (String(encounter.id) === String(sourceEncounter.id)) return false;
      if ((encounter.visitType || "general") !== visitType) return false;
      if (normalizeClinicDate(encounter.clinicDate) !== sourceClinicDate) return false;

      return true;
    });

    if (candidates.length <= 1) return candidates[0] || null;

    if (sourceDailyNumber) {
      const dailyMatches = candidates.filter(
        (encounter) => String(encounter.dailyNumber || "").trim() === sourceDailyNumber
      );

      if (dailyMatches.length === 1) return dailyMatches[0];
    }

    throw new Error(
      "Could not safely choose the matching same-day encounter. Please resolve duplicate same-day encounters before changing visit type."
    );
  }

  function encounterHasProtectedClinicalWork(encounter = {}) {
    const status = String(encounter.status || "").toLowerCase();
    const blockedStatuses = new Set(["roomed", "in_visit", "done", "completed"]);
    const hasSoap =
      Boolean(encounter.soapSubjective) ||
      Boolean(encounter.soapObjective) ||
      Boolean(encounter.soapAssessment) ||
      Boolean(encounter.soapPlan) ||
      String(encounter.soapStatus || "draft").toLowerCase() !== "draft";
    const hasVitals =
      Array.isArray(encounter.vitalsHistory) && encounter.vitalsHistory.length > 0;
    const hasLabs =
      (encounter.inHouseLabs && Object.keys(encounter.inHouseLabs).length > 0) ||
      (Array.isArray(encounter.importedSendOutLabs) && encounter.importedSendOutLabs.length > 0);

    return (
      blockedStatuses.has(status) ||
      hasSoap ||
      hasVitals ||
      hasLabs ||
      Boolean(encounter.roomNumber) ||
      Boolean(encounter.assignedStudent) ||
      Boolean(encounter.assignedUpperLevel)
    );
  }

  function assertEncounterCanBeRemovedForVisitConversion(encounter = {}) {
    if (!encounterHasProtectedClinicalWork(encounter)) return;

    throw new Error(
      "This visit already has clinical work, room assignment, labs, vitals, or charting. Visit type was not changed because removing that encounter could lose work."
    );
  }

  function buildEncounterForVisitType(baseEncounter = {}, updates = {}, visitType) {
    const isSpecialty = visitType === "specialty_only";
    const specialtyType =
      isSpecialty ? updates.specialtyType || baseEncounter.specialtyType || "" : "";
    const chiefComplaint =
      updates.chiefComplaint ??
      (isSpecialty
        ? specialtyType
          ? `${specialtyType} Specialty Visit`
          : "Specialty Visit"
        : baseEncounter.chiefComplaint || "");

    return {
      clinicDate:
        normalizeClinicDate(baseEncounter.clinicDate) ||
        normalizeClinicDate(baseEncounter.clinic_date) ||
        formatClinicDate(),
      createdAt: new Date().toISOString(),
      dailyNumber: updates.dailyNumber ?? baseEncounter.dailyNumber ?? "",
      refillNumber: "",
      newReturning: updates.newReturning ?? baseEncounter.newReturning ?? "Returning",
      visitLocation: updates.visitLocation ?? baseEncounter.visitLocation ?? "In Clinic",
      chiefComplaint,
      notes: updates.notes ?? baseEncounter.notes ?? "",
      transportation: updates.transportation ?? baseEncounter.transportation ?? "",
      needsElevator: updates.needsElevator ?? baseEncounter.needsElevator ?? false,
      spanishSpeaking: updates.spanishSpeaking ?? baseEncounter.spanishSpeaking ?? false,
      mammogramStatus: updates.mammogramStatus ?? baseEncounter.mammogramStatus ?? "",
      papStatus: updates.papStatus ?? baseEncounter.papStatus ?? "",
      fluShot: updates.fluShot ?? baseEncounter.fluShot ?? "",
      colonoscopyStatus: updates.colonoscopyStatus ?? baseEncounter.colonoscopyStatus ?? "",
      htn: updates.htn ?? baseEncounter.htn ?? false,
      dm: updates.dm ?? baseEncounter.dm ?? false,
      labsLast6Months: updates.labsLast6Months ?? baseEncounter.labsLast6Months ?? "",
      nicotineUse: updates.nicotineUse ?? baseEncounter.nicotineUse ?? "",
      nicotineDetails: updates.nicotineDetails ?? baseEncounter.nicotineDetails ?? "",
      substanceUseConcern:
        updates.substanceUseConcern ?? baseEncounter.substanceUseConcern ?? "",
      substanceUseTreatment:
        updates.substanceUseTreatment ?? baseEncounter.substanceUseTreatment ?? "",
      substanceUseNotes: updates.substanceUseNotes ?? baseEncounter.substanceUseNotes ?? "",
      dermatology: updates.dermatology ?? baseEncounter.dermatology ?? "N/A",
      ophthalmology: updates.ophthalmology ?? baseEncounter.ophthalmology ?? "N/A",
      optometry: updates.optometry ?? baseEncounter.optometry ?? "N/A",
      diabeticEyeExamPastYear:
        updates.diabeticEyeExamPastYear ?? baseEncounter.diabeticEyeExamPastYear ?? "N/A",
      physicalTherapy: updates.physicalTherapy ?? baseEncounter.physicalTherapy ?? "N/A",
      mentalHealthCombined:
        updates.mentalHealthCombined ?? baseEncounter.mentalHealthCombined ?? "N/A",
      counseling: updates.counseling ?? baseEncounter.counseling ?? "N/A",
      anyMentalHealthPositive:
        updates.anyMentalHealthPositive ?? baseEncounter.anyMentalHealthPositive ?? false,
      visitType,
      specialtyType,
      refillMedicationRequest: "",
      status:
        updates.status ??
        (isSpecialty ? "undergrad_complete" : baseEncounter.status || "started"),
      leadershipIntakeComplete:
        updates.leadershipIntakeComplete ?? (isSpecialty ? true : false),
      pharmacyStatus: isSpecialty ? baseEncounter.pharmacyStatus || "waiting" : "",
    };
  }

  function buildUpdatesForVisitType(updates = {}, visitType, baseEncounter = {}) {
    const isSpecialty = visitType === "specialty_only";

    return {
      ...updates,
      visitType,
      specialtyType: isSpecialty
        ? updates.specialtyType || baseEncounter.specialtyType || ""
        : "",
      refillMedicationRequest: "",
      dualVisit: false,
      ...(isSpecialty
        ? {
          status: updates.status || "undergrad_complete",
          leadershipIntakeComplete: true,
        }
        : {}),
    };
  }

  async function applyVisitTypeConversion(patientId, encounterId, updates = {}) {
    if (!encounterId || !updates || updates.visitType === undefined) {
      if (encounterId && updates) {
        await updateEncounterInSupabase(encounterId, updates);
      }
      return { selectedEncounterId: encounterId };
    }

    const patient = patients.find((p) => String(p.id) === String(patientId));
    const selected =
      patient?.encounters?.find(
        (encounter) => String(encounter.id) === String(encounterId)
      ) ||
      patients
        .flatMap((p) => p.encounters || [])
        .find((encounter) => String(encounter.id) === String(encounterId));

    if (!patient || !selected) {
      throw new Error("Could not find the encounter to update.");
    }

    const nextVisitType = updates.visitType || "general";

    if (nextVisitType === "refill_only") {
      await updateEncounterInSupabase(encounterId, updates);
      return { selectedEncounterId: encounterId };
    }

    const selectedKind = getEncounterVisitKind(selected);
    const existingGeneral =
      selectedKind === "general" || selectedKind === "both"
        ? selected
        : findSameDayEncounter(patient, selected, "general");
    const existingSpecialty =
      selectedKind === "specialty" || selectedKind === "both"
        ? selected
        : findSameDayEncounter(patient, selected, "specialty_only");

    const wantsGeneral = nextVisitType === "general" || nextVisitType === "both";
    const wantsSpecialty =
      nextVisitType === "specialty_only" || nextVisitType === "both";
    const deleteTargets = [];

    if (!wantsGeneral && existingGeneral) deleteTargets.push(existingGeneral);
    if (!wantsSpecialty && existingSpecialty) deleteTargets.push(existingSpecialty);
    deleteTargets.forEach(assertEncounterCanBeRemovedForVisitConversion);

    let selectedEncounterId = encounterId;
    let generalId = existingGeneral?.id || null;
    let specialtyId =
      existingSpecialty && String(existingSpecialty.id) !== String(existingGeneral?.id)
        ? existingSpecialty.id
        : null;

    if (wantsGeneral) {
      const generalUpdates = buildUpdatesForVisitType(updates, "general", selected);

      if (existingGeneral) {
        await updateEncounterInSupabase(existingGeneral.id, generalUpdates);
        generalId = existingGeneral.id;
      } else {
        const savedGeneral = await createEncounterInSupabase(
          patientId,
          buildEncounterForVisitType(selected, updates, "general")
        );
        generalId = savedGeneral.id;
      }
    }

    if (wantsSpecialty) {
      const specialtyBase =
        existingSpecialty && String(existingSpecialty.id) !== String(existingGeneral?.id)
          ? existingSpecialty
          : selected;
      const specialtyUpdates = buildUpdatesForVisitType(
        updates,
        "specialty_only",
        specialtyBase
      );

      if (
        existingSpecialty &&
        String(existingSpecialty.id) !== String(existingGeneral?.id)
      ) {
        await updateEncounterInSupabase(existingSpecialty.id, specialtyUpdates);
        specialtyId = existingSpecialty.id;
      } else {
        const savedSpecialty = await createEncounterInSupabase(
          patientId,
          buildEncounterForVisitType(selected, updates, "specialty_only")
        );
        specialtyId = savedSpecialty.id;
      }
    }

    for (const encounter of deleteTargets) {
      await deleteEncounterInSupabase(encounter.id);
    }

    if (nextVisitType === "specialty_only") {
      selectedEncounterId = specialtyId || selectedEncounterId;
    } else {
      selectedEncounterId = generalId || selectedEncounterId;
    }

    return { selectedEncounterId };
  }


  function normalizeExtractedDate(value = "") {
    const text = String(value || "").trim();
    if (!text) return "";

    // matches 3/4/2026 or 03/04/2026
    const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (slashMatch) {
      let [, month, day, year] = slashMatch;
      if (year.length === 2) {
        year = `20${year}`;
      }

      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // already yyyy-mm-dd
    const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      return isoMatch[0];
    }

    return "";
  }

  function extractPatientNameFromLabText(rawText = "") {
    const lines = String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    function cleanName(value = "") {
      let cleaned = String(value || "")
        .replace(/\bmedical record number\b.*$/i, "")
        .replace(/\bmrn\b.*$/i, "")
        .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{2}\b/g, "")
        .replace(/\bdob\b.*$/i, "")
        .replace(/\bage\b.*$/i, "")
        .replace(/\bmale\b.*$/i, "")
        .replace(/\bfemale\b.*$/i, "")
        .replace(/\bsex\b.*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[.:\-\s]+/, "")
        .trim();

      if (cleaned.includes(",")) {
        const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
          cleaned = `${parts.slice(1).join(" ")} ${parts[0]}`.trim();
        }
      }

      return cleaned;
    }

    function looksLikePersonName(value = "") {
      const text = String(value || "").trim();
      if (!text) return false;
      if (/\d/.test(text)) return false;
      if (
        /(egfr|legend|critical|footnote|corrected abnormal|result symbol|reference range|units|molecular diagnostics|procedure|collected|specimen|reactive|non-reactive|detected|not detected|health system|hospital lab|chemistry|cbc|immunology|hiv screen)/i.test(text)
      ) {
        return false;
      }

      const words = text.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) return false;

      return true;
    }

    for (let i = 0; i < lines.length; i += 1) {
      const compact = lines[i].replace(/\s+/g, " ").trim();

      const patientSameLine = compact.match(
        /\bpat(?:ient|lent|lient|ent)\s*[.:\-]?\s*(.*)$/i
      );

      if (patientSameLine) {
        const candidates = [
          cleanName(patientSameLine[1]),
          cleanName(lines[i + 1] || ""),
          cleanName(lines[i - 1] || ""),
          cleanName(lines[i + 2] || ""),
          cleanName(lines[i - 2] || ""),
        ];

        for (const candidate of candidates) {
          if (looksLikePersonName(candidate)) return candidate;
        }
      }
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (/^[A-Z' -]+,\s*[A-Z][A-Z' -]+$/.test(line)) {
        const cleaned = cleanName(line);
        const nearby = [
          lines[i - 1] || "",
          lines[i + 1] || "",
          lines[i + 2] || "",
        ].join(" ");

        if (
          looksLikePersonName(cleaned) &&
          /patient|dob|mrn/i.test(nearby)
        ) {
          return cleaned;
        }
      }
    }

    return "";
  }

  function extractDobFromLabText(rawText = "") {
    const lines = String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const dobMatch = line.match(/\bdob\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i);
      if (dobMatch) {
        return normalizeExtractedDate(dobMatch[1]);
      }
    }

    // fallback for OCR demographic lines like:
    // "M, 57 yrs, 1/12/1969" or "F. 40 yrs, 5/4/1986"
    // Do NOT grab dates from specimen/collected/printed lines as DOB.
    for (const line of lines.slice(0, 12)) {
      const demographicDateMatch = line.match(
        /^\s*[MF]\s*[,.]\s*\d{1,3}\s*(?:yr|yrs|years)\b.*?\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i
      );
      if (demographicDateMatch) {
        return normalizeExtractedDate(demographicDateMatch[1]);
      }
    }

    return "";
  }

  function extractCollectedDateFromLabText(rawText = "") {
    const lines = String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      const collectedMatch = line.match(
        /\bcollected\b.*?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i
      );
      if (collectedMatch) {
        return normalizeExtractedDate(collectedMatch[1]);
      }

      if (/^collected date\/time$/i.test(line) || /^collected$/i.test(line)) {
        const nextLine = lines[i + 1] || "";
        const nextDateMatch = nextLine.match(
          /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/i
        );
        if (nextDateMatch) {
          return normalizeExtractedDate(nextDateMatch[1]);
        }
      }
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      const orderedMatch = line.match(
        /\bordered\b.*?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i
      );
      if (orderedMatch) {
        return normalizeExtractedDate(orderedMatch[1]);
      }

      if (/^ordered date\/time$/i.test(line) || /^ordered$/i.test(line)) {
        const nextLine = lines[i + 1] || "";
        const nextDateMatch = nextLine.match(
          /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/i
        );
        if (nextDateMatch) {
          return normalizeExtractedDate(nextDateMatch[1]);
        }
      }
    }

    return "";
  }

  function normalizePatientMatchText(value = "") {
    let text = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/medical record number:.*$/i, "")
      .replace(/\bmrn:.*$/i, "")
      .replace(/[^a-z0-9,\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.includes(",")) {
      const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        text = `${parts.slice(1).join(" ")} ${parts[0]}`.trim();
      }
    }

    return text.replace(/\s+/g, " ").trim();
  }

  function buildCanonicalPatientNameKey(value = "") {
    const cleaned = normalizePatientMatchText(value);

    if (!cleaned) return "";

    const rawParts = cleaned
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/[^a-z0-9]/g, ""));

    if (rawParts.length === 0) return "";

    const mergedParts = [];
    for (const part of rawParts) {
      const last = mergedParts[mergedParts.length - 1] || "";

      if (
        last &&
        last.length > 1 &&
        part.length === 1
      ) {
        mergedParts[mergedParts.length - 1] = `${last}${part}`;
        continue;
      }

      mergedParts.push(part);
    }

    return mergedParts.sort().join(" ");
  }

  function splitNameParts(fullName = "") {
    const cleaned = normalizePatientMatchText(fullName);

    if (!cleaned) {
      return {
        full: "",
        first: "",
        last: "",
      };
    }

    const parts = cleaned.split(" ").filter(Boolean);

    return {
      full: cleaned,
      first: parts[0] || "",
      last: parts.length > 1 ? parts[parts.length - 1] : "",
    };
  }

  function datesMatchExactly(a = "", b = "") {
    return String(a || "").trim() !== "" && String(a || "").trim() === String(b || "").trim();
  }

  function scorePatientLabMatch(patient, extractedPatientName, extractedDob) {
    const patientFullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    const extracted = splitNameParts(extractedPatientName);
    const patientName = splitNameParts(patientFullName);

    let score = 0;

    if (extracted.full && patientName.full && extracted.full === patientName.full) {
      score += 100;
    }

    if (extracted.first && patientName.first && extracted.first === patientName.first) {
      score += 25;
    }

    if (extracted.last && patientName.last && extracted.last === patientName.last) {
      score += 40;
    }

    if (
      extracted.last &&
      patientName.last &&
      (extracted.last.includes(patientName.last) ||
        patientName.last.includes(extracted.last))
    ) {
      score += 15;
    }

    if (
      extracted.first &&
      patientName.first &&
      (extracted.first.includes(patientName.first) ||
        patientName.first.includes(extracted.first))
    ) {
      score += 10;
    }

    if (
      extracted.first &&
      patientName.first &&
      extracted.first[0] &&
      patientName.first[0] &&
      extracted.first[0] === patientName.first[0]
    ) {
      score += 5;
    }

    if (
      extracted.last &&
      patientName.last &&
      extracted.last[0] &&
      patientName.last[0] &&
      extracted.last[0] === patientName.last[0]
    ) {
      score += 10;
    }

    if (datesMatchExactly(patient.dob, extractedDob)) {
      score += 60;
    }

    return score;
  }

  function findBestPatientMatch(patients = [], extractedName = "", extractedDob = "") {
    if (!patients || patients.length === 0) {
      return {
        status: "unresolved",
        match: null,
        possible: [],
        reason: "No patients loaded yet.",
      };
    }

    let bestMatch = null;
    let bestScore = 0;
    const possibleMatches = [];

    for (const patient of patients) {
      const score = scorePatientLabMatch(patient, extractedName, extractedDob);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = patient;
      }

      if (score >= 60) {
        possibleMatches.push({ patient, score });
      }
    }

    if (bestScore >= 120 && bestMatch) {
      return {
        status: "matched",
        match: bestMatch,
        possible: [],
        reason: "",
      };
    }

    if (possibleMatches.length > 0) {
      return {
        status: "possible_match",
        match: null,
        possible: possibleMatches
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((entry) => entry.patient),
        reason: "Possible patient matches found.",
      };
    }

    return {
      status: "unresolved",
      match: null,
      possible: [],
      reason: "No confident patient match found.",
    };
  }

  function normalizeBulkLabLines(rawText = "") {
    return String(rawText || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd());
  }

  function looksLikePatientStart(line = "", prev = "", next = "", nextTwo = "") {
    const text = String(line || "").trim();
    const prevText = String(prev || "").trim();
    const nextText = String(next || "").trim();
    const nextTwoText = String(nextTwo || "").trim();

    if (!text) return false;

    // UMC fax OCR commonly emits patient headers as:
    //   Patient James Smith MRN: 123-45-67
    //   Patient: James Smith MRN: 123-45-67
    //   Patient. James Smith MRN: 123-45-67
    // Treat Patient+MRN as a reliable packet start. Repeated pages for the
    // same patient are stitched back together by mergeConsecutivePacketsForSamePatient.
    if (/^pat(?:ient|lent|lient|ent)\s*[.:\s-]+.+\bmrn\s*:/i.test(text)) {
      return true;
    }

    if (
      /^pat(?:ient|lent|lient|ent)\s*[.:\s-]/i.test(text) ||
      /\bpat(?:ient|lent|lient|ent)\s*[.:\s-]+.+\bmrn\b/i.test(text) ||
      /^name\s*[:\s-]/i.test(text)
    ) {
      return true;
    }

    const looksLikeCommaName =
      /^[A-Z' -]+,\s*[A-Z][A-Z' -]+$/.test(text) &&
      !/EGFR|LEGEND|CRITICAL|FOOTNOTE|CORRECTED ABNORMAL|MOLECULAR DIAGNOSTICS|CHEMISTRY|CBC|IMMUNOLOGY|HIV/.test(text);

    if (!looksLikeCommaName) return false;

    return (
      /^pat(?:ient|lent|lient|ent)\s*[.:\s-]*$/i.test(nextText) ||
      /^pat(?:ient|lent|lient|ent)\s*[.:\s-]/i.test(nextText) ||
      /^pat(?:ient|lent|lient|ent)\s*[.:\s-]*$/i.test(prevText) ||
      /^dob\s*[:\-]/i.test(nextText) ||
      /^dob\s*[:\-]/i.test(nextTwoText)
    );
  }

  function looksLikeDobLine(line = "") {
    const text = String(line || "").trim();

    return (
      /\bdob\s*[:\-]?\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(text) ||
      /^[MF]\s*,\s*\d{1,3}\s*yrs?\s*,\s*\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(text)
    );
  }

  function looksLikeMrnLine(line = "") {
    return /\bmrn\b/i.test(String(line || "").trim());
  }

  function cleanOcrLabText(rawText = "") {
    const lines = String(rawText || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const cleaned = [];
    let skipInterpretiveBlock = false;

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        /^@@@\s*\d+\s*@@@$/.test(line) ||
        /system generated/i.test(line) ||
        /page \d+ of \d+/i.test(line) ||
        /umctxrrd/i.test(line) ||
        /rrd/i.test(line) && /180679/i.test(line) ||
        /^\(?806\)?\s*775[-–]?\d+/i.test(line) ||
        /602 indiana avenue/i.test(line) ||
        /lubbock,\s*tx\s*7941/i.test(line) ||
        /^legend:/i.test(line) ||
        /^attending physician:/i.test(line) ||
        /^ordering physician:/i.test(line) ||
        /^financial number:/i.test(line) ||
        /^location:/i.test(line) ||
        /^consulting physician:/i.test(line) ||
        /^entered by:/i.test(line) ||
        /^order details:/i.test(line) ||
        /^order comment:/i.test(line) ||
        /^order start date/i.test(line) ||
        /^order status:/i.test(line) ||
        /^end-state/i.test(line) ||
        /^catalog type:/i.test(line) ||
        /^activity type:/i.test(line)
      ) {
        continue;
      }

      if (/^interpretive data$/i.test(line) || /^order comments$/i.test(line)) {
        skipInterpretiveBlock = true;
        continue;
      }

      if (skipInterpretiveBlock) {
        const looksLikeNewSection =
          /^patient name:/i.test(line) ||
          /^patient:/i.test(line) ||
          /^dob:/i.test(line) ||
          /^collected/i.test(line) ||
          /^procedure/i.test(line) ||
          /^chlamydia/i.test(line) ||
          /^neisseria/i.test(line) ||
          /^hiv /i.test(line) ||
          /^syphilis/i.test(line) ||
          /^hepatitis/i.test(line) ||
          /^wbc$/i.test(line) ||
          /^rbc$/i.test(line) ||
          /^hemoglobin/i.test(line) ||
          /^hematocrit/i.test(line) ||
          /^sodium/i.test(line) ||
          /^potassium/i.test(line) ||
          /^chloride/i.test(line) ||
          /^glucose/i.test(line) ||
          /^bun$/i.test(line) ||
          /^creatinine/i.test(line) ||
          /^calcium/i.test(line) ||
          /^cholesterol/i.test(line) ||
          /^triglycerides/i.test(line) ||
          /^hdl/i.test(line) ||
          /^ldl/i.test(line) ||
          /^tsh/i.test(line) ||
          /^t4/i.test(line) ||
          /^estradiol/i.test(line);

        if (!looksLikeNewSection) {
          continue;
        }

        skipInterpretiveBlock = false;
      }

      const normalizedLine = line
        .replace(/Medical Record Number:/gi, "MRN:")
        .replace(/Patient Name:\s*/i, "Patient: ")
        .replace(/\bDORB:\b/i, "DOB:")
        .replace(/\bCoflected\b|\bCollected Dato\b|\bCollegted\b|\bCollacted\b/gi, "Collected")
        .replace(/\bChiamydia\b/gi, "Chlamydia")
        .replace(/\bHemaogiobin\b/gi, "Hemoglobin")
        .replace(/\bSereen\b/gi, "Screen")
        .replace(/\bResuit\b/gi, "Result")
        .replace(/\bNeisseria gonorthoeae\b/gi, "Neisseria gonorrhoeae")
        .replace(/\s{2,}/g, " ")
        .trim();

      cleaned.push(normalizedLine);
    }

    return cleaned.join("\n");
  }

  function splitBulkLabTextIntoPackets(rawText = "") {
    const lines = normalizeBulkLabLines(rawText).filter((line) => line.trim() !== "");

    if (lines.length === 0) return [];

    function normalizeMrn(value = "") {
      return String(value || "").replace(/\D/g, "");
    }

    function extractMrnFromLine(line = "") {
      const text = String(line || "").trim();

      const labeled = text.match(/\bMRN\s*[:#]?\s*([0-9]{2,4}[-\s]?[0-9]{2}[-\s]?[0-9]{2,4})\b/i);
      if (labeled) return normalizeMrn(labeled[1]);

      const standalone = text.match(/\b([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2})\b/);
      if (standalone) return normalizeMrn(standalone[1]);

      return "";
    }

    function isPatientMrnHeader(line = "") {
      const text = String(line || "").trim();
      return /^pat(?:ient|lent|lient|ent)\s*[.:\s-]*.+\bmrn\s*:/i.test(text);
    }

    function packetFamilyForSegment(segmentText = "") {
      const text = String(segmentText || "").toLowerCase();

      const hasPap =
        /\bpap test\b/.test(text) ||
        text.includes("anatomical pathology") ||
        text.includes("specimen adequacy") ||
        text.includes("negative for intraepithelial lesion") ||
        text.includes("cervix");

      const hasRadiology =
        text.includes("findings") &&
        text.includes("impression");

      const hasInfectious =
        text.includes("chlamydia") ||
        text.includes("gonorrhoeae") ||
        text.includes("gonorrhea") ||
        text.includes("hiv screen") ||
        text.includes("syphilis screen") ||
        text.includes("hepatitis");

      const hasStructured =
        text.includes("comprehensive metabolic panel") ||
        text.includes("cbc") ||
        text.includes("wbc") ||
        text.includes("rbc") ||
        text.includes("hemoglobin") ||
        text.includes("platelet") ||
        text.includes("glucose") ||
        text.includes("sodium") ||
        text.includes("potassium") ||
        text.includes("creatinine") ||
        text.includes("lipid panel") ||
        text.includes("thyroid stimulating hormone") ||
        text.includes("t4") ||
        text.includes("vitamin b");

      if (hasRadiology) return "radiology";
      if (hasPap) return "pathology";
      if (hasStructured) return "structured";
      if (hasInfectious) return "infectious";
      return "other";
    }

    function segmentLooksWorthKeeping(segmentText = "") {
      const text = String(segmentText || "").toLowerCase();

      return (
        text.includes("final result") ||
        text.includes("value") ||
        text.includes("range") ||
        text.includes("pap test") ||
        text.includes("interpretation") ||
        text.includes("specimen adequacy")
      );
    }

    const headerIndexes = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (isPatientMrnHeader(lines[i])) {
        headerIndexes.push(i);
      }
    }

    if (headerIndexes.length === 0) {
      return [{
        packetId: "packet-1",
        rawText: lines.join("\n").trim(),
      }];
    }

    const grouped = new Map();
    const orderedKeys = [];

    for (let h = 0; h < headerIndexes.length; h += 1) {
      const startIndex = headerIndexes[h];
      const endIndex = h < headerIndexes.length - 1 ? headerIndexes[h + 1] : lines.length;
      const segmentLines = lines.slice(startIndex, endIndex);
      const segmentText = segmentLines.join("\n").trim();
      if (!segmentText || !segmentLooksWorthKeeping(segmentText)) continue;

      const mrn = extractMrnFromLine(segmentLines[0]) || `unknown-${h}`;
      // Group by MRN only. UMC often sends the same patient as multiple page
      // fragments whose family can look different (structured vs other vs
      // infectious), especially continuation pages like "Patient. Name MRN".
      // Splitting by family creates duplicate review packets for the same PDF.
      const key = mrn;

      if (!grouped.has(key)) {
        grouped.set(key, []);
        orderedKeys.push(key);
      }

      grouped.get(key).push(segmentText);
    }

    return orderedKeys
      .map((key, index) => ({
        packetId: `packet-${index + 1}`,
        rawText: grouped.get(key).join("\n").trim(),
      }))
      .filter((packet) => packet.rawText);
  }

  function classifyLabPacket(rawText = "") {
    const text = rawText.toLowerCase();

    const hasInfectious =
      text.includes("chlamydia") ||
      text.includes("gonorrhea") ||
      text.includes("trichomonas") ||
      text.includes("syphilis") ||
      text.includes("hiv") ||
      text.includes("hepatitis");

    const hasPathology =
      text.includes("pap") ||
      text.includes("cytology") ||
      text.includes("hpv") ||
      text.includes("specimen adequacy");

    const hasRadiology =
      text.includes("findings") &&
      text.includes("impression");

    const hasSingleTest =
      text.includes("thyroid") ||
      text.includes("tsh") ||
      text.includes("a1c") ||
      text.includes("hemoglobin a1c") ||
      text.includes("ferritin") ||
      text.includes("iron level") ||
      text.includes("tibc") ||
      text.includes("vitamin d") ||
      text.includes("b12");

    const hasLiver =
      /\bast\b/.test(text) ||
      /\balt\b/.test(text) ||
      /\balk(?:aline)?\s+phos(?:phatase)?\b/.test(text) ||
      /\bbilirubin\b/.test(text);

    const hasRenal =
      /\begfr\b/.test(text) ||
      /\brenal\b/.test(text) ||
      /\bcreatinine clearance\b/.test(text) ||
      /\bphosphorus\b/.test(text);

    const hasCbc =
      text.includes("white blood cell") ||
      text.includes("wbc") ||
      text.includes("hematocrit") ||
      text.includes("mcv") ||
      text.includes("platelet") ||
      text.includes("cbc");

    const hasChemistry =
      text.includes("sodium") ||
      text.includes("potassium") ||
      text.includes("glucose") ||
      text.includes("creatinine") ||
      text.includes("bun") ||
      text.includes("chemistry");

    const structuredHits = [hasLiver, hasRenal, hasCbc, hasChemistry].filter(Boolean).length;

    // IMPORTANT:
    // if a packet clearly has multi-panel structure, keep it multi-panel
    // even if it also contains hepatitis/HIV/TSH/A1c pages merged into the same patient packet
    if (structuredHits >= 2) {
      return "Multi-Panel Report";
    }

    if (hasPathology) return "Pathology / PAP";
    if (hasRadiology) return "Radiology / Report";
    if (hasInfectious) return "Infectious / STD";
    if (hasSingleTest) return "Single Test Report";

    if (hasLiver) return "liver";
    if (hasRenal) return "renal";
    if (hasCbc) return "cbc";
    if (hasChemistry) return "chemistry";

    if (text.includes("umc")) {
      return "umc_structured";
    }

    return "unknown";
  }

  function buildLabImportPacketFromText(rawText, packetType = "unknown") {
    const rawExtractedPatientName =
      extractPatientNameFromLabTextFromParser(rawText) ||
      extractPatientNameFromLabText(rawText);

    const extractedPatientName = formatPatientName(rawExtractedPatientName);
    const extractedDob = extractDobFromLabText(rawText);
    const collectedDate =
      extractCollectedDateFromLabText(rawText) || formatClinicDate();

    const shouldParseAsStructuredLabs =
      packetType !== "Pathology / PAP" &&
      packetType !== "Radiology / Report";

    const parsedLabs = shouldParseAsStructuredLabs
      ? window.testLabParser(rawText, [], collectedDate)
      : [];

    const matchResult = findBestPatientMatch(
      patients,
      extractedPatientName,
      extractedDob
    );

    return {
      extractedPatientName,
      extractedDob,
      collectedDate,
      matchStatus: matchResult.status,
      matchedPatient: matchResult.match || null,
      possibleMatches: matchResult.possible || [],
      unresolvedReason: matchResult.reason || "",
      confirmedPatient: matchResult.match || null,
      labs: parsedLabs,
      rawText,
      reviewStatus: "unsaved",
      savedAt: null,
      skippedAt: null,
    };
  }

  function buildBulkLabImportPacketsFromText(rawText) {
    const chunks = mergeConsecutivePacketsForSamePatient(
      splitBulkLabTextIntoPackets(rawText)
    );

    const builtPackets = chunks
      .map((chunk, index) => {
        const packetType = classifyLabPacket(chunk.rawText);
        const packet = buildLabImportPacketFromText(chunk.rawText, packetType);

        return {
          ...packet,
          packetId: chunk.packetId || `packet-${index + 1}`,
          sourceRawText: chunk.rawText,
          packetType,
          reviewStatus: packet.reviewStatus || "unsaved",
          savedAt: packet.savedAt || null,
          skippedAt: packet.skippedAt || null,
        };
      })
      .filter((packet) => {
        const hasLabs = (packet.labs || []).length > 0;

        const isNonNumericButImportant =
          packet.packetType === "Pathology / PAP" ||
          packet.packetType === "Radiology / Report";

        // Do not keep demographic-only UMC header fragments as separate packets.
        // They cause review rows with a patient name but zero labs, then the real lab page
        // appears as a separate packet with a bad extracted DOB/name.
        return hasLabs || isNonNumericButImportant;
      });

    return mergeDuplicatePacketsByPatientDobAndType(builtPackets);
  }

  function buildIndexedLines(text = "") {
    return String(text || "")
      .split("\n")
      .map((line, index) => ({
        index,
        text: String(line || ""),
      }));
  }

  function summarizeParseMethods(labs = []) {
    return (labs || []).reduce((summary, lab) => {
      const method = lab?.debugMeta?.parseMethod || "unknown";
      summary[method] = (summary[method] || 0) + 1;
      return summary;
    }, {});
  }

  function summarizeLabForDebug(lab = {}) {
    return {
      key: lab.key || "",
      displayName: lab.displayName || "",
      group: lab.group || "",
      value: lab.value ?? null,
      rawLine: lab.rawLine || "",
      confidence: lab.confidence || "",
      suspicious: !!lab.suspicious,
      missing: !!lab.missing,
      autoFilled: !!lab.autoFilled,
      expectedRangeText: lab.expectedRangeText || "",
      duplicateType: lab.duplicateType || null,
      duplicateInfo: lab.duplicateInfo || null,
      debugMeta: {
        parseMethod: lab.debugMeta?.parseMethod || null,
        matchIndex:
          Number.isInteger(lab.debugMeta?.matchIndex)
            ? lab.debugMeta.matchIndex
            : null,
        valueLineIndex:
          Number.isInteger(lab.debugMeta?.valueLineIndex)
            ? lab.debugMeta.valueLineIndex
            : null,
        valueSourceLine: lab.debugMeta?.valueSourceLine || "",
        candidateNumbers: Array.isArray(lab.debugMeta?.candidateNumbers)
          ? lab.debugMeta.candidateNumbers
          : [],
        debugCandidates: Array.isArray(lab.debugMeta?.debugCandidates)
          ? lab.debugMeta.debugCandidates
          : [],
        rangeUsed: lab.debugMeta?.rangeUsed || "",
      },
    };
  }

  function summarizePacketForDebug(packet = {}) {
    const labs = (packet.labs || []).map(summarizeLabForDebug);
    const counts = computeLabCounts(labs);
    const categorized = categorizeLabsForExport(labs);
    const missingLabs = labs.filter((lab) => lab.missing || lab.autoFilled);

    return {
      packetId: packet.packetId || "",
      extractedPatientName: packet.extractedPatientName || "",
      extractedDob: packet.extractedDob || "",
      collectedDate: packet.collectedDate || "",
      packetType: packet.packetType || "unknown",
      reviewStatus: packet.reviewStatus || "unsaved",
      matchStatus: packet.matchStatus || "unresolved",
      unresolvedReason: packet.unresolvedReason || "",
      lineCount: String(packet.rawText || packet.sourceRawText || "").split("\n").filter(Boolean).length,
      labCount: labs.length,
      counts,
      parseMethods: summarizeParseMethods(labs),
      missingLabs: missingLabs.map((lab) => ({
        key: lab.key,
        displayName: lab.displayName,
        group: lab.group,
        autoFilled: lab.autoFilled,
        rawLine: lab.rawLine,
        parseMethod: lab.debugMeta?.parseMethod || null,
      })),
      trueMissingLabs: categorized.trueMissingLabs.map((lab) => lab.displayName || lab.key),
      panelPlaceholders: categorized.panelPlaceholders.map((lab) => lab.displayName || lab.key),
      suspiciousLabs: categorized.suspiciousLabs.map((lab) => lab.displayName || lab.key),
    };
  }

  function buildLabImportDebugSnapshot({
    source = "unknown",
    originalText = "",
    cleanedText = "",
    ocrTexts = [],
    file = null,
    packets = [],
  } = {}) {
    const initialChunks = splitBulkLabTextIntoPackets(cleanedText);
    const mergedChunks = mergeConsecutivePacketsForSamePatient(initialChunks);
    const packetSummaries = (packets || []).map(summarizePacketForDebug);
    const normalizeDebugText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
    const parsedPacketTexts = (packets || [])
      .map((packet) => normalizeDebugText(packet.sourceRawText || packet.rawText || ""))
      .filter(Boolean);
    const chunkWasKept = (chunkText = "") => {
      const normalizedChunk = normalizeDebugText(chunkText);
      if (!normalizedChunk) return false;
      return parsedPacketTexts.some(
        (packetText) =>
          packetText === normalizedChunk ||
          packetText.includes(normalizedChunk) ||
          normalizedChunk.includes(packetText)
      );
    };

    return {
      createdAt: new Date().toISOString(),
      source,
      file: file
        ? {
            name: file.name || "",
            type: file.type || "",
            size: file.size || 0,
            lastModified: file.lastModified || null,
          }
        : null,
      ocr: {
        pageCount: Array.isArray(ocrTexts) ? ocrTexts.length : 0,
        compiledText: Array.isArray(ocrTexts) ? ocrTexts.join("\n\n").trim() : "",
        pages: Array.isArray(ocrTexts)
          ? ocrTexts.map((text, index) => ({
              page: index + 1,
              charCount: String(text || "").length,
              lineCount: String(text || "").split("\n").filter(Boolean).length,
              text: String(text || ""),
              indexedLines: buildIndexedLines(text || ""),
            }))
          : [],
      },
      text: {
        originalCharCount: String(originalText || "").length,
        cleanedCharCount: String(cleanedText || "").length,
        originalText: originalText || "",
        cleanedText: cleanedText || "",
        indexedOriginalLines: buildIndexedLines(originalText || ""),
        indexedCleanedLines: buildIndexedLines(cleanedText || ""),
      },
      packetization: {
        initialChunkCount: initialChunks.length,
        mergedChunkCount: mergedChunks.length,
        parsedPacketCount: packetSummaries.length,
        initialChunks: initialChunks.map((chunk, index) => ({
          chunkId: chunk.packetId || `chunk-${index + 1}`,
          lineCount: String(chunk.rawText || "").split("\n").filter(Boolean).length,
          charCount: String(chunk.rawText || "").length,
          classifiedType: classifyLabPacket(chunk.rawText || ""),
          extractedPatientName: formatPatientName(
            extractPatientNameFromLabTextFromParser(chunk.rawText || "") ||
              extractPatientNameFromLabText(chunk.rawText || "")
          ),
          extractedDob: extractDobFromLabText(chunk.rawText || ""),
          collectedDate: extractCollectedDateFromLabText(chunk.rawText || ""),
          rawText: chunk.rawText || "",
          indexedLines: buildIndexedLines(chunk.rawText || ""),
        })),
        mergedChunks: mergedChunks.map((chunk, index) => {
          const packetId = chunk.packetId || `packet-${index + 1}`;
          return {
            packetId,
            keptAfterParsing: chunkWasKept(chunk.rawText || ""),
            lineCount: String(chunk.rawText || "").split("\n").filter(Boolean).length,
            charCount: String(chunk.rawText || "").length,
            classifiedType: classifyLabPacket(chunk.rawText || ""),
            extractedPatientName: formatPatientName(
              extractPatientNameFromLabTextFromParser(chunk.rawText || "") ||
                extractPatientNameFromLabText(chunk.rawText || "")
            ),
            extractedDob: extractDobFromLabText(chunk.rawText || ""),
            collectedDate: extractCollectedDateFromLabText(chunk.rawText || ""),
            rawText: chunk.rawText || "",
            indexedLines: buildIndexedLines(chunk.rawText || ""),
          };
        }),
      },
      packetSummary: packetSummaries,
    };
  }

  function mergeConsecutivePacketsForSamePatient(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length <= 1) return chunks;

    const merged = [];

    function normalizeNameForMerge(value = "") {
      return buildCanonicalPatientNameKey(value);
    }

    for (const chunk of chunks) {
      const rawText = chunk?.rawText || "";
      const patientName = normalizeNameForMerge(extractPatientNameFromLabText(rawText));
      const dob = extractDobFromLabText(rawText);

      const last = merged[merged.length - 1];

      if (last) {
        const lastPatientName = normalizeNameForMerge(
          extractPatientNameFromLabText(last.rawText)
        );
        const lastDob = extractDobFromLabText(last.rawText);

        const samePatient =
          (
            patientName &&
            lastPatientName &&
            patientName === lastPatientName &&
            dob &&
            lastDob &&
            dob === lastDob
          ) ||
          (
            !patientName &&
            !!lastPatientName &&
            dob &&
            lastDob &&
            dob === lastDob
          );

        if (samePatient) {
          last.rawText = `${last.rawText}\n${rawText}`.trim();
          continue;
        }
      }

      merged.push({ ...chunk });
    }

    return merged.map((chunk, index) => ({
      ...chunk,
      packetId: `packet-${index + 1}`,
    }));
  }

  function mergeDuplicatePacketsByPatientDobAndType(packets = []) {
    if (!Array.isArray(packets) || packets.length <= 1) return packets;

    const mergedMap = new Map();

    function makeKey(packet) {
      let name = buildCanonicalPatientNameKey(packet.extractedPatientName || "");

      name = name
        .replace(/[^a-z]/gi, "")   // remove commas, spaces, punctuation
        .toLowerCase();

      const dob = String(packet.extractedDob || "").trim();

      return `${name}__${dob}`;
    }

    function pickPreferredPacketType(existingType = "", nextType = "") {
      const priority = {
        "multi-panel report": 5,
        "infectious / std": 4,
        "single test report": 3,
        "cbc": 2,
        "chemistry": 2,
        "unknown": 1,
      };

      const a = String(existingType || "").trim().toLowerCase();
      const b = String(nextType || "").trim().toLowerCase();

      return (priority[b] || 0) > (priority[a] || 0) ? nextType : existingType;
    }

    for (const packet of packets) {
      const key = makeKey(packet);

      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          ...packet,
          rawText: packet.rawText || packet.sourceRawText || "",
          sourceRawText: packet.sourceRawText || packet.rawText || "",
        });
        continue;
      }

      const existing = mergedMap.get(key);

      const combinedLabs = [...(existing.labs || [])];
      const seenLabKeys = new Set(
        combinedLabs.map(
          (lab) =>
            `${lab.key || lab.displayName || ""}__${String(lab.value ?? "").trim()}__${lab.group || ""}`
        )
      );

      for (const lab of packet.labs || []) {
        const labKey = `${lab.key || lab.displayName || ""}__${String(lab.value ?? "").trim()}__${lab.group || ""}`;
        if (!seenLabKeys.has(labKey)) {
          combinedLabs.push(lab);
          seenLabKeys.add(labKey);
        }
      }

      const existingName = String(existing.extractedPatientName || "").trim();
      const nextName = String(packet.extractedPatientName || "").trim();

      const preferredExtractedPatientName =
        existingName && nextName
          ? (existingName.length >= nextName.length ? existingName : nextName)
          : (existingName || nextName);

      mergedMap.set(key, {
        ...existing,
        extractedPatientName: preferredExtractedPatientName,
        packetType: pickPreferredPacketType(existing.packetType, packet.packetType),
        labs: combinedLabs,
        rawText: `${existing.rawText}\n${packet.rawText || packet.sourceRawText || ""}`.trim(),
        sourceRawText: `${existing.sourceRawText}\n${packet.sourceRawText || packet.rawText || ""}`.trim(),
        possibleMatches:
          existing.possibleMatches?.length > 0
            ? existing.possibleMatches
            : packet.possibleMatches || [],
        matchedPatient: existing.matchedPatient || packet.matchedPatient || null,
        confirmedPatient: existing.confirmedPatient || packet.confirmedPatient || null,
      });
    }

    return Array.from(mergedMap.values()).map((packet, index) => ({
      ...packet,
      packetId: `packet-${index + 1}`,
    }));
  }

  function mapLabImportDbRowToPacket(row) {
    const matchedPatient =
      row.matched_patient_id
        ? patients.find((p) => String(p.id) === String(row.matched_patient_id)) || null
        : null;

    const possibleMatches = Array.isArray(row.match_candidates_json)
      ? row.match_candidates_json
        .map((entry) => {
          const id =
            entry?.id ||
            entry?.patient_id ||
            entry?.patientId ||
            null;

          if (!id) return null;

          return patients.find((p) => String(p.id) === String(id)) || null;
        })
        .filter(Boolean)
      : [];

    return {
      packetId: row.id,
      batchId: row.batch_id,
      extractedPatientName: row.extracted_name || "",
      extractedDob: row.extracted_dob || "",
      collectedDate: row.collected_date || "",
      packetType: row.packet_type || "unknown",
      rawText: row.raw_text || "",
      sourceRawText: row.raw_text || "",
      labs: Array.isArray(row.parsed_labs_json) ? row.parsed_labs_json : [],
      reviewStatus: row.review_status || "unreviewed",
      savedAt: row.saved_at || null,
      skippedAt: row.skipped_at || null,
      matchedPatient,
      confirmedPatient: matchedPatient,
      matchStatus: matchedPatient
        ? "matched"
        : possibleMatches.length > 0
          ? "possible_match"
          : "unresolved",
      possibleMatches,
      unresolvedReason: matchedPatient
        ? ""
        : "No confident patient match found.",
      matchedEncounterId: row.matched_encounter_id || null,
      suspiciousCount: row.suspicious_count || 0,
      missingCount: row.missing_count || 0,
      totalLabCount: row.total_lab_count || 0,
    };
  }

  async function loadSharedLabImportBatch(batchId = null) {
    if (!session) return;

    setLabImportLoading(true);

    try {
      let activeBatchId = batchId;

      if (!activeBatchId) {
        const { data: batchRows, error: batchError } = await supabase
          .from("lab_import_batches")
          .select("id, created_at, status")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);

        if (batchError) throw batchError;

        activeBatchId = batchRows?.[0]?.id || null;
      }

      if (!activeBatchId) {
        setActiveLabImportBatchId(null);
        setLabImportPackets([]);
        setLabImportPacket(null);
        setSelectedLabImportPacketId(null);
        setLabImportDebugSnapshot(null);
        return;
      }

      const { data: packetRows, error: packetError } = await supabase
        .from("lab_import_packets")
        .select("*")
        .eq("batch_id", activeBatchId)
        .order("created_at", { ascending: true });

      if (packetError) throw packetError;

      const mappedPackets = (packetRows || []).map(mapLabImportDbRowToPacket);

      setActiveLabImportBatchId(activeBatchId);
      setLabImportPackets(mappedPackets);

      const nextSelectedId =
        selectedLabImportPacketId &&
          mappedPackets.some((packet) => packet.packetId === selectedLabImportPacketId)
          ? selectedLabImportPacketId
          : mappedPackets[0]?.packetId || null;

      setSelectedLabImportPacketId(nextSelectedId);
      setLabImportPacket(
        mappedPackets.find((packet) => packet.packetId === nextSelectedId) || null
      );
    } catch (error) {
      console.error("Failed to load shared lab import batch:", error);
      showToast({
        title: "Failed to load lab batch",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    } finally {
      setLabImportLoading(false);
    }
  }

  async function createSharedLabImportBatchWithPackets(packets, source = "manual") {
    if (!session?.user?.id) {
      throw new Error("No signed-in user found.");
    }

    const { data: batchRow, error: batchError } = await supabase
      .from("lab_import_batches")
      .insert({
        created_by: session.user.id,
        status: "active",
        source,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    const rowsToInsert = (packets || []).map((packet) => ({
      batch_id: batchRow.id,
      extracted_name: packet.extractedPatientName || "",
      extracted_dob: packet.extractedDob || null,
      collected_date: packet.collectedDate || null,
      packet_type: packet.packetType || "unknown",
      matched_patient_id: packet.confirmedPatient?.id || null,
      matched_encounter_id: null,
      review_status: packet.reviewStatus || "unreviewed",
      raw_text: packet.rawText || packet.sourceRawText || "",
      parsed_labs_json: packet.labs || [],
      duplicate_summary_json: {},
      match_candidates_json: (packet.possibleMatches || []).map((p) => ({
        id: p.id,
      })),
      suspicious_count: (packet.labs || []).filter((lab) => !!lab?.suspicious).length,
      missing_count: (packet.labs || []).filter((lab) => !!lab?.missing || !!lab?.autoFilled).length,
      total_lab_count: (packet.labs || []).length,
      last_opened_by: session.user.id,
      last_opened_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("lab_import_packets")
      .insert(rowsToInsert);

    if (insertError) throw insertError;

    return batchRow.id;
  }

  async function updateSharedLabImportPacket(packetId, updates = {}) {
    const { error } = await supabase
      .from("lab_import_packets")
      .update(updates)
      .eq("id", packetId);

    if (error) throw error;
  }

  async function cleanupSavedLabImportPacket(packetId, batchId) {
    if (!packetId) return;

    const { error: packetDeleteError } = await supabase
      .from("lab_import_packets")
      .delete()
      .eq("id", packetId);

    if (packetDeleteError) throw packetDeleteError;

    if (!batchId) {
      setLabImportPackets((prev) => prev.filter((packet) => packet.packetId !== packetId));

      if (selectedLabImportPacketId === packetId) {
        setSelectedLabImportPacketId(null);
        setLabImportPacket(null);
      }

      return;
    }

    const { data: remainingPackets, error: remainingError } = await supabase
      .from("lab_import_packets")
      .select("id")
      .eq("batch_id", batchId)
      .limit(1);

    if (remainingError) throw remainingError;

    if ((remainingPackets || []).length === 0) {
      const { error: batchDeleteError } = await supabase
        .from("lab_import_batches")
        .delete()
        .eq("id", batchId);

      if (batchDeleteError) throw batchDeleteError;

      setActiveLabImportBatchId(null);
      setLabImportPackets([]);
      setLabImportPacket(null);
      setSelectedLabImportPacketId(null);
      return;
    }

    await loadSharedLabImportBatch(batchId);
  }

  async function handleLiveUpdateLabPacketLabs(packetId, reviewedLabs) {
    if (!packetId) return;

    const existingPacket = labImportPackets.find(
      (packet) => String(packet.packetId) === String(packetId)
    );

    const existingJson = JSON.stringify(existingPacket?.labs || []);
    const nextJson = JSON.stringify(reviewedLabs || []);

    if (existingJson === nextJson) {
      return;
    }

    try {
      await updateSharedLabImportPacket(packetId, {
        parsed_labs_json: reviewedLabs,
        suspicious_count: (reviewedLabs || []).filter((lab) => !!lab?.suspicious).length,
        missing_count: (reviewedLabs || []).filter(
          (lab) => !!lab?.missing || !!lab?.autoFilled
        ).length,
        total_lab_count: (reviewedLabs || []).length,
      });

      setLabImportPackets((prev) =>
        prev.map((packet) =>
          packet.packetId === packetId
            ? {
              ...packet,
              labs: reviewedLabs,
              suspiciousCount: (reviewedLabs || []).filter((lab) => !!lab?.suspicious).length,
              missingCount: (reviewedLabs || []).filter(
                (lab) => !!lab?.missing || !!lab?.autoFilled
              ).length,
              totalLabCount: (reviewedLabs || []).length,
            }
            : packet
        )
      );

      setLabImportPacket((prev) =>
        prev && prev.packetId === packetId
          ? {
            ...prev,
            labs: reviewedLabs,
            suspiciousCount: (reviewedLabs || []).filter((lab) => !!lab?.suspicious).length,
            missingCount: (reviewedLabs || []).filter(
              (lab) => !!lab?.missing || !!lab?.autoFilled
            ).length,
            totalLabCount: (reviewedLabs || []).length,
          }
          : prev
      );
    } catch (error) {
      console.error("Failed to live-update lab packet labs:", error);
    }
  }

  async function handleParseLabImportText() {
    if (!labImportRawText.trim()) {
      showToast({
        title: "No lab text",
        message: "Paste lab text first.",
        type: "warning",
      });
      return;
    }

    try {
      const originalText = labImportRawText;
      const cleanedText = cleanOcrLabText(originalText);
      setLabImportRawText(cleanedText);

      const packets = buildBulkLabImportPacketsFromText(cleanedText);

      if (!packets || packets.length === 0) {
        showToast({
          title: "No labs detected",
          message: "No labs were detected from the pasted text.",
          type: "warning",
        });
        return;
      }

      setLabImportDebugSnapshot(
        buildLabImportDebugSnapshot({
          source: "manual",
          originalText,
          cleanedText,
          packets,
        })
      );

      const batchId = await createSharedLabImportBatchWithPackets(packets, "manual");

      await loadSharedLabImportBatch(batchId);
      setActiveView("lab-import");
    } catch (error) {
      console.error("Failed to create shared lab import batch:", error);
      showToast({
        title: "Failed to create lab batch",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function fileToBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = String(reader.result || "");
          const base64 = result.split(",")[1] || "";
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function convertPdfToBase64Images(file) {
    const [pdfjsLib, workerModule] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker?url"),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);

      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1] || "";
      images.push(base64);
    }

    return images;
  }

  async function handleGoogleOCRImport(file) {
    if (!file) return;

    setOcrUploading(true);
    setOcrError("");

    try {
      let base64Images = [];

      if (file.type === "application/pdf") {
        base64Images = await convertPdfToBase64Images(file);
      } else if (file.type.startsWith("image/")) {
        base64Images = [await fileToBase64(file)];
      } else {
        throw new Error("Only PDF and image files are supported.");
      }

      const ocrTexts = await runGoogleOCRInChunks(base64Images, 16);
      const combinedText = ocrTexts.join("\n\n").trim();

      if (!combinedText) {
        throw new Error("OCR returned no text.");
      }

      const cleanedText = cleanOcrLabText(combinedText);
      setLabImportRawText(cleanedText);

      const packets = buildBulkLabImportPacketsFromText(cleanedText);

      if (!packets || packets.length === 0) {
        throw new Error("OCR worked, but no labs were detected from the extracted text.");
      }

      setLabImportDebugSnapshot(
        buildLabImportDebugSnapshot({
          source: "google_ocr",
          originalText: combinedText,
          cleanedText,
          ocrTexts,
          file,
          packets,
        })
      );

      const batchId = await createSharedLabImportBatchWithPackets(packets, "google_ocr");

      await loadSharedLabImportBatch(batchId);
      setActiveView("lab-import");
    } catch (error) {
      console.error("Google OCR import failed:", error);
      setOcrError(error.message || "OCR failed.");
    } finally {
      setOcrUploading(false);
    }
  }

  async function handleConfirmLabImportPatient(packetId, patient) {
    if (!packetId || !patient) return;

    try {
      await updateSharedLabImportPacket(packetId, {
        matched_patient_id: patient.id,
        match_candidates_json: [],
      });

      setLabImportPackets((prev) =>
        prev.map((packet) =>
          packet.packetId === packetId
            ? {
              ...packet,
              confirmedPatient: patient,
              matchStatus: "matched",
              matchedPatient: patient,
              possibleMatches: [],
              unresolvedReason: "",
            }
            : packet
        )
      );

      setLabImportPacket((prev) =>
        prev && prev.packetId === packetId
          ? {
            ...prev,
            confirmedPatient: patient,
            matchStatus: "matched",
            matchedPatient: patient,
            possibleMatches: [],
            unresolvedReason: "",
          }
          : prev
      );
    } catch (error) {
      console.error("Failed to confirm patient for lab packet:", error);
      showToast({
        title: "Failed to confirm patient",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function handleSkipLabImportPacket(packetId) {
    if (!packetId) return;

    const skippedAt = new Date().toISOString();

    try {
      await updateSharedLabImportPacket(packetId, {
        review_status: "skipped",
        skipped_at: skippedAt,
      });

      setLabImportPackets((prev) =>
        prev.map((packet) =>
          packet.packetId === packetId
            ? {
              ...packet,
              reviewStatus: "skipped",
              skippedAt,
            }
            : packet
        )
      );

      setLabImportPacket((prev) =>
        prev && prev.packetId === packetId
          ? {
            ...prev,
            reviewStatus: "skipped",
            skippedAt,
          }
          : prev
      );
    } catch (error) {
      console.error("Failed to skip lab packet:", error);
      showToast({
        title: "Failed to skip packet",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  useEffect(() => {
    if (!session) return;
    if (!isLeadershipView) return;
    if (activeView !== "lab-import") return;

    loadSharedLabImportBatch(activeLabImportBatchId || null);
  }, [session, isLeadershipView, activeView]);

  async function handleSelectLabImportPacket(packetId) {
    if (!packetId) return;

    setSelectedLabImportPacketId(packetId);

    const found = labImportPackets.find((packet) => packet.packetId === packetId) || null;
    setLabImportPacket(found);

    if (session?.user?.id) {
      try {
        await updateSharedLabImportPacket(packetId, {
          last_opened_by: session.user.id,
          last_opened_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to update last opened packet info:", error);
      }
    }
  }

  function handleExportLabDebug() {
    try {
      const packets = labImportPackets || [];

      const currentPacketSummary = packets.map(summarizePacketForDebug);
      const allCurrentLabs = packets.flatMap((packet) => packet.labs || []);
      const currentCounts = computeLabCounts(allCurrentLabs);

      const exportData = {
        schema: "lab-import-debug-v2",
        timestamp: new Date().toISOString(),
        overview: {
          activeBatchId: activeLabImportBatchId || null,
          selectedPacketId: selectedLabImportPacketId || null,
          packetCount: packets.length,
          totalLabCount: allCurrentLabs.length,
          currentCounts,
          packetsNeedingReview: currentPacketSummary.filter(
            (packet) => packet.counts.needs_review_count > 0 || packet.matchStatus !== "matched"
          ).length,
          packetsWithNoLabs: currentPacketSummary.filter((packet) => packet.labCount === 0).length,
        },
        importSnapshot: labImportDebugSnapshot || null,
        currentText: {
          rawText: labImportRawText || "",
          indexedRawTextLines: buildIndexedLines(labImportRawText || ""),
        },
        packetSummary: currentPacketSummary,
        missingLabsByPacket: currentPacketSummary.map((packet) => ({
          packetId: packet.packetId,
          extractedPatientName: packet.extractedPatientName,
          missingLabs: packet.missingLabs,
          trueMissingLabs: packet.trueMissingLabs,
          panelPlaceholders: packet.panelPlaceholders,
        })),

        packets: packets.map((packet) => {
          const finalLabs = (packet.labs || []).map(summarizeLabForDebug);

          const counts = computeLabCounts(finalLabs);
          const categorized = categorizeLabsForExport(finalLabs);
          const parseMethods = summarizeParseMethods(finalLabs);

          const parsingFails = finalLabs.filter(
            (lab) =>
              lab.missing ||
              lab.suspicious ||
              lab.autoFilled ||
              lab.value === null ||
              lab.value === undefined ||
              lab.value === ""
          );

          return {
            packetId: packet.packetId,

            summary: {
              total_labs: finalLabs.length,
              valued_count: counts.valued_count,
              missing_count: counts.missing_count,
              autofilled_count: counts.autofilled_count,
              suspicious_count: counts.suspicious_count,
              duplicate_count: counts.duplicate_count,
              needs_review_count: counts.needs_review_count,
              fill_percent: counts.fill_percent,
              parseMethods,
            },

            categorized: {
              trueMissingLabs: categorized.trueMissingLabs,
              panelPlaceholders: categorized.panelPlaceholders,
              suspiciousLabs: categorized.suspiciousLabs,
            },

            patient: {
              extractedName: packet.extractedPatientName || "",
              extractedDob: packet.extractedDob || "",
              confirmedPatient: packet.confirmedPatient || null,
              matchStatus: packet.matchStatus || "unresolved",
              matchedPatient: packet.matchedPatient || null,
              possibleMatches: packet.possibleMatches || [],
              unresolvedReason: packet.unresolvedReason || "",
            },

            metadata: {
              collectedDate: packet.collectedDate || "",
              packetType: packet.packetType || "unknown",
              reviewStatus: packet.reviewStatus || "unsaved",
              savedAt: packet.savedAt || null,
              skippedAt: packet.skippedAt || null,
            },

            finalLabs,
            parsingFails,
            missingLabs: finalLabs.filter((lab) => lab.missing || lab.autoFilled),

            finalLabSummary: finalLabs.map((lab) => ({
              name: lab.displayName,
              value: lab.value,
              rawLine: lab.rawLine,
              suspicious: lab.suspicious,
              missing: lab.missing,
              autoFilled: lab.autoFilled,
              parseMethod: lab.debugMeta?.parseMethod || null,
              valueLineIndex: lab.debugMeta?.valueLineIndex ?? null,
            })),

            rawPacket: {
              extractedPatientName: packet.extractedPatientName || "",
              extractedDob: packet.extractedDob || "",
              collectedDate: packet.collectedDate || "",
              packetType: packet.packetType || "unknown",
              rawText: packet.rawText || "",
              sourceRawText: packet.sourceRawText || "",
              indexedLines: buildIndexedLines(packet.rawText || ""),
              indexedSourceLines: buildIndexedLines(packet.sourceRawText || ""),
            },
          };
        }),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `lab_debug_${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export lab debug:", error);
      showToast({
        title: "Export failed",
        message: "Failed to export lab debug JSON.",
        type: "error",
        duration: 5000,
      });
    }
  }


  // Program entries realtime disabled to reduce background subscriptions.
  // The Programs view keeps local state in sync after edits and reloads on page open.

  // PAP realtime disabled to reduce background subscriptions.
  // PAP entries load once per session and update locally after edits.

  useEffect(() => {
    if (!session) return;
    if (!activeLabImportBatchId) return;

    const channel = supabase
      .channel(`lab-import-packets-${activeLabImportBatchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lab_import_packets",
          filter: `batch_id=eq.${activeLabImportBatchId}`,
        },
        async () => {
          await loadSharedLabImportBatch(activeLabImportBatchId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeLabImportBatchId]);

  const [assignmentForm, setAssignmentForm] = useState({
    studentName: "",
    upperLevelName: "",
    roomNumber: "",
  });
  const [leadershipActionLocked, setLeadershipActionLocked] = useState(false);
  const [currentVitals, setCurrentVitals] = useState(EMPTY_VITALS);
  const [editingVitalsIndex, setEditingVitalsIndex] = useState(null);

  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [newMedication, setNewMedication] = useState(EMPTY_MEDICATION);
  const [editingMedicationId, setEditingMedicationId] = useState(null);
  const [isRefillRequestMode, setIsRefillRequestMode] = useState(false);
  const [refillSourceMedicationId, setRefillSourceMedicationId] = useState(null);
  const EMPTY_ALLERGY = { allergen: "", reaction: "", severity: "", notes: "", isActive: true, };

  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [newAllergy, setNewAllergy] = useState(EMPTY_ALLERGY);
  const [editingAllergyId, setEditingAllergyId] = useState(null);
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [intakeMatchPatientId, setIntakeMatchPatientId] = useState(null);
  const [autoFilledMatchPatientId, setAutoFilledMatchPatientId] = useState(null);
  const intakeMatchedPatient =
    patients.find((p) => p.id === intakeMatchPatientId) || null;

  const [soapBusy, setSoapBusy] = useState(false);
  const soapAutosaveInFlightRef = useRef(false);
  const [soapUiMessage, setSoapUiMessage] = useState("");
  const EMPTY_OPHTHO_NOTE = {
    hpi: "",
    ocularHistory: "",
    vaOd: "",
    vaOs: "",
    phOd: "",
    phOs: "",
    iopOd: "",
    iopOs: "",
    externalOd: "",
    externalOs: "",
    slitLampOd: "",
    slitLampOs: "",
    fundusOd: "",
    fundusOs: "",
    assessment: "",
    plan: "",
  };

  const [soapDraft, setSoapDraft] = useState({
    encounterId: null,
    soapSubjective: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: "",
    notes: "",
    ophthalmologyNote: { ...EMPTY_OPHTHO_NOTE },
  });
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);



  useEffect(() => {
    if (isEditingIntake || !showIntakeModal) {
      if (intakeMatchPatientId !== null) setIntakeMatchPatientId(null);
      if (autoFilledMatchPatientId !== null) setAutoFilledMatchPatientId(null);
      return;
    }

    if (!intakeForm.firstName || !intakeForm.lastName || !intakeForm.dob) {
      if (intakeMatchPatientId !== null) setIntakeMatchPatientId(null);
      if (autoFilledMatchPatientId !== null) setAutoFilledMatchPatientId(null);
      return;
    }

    const strongMatches = patients.filter((patient) =>
      findPotentialDuplicatePatient(
        [patient],
        intakeForm.firstName,
        intakeForm.lastName,
        intakeForm.dob,
        intakeForm.last4ssn,
        editingPatientId
      )
    );
    const possibleMatch = strongMatches.length === 1 ? strongMatches[0] : null;

    const nextMatchId = possibleMatch ? possibleMatch.id : null;

    if (nextMatchId !== intakeMatchPatientId) {
      setIntakeMatchPatientId(nextMatchId);
    }

    if (possibleMatch && autoFilledMatchPatientId !== possibleMatch.id) {
      applyPatientToIntake(possibleMatch);
    }

    if (
      autoFilledMatchPatientId !== null &&
      autoFilledMatchPatientId !== nextMatchId
    ) {
      setAutoFilledMatchPatientId(null);
    }
  }, [
    intakeForm.firstName,
    intakeForm.lastName,
    intakeForm.dob,
    intakeForm.last4ssn,
    editingPatientId,
    isEditingIntake,
    showIntakeModal,
    intakeMatchPatientId,
    autoFilledMatchPatientId,
    patients,
  ]);
  useEffect(() => {
    if (activeView === "users" && isLeadershipView) {
      loadProfiles({ showLoading: true });
    }
  }, [activeView, isLeadershipView]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchForm(searchForm);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchForm]);



  const [selectedClinicDate, setSelectedClinicDate] = useState(
    getLocalDateInputValue()
  );

  const [roomBoardDate, setRoomBoardDate] = useState(getLocalDateInputValue());
  const [specialtyQueueDate, setSpecialtyQueueDate] = useState(getLocalDateInputValue());
  const [queueClinicDate, setQueueClinicDate] = useState(getLocalDateInputValue());
  const [labQueueDate, setLabQueueDate] = useState(getLocalDateInputValue());
  const boardClinicDate = roomBoardDate || formatClinicDate();
  const boardSpecialtyPrograms = useMemo(() => {
    return (programSettings || []).filter(
      (program) =>
        program?.next_specialty_date &&
        normalizeClinicDate(program.next_specialty_date) === boardClinicDate
    );
  }, [programSettings, boardClinicDate]);
  const boardSpecialtyNames = boardSpecialtyPrograms.map(
    (program) => program.program_type
  );
  const boardReservedRooms = boardSpecialtyPrograms.flatMap((program) =>
    (program.rooms_assigned?.rooms || []).map((roomNumber) => ({
      roomNumber: String(roomNumber),
      specialty: program.program_type,
    }))
  );
  const [, setNow] = useState(Date.now());
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  const selectedEncounter =
    selectedPatient?.encounters.find((e) => e.id === selectedEncounterId) || null;

  const patientMedicationList = selectedPatient?.medicationList || [];

  const sortedMedications = [...patientMedicationList].sort((a, b) => {
    if ((a.isActive ?? true) !== (b.isActive ?? true)) {
      return (b.isActive ?? true) - (a.isActive ?? true);
    }

    return (a.name || "").localeCompare(b.name || "");
  });

  const activeMedicationCount = patientMedicationList.filter(
    (med) => med.isActive ?? true
  ).length;

  useEffect(() => {
    if (!selectedEncounter?.id) {
      setSoapDraft({
        encounterId: null,
        soapSubjective: "",
        soapObjective: "",
        soapAssessment: "",
        soapPlan: "",
        notes: "",
        ophthalmologyNote: { ...EMPTY_OPHTHO_NOTE },
      });
      return;
    }

    setSoapDraft({
      encounterId: selectedEncounter.id,
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      ophthalmologyNote: {
        ...EMPTY_OPHTHO_NOTE,
        ...(selectedEncounter.ophthalmologyNote || {}),
      },
    });
  }, [selectedEncounter?.id]);

  useEffect(() => {
    if (isLeadershipView && selectedEncounter?.id) {
      loadAuditLog();
    } else {
      setAuditEntries([]);
    }
  }, [selectedEncounter?.id, isLeadershipView]);

  const canSignAsUpperLevel = canUpperLevelSignSoap(userRole, selectedEncounter);
  const canSignAsAttending = canAttendingSignSoap(userRole, selectedEncounter);
  const canSignWithAttendingPin = canUseAttendingPin(userRole, selectedEncounter);
  const canSubmitForUpperLevel = canSubmitSoapForUpperLevel(
    userRole,
    selectedEncounter
  );
  const canSubmitForAttending = canSubmitSoapForAttending(
    userRole,
    selectedEncounter
  );
  const canReopenSoap =
    ["attending", "leadership"].includes(userRole) &&
    selectedEncounter?.soapStatus === "signed";
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);



  const sortedSelectedPatientEncounters = useMemo(() => {
    if (!selectedPatient) return [];

    return sortEncountersByDate(selectedPatient.encounters);
  }, [selectedPatient]);

  const patientRecordsTitle = selectedClinicDate
    ? `Patient Records — ${formatDate(selectedClinicDate)}`
    : "Patient Records — All Encounters";


  const allEncounterRows = useMemo(() => {
    return patients.flatMap((patient) =>
      patient.encounters.map((encounter) => {
        const dailyNumber =
          encounter?.dailyNumber ||
          encounter?.daily_number ||
          encounter?.intakeData?.dailyNumber ||
          encounter?.intake_data?.dailyNumber ||
          encounter?.intakeData?.daily_number ||
          encounter?.intake_data?.daily_number ||
          patient?.dailyNumber ||
          patient?.daily_number ||
          "";

        return {
          patient: {
            ...patient,
            dailyNumber: patient?.dailyNumber || dailyNumber,
          },
          encounter: {
            ...encounter,
            dailyNumber,
          },
        };
      })
    );
  }, [patients]);

  const specialtyEncounterRows = useMemo(() => {
    const clinicDateForSpecialtyQueue = specialtyQueueDate || formatClinicDate();

    return allEncounterRows
      .filter(({ encounter }) => {
        if (!encounter) return false;

        const visitType = encounter.visitType || "general";
        const specialtyType = encounter.specialtyType || "";

        if (normalizeClinicDate(encounter.clinicDate) !== clinicDateForSpecialtyQueue) return false;
        if (!specialtyType) return false;
        if (encounter.status === "cancelled") return false;

        return (
          visitType === "specialty_only" ||
          visitType === "both" ||
          encounter.dualVisit === true
        );
      })
      .sort((a, b) => {
        const aDone = a.encounter.status === "done" || a.encounter.soapStatus === "signed";
        const bDone = b.encounter.status === "done" || b.encounter.soapStatus === "signed";

        if (aDone !== bDone) return aDone ? 1 : -1;

        const aTime = new Date(a.encounter.createdAt || 0).getTime();
        const bTime = new Date(b.encounter.createdAt || 0).getTime();
        return aTime - bTime;
      });
  }, [allEncounterRows, specialtyQueueDate]);

  const physicalTherapyEncounterRows = useMemo(() => {
    const clinicDate = specialtyQueueDate || formatClinicDate();
    return allEncounterRows
      .filter(({ encounter }) => {
        const specialtyType = String(encounter?.specialtyType || "").toLowerCase();
        return (
          normalizeClinicDate(encounter?.clinicDate) === clinicDate &&
          ["pt", "physical_therapy", "physical therapy"].includes(specialtyType) &&
          encounter?.status !== "cancelled"
        );
      })
      .sort((a, b) => new Date(a.encounter?.createdAt || 0) - new Date(b.encounter?.createdAt || 0));
  }, [allEncounterRows, specialtyQueueDate]);

  const specialtyRoomRulesForBoard = useMemo(() => {
    const mapProgramTypeToEncounterType = {
      "Physical Therapy": "pt",
      Dermatology: "dermatology",
      Ophthalmology: "ophthalmology",
      "Mental Health": "mental_health",
      "Addiction Medicine": "addiction",
    };

    const rules = {};

    programSettings.forEach((row) => {
      const encounterType = mapProgramTypeToEncounterType[row.program_type];
      if (!encounterType) return;

      if (normalizeClinicDate(row.next_specialty_date) !== boardClinicDate) return;

      rules[encounterType] = {
        label: row.program_type,
        allowedRooms: (row.rooms_assigned?.rooms || []).map((room) => String(room)),
      };
    });

    return rules;
  }, [programSettings, boardClinicDate]);

  const registrationRows = useMemo(() => {
    return allEncounterRows
      .filter(({ encounter }) => {
        if (!encounter) return false;

        const isSelectedRegistrationDate =
          normalizeClinicDate(encounter.clinicDate) === selectedClinicDate;

        const isGeneralRegistrationEncounter =
          encounter.visitType !== "specialty_only";

        if (!isSelectedRegistrationDate) return false;

        const isRegistrationStatus =
          encounter.status === "started" ||
          encounter.status === "undergrad_complete";

        const isActiveRegistrationEncounter =
          encounter.status !== "cancelled" &&
          encounter.status !== "done" &&
          encounter.status !== "completed" &&
          encounter.status !== "signed";

        if (userRole === "undergraduate") {
          const undergradEditableStatuses = new Set([
            "started",
            "undergrad_complete",
            "ready",
            "in_visit",
          ]);

          // Leadership can finish intake while undergrad is still adding MRN/details.
          // Keep those ready/in-visit patients visible until undergrad explicitly saves
          // Complete / Edit Undergrad Intake, then remove them from this registration list.
          return (
            isGeneralRegistrationEncounter &&
            undergradEditableStatuses.has(encounter.status) &&
            !encounter.undergradCompletedAt
          );
        }

        if (isLeadershipView) {
          // Leadership registration should only clear after leadership completes intake.
          // Undergrad completion can happen before/after leadership and should not
          // remove the patient from this list. Use the leadership flag as the source
          // of truth instead of relying only on status, so simultaneous workflows stay visible.
          return (
            isGeneralRegistrationEncounter &&
            isActiveRegistrationEncounter &&
            !encounter.leadershipIntakeComplete
          );
        }

        return false;
      })
      .sort(sortRowsByDailyNumberThenTime);
  }, [allEncounterRows, selectedClinicDate, userRole, isLeadershipView]);

  async function removeFromRegistration(patientId, encounterId) {
    const confirmed = window.confirm(
      "Remove this patient from registration? This will mark the encounter as cancelled."
    );
    if (!confirmed) return;

    try {
      await updateEncounterInSupabase(encounterId, {
        status: "cancelled",
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === encounterId
                  ? { ...encounter, status: "cancelled" }
                  : encounter
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to remove registration encounter:", error);
      alert(`Failed to remove patient from registration: ${error.message}`);
    }
  }

  const visibleEncounterRows = useMemo(() => {
    if (!selectedClinicDate) {
      return allEncounterRows;
    }

    return allEncounterRows.filter(
      ({ encounter }) =>
        normalizeClinicDate(encounter.clinicDate) === selectedClinicDate
    );
  }, [allEncounterRows, selectedClinicDate]);

  const summaryEncounterRows = useMemo(() => {
    if (!summaryClinicDate) return allEncounterRows;

    return allEncounterRows.filter(
      ({ encounter }) =>
        normalizeClinicDate(encounter.clinicDate) === summaryClinicDate
    );
  }, [allEncounterRows, summaryClinicDate]);

  const autoMs12Names = useMemo(
    () => buildAssignedStudentSummary(summaryEncounterRows),
    [summaryEncounterRows]
  );

  const boardEncounterRows = useMemo(() => {
    return allEncounterRows.filter(
      ({ encounter }) =>
        normalizeClinicDate(encounter.clinicDate) === boardClinicDate
    );
  }, [allEncounterRows, boardClinicDate]);

  useEffect(() => {
    if (!session || !boardClinicDate) return;

    let cancelled = false;

    setTodayStaffRoster({
      attendings: "",
      residents: "",
      upperLevels: "",
    });

    async function loadRoster() {
      const roster = await fetchStaffRoster(boardClinicDate);
      if (!cancelled) {
        setTodayStaffRoster(roster);
      }
    }

    loadRoster();

    const channel = supabase
      .channel(`clinic_staff_roster_${boardClinicDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_staff_roster",
          filter: `clinic_date=eq.${boardClinicDate}`,
        },
        () => {
          loadRoster();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, boardClinicDate]);

  async function handleSaveTodayStaffRoster(nextRoster = todayStaffRoster) {
    try {
      await saveStaffRoster(boardClinicDate, nextRoster);
    } catch (error) {
      console.error("Failed to save staff roster:", error);
      showToast?.("Unable to save staff roster.", "error");
    }
  }

  function notifyBoardMessageTabs() {
    try {
      window.localStorage.setItem(
        "clinic-board-message-refresh",
        String(Date.now())
      );
    } catch (error) {
      console.error("Failed to notify board message tabs:", error);
    }
  }

  async function handleDisplayBoardMessage(message) {
    const saved = await displayBoardMessage({
      ...message,
      userId: session?.user?.id || null,
    });

    setActiveBoardMessage(saved);
    notifyBoardMessageTabs();
    await loadBoardMessages();
  }

  async function handleClearBoardMessage() {
    await clearActiveBoardMessage();
    setActiveBoardMessage(null);
    notifyBoardMessageTabs();
    await loadBoardMessages();
  }

  async function handleSaveBoardMessageTemplate(message) {
    const saved = await saveBoardMessageTemplate({
      ...message,
      userId: session?.user?.id || null,
    });

    setSavedBoardMessages((prev) => [saved, ...prev]);
    notifyBoardMessageTabs();
    await loadBoardMessages();
  }

  async function handleDeleteBoardMessageTemplate(messageId) {
    await deleteBoardMessageTemplate(messageId);
    setSavedBoardMessages((prev) =>
      prev.filter((message) => message.id !== messageId)
    );
    notifyBoardMessageTabs();
    await loadBoardMessages();
  }


  const filteredPatients = patients.filter((patient) =>
    patientMatchesSearch(patient, debouncedSearchForm)
  );

  const visiblePatientIds = new Set(
    visibleEncounterRows.map(({ patient }) => patient.id)
  );

  const filteredVisiblePatients = filteredPatients.filter((patient) =>
    visiblePatientIds.has(patient.id)
  );

  const summaryPatientRows = useMemo(() => {
    const priorityForVisitType = (visitType) => {
      if (visitType === "general") return 1;
      if (visitType === "both") return 2;

      // specialty-only and refill-only should NOT count
      // toward new/returning general clinic totals
      if (visitType === "specialty_only") return 99;
      if (visitType === "refill_only") return 100;

      return 101;
    };

    const rowMap = new Map();

    summaryEncounterRows.forEach((row) => {
      const encounter = row.encounter || {};
      const visitType = encounter.visitType;
      const leadershipCompleted =
        encounter.leadershipIntakeComplete === true ||
        Boolean(encounter.leadershipIntakeCompletedAt || encounter.leadership_intake_completed_at);

      // Only count patients after leadership intake is complete.
      if (!leadershipCompleted) return;

      // exclude specialty-only + refill-only
      if (
        visitType === "specialty_only" ||
        visitType === "refill_only"
      ) {
        return;
      }

      const patientKey = String(
        row.patient?.id || row.encounter?.patientId || ""
      );

      if (!patientKey) return;

      const existing = rowMap.get(patientKey);

      if (!existing) {
        rowMap.set(patientKey, row);
        return;
      }

      const existingPriority = priorityForVisitType(
        existing.encounter?.visitType
      );

      const nextPriority = priorityForVisitType(
        row.encounter?.visitType
      );

      if (nextPriority < existingPriority) {
        rowMap.set(patientKey, row);
      }
    });

    return Array.from(rowMap.values());
  }, [summaryEncounterRows]);

  const newPatientCount = summaryPatientRows.filter(
    ({ encounter }) => encounter.newReturning === "New"
  ).length;

  const returningPatientCount = summaryPatientRows.filter(
    ({ encounter }) => encounter.newReturning === "Returning"
  ).length;

  const totalPatientCount = summaryPatientRows.length;

  const autoLwobsCount = summaryEncounterRows.filter(
    ({ encounter }) => String(encounter.status || "").toLowerCase() === "cancelled"
  ).length;

  const autoSocialWorkSeenCount = summaryEncounterRows.filter(({ encounter }) => {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};
    return (
      encounter?.socialWorkSeen === true ||
      encounter?.socialWorkSeen === "true" ||
      intakeData?.socialWorkSeen === true ||
      intakeData?.socialWorkSeen === "true" ||
      intakeData?.social_work_seen === true ||
      intakeData?.social_work_seen === "true"
    );
  }).length;

  function encounterHasRecordedLabs(encounter = {}) {
    const hasObjectValues = (value) =>
      value && typeof value === "object" && Object.keys(value).length > 0;

    return (
      hasObjectValues(encounter.inHouseLabs || encounter.in_house_labs) ||
      hasObjectValues(encounter.sendOutLabs || encounter.send_out_labs) ||
      (Array.isArray(encounter.importedSendOutLabs || encounter.imported_send_out_labs) &&
        (encounter.importedSendOutLabs || encounter.imported_send_out_labs).length > 0)
    );
  }

  const autoLabsCount = useMemo(() => {
    const patientIds = new Set();
    summaryEncounterRows.forEach(({ patient, encounter }) => {
      if (encounterHasRecordedLabs(encounter)) patientIds.add(String(patient.id));
    });
    return patientIds.size;
  }, [summaryEncounterRows]);

  const autoZoomCount = summaryPatientRows.filter(({ encounter }) =>
    String(encounter.visitLocation || encounter.visit_location || "")
      .trim()
      .toLowerCase()
      .includes("zoom")
  ).length;

  const autoPhoneCount = summaryPatientRows.filter(({ encounter }) =>
    String(encounter.visitLocation || encounter.visit_location || "")
      .trim()
      .toLowerCase()
      .includes("phone")
  ).length;

  const clinicSummaryStorageKey = summaryClinicDate
    ? `clinic-summary-${summaryClinicDate}`
    : "";

  useEffect(() => {
    if (!clinicSummaryStorageKey) return;

    const saved = window.localStorage.getItem(clinicSummaryStorageKey);

    if (!saved) return;

    try {
      setClinicSummary((prev) => ({
        ...prev,
        ...JSON.parse(saved),
      }));
    } catch (error) {
      console.error("Failed to load saved clinic summary:", error);
    }
  }, [clinicSummaryStorageKey]);

  useEffect(() => {
    if (!session || !summaryClinicDate) return;

    let cancelled = false;

    async function loadSummaryRoster() {
      const roster = await fetchStaffRoster(summaryClinicDate);
      if (cancelled) return;

      setClinicSummary((prev) => ({
        ...prev,
        attendingNames: roster.attendings || "",
        residentNames: roster.residents || "",
        ms34Names: roster.upperLevels || "",
      }));
    }

    loadSummaryRoster();

    const channel = supabase
      .channel(`clinic-summary-staff-roster-${summaryClinicDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_staff_roster",
          filter: `clinic_date=eq.${summaryClinicDate}`,
        },
        loadSummaryRoster
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, summaryClinicDate]);

  useEffect(() => {
    if (!clinicSummaryStorageKey) return;

    window.localStorage.setItem(
      clinicSummaryStorageKey,
      JSON.stringify(clinicSummary)
    );
  }, [clinicSummary, clinicSummaryStorageKey]);

  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState(null);
  const [profilesMessage, setProfilesMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editingProfileNameId, setEditingProfileNameId] = useState(null);
  const [editingProfileNameValue, setEditingProfileNameValue] = useState("");
  const [showOnlyActiveToday, setShowOnlyActiveToday] = useState(false);
  const [medicalSoapEnabled, setMedicalSoapEnabledState] = useState(false);
  const [chartingSettingsBusy, setChartingSettingsBusy] = useState(false);
  const [signatureProfile, setSignatureProfile] = useState(null);
  const [signatureSaving, setSignatureSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchChartingSettings()
      .then((settings) => setMedicalSoapEnabledState(settings.medicalSoapEnabled))
      .catch((error) => {
        console.error("Failed to load charting settings:", error);
        setMedicalSoapEnabledState(false);
      });
  }, [session]);

  async function toggleMedicalSoap() {
    if (!isLeadershipView || chartingSettingsBusy) return;
    const nextEnabled = !medicalSoapEnabled;
    try {
      setChartingSettingsBusy(true);
      await setMedicalSoapEnabled(nextEnabled);
      setMedicalSoapEnabledState(nextEnabled);
      showToast({
        title: nextEnabled ? "Medical SOAP enabled" : "Medical SOAP disabled",
        message: nextEnabled
          ? "The medical SOAP workflow is now available in patient charts."
          : "Medical SOAP is hidden. Discipline-specific notes remain available.",
        tone: nextEnabled ? "success" : "info",
      });
    } catch (error) {
      console.error("Failed to update charting settings:", error);
      showToast({ title: "Charting setting not saved", message: error.message, tone: "error" });
    } finally {
      setChartingSettingsBusy(false);
    }
  }

  function openSignatureManager(profile = null) {
    const target = profile || profiles.find((item) => item.id === session?.user?.id);
    if (["attending", "physical_therapy"].includes(target?.role)) setSignatureProfile(target);
  }

  async function handleSaveClinicalSignature(signatureDataUrl) {
    if (!signatureProfile?.id) return;
    try {
      setSignatureSaving(true);
      await saveClinicalSignature(signatureProfile.id, signatureDataUrl);
      setProfiles((prev) => prev.map((profile) =>
        profile.id === signatureProfile.id
          ? { ...profile, signature_data_url: signatureDataUrl, signature_updated_at: new Date().toISOString() }
          : profile
      ));
      setSignatureProfile(null);
      showToast({ title: "Signature saved", message: "The signature will be included on signed PDF notes.", tone: "success" });
    } catch (error) {
      console.error("Failed to save clinical signature:", error);
      showToast({ title: "Signature not saved", message: error.message, tone: "error" });
    } finally {
      setSignatureSaving(false);
    }
  }

  function dateKeyFromTimestamp(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  const profileById = useMemo(() => {
    const map = new Map();
    profiles.forEach((profile) => {
      map.set(String(profile.id), profile);
    });
    return map;
  }, [profiles]);

  const autoRefillPatientCount = useMemo(() => {
    const patientIds = new Set();
    patients.forEach((patient) => {
      patient.encounters.forEach((encounter) => {
        if (normalizeClinicDate(encounter.clinicDate) !== summaryClinicDate) return;
        if (encounter.visitType !== "refill_only") return;

        patientIds.add(String(patient.id));
      });
    });

    refillRequests.forEach((request) => {
      const status = String(request.status || "").toLowerCase();
      if (status !== "approved") return;
      if (!request.patient_id) return;
      if (!request.approved_by || !request.approved_at) return;
      if (dateKeyFromTimestamp(request.approved_at) !== summaryClinicDate) return;

      const requester = profileById.get(String(request.requested_by));
      const approver = profileById.get(String(request.approved_by));
      const requesterHasRefillAccess =
        requester?.can_refill === true ||
        requester?.role === "attending" ||
        requester?.role === "leadership";
      const signedByAttending = approver?.role === "attending";

      if (!requesterHasRefillAccess || !signedByAttending) return;

      patientIds.add(String(request.patient_id));
    });

    return patientIds.size;
  }, [patients, refillRequests, profileById, summaryClinicDate]);

  const specialtyCounts = useMemo(() => {
    const counts = {
      pt: { specialtyOnly: 0, both: 0 },
      dermatology: { specialtyOnly: 0, both: 0 },
      ophthalmology: { specialtyOnly: 0, both: 0 },
      mental_health: { specialtyOnly: 0, both: 0 },
      addiction: { specialtyOnly: 0, both: 0 },
      social_work: { specialtyOnly: 0, both: 0 },
    };

    patients.forEach((patient) => {
      const encountersForDate = (patient.encounters || []).filter(
        (encounter) => normalizeClinicDate(encounter.clinicDate) === summaryClinicDate
      );

      encountersForDate.forEach((encounter) => {
        const specialty = String(encounter.specialtyType || "").toLowerCase();
        if (!specialty || !counts[specialty]) return;

        const visitType = String(encounter.visitType || "general").toLowerCase();

        const hasGeneralSameDay = encountersForDate.some((otherEncounter) => {
          if (!otherEncounter || otherEncounter.id === encounter.id) return false;

          const otherVisitType = String(otherEncounter.visitType || "general").toLowerCase();

          return (
            otherVisitType === "general" ||
            otherVisitType === "both" ||
            otherEncounter.dualVisit === true
          );
        });

        const isGeneralAndSpecialty =
          visitType === "both" ||
          encounter.dualVisit === true ||
          hasGeneralSameDay;

        if (isGeneralAndSpecialty) {
          counts[specialty].both += 1;
        } else if (visitType === "specialty_only") {
          counts[specialty].specialtyOnly += 1;
        }
      });
    });

    const formatSpecialtyCount = ({ specialtyOnly, both }) => {
  if (!specialtyOnly && !both) return "0";

  return `${specialtyOnly} Specialty-only + ${both} Spec+Gen`;
};

    return {
      pt: formatSpecialtyCount(counts.pt),
      dermatology: formatSpecialtyCount(counts.dermatology),
      ophthalmology: formatSpecialtyCount(counts.ophthalmology),
      mental_health: formatSpecialtyCount(counts.mental_health),
      addiction: formatSpecialtyCount(counts.addiction),
      social_work: formatSpecialtyCount(counts.social_work),
    };
  }, [patients, summaryClinicDate]);

  function applyAutoClinicNumbers() {
    setClinicSummary((prev) => ({
      ...prev,
      refillCount: String(autoRefillPatientCount),
      lwobsCount: String(autoLwobsCount),
      labsCount: String(autoLabsCount),
      mentalHealthCount: String(specialtyCounts.mental_health || 0),
      addictionMedicineCount: String(specialtyCounts.addiction || 0),
      ptCount: String(specialtyCounts.pt || 0),
      dermatologyCount: String(specialtyCounts.dermatology || 0),
      ophthalmologyCount: String(specialtyCounts.ophthalmology || 0),
      socialWorkCount: String(autoSocialWorkSeenCount || 0),
      zoomCount: String(autoZoomCount),
      phoneCount: String(autoPhoneCount),
      ms12Names: autoMs12Names,
    }));
  }

  useEffect(() => {
    applyAutoClinicNumbers();
  }, [
    autoRefillPatientCount,
    autoLwobsCount,
    autoLabsCount,
    specialtyCounts.mental_health,
    specialtyCounts.addiction,
    specialtyCounts.pt,
    specialtyCounts.dermatology,
    specialtyCounts.ophthalmology,
    autoSocialWorkSeenCount,
    autoZoomCount,
    autoPhoneCount,
    autoMs12Names,
  ]);



  const currentUserProfile = useMemo(() => {
    return profiles.find((profile) => profile.id === session?.user?.id) || null;
  }, [profiles, session?.user?.id]);

  const currentSpecialtyAccess = useMemo(() => {
    const value = currentUserProfile?.specialty_access;
    const access = Array.isArray(value)
      ? value
      : (typeof value === "string" && value.trim() ? [value.trim()] : []);
    if (userRole === "physical_therapy" && !access.includes("Physical Therapy")) {
      return [...access, "Physical Therapy"];
    }
    return access;
  }, [currentUserProfile, userRole]);

  const canUseOphthoQueueTools = currentSpecialtyAccess.includes("Ophthalmology");
  const canUseWholeClinicQueueTools = canUseOphthoQueueTools || userRole === "social_work";

  const canAccessPrograms = isLeadershipView || currentSpecialtyAccess.length > 0;

  const filteredProfiles = useMemo(() => {
    let nextProfiles = profiles;

    if (showOnlyActiveToday) {
      nextProfiles = nextProfiles.filter((profile) =>
        isToday(profile.last_seen_at)
      );
    }

    const query = userSearch.trim().toLowerCase();
    if (!query) return nextProfiles;

    return nextProfiles.filter((profile) => {
      const fullName = (profile.full_name || "").toLowerCase();
      const role = (profile.role || "").toLowerCase();
      const classification = (profile.classification || "").toLowerCase();
      const email = (profile.email || "").toLowerCase();
      const specialtyAccess = Array.isArray(profile.specialty_access)
        ? profile.specialty_access.join(" ").toLowerCase()
        : String(profile.specialty_access || "").toLowerCase();

      return (
        fullName.includes(query) ||
        role.includes(query) ||
        classification.includes(query) ||
        email.includes(query) ||
        specialtyAccess.includes(query)
      );
    });
  }, [profiles, userSearch, showOnlyActiveToday]);

  async function handleUndergradStartEncounter(data) {
    try {
      let targetPatient = null;
      const createdEncounters = [];

      if (data.matchedPatientId) {
        const existingPatient = patients.find((p) => p.id === data.matchedPatientId);

        if (!existingPatient) {
          throw new Error("Matched patient was not found.");
        }

        const patientUpdates = {
          preferredName: data.preferredName,
          phone: data.phone,
          sex: data.sex,
          ethnicity: data.ethnicity,
          address: data.addressLine1,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          emergencyContactName: data.emergencyContactName,
          emergencyContactRelation: data.emergencyContactRelation,
          emergencyContactPhone: data.emergencyContactPhone,
          last4ssn: data.last4Ssn,
          incomeRange: data.incomeRange,
          spanishOnly: data.spanishOnly,
          chronicConditions: data.chronicConditions,
          chronicConditionsOther: data.chronicConditionsOther,
        };

        targetPatient = await updatePatientInSupabase(existingPatient.id, patientUpdates);
      } else {
        const patientToSave = {
          ...data,
          mrn: "",
        };

        targetPatient = await createPatientInSupabase(patientToSave);
      }

      const encounterBase = {
        clinicDate: formatClinicDate(),
        createdAt: new Date().toISOString(),
        dailyNumber: data.dailyNumber || "",
        refillNumber: "",
        newReturning: data.matchedPatientId ? "Returning" : (data.isReturning || "New"),
        visitLocation: "In Clinic",
        chiefComplaint: "",
        notes: "",
        transportation: "",
        needsElevator: false,
        spanishSpeaking: false,
        mammogramStatus: "",
        papStatus: "",
        fluShot: "",
        htn: false,
        dm: false,
        labsLast6Months: "",
        nicotineUse: "",
        nicotineDetails: "",
        substanceUseConcern: "",
        substanceUseTreatment: "",
        substanceUseNotes: "",
        dermatology: "N/A",
        ophthalmology: "N/A",
        optometry: "N/A",
        diabeticEyeExamPastYear: "N/A",
        physicalTherapy: "N/A",
        mentalHealthCombined: "N/A",
        counseling: "N/A",
        anyMentalHealthPositive: false,
        status: "started",
        assignedStudent: "",
        assignedUpperLevel: "",
        roomNumber: "",
        leadershipIntakeComplete: false,
        refillMedicationRequest: data.refillMedicationRequest || "",
      };

      let savedEncounter = null;

      if (data.visitType === "both") {
        const generalEncounter = {
          ...encounterBase,
          visitType: "general",
          specialtyType: "",
          status: "started",
          leadershipIntakeComplete: false,
          pharmacyStatus: "",
        };

        const specialtyEncounter = {
          ...encounterBase,
          visitType: "specialty_only",
          specialtyType: data.specialtyType || "",
          chiefComplaint: data.specialtyType
            ? `${data.specialtyType} Specialty Visit`
            : "Specialty Visit",
          status: "undergrad_complete",
          leadershipIntakeComplete: true,
          pharmacyStatus: "waiting",
        };

        savedEncounter = await createEncounterInSupabase(targetPatient.id, generalEncounter);
        const savedSpecialtyEncounter = await createEncounterInSupabase(
          targetPatient.id,
          specialtyEncounter
        );
        createdEncounters.push(
          { encounter: savedEncounter, visitType: "general" },
          { encounter: savedSpecialtyEncounter, visitType: "specialty_only" }
        );
      } else {
        const isRefillOnly = data.visitType === "refill_only";
        const isSpecialtyOnly = data.visitType === "specialty_only";

        const singleEncounter = {
          ...encounterBase,
          visitType: data.visitType || "general",
          specialtyType: isRefillOnly ? "" : data.specialtyType || "",
          chiefComplaint: isRefillOnly
            ? "Refills Only"
            : isSpecialtyOnly
              ? data.specialtyType
                ? `${data.specialtyType} Specialty Visit`
                : "Specialty Visit"
              : encounterBase.chiefComplaint || data.chiefComplaint || "",
          status: isRefillOnly || isSpecialtyOnly ? "undergrad_complete" : "started",
          leadershipIntakeComplete: isRefillOnly || isSpecialtyOnly,
          pharmacyStatus: isRefillOnly || isSpecialtyOnly ? "waiting" : "",
        };

        savedEncounter = await createEncounterInSupabase(targetPatient.id, singleEncounter);
        createdEncounters.push({
          encounter: savedEncounter,
          visitType: singleEncounter.visitType,
        });

        if (isRefillOnly && savedEncounter?.id) {
          await assignNextRefillNumberInSupabase(
            savedEncounter.id,
            savedEncounter.clinic_date || singleEncounter.clinicDate
          );
        }
      }

      if (userRole === "undergraduate") {
        await Promise.all(
          createdEncounters.map(async ({ encounter: createdEncounter, visitType }) => {
            if (!createdEncounter?.id) return;

            try {
              await createAuditLog({
                encounterId: createdEncounter.id,
                patientId: targetPatient.id,
                actorUserId: session?.user?.id || null,
                actorName:
                  profileNameMap[session?.user?.id] || authFullName || "Unknown Undergraduate",
                actorRole: userRole,
                action: "patient_checked_in",
                details: { visitType },
              });
            } catch (auditError) {
              // Check-in should still succeed if audit logging is temporarily unavailable.
              console.error("Failed to record undergraduate check-in audit:", auditError);
            }
          })
        );
      }

      await refreshClinicData();

      setSelectedPatientId(targetPatient.id);
      setSelectedEncounterId(savedEncounter.id);

      showToast({
        title: "Encounter started",
        message: "Patient was added successfully and you can start the next intake.",
        type: "success",
        duration: 3000,
      });

      return true;
    } catch (error) {
      console.error("Failed to save undergrad intake:", error);
      showToast({
        title: "Failed to save intake",
        message: error.message,
        type: "error",
        duration: 5000,
      });
      return false;
    }
  }

  function openUndergradRegistration(patientId, encounterId) {
    const patient = patients.find((p) => p.id === patientId);
    const encounter = patient?.encounters.find((e) => e.id === encounterId);

    if (!patient || !encounter) return;

    setRegistrationPatientId(patientId);
    setRegistrationEncounterId(encounterId);

    setUndergradRegistrationForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      dob: patient.dob || "",
      mrn: patient.mrn || "",
      addressLine1: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zipCode: patient.zipCode || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactRelation: patient.emergencyContactRelation || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      last4Ssn: patient.last4ssn || "",
      incomeRange: patient.incomeRange || "",
      spanishOnly: patient.spanishOnly || "",
      chronicConditions: patient.chronicConditions || [],
      chronicConditionsOther: patient.chronicConditionsOther || "",
      dailyNumber: encounter.dailyNumber || "",
      refillNumber: encounter.refillNumber || "",
      visitType: encounter.visitType || "general",
      specialtyType: encounter.specialtyType || "",
      refillMedicationRequest: encounter.refillMedicationRequest || "",
    });

    setShowUndergradRegistrationModal(true);
  }

  async function moveUndergradRegistrationToExistingMrnChart(sourcePatientId, targetPatientId) {
    const patient = patients.find((p) => String(p.id) === String(sourcePatientId));
    const encounter = patient?.encounters.find((e) => String(e.id) === String(registrationEncounterId));
    const mrnConflictPatient = patients.find((p) => String(p.id) === String(targetPatientId));

    if (!patient || !encounter || !mrnConflictPatient) {
      alert("Could not find both patient records to move this registration.");
      return;
    }

    try {
      const currentStatus = encounter.status || "started";
      const activeRegistrationStatuses = new Set(["started", "undergrad_complete"]);
      const nextStatus = activeRegistrationStatuses.has(currentStatus)
        ? encounter.leadershipIntakeComplete
          ? "ready"
          : "undergrad_complete"
        : currentStatus;

      const nextVisitType = undergradRegistrationForm.visitType || encounter.visitType || "general";
      const nextSpecialtyType =
        nextVisitType === "both" || nextVisitType === "specialty_only"
          ? undergradRegistrationForm.specialtyType || ""
          : "";
      const nextRefillMedicationRequest =
        nextVisitType === "refill_only"
          ? undergradRegistrationForm.refillMedicationRequest || ""
          : "";

      const undergradCompletedAt = encounter.undergradCompletedAt || new Date().toISOString();

      await updatePatientInSupabase(mrnConflictPatient.id, {
        last4ssn: mrnConflictPatient.last4ssn || undergradRegistrationForm.last4Ssn,
        address: undergradRegistrationForm.addressLine1 || mrnConflictPatient.address,
        city: undergradRegistrationForm.city || mrnConflictPatient.city,
        state: undergradRegistrationForm.state || mrnConflictPatient.state,
        zipCode: undergradRegistrationForm.zipCode || mrnConflictPatient.zipCode,
        emergencyContactName:
          undergradRegistrationForm.emergencyContactName || mrnConflictPatient.emergencyContactName,
        emergencyContactRelation:
          undergradRegistrationForm.emergencyContactRelation || mrnConflictPatient.emergencyContactRelation,
        emergencyContactPhone:
          undergradRegistrationForm.emergencyContactPhone || mrnConflictPatient.emergencyContactPhone,
        incomeRange: undergradRegistrationForm.incomeRange || mrnConflictPatient.incomeRange,
        spanishOnly: undergradRegistrationForm.spanishOnly || mrnConflictPatient.spanishOnly,
        chronicConditions:
          undergradRegistrationForm.chronicConditions?.length > 0
            ? undergradRegistrationForm.chronicConditions
            : mrnConflictPatient.chronicConditions,
        chronicConditionsOther:
          undergradRegistrationForm.chronicConditionsOther || mrnConflictPatient.chronicConditionsOther,
      });

      const { selectedEncounterId: nextSelectedEncounterId } =
        await applyVisitTypeConversion(mrnConflictPatient.id, registrationEncounterId, {
        patientId: mrnConflictPatient.id,
        status: nextStatus,
        undergradCompletedAt,
        dailyNumber: undergradRegistrationForm.dailyNumber || "",
        refillNumber: nextVisitType === "refill_only" ? encounter.refillNumber || "" : "",
        visitType: nextVisitType,
        specialtyType: nextSpecialtyType,
        refillMedicationRequest: nextRefillMedicationRequest,
        dualVisit: nextVisitType === "both",
      });

      if ((patient.encounters?.length || 0) <= 1) {
        try {
          await deletePatientInSupabase(patient.id);
        } catch (deleteError) {
          console.warn("Temporary duplicate patient could not be deleted:", deleteError);
          showToast({
            title: "Visit moved, cleanup needed",
            message: "The registration was saved to the existing MRN chart, but the temporary duplicate patient could not be deleted automatically.",
            type: "warning",
            duration: 7000,
          });
        }
      }

      await refreshClinicData();

      setSelectedPatientId(mrnConflictPatient.id);
      setDashboardSelectedPatientId(mrnConflictPatient.id);
      setSelectedEncounterId(nextSelectedEncounterId);
      setShowUndergradRegistrationModal(false);
      setPendingUndergradRegistrationMerge(null);
      setRegistrationPatientId(null);
      setRegistrationEncounterId(null);
      setUndergradRegistrationForm(EMPTY_UNDERGRAD_REGISTRATION_FORM);

      showToast({
        title: "Registration moved to existing chart",
        message: `MRN ${mrnConflictPatient.mrn} is now using ${getFullPatientName(mrnConflictPatient)}'s chart.`,
        type: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("Failed to move registration to existing MRN chart:", error);
      showToast({
        title: "Failed to save registration",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function saveUndergradRegistration() {
    const patient = patients.find((p) => p.id === registrationPatientId);
    const encounter = patient?.encounters.find((e) => e.id === registrationEncounterId);

    if (!patient || !encounter) return;

    const patientUpdates = {
      mrn: undergradRegistrationForm.mrn,
      last4ssn: undergradRegistrationForm.last4Ssn,
      address: undergradRegistrationForm.addressLine1,
      city: undergradRegistrationForm.city,
      state: undergradRegistrationForm.state,
      zipCode: undergradRegistrationForm.zipCode,
      emergencyContactName: undergradRegistrationForm.emergencyContactName,
      emergencyContactRelation: undergradRegistrationForm.emergencyContactRelation,
      emergencyContactPhone: undergradRegistrationForm.emergencyContactPhone,
      incomeRange: undergradRegistrationForm.incomeRange,
      spanishOnly: undergradRegistrationForm.spanishOnly,
      chronicConditions: undergradRegistrationForm.chronicConditions,
      chronicConditionsOther: undergradRegistrationForm.chronicConditionsOther,
    };

    const mrnConflictPatient = undergradRegistrationForm.mrn.trim()
      ? findPatientByMrn(undergradRegistrationForm.mrn, registrationPatientId)
      : null;

    if (mrnConflictPatient) {
      setPendingUndergradRegistrationMerge({
        sourcePatientId: registrationPatientId,
        targetPatientId: mrnConflictPatient.id,
        intendedMrn: undergradRegistrationForm.mrn.trim(),
      });
      return;
    }

    try {
      await updatePatientInSupabase(registrationPatientId, patientUpdates);

      const currentStatus = encounter.status || "started";
      const activeRegistrationStatuses = new Set(["started", "undergrad_complete"]);
      const nextStatus = activeRegistrationStatuses.has(currentStatus)
        ? encounter.leadershipIntakeComplete
          ? "ready"
          : "undergrad_complete"
        : currentStatus;

      const nextVisitType = undergradRegistrationForm.visitType || encounter.visitType || "general";
      const nextSpecialtyType =
        nextVisitType === "both" || nextVisitType === "specialty_only"
          ? undergradRegistrationForm.specialtyType || ""
          : "";
      const nextRefillMedicationRequest =
        nextVisitType === "refill_only"
          ? undergradRegistrationForm.refillMedicationRequest || ""
          : "";

      const undergradCompletedAt = encounter.undergradCompletedAt || new Date().toISOString();

      const { selectedEncounterId: nextSelectedEncounterId } =
        await applyVisitTypeConversion(registrationPatientId, registrationEncounterId, {
        status: nextStatus,
        undergradCompletedAt,
        dailyNumber: undergradRegistrationForm.dailyNumber || "",
        refillNumber: nextVisitType === "refill_only" ? encounter.refillNumber || "" : "",
        visitType: nextVisitType,
        specialtyType: nextSpecialtyType,
        refillMedicationRequest: nextRefillMedicationRequest,
        dualVisit: nextVisitType === "both",
      });

      let assignedRefillNumber = encounter.refillNumber || "";

      if (nextVisitType === "refill_only" && !assignedRefillNumber) {
        assignedRefillNumber = await assignNextRefillNumberInSupabase(
          registrationEncounterId,
          encounter.clinicDate || formatClinicDate()
        );
      }

      await refreshClinicData();
      setSelectedPatientId(registrationPatientId);
      setSelectedEncounterId(nextSelectedEncounterId);

      setShowUndergradRegistrationModal(false);
      setRegistrationPatientId(null);
      setRegistrationEncounterId(null);
      setUndergradRegistrationForm(EMPTY_UNDERGRAD_REGISTRATION_FORM);
    } catch (error) {
      console.error("Failed to save undergrad registration:", error);
      showToast({
        title: "Failed to save registration",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }
  function openLeadershipRegistration(patientId, encounterId) {
    const patient = patients.find((p) => p.id === patientId);
    const encounter = patient?.encounters.find((e) => e.id === encounterId);

    if (!patient || !encounter) return;

    setSelectedPatientId(patientId);
    setSelectedEncounterId(encounterId);

    setIntakeForm({
      patientId: patient.id,
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      preferredName: patient.preferredName || "",
      mrn: patient.mrn || "",
      last4ssn: patient.last4ssn || "",
      dob: patient.dob || "",
      age: patient.age || "",
      phone: patient.phone || "",
      sex: patient.sex || "",
      ethnicity: patient.ethnicity || "",
      pronouns: patient.pronouns || "",
      dailyNumber: encounter.dailyNumber || "",
      newReturning: encounter.newReturning || "",
      ttuStudent: patient.ttuStudent || false,
      visitLocation: encounter.visitLocation || "In Clinic",
      chiefComplaint: encounter.chiefComplaint || "",
      notes: encounter.notes || "",
      transportation: encounter.transportation || "",
      needsElevator: encounter.needsElevator || false,
      spanishSpeaking:
        encounter.spanishSpeaking ||
        String(patient.spanishOnly || "").toLowerCase().includes("spanish"),
      languagePreference:
        patient.spanishOnly ||
        ((patient.encounters || []).some((item) => item.spanishSpeaking === true)
          ? "Spanish"
          : ""),
      over65: patient.age ? Number(patient.age) > 65 : false,
      mammogramStatus: encounter.mammogramStatus || encounter.mammogramPapSmear || "",
      papStatus: encounter.papStatus || "",
      fluShot: encounter.fluShot || "",
      htn:
        encounter.htn ||
        (patient.chronicConditions || []).some((condition) =>
          ["htn", "hypertension"].includes(String(condition).toLowerCase())
        ) ||
        (patient.encounters || []).some((item) => item.htn === true),
      dm:
        encounter.dm ||
        (patient.chronicConditions || []).some((condition) =>
          ["dm", "diabetes"].includes(String(condition).toLowerCase())
        ) ||
        (patient.encounters || []).some((item) => item.dm === true),
      labsLast6Months: encounter.labsLast6Months || "",
      nicotineUse: encounter.nicotineUse || "",
      nicotineDetails: encounter.nicotineDetails || "",
      substanceUseConcern: encounter.substanceUseConcern || "",
      substanceUseTreatment: encounter.substanceUseTreatment || "",
      substanceUseNotes: encounter.substanceUseNotes || "",
      dermatology: encounter.dermatology || "N/A",
      ophthalmology: encounter.ophthalmology || "N/A",
      optometry: encounter.optometry || "N/A",
      diabeticEyeExamPastYear: encounter.diabeticEyeExamPastYear || "N/A",
      physicalTherapy: encounter.physicalTherapy || "N/A",
      mentalHealthCombined: encounter.mentalHealthCombined || "N/A",
      counseling: encounter.counseling || "N/A",
      anyMentalHealthPositive: encounter.anyMentalHealthPositive || false,
      visitType: encounter.visitType || "general",
      specialtyType: encounter.specialtyType || "",
      leadershipIntakeComplete: false,
    });

    setEditingPatientId(patientId);
    setIsEditingIntake(true);
    setIntakeTab(0);
    setShowIntakeModal(true);
  }

  useEffect(() => {
    loadProfiles({ showLoading: true }); // initial load

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadProfiles({ includeSignatures: false, silent: true });
      }
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const profileNameMap = useMemo(() => {
    const map = {};

    profiles.forEach((profile) => {
      map[profile.id] = profile.full_name || "Unknown User";
    });

    if (session?.user?.id && authFullName) {
      map[session.user.id] = authFullName;
    }

    return map;
  }, [profiles, session?.user?.id, authFullName]);

  const soapAuthorName = selectedEncounter?.soapAuthorId
    ? profileNameMap[selectedEncounter.soapAuthorId] || "Unknown User"
    : "";

  const upperLevelSignerName = selectedEncounter?.upperLevelSignedBy
    ? profileNameMap[selectedEncounter.upperLevelSignedBy] || "Unknown User"
    : "";

  const attendingSignerName = selectedEncounter?.attendingSignedBy
    ? profileNameMap[selectedEncounter.attendingSignedBy] || "Unknown User"
    : "";

  const attendingSignatureData = selectedEncounter?.attendingSignedBy
    ? selectedEncounter.attendingSignatureData || profiles.find((profile) => profile.id === selectedEncounter.attendingSignedBy)?.signature_data_url || ""
    : "";



  const filteredEncounterRows = visibleEncounterRows.filter(({ patient }) =>
    filteredPatients.some((p) => p.id === patient.id)
  );

  const isPharmacyQueueView = activeView === "pharmacy-queue";

  const waitingEncounterRows = useMemo(() => {
    const effectiveQueueDate = queueClinicDate || formatClinicDate();

    const activeRows = allEncounterRows.filter(({ encounter }) => {
      const isSelectedQueueDate =
        normalizeClinicDate(encounter.clinicDate) === effectiveQueueDate;

      const isPharmacyWorkflow =
        encounter.visitType === "refill_only" ||
        encounter.visitType === "specialty_only";

      if (!isSelectedQueueDate) return false;
      if (encounter.status === "cancelled") return false;

      // Keep specialty-only/refill-only workflow rows out of the normal General Queue.
      // They still appear in Pharmacy Queue and the dedicated specialty/social-work views.
      if (!isPharmacyQueueView && !canUseWholeClinicQueueTools && isPharmacyWorkflow) {
        return false;
      }

      if (canUseWholeClinicQueueTools && !isPharmacyQueueView) {
        if (encounter.visitType === "refill_only") return false;

        return (
          encounter.status === "ready" ||
          encounter.status === "roomed" ||
          encounter.status === "in_visit" ||
          encounter.status === "done" ||
          encounter.soapStatus === "signed" ||
          encounter.visitType === "specialty_only"
        );
      }

      if (isPharmacyWorkflow) {
        return true;
      }

      return (
        encounter.status === "ready" ||
        encounter.status === "roomed" ||
        encounter.status === "in_visit" ||
        encounter.status === "done" ||
        encounter.soapStatus === "signed"
      );
    });

    const currentUserName = (
      profileNameMap[session?.user?.id] ||
      authFullName ||
      ""
    ).trim();

    let rows = activeRows;

    if (userRole === "student") {
      if (canRefillAccess) {
        rows = activeRows;
      } else if (canUseOphthoQueueTools) {
        rows = activeRows.filter(
          ({ encounter }) => encounter.visitType !== "refill_only"
        );
      } else {
        rows = activeRows.filter(({ encounter }) =>
          (encounter.assignedStudent || "")
            .trim()
            .toLowerCase()
            .includes(currentUserName.toLowerCase())
        );
      }
    } else if (userRole === "social_work") {
      rows = activeRows.filter(
        ({ encounter }) => encounter.visitType !== "refill_only"
      );
    } else if (userRole === "upper_level") {
      rows = activeRows.filter(({ encounter }) =>
        (encounter.assignedUpperLevel || "")
          .trim()
          .toLowerCase()
          .includes(currentUserName.toLowerCase())
      );
    } else if (userRole === "attending") {
      rows = activeRows.filter(
        ({ encounter }) => encounter.soapStatus === "awaiting_attending"
      );
    } else {
      // leadership/general queue should only show general encounters
      if (
        isPharmacyQueueView ||
        userRole === "pharmacy" ||
        userRole === "undergraduate" ||
        userRole === "social_work" ||
        canRefillAccess
      ) {
        rows = activeRows;
      } else {
        // leadership/general queue should only show general assignable encounters
        rows = activeRows.filter(
          ({ encounter }) =>
            encounter.visitType !== "specialty_only" &&
            encounter.visitType !== "refill_only"
        );
      }

      rows = [...rows].sort((a, b) => {
        const aUnassigned =
          !a.encounter.assignedStudent && !a.encounter.assignedUpperLevel
            ? 0
            : 1;
        const bUnassigned =
          !b.encounter.assignedStudent && !b.encounter.assignedUpperLevel
            ? 0
            : 1;

        if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;

        return sortRowsByDailyNumberThenTime(a, b);
      });

      return rows;
    }

    return [...rows].sort(sortRowsByDailyNumberThenTime);
  }, [
    allEncounterRows,
    queueClinicDate,
    profileNameMap,
    session?.user?.id,
    authFullName,
    userRole,
    canUseOphthoQueueTools,
    canUseWholeClinicQueueTools,
    canRefillAccess,
    isPharmacyQueueView,
  ]);

  const labEncounterRows = useMemo(() => {
    const effectiveLabQueueDate = labQueueDate || formatClinicDate();

    return allEncounterRows
      .filter(({ encounter }) => {
        if (!encounter) return false;
        if (normalizeClinicDate(encounter.clinicDate) !== effectiveLabQueueDate) return false;
        if (encounter.status === "cancelled") return false;
        if (encounter.status === "done") return false;
        if (encounter.soapStatus === "signed") return false;

        return (
          encounter.status === "started" ||
          encounter.status === "undergrad_complete" ||
          encounter.status === "ready" ||
          encounter.status === "roomed" ||
          encounter.status === "in_visit"
        );
      })
      .sort(sortRowsByDailyNumberThenTime);
  }, [allEncounterRows, labQueueDate]);

  useEffect(() => {
    if (userRole !== "undergraduate") return;

    const medsReadyRows = waitingEncounterRows.filter(({ encounter }) => {
      if (encounter?.pharmacyStatus !== "meds_ready") return false;

      const readyBy = encounter?.pharmacyReadyBy || encounter?.pharmacy_ready_by;
      const readyByProfile = (profiles || []).find(
        (profile) => String(profile.id) === String(readyBy)
      );

      return readyByProfile?.role === "pharmacy";
    });

    if (medsReadyRows.length === 0) {
      if (lastPharmacyToastKey) {
        setLastPharmacyToastKey("");
        setPharmacyToast(null);
      }
      return;
    }

    const toastKey = medsReadyRows
      .map(({ encounter }) => encounter.id)
      .sort()
      .join("|");

    if (toastKey === lastPharmacyToastKey) return;

    setLastPharmacyToastKey(toastKey);
    setPharmacyToast({
      key: toastKey,
      count: medsReadyRows.length,
    });

    showToast({
      title: "Pharmacy Pickup Needed",
      message:
        medsReadyRows.length === 1
          ? "A patient has medications ready. Click to open Live Queue."
          : `${medsReadyRows.length} patients have medications ready. Click to open Live Queue.`,
      type: "success",
      duration: 0,
      actionLabel: "Open Live Queue",
      onClick: () => {
        setActiveView("queue");
        setPharmacyToast(null);
      },
    });
  }, [waitingEncounterRows, userRole, lastPharmacyToastKey, profiles]);

  const assignedCount = boardEncounterRows.filter(
    ({ encounter }) =>
      (encounter.status === "roomed" || encounter.status === "in_visit") &&
      encounter.soapStatus !== "signed"
  ).length;

  const inVisitCount = boardEncounterRows.filter(
    ({ encounter }) =>
      encounter.status === "in_visit" &&
      encounter.soapStatus !== "signed"
  ).length;

  function isEncounterStillOnRoomBoard(encounter) {
    if (!encounter?.roomNumber) return false;
    if (encounter.status === "done") return false;
    if (encounter.soapStatus === "signed") return false;
    return true;
  }

  function normalizeAssigneeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getEncounterOwnerKey(encounterLike) {
    const student = normalizeAssigneeName(encounterLike?.assignedStudent);
    if (student) return `student:${student}`;

    const upperLevel = normalizeAssigneeName(encounterLike?.assignedUpperLevel);
    if (upperLevel) return `upper:${upperLevel}`;

    return "";
  }

  function getActiveRoomRows(roomNumber, clinicDateOverride = boardClinicDate) {
    const targetClinicDate = normalizeClinicDate(clinicDateOverride || boardClinicDate);

    return allEncounterRows.filter(
      ({ encounter }) =>
        Number(encounter.roomNumber) === Number(roomNumber) &&
        (!targetClinicDate || normalizeClinicDate(encounter.clinicDate) === targetClinicDate) &&
        isEncounterStillOnRoomBoard(encounter)
    );
  }

  function getRoomConflictDetails(roomNumber, currentEncounterId, incomingAssignment = {}) {
    const targetClinicDate =
      incomingAssignment.clinicDate ||
      incomingAssignment.clinic_date ||
      selectedEncounter?.clinicDate ||
      boardClinicDate;

    const activeRows = getActiveRoomRows(roomNumber, targetClinicDate).filter(
      ({ encounter }) => String(encounter.id) !== String(currentEncounterId)
    );

    if (activeRows.length === 0) {
      return {
        hasAnyOccupant: false,
        hasConflict: false,
        sameOwnerReuse: false,
        occupiedByNames: [],
        ownerKeys: [],
        rows: [],
      };
    }

    const incomingOwnerKey = getEncounterOwnerKey(incomingAssignment);

    const ownerKeys = Array.from(
      new Set(activeRows.map(({ encounter }) => getEncounterOwnerKey(encounter)).filter(Boolean))
    );

    const occupiedByNames = Array.from(
      new Set(activeRows.map(({ patient }) => getPatientBoardName(patient)).filter(Boolean))
    );

    const sameOwnerReuse =
      !!incomingOwnerKey &&
      ownerKeys.length > 0 &&
      ownerKeys.every((key) => key === incomingOwnerKey);

    return {
      hasAnyOccupant: true,
      hasConflict: !sameOwnerReuse,
      sameOwnerReuse,
      occupiedByNames,
      ownerKeys,
      rows: activeRows,
    };
  }


  const roomMap = useMemo(() => {
    const map = {};
    ROOM_OPTIONS.forEach((room) => {
      map[room.number] = null;
    });

    boardEncounterRows.forEach(({ patient, encounter }) => {
      if (
        encounter.roomNumber &&
        encounter.status !== "done" &&
        encounter.soapStatus !== "signed"
      ) {
        map[Number(encounter.roomNumber)] = { patient, encounter };
      }
    });

    return map;
  }, [boardEncounterRows]);

  const roomDropdownOptions = useMemo(() => {
    return ROOM_OPTIONS.map((room) => {
      const roomRows = getActiveRoomRows(room.number, boardClinicDate);

      const occupied = roomRows.length > 0;

      const occupiedByNames = Array.from(
        new Set(roomRows.map(({ patient }) => getPatientBoardName(patient)).filter(Boolean))
      );

      const assignedStudentsInRoom = Array.from(
        new Set(
          roomRows
            .map(({ encounter }) => (encounter.assignedStudent || "").trim())
            .filter(Boolean)
        )
      );

      const assignedUpperLevelsInRoom = Array.from(
        new Set(
          roomRows
            .map(({ encounter }) => (encounter.assignedUpperLevel || "").trim())
            .filter(Boolean)
        )
      );

      return {
        ...room,
        occupied,
        occupiedBy: occupiedByNames.join(", "),
        occupiedByNames,
        assignedStudentsInRoom,
        assignedUpperLevelsInRoom,
        activeEncounterCount: roomRows.length,
        statusLabel: occupied ? "Occupied" : "Available",
        displayLabel: `${room.label} — ${room.area}`,
      };
    });
  }, [allEncounterRows, boardClinicDate]);


  function updateIntakeField(field, value) {
    if (field === "dob") {
      const age = calculateAge(value);
      setIntakeForm((prev) => ({
        ...prev,
        dob: value,
        age,
        over65: age ? Number(age) > 65 : false,
      }));
      return;
    }

    setIntakeForm((prev) => {
      const updated = { ...prev, [field]: value };

      if ((field === "htn" || field === "dm") && !updated.htn && !updated.dm) {
        updated.labsLast6Months = "";
      }

      if (
        (field === "mentalHealthCombined" || field === "counseling") &&
        updated.mentalHealthCombined === "N/A" &&
        updated.counseling === "N/A"
      ) {
        updated.anyMentalHealthPositive = false;
      }

      return updated;
    });
  }

  function applyPatientToIntake(matchedPatient) {
    if (!matchedPatient) return;

    setAutoFilledMatchPatientId(matchedPatient.id);

    setIntakeForm((prev) => ({
      ...prev,
      firstName: prev.firstName || matchedPatient.firstName || "",
      preferredName: prev.preferredName || matchedPatient.preferredName || "",
      mrn: prev.mrn || matchedPatient.mrn || "",
      last4ssn: prev.last4ssn || matchedPatient.last4ssn || "",
      dob: prev.dob || matchedPatient.dob || "",
      age: prev.age || matchedPatient.age || "",
      phone: prev.phone || matchedPatient.phone || "",
      pronouns: prev.pronouns || matchedPatient.pronouns || "",
      ethnicity: prev.ethnicity || matchedPatient.ethnicity || "",
      sex: prev.sex || matchedPatient.sex || "",
      newReturning: "Returning",
      ttuStudent: prev.ttuStudent || matchedPatient.ttuStudent || false,
      htn:
        prev.htn ||
        (matchedPatient.chronicConditions || []).some((condition) =>
          ["htn", "hypertension"].includes(String(condition).toLowerCase())
        ) ||
        (matchedPatient.encounters || []).some((encounter) => encounter.htn === true),
      dm:
        prev.dm ||
        (matchedPatient.chronicConditions || []).some((condition) =>
          ["dm", "diabetes"].includes(String(condition).toLowerCase())
        ) ||
        (matchedPatient.encounters || []).some((encounter) => encounter.dm === true),
      languagePreference:
        prev.languagePreference ||
        matchedPatient.spanishOnly ||
        ((matchedPatient.encounters || []).some((encounter) => encounter.spanishSpeaking === true)
          ? "Spanish"
          : ""),
      spanishSpeaking:
        prev.spanishSpeaking ||
        String(matchedPatient.spanishOnly || "").toLowerCase().includes("spanish") ||
        (matchedPatient.encounters || []).some((encounter) => encounter.spanishSpeaking === true),
      over65:
        prev.over65 ||
        (matchedPatient.age ? Number(matchedPatient.age) > 65 : false),
    }));
  }

  function getPersistentIntakeProfileUpdates(basePatient = {}, form = intakeForm) {
    const existing = Array.isArray(basePatient.chronicConditions)
      ? basePatient.chronicConditions
      : [];
    const chronicConditions = existing.filter(
      (condition) => !["htn", "hypertension", "dm", "diabetes"].includes(String(condition).toLowerCase())
    );
    if (form.htn) chronicConditions.push("HTN");
    if (form.dm) chronicConditions.push("DM");

    return {
      spanishOnly:
        form.languagePreference || (form.spanishSpeaking ? "Spanish" : ""),
      chronicConditions,
    };
  }

  function applyMatchedPatientToIntake() {
    if (!intakeMatchPatientId) return;
    applyPatientToIntake(patients.find((p) => p.id === intakeMatchPatientId));
  }

  function isToday(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  async function loadProfiles({
    includeSignatures = true,
    showLoading = false,
    silent = false,
  } = {}) {
    try {
      if (showLoading) setLoadingProfiles(true);
      if (!silent) setProfilesMessage("");
      const data = await fetchProfiles({ includeSignatures });
      setProfiles((previousProfiles) => {
        if (includeSignatures) return data;

        const previousById = new Map(
          previousProfiles.map((profile) => [String(profile.id), profile])
        );
        return data.map((profile) => ({
          ...profile,
          signature_data_url:
            previousById.get(String(profile.id))?.signature_data_url || "",
        }));
      });
    } catch (error) {
      console.error("Failed to load profiles:", error);
      if (!silent) {
        setProfilesMessage(`Failed to load users: ${error.message}`);
      }
    } finally {
      if (showLoading) setLoadingProfiles(false);
    }

  }

  const activeTodayProfiles = useMemo(() => {
    return profiles.filter((profile) => isToday(profile.last_seen_at));
  }, [profiles]);

  const activeStudents = useMemo(() => {
    return activeTodayProfiles.filter(
      (profile) => profile.role === "student" || profile.role === "leadership"
    );
  }, [activeTodayProfiles]);

  const studentNameOptions = useMemo(() => {
    const activeNames = activeStudents
      .map((profile) => (profile.full_name || "").trim())
      .filter(Boolean);

    const inactiveNames = profiles
      .filter(
        (profile) =>
          (profile.role === "student" || profile.role === "leadership") &&
          !activeStudents.some((active) => active.id === profile.id)
      )
      .map((profile) => (profile.full_name || "").trim())
      .filter(Boolean);

    return [
      ...activeNames.sort((a, b) => a.localeCompare(b)),
      ...inactiveNames.sort((a, b) => a.localeCompare(b)),
    ];
  }, [profiles, activeStudents]);

  const assignedStudentNames = useMemo(() => {
    const names = new Set();

    allEncounterRows.forEach(({ encounter }) => {
      const name = (encounter.assignedStudent || "").trim();

      if (
        name &&
        encounter.status !== "done" &&
        encounter.soapStatus !== "signed"
      ) {
        names.add(name);
      }
    });

    return names;
  }, [allEncounterRows]);

  const activeUpperLevels = useMemo(() => {
    return activeTodayProfiles.filter((profile) => profile.role === "upper_level");
  }, [activeTodayProfiles]);

  const upperLevelNameOptions = useMemo(() => {
    const activeNames = activeUpperLevels
      .map((profile) => (profile.full_name || "").trim())
      .filter(Boolean);

    const inactiveNames = profiles
      .filter(
        (profile) =>
          profile.role === "upper_level" &&
          !activeUpperLevels.some((active) => active.id === profile.id)
      )
      .map((profile) => (profile.full_name || "").trim())
      .filter(Boolean);

    return [...activeNames.sort((a, b) => a.localeCompare(b)), ...inactiveNames.sort((a, b) => a.localeCompare(b))];
  }, [profiles, activeUpperLevels]);

  const activeAttendings = useMemo(() => {
    return activeTodayProfiles.filter((profile) => profile.role === "attending");
  }, [activeTodayProfiles]);

  const canAccessSpecialtyQueue =
    userRole === "leadership" ||
    userRole === "student" ||
    userRole === "upper_level" ||
    userRole === "attending" ||
    userRole === "physical_therapy" ||
    currentSpecialtyAccess.length > 0;

  async function handleChangeProfileRole(
    profileId,
    nextRole,
    nextClassification = null,
    extraUpdates = {}
  ) {
    if (!isLeadershipView) return;

    const currentUserId = session?.user?.id;

    const currentProfile = profiles.find((profile) => profile.id === profileId);
    const effectiveRole = nextRole ?? currentProfile?.role ?? "student";
    const effectiveClassification =
      nextClassification !== null
        ? nextClassification
        : currentProfile?.classification ?? null;
    const effectiveExtraUpdates = effectiveRole === "physical_therapy"
      ? {
          ...extraUpdates,
          specialty_access: Array.from(new Set([
            ...(Array.isArray(currentProfile?.specialty_access)
              ? currentProfile.specialty_access
              : []),
            "Physical Therapy",
          ])),
        }
      : extraUpdates;

    if (profileId === currentUserId && effectiveRole !== "leadership") {
      setProfilesMessage("You cannot remove your own leadership role.");
      return;
    }

    const previousProfiles = profiles;

    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId
          ? {
            ...profile,
            role: effectiveRole,
            classification: effectiveClassification,
            ...effectiveExtraUpdates,
          }
          : profile
      )
    );

    try {
      setSavingProfileId(profileId);
      setProfilesMessage("");

      if (Object.keys(effectiveExtraUpdates).length > 0) {
        await updateProfileDetails(profileId, {
          role: effectiveRole,
          classification: effectiveClassification,
          ...effectiveExtraUpdates,
        });
      } else {
        await updateProfileRole(profileId, effectiveRole, effectiveClassification);
      }

      setProfilesMessage("User updated successfully.");
    } catch (error) {
      console.error("Failed to update profile role:", error);
      setProfiles(previousProfiles);
      setProfilesMessage(`Failed to update user: ${error.message}`);
    } finally {
      setSavingProfileId(null);
    }
  }

  async function handleSaveProfileName(profileId) {
    const trimmedName = editingProfileNameValue.trim();

    if (!trimmedName) {
      setProfilesMessage("Full name cannot be blank.");
      return;
    }

    const previousProfiles = profiles;

    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId
          ? { ...profile, full_name: trimmedName }
          : profile
      )
    );

    try {
      setSavingProfileId(profileId);
      setProfilesMessage("");
      await updateProfileDetails(profileId, { full_name: trimmedName });
      setEditingProfileNameId(null);
      setEditingProfileNameValue("");
      setProfilesMessage("User updated successfully.");
    } catch (error) {
      console.error("Failed to update profile name:", error);
      setProfiles(previousProfiles);
      setProfilesMessage(`Failed to update user: ${error.message}`);
    } finally {
      setSavingProfileId(null);
    }
  }

  async function handleApproveUser(profileId) {
    if (!isLeadershipView) return;

    const previousProfiles = profiles;

    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId
          ? {
            ...profile,
            approval_status: "approved",
            approved_by: session?.user?.id || null,
            approved_at: new Date().toISOString(),
          }
          : profile
      )
    );

    try {
      setSavingProfileId(profileId);
      setProfilesMessage("");
      await updateProfileDetails(profileId, {
        approval_status: "approved",
        approved_by: session?.user?.id || null,
        approved_at: new Date().toISOString(),
      });
      setProfilesMessage("User approved successfully.");
    } catch (error) {
      console.error("Failed to approve user:", error);
      setProfiles(previousProfiles);
      setProfilesMessage(`Failed to approve user: ${error.message}`);
    } finally {
      setSavingProfileId(null);
    }
  }

  function openEditIntake() {
    if (!selectedPatient || !selectedEncounter) return;

    setIntakeForm({
      patientId: selectedPatient.id,
      firstName: selectedPatient.firstName || "",
      lastName: selectedPatient.lastName || "",
      preferredName: selectedPatient.preferredName || "",
      mrn: selectedPatient.mrn || "",
      last4ssn: selectedPatient.last4ssn || "",
      dob: selectedPatient.dob || "",
      age: selectedPatient.age || "",
      phone: selectedPatient.phone || "",
      sex: selectedPatient.sex || "",
      ethnicity: selectedPatient.ethnicity || "",
      pronouns: selectedPatient.pronouns || "",
      dailyNumber: selectedEncounter.dailyNumber || "",
      newReturning: selectedEncounter.newReturning || "",
      ttuStudent: selectedPatient.ttuStudent || false,
      visitLocation: selectedEncounter.visitLocation || "",
      chiefComplaint: selectedEncounter.chiefComplaint || "",
      notes: selectedEncounter.notes || "",
      transportation: selectedEncounter.transportation || "",
      needsElevator: selectedEncounter.needsElevator || false,
      spanishSpeaking:
        selectedEncounter.spanishSpeaking ||
        String(selectedPatient.spanishOnly || "").toLowerCase().includes("spanish") ||
        (selectedPatient.encounters || []).some((item) => item.spanishSpeaking === true),
      languagePreference:
        selectedPatient.spanishOnly ||
        ((selectedPatient.encounters || []).some((item) => item.spanishSpeaking === true)
          ? "Spanish"
          : ""),
      over65: selectedPatient.age ? Number(selectedPatient.age) > 65 : false,
      mammogramStatus:
        selectedEncounter.mammogramStatus || selectedEncounter.mammogramPapSmear || "",
      papStatus: selectedEncounter.papStatus || "",
      fluShot: selectedEncounter.fluShot || "",
      htn:
        selectedEncounter.htn ||
        (selectedPatient.chronicConditions || []).some((condition) =>
          ["htn", "hypertension"].includes(String(condition).toLowerCase())
        ) ||
        (selectedPatient.encounters || []).some((item) => item.htn === true),
      dm:
        selectedEncounter.dm ||
        (selectedPatient.chronicConditions || []).some((condition) =>
          ["dm", "diabetes"].includes(String(condition).toLowerCase())
        ) ||
        (selectedPatient.encounters || []).some((item) => item.dm === true),
      labsLast6Months: selectedEncounter.labsLast6Months || "",
      nicotineUse: selectedEncounter.nicotineUse || "",
      nicotineDetails: selectedEncounter.nicotineDetails || "",
      substanceUseConcern: selectedEncounter.substanceUseConcern || "",
      substanceUseTreatment: selectedEncounter.substanceUseTreatment || "",
      substanceUseNotes: selectedEncounter.substanceUseNotes || "",
      dermatology: selectedEncounter.dermatology || "N/A",
      ophthalmology: selectedEncounter.ophthalmology || "N/A",
      optometry: selectedEncounter.optometry || "N/A",
      diabeticEyeExamPastYear: selectedEncounter.diabeticEyeExamPastYear || "N/A",
      physicalTherapy: selectedEncounter.physicalTherapy || "N/A",
      mentalHealthCombined: selectedEncounter.mentalHealthCombined || "N/A",
      counseling: selectedEncounter.counseling || "N/A",
      anyMentalHealthPositive: selectedEncounter.anyMentalHealthPositive || false,
      visitType: selectedEncounter.visitType || "general",
      specialtyType: selectedEncounter.specialtyType || "",
    });

    setEditingPatientId(selectedPatient.id);
    setIsEditingIntake(true);
    setIntakeTab(0);
    setShowIntakeModal(true);
  }

  function buildProgramEntriesFromIntake(
    patient,
    intakeForm,
    coordinatorName = "",
    sourceEncounter = null
  ) {
    const entries = [];
    const requestedAt =
      sourceEncounter?.createdAt ||
      sourceEncounter?.created_at ||
      (sourceEncounter?.clinicDate || sourceEncounter?.clinic_date
        ? `${sourceEncounter.clinicDate || sourceEncounter.clinic_date}T00:00:00.000Z`
        : "");
    const createdAt = requestedAt || new Date().toISOString();

    function hasText(value) {
      return typeof value === "string" && value.trim() !== "" && value.trim() !== "N/A";
    }

    function buildReason(serviceValue, fallbackChiefComplaint, finalFallback = "") {
      if (hasText(serviceValue)) return serviceValue.trim();
      if (hasText(fallbackChiefComplaint)) return fallbackChiefComplaint.trim();
      if (hasText(finalFallback)) return finalFallback.trim();
      return "";
    }

    function pushEntry(programType, serviceValue, fallbackChiefComplaint, finalFallback = "") {
      const reason = buildReason(serviceValue, fallbackChiefComplaint, finalFallback);
      if (!reason) return;

      entries.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        patientId: patient.id,
        patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
        mrn: patient.mrn || "",
        dob: patient.dob || "",
        phone: patient.phone || "",
        programType,
        reason,
        assignedCoordinator: coordinatorName || "",
        status: "New Referral",
        specialtyDate: "",
        scheduleType: "",
        schedulePosition: null,
        appointmentSlot: "",
        notes: "",
        createdAt,
      });
    }

    const chiefComplaint = intakeForm.chiefComplaint || "";

    if (hasText(intakeForm.physicalTherapy)) {
      pushEntry("Physical Therapy", intakeForm.physicalTherapy, chiefComplaint);
    }

    if (hasText(intakeForm.dermatology)) {
      pushEntry("Dermatology", intakeForm.dermatology, chiefComplaint);
    }

    if (hasText(intakeForm.ophthalmology)) {
      pushEntry("Ophthalmology", intakeForm.ophthalmology, chiefComplaint);
    }

    if (hasText(intakeForm.mentalHealthCombined)) {
      pushEntry("Mental Health", intakeForm.mentalHealthCombined, chiefComplaint);
    }

    if (hasText(intakeForm.counseling)) {
      pushEntry("Counseling", intakeForm.counseling, chiefComplaint);
    }

    if (
      intakeForm.substanceUseTreatment === "Yes" ||
      intakeForm.substanceUseTreatment === "Maybe"
    ) {
      pushEntry(
        "Addiction Medicine",
        intakeForm.substanceUseNotes,
        chiefComplaint,
        "Substance use treatment requested"
      );

    }
    if (intakeForm.mammogramStatus === "Interested") {
      pushEntry(
        "Mammogram",
        "Mammogram screening requested",
        chiefComplaint,
        "Mammogram screening requested"
      );
    }

    if (intakeForm.colonoscopyStatus === "Interested") {
      pushEntry(
        "Colonoscopy",
        "Colonoscopy screening requested",
        chiefComplaint,
        "Colonoscopy screening requested"
      );
    }

    return entries;
  }

  async function createProgramEntriesFromIntake(patient, intakeForm, sourceEncounter = null) {
    const coordinatorName =
      profiles.find((profile) => profile.id === session?.user?.id)?.full_name || "";

    const entries = buildProgramEntriesFromIntake(
      patient,
      intakeForm,
      coordinatorName,
      sourceEncounter
    );

    if (entries.length === 0) return;

    const isCompletedProgramEntry = (entry) =>
      String(entry?.status || "").trim().toLowerCase() === "completed";

    for (const entry of entries) {
      const existingEntry = programEntries.find(
        (existing) =>
          String(existing.patientId) === String(entry.patientId) &&
          existing.programType === entry.programType &&
          !isCompletedProgramEntry(existing)
      );

      if (existingEntry) {
        const nextReason = existingEntry.reason?.includes(entry.reason)
          ? existingEntry.reason
          : `${existingEntry.reason || ""}${existingEntry.reason ? " | " : ""}${entry.reason}`;

        const nextNotes = [
          existingEntry.notes || "",
          entry.notes || entry.reason
            ? `Added from intake ${new Date().toLocaleDateString()}: ${entry.notes || entry.reason}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        await updateProgramEntry(existingEntry.id, "reason", nextReason);
        await updateProgramEntry(existingEntry.id, "notes", nextNotes);
        continue;
      }

      await addProgramEntry(entry);
    }
  }

  async function submitPatient() {
    if (!intakeForm.firstName || !intakeForm.lastName || !intakeForm.dob || !intakeForm.chiefComplaint) {
      return;
    }
    const mrnConflictPatient = intakeForm.mrn.trim()
      ? findPatientByMrn(intakeForm.mrn, editingPatientId)
      : null;

    if (mrnConflictPatient) {
      if (!isEditingIntake || !selectedPatient || !selectedEncounter) {
        window.alert("That MRN is already being used by another patient. Please use the existing chart for this MRN.");
        return;
      }

      const confirmed = window.confirm(
        `MRN ${intakeForm.mrn.trim()} already belongs to:\n\n${getFullPatientName(mrnConflictPatient)}\nDOB: ${mrnConflictPatient.dob || "DOB unknown"}\n\nMove this intake visit to that existing chart and keep the entered intake details? The existing chart name, DOB, and MRN will be kept.`
      );

      if (!confirmed) return;

      if (isSubmittingIntakeRef.current) return;
      isSubmittingIntakeRef.current = true;
      setIsSubmittingIntake(true);

      try {
        await updatePatientInSupabase(mrnConflictPatient.id, {
          preferredName: mrnConflictPatient.preferredName || intakeForm.preferredName,
          last4ssn: mrnConflictPatient.last4ssn || intakeForm.last4ssn,
          phone: intakeForm.phone || mrnConflictPatient.phone,
          pronouns: intakeForm.pronouns || mrnConflictPatient.pronouns,
          ethnicity: intakeForm.ethnicity || mrnConflictPatient.ethnicity,
          sex: intakeForm.sex || mrnConflictPatient.sex,
          ttuStudent: intakeForm.ttuStudent || mrnConflictPatient.ttuStudent,
          ...getPersistentIntakeProfileUpdates(mrnConflictPatient),
        });

        const nextStatus = "ready";

        const { selectedEncounterId: nextSelectedEncounterId } =
          await applyVisitTypeConversion(mrnConflictPatient.id, selectedEncounter.id, {
          patientId: mrnConflictPatient.id,
          chiefComplaint: intakeForm.chiefComplaint,
          notes: intakeForm.notes,
          dailyNumber: intakeForm.dailyNumber,
          newReturning: intakeForm.newReturning,
          visitLocation: intakeForm.visitLocation,
          transportation: intakeForm.transportation,
          needsElevator: intakeForm.needsElevator,
          spanishSpeaking: intakeForm.spanishSpeaking,
          mammogramStatus: intakeForm.mammogramStatus,
          colonoscopyStatus: intakeForm.colonoscopyStatus,
          papStatus: intakeForm.papStatus,
          fluShot: intakeForm.fluShot,
          htn: intakeForm.htn,
          dm: intakeForm.dm,
          labsLast6Months: intakeForm.labsLast6Months,
          nicotineUse: intakeForm.nicotineUse,
          nicotineDetails: intakeForm.nicotineDetails,
          substanceUseConcern: intakeForm.substanceUseConcern,
          substanceUseTreatment: intakeForm.substanceUseTreatment,
          substanceUseNotes: intakeForm.substanceUseNotes,
          dermatology: intakeForm.dermatology,
          ophthalmology: intakeForm.ophthalmology,
          optometry: intakeForm.optometry,
          diabeticEyeExamPastYear: intakeForm.diabeticEyeExamPastYear,
          physicalTherapy: intakeForm.physicalTherapy,
          mentalHealthCombined: intakeForm.mentalHealthCombined,
          counseling: intakeForm.counseling,
          anyMentalHealthPositive: intakeForm.anyMentalHealthPositive,
          visitType: intakeForm.visitType,
          specialtyType: intakeForm.specialtyType,
          leadershipIntakeComplete: true,
          status: nextStatus,
        });

        await createProgramEntriesFromIntake(mrnConflictPatient, {
          ...intakeForm,
          mrn: mrnConflictPatient.mrn,
          firstName: mrnConflictPatient.firstName,
          lastName: mrnConflictPatient.lastName,
          dob: mrnConflictPatient.dob,
          phone: intakeForm.phone || mrnConflictPatient.phone,
        }, selectedEncounter);

        const sourceEncounterCount = selectedPatient.encounters?.length || 0;

        if (sourceEncounterCount <= 1) {
          try {
            await deletePatientInSupabase(selectedPatient.id);
          } catch (deleteError) {
            console.warn("Temporary duplicate patient could not be deleted:", deleteError);
            showToast({
              title: "Visit moved, cleanup needed",
              message: "The intake was saved to the existing MRN chart, but the temporary duplicate patient could not be deleted automatically.",
              type: "warning",
              duration: 7000,
            });
          }
        }

        await refreshClinicData();

        setSelectedPatientId(mrnConflictPatient.id);
        setDashboardSelectedPatientId(mrnConflictPatient.id);
        setSelectedEncounterId(nextSelectedEncounterId);
        setShowIntakeModal(false);
        setIntakeTab(0);
        setIntakeMatchPatientId(null);
        setAutoFilledMatchPatientId(null);
        setIsEditingIntake(false);
        setEditingPatientId(null);
        setActiveView("chart");

        showToast({
          title: "Intake moved to existing chart",
          message: `MRN ${mrnConflictPatient.mrn} is now using ${getFullPatientName(mrnConflictPatient)}'s chart.`,
          type: "success",
          duration: 5000,
        });
      } catch (error) {
        console.error("Failed to move intake to existing MRN chart:", error);
        window.alert(`Supabase save error: ${error.message}`);
      } finally {
        isSubmittingIntakeRef.current = false;
        setIsSubmittingIntake(false);
      }

      return;
    }
    const potentialDuplicate = findPotentialDuplicatePatient(
      patients,
      intakeForm.firstName,
      intakeForm.lastName,
      intakeForm.dob,
      intakeForm.last4ssn,
      editingPatientId
    );

    if (potentialDuplicate) {
      const shouldContinue = window.confirm(
        `Possible duplicate found:\n\n${getFullPatientName(potentialDuplicate)}\nDOB: ${potentialDuplicate.dob || "—"}\nLast 4 SSN: ${potentialDuplicate.last4ssn || "—"}\nMRN: ${potentialDuplicate.mrn || "—"}\n\nPress OK to continue anyway, or Cancel to review.`
      );

      if (!shouldContinue) return;
    }

    if (isSubmittingIntakeRef.current) return;
    isSubmittingIntakeRef.current = true;
    setIsSubmittingIntake(true);

    if (isEditingIntake && selectedPatient && selectedEncounter) {
      try {
        console.log("editingPatientId:", editingPatientId);
        console.log("selectedEncounterId:", selectedEncounter.id);

        await updatePatientInSupabase(editingPatientId, {
          firstName: intakeForm.firstName,
          lastName: intakeForm.lastName,
          preferredName: intakeForm.preferredName,
          dob: intakeForm.dob,
          ...(intakeForm.mrn.trim() ? { mrn: intakeForm.mrn.trim() } : {}),
          last4ssn: intakeForm.last4ssn,
          phone: intakeForm.phone,
          pronouns: intakeForm.pronouns,
          ethnicity: intakeForm.ethnicity,
          sex: intakeForm.sex,
          ttuStudent: intakeForm.ttuStudent,
          ...getPersistentIntakeProfileUpdates(selectedPatient),
        });

        const nextStatus = "ready";

        const { selectedEncounterId: nextSelectedEncounterId } =
          await applyVisitTypeConversion(editingPatientId, selectedEncounter.id, {
          chiefComplaint: intakeForm.chiefComplaint,
          notes: intakeForm.notes,
          dailyNumber: intakeForm.dailyNumber,
          newReturning: intakeForm.newReturning,
          visitLocation: intakeForm.visitLocation,
          transportation: intakeForm.transportation,
          needsElevator: intakeForm.needsElevator,
          spanishSpeaking: intakeForm.spanishSpeaking,
          mammogramStatus: intakeForm.mammogramStatus,
          colonoscopyStatus: intakeForm.colonoscopyStatus,
          papStatus: intakeForm.papStatus,
          fluShot: intakeForm.fluShot,
          htn: intakeForm.htn,
          dm: intakeForm.dm,
          labsLast6Months: intakeForm.labsLast6Months,
          nicotineUse: intakeForm.nicotineUse,
          nicotineDetails: intakeForm.nicotineDetails,
          substanceUseConcern: intakeForm.substanceUseConcern,
          substanceUseTreatment: intakeForm.substanceUseTreatment,
          substanceUseNotes: intakeForm.substanceUseNotes,
          dermatology: intakeForm.dermatology,
          ophthalmology: intakeForm.ophthalmology,
          optometry: intakeForm.optometry,
          diabeticEyeExamPastYear: intakeForm.diabeticEyeExamPastYear,
          physicalTherapy: intakeForm.physicalTherapy,
          mentalHealthCombined: intakeForm.mentalHealthCombined,
          counseling: intakeForm.counseling,
          anyMentalHealthPositive: intakeForm.anyMentalHealthPositive,
          visitType: intakeForm.visitType,
          specialtyType: intakeForm.specialtyType,
          leadershipIntakeComplete: true,
          status: nextStatus,
        });

        await refreshClinicData();
        setSelectedPatientId(editingPatientId);
        setDashboardSelectedPatientId(editingPatientId);
        setSelectedEncounterId(nextSelectedEncounterId);
        await createProgramEntriesFromIntake(
          {
            ...selectedPatient,
            firstName: intakeForm.firstName,
            lastName: intakeForm.lastName,
            mrn: intakeForm.mrn.trim() || selectedPatient.mrn || "",
            dob: intakeForm.dob,
            phone: intakeForm.phone,
          },
          intakeForm,
          selectedEncounter
        );

        setShowIntakeModal(false);
        setIntakeTab(0);
        setIntakeMatchPatientId(null);
        setAutoFilledMatchPatientId(null);
        setIsEditingIntake(false);
        setEditingPatientId(null);
        setActiveView("registration");
        isSubmittingIntakeRef.current = false;
        setIsSubmittingIntake(false);
        return;
      } catch (error) {
        console.error("Failed to update intake in Supabase:", error);
        window.alert(`Supabase save error: ${error.message}`);
        isSubmittingIntakeRef.current = false;
        setIsSubmittingIntake(false);
        return;
      }
    }

    const baseEncounter = createEncounterFromIntake(intakeForm);

    const encounter = {
      ...baseEncounter,
      status: "ready",
      clinicDate: normalizeClinicDate(baseEncounter.clinicDate) || formatClinicDate(),
      createdAt: baseEncounter.createdAt || new Date().toISOString(),
    };


    if (potentialDuplicate) {
      try {
        await updatePatientInSupabase(
          potentialDuplicate.id,
          getPersistentIntakeProfileUpdates(potentialDuplicate)
        );
        const savedEncounter = await createEncounterInSupabase(
          potentialDuplicate.id,
          encounter
        );

        const intakeData = savedEncounter.intake_data || {};

        const hydratedEncounter = {
          ...encounter,
          id: savedEncounter.id,
          clinicDate: savedEncounter.clinic_date || encounter.clinicDate,
          createdAt: savedEncounter.created_at || encounter.createdAt,
          chiefComplaint:
            savedEncounter.chief_complaint || encounter.chiefComplaint || "",
          status: mapDbStatusToUi(savedEncounter.status),
          roomNumber: savedEncounter.room || encounter.roomNumber || "",

          dailyNumber: intakeData.dailyNumber ?? encounter.dailyNumber ?? "",
          newReturning: intakeData.newReturning ?? encounter.newReturning ?? "Returning",
          visitLocation: intakeData.visitLocation ?? encounter.visitLocation ?? "In Clinic",
          transportation: intakeData.transportation ?? encounter.transportation ?? "",
          needsElevator: intakeData.needsElevator ?? encounter.needsElevator ?? false,
          spanishSpeaking: intakeData.spanishSpeaking ?? encounter.spanishSpeaking ?? false,
          mammogramStatus:
            intakeData.mammogramStatus ??
            intakeData.mammogramPapSmear ??
            encounter.mammogramStatus ??
            encounter.mammogramPapSmear ??
            "",
          papStatus:
            intakeData.papStatus ??
            encounter.papStatus ??
            "",
          fluShot: intakeData.fluShot ?? encounter.fluShot ?? "",
          htn: intakeData.htn ?? encounter.htn ?? false,
          dm: intakeData.dm ?? encounter.dm ?? false,
          labsLast6Months:
            intakeData.labsLast6Months ?? encounter.labsLast6Months ?? "",
          nicotineUse: intakeData.nicotineUse ?? encounter.nicotineUse ?? "",
          nicotineDetails: intakeData.nicotineDetails ?? encounter.nicotineDetails ?? "",
          substanceUseConcern: intakeData.substanceUseConcern ?? encounter.substanceUseConcern ?? "",
          substanceUseTreatment: intakeData.substanceUseTreatment ?? encounter.substanceUseTreatment ?? "",
          substanceUseNotes: intakeData.substanceUseNotes ?? encounter.substanceUseNotes ?? "",
          dermatology: intakeData.dermatology ?? encounter.dermatology ?? "N/A",
          ophthalmology: intakeData.ophthalmology ?? encounter.ophthalmology ?? "N/A",
          optometry: intakeData.optometry ?? encounter.optometry ?? "N/A",
          diabeticEyeExamPastYear:
            intakeData.diabeticEyeExamPastYear ??
            encounter.diabeticEyeExamPastYear ??
            "N/A",
          physicalTherapy:
            intakeData.physicalTherapy ?? encounter.physicalTherapy ?? "N/A",
          mentalHealthCombined:
            intakeData.mentalHealthCombined ??
            encounter.mentalHealthCombined ??
            "N/A",
          counseling: intakeData.counseling ?? encounter.counseling ?? "N/A",
          anyMentalHealthPositive:
            intakeData.anyMentalHealthPositive ??
            encounter.anyMentalHealthPositive ??
            false,
          visitType: intakeData.visitType ?? encounter.visitType ?? "general",
          specialtyType: intakeData.specialtyType ?? encounter.specialtyType ?? "",
          importedSendOutLabs:
            savedEncounter.imported_send_out_labs ||
            savedEncounter.importedSendOutLabs ||
            encounter.importedSendOutLabs ||
            [],
        };

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === potentialDuplicate.id
              ? {
                ...patient,
                mrn: patient.mrn || intakeForm.mrn.trim(),
                firstName: intakeForm.firstName,
                lastName: intakeForm.lastName,
                preferredName: intakeForm.preferredName,
                last4ssn: intakeForm.last4ssn,
                dob: intakeForm.dob,
                age: intakeForm.age,
                phone: intakeForm.phone,
                sex: intakeForm.sex,
                ethnicity: intakeForm.ethnicity,
                pronouns: intakeForm.pronouns,
                ttuStudent: intakeForm.ttuStudent,
                ...getPersistentIntakeProfileUpdates(patient),
                encounters: [hydratedEncounter, ...(patient.encounters || [])],
              }
              : patient
          )
        );

        setSelectedPatientId(potentialDuplicate.id);
        setSelectedEncounterId(savedEncounter.id);
        await createProgramEntriesFromIntake(
          {
            ...potentialDuplicate,
            firstName: intakeForm.firstName,
            lastName: intakeForm.lastName,
            mrn: potentialDuplicate.mrn || intakeForm.mrn.trim() || "",
            dob: intakeForm.dob,
            phone: intakeForm.phone,
          },
          intakeForm,
          hydratedEncounter
        );
      } catch (error) {
        console.error("Failed to create duplicate-patient encounter:", error);
        window.alert(`Supabase save error: ${error.message}`);
        isSubmittingIntakeRef.current = false;
        setIsSubmittingIntake(false);
        return;
      }
    } else {
      try {
        const patientToSave = {
          ...intakeForm,
          mrn: intakeForm.mrn.trim() || "",
        };

        const savedPatient = await createPatientInSupabase(patientToSave);

        const savedEncounter = await createEncounterInSupabase(savedPatient.id, encounter);

        const hydratedPatient = {
          ...savedPatient,
          preferredName: intakeForm.preferredName || savedPatient.preferredName || "",
          last4ssn: intakeForm.last4ssn || "",
          phone: intakeForm.phone || "",
          sex: intakeForm.sex || "",
          ethnicity: intakeForm.ethnicity || "",
          pronouns: intakeForm.pronouns || "",
          ttuStudent: intakeForm.ttuStudent || false,
          allergies: "",
          medications: [],
          encounters: [
            (() => {
              const intakeData = savedEncounter.intake_data || {};

              return {
                ...encounter,
                id: savedEncounter.id,
                clinicDate: savedEncounter.clinic_date || encounter.clinicDate,
                createdAt: savedEncounter.created_at || encounter.createdAt,
                chiefComplaint:
                  savedEncounter.chief_complaint || encounter.chiefComplaint || "",
                status: mapDbStatusToUi(savedEncounter.status),
                roomNumber: savedEncounter.room || encounter.roomNumber || "",

                dailyNumber:
                  intakeData.dailyNumber ?? encounter.dailyNumber ?? "",
                newReturning:
                  intakeData.newReturning ?? encounter.newReturning ?? "Returning",
                visitLocation:
                  intakeData.visitLocation ?? encounter.visitLocation ?? "In Clinic",
                transportation:
                  intakeData.transportation ?? encounter.transportation ?? "",
                needsElevator:
                  intakeData.needsElevator ?? encounter.needsElevator ?? false,
                spanishSpeaking:
                  intakeData.spanishSpeaking ?? encounter.spanishSpeaking ?? false,
                mammogramStatus:
                  intakeData.mammogramStatus ??
                  intakeData.mammogramPapSmear ??
                  encounter.mammogramStatus ??
                  encounter.mammogramPapSmear ??
                  "",
                papStatus:
                  intakeData.papStatus ??
                  encounter.papStatus ??
                  "",
                fluShot: intakeData.fluShot ?? encounter.fluShot ?? "",
                htn: intakeData.htn ?? encounter.htn ?? false,
                dm: intakeData.dm ?? encounter.dm ?? false,
                labsLast6Months:
                  intakeData.labsLast6Months ?? encounter.labsLast6Months ?? "",
                nicotineUse: intakeData.nicotineUse ?? encounter.nicotineUse ?? "",
                nicotineDetails: intakeData.nicotineDetails ?? encounter.nicotineDetails ?? "",
                substanceUseConcern: intakeData.substanceUseConcern ?? encounter.substanceUseConcern ?? "",
                substanceUseTreatment: intakeData.substanceUseTreatment ?? encounter.substanceUseTreatment ?? "",
                substanceUseNotes: intakeData.substanceUseNotes ?? encounter.substanceUseNotes ?? "",
                dermatology:
                  intakeData.dermatology ?? encounter.dermatology ?? "N/A",
                ophthalmology:
                  intakeData.ophthalmology ?? encounter.ophthalmology ?? "N/A",
                optometry:
                  intakeData.optometry ?? encounter.optometry ?? "N/A",
                diabeticEyeExamPastYear:
                  intakeData.diabeticEyeExamPastYear ??
                  encounter.diabeticEyeExamPastYear ??
                  "N/A",
                physicalTherapy:
                  intakeData.physicalTherapy ?? encounter.physicalTherapy ?? "N/A",
                mentalHealthCombined:
                  intakeData.mentalHealthCombined ??
                  encounter.mentalHealthCombined ??
                  "N/A",
                counseling:
                  intakeData.counseling ?? encounter.counseling ?? "N/A",
                anyMentalHealthPositive:
                  intakeData.anyMentalHealthPositive ??
                  encounter.anyMentalHealthPositive ??
                  false,
                visitType: intakeData.visitType ?? encounter.visitType ?? "",
                specialtyType: intakeData.specialtyType ?? encounter.specialtyType ?? "",
              };
            })(),
          ],
        };

        setPatients((prev) => [hydratedPatient, ...prev]);
        setSelectedPatientId(hydratedPatient.id);
        setSelectedEncounterId(savedEncounter.id);
        await createProgramEntriesFromIntake(
          hydratedPatient,
          intakeForm,
          hydratedPatient.encounters?.[0] || savedEncounter
        );
      } catch (error) {
        console.error("Supabase save error:", error);
        window.alert(`Supabase save error: ${error.message}`);
        isSubmittingIntakeRef.current = false;
        setIsSubmittingIntake(false);
        return;
      }
    }
    isSubmittingIntakeRef.current = false;
    setIsSubmittingIntake(false);
    setShowIntakeModal(false);
    setIntakeTab(0);
    setIntakeForm(EMPTY_FORM);
    setIntakeMatchPatientId(null);
    setIsEditingIntake(false);
    setEditingPatientId(null);
    setAutoFilledMatchPatientId(null);
    setActiveView("chart");
  }


  function openPatientFromFilteredView(patientId) {
    setDashboardSelectedPatientId(patientId);

    const matchingRows = visibleEncounterRows.filter(
      ({ patient }) => patient.id === patientId
    );

    if (matchingRows.length > 0) {
      openPatientChart(patientId, matchingRows[0].encounter.id);
      return;
    }

    openPatientChart(patientId);
  }

  function openPatientEditModal() {
    const patientForEdit = dashboardSelectedPatient || selectedPatient;

    if (!patientForEdit) {
      alert("Select a patient first.");
      return;
    }

    setDashboardSelectedPatientId(patientForEdit.id);
    setShowPatientInfoEditModal(true);
  }

  async function saveDashboardPatientEdits(patientId, updates, encounterId = null, encounterUpdates = null) {
    const trimmedMrn = (updates.mrn || "").trim();
    const mrnConflictPatient = trimmedMrn ? findPatientByMrn(trimmedMrn, patientId) : null;

    if (mrnConflictPatient) {
      setPendingPatientMerge({
        sourcePatientId: patientId,
        targetPatientId: mrnConflictPatient.id,
        intendedMrn: trimmedMrn,
      });
      return false;
    }

    try {
      await updatePatientInSupabase(patientId, {
        ...updates,
        mrn: trimmedMrn,
      });

      let nextSelectedEncounterId = encounterId;

      if (encounterId && encounterUpdates) {
        const result = await applyVisitTypeConversion(patientId, encounterId, encounterUpdates);
        nextSelectedEncounterId = result.selectedEncounterId;
      }

      await refreshClinicData();
      setSelectedPatientId(patientId);
      setDashboardSelectedPatientId(patientId);
      setSelectedEncounterId(nextSelectedEncounterId || null);
    } catch (error) {
      console.error("Failed to save patient edits:", error);
      showToast({
        title: "Failed to save patient edits",
        message: error.message,
        type: "error",
        duration: 5000,
      });
      return false;
    }

    return true;
  }

  function openPatientChart(patientId, encounterId = null) {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    rememberDashboardScrollPosition();

    let encounter = null;

    if (encounterId) {
      encounter = patient.encounters.find((e) => e.id === encounterId);
    } else if (selectedClinicDate) {
      encounter =
        patient.encounters.find(
          (e) => normalizeClinicDate(e.clinicDate) === selectedClinicDate
        ) || patient.encounters[0];
    } else {
      encounter = patient.encounters[0];
    }

    setSelectedPatientId(patientId);
    setDashboardSelectedPatientId(patientId);
    setSelectedEncounterId(encounter?.id || null);

    setAssignmentForm({
      studentName: encounter?.assignedStudent || "",
      upperLevelName: encounter?.assignedUpperLevel || "",
      roomNumber: encounter?.roomNumber || "",
    });

    setCurrentVitals(EMPTY_VITALS);
    setEditingVitalsIndex(null);
    setNewMedication(EMPTY_MEDICATION);
    setEditingMedicationId(null);
    setShowMedicationModal(false);
    setActiveView("chart");
  }

  function openStickyNotes(patientId = "") {
    setStickyNotesInitialPatientId(patientId || "");
    setShowStickyNotesModal(true);
  }

  async function startNewEncounter() {
    if (!selectedPatient) return;
    if (!(userRole === "leadership" || userRole === "undergraduate")) return;

    const newEncounter = {
      id: Date.now(),
      clinicDate: formatClinicDate(),
      createdAt: new Date().toISOString(),
      newReturning: "Returning",
      visitLocation: "In Clinic",
      chiefComplaint: "",
      notes: "",
      transportation: "",
      needsElevator: false,
      spanishSpeaking: false,
      mammogramStatus: "",
      papStatus: "",
      fluShot: "",
      htn: false,
      dm: false,
      labsLast6Months: "",
      nicotineUse: "",
      nicotineDetails: "",
      substanceUseConcern: "",
      substanceUseTreatment: "",
      substanceUseNotes: "",
      dermatology: "N/A",
      ophthalmology: "N/A",
      optometry: "N/A",
      diabeticEyeExamPastYear: "N/A",
      physicalTherapy: "N/A",
      mentalHealthCombined: "N/A",
      counseling: "N/A",
      anyMentalHealthPositive: false,
      status: "started",
      assignedStudent: "",
      assignedUpperLevel: "",
      roomNumber: "",
      vitalsHistory: [],
      soapSubjective: "",
      soapObjective: "",
      soapAssessment: "",
      soapPlan: "",
      soapSavedAt: "",
    };

    try {
      const savedEncounter = await createEncounterInSupabase(
        selectedPatient.id,
        newEncounter
      );

      const hydratedEncounter = {
        ...newEncounter,
        id: savedEncounter.id,
        clinicDate: savedEncounter.clinic_date || newEncounter.clinicDate,
        createdAt: savedEncounter.created_at || newEncounter.createdAt,
        chiefComplaint:
          savedEncounter.chief_complaint || newEncounter.chiefComplaint || "",
        status: mapDbStatusToUi(savedEncounter.status),
        roomNumber: savedEncounter.room || "",
      };

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: [hydratedEncounter, ...patient.encounters],
            }
            : patient
        )
      );

      setSelectedEncounterId(savedEncounter.id);
      setAssignmentForm({
        studentName: "",
        upperLevelName: "",
        roomNumber: "",
      });
      setCurrentVitals(EMPTY_VITALS);
      setEditingVitalsIndex(null);
    } catch (error) {
      console.error("Failed to start new encounter:", error);
      window.alert(`Supabase save error: ${error.message}`);
    }
  }

  async function startGroupNoteEncounter(noteType) {
    if (!selectedPatient) return;
    const allowed =
      (noteType === "physical_therapy" &&
        (userRole === "physical_therapy" ||
          currentSpecialtyAccess.includes("Physical Therapy")));
    if (!allowed) return;

    const label = "Physical Therapy";
    const newEncounter = {
      clinicDate: formatClinicDate(),
      createdAt: new Date().toISOString(),
      newReturning: "Returning",
      visitLocation: "In Clinic",
      visitType: "specialty_only",
      specialtyType: noteType,
      chiefComplaint: `${label} note`,
      notes: "",
      noteType,
      groupNote: "",
      status: "started",
      roomNumber: "",
      soapStatus: "draft",
    };

    try {
      const savedEncounter = await createEncounterInSupabase(selectedPatient.id, newEncounter);
      const hydratedEncounter = {
        ...newEncounter,
        id: savedEncounter.id,
        clinicDate: savedEncounter.clinic_date || newEncounter.clinicDate,
        createdAt: savedEncounter.created_at || newEncounter.createdAt,
        status: mapDbStatusToUi(savedEncounter.status),
      };
      setPatients((prev) => prev.map((patient) =>
        patient.id === selectedPatient.id
          ? { ...patient, encounters: [hydratedEncounter, ...patient.encounters] }
          : patient
      ));
      setSelectedEncounterId(savedEncounter.id);
      showToast({ title: `${label} note started`, message: "This is a separate discipline-specific encounter.", tone: "success" });
    } catch (error) {
      console.error(`Failed to start ${label} note:`, error);
      showToast({ title: `Could not start ${label} note`, message: error.message, tone: "error" });
    }
  }

  async function savePatientSocialWorkNote(noteText, noteId = null, showConfirmation = true) {
    if (!selectedPatient || (!noteId && !noteText.trim())) return null;

    try {
      const savedNote = await saveSocialWorkNoteInSupabase({
        id: noteId,
        patientId: selectedPatient.id,
        encounterId: selectedEncounter?.id || null,
        noteText: noteText.trim(),
        authorId: session?.user?.id || null,
        authorRole: userRole,
      });

      setPatients((prev) => prev.map((patient) => {
        if (patient.id !== selectedPatient.id) return patient;
        const existing = patient.socialWorkNotes || [];
        const nextNotes = noteId
          ? existing.map((note) => note.id === savedNote.id ? savedNote : note)
          : [savedNote, ...existing];
        return { ...patient, socialWorkNotes: nextNotes };
      }));
      if (showConfirmation) {
        showToast({ title: "Social Work note saved", message: "The draft was saved to the patient chart.", tone: "success" });
      }
      return savedNote;
    } catch (error) {
      console.error("Failed to save Social Work note:", error);
      showToast({ title: "Note not saved", message: error.message, tone: "error" });
      return null;
    }
  }

  async function completePatientSocialWorkNote(
    noteId,
    patientId = selectedPatient?.id,
    encounterId = selectedEncounter?.id
  ) {
    if (!noteId || !patientId) return false;

    try {
      const completedNote = await completeSocialWorkNoteInSupabase(noteId);
      setPatients((prev) => prev.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              socialWorkNotes: (patient.socialWorkNotes || []).map((note) =>
                note.id === completedNote.id ? completedNote : note
              ),
            }
          : patient
      ));
      showToast({ title: "Social Work note completed", message: "The note is now read-only in the patient chart.", tone: "success" });
      if (encounterId) {
        await markSeenBySocialWork(encounterId);
      } else {
        await refreshClinicData?.();
      }
      return true;
    } catch (error) {
      console.error("Failed to complete Social Work note:", error);
      showToast({ title: "Could not complete note", message: error.message, tone: "error" });
      return false;
    }
  }

  async function saveGroupNote(noteText, showConfirmation = true) {
    if (!selectedPatient || !selectedEncounter?.id) return false;
    const isPhysicalTherapyEncounter = ["pt", "physical_therapy", "physical therapy"].includes(
      String(selectedEncounter.specialtyType || "").toLowerCase()
    );
    const noteType = isPhysicalTherapyEncounter
      ? "physical_therapy"
      : selectedEncounter.noteType;
    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        groupNote: noteText,
        noteType,
        soapAuthorId: selectedEncounter.soapAuthorId || session?.user?.id || null,
        soapAuthorRole: selectedEncounter.soapAuthorRole || userRole || "",
      });
      setPatients((prev) => prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                      ...encounter,
                      groupNote: noteText,
                      noteType,
                      soapAuthorId: encounter.soapAuthorId || session?.user?.id || null,
                      soapAuthorRole: encounter.soapAuthorRole || userRole || "",
                      soapSavedAt: new Date().toLocaleString(),
                    }
                  : encounter
              ),
            }
          : patient
      ));
      await logAuditEvent("group_note_saved", { noteType });
      if (showConfirmation) {
        showToast({ title: "Note saved", message: "The discipline-specific encounter has been updated.", tone: "success" });
      }
      return true;
    } catch (error) {
      console.error("Failed to save group note:", error);
      showToast({ title: "Note not saved", message: error.message, tone: "error" });
      return false;
    }
  }

  async function completePhysicalTherapyNote(encounterId) {
    if (!selectedPatient || !encounterId) return false;

    try {
      const completedEncounter = await completePhysicalTherapyNoteInSupabase(encounterId);
      setPatients((prev) => prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === encounterId ? { ...encounter, ...completedEncounter } : encounter
              ),
            }
          : patient
      ));
      await logAuditEvent("physical_therapy_note_completed", {
        signedAt: completedEncounter.disciplineSignedAt,
      });
      showToast({
        title: "Physical Therapy note completed",
        message: "The note is locked and both signatures were attached.",
        tone: "success",
      });
      return true;
    } catch (error) {
      console.error("Failed to complete Physical Therapy note:", error);
      showToast({ title: "Could not complete PT note", message: error.message, tone: "error" });
      return false;
    }
  }

  async function deleteEncounter(encounterId) {
    if (!selectedPatient || !encounterId) return;
    if (!(userRole === "leadership" || userRole === "undergraduate")) return;

    const confirmed = window.confirm(
      "Delete this encounter? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteEncounterInSupabase(encounterId);

      const remainingEncounters = selectedPatient.encounters.filter(
        (encounter) => encounter.id !== encounterId
      );

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: remainingEncounters,
            }
            : patient
        )
      );

      if (selectedEncounterId === encounterId) {
        setSelectedEncounterId(remainingEncounters[0]?.id || null);
      }
    } catch (error) {
      console.error("Failed to delete encounter:", error);
      alert(`Failed to delete encounter: ${error.message}`);
    }
  }

  function lockLeadershipActions() {
    setLeadershipActionLocked(true);
    window.setTimeout(() => {
      setLeadershipActionLocked(false);
    }, 800);
  }
  function updateEncounterField(field, value) {
    if (!selectedPatient || !selectedEncounter) return;

    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? { ...encounter, [field]: value }
                : encounter
            ),
          }
          : patient
      )
    );
  }

  async function saveEncounterField(field, value) {
    if (!selectedEncounter) return;

    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        [field]: value,
      });
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      alert(`Failed to save ${field}: ${error.message}`);
    }
  }

  function updateSoapDraftField(field, value) {
    setSoapDraft((prev) => {
      if (field === "ophthalmologyNote") {
        return {
          ...prev,
          ophthalmologyNote: {
            ...EMPTY_OPHTHO_NOTE,
            ...(value || {}),
          },
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  }

  async function saveInHouseLabs(nextLabs) {
    if (!selectedPatient || !selectedEncounter) return;

    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        inHouseLabs: nextLabs,
      });

      updateEncounterField("inHouseLabs", nextLabs);
    } catch (error) {
      console.error("Failed to save in-house labs:", error);
      alert(`Failed to save in-house labs: ${error.message}`);
    }
  }

  async function saveSendOutLabs(nextLabs) {
    if (!selectedPatient || !selectedEncounter) return;

    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        sendOutLabs: nextLabs,
      });

      updateEncounterField("sendOutLabs", nextLabs);
    } catch (error) {
      console.error("Failed to save send-out labs:", error);
      alert(`Failed to save send-out labs: ${error.message}`);
    }
  }

  async function applyEncounterTransition(encounterId, updates) {
    await updateEncounterInSupabase(encounterId, updates);

    setPatients((prev) =>
      prev.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) =>
          encounter.id === encounterId
            ? { ...encounter, ...updates }
            : encounter
        ),
      }))
    );

    // Wake an already-open board display in this browser immediately. The
    // Supabase encounter subscription handles displays on other devices.
    try {
      window.localStorage.setItem("clinic-room-board-refresh", String(Date.now()));
    } catch (error) {
      console.error("Failed to notify room board display:", error);
    }
  }

  async function markMedicationsReady(encounterId) {
    if (!session?.user?.id) return;

    await updateEncounterInSupabase(encounterId, {
      pharmacyStatus: "meds_ready",
      pharmacyReadyAt: new Date().toISOString(),
      pharmacyReadyBy: session.user.id,
      pharmacyNotifiedAt: null,
      pharmacyNotifiedBy: null,
    });

    refreshClinicData?.();
  }

  async function markPatientSentToPharmacy(encounterId) {
    if (!session?.user?.id) return;

    await updateEncounterInSupabase(encounterId, {
      pharmacyStatus: "patient_sent",
      pharmacyNotifiedAt: new Date().toISOString(),
      pharmacyNotifiedBy: session.user.id,
    });

    refreshClinicData?.();
  }

  async function markMedicationsPickedUp(encounterId) {
    if (!session?.user?.id) return;

    const targetEncounter = allEncounterRows
      .map(({ encounter }) => encounter)
      .find((encounter) => encounter?.id === encounterId);

    const pickedUpAt = new Date().toISOString();
    const updates = {
      pharmacyStatus: "picked_up",
      pharmacyPickedUpAt: pickedUpAt,
      pharmacyNotifiedAt: pickedUpAt,
      pharmacyNotifiedBy: session.user.id,
    };

    if (targetEncounter?.visitType === "refill_only") {
      updates.status = "done";
      updates.doneAt = targetEncounter.doneAt || pickedUpAt;
      updates.visitCompletedAt = targetEncounter.visitCompletedAt || pickedUpAt;
    }

    await updateEncounterInSupabase(encounterId, updates);

    refreshClinicData?.();
  }

  async function markNoMedicationsPrescribed(encounterId) {
    if (!["leadership", "undergraduate"].includes(userRole) || !session?.user?.id) return;

    await applyEncounterTransition(encounterId, {
      pharmacyStatus: "no_meds_needed",
      pharmacyNotifiedAt: new Date().toISOString(),
      pharmacyNotifiedBy: session.user.id,
    });

    refreshClinicData?.();
  }

async function markSeenBySocialWork(encounterId) {
  if (!session?.user?.id) {
    alert("Unable to mark seen: no signed-in user found.");
    return;
  }

  const targetRow = allEncounterRows.find(
    ({ encounter }) => String(encounter?.id) === String(encounterId)
  );

  if (!targetRow?.encounter?.id) {
    alert("Unable to mark seen: encounter was not found.");
    return;
  }

  const seenAt = new Date().toISOString();
  const targetEncounter = targetRow.encounter;
  const localIntakeData =
    targetEncounter.intakeData || targetEncounter.intake_data || {};

  const nextIntakeData = {
    ...localIntakeData,
    socialWorkSeen: true,
    socialWorkSeenAt: seenAt,
    socialWorkSeenBy: session.user.id,
  };

  try {
    const data = await updateEncounterInSupabase(encounterId, {
      socialWorkSeen: true,
      socialWorkSeenAt: seenAt,
      socialWorkSeenBy: session.user.id,
    });

    setPatients((prev) =>
      prev.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) =>
          String(encounter.id) === String(encounterId)
            ? {
                ...encounter,
                socialWorkSeen: true,
                socialWorkSeenAt: seenAt,
                socialWorkSeenBy: session.user.id,
                intakeData: data?.intake_data || nextIntakeData,
                intake_data: data?.intake_data || nextIntakeData,
              }
            : encounter
        ),
      }))
    );

    await refreshClinicData?.();
  } catch (error) {
    console.error("Failed to mark seen by Social Work:", error);
    alert(`Failed to mark seen by Social Work: ${error.message}`);
  }
}

  async function finalizeClinicDay(rowsToFinalize = []) {
    if (!isLeadershipView) return;

    const rows = rowsToFinalize.filter(({ encounter }) => encounter?.id);
    if (rows.length === 0) return;

    const finalizedAt = new Date().toISOString();
    const finalizedIds = new Set(rows.map(({ encounter }) => String(encounter.id)));

    function isRefillOnly(encounter) {
      return (encounter?.visitType || encounter?.visit_type) === "refill_only";
    }

    // Push the final status into the UI immediately. The database writes below
    // then persist the same values and realtime keeps other open devices synced.
    setPatients((prev) =>
      prev.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) =>
          finalizedIds.has(String(encounter.id))
            ? {
              ...encounter,
              status: "done",
              doneAt: encounter.doneAt || finalizedAt,
              visitCompletedAt: encounter.visitCompletedAt || finalizedAt,
              ...(((encounter.visitType || encounter.visit_type) === "refill_only" &&
                (encounter.pharmacyStatus || encounter.pharmacy_status) !== "picked_up")
                ? { pharmacyStatus: "meds_not_picked_up" }
                : {}),
            }
            : encounter
        ),
      }))
    );

    try {
      await Promise.all(
        rows.map(({ encounter }) => {
          const pharmacyStatus =
            encounter.pharmacyStatus || encounter.pharmacy_status || "";

          const updates = {
            status: "done",
            doneAt: encounter.doneAt || encounter.done_at || finalizedAt,
            visitCompletedAt:
              encounter.visitCompletedAt ||
              encounter.visit_completed_at ||
              finalizedAt,
          };

          if (isRefillOnly(encounter) && pharmacyStatus !== "picked_up") {
            updates.pharmacyStatus = "meds_not_picked_up";
          }

          return updateEncounterInSupabase(encounter.id, updates);
        })
      );

      await refreshClinicData?.();
    } catch (error) {
      await refreshClinicData?.();
      throw error;
    }
  }

  async function clearPharmacyStatus(encounterId) {
    await updateEncounterInSupabase(encounterId, {
      pharmacyStatus: "",
      pharmacyReadyAt: null,
      pharmacyReadyBy: null,
      pharmacyNotifiedAt: null,
      pharmacyNotifiedBy: null,
    });

    refreshClinicData?.();
  }

  async function updateLabTracking(encounterId, updates) {
    const nextUpdates = {
      ...updates,
    };

    await updateEncounterInSupabase(encounterId, nextUpdates);

    setPatients((prev) =>
      prev.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) =>
          encounter.id === encounterId
            ? { ...encounter, ...nextUpdates }
            : encounter
        ),
      }))
    );

    refreshClinicData?.();
  }

  async function assignEncounterFromQueue(encounterId, updates) {
    if (!canManageRooms) return;

    const targetRow = allEncounterRows.find(
      ({ encounter }) => encounter.id === encounterId
    );
    if (!targetRow) return;

    const { patient, encounter } = targetRow;

    const nextStudent =
      updates.assignedStudent !== undefined
        ? updates.assignedStudent
        : encounter.assignedStudent || "";

    const nextUpperLevel =
      updates.assignedUpperLevel !== undefined
        ? updates.assignedUpperLevel
        : encounter.assignedUpperLevel || "";

    const nextRoomNumber =
      updates.roomNumber !== undefined
        ? updates.roomNumber
        : encounter.roomNumber || "";

    if (!nextRoomNumber) {
      showToast({
        title: "Room required",
        message: "Please select a room before assigning this patient.",
        type: "warning",
      });
      return;
    }

    if (!nextStudent && !nextUpperLevel) {
      showToast({
        title: "Assignee required",
        message: "Please assign a student or upper level before starting the visit.",
        type: "warning",
      });
      return;
    }

    const numericRoom = Number(nextRoomNumber);

    if (!canAssignRoom(encounter, numericRoom)) {
      showToast({
        title: "Room restriction",
        message: "Pap smear patients cannot be assigned to Room 9 or Room 10.",
        type: "warning",
      });
      return;
    }

    const conflict = getRoomConflictDetails(numericRoom, encounterId, {
      assignedStudent: nextStudent,
      assignedUpperLevel: nextUpperLevel,
      clinicDate: encounter.clinicDate,
    });

    if (conflict.hasConflict) {
      const confirmed = window.confirm(
        `This room is currently being used by a different student/provider (${conflict.occupiedByNames.join(", ")}). Assign anyway?`
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const studentChanged =
        String(nextStudent || "").trim() !== String(encounter.assignedStudent || "").trim();

      const upperLevelChanged =
        String(nextUpperLevel || "").trim() !== String(encounter.assignedUpperLevel || "").trim();

      await applyEncounterTransition(encounterId, {
        assignedStudent: nextStudent,
        assignedUpperLevel: nextUpperLevel,
        roomNumber: String(numericRoom),
        status: "in_visit",

        studentAssignedAt:
          nextStudent && (!encounter.studentAssignedAt || studentChanged)
            ? new Date().toISOString()
            : encounter.studentAssignedAt || null,

        upperLevelAssignedAt:
          nextUpperLevel && (!encounter.upperLevelAssignedAt || upperLevelChanged)
            ? new Date().toISOString()
            : encounter.upperLevelAssignedAt || null,

        skipUpperLevel: nextUpperLevel ? false : encounter.skipUpperLevel,
        skipUpperLevelBy: nextUpperLevel ? null : encounter.skipUpperLevelBy,
        skipUpperLevelAt: nextUpperLevel ? null : encounter.skipUpperLevelAt,
      });

    } catch (error) {
      console.error("Failed to assign encounter from queue:", error);
      showToast({
        title: "Failed to save assignment",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function assignEncounter() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedPatient || !selectedEncounter) return;

    if (!assignmentForm.roomNumber) {
      showToast({
        title: "Room required",
        message: "Please select a room before assigning this patient.",
        type: "warning",
      });
      return;
    }

    if (!assignmentForm.studentName && !assignmentForm.upperLevelName) {
      showToast({
        title: "Assignee required",
        message: "Please assign a student or upper level before starting the visit.",
        type: "warning",
      });
      return;
    }

    const roomNumber = Number(assignmentForm.roomNumber);

    if (!canAssignRoom(selectedEncounter, roomNumber)) {
      showToast({
        title: "Room restriction",
        message: "Pap smear patients cannot be assigned to Room 9 or Room 10.",
        type: "warning",
      });
      return;
    }

    const nextAssignedStudent =
      assignmentForm.studentName || selectedEncounter.assignedStudent || "";

    const nextAssignedUpperLevel =
      assignmentForm.upperLevelName || selectedEncounter.assignedUpperLevel || "";

    const conflict = getRoomConflictDetails(roomNumber, selectedEncounter.id, {
      assignedStudent: nextAssignedStudent,
      assignedUpperLevel: nextAssignedUpperLevel,
      clinicDate: selectedEncounter.clinicDate,
    });

    if (conflict.hasConflict) {
      const confirmed = window.confirm(
        `This room is currently being used by a different student/provider (${conflict.occupiedByNames.join(", ")}). Assign anyway?`
      );

      if (!confirmed) {
        return;
      }
    }
    lockLeadershipActions();

    try {
      const studentChanged =
        String(nextAssignedStudent || "").trim() !== String(selectedEncounter.assignedStudent || "").trim();

      const upperLevelChanged =
        String(nextAssignedUpperLevel || "").trim() !== String(selectedEncounter.assignedUpperLevel || "").trim();

      await applyEncounterTransition(selectedEncounter.id, {
        roomNumber: String(roomNumber),
        status: "in_visit",
        assignedStudent: nextAssignedStudent,
        assignedUpperLevel: nextAssignedUpperLevel,

        studentAssignedAt:
          nextAssignedStudent && (!selectedEncounter.studentAssignedAt || studentChanged)
            ? new Date().toISOString()
            : selectedEncounter.studentAssignedAt || null,

        upperLevelAssignedAt:
          nextAssignedUpperLevel && (!selectedEncounter.upperLevelAssignedAt || upperLevelChanged)
            ? new Date().toISOString()
            : selectedEncounter.upperLevelAssignedAt || null,

        skipUpperLevel: nextAssignedUpperLevel ? false : selectedEncounter.skipUpperLevel,
        skipUpperLevelBy: nextAssignedUpperLevel ? null : selectedEncounter.skipUpperLevelBy,
        skipUpperLevelAt: nextAssignedUpperLevel ? null : selectedEncounter.skipUpperLevelAt,
      });

    } catch (error) {
      console.error("Failed to assign encounter:", error);
      showToast({
        title: "Failed to assign room",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }
  async function assignEncounterToRoom(roomNumber) {
    if (!canManageRooms) return;
    if (!selectedPatient || !selectedEncounter) {
      showToast({
        title: "No chart open",
        message: "Open a patient chart first before assigning a room.",
        type: "warning",
      });
      return;
    }

    const numericRoom = Number(roomNumber);

    if (!canAssignRoom(selectedEncounter, numericRoom)) {
      showToast({
        title: "Room restriction",
        message: "Pap smear patients cannot be assigned to Room 9 or Room 10.",
        type: "warning",
      });
      return;
    }

    const conflict = getRoomConflictDetails(numericRoom, selectedEncounter.id, {
      assignedStudent: assignmentForm.studentName || selectedEncounter.assignedStudent,
      assignedUpperLevel: assignmentForm.upperLevelName || selectedEncounter.assignedUpperLevel,
    });

    if (conflict.hasConflict) {
      const confirmed = window.confirm(
        `This room is currently being used by a different student/provider (${conflict.occupiedByNames.join(", ")}). Select it anyway?`
      );

      if (!confirmed) {
        return;
      }
    }

    setAssignmentForm((prev) => ({
      ...prev,
      roomNumber: String(numericRoom),
    }));
  }
  async function mergePatientRecordsByMrn(sourcePatientId, targetPatientId, options = {}) {
    const sourcePatient = patients.find(
      (patient) => String(patient.id) === String(sourcePatientId)
    );
    const targetPatient = patients.find(
      (patient) => String(patient.id) === String(targetPatientId)
    );

    if (!sourcePatient || !targetPatient) {
      alert("Could not find both patient records to merge.");
      return;
    }

    const sourceMrn = String(sourcePatient.mrn || "").trim().toLowerCase();
    const targetMrn = String(targetPatient.mrn || "").trim().toLowerCase();
    const expectedMrn = String(options.expectedMrn || "").trim().toLowerCase();
    const sourceMatchesTargetMrn = !!sourceMrn && sourceMrn === targetMrn;
    const targetMatchesExpectedMrn = !!expectedMrn && expectedMrn === targetMrn;

    if (!targetMrn || (!sourceMatchesTargetMrn && !targetMatchesExpectedMrn)) {
      alert("Merge is only allowed when the duplicate record matches the MRN on the chart being kept.");
      return;
    }

    const confirmed = options.skipConfirm
      ? true
      : window.confirm(
          `Merge duplicate MRN records?\n\nKeep: ${getFullPatientName(targetPatient)} (${targetPatient.dob || "DOB unknown"})\nMerge/delete: ${getFullPatientName(sourcePatient)} (${sourcePatient.dob || "DOB unknown"})\nMRN: ${targetPatient.mrn}\n\nThis moves encounters, meds, allergies, refills, PAP, and specialty tracker entries to the kept patient, then deletes the duplicate patient record.`
        );

    if (!confirmed) return;

    try {
      if (!sourceMatchesTargetMrn && targetMatchesExpectedMrn) {
        await updatePatientInSupabase(sourcePatientId, {
          mrn: targetPatient.mrn,
        });
      }

      await mergePatientsByMrnInSupabase({
        sourcePatientId,
        targetPatientId,
      });

      await refreshClinicData();

      setDashboardSelectedPatientId(targetPatientId);
      setSelectedPatientId(targetPatientId);

      if (String(selectedPatientId) === String(sourcePatientId)) {
        setSelectedEncounterId(null);
      }

      setShowPatientInfoEditModal(false);
      setPendingPatientMerge(null);

      showToast({
        title: "Patient records merged",
        message: `Duplicate MRN ${targetPatient.mrn} was merged into ${getFullPatientName(targetPatient)}.`,
        type: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("Patient merge failed:", error);
      alert(error.message || "Failed to merge patient records.");
    }
  }

  async function mergeReviewedPatientRecords({ sourcePatientId, targetPatientId, updates }) {
    const sourcePatient = patients.find(
      (patient) => String(patient.id) === String(sourcePatientId)
    );
    const targetPatient = patients.find(
      (patient) => String(patient.id) === String(targetPatientId)
    );

    if (!sourcePatient || !targetPatient) {
      alert("Could not find both patient records to merge.");
      return;
    }

    const confirmed = window.confirm(
      `Merge reviewed duplicate records?\n\nKeep: ${getFullPatientName(targetPatient)} (${targetPatient.dob || "DOB unknown"})\nMerge/remove: ${getFullPatientName(sourcePatient)} (${sourcePatient.dob || "DOB unknown"})\n\nThis cannot be undone from the app.`
    );

    if (!confirmed) return;

    try {
      await mergePatientsInSupabase({
        sourcePatientId,
        targetPatientId,
        targetPatientUpdates: updates,
      });

      await refreshClinicData();

      setDashboardSelectedPatientId(targetPatientId);
      setSelectedPatientId(targetPatientId);

      if (String(selectedPatientId) === String(sourcePatientId)) {
        setSelectedEncounterId(null);
      }

      setShowWideMergeReview(false);

      showToast({
        title: "Patient records merged",
        message: `${getFullPatientName(sourcePatient)} was merged into ${getFullPatientName(targetPatient)}.`,
        type: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("Reviewed patient merge failed:", error);
      alert(error.message || "Failed to merge patient records.");
    }
  }

  async function deletePatientCompletely(patientId) {
    const patientToDelete = patients.find(
      (patient) => String(patient.id) === String(patientId)
    );

    const confirmed = window.confirm(
      "Delete this patient completely? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deletePapEntriesForPatient(patientId);
      await deleteProgramEntriesForPatient(
        patientId,
        patientToDelete ? getFullPatientName(patientToDelete) : "",
        patientToDelete?.dob || ""
      );
      await deleteRefillRequestsForPatient(patientId);
      await deletePatientInSupabase(patientId);

      setPapEntries((prev) =>
        prev.filter((entry) => String(entry.patientId) !== String(patientId))
      );

      setProgramEntries((prev) =>
        prev.filter((entry) => String(entry.patientId) !== String(patientId))
      );

      setRefillRequests((prev) =>
        prev.filter((req) => String(req.patient_id) !== String(patientId))
      );

      setPatients((prev) => prev.filter((p) => p.id !== patientId));

      if (String(selectedPatientId) === String(patientId)) {
        setSelectedPatientId(null);
        setSelectedEncounterId(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error.message);
    }
  }

  async function updateEncounterStatus(status) {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedEncounter) return;

    lockLeadershipActions();

    const updates =
      status === "ready"
        ? {
          status: "ready",
          roomNumber: "",
          assignedStudent: "",
          assignedUpperLevel: "",
          studentAssignedAt: null,
          upperLevelAssignedAt: null,
          skipUpperLevel: false,
          skipUpperLevelBy: null,
          skipUpperLevelAt: null,
        }
        : { status };

    try {
      await applyEncounterTransition(selectedEncounter.id, updates);
    } catch (error) {
      console.error("Failed to update encounter status:", error);
      showToast({
        title: "Failed to update status",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }
  async function clearEncounterRoom() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedPatient || !selectedEncounter) return;

    lockLeadershipActions();

    try {
      await applyEncounterTransition(selectedEncounter.id, {
        status: "done",
        visitCompletedAt:
          selectedEncounter.visitCompletedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to complete visit / free room:", error);
      showToast({
        title: "Failed to complete visit",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  function updatePatientField(field, value) {
    if (!selectedPatient) return;

    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? { ...patient, [field]: value }
          : patient
      )
    );
  }

  function updateVitalsField(field, value) {
    setCurrentVitals((prev) => {
      const next = { ...prev };

      if (field === "bp") next.bp = normalizeBp(value);
      else if (field === "temp") next.temp = value.replace(/[^\d.]/g, "").slice(0, 5);
      else if (field === "spo2") {
        const digits = value.replace(/[^\d]/g, "").slice(0, 3);
        let num = digits ? Number(digits) : "";
        if (num !== "" && num > 100) num = 100;
        next.spo2 = num === "" ? "" : String(num);
      } else if (field === "weight") next.weight = value.replace(/[^\d.]/g, "").slice(0, 6);
      else if (field === "height") next.height = normalizeHeight(value);
      else if (field === "pain") next.pain = normalizePain(value);
      else if (field === "hr" || field === "rr") next[field] = value.replace(/[^\d]/g, "").slice(0, 3);
      else next[field] = value;

      next.bmi = calculateBmi(next.weight, next.height);
      return next;
    });
  }

  async function saveVitals() {
    if (!selectedPatient || !selectedEncounter) return;

    const hasAnyValue = Object.values(currentVitals).some((value) => value.trim() !== "");
    if (!hasAnyValue) return;

    const vitalsEntry = {
      ...currentVitals,
      recordedAt: new Date().toLocaleString(),
    };

    const existingHistory = selectedEncounter.vitalsHistory || [];

    const nextVitalsHistory =
      editingVitalsIndex !== null
        ? existingHistory.map((entry, index) =>
          index === editingVitalsIndex
            ? { ...entry, ...vitalsEntry }
            : entry
        )
        : [vitalsEntry, ...existingHistory];

    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        vitalsHistory: nextVitalsHistory,
      });

      setPatients((prev) =>
        prev.map((patient) => {
          if (patient.id !== selectedPatient.id) return patient;

          return {
            ...patient,
            encounters: patient.encounters.map((encounter) => {
              if (encounter.id !== selectedEncounter.id) return encounter;

              return {
                ...encounter,
                vitalsHistory: nextVitalsHistory,
              };
            }),
          };
        })
      );

      setCurrentVitals(EMPTY_VITALS);
      setEditingVitalsIndex(null);
    } catch (error) {
      console.error("Failed to save vitals:", error);
      alert(`Failed to save vitals: ${error.message}`);
    }

    setCurrentVitals(EMPTY_VITALS);
    setEditingVitalsIndex(null);
  }


  function startEditVitals(entry, index) {
    setCurrentVitals({
      bp: entry.bp || "",
      hr: entry.hr || "",
      temp: entry.temp || "",
      rr: entry.rr || "",
      spo2: entry.spo2 || "",
      weight: entry.weight || "",
      height: entry.height || "",
      bmi: entry.bmi || "",
      pain: entry.pain || "",
    });
    setEditingVitalsIndex(index);
  }
  async function prescribeFromFormulary(item) {
    if (!canPrescribeMeds) return;
    if (!selectedPatient || !selectedEncounter) {
      alert("Open a patient chart first before prescribing.");
      return;
    }

    const medicationToAdd = {
      name: item.name || "",
      dosage: item.strength || "",
      frequency: "Daily",
      route: item.dosageForm || "",
      dispenseAmount: "",
      refillCount: "",
      instructions: "",
      isActive: true,
    };

    const tempMedicationId = `temp-rx-${Date.now()}`;

    const optimisticMedication = {
      id: tempMedicationId,
      ...medicationToAdd,
    };

    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
            ...patient,
            medicationList: [
              ...(patient.medicationList || []),
              optimisticMedication,
            ],
          }
          : patient
      )
    );

    setActiveView("chart");

    try {
      const savedMedication = await createMedicationInSupabase(
        selectedPatient.id,
        medicationToAdd,
        selectedEncounter.id
      );

      const hydratedMedication = {
        id: savedMedication.id,
        name: savedMedication.name || "",
        dosage: savedMedication.dosage || "",
        frequency: savedMedication.frequency || "",
        route: savedMedication.route || "",
        isActive: savedMedication.is_active ?? true,
      };

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).map((med) =>
                med.id === tempMedicationId ? hydratedMedication : med
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to prescribe medication:", error);
      showToast({
        title: "Failed to prescribe medication",
        message: error.message,
        type: "error",
        duration: 5000,
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).filter(
                (med) => med.id !== tempMedicationId
              ),
            }
            : patient
        )
      );
    }
  }
  async function addOrUpdateMedication() {
    if (!selectedPatient || !selectedEncounter) return;
    if (!newMedication.name.trim()) return;

    if (editingMedicationId !== null) {
      const previousMedications = selectedPatient.medicationList || [];

      const optimisticMedications = previousMedications.map((med) =>
        med.id === editingMedicationId
          ? {
            ...med,
            ...newMedication,
            id: editingMedicationId,
            startedDate:
              newMedication.startedDate ||
              newMedication.medicationStartedAt ||
              med.startedDate ||
              med.medicationStartedAt ||
              "",
            medicationStartedAt:
              newMedication.medicationStartedAt ||
              newMedication.startedDate ||
              med.medicationStartedAt ||
              med.startedDate ||
              "",
            lastUpdatedEncounterId: selectedEncounter.id,
          }
          : med
      );

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: optimisticMedications,
            }
            : patient
        )
      );

      setNewMedication(EMPTY_MEDICATION);
      setEditingMedicationId(null);
      setShowMedicationModal(false);

      try {
        await updateMedicationInSupabase(editingMedicationId, {
          ...newMedication,
          lastUpdatedEncounterId: selectedEncounter.id,
        });
      } catch (error) {
        console.error("Failed to save medication:", error);
        showToast({
          title: "Failed to save medication",
          message: error.message,
          type: "error",
          duration: 5000,
        });

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? {
                ...patient,
                medicationList: previousMedications,
              }
              : patient
          )
        );
      }

      return;
    }

    const tempMedicationId = `temp-${Date.now()}`;

    const optimisticMedication = {
      id: tempMedicationId,
      name: newMedication.name || "",
      dosage: newMedication.dosage || "",
      frequency: newMedication.frequency || "",
      route: newMedication.route || "",
      dispenseAmount: newMedication.dispenseAmount || "",
      refillCount: newMedication.refillCount || "",
      instructions: newMedication.instructions || "",
      lastUpdatedEncounterId: selectedEncounter.id,
      isActive: newMedication.isActive ?? true,
      startedDate:
        newMedication.startedDate ||
        newMedication.medicationStartedAt ||
        new Date().toISOString().slice(0, 10),
      medicationStartedAt:
        newMedication.medicationStartedAt ||
        newMedication.startedDate ||
        new Date().toISOString().slice(0, 10),
    };
    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
            ...patient,
            medicationList: [
              ...(patient.medicationList || []),
              optimisticMedication,
            ],
          }
          : patient
      )
    );

    setNewMedication(EMPTY_MEDICATION);
    setEditingMedicationId(null);
    setShowMedicationModal(false);

    try {
      const savedMedication = await createMedicationInSupabase(
        selectedPatient.id,
        newMedication,
        selectedEncounter.id
      );

      const hydratedMedication = {
        id: savedMedication.id,
        name: savedMedication.name || "",
        dosage: savedMedication.dosage || "",
        frequency: savedMedication.frequency || "",
        route: savedMedication.route || "",
        dispenseAmount: savedMedication.dispense_amount ?? "",
        refillCount: savedMedication.refill_count ?? "",
        instructions: savedMedication.instructions || "",
        lastUpdatedEncounterId: savedMedication.last_updated_encounter_id || null,
        isActive: savedMedication.is_active ?? true,
        startedDate: savedMedication.medication_started_at || "",
        medicationStartedAt: savedMedication.medication_started_at || "",
      };

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).map((med) =>
                med.id === tempMedicationId ? hydratedMedication : med
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to save medication:", error);
      showToast({
        title: "Failed to save medication",
        message: error.message,
        type: "error",
        duration: 5000,
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).filter(
                (med) => med.id !== tempMedicationId
              ),
            }
            : patient
        )
      );
    }
  }

  async function submitRefillRequestFromModal() {
    if (!selectedPatient || !refillSourceMedicationId || !session?.user?.id) return;
    if (!newMedication.name?.trim()) return;

    try {
      await handleCreateRefillRequest(
        selectedPatient.id,
        refillSourceMedicationId,
        session.user.id,
        {
          name: newMedication.name || "",
          dosage: newMedication.dosage || "",
          frequency: newMedication.frequency || "",
          route: newMedication.route || "",
          dispenseAmount: newMedication.dispenseAmount || "",
          refillCount: newMedication.refillCount || "",
          instructions: newMedication.instructions || "",
          isActive: newMedication.isActive ?? true,
        }
      );

      setShowMedicationModal(false);
      setNewMedication(EMPTY_MEDICATION);
      setEditingMedicationId(null);
      setIsRefillRequestMode(false);
      setRefillSourceMedicationId(null);

      showToast({
        title: "Refill submitted",
        message: "The refill request was saved and is now pending approval.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to create refill request:", error);
      alert(`Failed to create refill request: ${error.message}`);
    }
  }

  function startEditMedication(med) {
    setNewMedication({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      route: med.route || "",
      dispenseAmount: med.dispenseAmount || "",
      refillCount: med.refillCount || "",
      instructions: med.instructions || "",
      isActive: med.isActive,
      startedDate:
        med.startedDate ||
        med.medicationStartedAt ||
        med.medication_started_at ||
        "",
      medicationStartedAt:
        med.medicationStartedAt ||
        med.medication_started_at ||
        med.startedDate ||
        "",
    });
    setEditingMedicationId(med.id);
    setShowMedicationModal(true);
  }

  function startRefillRequest(med) {
    setNewMedication({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      route: med.route || "",
      dispenseAmount: med.dispenseAmount || "",
      refillCount: med.refillCount || "",
      instructions: med.instructions || "",
      isActive: med.isActive ?? true,
      startedDate:
        med.startedDate ||
        med.medicationStartedAt ||
        med.medication_started_at ||
        "",
      medicationStartedAt:
        med.medicationStartedAt ||
        med.medication_started_at ||
        med.startedDate ||
        "",
    });

    setEditingMedicationId(null);
    setIsRefillRequestMode(true);
    setRefillSourceMedicationId(med.id);
    setShowMedicationModal(true);
  }

  async function toggleMedicationActive(medicationId) {
    if (!selectedPatient || !selectedEncounter) return;

    const existingMedication = (selectedPatient.medicationList || []).find(
      (med) => med.id === medicationId
    );
    if (!existingMedication) return;

    const nextIsActive = !existingMedication.isActive;

    try {
      await updateMedicationInSupabase(medicationId, {
        isActive: nextIsActive,
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).map((med) =>
                med.id === medicationId
                  ? { ...med, isActive: nextIsActive }
                  : med
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to toggle medication:", error);
      showToast({
        title: "Failed to update medication",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function deleteMedication(medicationId) {
    if (!selectedPatient || !selectedEncounter) return;

    const confirmed = window.confirm("Delete this medication?");
    if (!confirmed) return;

    try {
      const previousMedications = selectedPatient.medicationList || [];

      // 🔥 optimistic update FIRST
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              medicationList: previousMedications.filter(
                (med) => med.id !== medicationId
              ),
            }
            : patient
        )
      );

      try {
        await deleteMedicationInSupabase(medicationId);
      } catch (error) {
        console.error("Failed to delete medication:", error);
        showToast({
          title: "Failed to delete medication",
          message: error.message,
          type: "error",
          duration: 5000,
        });

        // 🔁 rollback if failure
        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? {
                ...patient,
                medicationList: previousMedications,
              }
              : patient
          )
        );
      }
    } catch (error) {
      console.error("Failed to delete medication:", error);
      showToast({
        title: "Failed to delete medication",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function handleCreateRefillRequest(
    patientId,
    medicationId,
    userId,
    medicationPayload
  ) {
    if (!patientId || !medicationId || !userId) {
      throw new Error("Missing refill request info.");
    }

    const existingPending = refillRequests.some(
      (req) =>
        String(req.patient_id) === String(patientId) &&
        String(req.medication_id) === String(medicationId) &&
        (!req.status || String(req.status).toLowerCase() === "pending")
    );

    if (existingPending) {
      throw new Error("A pending refill request already exists for this medication.");
    }

    const saved = await createRefillRequest(
      patientId,
      medicationId,
      userId,
      medicationPayload
    );

    setRefillRequests((prev) => [saved, ...prev]);

    return saved;
  }

  async function handleDeleteRefillRequest(refillRequestId) {
    if (!refillRequestId) {
      throw new Error("Missing refill request id.");
    }

    const targetRequest = refillRequests.find(
      (req) => String(req.id) === String(refillRequestId)
    );

    if (!targetRequest) {
      throw new Error("Refill request not found.");
    }

    const status = String(targetRequest.status || "pending").toLowerCase();
    if (status !== "pending") {
      throw new Error("Only pending refill requests can be removed.");
    }

    await deleteRefillRequestInSupabase(refillRequestId);

    setRefillRequests((prev) =>
      prev.filter((req) => String(req.id) !== String(refillRequestId))
    );
  }

  async function handleApproveRefillRequestWithPin(
    refillRequestId,
    attendingId,
    pin
  ) {
    if (!refillRequestId) {
      throw new Error("Missing refill request id.");
    }

    if (!attendingId) {
      throw new Error("Please select an attending.");
    }

    if (!pin || pin.length !== 4) {
      throw new Error("PIN must be 4 digits.");
    }

    const attending = profiles.find(
      (profile) => String(profile.id) === String(attendingId)
    );

    if (!attending) {
      throw new Error("Attending not found.");
    }

    if (!attending.signature_pin_set) {
      throw new Error("This attending has not set up a signature PIN yet.");
    }

    const targetRequest = refillRequests.find(
      (req) => String(req.id) === String(refillRequestId)
    );

    if (!targetRequest) {
      throw new Error("Refill request not found.");
    }

    const { data: pinValid, error: pinError } = await supabase.rpc(
      "verify_signature_pin",
      {
        target_user_id: attendingId,
        raw_pin: pin,
      }
    );

    if (pinError) {
      throw new Error(`Could not verify PIN: ${pinError.message}`);
    }

    if (!pinValid) {
      throw new Error("Incorrect PIN.");
    }

    const payload = targetRequest.request_payload || null;

    if (payload) {
      const updatedMedication = await updateMedicationInSupabase(
        targetRequest.medication_id,
        {
          name: payload.name || "",
          dosage: payload.dosage || "",
          frequency: payload.frequency || "",
          route: payload.route || "",
          dispenseAmount: payload.dispenseAmount || "",
          refillCount: payload.refillCount || "",
          instructions: payload.instructions || "",
          isActive: payload.isActive ?? true,
          lastUpdatedEncounterId: null,
        }
      );

      setPatients((prev) =>
        prev.map((patient) =>
          String(patient.id) === String(targetRequest.patient_id)
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).map((med) =>
                String(med.id) === String(targetRequest.medication_id)
                  ? {
                    ...med,
                    name: updatedMedication.name || "",
                    dosage: updatedMedication.dosage || "",
                    frequency: updatedMedication.frequency || "",
                    route: updatedMedication.route || "",
                    dispenseAmount: updatedMedication.dispense_amount ?? "",
                    refillCount: updatedMedication.refill_count ?? "",
                    instructions: updatedMedication.instructions || "",
                    isActive: updatedMedication.is_active ?? true,
                    lastUpdatedEncounterId:
                      updatedMedication.last_updated_encounter_id || null,
                  }
                  : med
              ),
            }
            : patient
        )
      );
    }

    const saved = await approveRefillRequestInSupabase(
      refillRequestId,
      attendingId
    );

    setRefillRequests((prev) =>
      prev.map((req) =>
        req.id === refillRequestId ? saved : req
      )
    );

    return saved;
  }

  async function handleApproveRefillRequestAsSignedInAttending(refillRequestId) {
    if (!refillRequestId) {
      throw new Error("Missing refill request id.");
    }

    if (!session?.user?.id) {
      throw new Error("No signed-in user found.");
    }

    if (userRole !== "attending") {
      throw new Error("Only attendings can use direct refill approval.");
    }

    const attendingId = session.user.id;

    const attending = profiles.find(
      (profile) => String(profile.id) === String(attendingId)
    );

    if (!attending) {
      throw new Error("Signed-in attending not found.");
    }

    const targetRequest = refillRequests.find(
      (req) => String(req.id) === String(refillRequestId)
    );

    if (!targetRequest) {
      throw new Error("Refill request not found.");
    }

    const payload = targetRequest.request_payload || null;

    if (payload) {
      const updatedMedication = await updateMedicationInSupabase(
        targetRequest.medication_id,
        {
          name: payload.name || "",
          dosage: payload.dosage || "",
          frequency: payload.frequency || "",
          route: payload.route || "",
          dispenseAmount: payload.dispenseAmount || "",
          refillCount: payload.refillCount || "",
          instructions: payload.instructions || "",
          isActive: payload.isActive ?? true,
          lastUpdatedEncounterId: null,
        }
      );

      setPatients((prev) =>
        prev.map((patient) =>
          String(patient.id) === String(targetRequest.patient_id)
            ? {
              ...patient,
              medicationList: (patient.medicationList || []).map((med) =>
                String(med.id) === String(targetRequest.medication_id)
                  ? {
                    ...med,
                    name: updatedMedication.name || "",
                    dosage: updatedMedication.dosage || "",
                    frequency: updatedMedication.frequency || "",
                    route: updatedMedication.route || "",
                    dispenseAmount: updatedMedication.dispense_amount ?? "",
                    refillCount: updatedMedication.refill_count ?? "",
                    instructions: updatedMedication.instructions || "",
                    isActive: updatedMedication.is_active ?? true,
                    lastUpdatedEncounterId:
                      updatedMedication.last_updated_encounter_id || null,
                  }
                  : med
              ),
            }
            : patient
        )
      );
    }

    const saved = await approveRefillRequestInSupabase(
      refillRequestId,
      attendingId
    );

    setRefillRequests((prev) =>
      prev.map((req) =>
        req.id === refillRequestId ? saved : req
      )
    );

    return saved;
  }

  async function addOrUpdateAllergy() {
    if (!selectedPatient) return;
    if (!newAllergy.allergen.trim()) return;

    if (editingAllergyId !== null) {
      try {
        await updateAllergyInSupabase(editingAllergyId, newAllergy);

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? {
                ...patient,
                allergyList: (patient.allergyList || []).map((allergy) =>
                  allergy.id === editingAllergyId
                    ? { ...allergy, ...newAllergy, id: editingAllergyId }
                    : allergy
                ),
              }
              : patient
          )
        );
      } catch (error) {
        console.error("Failed to update allergy:", error);
        showToast({
          title: "Failed to update allergy",
          message: error.message,
          type: "error",
          duration: 5000,
        });
        return;
      }
    } else {
      try {
        const savedAllergy = await createAllergyInSupabase(selectedPatient.id, newAllergy);

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? {
                ...patient,
                allergyList: [
                  {
                    id: savedAllergy.id,
                    allergen: savedAllergy.allergen || "",
                    reaction: savedAllergy.reaction || "",
                    severity: savedAllergy.severity || "",
                    notes: savedAllergy.notes || "",
                    isActive: savedAllergy.is_active ?? true,
                  },
                  ...(patient.allergyList || []),
                ],
              }
              : patient
          )
        );
      } catch (error) {
        console.error("Failed to create allergy:", error);
        showToast({
          title: "Failed to create allergy",
          message: error.message,
          type: "error",
          duration: 5000,
        });
        return;
      }
    }

    setNewAllergy(EMPTY_ALLERGY);
    setEditingAllergyId(null);
    setShowAllergyModal(false);
  }

  function startEditAllergy(allergy) {
    setNewAllergy({
      allergen: allergy.allergen || "",
      reaction: allergy.reaction || "",
      severity: allergy.severity || "",
      notes: allergy.notes || "",
      isActive: allergy.isActive ?? true,
    });
    setEditingAllergyId(allergy.id);
    setShowAllergyModal(true);
  }

  async function deleteAllergy(allergyId) {
    if (!selectedPatient) return;

    const confirmed = window.confirm("Delete this allergy?");
    if (!confirmed) return;

    try {
      await deleteAllergyInSupabase(allergyId);

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              allergyList: (patient.allergyList || []).filter(
                (allergy) => allergy.id !== allergyId
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to delete allergy:", error);
      showToast({
        title: "Failed to delete allergy",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function saveSoapNote(showConfirmation = true) {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;

    const currentSoapStatus = selectedEncounter.soapStatus || "draft";

    const authorId = showConfirmation
      ? session.user.id
      : (selectedEncounter.soapAuthorId || session.user.id);

    const authorRole = showConfirmation
      ? userRole
      : (selectedEncounter.soapAuthorRole || userRole);

    const isOphthoEncounter =
      selectedEncounter?.specialtyType === "ophthalmology";

    const ophtho = {
      ...EMPTY_OPHTHO_NOTE,
      ...(soapDraft.ophthalmologyNote || {}),
    };

    const soapSubjectiveToSave = isOphthoEncounter
      ? ophtho.hpi || ""
      : soapDraft.soapSubjective || "";

    const soapObjectiveToSave = isOphthoEncounter
      ? [
        `Medical / Ocular History:\n${ophtho.ocularHistory || ""}`,
        `VA Distant:\nOD: ${ophtho.vaOd || ""}\nOS: ${ophtho.vaOs || ""}`,
        `PH:\nOD: ${ophtho.phOd || ""}\nOS: ${ophtho.phOs || ""}`,
        `IOP:\nOD: ${ophtho.iopOd || ""}\nOS: ${ophtho.iopOs || ""}`,
        `External:\nOD: ${ophtho.externalOd || ""}\nOS: ${ophtho.externalOs || ""}`,
        `Slit Lamp:\nOD: ${ophtho.slitLampOd || ""}\nOS: ${ophtho.slitLampOs || ""}`,
        `Dilated Fundus Exam:\nOD: ${ophtho.fundusOd || ""}\nOS: ${ophtho.fundusOs || ""}`,
      ].join("\n\n")
      : soapDraft.soapObjective || "";

    const soapAssessmentToSave = isOphthoEncounter
      ? ophtho.assessment || ""
      : soapDraft.soapAssessment || "";

    const soapPlanToSave = isOphthoEncounter
      ? ophtho.plan || ""
      : soapDraft.soapPlan || "";

    try {
      setSoapBusy(true);

      if (showConfirmation) {
        setSoapUiMessage("Saving...");
      }

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapSubjectiveToSave,
        soapObjective: soapObjectiveToSave,
        soapAssessment: soapAssessmentToSave,
        soapPlan: soapPlanToSave,
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        soapStatus: currentSoapStatus,
        ophthalmologyNote: isOphthoEncounter ? ophtho : null,
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapSubjectiveToSave,
                    soapObjective: soapObjectiveToSave,
                    soapAssessment: soapAssessmentToSave,
                    soapPlan: soapPlanToSave,
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    soapStatus: currentSoapStatus,
                    soapSavedAt: new Date().toLocaleString(),
                    ophthalmologyNote: isOphthoEncounter ? ophtho : null,
                  }
                  : encounter
              ),
            }
            : patient
        )
      );

      if (showConfirmation) {
        showSoapMessage("SOAP note saved.");
      }
    } catch (error) {
      console.error("Failed to save SOAP note:", error);
      showSoapMessage(`Failed to save SOAP note: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }

  useEffect(() => {
    if (
      activeView !== "chart" ||
      !medicalSoapEnabled ||
      !selectedEncounter?.id ||
      soapDraft.encounterId !== selectedEncounter.id ||
      selectedEncounter.soapStatus === "signed" ||
      ["social_work", "physical_therapy"].includes(selectedEncounter.noteType) ||
      soapBusy ||
      soapAutosaveInFlightRef.current
    ) {
      return undefined;
    }

    const isOphthoEncounter =
      selectedEncounter.noteType === "ophthalmology" ||
      selectedEncounter.specialtyType === "ophthalmology";
    const isDirty = isOphthoEncounter
      ? JSON.stringify(soapDraft.ophthalmologyNote || {}) !==
          JSON.stringify(selectedEncounter.ophthalmologyNote || {}) ||
        (soapDraft.notes || "") !== (selectedEncounter.notes || "")
      : (soapDraft.soapSubjective || "") !== (selectedEncounter.soapSubjective || "") ||
        (soapDraft.soapObjective || "") !== (selectedEncounter.soapObjective || "") ||
        (soapDraft.soapAssessment || "") !== (selectedEncounter.soapAssessment || "") ||
        (soapDraft.soapPlan || "") !== (selectedEncounter.soapPlan || "") ||
        (soapDraft.notes || "") !== (selectedEncounter.notes || "");

    if (!isDirty) return undefined;

    const timeout = window.setTimeout(async () => {
      soapAutosaveInFlightRef.current = true;
      try {
        await saveSoapNote(false);
      } finally {
        soapAutosaveInFlightRef.current = false;
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [
    activeView,
    medicalSoapEnabled,
    selectedEncounter,
    soapBusy,
    soapDraft,
  ]);

  async function updateEncounterWorkflowSafely(encounterId, updates, expectedSoapStatus) {
    try {
      const updated = await updateEncounterInSupabase(encounterId, updates, {
        expectedWorkflowVersion: selectedEncounter?.workflowVersion ?? 0,
        expectedSoapStatus,
      });

      setPatients((prev) => prev.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) =>
          encounter.id === encounterId
            ? { ...encounter, workflowVersion: Number(updated.workflow_version || 0) }
            : encounter
        ),
      })));
      return updated;
    } catch (error) {
      if (error.code === "WORKFLOW_CONFLICT") {
        await refreshClinicData?.();
        setSelectedPatientId(selectedPatient?.id || null);
        setSelectedEncounterId(encounterId);
      }
      throw error;
    }
  }

  async function submitSoapForUpperLevel() {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;

    const missingFields = getMissingSoapFields(soapDraft);
    if (missingFields.length > 0) {
      showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
      return false;
    }

    const authorId = selectedEncounter.soapAuthorId || session.user.id;
    const authorRole = selectedEncounter.soapAuthorRole || userRole;

    try {
      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        soapStatus: "awaiting_upper",
        ophthalmologyNote:
          selectedEncounter?.specialtyType === "ophthalmology"
            ? {
              ...EMPTY_OPHTHO_NOTE,
              ...(soapDraft.ophthalmologyNote || {}),
            }
            : null,
      }, selectedEncounter.soapStatus || "draft");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    soapStatus: "awaiting_upper",
                    soapSavedAt: new Date().toLocaleString(),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
      await logAuditEvent("soap_submitted_upper", {
        soapStatus: "awaiting_upper",
      });
      await loadAuditLog();
      showSoapMessage("SOAP note submitted for upper-level signature.");
    } catch (error) {
      console.error("Failed to submit SOAP for upper-level signature:", error);
      showSoapMessage(`Failed to submit SOAP: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }

  async function submitSoapForAttending() {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;

    const missingFields = getMissingSoapFields(soapDraft);
    if (missingFields.length > 0) {
      showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
      return;
    }

    const authorId = selectedEncounter.soapAuthorId || session.user.id;
    const authorRole = selectedEncounter.soapAuthorRole || userRole;

    try {
      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        soapStatus: "awaiting_attending",
        ophthalmologyNote:
          selectedEncounter?.specialtyType === "ophthalmology"
            ? {
              ...EMPTY_OPHTHO_NOTE,
              ...(soapDraft.ophthalmologyNote || {}),
            }
            : null,
      }, selectedEncounter.soapStatus || "draft");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    soapStatus: "awaiting_attending",
                    soapSavedAt: new Date().toLocaleString(),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );

      await logAuditEvent("soap_submitted_attending", {
        soapStatus: "awaiting_attending",
      });
      await loadAuditLog();
      showSoapMessage("SOAP note submitted for attending signature.");
    } catch (error) {
      console.error("Failed to submit SOAP for attending signature:", error);
      showSoapMessage(`Failed to submit SOAP: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }

  async function signSoapAsUpperLevel() {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;
    if (!canSignAsUpperLevel) return;

    const missingFields = getMissingSoapFields(soapDraft);
    if (missingFields.length > 0) {
      showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
      return;
    }

    const authorId = selectedEncounter.soapAuthorId || session.user.id;
    const authorRole = selectedEncounter.soapAuthorRole || userRole;
    const signedAt = new Date().toISOString();

    try {
      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        upperLevelSignedBy: session.user.id,
        upperLevelSignedAt: signedAt,
        soapStatus: "awaiting_attending",
        ophthalmologyNote:
          selectedEncounter?.specialtyType === "ophthalmology"
            ? {
              ...EMPTY_OPHTHO_NOTE,
              ...(soapDraft.ophthalmologyNote || {}),
            }
            : null,
      }, "awaiting_upper");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    soapStatus: "awaiting_attending",
                    soapSavedAt: new Date().toLocaleString(),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
      await logAuditEvent("soap_signed_upper", {
        soapStatus: "awaiting_attending",
        signedAt,
      });
      await loadProfiles();
      await loadAuditLog();
      showSoapMessage("SOAP note signed by upper-level reviewer.");
    } catch (error) {
      console.error("Failed to sign SOAP as upper-level:", error);
      showSoapMessage(`Failed to sign SOAP: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }

  async function setSkipUpperLevelApproval(enabled) {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id) return;
    if (userRole !== "leadership") return;

    if (!!selectedEncounter?.skipUpperLevel === !!enabled) {
      return;
    }

    const hasSoapStarted =
      !!(soapDraft.soapSubjective || "").trim() ||
      !!(soapDraft.soapObjective || "").trim() ||
      !!(soapDraft.soapAssessment || "").trim() ||
      !!(soapDraft.soapPlan || "").trim() ||
      !!(soapDraft.ophthalmologyNote?.hpi || "").trim() ||
      !!(soapDraft.ophthalmologyNote?.ocularHistory || "").trim() ||
      !!(soapDraft.ophthalmologyNote?.assessment || "").trim() ||
      !!(soapDraft.ophthalmologyNote?.plan || "").trim();

    if (enabled && !hasSoapStarted) {
      showToast({
        title: "SOAP not started",
        message: "Start the note before approving Skip Upper Level.",
        type: "warning",
      });
      return;
    }

    const fromSoapStatus = selectedEncounter?.soapStatus || "draft";
    const toSoapStatus = enabled ? "awaiting_attending" : "draft";

    try {
      const nowIso = new Date().toISOString();

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        skipUpperLevel: enabled,
        skipUpperLevelBy: enabled ? session.user.id : null,
        skipUpperLevelAt: enabled ? nowIso : null,
        soapStatus: toSoapStatus,
      }, fromSoapStatus);

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    skipUpperLevel: enabled,
                    skipUpperLevelBy: enabled ? session.user.id : null,
                    skipUpperLevelAt: enabled ? nowIso : null,
                    soapStatus: toSoapStatus,
                  }
                  : encounter
              ),
            }
            : patient
        )
      );

      await refreshClinicData();
      setSelectedPatientId(selectedPatient.id);
      setSelectedEncounterId(selectedEncounter.id);

      await logAuditEvent(
        enabled ? "skip_upper_level_approved" : "skip_upper_level_removed",
        {
          fromSoapStatus,
          toSoapStatus,
          bypassedUpperLevel: enabled,
        }
      );

      await loadAuditLog();

      showToast({
        title: enabled ? "Skip Upper Level approved" : "Skip Upper Level removed",
        message: enabled
          ? "This encounter can now bypass upper level and go directly to attending."
          : "This encounter has been returned to the normal upper-level workflow.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to update skip upper level approval:", error);
      showToast({
        title: "Update failed",
        message: error.message,
        type: "error",
        duration: 5000,
      });
    }
  }

  async function signSoapAsAttending() {
    if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;
    if (!canSignAsAttending) return;

    const missingFields = getMissingSoapFields(soapDraft);
    if (missingFields.length > 0) {
      showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
      return;
    }



    const authorId = selectedEncounter.soapAuthorId || session.user.id;
    const authorRole = selectedEncounter.soapAuthorRole || userRole;
    const signedAt = new Date().toISOString();
    const signatureSnapshot = profiles.find((profile) => profile.id === session.user.id)?.signature_data_url || "";

    try {
      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        attendingSignedBy: session.user.id,
        attendingSignedAt: signedAt,
        attendingSignatureData: signatureSnapshot,
        soapStatus: "signed",
        status: "done",
        ophthalmologyNote:
          selectedEncounter?.specialtyType === "ophthalmology"
            ? {
              ...EMPTY_OPHTHO_NOTE,
              ...(soapDraft.ophthalmologyNote || {}),
            }
            : null,
      }, "awaiting_attending");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    soapStatus: "signed",
                    status: "done",
                    attendingSignedBy: session.user.id,
                    attendingSignedAt: signedAt,
                    attendingSignatureData: signatureSnapshot,
                    soapSavedAt: new Date().toLocaleString(),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
      await logAuditEvent("soap_signed_attending", {
        soapStatus: "signed",
        signedAt,
      });
      await loadAuditLog();
      showSoapMessage("SOAP note signed by attending.");
      return true;
    } catch (error) {
      console.error("Failed to sign SOAP as attending:", error);
      showSoapMessage(`Failed to sign SOAP: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }


  async function signSoapAsAttendingWithPin(attendingId, pin) {
    if (!selectedPatient || !selectedEncounter) return false;
    if (!canSignWithAttendingPin) return false;
    if (!attendingId || pin.length !== 4) return false;

    const missingFields = getMissingSoapFields(soapDraft);
    if (missingFields.length > 0) {
      showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
      return;
    }

    try {
      const attending = profiles.find(
        (a) => String(a.id) === String(attendingId)
      );

      if (!attending) {
        showSoapMessage("Attending not found.");
        return false;
      }

      if (!attending.signature_pin_set) {
        showSoapMessage("This attending has not set up a signature PIN yet.");
        return false;
      }

      const { data: pinValid, error: pinError } = await supabase.rpc(
        "verify_signature_pin",
        {
          target_user_id: attendingId,
          raw_pin: pin,
        }
      );

      if (pinError) {
        console.error("PIN verification failed:", pinError);
        showSoapMessage(`Could not verify PIN: ${pinError.message}`);
        return false;
      }

      if (!pinValid) {
        showSoapMessage("Incorrect PIN.");
        return false;
      }

      const authorId = selectedEncounter.soapAuthorId || session?.user?.id;
      const authorRole = selectedEncounter.soapAuthorRole || userRole;
      const signedAt = new Date().toISOString();
      const signatureSnapshot = attending.signature_data_url || "";

      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        attendingSignedBy: attending.id,
        attendingSignedAt: signedAt,
        attendingSignatureData: signatureSnapshot,
        soapStatus: "signed",
        status: "done",
        ophthalmologyNote:
          selectedEncounter?.specialtyType === "ophthalmology"
            ? {
              ...EMPTY_OPHTHO_NOTE,
              ...(soapDraft.ophthalmologyNote || {}),
            }
            : null,
      }, "awaiting_attending");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    attendingSignedBy: attending.id,
                    attendingSignedAt: signedAt,
                    attendingSignatureData: signatureSnapshot,
                    soapStatus: "signed",
                    status: "done",
                    soapSavedAt: new Date().toLocaleString(),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );

      await createAuditLog({
        encounterId: selectedEncounter.id,
        patientId: selectedPatient.id,
        actorUserId: attending.id,
        actorName: attending.full_name || "Unknown User",
        actorRole: "attending",
        action: "soap_signed_attending",
        details: {
          soapStatus: "signed",
          signedAt,
          signedByPin: true,
        },
      });

      await loadAuditLog();
      showSoapMessage("SOAP note signed by attending.");
      return true;
    } catch (error) {
      console.error("Failed to sign SOAP with PIN:", error);
      showSoapMessage(`Failed to sign SOAP: ${error.message}`);
      return false;
    } finally {
      setSoapBusy(false);
    }
  }

  async function reopenSoapNote() {
    if (!selectedPatient || !selectedEncounter) return;
    if (!canReopenSoap) return;

    try {
      setSoapBusy(true);
      setSoapUiMessage("Reopening...");

      await updateEncounterWorkflowSafely(selectedEncounter.id, {
        attendingSignedBy: null,
        attendingSignedAt: null,
        attendingSignatureData: null,
        soapStatus: "awaiting_attending",
      }, "signed");

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    attendingSignedBy: null,
                    attendingSignedAt: null,
                    attendingSignatureData: "",
                    soapStatus: "awaiting_attending",
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
      await logAuditEvent("soap_reopened", {
        soapStatus: "awaiting_attending",
      });
      await loadAuditLog();
      showSoapMessage("SOAP note reopened.");
    } catch (error) {
      console.error("Failed to reopen SOAP note:", error);
      showSoapMessage(`Failed to reopen SOAP note: ${error.message}`);
    } finally {
      setSoapBusy(false);
    }
  }


  async function exportClinicSummaryToWord() {
    const [docxModule, fileSaverModule] = await Promise.all([
      import("docx"),
      import("file-saver"),
    ]);
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
    } = docxModule;
    const { saveAs } = fileSaverModule;
    const clinicDateLabel = summaryClinicDate || formatClinicDate();

    const rowsForDate = summaryPatientRows.filter(
      ({ encounter }) =>
        !summaryClinicDate ||
        normalizeClinicDate(encounter.clinicDate) === summaryClinicDate
    );

    const returningRows = rowsForDate.filter(
      ({ encounter }) => encounter.newReturning === "Returning"
    );

    const newRows = rowsForDate.filter(
      ({ encounter }) => encounter.newReturning === "New"
    );

    const tableBorders = {
      top: { style: "single", size: 1, color: "000000" },
      bottom: { style: "single", size: 1, color: "000000" },
      left: { style: "single", size: 1, color: "000000" },
      right: { style: "single", size: 1, color: "000000" },
      insideHorizontal: { style: "single", size: 1, color: "000000" },
      insideVertical: { style: "single", size: 1, color: "000000" },
    };

    function headerCell(text) {
      return new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true })],
          }),
        ],
      });
    }

    function bodyCell(text, align = AlignmentType.LEFT) {
      return new TableCell({
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun(String(text ?? ""))],
          }),
        ],
      });
    }

    function blankStaffSideCell() {
      return new TableCell({
        columnSpan: 2,
        children: [new Paragraph({ text: "" })],
      });
    }
    function formatDobForSummary(dob) {
      if (!dob) return "";

      const parts = String(dob).split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${month}-${day}-${year}`;
      }

      return String(dob).replaceAll("/", "-");
    }

    function formatClinicSummaryDateForWord(dateValue) {
      return formatDobForSummary(dateValue || formatClinicDate());
    }

    function patientTableRows(items) {
      return [
        new TableRow({
          children: [
            headerCell("MRN"),
            headerCell("NAME"),
            headerCell("DOB"),
            headerCell("INSURANCE?"),
          ],
        }),
        ...items.map(({ patient }) =>
          new TableRow({
            children: [
              bodyCell(patient.mrn || "", AlignmentType.CENTER),
              bodyCell(getFullPatientName(patient) || "", AlignmentType.LEFT),
              bodyCell(formatDobForSummary(patient.dob) || "", AlignmentType.CENTER),
              bodyCell("", AlignmentType.CENTER),
            ],
          })
        ),
      ];
    }

    const summaryTable = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Clinic Staff", bold: true })],
                }),
              ],
            }),
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Clinic Numbers", bold: true })],
                }),
              ],
            }),
          ],
        }),

        new TableRow({
          children: [
            bodyCell("Attendings"),
            bodyCell(clinicSummary.attendingNames || ""),
            bodyCell("Returning"),
            bodyCell(returningPatientCount, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell("Residents:"),
            bodyCell(clinicSummary.residentNames || ""),
            bodyCell("New"),
            bodyCell(newPatientCount, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell("MS3 / MS4"),
            bodyCell(clinicSummary.ms34Names || ""),
            bodyCell("Refill"),
            bodyCell(clinicSummary.refillCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell("MS1 / MS2"),
            bodyCell(clinicSummary.ms12Names || ""),
            bodyCell("LWOBS"),
            bodyCell(clinicSummary.lwobsCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Labs"),
            bodyCell(clinicSummary.labsCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Mental Health"),
            bodyCell(clinicSummary.mentalHealthCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Addiction Medicine"),
            bodyCell(clinicSummary.addictionMedicineCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Physical Therapy"),
            bodyCell(clinicSummary.ptCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Dermatology"),
            bodyCell(clinicSummary.dermatologyCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Ophthalmology"),
            bodyCell(clinicSummary.ophthalmologyCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Social Work"),
            bodyCell(clinicSummary.socialWorkCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Zoom"),
            bodyCell(clinicSummary.zoomCount ?? 0, AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            blankStaffSideCell(),
            bodyCell("Phone"),
            bodyCell(clinicSummary.phoneCount ?? 0, AlignmentType.CENTER),
          ],
        }),
      ],
    });



    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Patients Seen: ${formatClinicSummaryDateForWord(clinicDateLabel)}`,
                  bold: true,
                  underline: {},
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "RETURNING PATIENTS", bold: true })],
            }),

            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: tableBorders,
              rows: patientTableRows(returningRows),
            }),

            new Paragraph({ text: "" }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "NEW PATIENTS", bold: true })],
            }),

            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: tableBorders,
              rows: patientTableRows(newRows),
            }),

            new Paragraph({ text: "" }),

            summaryTable,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Clinic Summary - ${clinicDateLabel}.docx`);
  }

  async function handleResetUserPassword(email) {
    if (!email) {
      setProfilesMessage("This user does not have an email saved.");
      return;
    }

    try {
      setProfilesMessage("");
      await sendPasswordReset(email);
      setProfilesMessage(`Password reset email sent to ${email}.`);
    } catch (error) {
      console.error("Failed to send password reset:", error);
      setProfilesMessage(`Failed to send password reset: ${error.message}`);
    }
  }

  async function handleDeleteUser(userId) {
    const confirmText = prompt(
      "Type DELETE to confirm removing this user permanently:"
    );

    if (confirmText !== "DELETE") return;

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        throw new Error("Your session expired. Please sign out and sign back in.");
      }

      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        let details = null;

        try {
          details = await error.context.json();
        } catch {
          details = null;
        }

        throw new Error(details?.error || error.message || "Delete failed");
      }

      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      setProfilesMessage("User deleted successfully.");
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert(error.message);
    }
  }

  const lastVisitLabel =
    selectedPatient && sortedSelectedPatientEncounters.length > 1
      ? formatDate(
        normalizeClinicDate(sortedSelectedPatientEncounters[1]?.clinicDate) ||
        sortedSelectedPatientEncounters[1]?.clinicDate
      )
      : "No prior visit";

  if (session && needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold text-slate-900">
            Complete Your Profile
          </h2>

          <p className="mb-5 text-sm text-slate-600">
            Finish setting up your account before entering the app.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                className="w-full rounded-lg border px-3 py-3 text-sm"
                value={onboardingFullName}
                onChange={(e) => setOnboardingFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>


            {userRole === "student" || userRole === "upper_level" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Classification
                </label>
                <select
                  className="w-full rounded-lg border px-3 py-3 text-sm"
                  value={onboardingClassification}
                  onChange={(e) => setOnboardingClassification(e.target.value)}
                >
                  <option value="">Select classification</option>
                  <option value="MS1">MS1</option>
                  <option value="MS2">MS2</option>
                  <option value="MS3">MS3</option>
                  <option value="MS4">MS4</option>
                </select>
              </div>
            ) : null}

            {authMessage ? (
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {authMessage}
              </div>
            ) : null}

            <button
              onClick={handleCompleteOnboarding}
              disabled={authLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? "Saving..." : "Finish Setup"}
            </button>

            <button
              onClick={handleSignOut}
              disabled={authLoading}
              className="w-full rounded-lg bg-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">FC EMR</h1>
              <p className="mt-2 text-sm text-slate-600">
                Log in to continue or create your account if this is your first time here.
              </p>
            </div>

            <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                aria-pressed={authMode === "login"}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${authMode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
                  }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                aria-pressed={authMode === "signup"}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${authMode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
                  }`}
              >
                First-Time Sign Up
              </button>
            </div>

            <div className="space-y-4">
              {authMode === "signup" ? (
                <>
                  <div>
                    <label htmlFor="auth-full-name" className="mb-1 block text-sm font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      id="auth-full-name"
                      name="fullName"
                      autoComplete="name"
                      className="w-full rounded-lg border px-3 py-3 text-sm"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-role" className="mb-1 block text-sm font-medium text-slate-700">
                      Requested role
                    </label>
                    <select
                      id="auth-role"
                      name="role"
                      className="w-full rounded-lg border px-3 py-3 text-sm"
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value)}
                    >
                      <option value="">Select role</option>
                      <option value="student">Student</option>
                      <option value="upper_level">Upper Level</option>
                      <option value="attending">Attending</option>
                      <option value="leadership">Leadership</option>
                      <option value="undergraduate">Undergraduate</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="lab">Lab</option>
                      <option value="social_work">Social Work</option>
                      <option value="physical_therapy">Physical Therapy</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Access begins after leadership verifies and approves this request.
                    </p>
                  </div>

                  {authRole === "student" || authRole === "upper_level" ? (
                    <select
                      className="w-full rounded-lg border px-3 py-3 text-sm"
                      value={authClassification}
                      onChange={(e) => setAuthClassification(e.target.value)}
                    >
                      <option value="">Select classification</option>
                      <option value="MS1">MS1</option>
                      <option value="MS2">MS2</option>
                      <option value="MS3">MS3</option>
                      <option value="MS4">MS4</option>
                    </select>
                  ) : null}

                  {authRole === "attending" ? (
                    <>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        maxLength={4}
                        className="w-full rounded-lg border px-3 py-3 text-sm"
                        placeholder="4-digit PIN"
                        value={authPin}
                        onChange={(e) =>
                          setAuthPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                      />

                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        maxLength={4}
                        className="w-full rounded-lg border px-3 py-3 text-sm"
                        placeholder="Confirm 4-digit PIN"
                        value={authPinConfirm}
                        onChange={(e) =>
                          setAuthPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                      />
                    </>
                  ) : null}
                </>
              ) : null}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  authMode === "login" ? handleSignIn() : handleSignUp();
                }}
              >
                <div>
                  <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-lg border px-3 py-3 text-sm"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    name="password"
                    className="w-full rounded-lg border px-3 py-3 text-sm"
                    type="password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>

                {authMessage ? (
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {authMessage}
                  </div>
                ) : null}

                {authMode === "login" ? (
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authLoading ? "Signing In..." : "Log In"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authLoading ? "Creating Account..." : "Create Account"}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (isBoardDisplayMode) {
    return (
      <BoardDisplay
        ROOM_OPTIONS={ROOM_OPTIONS}
        canOpenCharts={userRole !== "lab"}
        roomMap={roomMap}
        getPatientBoardName={getPatientBoardName}
        getStudentBoardName={getStudentBoardName}
        spanishBadge={spanishBadge}
        htnBadge={htnBadge}
        priorityBadge={priorityBadge}
        newReturningBadge={newReturningBadge}
        elevatorBadge={elevatorBadge}
        diabetesBadge={diabetesBadge}
        fluBadge={fluBadge}
        papBadge={papBadge}
        getStatusClasses={getStatusClasses}
        allEncounterRows={boardEncounterRows}
        todayStaffRoster={todayStaffRoster}
        selectedClinicDate={boardClinicDate}
        tonightSpecialtyNames={tonightSpecialtyNames}
        tonightReservedRooms={tonightReservedRooms}
        boardMessage={activeBoardMessage}

      />
    );
  }


  return (
    <div className="min-h-screen bg-slate-100 xl:flex">
      <AppSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        setIsEditingIntake={setIsEditingIntake}
        setEditingPatientId={setEditingPatientId}
        setIntakeForm={setIntakeForm}
        setIntakeTab={setIntakeTab}
        setShowIntakeModal={setShowIntakeModal}
        EMPTY_FORM={EMPTY_FORM}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isLeadershipView={isLeadershipView}
        userRole={userRole}
        canRefillAccess={canRefillAccess}
        canLabQueueAccess={canLabQueueAccess}
        canProgramsAccess={canAccessPrograms}
        canAccessResearch={canAccessResearch}
      />

      <div className="min-w-0 flex-1 bg-slate-100 xl:ml-64 xl:flex xl:flex-col">
        <AppHeader
          activeView={activeView}
          selectedPatient={selectedPatient}
          getFullPatientName={getFullPatientName}
          formatDate={formatDate}
          user={session?.user}
          userRole={userRole}
          handleResetSession={handleResetSession}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onOpenStickyNotes={openStickyNotes}
          medicalSoapEnabled={medicalSoapEnabled}
          chartingSettingsBusy={chartingSettingsBusy}
          onToggleMedicalSoap={toggleMedicalSoap}
          onManageSignature={() => openSignatureManager()}
        />

        {activeView === "lab-import" && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Lab Import</h3>
                <p className="text-sm text-slate-600">
                  Upload a PDF/image for OCR or paste outside lab text below.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <label className="block text-sm font-medium text-slate-700">
                  Upload lab PDF or image
                </label>

                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleGoogleOCRImport(file);
                    }
                    e.target.value = "";
                  }}
                />

                {ocrUploading && (
                  <p className="mt-2 text-sm text-blue-700">Running OCR...</p>
                )}

                {ocrError && (
                  <p className="mt-2 text-sm text-red-600">{ocrError}</p>
                )}
              </div>

              <textarea
                value={labImportRawText}
                onChange={(e) => setLabImportRawText(e.target.value)}
                placeholder="Paste labs or upload PDF above..."
                className="min-h-[220px] w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleParseLabImportText}
                  disabled={ocrUploading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Parse Labs
                </button>

                <button
                  onClick={() => {
                    setLabImportRawText("");
                    setLabImportPacket(null);
                    setLabImportPackets([]);
                    setSelectedLabImportPacketId(null);
                    setOcrError("");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}



        <div>
          {activeView === "dashboard" && (
            <DashboardView
              isLeadershipView={isLeadershipView}
              canViewAnalytics={false}
              canEditMrn={userRole === "undergraduate" || isLeadershipView}
              canEditUndergradFields={userRole === "undergraduate" || isLeadershipView}
              canEditAllPatientFields={isLeadershipView}
              canEditPatient={isLeadershipView}
              canDeletePatient={isLeadershipView}
              deletePatientCompletely={deletePatientCompletely}
              openPatientEditModal={openPatientEditModal}
              dashboardSelectedPatient={dashboardSelectedPatient}
              duplicateMrnPatientsForSelected={duplicateMrnPatientsForSelected}
              mergePatientRecordsByMrn={mergePatientRecordsByMrn}
              wideMergeCandidateCount={wideMergeCandidates.length}
              onOpenWideMergeReview={() => setShowWideMergeReview(true)}
              selectedClinicDate={selectedClinicDate}
              setSelectedClinicDate={setSelectedClinicDate}
              filteredVisiblePatients={filteredVisiblePatients}
              visibleEncounterRows={visibleEncounterRows}
              allEncounterRows={allEncounterRows}
              searchForm={searchForm}
              setSearchForm={setSearchForm}
              patientRecordsTitle={patientRecordsTitle}
              openPatientFromFilteredView={openPatientFromFilteredView}
              getFullPatientName={getFullPatientName}
              finalizeClinicDay={finalizeClinicDay}
              profiles={profiles}
            />
          )}

          {activeView === "lab-import" && (
            <LabImportView
              packet={labImportPacket}
              packets={labImportPackets}
              selectedPacketId={selectedLabImportPacketId}
              onSelectPacket={handleSelectLabImportPacket}
              onChangeLabs={handleLiveUpdateLabPacketLabs}
              onAfterSaveCleanup={cleanupSavedLabImportPacket}
              onBack={() => {
                setActiveView("dashboard");
              }}
              onExportDebug={handleExportLabDebug}
              onConfirmPatient={(packetId, patient) => {
                if (!packetId || !patient) return;
                handleConfirmLabImportPatient(packetId, patient);
              }}
              onSkip={() => {
                if (!labImportPacket?.packetId) return;
                handleSkipLabImportPacket(labImportPacket.packetId);
              }}
              onSave={async (reviewedLabs, encounterId) => {
                if (!labImportPacket || !labImportPacket.confirmedPatient || !encounterId) {
                  alert("Pick a patient and encounter first.");
                  return;
                }

                try {
                  await updateEncounterInSupabase(encounterId, {
                    importedSendOutLabs: reviewedLabs,
                  });

                  const savedAt = new Date().toISOString();

                  await updateSharedLabImportPacket(labImportPacket.packetId, {
                    parsed_labs_json: reviewedLabs,
                    matched_patient_id: labImportPacket.confirmedPatient.id,
                    matched_encounter_id: encounterId,
                    review_status: "saved",
                    saved_at: savedAt,
                    suspicious_count: (reviewedLabs || []).filter((lab) => !!lab?.suspicious).length,
                    missing_count: (reviewedLabs || []).filter((lab) => !!lab?.missing || !!lab?.autoFilled).length,
                    total_lab_count: (reviewedLabs || []).length,
                  });

                  setLabImportPackets((prev) =>
                    prev.map((packet) =>
                      packet.packetId === labImportPacket.packetId
                        ? {
                          ...packet,
                          labs: reviewedLabs,
                          reviewStatus: "saved",
                          savedAt,
                          matchedEncounterId: encounterId,
                        }
                        : packet
                    )
                  );

                  setLabImportPacket((prev) =>
                    prev && prev.packetId === labImportPacket.packetId
                      ? {
                        ...prev,
                        labs: reviewedLabs,
                        reviewStatus: "saved",
                        savedAt,
                        matchedEncounterId: encounterId,
                      }
                      : prev
                  );

                  await loadSharedLabImportBatch(activeLabImportBatchId || null);

                  showToast({
                    title: "Labs saved",
                    message: "Imported labs were saved successfully.",
                    type: "success",
                  });
                } catch (error) {
                  console.error("Failed to save imported labs:", error);
                  alert(`Failed to save imported labs: ${error.message}`);
                }
              }}
            />
          )}

          {activeView === "registration" && (
            <RegistrationView
              registrationRows={registrationRows}
              selectedClinicDate={selectedClinicDate}
              setSelectedClinicDate={setSelectedClinicDate}
              openUndergradRegistration={openUndergradRegistration}
              openLeadershipRegistration={openLeadershipRegistration}
              getFullPatientName={getFullPatientName}
              formatDate={formatDate}
              newReturningBadge={newReturningBadge}
              dualVisitBadge={dualVisitBadge}
              userRole={userRole}
              isLeadershipView={isLeadershipView}
              onRemoveFromRegistration={removeFromRegistration}
              clinicResourceSettings={clinicResourceSettings}
              onSaveClinicResourceSetting={saveClinicResourceSetting}
            />
          )}

          {activeView === "undergrad-intake" && (userRole === "undergraduate" || isLeadershipView) && (
            <UndergradIntakeView
              onSave={handleUndergradStartEncounter}
              patients={patients}
              tonightSpecialtyNames={tonightSpecialtyNames}
            />
          )}


          {activeView === "lab-queue" && userRole === "lab" && (
            <LabQueueView
              labEncounterRows={labEncounterRows}
              selectedClinicDate={labQueueDate}
              setSelectedClinicDate={setLabQueueDate}
              openPatientChart={openPatientChart}
              getFullPatientName={getFullPatientName}
              onUpdateLabTracking={updateLabTracking}
            />
          )}

          {(activeView === "queue" || activeView === "pharmacy-queue") && (
            <QueueView
              queueMode={activeView === "pharmacy-queue" ? "pharmacy" : "general"}
              userRole={userRole}
              searchForm={searchForm}
              waitingEncounterRows={waitingEncounterRows}
              selectedClinicDate={queueClinicDate}
              setSelectedClinicDate={setQueueClinicDate}
              openPatientChart={openPatientChart}
              getPatientBoardName={getPatientBoardName}
              spanishBadge={spanishBadge}
              priorityBadge={priorityBadge}
              newReturningBadge={newReturningBadge}
              diabetesBadge={diabetesBadge}
              htnBadge={htnBadge}
              elevatorBadge={elevatorBadge}
              fluBadge={fluBadge}
              papBadge={papBadge}
              dualVisitBadge={dualVisitBadge}
              formatWaitTime={formatWaitTime}
              studentNameOptions={studentNameOptions}
              upperLevelNameOptions={upperLevelNameOptions}
              activeStudents={activeStudents}
              activeUpperLevels={activeUpperLevels}
              ROOM_OPTIONS={roomDropdownOptions}
              onAssignFromQueue={assignEncounterFromQueue}
              onMarkMedicationsReady={markMedicationsReady}
              onMarkPatientSentToPharmacy={markPatientSentToPharmacy}
              onClearPharmacyStatus={clearPharmacyStatus}
              onMarkMedicationsPickedUp={markMedicationsPickedUp}
              onMarkNoMedicationsPrescribed={markNoMedicationsPrescribed}
              onMarkSeenBySocialWork={markSeenBySocialWork}
              onCompleteSocialWorkNote={completePatientSocialWorkNote}
              refillRequests={refillRequests}
              canRefill={canRefill}
              patients={patients}
              activeAttendings={activeAttendings}
              onApproveRefillRequest={handleApproveRefillRequestWithPin}
              profileNameMap={profileNameMap}
              onApproveRefillAsSignedInAttending={handleApproveRefillRequestAsSignedInAttending}
              onDeleteRefillRequest={handleDeleteRefillRequest}
              programEntries={programEntries}
              specialtyAccess={currentSpecialtyAccess}
              papEntries={papEntries}

            />
          )}

          {activeView === "specialty-queue" && canAccessSpecialtyQueue && (
            <SpecialtyQueueView
              specialtyEncounterRows={
                userRole === "physical_therapy"
                  ? physicalTherapyEncounterRows
                  : specialtyEncounterRows
              }
              openPatientChart={openPatientChart}
              getFullPatientName={getFullPatientName}
              formatDate={formatDate}
              isLeadershipView={isLeadershipView}
              dualVisitBadge={dualVisitBadge}
              lockedSpecialty={userRole === "physical_therapy" ? "pt" : ""}
              selectedClinicDate={specialtyQueueDate}
              setSelectedClinicDate={setSpecialtyQueueDate}
            />
          )}

          {activeView === "board" && (
            <RoomBoard
              ROOM_OPTIONS={ROOM_OPTIONS}
              selectedClinicDate={boardClinicDate}
              setSelectedClinicDate={setRoomBoardDate}
              canOpenCharts={userRole !== "lab"}
              roomMap={roomMap}
              allEncounterRows={boardEncounterRows}
              assignedCount={assignedCount}
              inVisitCount={inVisitCount}
              getPatientBoardName={getPatientBoardName}
              getStudentBoardName={getStudentBoardName}
              spanishBadge={spanishBadge}
              priorityBadge={priorityBadge}
              newReturningBadge={newReturningBadge}
              elevatorBadge={elevatorBadge}
              diabetesBadge={diabetesBadge}
              htnBadge={htnBadge}
              fluBadge={fluBadge}
              papBadge={papBadge}
              getStatusClasses={getStatusClasses}
              assignEncounterToRoom={assignEncounterToRoom}
              selectedPatient={selectedPatient}
              selectedEncounter={selectedEncounter}
              openPatientChart={openPatientChart}
              isLeadershipView={canManageRooms}
              SPECIALTY_ROOM_RULES={specialtyRoomRulesForBoard}
              todayStaffRoster={todayStaffRoster}
              onTodayStaffRosterChange={setTodayStaffRoster}
              onTodayStaffRosterSave={handleSaveTodayStaffRoster}
              specialtyNames={boardSpecialtyNames}
              reservedRooms={boardReservedRooms}
              boardMessage={activeBoardMessage}
              savedBoardMessages={savedBoardMessages}
              onDisplayBoardMessage={handleDisplayBoardMessage}
              onClearBoardMessage={handleClearBoardMessage}
              onSaveBoardMessageTemplate={handleSaveBoardMessageTemplate}
              onDeleteBoardMessageTemplate={handleDeleteBoardMessageTemplate}
            />
          )}
          {activeView === "formulary" && (
            <FormularyView
              formulary={formulary}
              onAddMedication={addFormularyItem}
              onEditMedication={editFormularyItem}
              onDeleteMedication={removeFormularyItem}
              onToggleStock={toggleFormularyStock}
              onPrescribeMedication={prescribeFromFormulary}
              selectedPatient={selectedPatient}
              isLeadershipView={canModifyFormulary}
            />
          )}

          {activeView === "users" && isLeadershipView && (
            <UserManagementView
              profiles={filteredProfiles}
              signatureProfiles={profiles}
              loadingProfiles={loadingProfiles}
              savingProfileId={savingProfileId}
              onChangeRole={handleChangeProfileRole}
              onRefresh={() =>
                loadProfiles({ includeSignatures: true, showLoading: true })
              }
              currentUserId={session?.user?.id || null}
              message={profilesMessage}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              editingProfileNameId={editingProfileNameId}
              setEditingProfileNameId={setEditingProfileNameId}
              editingProfileNameValue={editingProfileNameValue}
              setEditingProfileNameValue={setEditingProfileNameValue}
              onSaveProfileName={handleSaveProfileName}
              showOnlyActiveToday={showOnlyActiveToday}
              setShowOnlyActiveToday={setShowOnlyActiveToday}
              onApproveUser={handleApproveUser}
              onDeleteUser={handleDeleteUser}
              onResetPassword={handleResetUserPassword}
              onManageSignature={openSignatureManager}
            />
          )}

          {activeView === "chart" && selectedPatient && (
            <ChartView
              key={`${selectedPatient.id}:${selectedEncounterId || ""}`}
              selectedPatient={selectedPatient}
              selectedEncounter={selectedEncounter}
              selectedEncounterId={selectedEncounterId}
              normalizeClinicDate={normalizeClinicDate}
              onBackToPatients={returnFromPatientChart}
              startNewEncounter={startNewEncounter}
              deleteEncounter={deleteEncounter}
              canStartEncounter={userRole === "leadership" || userRole === "undergraduate"}
              openEditIntake={openEditIntake}
              isLeadershipView={isLeadershipView}
              getFullPatientName={getFullPatientName}
              lastVisitLabel={lastVisitLabel}
              openPatientChart={openPatientChart}
              spanishBadge={spanishBadge}
              papBadge={papBadge}
              dualVisitBadge={dualVisitBadge}
              pharmacyStatusBadge={pharmacyStatusBadge}
              diabetesBadge={diabetesBadge}
              elevatorBadge={elevatorBadge}
              fluBadge={fluBadge}
              priorityBadge={priorityBadge}
              newReturningBadge={newReturningBadge}
              assignmentForm={assignmentForm}
              setAssignmentForm={setAssignmentForm}
              studentNameOptions={studentNameOptions}
              assignedStudentNames={assignedStudentNames}
              upperLevelNameOptions={upperLevelNameOptions}
              ROOM_OPTIONS={roomDropdownOptions}
              isPapRestricted={isPapRestricted}
              assignEncounter={assignEncounter}
              leadershipActionLocked={leadershipActionLocked}
              updateEncounterStatus={updateEncounterStatus}
              clearEncounterRoom={clearEncounterRoom}
              sortedMedications={sortedMedications}
              activeMedicationCount={activeMedicationCount}
              toggleMedicationActive={toggleMedicationActive}
              startEditMedication={startEditMedication}
              deleteMedication={deleteMedication}
              setEditingMedicationId={setEditingMedicationId}
              setNewMedication={setNewMedication}
              setShowMedicationModal={setShowMedicationModal}
              EMPTY_MEDICATION={EMPTY_MEDICATION}
              startEditAllergy={startEditAllergy}
              deleteAllergy={deleteAllergy}
              setShowAllergyModal={setShowAllergyModal}
              setEditingAllergyId={setEditingAllergyId}
              setNewAllergy={setNewAllergy}
              EMPTY_ALLERGY={EMPTY_ALLERGY}
              updatePatientField={updatePatientField}
              currentVitals={currentVitals}
              updateVitalsField={updateVitalsField}
              saveVitals={saveVitals}
              saveInHouseLabs={saveInHouseLabs}
              saveSendOutLabs={saveSendOutLabs}
              editingVitalsIndex={editingVitalsIndex}
              startEditVitals={startEditVitals}
              saveSoapNote={saveSoapNote}
              soapAutoSaveEnabled={true}
              updateEncounterField={updateEncounterField}
              saveEncounterField={saveEncounterField}
              formatDate={formatDate}
              soapStatus={selectedEncounter?.soapStatus || "draft"}
              canSignAsUpperLevel={canSignAsUpperLevel}
              canSignAsAttending={canSignAsAttending}
              canSignWithAttendingPin={canSignWithAttendingPin}
              signSoapAsUpperLevel={signSoapAsUpperLevel}
              signSoapAsAttending={signSoapAsAttending}
              canSubmitForUpperLevel={canSubmitForUpperLevel}
              canSubmitForAttending={canSubmitForAttending}
              submitSoapForUpperLevel={submitSoapForUpperLevel}
              submitSoapForAttending={submitSoapForAttending}
              soapBusy={soapBusy}
              soapUiMessage={soapUiMessage}
              formatRoleLabel={formatRoleLabel}
              canReopenSoap={canReopenSoap}
              reopenSoapNote={reopenSoapNote}
              auditEntries={auditEntries}
              auditLoading={auditLoading}
              soapAuthorName={soapAuthorName}
              upperLevelSignerName={upperLevelSignerName}
              attendingSignerName={attendingSignerName}
              activeStudents={activeStudents}
              activeUpperLevels={activeUpperLevels}
              activeAttendings={activeAttendings}
              signSoapAsAttendingWithPin={signSoapAsAttendingWithPin}
              soapDraft={soapDraft}
              updateSoapDraftField={updateSoapDraftField}
              openPatientEditModal={openPatientEditModal}
              canRefill={canRefill}
              currentUserId={session?.user?.id}
              onStartRefillRequest={startRefillRequest}
              refillRequests={refillRequests}
              profileNameMap={profileNameMap}
              setSkipUpperLevelApproval={setSkipUpperLevelApproval}
              onOpenStickyNotes={openStickyNotes}
              userRole={userRole}
              medicalSoapEnabled={medicalSoapEnabled}
              canCreatePhysicalTherapyNote={
                userRole === "physical_therapy" ||
                currentSpecialtyAccess.includes("Physical Therapy")
              }
              onStartGroupNote={startGroupNoteEncounter}
              onSaveGroupNote={saveGroupNote}
              onCompletePhysicalTherapyNote={completePhysicalTherapyNote}
              onSaveSocialWorkNote={savePatientSocialWorkNote}
              onCompleteSocialWorkNote={completePatientSocialWorkNote}
              attendingSignatureData={attendingSignatureData}
            />
          )}

          <ToastStack toasts={toasts} onDismiss={dismissToast} />

          {activeView === "summary" && isLeadershipView && (
            <ClinicSummaryView
              selectedClinicDate={summaryClinicDate}
              setSelectedClinicDate={setSummaryClinicDate}
              clinicSummary={clinicSummary}
              setClinicSummary={setClinicSummary}
              newPatientCount={newPatientCount}
              returningPatientCount={returningPatientCount}
              totalPatientCount={totalPatientCount}
              exportClinicSummaryToWord={exportClinicSummaryToWord}
              specialtyCounts={specialtyCounts}
              autoLwobsCount={autoLwobsCount}
              autoRefillPatientCount={autoRefillPatientCount}
              autoSocialWorkSeenCount={autoSocialWorkSeenCount}
              autoLabsCount={autoLabsCount}
              autoZoomCount={autoZoomCount}
              autoPhoneCount={autoPhoneCount}
              onRefreshSummary={refreshClinicSummaryData}
              summaryRefreshStatus={summaryRefreshStatus}
            />
          )}

          {activeView === "research" && canAccessResearch && (
            <ResearchView
              patients={patients}
              isResearchOwner={isResearchOwner}
              leadershipAccessEnabled={researchLeadershipAccess}
              onLeadershipAccessChange={handleResearchLeadershipAccessChange}
            />
          )}

          {canAccessPrograms && (
            <div className={activeView === "programs" ? "" : "hidden"}>
              <ProgramsView
                programEntries={programEntries}
                addProgramEntry={addProgramEntry}
                updateProgramEntry={updateProgramEntry}
                updateProgramEntryFields={updateProgramEntryFields}
                removeProgramEntry={removeProgramEntry}
                patients={patients}
                selectedClinicDate={selectedClinicDate}
                isLeadershipView={isLeadershipView}
                specialtyAccess={currentSpecialtyAccess}
                onProgramSettingsChange={setProgramSettings}
                isActive={activeView === "programs"}
                leadershipOptions={profiles
                  .filter((profile) => profile.role === "leadership")
                  .map((profile) => (profile.full_name || "").trim())
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))}
              />
            </div>
          )}

          {activeView === "pap" && isLeadershipView && (
            <PAPView
              papEntries={papEntries}
              addPapEntry={addPapEntry}
              updatePapEntry={updatePapEntry}
              removePapEntry={removePapEntry}
              patients={patients}
              leadershipOptions={profiles
                .filter((profile) => profile.role === "leadership")
                .map((profile) => (profile.full_name || "").trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))}
            />
          )}

        </div>
      </div>


      <MedicationModal
        showMedicationModal={showMedicationModal}
        selectedPatient={selectedPatient}
        editingMedicationId={editingMedicationId}
        newMedication={newMedication}
        setNewMedication={setNewMedication}
        setShowMedicationModal={(value) => {
          setShowMedicationModal(value);
          if (!value) {
            setIsRefillRequestMode(false);
            setRefillSourceMedicationId(null);
            setEditingMedicationId(null);
            setNewMedication(EMPTY_MEDICATION);
          }
        }}
        setEditingMedicationId={setEditingMedicationId}
        addOrUpdateMedication={isRefillRequestMode ? submitRefillRequestFromModal : addOrUpdateMedication}
        EMPTY_MEDICATION={EMPTY_MEDICATION}
        isRefillRequestMode={isRefillRequestMode}
      />
      <AllergyModal
        showAllergyModal={showAllergyModal}
        selectedPatient={selectedPatient}
        editingAllergyId={editingAllergyId}
        newAllergy={newAllergy}
        setNewAllergy={setNewAllergy}
        setShowAllergyModal={setShowAllergyModal}
        setEditingAllergyId={setEditingAllergyId}
        addOrUpdateAllergy={addOrUpdateAllergy}
        EMPTY_ALLERGY={EMPTY_ALLERGY}
      />

      <StickyNotesModal
        show={showStickyNotesModal}
        onClose={() => setShowStickyNotesModal(false)}
        currentUserId={session?.user?.id || null}
        patients={patients}
        initialPatientId={stickyNotesInitialPatientId}
        onOpenPatientChart={openPatientChart}
        profileNameMap={profileNameMap}
        userProfiles={profiles}
      />

      <IntakeModal
        showIntakeModal={showIntakeModal}
        setShowIntakeModal={setShowIntakeModal}
        intakeTab={intakeTab}
        setIntakeTab={setIntakeTab}
        intakeForm={intakeForm}
        updateIntakeField={updateIntakeField}
        submitPatient={submitPatient}
        isSubmittingIntake={isSubmittingIntake}
        isEditingIntake={isEditingIntake}
        intakeMatchPatientId={intakeMatchPatientId}
        intakeMatchedPatient={intakeMatchedPatient}
        autoFilledMatchPatientId={autoFilledMatchPatientId}
        applyMatchedPatientToIntake={applyMatchedPatientToIntake}
        clinicResourceSettings={clinicResourceSettings}
        programEntries={programEntries}
      />

      <UndergradRegistrationModal
        show={showUndergradRegistrationModal}
        form={undergradRegistrationForm}
        setForm={setUndergradRegistrationForm}
        onClose={() => {
          setShowUndergradRegistrationModal(false);
          setPendingUndergradRegistrationMerge(null);
          setRegistrationPatientId(null);
          setRegistrationEncounterId(null);
          setUndergradRegistrationForm(EMPTY_UNDERGRAD_REGISTRATION_FORM);
        }}
        onSubmit={saveUndergradRegistration}
        tonightSpecialtyNames={tonightSpecialtyNames}
      />

      <PatientMergeComparisonModal
        show={!!pendingUndergradRegistrationMerge}
        sourcePatient={pendingUndergradRegistrationSourcePatient}
        targetPatient={pendingUndergradRegistrationTargetPatient}
        intendedMrn={pendingUndergradRegistrationMerge?.intendedMrn || ""}
        getFullPatientName={getFullPatientName}
        sourceDescription="This registration visit will be moved from this temporary chart."
        targetDescription={`This existing chart keeps MRN ${pendingUndergradRegistrationTargetPatient?.mrn || pendingUndergradRegistrationMerge?.intendedMrn || ""}.`}
        mergeSummary="This moves the current registration visit and saved registration details into the existing MRN chart. The existing chart name, DOB, and MRN will be kept."
        actionLabel="Move Registration"
        onClose={() => setPendingUndergradRegistrationMerge(null)}
        onMerge={() => {
          if (!pendingUndergradRegistrationMerge) return;

          moveUndergradRegistrationToExistingMrnChart(
            pendingUndergradRegistrationMerge.sourcePatientId,
            pendingUndergradRegistrationMerge.targetPatientId
          );
        }}
      />

      <PatientMergeComparisonModal
        show={!!pendingPatientMerge}
        sourcePatient={pendingMergeSourcePatient}
        targetPatient={pendingMergeTargetPatient}
        intendedMrn={pendingPatientMerge?.intendedMrn || ""}
        getFullPatientName={getFullPatientName}
        onClose={() => setPendingPatientMerge(null)}
        onMerge={() => {
          if (!pendingPatientMerge) return;

          mergePatientRecordsByMrn(
            pendingPatientMerge.sourcePatientId,
            pendingPatientMerge.targetPatientId,
            {
              expectedMrn: pendingPatientMerge.intendedMrn,
              skipConfirm: true,
            }
          );
        }}
      />

      <WidePatientMergeReviewModal
        show={showWideMergeReview}
        candidates={wideMergeCandidates}
        getFullPatientName={getFullPatientName}
        onClose={() => setShowWideMergeReview(false)}
        onMerge={mergeReviewedPatientRecords}
      />

      {showPatientInfoEditModal && (dashboardSelectedPatient || selectedPatient) ? (
        <PatientInfoEditModal
          key={`${(dashboardSelectedPatient || selectedPatient).id}:${selectedEncounter?.id || ""}`}
          show={showPatientInfoEditModal}
          patient={dashboardSelectedPatient || selectedPatient}
          selectedEncounter={selectedEncounter}
          canEditUndergradFields={userRole === "undergraduate" || isLeadershipView}
          canEditAllPatientFields={isLeadershipView}
          canEditEncounterFields={userRole === "undergraduate" || isLeadershipView}
          onClose={() => setShowPatientInfoEditModal(false)}
          onSave={async (patientId, updates, encounterId, encounterUpdates) => {
            const saved = await saveDashboardPatientEdits(patientId, updates, encounterId, encounterUpdates);
            if (saved) {
              setShowPatientInfoEditModal(false);
            }
          }}
        />
      ) : null}

      {signatureProfile ? (
        <SignaturePadModal
          open
          profile={signatureProfile}
          saving={signatureSaving}
          onClose={() => setSignatureProfile(null)}
          onSave={handleSaveClinicalSignature}
        />
      ) : null}
    </div>
  );
}
