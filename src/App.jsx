import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { createPatientInSupabase, updatePatientInSupabase } from "./api/patients";
import {createEncounterInSupabase,updateEncounterInSupabase,createMedicationInSupabase,updateMedicationInSupabase,deleteMedicationInSupabase,} from "./api/encounters";
import { useAuthSession } from "./hooks/useAuthSession";
import { useClinicData } from "./hooks/useClinicData";
import {canStartIntake,canManageRoomBoard,canEditFormulary,canPrescribe,canChart,} from "./utils/permissions";
import { fetchProfiles, updateProfileRole, updateProfileDetails } from "./api/profiles";
import { createAuditLog, fetchAuditLogForEncounter } from "./api/audit";
import PatientSearch from "./components/PatientSearch";
import PatientTable from "./components/PatientTable";
import QueueView from "./components/QueueView";
import RoomBoard from "./components/RoomBoard";
import MedicationModal from "./components/MedicationModal";
import {createAllergyInSupabase,updateAllergyInSupabase,deleteAllergyInSupabase,} from "./api/allergies";
import AllergyModal from "./components/AllergyModal";
import IntakeModal from "./components/IntakeModal";
import ChartView from "./components/ChartView";
import BoardDisplay from "./components/BoardDisplay";
import FormularyView from "./components/FormularyView";
import AppSidebar from "./components/AppSidebar";
import UserManagementView from "./components/UserManagementView";
import AppHeader from "./components/AppHeader";
import DashboardView from "./components/DashboardView";
import {ROOM_OPTIONS,EMPTY_FORM,EMPTY_VITALS,EMPTY_MEDICATION,EMPTY_SEARCH,} from "./constants";
import {
  calculateAge,
  generateMrn,
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

} from "./utils";


function priorityBadge(encounter) {
  if (encounter.transportation === "Bus/Public Transport") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        Bus Priority
      </span>
    );
  }
  return null;
}

function spanishBadge(encounter) {
  if (encounter.spanishSpeaking) {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
        Spanish
      </span>
    );
  }
  return null;
}

function elevatorBadge(encounter) {
  if (encounter.needsElevator) {
    return (
      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
        Elevator
      </span>
    );
  }
  return null;
}

export default function App() {
  async function testSupabaseConnection() {
  
    const { data, error } = await supabase.from("patients").select("*");

    if (error) {
      console.error(error);
      alert("Error: " + error.message);
    } else {
      alert("Supabase connection works!");
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
  } = useAuthSession();
  
  const canOpenIntake = canStartIntake(userRole);
  const canManageRooms = canManageRoomBoard(userRole);
  const canModifyFormulary = canEditFormulary(userRole);
  const canPrescribeMeds = canPrescribe(userRole);
  const canChartInEncounter = canChart(userRole);
  
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
    return (
      role === "upper_level" &&
      (encounter.soapStatus === "draft" || !encounter.soapStatus)
    );
  }

  function canAttendingSignSoap(role, encounter) {
    if (role !== "attending") return false;
    return encounter?.soapStatus === "awaiting_attending";
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

  function getMissingSoapFields(encounter) {
    if (!encounter) return [];

    const missing = [];

    if (!(encounter.soapSubjective || "").trim()) missing.push("Subjective");
    if (!(encounter.soapObjective || "").trim()) missing.push("Objective");
    if (!(encounter.soapAssessment || "").trim()) missing.push("Assessment");
    if (!(encounter.soapPlan || "").trim()) missing.push("Plan");

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

  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeTab, setIntakeTab] = useState(0);
  const [intakeForm, setIntakeForm] = useState(EMPTY_FORM);
  const [searchForm, setSearchForm] = useState(EMPTY_SEARCH);
  const [debouncedSearchForm, setDebouncedSearchForm] = useState(EMPTY_SEARCH);
  const isBoardDisplayMode =
    new URLSearchParams(window.location.search).get("display") === "board";
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState(null);
  const { patients, setPatients } = useClinicData({authReady,session,userRole,selectedEncounterId,});
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
  const EMPTY_ALLERGY = {allergen: "",reaction: "",severity: "",notes: "",isActive: true,};

const [showAllergyModal, setShowAllergyModal] = useState(false);
const [newAllergy, setNewAllergy] = useState(EMPTY_ALLERGY);
const [editingAllergyId, setEditingAllergyId] = useState(null);
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [intakeMatchPatientId, setIntakeMatchPatientId] = useState(null);
  const [autoFilledMatchPatientId, setAutoFilledMatchPatientId] = useState(null);

  const [soapBusy, setSoapBusy] = useState(false);
  const [soapUiMessage, setSoapUiMessage] = useState("");
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);



  useEffect(() => {
    if (isEditingIntake || !showIntakeModal) {
      if (intakeMatchPatientId !== null) setIntakeMatchPatientId(null);
      return;
    }

    if (!intakeForm.firstName || !intakeForm.lastName || !intakeForm.dob) {
      if (intakeMatchPatientId !== null) setIntakeMatchPatientId(null);
      return;
    }

    const possibleMatch = findPotentialDuplicatePatient(
      intakeForm.firstName,
      intakeForm.lastName,
      intakeForm.dob,
      intakeForm.last4ssn,
      editingPatientId
    );

    const nextMatchId = possibleMatch ? possibleMatch.id : null;

    if (nextMatchId !== intakeMatchPatientId) {
      setIntakeMatchPatientId(nextMatchId);
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
  ]);
  
  useEffect(() => {
    if (activeView === "users" && isLeadershipView) {
      loadProfiles();
    }
  }, [activeView, isLeadershipView]);
  
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchForm(searchForm);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchForm]);

  useEffect(() => {
    if (!showIntakeModal || isEditingIntake || !intakeMatchPatientId) return;
    if (autoFilledMatchPatientId === intakeMatchPatientId) return;
    const matchedPatient = patients.find((p) => p.id === intakeMatchPatientId);
    if (!matchedPatient) return;

    setAutoFilledMatchPatientId(intakeMatchPatientId);

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
      over65:
        prev.over65 || (matchedPatient.age ? Number(matchedPatient.age) > 65 : false),
    }));
  }, [
    showIntakeModal,
    isEditingIntake,
    intakeMatchPatientId,
    autoFilledMatchPatientId,
    patients,
  ]);

  const [selectedClinicDate, setSelectedClinicDate] = useState("");
  const [, setNow] = useState(Date.now());
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;
  const selectedEncounter =
    selectedPatient?.encounters.find((e) => e.id === selectedEncounterId) || null;
  useEffect(() => {
    if (selectedEncounter?.id) {
      loadAuditLog();
    } else {
      setAuditEntries([]);
    }
  }, [selectedEncounter?.id]);

  const canSignAsUpperLevel = canUpperLevelSignSoap(userRole, selectedEncounter);
  const canSignAsAttending = canAttendingSignSoap(userRole, selectedEncounter);
  const canSubmitForUpperLevel = canSubmitSoapForUpperLevel(
    userRole,
    selectedEncounter
  );
  const canSubmitForAttending = canSubmitSoapForAttending(
    userRole,
    selectedEncounter
  );
  const canReopenSoap = userRole === "attending" && selectedEncounter?.soapStatus === "signed";
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);


  const sortedSelectedPatientEncounters = useMemo(() => {
    if (!selectedPatient) return [];

    return [...selectedPatient.encounters].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.clinicDate || 0).getTime();
      const bTime = new Date(b.createdAt || b.clinicDate || 0).getTime();
      return bTime - aTime;
    });
  }, [selectedPatient]);
  const patientRecordsTitle = selectedClinicDate
    ? `Patient Records — ${selectedClinicDate}`
    : "Patient Records — All Encounters";


  const allEncounterRows = useMemo(() => {
    const rows = [];
    patients.forEach((patient) => {
      patient.encounters.forEach((encounter) => {
        rows.push({
          patient,
          encounter,
        });
      });
    });
    return rows;
  }, [patients]);

  const visibleEncounterRows = useMemo(() => {
    if (!selectedClinicDate) {
      return allEncounterRows;
    }

    return allEncounterRows.filter(
      ({ encounter }) =>
        normalizeClinicDate(encounter.clinicDate) === selectedClinicDate
    );
  }, [allEncounterRows, selectedClinicDate]);


const filteredPatients = patients.filter((patient) => {
  const mrnMatch =
    !debouncedSearchForm.mrn ||
    (patient.mrn || "")
      .toLowerCase()
      .includes(debouncedSearchForm.mrn.toLowerCase());

  const firstNameMatch =
    !debouncedSearchForm.firstName ||
    (patient.firstName || "")
      .toLowerCase()
      .includes(debouncedSearchForm.firstName.toLowerCase());

  const lastNameMatch =
    !debouncedSearchForm.lastName ||
    (patient.lastName || "")
      .toLowerCase()
      .includes(debouncedSearchForm.lastName.toLowerCase());

  const dobMatch =
    !debouncedSearchForm.dob || patient.dob === debouncedSearchForm.dob;

  const ssnMatch =
    !debouncedSearchForm.last4ssn ||
    (patient.last4ssn || "").includes(debouncedSearchForm.last4ssn);

  return mrnMatch && firstNameMatch && lastNameMatch && dobMatch && ssnMatch;
});
  
  const visiblePatientIds = new Set(
    visibleEncounterRows.map(({ patient }) => patient.id)
  );

  const filteredVisiblePatients = filteredPatients.filter((patient) =>
    visiblePatientIds.has(patient.id)
  );
  const [formulary, setFormulary] = useState([
    {
      id: 1,
      name: "Acyclovir",
      strength: "400 mg",
      dosageForm: "tablet",
      use: "Antiviral",
      inStock: true,
      notes: "",
    },
    {
      id: 2,
      name: "Albuterol",
      strength: "90 mcg",
      dosageForm: "inhaler",
      use: "Bronchodilator",
      inStock: true,
      notes: "",
    },
    {
      id: 3,
      name: "Lisinopril",
      strength: "10 mg",
      dosageForm: "tablet",
      use: "Hypertension",
      inStock: true,
      notes: "",
    },
    {
      id: 4,
      name: "Metformin",
      strength: "500 mg",
      dosageForm: "tablet",
      use: "Diabetes",
      inStock: true,
      notes: "",
    },
    {
      id: 5,
      name: "Triamcinolone",
      strength: "0.1%",
      dosageForm: "cream",
      use: "Dermatologic",
      inStock: false,
      notes: "Awaiting restock",
    },
  ]);

  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState(null);
  const [profilesMessage, setProfilesMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
const [editingProfileNameId, setEditingProfileNameId] = useState(null);
const [editingProfileNameValue, setEditingProfileNameValue] = useState("");
const [showOnlyActiveToday, setShowOnlyActiveToday] = useState(false);


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
    const id = (profile.id || "").toLowerCase();

    return (
      fullName.includes(query) ||
      role.includes(query) ||
      classification.includes(query) ||
      id.includes(query)
    );
  });
}, [profiles, userSearch, showOnlyActiveToday]);

  useEffect(() => {
  if (session && profiles.length === 0) {
    loadProfiles();
  }
}, [session, profiles.length]);

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

  

  const filteredEncounterRows = visibleEncounterRows.filter(({ patient }) =>
    filteredPatients.some((p) => p.id === patient.id)
  );

  const waitingEncounterRows = filteredEncounterRows
    .filter(({ encounter }) => encounter.status === "Waiting")
    .sort((a, b) => {
      const aBus = a.encounter.transportation === "Bus/Public Transport" ? 0 : 1;
      const bBus = b.encounter.transportation === "Bus/Public Transport" ? 0 : 1;
      if (aBus !== bBus) return aBus - bBus;
      return new Date(a.encounter.createdAt) - new Date(b.encounter.createdAt);
    });

  const assignedCount = filteredEncounterRows.filter(
    ({ encounter }) => encounter.status === "Assigned"
  ).length;

  const inVisitCount = filteredEncounterRows.filter(
    ({ encounter }) => encounter.status === "In Visit"
  ).length;
 

  const roomMap = useMemo(() => {
    const map = {};
    ROOM_OPTIONS.forEach((room) => {
      map[room.number] = null;
    });

    visibleEncounterRows.forEach(({ patient, encounter }) => {
      if (
        encounter.roomNumber &&
        encounter.status !== "Completed"
      ) {
        map[Number(encounter.roomNumber)] = { patient, encounter };
      }
    });

    return map;
  }, [visibleEncounterRows]);
  function normalizeForDuplicateCheck(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[.,]/g, "")
      .replace(/-/g, " ")      // <-- add this
      .replace(/\s+/g, " ");
  }

  function findPotentialDuplicatePatient(firstName, lastName, dob, last4ssn, excludePatientId = null) {
    return patients.find((patient) => {
      if (excludePatientId && patient.id === excludePatientId) return false;

      const sameDob =
        normalizeForDuplicateCheck(patient.dob) === normalizeForDuplicateCheck(dob);

      const sameFirst =
        normalizeForDuplicateCheck(patient.firstName) === normalizeForDuplicateCheck(firstName);

      const sameLast =
        normalizeForDuplicateCheck(patient.lastName) === normalizeForDuplicateCheck(lastName);

      const inputLast4 = normalizeForDuplicateCheck(last4ssn);
      const patientLast4 = normalizeForDuplicateCheck(patient.last4ssn);

      const hasLast4OnBoth = inputLast4 && patientLast4;
      const sameLast4 = hasLast4OnBoth ? inputLast4 === patientLast4 : true;

      return sameDob && sameFirst && sameLast && sameLast4;
    });
  }
  function mrnExists(mrn, excludePatientId = null) {
    const normalizedMrn = String(mrn || "").trim().toLowerCase();
    if (!normalizedMrn) return false;

    return patients.some((patient) => {
      if (excludePatientId && patient.id === excludePatientId) return false;
      return String(patient.mrn || "").trim().toLowerCase() === normalizedMrn;
    });
  }
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

  async function loadProfiles() {
    try {
      setLoadingProfiles(true);
      setProfilesMessage("");
      const data = await fetchProfiles();
      setProfiles(data);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfilesMessage(`Failed to load users: ${error.message}`);
    } finally {
      setLoadingProfiles(false);
    }
    
  }

 const activeTodayProfiles = useMemo(() => {
  return profiles.filter((profile) => isToday(profile.last_seen_at));
}, [profiles]);

const activeStudents = useMemo(() => {
  return activeTodayProfiles.filter((profile) => profile.role === "student");
}, [activeTodayProfiles]);

const studentNameOptions = useMemo(() => {
  const activeNames = activeStudents
    .map((profile) => (profile.full_name || "").trim())
    .filter(Boolean);

  const inactiveNames = profiles
    .filter(
      (profile) =>
        profile.role === "student" &&
        !activeStudents.some((active) => active.id === profile.id)
    )
    .map((profile) => (profile.full_name || "").trim())
    .filter(Boolean);

  return [...activeNames.sort((a, b) => a.localeCompare(b)), ...inactiveNames.sort((a, b) => a.localeCompare(b))];
}, [profiles, activeStudents]);

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

async function handleChangeProfileRole(profileId, nextRole, nextClassification = null) {
  if (!isLeadershipView) return;

  const currentUserId = session?.user?.id;

  const currentProfile = profiles.find((profile) => profile.id === profileId);
  const effectiveRole = nextRole ?? currentProfile?.role ?? "student";
  const effectiveClassification =
    nextClassification !== null ? nextClassification : currentProfile?.classification ?? null;

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
          }
        : profile
    )
  );

  try {
    setSavingProfileId(profileId);
    setProfilesMessage("");
    await updateProfileRole(profileId, effectiveRole, effectiveClassification);
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

  function openEditIntake() {
    if (!selectedPatient || !selectedEncounter) return;

    setIntakeForm({
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
      newReturning: selectedEncounter.newReturning || "",
      ttuStudent: selectedPatient.ttuStudent || false,
      visitLocation: selectedEncounter.visitLocation || "",
      chiefComplaint: selectedEncounter.chiefComplaint || "",
      notes: selectedEncounter.notes || "",
      transportation: selectedEncounter.transportation || "",
      needsElevator: selectedEncounter.needsElevator || false,
      spanishSpeaking: selectedEncounter.spanishSpeaking || false,
      over65: selectedPatient.age ? Number(selectedPatient.age) > 65 : false,
      mammogramPapSmear: selectedEncounter.mammogramPapSmear || "",
      fluShot: selectedEncounter.fluShot || "",
      htn: selectedEncounter.htn || false,
      dm: selectedEncounter.dm || false,
      labsLast6Months: selectedEncounter.labsLast6Months || "",
      tobaccoScreening: selectedEncounter.tobaccoScreening || "",
      dermatology: selectedEncounter.dermatology || "N/A",
      ophthalmology: selectedEncounter.ophthalmology || "N/A",
      optometry: selectedEncounter.optometry || "N/A",
      diabeticEyeExamPastYear: selectedEncounter.diabeticEyeExamPastYear || "N/A",
      physicalTherapy: selectedEncounter.physicalTherapy || "N/A",
      mentalHealthCombined: selectedEncounter.mentalHealthCombined || "N/A",
      counseling: selectedEncounter.counseling || "N/A",
      anyMentalHealthPositive: selectedEncounter.anyMentalHealthPositive || false,
    });

    setEditingPatientId(selectedPatient.id);
    setIsEditingIntake(true);
    setIntakeTab(0);
    setShowIntakeModal(true);
  }
  async function submitPatient() {
    if (!intakeForm.firstName || !intakeForm.lastName || !intakeForm.dob || !intakeForm.chiefComplaint) {
      return;
    }
    if (intakeForm.mrn.trim() && mrnExists(intakeForm.mrn, editingPatientId)) {
      window.alert("That MRN is already being used by another patient. Please use a different MRN.");
      return;
    }
    const potentialDuplicate = findPotentialDuplicatePatient(
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
    if (isEditingIntake && selectedPatient && selectedEncounter) {
      try {
        console.log("editingPatientId:", editingPatientId);
        console.log("selectedEncounterId:", selectedEncounter.id);

        const savedPatient = await updatePatientInSupabase(editingPatientId, {
          firstName: intakeForm.firstName,
          lastName: intakeForm.lastName,
          preferredName: intakeForm.preferredName,
          dob: intakeForm.dob,
          mrn: intakeForm.mrn.trim() || selectedPatient.mrn,
          last4ssn: intakeForm.last4ssn,
          phone: intakeForm.phone,
          pronouns: intakeForm.pronouns,
          ethnicity: intakeForm.ethnicity,
          sex: intakeForm.sex,
          ttuStudent: intakeForm.ttuStudent,
        });

        console.log("savedPatient update worked:", savedPatient);

        const savedEncounter = await updateEncounterInSupabase(selectedEncounter.id, {
          chiefComplaint: intakeForm.chiefComplaint,
          notes: intakeForm.notes,
          newReturning: intakeForm.newReturning,
          visitLocation: intakeForm.visitLocation,
          transportation: intakeForm.transportation,
          needsElevator: intakeForm.needsElevator,
          spanishSpeaking: intakeForm.spanishSpeaking,
          mammogramPapSmear: intakeForm.mammogramPapSmear,
          fluShot: intakeForm.fluShot,
          htn: intakeForm.htn,
          dm: intakeForm.dm,
          labsLast6Months: intakeForm.labsLast6Months,
          tobaccoScreening: intakeForm.tobaccoScreening,
          dermatology: intakeForm.dermatology,
          ophthalmology: intakeForm.ophthalmology,
          optometry: intakeForm.optometry,
          diabeticEyeExamPastYear: intakeForm.diabeticEyeExamPastYear,
          physicalTherapy: intakeForm.physicalTherapy,
          mentalHealthCombined: intakeForm.mentalHealthCombined,
          counseling: intakeForm.counseling,
          anyMentalHealthPositive: intakeForm.anyMentalHealthPositive,
        });

        console.log("savedEncounter update worked:", savedEncounter);

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === editingPatientId
              ? {
                ...patient,
                ...savedPatient,
                preferredName: intakeForm.preferredName,
                last4ssn: intakeForm.last4ssn,
                age: intakeForm.age,
                phone: intakeForm.phone,
                sex: intakeForm.sex,
                ethnicity: intakeForm.ethnicity,
                pronouns: intakeForm.pronouns,
                ttuStudent: intakeForm.ttuStudent,
                encounters: patient.encounters.map((encounter) =>
                  encounter.id === selectedEncounter.id
                    ? {
                      ...encounter,
                      newReturning: intakeForm.newReturning,
                      visitLocation: intakeForm.visitLocation,
                      chiefComplaint: intakeForm.chiefComplaint,
                      notes: intakeForm.notes,
                      transportation: intakeForm.transportation,
                      needsElevator: intakeForm.needsElevator,
                      spanishSpeaking: intakeForm.spanishSpeaking,
                      mammogramPapSmear: intakeForm.mammogramPapSmear,
                      fluShot: intakeForm.fluShot,
                      htn: intakeForm.htn,
                      dm: intakeForm.dm,
                      labsLast6Months: intakeForm.labsLast6Months,
                      tobaccoScreening: intakeForm.tobaccoScreening,
                      dermatology: intakeForm.dermatology,
                      ophthalmology: intakeForm.ophthalmology,
                      optometry: intakeForm.optometry,
                      diabeticEyeExamPastYear: intakeForm.diabeticEyeExamPastYear,
                      physicalTherapy: intakeForm.physicalTherapy,
                      mentalHealthCombined: intakeForm.mentalHealthCombined,
                      counseling: intakeForm.counseling,
                      anyMentalHealthPositive: intakeForm.anyMentalHealthPositive,
                    }
                    : encounter
                ),
              }
              : patient
          )
        );

        setShowIntakeModal(false);
        setIntakeTab(0);
        setIntakeMatchPatientId(null);
        setAutoFilledMatchPatientId(null);
        setIsEditingIntake(false);
        setEditingPatientId(null);
        setActiveView("chart");
        return;
      } catch (error) {
        console.error("Failed to update intake in Supabase:", error);
        window.alert(`Supabase save error: ${error.message}`);
        return;
      }
    }

    const baseEncounter = createEncounterFromIntake(intakeForm);

    const encounter = {
      ...baseEncounter,
      status: "Waiting",
      clinicDate: normalizeClinicDate(baseEncounter.clinicDate) || formatClinicDate(),
      createdAt: baseEncounter.createdAt || new Date().toISOString(),
    };

    if (potentialDuplicate) {
      try {
        const savedEncounter = await createEncounterInSupabase(
          potentialDuplicate.id,
          encounter
        );

        const hydratedEncounter = {
          ...encounter,
          id: savedEncounter.id,
          clinicDate: savedEncounter.clinic_date || encounter.clinicDate,
          createdAt: savedEncounter.created_at || encounter.createdAt,
          chiefComplaint:
            savedEncounter.chief_complaint || encounter.chiefComplaint || "",
          status:
            savedEncounter.status === "waiting"
              ? "Waiting"
              : savedEncounter.status === "roomed"
                ? "Assigned"
                : savedEncounter.status === "in_visit"
                  ? "In Visit"
                  : savedEncounter.status === "done"
                    ? "Completed"
                    : savedEncounter.status === "cancelled"
                      ? "Cancelled"
                      : "Waiting",
          roomNumber: savedEncounter.room || encounter.roomNumber || "",
        };

        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === potentialDuplicate.id
              ? {
                ...patient,
                mrn: patient.mrn || intakeForm.mrn.trim() || generateMrn(),
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
                encounters: [hydratedEncounter, ...(patient.encounters || [])],
              }
              : patient
          )
        );

        setSelectedPatientId(potentialDuplicate.id);
        setSelectedEncounterId(savedEncounter.id);
      } catch (error) {
        console.error("Failed to create duplicate-patient encounter:", error);
        window.alert(`Supabase save error: ${error.message}`);
        return;
      }
    } else {
      try {
        const patientToSave = {
          ...intakeForm,
          mrn: intakeForm.mrn.trim() || generateMrn(),
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
            {
              ...encounter,
              id: savedEncounter.id,
              clinicDate: savedEncounter.clinic_date || encounter.clinicDate,
              createdAt: savedEncounter.created_at || encounter.createdAt,
              chiefComplaint: savedEncounter.chief_complaint || encounter.chiefComplaint,
              status:
                savedEncounter.status === "waiting"
                  ? "Waiting"
                  : savedEncounter.status === "roomed"
                    ? "Assigned"
                    : savedEncounter.status === "in_visit"
                      ? "In Visit"
                      : savedEncounter.status === "done"
                        ? "Completed"
                        : savedEncounter.status === "cancelled"
                          ? "Cancelled"
                          : encounter.status,
              roomNumber: savedEncounter.room || encounter.roomNumber || "",
            },
          ],
        };

        setPatients((prev) => [hydratedPatient, ...prev]);
        setSelectedPatientId(hydratedPatient.id);
        setSelectedEncounterId(savedEncounter.id);
      } catch (error) {
        console.error("Supabase save error:", error);
        window.alert(`Supabase save error: ${error.message}`);
        return;
      }
    }
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
    const matchingRows = visibleEncounterRows.filter(
      ({ patient }) => patient.id === patientId
    );

    if (matchingRows.length > 0) {
      openPatientChart(patientId, matchingRows[0].encounter.id);
      return;
    }

    openPatientChart(patientId);
  }

  function openPatientChart(patientId, encounterId = null) {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

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
  async function startNewEncounter() {
    if (!selectedPatient) return;

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
      mammogramPapSmear: "",
      fluShot: "",
      htn: false,
      dm: false,
      labsLast6Months: "",
      tobaccoScreening: "",
      dermatology: "N/A",
      ophthalmology: "N/A",
      optometry: "N/A",
      diabeticEyeExamPastYear: "N/A",
      physicalTherapy: "N/A",
      mentalHealthCombined: "N/A",
      counseling: "N/A",
      anyMentalHealthPositive: false,
      status: "Waiting",
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
        status:
          savedEncounter.status === "waiting"
            ? "Waiting"
            : savedEncounter.status === "roomed"
              ? "Assigned"
              : savedEncounter.status === "in_visit"
                ? "In Visit"
                : savedEncounter.status === "done"
                  ? "Completed"
                  : savedEncounter.status === "cancelled"
                    ? "Cancelled"
                    : "Waiting",
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

  async function assignEncounter() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedPatient || !selectedEncounter) return;
    if (!assignmentForm.studentName || !assignmentForm.roomNumber) return;

    lockLeadershipActions();

    const roomNumber = Number(assignmentForm.roomNumber);

    if (isPapRestricted(selectedEncounter) && (roomNumber === 9 || roomNumber === 10)) {
      alert("Pap smear patients cannot be assigned to Room 9 or Room 10.");
      return;
    }

    const takenByOtherEncounter = allEncounterRows.some(
      ({ patient, encounter }) =>
        patient.id !== selectedPatient.id &&
        encounter.id !== selectedEncounter.id &&
        Number(encounter.roomNumber) === roomNumber &&
        encounter.status !== "Completed"
    );

    if (takenByOtherEncounter) {
      alert("That room is already in use.");
      return;
    }

    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        roomNumber: String(roomNumber),
        status: "Assigned",
        assignedStudent: assignmentForm.studentName,
        assignedUpperLevel: assignmentForm.upperLevelName,
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
                    assignedStudent: assignmentForm.studentName,
                    assignedUpperLevel: assignmentForm.upperLevelName,
                    roomNumber: String(roomNumber),
                    status: "Assigned",
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to assign encounter:", error);
      alert(`Failed to assign room: ${error.message}`);
    }
  }
  async function assignEncounterToRoom(roomNumber) {
    if (!canManageRooms) return;
    if (!selectedPatient || !selectedEncounter) {
      alert("Open a patient chart first before assigning a room.");
      return;
    }

    const numericRoom = Number(roomNumber);

    if (isPapRestricted(selectedEncounter) && (numericRoom === 9 || numericRoom === 10)) {
      alert("Pap smear patients cannot be assigned to Room 9 or Room 10.");
      return;
    }

    const takenByOtherEncounter = allEncounterRows.some(
      ({ patient, encounter }) =>
        patient.id !== selectedPatient.id &&
        encounter.id !== selectedEncounter.id &&
        Number(encounter.roomNumber) === numericRoom &&
        encounter.status !== "Completed"
    );

    if (takenByOtherEncounter) {
      alert("That room is already in use.");
      return;
    }

    setAssignmentForm((prev) => ({
      ...prev,
      roomNumber: String(numericRoom),
    }));
    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        roomNumber: String(numericRoom),
        status: "Assigned",
        assignedStudent:
          assignmentForm.studentName || selectedEncounter.assignedStudent || "",
        assignedUpperLevel:
          assignmentForm.upperLevelName || selectedEncounter.assignedUpperLevel || "",
      });
    } catch (error) {
      console.error("Failed to assign encounter to room:", error);
      alert(`Failed to assign room: ${error.message}`);
      return;
    }
    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? {
                  ...encounter,
                  roomNumber: String(numericRoom),
                  assignedStudent:
                    assignmentForm.studentName || encounter.assignedStudent || "",
                  assignedUpperLevel:
                    assignmentForm.upperLevelName || encounter.assignedUpperLevel || "",
                  status: "Assigned",
                }
                : encounter
            ),
          }
          : patient
      )
    );

    alert(`Assigned ${getFullPatientName(selectedPatient)} to room ${numericRoom}.`);
  }
  async function updateEncounterStatus(status) {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedEncounter) return;

    lockLeadershipActions();

    try {
      await updateEncounterInSupabase(selectedEncounter.id, { status });
      updateEncounterField("status", status);
    } catch (error) {
      console.error("Failed to update encounter status:", error);
      alert(`Failed to update status: ${error.message}`);
    }
  }
  async function clearEncounterRoom() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    lockLeadershipActions();
    if (!selectedPatient || !selectedEncounter) return;
    try {
      await updateEncounterInSupabase(selectedEncounter.id, {
        roomNumber: "",
        status: "Waiting",
      });
    } catch (error) {
      console.error("Failed to clear encounter room:", error);
      alert(`Failed to clear room: ${error.message}`);
      return;
    }

    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? {
                  ...encounter,
                  roomNumber: "",
                  assignedStudent: "",
                  assignedUpperLevel: "",
                  status: "Waiting",
                }
                : encounter
            ),
          }
          : patient
      )
    );

    setAssignmentForm((prev) => ({
      ...prev,
      roomNumber: "",
      studentName: "",
      upperLevelName: "",
    }));
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
  function prescribeFromFormulary(item) {
    if (!canPrescribeMeds) return;
    if (!selectedPatient) {
      alert("Open a patient chart first before prescribing.");
      return;
    }

    setNewMedication({
      name: item.name || "",
      dosage: item.strength || "",
      frequency: "",
      route: item.dosageForm || "",
      isActive: true,
    });

    setEditingMedicationId(null);
    setShowMedicationModal(true);
    setActiveView("chart");
  }
  async function addOrUpdateMedication() {
    if (!selectedPatient || !selectedEncounter) return;
    if (!newMedication.name.trim()) return;

    if (editingMedicationId !== null) {
      const previousMedications = selectedEncounter.medications || [];

      const optimisticMedications = previousMedications.map((med) =>
        med.id === editingMedicationId
          ? { ...med, ...newMedication, id: editingMedicationId }
          : med
      );

      setPatients((prev) =>
        prev.map((patient) => {
          if (patient.id !== selectedPatient.id) return patient;

          return {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? {
                  ...encounter,
                  medications: optimisticMedications,
                }
                : encounter
            ),
          };
        })
      );

      setNewMedication(EMPTY_MEDICATION);
      setEditingMedicationId(null);
      setShowMedicationModal(false);

      try {
        await updateMedicationInSupabase(editingMedicationId, newMedication);
      } catch (error) {
        console.error("Failed to save medication:", error);
        alert(`Failed to save medication: ${error.message}`);

        setPatients((prev) =>
          prev.map((patient) => {
            if (patient.id !== selectedPatient.id) return patient;

            return {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    medications: previousMedications,
                  }
                  : encounter
              ),
            };
          })
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
      isActive: newMedication.isActive ?? true,
    };

    setPatients((prev) =>
      prev.map((patient) => {
        if (patient.id !== selectedPatient.id) return patient;

        return {
          ...patient,
          encounters: patient.encounters.map((encounter) =>
            encounter.id === selectedEncounter.id
              ? {
                ...encounter,
                medications: [
                  ...(encounter.medications || []),
                  optimisticMedication,
                ],
              }
              : encounter
          ),
        };
      })
    );

    setNewMedication(EMPTY_MEDICATION);
    setEditingMedicationId(null);
    setShowMedicationModal(false);

    try {
      const savedMedication = await createMedicationInSupabase(
        selectedEncounter.id,
        newMedication
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
        prev.map((patient) => {
          if (patient.id !== selectedPatient.id) return patient;

          return {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? {
                  ...encounter,
                  medications: (encounter.medications || []).map((med) =>
                    med.id === tempMedicationId ? hydratedMedication : med
                  ),
                }
                : encounter
            ),
          };
        })
      );
    } catch (error) {
      console.error("Failed to save medication:", error);
      alert(`Failed to save medication: ${error.message}`);

      setPatients((prev) =>
        prev.map((patient) => {
          if (patient.id !== selectedPatient.id) return patient;

          return {
            ...patient,
            encounters: patient.encounters.map((encounter) =>
              encounter.id === selectedEncounter.id
                ? {
                  ...encounter,
                  medications: (encounter.medications || []).filter(
                    (med) => med.id !== tempMedicationId
                  ),
                }
                : encounter
            ),
          };
        })
      );
    }
  }

  function startEditMedication(med) {
    setNewMedication({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      route: med.route || "",
      isActive: med.isActive,
    });
    setEditingMedicationId(med.id);
    setShowMedicationModal(true);
  }

  async function toggleMedicationActive(medicationId) {
    if (!selectedPatient || !selectedEncounter) return;

    const existingMedication = (selectedEncounter.medications || []).find(
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
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    medications: (encounter.medications || []).map((med) =>
                      med.id === medicationId
                        ? { ...med, isActive: nextIsActive }
                        : med
                    ),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to toggle medication:", error);
      alert(`Failed to update medication: ${error.message}`);
    }
  }

  async function deleteMedication(medicationId) {
    if (!selectedPatient || !selectedEncounter) return;

    const confirmed = window.confirm("Delete this medication?");
    if (!confirmed) return;

    try {
      const previousMedications = selectedEncounter.medications || [];

      // 🔥 optimistic update FIRST
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === selectedPatient.id
            ? {
              ...patient,
              encounters: patient.encounters.map((encounter) =>
                encounter.id === selectedEncounter.id
                  ? {
                    ...encounter,
                    medications: previousMedications.filter(
                      (med) => med.id !== medicationId
                    ),
                  }
                  : encounter
              ),
            }
            : patient
        )
      );

      try {
        await deleteMedicationInSupabase(medicationId);
      } catch (error) {
        console.error("Failed to delete medication:", error);
        alert(`Failed to delete medication: ${error.message}`);

        // 🔁 rollback if failure
        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? {
                ...patient,
                encounters: patient.encounters.map((encounter) =>
                  encounter.id === selectedEncounter.id
                    ? {
                      ...encounter,
                      medications: previousMedications,
                    }
                    : encounter
                ),
              }
              : patient
          )
        );
      }
    } catch (error) {
      console.error("Failed to delete medication:", error);
      alert(`Failed to delete medication: ${error.message}`);
    }
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
      alert(`Failed to update allergy: ${error.message}`);
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
      alert(`Failed to create allergy: ${error.message}`);
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
    alert(`Failed to delete allergy: ${error.message}`);
  }
}

async function saveSoapNote(showConfirmation = true) {
  if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;

  const authorId = selectedEncounter.soapAuthorId || session.user.id;
  const authorRole = selectedEncounter.soapAuthorRole || userRole;
  const currentSoapStatus = selectedEncounter.soapStatus || "draft";

  try {
    setSoapBusy(true);

    if (showConfirmation) {
      setSoapUiMessage("Saving...");
    }

    await updateEncounterInSupabase(selectedEncounter.id, {
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      soapAuthorId: authorId,
      soapAuthorRole: authorRole,
      soapStatus: currentSoapStatus,
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
                      soapAuthorId: authorId,
                      soapAuthorRole: authorRole,
                      soapStatus: currentSoapStatus,
                      soapSavedAt: new Date().toLocaleString(),
                    }
                  : encounter
              ),
            }
          : patient
      )
    );

    if (showConfirmation) {
  await logAuditEvent("soap_saved", {
    soapStatus: currentSoapStatus,
  });
  await loadAuditLog();
}

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

async function submitSoapForUpperLevel() {
  if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;

  const missingFields = getMissingSoapFields(selectedEncounter);
  if (missingFields.length > 0) {
    showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
    return;
  }

  const authorId = selectedEncounter.soapAuthorId || session.user.id;
  const authorRole = selectedEncounter.soapAuthorRole || userRole;

  try {
    setSoapBusy(true);
    setSoapUiMessage("Saving...");

    await updateEncounterInSupabase(selectedEncounter.id, {
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      soapAuthorId: authorId,
      soapAuthorRole: authorRole,
      soapStatus: "awaiting_upper",
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

  const missingFields = getMissingSoapFields(selectedEncounter);
  if (missingFields.length > 0) {
    showSoapMessage(`Complete before submitting: ${missingFields.join(", ")}`);
    return;
  }

  const authorId = selectedEncounter.soapAuthorId || session.user.id;
  const authorRole = selectedEncounter.soapAuthorRole || userRole;

  try {
    setSoapBusy(true);
    setSoapUiMessage("Saving...");

    await updateEncounterInSupabase(selectedEncounter.id, {
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      soapAuthorId: authorId,
      soapAuthorRole: authorRole,
      soapStatus: "awaiting_attending",
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

  const missingFields = getMissingSoapFields(selectedEncounter);
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

    await updateEncounterInSupabase(selectedEncounter.id, {
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      soapAuthorId: authorId,
      soapAuthorRole: authorRole,
      upperLevelSignedBy: session.user.id,
      upperLevelSignedAt: signedAt,
      soapStatus: "awaiting_attending",
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
                      soapAuthorId: authorId,
                      soapAuthorRole: authorRole,
                      upperLevelSignedBy: session.user.id,
                      upperLevelSignedAt: signedAt,
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
    await loadAuditLog();
    showSoapMessage("SOAP note signed by upper-level reviewer.");
  } catch (error) {
    console.error("Failed to sign SOAP as upper-level:", error);
    showSoapMessage(`Failed to sign SOAP: ${error.message}`);
  } finally {
    setSoapBusy(false);
  }
}

async function signSoapAsAttending() {
  if (!selectedPatient || !selectedEncounter || !session?.user?.id || !userRole) return;
  if (!canSignAsAttending) return;

  const missingFields = getMissingSoapFields(selectedEncounter);
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

    await updateEncounterInSupabase(selectedEncounter.id, {
      soapSubjective: selectedEncounter.soapSubjective || "",
      soapObjective: selectedEncounter.soapObjective || "",
      soapAssessment: selectedEncounter.soapAssessment || "",
      soapPlan: selectedEncounter.soapPlan || "",
      notes: selectedEncounter.notes || "",
      soapAuthorId: authorId,
      soapAuthorRole: authorRole,
      attendingSignedBy: session.user.id,
      attendingSignedAt: signedAt,
      soapStatus: "signed",
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
                      soapAuthorId: authorId,
                      soapAuthorRole: authorRole,
                      attendingSignedBy: session.user.id,
                      attendingSignedAt: signedAt,
                      soapStatus: "signed",
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
  } catch (error) {
    console.error("Failed to sign SOAP as attending:", error);
    showSoapMessage(`Failed to sign SOAP: ${error.message}`);
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

    await updateEncounterInSupabase(selectedEncounter.id, {
      attendingSignedBy: null,
      attendingSignedAt: null,
      soapStatus: "awaiting_attending",
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
                      attendingSignedBy: null,
                      attendingSignedAt: null,
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

  function endClinicReset() {
    const confirmed = window.confirm(
      "End clinic and mark all active encounters as completed? This will clear room assignments and return you to the dashboard."
    );

    if (!confirmed) return;
    const activeStatuses = new Set(["Waiting", "Assigned", "In Visit"]);

    setPatients((prevPatients) =>
      prevPatients.map((patient) => ({
        ...patient,
        encounters: patient.encounters.map((encounter) => {
          if (!activeStatuses.has(encounter.status)) {
            return encounter;
          }

          return {
            ...encounter,
            status: "Completed",
            assignedStudent: "",
            assignedUpperLevel: "",
            roomNumber: "",
          };
        }),
      }))
    );

    setSelectedPatientId(null);
    setSelectedEncounterId(null);
    setAssignmentForm({
      studentName: "",
      upperLevelName: "",
      roomNumber: "",
    });
    setSelectedClinicDate("");
    setActiveView("dashboard");
  }
  const sortedMedications = selectedEncounter
    ? [...(selectedEncounter.medications || [])].sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    })
    : [];
  const activeMedicationCount = selectedEncounter
    ? (selectedEncounter.medications || []).filter((med) => med.isActive).length
    : 0;

  const lastVisitLabel =
    selectedPatient && sortedSelectedPatientEncounters.length > 1
      ? formatDate(
        normalizeClinicDate(sortedSelectedPatientEncounters[1]?.clinicDate) ||
        sortedSelectedPatientEncounters[1]?.clinicDate
      )
      : "No prior visit";
  if (isBoardDisplayMode) {
    return (
      <BoardDisplay
        ROOM_OPTIONS={ROOM_OPTIONS}
        roomMap={roomMap}
        getPatientBoardName={getPatientBoardName}
        getStudentBoardName={getStudentBoardName}
        spanishBadge={spanishBadge}
        priorityBadge={priorityBadge}
        elevatorBadge={elevatorBadge}
        getStatusClasses={getStatusClasses}
      />
    );
  }
  return (
    <div className="min-h-screen bg-slate-100 md:flex md:h-screen">
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
        isLeadershipView={canOpenIntake}
      />

      <div className="min-w-0 flex-1 md:ml-64 md:flex md:min-h-0 md:flex-col">
        <AppHeader
          activeView={activeView}
          selectedPatient={selectedPatient}
          getFullPatientName={getFullPatientName}
          formatDate={formatDate}
          isLeadershipView={canOpenIntake}
          setIsLeadershipView={setIsLeadershipView}
          setIsEditingIntake={setIsEditingIntake}
          setEditingPatientId={setEditingPatientId}
          setIntakeForm={setIntakeForm}
          setIntakeTab={setIntakeTab}
          setShowIntakeModal={setShowIntakeModal}
          EMPTY_FORM={EMPTY_FORM}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <div>

  <div className="px-4 py-2 space-y-2">
          <div className="text-sm font-medium">
          </div>
          {authMessage ? (
            <div className="text-sm text-slate-600">{authMessage}</div>
          ) : null}

          {!session ? (
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded border px-3 py-2 text-sm"
                placeholder="Full name"
                value={authFullName}
                onChange={(e) => setAuthFullName(e.target.value)}
              />
              <input
                className="rounded border px-3 py-2 text-sm"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                className="rounded border px-3 py-2 text-sm"
                placeholder="Password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <select
                className="rounded border px-3 py-2 text-sm"
                value={authClassification}
                onChange={(e) => setAuthClassification(e.target.value)}
              >
                <option value="">Classification</option>
                <option value="MS1">MS1</option>
                <option value="MS2">MS2</option>
                <option value="MS3">MS3</option>
                <option value="MS4">MS4</option>
              </select>
              <button
                onClick={handleSignUp} disabled={authLoading}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white"
              >
                Sign Up
              </button>
              <button
                onClick={handleSignIn} disabled={authLoading}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
              >
                Sign In
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut} disabled={authLoading}
              className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white"
            >
              Sign Out
            </button>

          )}

        </div>

        {activeView === "dashboard" && (
          <DashboardView
            isLeadershipView={isLeadershipView}
            endClinicReset={endClinicReset}
            selectedClinicDate={selectedClinicDate}
            setSelectedClinicDate={setSelectedClinicDate}
            filteredVisiblePatients={filteredVisiblePatients}
            visibleEncounterRows={visibleEncounterRows}
            assignedCount={assignedCount}
            inVisitCount={inVisitCount}
            searchForm={searchForm}
            setSearchForm={setSearchForm}
            patientRecordsTitle={patientRecordsTitle}
            openPatientFromFilteredView={openPatientFromFilteredView}
            getFullPatientName={getFullPatientName}
          />
        )}

        {activeView === "queue" && (
          <QueueView
            searchForm={searchForm}
            waitingEncounterRows={waitingEncounterRows}
            openPatientChart={openPatientChart}
            getPatientBoardName={getPatientBoardName}
            spanishBadge={spanishBadge}
            priorityBadge={priorityBadge}
            elevatorBadge={elevatorBadge}
            formatWaitTime={formatWaitTime}
          />
        )}

        {activeView === "board" && (
          <RoomBoard
            ROOM_OPTIONS={ROOM_OPTIONS}
            roomMap={roomMap}
            allEncounterRows={allEncounterRows}
            assignedCount={assignedCount}
            inVisitCount={inVisitCount}
            getPatientBoardName={getPatientBoardName}
            getStudentBoardName={getStudentBoardName}
            spanishBadge={spanishBadge}
            priorityBadge={priorityBadge}
            elevatorBadge={elevatorBadge}
            getStatusClasses={getStatusClasses}
            assignEncounterToRoom={assignEncounterToRoom}
            selectedPatient={selectedPatient}
            selectedEncounter={selectedEncounter}
            openPatientChart={openPatientChart}
            isLeadershipView={canManageRooms}
          />
        )}
        {activeView === "formulary" && (
          <FormularyView
            formulary={formulary}
            setFormulary={setFormulary}
            onPrescribeMedication={prescribeFromFormulary}
            selectedPatient={selectedPatient}
            isLeadershipView={canModifyFormulary}
          />
        )}

          {activeView === "users" && isLeadershipView && (
            <UserManagementView
              profiles={filteredProfiles}
              loadingProfiles={loadingProfiles}
              savingProfileId={savingProfileId}
              onChangeRole={handleChangeProfileRole}
              onRefresh={loadProfiles}
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
            />
        )}

        {activeView === "chart" && selectedPatient && (
          <ChartView
            selectedPatient={selectedPatient}
            selectedEncounter={selectedEncounter}
            selectedEncounterId={selectedEncounterId}
            normalizeClinicDate={normalizeClinicDate}
            setActiveView={setActiveView}
            startNewEncounter={startNewEncounter}
            openEditIntake={openEditIntake}
            isLeadershipView={isLeadershipView}
            getFullPatientName={getFullPatientName}
            lastVisitLabel={lastVisitLabel}
            openPatientChart={openPatientChart}
            spanishBadge={spanishBadge}
            priorityBadge={priorityBadge}
            assignmentForm={assignmentForm}
            setAssignmentForm={setAssignmentForm}
            studentNameOptions={studentNameOptions}
            upperLevelNameOptions={upperLevelNameOptions}
            ROOM_OPTIONS={ROOM_OPTIONS}
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
            editingVitalsIndex={editingVitalsIndex}
            startEditVitals={startEditVitals}
            saveSoapNote={saveSoapNote}
            soapAutoSaveEnabled={true}
            updateEncounterField={updateEncounterField}
            formatDate={formatDate}
            soapStatus={selectedEncounter?.soapStatus || "draft"}
            canSignAsUpperLevel={canSignAsUpperLevel}
            canSignAsAttending={canSignAsAttending}
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
        setShowMedicationModal={setShowMedicationModal}
        setEditingMedicationId={setEditingMedicationId}
        addOrUpdateMedication={addOrUpdateMedication}
        EMPTY_MEDICATION={EMPTY_MEDICATION}
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

      <IntakeModal
        showIntakeModal={showIntakeModal}
        setShowIntakeModal={setShowIntakeModal}
        intakeTab={intakeTab}
        setIntakeTab={setIntakeTab}
        intakeForm={intakeForm}
        updateIntakeField={updateIntakeField}
        submitPatient={submitPatient}
        isEditingIntake={isEditingIntake}
        intakeMatchPatientId={intakeMatchPatientId}
      />
    </div>
  );
}