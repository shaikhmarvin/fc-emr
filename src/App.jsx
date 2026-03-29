import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { createPatientInSupabase, updatePatientInSupabase } from "./api/patients";
import {
  createEncounterInSupabase,
  updateEncounterInSupabase,
  createMedicationInSupabase,
  updateMedicationInSupabase,
  deleteMedicationInSupabase,
  deleteEncounterInSupabase,
  createRefillRequest,
  fetchRefillRequests,
  approveRefillRequestInSupabase,
  deleteRefillRequestInSupabase,
} from "./api/encounters";
import { useAuthSession } from "./hooks/useAuthSession";
import { useClinicData } from "./hooks/useClinicData";
import { canStartIntake, canManageRoomBoard, canEditFormulary, canPrescribe, canChart, } from "./utils/permissions";
import { fetchProfiles, updateProfileRole, updateProfileDetails } from "./api/profiles";
import { createAuditLog, fetchAuditLogForEncounter } from "./api/audit";
import { sendPasswordReset } from "./api/auth";
import PatientSearch from "./components/PatientSearch";
import PatientTable from "./components/PatientTable";
import PatientInfoEditModal from "./components/PatientInfoEditModal";
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
import DashboardView from "./components/DashboardView";
import ClinicSummaryView from "./components/ClinicSummaryView";
import ProgramsView from "./components/ProgramsView";
import { fetchProgramSettings } from "./api/programSettings";
import PAPView from "./components/PAPView";
import {
  fetchProgramEntries,
  createProgramEntryInSupabase,
  updateProgramEntryInSupabase,
  deleteProgramEntryInSupabase,
} from "./api/programs";
import {
  fetchPapEntries,
  createPapEntryInSupabase,
  updatePapEntryInSupabase,
  deletePapEntryInSupabase,
} from "./api/pap";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import {
  ROOM_OPTIONS,
  EMPTY_FORM,
  EMPTY_VITALS,
  EMPTY_MEDICATION,
  EMPTY_SEARCH,
  PT_TIME_SLOTS,
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
} from "./constants";
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
  canAssignRoom,
  mapDbStatusToUi,
  findPotentialDuplicatePatient,
  mrnExists,
  sortEncountersByDate,
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

function diabetesBadge(encounter) {
  const hasDM =
    encounter.dm === true ||
    encounter.intake_data?.dm === true;

  if (hasDM) {
    return (
      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
        DM
      </span>
    );
  }
  return null;
}

function fluBadge(encounter) {
  const val = encounter.fluShot;

  if (val === "Interested" || val === "Yes") {
    return (
      <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
        Flu
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

function papBadge(encounter) {
  if (encounter.papStatus === "Interested") {
    return (
      <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">
        Pap
      </span>
    );
  }
  return null;
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    authRole,
    setAuthRole,
    authPin,
    setAuthPin,
    authPinConfirm,
    setAuthPinConfirm,
    canRefillAccess,
  } = useAuthSession();

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
    return (
      role === "upper_level" &&
      (encounter.soapStatus === "draft" || !encounter.soapStatus)
    );
  }

  function canAttendingSignSoap(role, encounter) {
    if (!encounter) return false;

    return (
      !!encounter.upperLevelSignedAt && !encounter.attendingSignedAt &&
      (role === "student" ||
        role === "upper_level" ||
        role === "leadership" ||
        role === "attending")
    );
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

  function getMissingSoapFields(source) {
    if (!source) return [];

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
  };

  const [showUndergradRegistrationModal, setShowUndergradRegistrationModal] = useState(false);
  const [undergradRegistrationForm, setUndergradRegistrationForm] = useState(
    EMPTY_UNDERGRAD_REGISTRATION_FORM
  );
  const [registrationPatientId, setRegistrationPatientId] = useState(null);
  const [registrationEncounterId, setRegistrationEncounterId] = useState(null);

  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    if (userRole === "undergraduate") {
      setActiveView("undergrad-intake");
      return;
    }

    if (userRole === "pharmacy") {
      setActiveView("formulary");
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

    setActiveView("dashboard");
  }, [userRole]);

  const canRefill = canRefillAccess || userRole === "attending" || userRole === "leadership";
  const canAccessDashboard =
    userRole === "leadership" ||
    userRole === "undergraduate" ||
    canRefill;


  const [clinicSummary, setClinicSummary] = useState({
    refillCount: "",
    labsCount: "",
    mentalHealthCount: "",
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
  const [programEntries, setProgramEntries] = useState([]);
  const [programsLoaded, setProgramsLoaded] = useState(false);
  const [programSettings, setProgramSettings] = useState([]);
  const [papEntries, setPapEntries] = useState([]);
  const [papLoaded, setPapLoaded] = useState(false);


  useEffect(() => {
    if (!session || programsLoaded) return;

    async function loadProgramEntries() {
      try {
        const rows = await fetchProgramEntries();
        setProgramEntries(rows);
        setProgramsLoaded(true); // 🔥 important
      } catch (error) {
        console.error("Failed to load program entries:", error);
      }
    }

    loadProgramEntries();
  }, [session, programsLoaded]);

  useEffect(() => {
    if (!session || papLoaded) return;

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
  }, [session, papLoaded]);

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
    setPapEntries((prev) => [entry, ...prev]);

    try {
      const saved = await createPapEntryInSupabase(entry);

      setPapEntries((prev) =>
        prev.map((item) => (item.id === entry.id ? saved : item))
      );
    } catch (error) {
      console.error("Failed to create PAP entry:", error);
      alert(`Failed to save PAP entry: ${error.message}`);

      setPapEntries((prev) => prev.filter((item) => item.id !== entry.id));
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
    if (!session || formularyLoaded) return;

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
  }, [session, formularyLoaded]);

  useEffect(() => {
    if (!session) return;

    async function loadRefillRequests() {
      try {
        const rows = await fetchRefillRequests();
        setRefillRequests(rows);
      } catch (error) {
        console.error("Failed to load refill requests:", error);
      }
    }

    loadRefillRequests();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("formulary-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "formulary_items" },
        (payload) => {
          setFormulary((prev) => {
            const exists = prev.some(
              (item) => String(item.id) === String(payload.new.id)
            );
            if (exists) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "formulary_items" },
        (payload) => {
          setFormulary((prev) => {
            let changed = false;

            const updated = prev.map((item) => {
              if (String(item.id) === String(payload.new.id)) {
                changed = true;
                return payload.new;
              }
              return item;
            });

            return changed ? updated : prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "formulary_items" },
        (payload) => {
          setFormulary((prev) =>
            prev.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

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

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("PROFILES REALTIME:", payload);

          if (payload.eventType === "INSERT") {
            setProfiles((prev) => {
              const exists = prev.some((p) => String(p.id) === String(payload.new.id));
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          }

          if (payload.eventType === "UPDATE") {
            setProfiles((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? payload.new : p
              )
            );
          }

          if (payload.eventType === "UPDATE") {
            setProfiles((prev) => {
              let changed = false;

              const updated = prev.map((p) => {
                if (String(p.id) === String(payload.new.id)) {
                  changed = true;
                  return payload.new;
                }
                return p;
              });

              return changed ? updated : prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);



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
  const [refillRequests, setRefillRequests] = useState([]);
  const { patients, setPatients, refreshClinicData } = useClinicData({
    authReady,
    session,
    userRole,
  });
  const dashboardSelectedPatient =
    patients.find((p) => p.id === dashboardSelectedPatientId) || null;

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("program-entries-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "program_entries",
        },
        (payload) => {
          const eventType = payload.eventType;
          const row = payload.new || payload.old;

          if (!row) return;

          const mappedRow = {
            id: row.id,
            patientId: row.patient_id || "",
            patientName: row.patient_name || "",
            mrn: row.mrn || "",
            dob: row.dob || "",
            phone: row.phone || "",
            programType: row.program_type || "",
            reason: row.reason || "",
            assignedCoordinator: row.assigned_coordinator || "",
            status: row.status || "",
            specialtyDate: row.specialty_date || "",
            scheduleType: row.schedule_group || "",
            schedulePosition: row.schedule_position ?? null,
            appointmentSlot: row.appointment_slot || "",
            notes: row.notes || "",
            createdAt: row.created_at || "",
          };

          if (eventType === "INSERT") {
            setProgramEntries((prev) => {
              const exists = prev.some(
                (entry) => String(entry.id) === String(mappedRow.id)
              );
              if (exists) return prev;
              return [mappedRow, ...prev];
            });
          }

          if (eventType === "UPDATE") {
            setProgramEntries((prev) => {
              let changed = false;

              const updated = prev.map((entry) => {
                if (String(entry.id) === String(mappedRow.id)) {
                  changed = true;
                  return mappedRow;
                }
                return entry;
              });

              return changed ? updated : prev;
            });
          }

          if (eventType === "DELETE") {
            setProgramEntries((prev) =>
              prev.filter((entry) => entry.id !== row.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("pap-entries-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pap_entries",
        },
        (payload) => {
          const eventType = payload.eventType;
          const row = payload.new || payload.old;

          if (!row) return;

          const mappedRow = {
            id: row.id,
            patientId: row.patient_id || "",
            patientName: row.patient_name || "",
            mrn: row.mrn || "",
            phone: row.phone || "",
            medication: row.medication || "",
            company: row.company || "",
            status: row.status || "Pending Application",
            startedDate: row.started_date || "",
            assignedLeadership: row.assigned_leadership || "",
            approvalUntilDate: row.approval_until_date || "",
            nextFollowUpDate: row.next_follow_up_date || "",
            nextRefillDate: row.next_refill_date || "",
            denialReason: row.denial_reason || "",
            discontinuedReason: row.discontinued_reason || "",
            prescriptionChangeNotes: row.prescription_change_notes || "",
            todoNotes: row.todo_notes || "",
            generalNotes: row.general_notes || "",
            createdAt: row.created_at || "",
            updatedAt: row.updated_at || "",
          };

          if (eventType === "INSERT") {
            setPapEntries((prev) => {
              const exists = prev.some(
                (entry) => String(entry.id) === String(mappedRow.id)
              );
              if (exists) return prev;
              return [mappedRow, ...prev];
            });
          }

          if (eventType === "UPDATE") {
            setPapEntries((prev) => {
              let changed = false;

              const updated = prev.map((entry) => {
                if (String(entry.id) === String(mappedRow.id)) {
                  changed = true;
                  return mappedRow;
                }
                return entry;
              });

              return changed ? updated : prev;
            });
          }

          if (eventType === "DELETE") {
            setPapEntries((prev) =>
              prev.filter((entry) => entry.id !== row.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

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

  const [soapBusy, setSoapBusy] = useState(false);
  const [soapUiMessage, setSoapUiMessage] = useState("");
  const [soapDraft, setSoapDraft] = useState({
    encounterId: null,
    soapSubjective: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: "",
    notes: "",
  });
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
      patients,
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

  const [selectedClinicDate, setSelectedClinicDate] = useState(
    getLocalDateInputValue()
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
    });
  }, [selectedEncounter?.id]);

  useEffect(() => {
    if (selectedEncounter?.id) {
      loadAuditLog();
    } else {
      setAuditEntries([]);
    }
  }, [selectedEncounter?.id]);

  const canSignAsUpperLevel = canUpperLevelSignSoap(userRole, selectedEncounter);
  const canSignAsAttending =
    selectedEncounter?.soapStatus === "awaiting_attending" &&
    !selectedEncounter?.attendingSignedAt;
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

    return sortEncountersByDate(selectedPatient.encounters);
  }, [selectedPatient]);

  const patientRecordsTitle = selectedClinicDate
    ? `Patient Records — ${selectedClinicDate}`
    : "Patient Records — All Encounters";


  const allEncounterRows = useMemo(() => {
    return patients.flatMap((patient) =>
      patient.encounters.map((encounter) => ({
        patient,
        encounter,
      }))
    );
  }, [patients]);

  const specialtyEncounterRows = useMemo(() => {
    const todayClinicDate = formatClinicDate();

    return allEncounterRows
      .filter(
        ({ encounter }) =>
          encounter.visitType === "specialty_only" &&
          normalizeClinicDate(encounter.clinicDate) === todayClinicDate &&
          (
            encounter.status === "ready" ||
            encounter.status === "roomed" ||
            encounter.status === "in_visit"
          ) &&
          encounter.status !== "done" &&
          encounter.soapStatus !== "signed"
      )
      .sort((a, b) => {
        const aTime = new Date(a.encounter.createdAt || 0).getTime();
        const bTime = new Date(b.encounter.createdAt || 0).getTime();
        return aTime - bTime;
      });
  }, [allEncounterRows]);

  const specialtyRoomRulesForBoard = useMemo(() => {
    const today = formatClinicDate();

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

      if (row.next_specialty_date !== today) return;

      rules[encounterType] = {
        label: row.program_type,
        allowedRooms: (row.rooms_assigned?.rooms || []).map((room) => String(room)),
      };
    });

    return rules;
  }, [programSettings]);

  const registrationRows = useMemo(() => {
    return allEncounterRows
      .filter(({ encounter }) => {
        if (userRole === "undergraduate") {
          return encounter.status === "started";
        }

        if (isLeadershipView) {
          return (
            (
              (encounter.status === "started" && !encounter.leadershipIntakeComplete) ||
              encounter.status === "undergrad_complete"
            ) &&
            encounter.visitType !== "specialty_only"
          );
        }

        return false;
      })
      .sort((a, b) => {
        const aTime = new Date(a.encounter.createdAt || 0).getTime();
        const bTime = new Date(b.encounter.createdAt || 0).getTime();
        return aTime - bTime;
      });
  }, [allEncounterRows, userRole, isLeadershipView]);

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

  const newPatientCount = visibleEncounterRows.filter(
    ({ encounter }) => encounter.newReturning === "New"
  ).length;

  const returningPatientCount = visibleEncounterRows.filter(
    ({ encounter }) => encounter.newReturning === "Returning"
  ).length;

  const totalPatientCount = visibleEncounterRows.length;

  const specialtyCounts = useMemo(() => {
    const counts = {
      pt: 0,
      dermatology: 0,
      ophthalmology: 0,
      mental_health: 0,
      addiction: 0,
    };

    patients.forEach((patient) => {
      patient.encounters.forEach((encounter) => {
        if (encounter.clinicDate !== selectedClinicDate) return;

        const { visitType, specialtyType } = encounter;

        if (
          (encounter.visitType === "specialty_only" || encounter.visitType === "both") &&
          encounter.specialtyType
        ) {
          counts[encounter.specialtyType] =
            (counts[encounter.specialtyType] || 0) + 1;
        }

        // 👇 dual visit counts twice (general + specialty)
        if (visitType === "both") {
          if (counts[specialtyType] !== undefined) {
            // already counted above, no extra needed
            // BUT we are intentionally counting specialty once per encounter
            // (dual visit already included in both categories)
          }
        }
      });
    });

    return counts;
  }, [patients, selectedClinicDate]);

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
      const email = (profile.email || "").toLowerCase();

      return (
        fullName.includes(query) ||
        role.includes(query) ||
        classification.includes(query) ||
        email.includes(query)
      );
    });
  }, [profiles, userSearch, showOnlyActiveToday]);

  async function handleUndergradStartEncounter(data) {
    try {
      let targetPatient = null;

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
      };

      let savedEncounter = null;

      if (data.visitType === "both" && data.specialtyType) {
        const generalEncounter = {
          ...encounterBase,
          visitType: "general",
          specialtyType: "",
        };

        const specialtyEncounter = {
          ...encounterBase,
          visitType: "specialty_only",
          specialtyType: data.specialtyType,
          status: "ready",
          leadershipIntakeComplete: true,
        };

        savedEncounter = await createEncounterInSupabase(targetPatient.id, generalEncounter);
        await createEncounterInSupabase(targetPatient.id, specialtyEncounter);
      } else {
        const singleEncounter = {
          ...encounterBase,
          visitType: data.visitType || "general",
          specialtyType: data.specialtyType || "",
        };

        savedEncounter = await createEncounterInSupabase(targetPatient.id, singleEncounter);
      }

      await refreshClinicData();

      setSelectedPatientId(targetPatient.id);
      setSelectedEncounterId(savedEncounter.id);
      setActiveView("registration");

    } catch (error) {
      console.error("Failed to save undergrad intake:", error);
      alert(`Failed to save intake: ${error.message}`);
    }
  }

  function openUndergradRegistration(patientId, encounterId) {
    const patient = patients.find((p) => p.id === patientId);
    const encounter = patient?.encounters.find((e) => e.id === encounterId);

    if (!patient || !encounter) return;

    setRegistrationPatientId(patientId);
    setRegistrationEncounterId(encounterId);

    setUndergradRegistrationForm({
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
    });

    setShowUndergradRegistrationModal(true);
  }

  async function saveUndergradRegistration() {
    const patient = patients.find((p) => p.id === registrationPatientId);
    const encounter = patient?.encounters.find((e) => e.id === registrationEncounterId);

    if (!patient || !encounter) return;

    const patientUpdates = {
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

    try {
      await updatePatientInSupabase(registrationPatientId, patientUpdates);

      const nextStatus = encounter.leadershipIntakeComplete ? "ready" : "undergrad_complete";

      await updateEncounterInSupabase(registrationEncounterId, {
        status: nextStatus,
      });

      setPatients((prev) =>
        prev.map((p) =>
          p.id === registrationPatientId
            ? {
              ...p,
              ...patientUpdates,
              encounters: p.encounters.map((e) =>
                e.id === registrationEncounterId
                  ? { ...e, status: nextStatus }
                  : e
              ),
            }
            : p
        )
      );

      setShowUndergradRegistrationModal(false);
      setRegistrationPatientId(null);
      setRegistrationEncounterId(null);
      setUndergradRegistrationForm(EMPTY_UNDERGRAD_REGISTRATION_FORM);
    } catch (error) {
      console.error("Failed to save undergrad registration:", error);
      alert(`Failed to save undergrad registration: ${error.message}`);
    }
  }
  function openLeadershipRegistration(patientId, encounterId) {
    const patient = patients.find((p) => p.id === patientId);
    const encounter = patient?.encounters.find((e) => e.id === encounterId);

    if (!patient || !encounter) return;

    setSelectedPatientId(patientId);
    setSelectedEncounterId(encounterId);

    setIntakeForm({
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
      newReturning: encounter.newReturning || "",
      ttuStudent: patient.ttuStudent || false,
      visitLocation: encounter.visitLocation || "In Clinic",
      chiefComplaint: encounter.chiefComplaint || "",
      notes: encounter.notes || "",
      transportation: encounter.transportation || "",
      needsElevator: encounter.needsElevator || false,
      spanishSpeaking: encounter.spanishSpeaking || "",
      over65: patient.age ? Number(patient.age) > 65 : false,
      mammogramStatus: encounter.mammogramStatus || encounter.mammogramPapSmear || "",
      papStatus: encounter.papStatus || "",
      fluShot: encounter.fluShot || "",
      htn: encounter.htn || false,
      dm: encounter.dm || false,
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
    loadProfiles(); // initial load

    const interval = setInterval(() => {
      loadProfiles();
    }, 30000); // every 30 seconds

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



  const filteredEncounterRows = visibleEncounterRows.filter(({ patient }) =>
    filteredPatients.some((p) => p.id === patient.id)
  );

  const waitingEncounterRows = useMemo(() => {
    const todayClinicDate = formatClinicDate();

    const activeRows = filteredEncounterRows.filter(
      ({ encounter }) =>
        normalizeClinicDate(encounter.clinicDate) === todayClinicDate &&
        (
          encounter.status === "ready" ||
          encounter.status === "roomed" ||
          encounter.status === "in_visit"
        ) &&
        encounter.status !== "done" &&
        encounter.soapStatus !== "signed"
    );

    const currentUserName = (
      profileNameMap[session?.user?.id] ||
      authFullName ||
      ""
    ).trim();

    let rows = activeRows;

    if (userRole === "student") {
      rows = activeRows.filter(({ encounter }) =>
        (encounter.assignedStudent || "")
          .trim()
          .toLowerCase()
          .includes(currentUserName.toLowerCase())
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
      rows = activeRows.filter(
        ({ encounter }) => encounter.visitType !== "specialty_only"
      );

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

        const aBus =
          a.encounter.transportation === "Bus/Public Transport" ? 0 : 1;
        const bBus =
          b.encounter.transportation === "Bus/Public Transport" ? 0 : 1;

        if (aBus !== bBus) return aBus - bBus;

        const aTime = new Date(a.encounter.createdAt || 0).getTime();
        const bTime = new Date(b.encounter.createdAt || 0).getTime();
        return aTime - bTime;
      });

      return rows;
    }

    return [...rows].sort((a, b) => {
      const aTime = new Date(a.encounter.createdAt || 0).getTime();
      const bTime = new Date(b.encounter.createdAt || 0).getTime();
      return aTime - bTime;
    });
  }, [
    filteredEncounterRows,
    profileNameMap,
    session?.user?.id,
    authFullName,
    userRole,
  ]);

  const assignedCount = filteredEncounterRows.filter(
    ({ encounter }) =>
      (encounter.status === "roomed" || encounter.status === "in_visit") &&
      encounter.soapStatus !== "signed"
  ).length;

  const inVisitCount = filteredEncounterRows.filter(
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

  function getActiveRoomRows(roomNumber) {
    return allEncounterRows.filter(
      ({ encounter }) =>
        Number(encounter.roomNumber) === Number(roomNumber) &&
        isEncounterStillOnRoomBoard(encounter)
    );
  }

  function getRoomConflictDetails(roomNumber, currentEncounterId, incomingAssignment = {}) {
    const activeRows = getActiveRoomRows(roomNumber).filter(
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

    visibleEncounterRows.forEach(({ patient, encounter }) => {
      if (
        encounter.roomNumber &&
        encounter.status !== "done" &&
        encounter.soapStatus !== "signed"
      ) {
        map[Number(encounter.roomNumber)] = { patient, encounter };
      }
    });

    return map;
  }, [visibleEncounterRows]);

  const roomDropdownOptions = useMemo(() => {
    return ROOM_OPTIONS.map((room) => {
      const roomRows = getActiveRoomRows(room.number);

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
  }, [allEncounterRows]);


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

  function joinActiveNames(list) {
    return list
      .map((profile) => (profile.full_name || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
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

  useEffect(() => {
    setClinicSummary((prev) => ({
      ...prev,
      attendingNames: prev.attendingNames || joinActiveNames(activeAttendings),
      ms34Names: prev.ms34Names || joinActiveNames(activeUpperLevels),
      ms12Names: prev.ms12Names || joinActiveNames(activeStudents),
    }));
  }, [activeAttendings, activeUpperLevels, activeStudents]);

  const canAccessSpecialtyQueue =
    userRole === "leadership" ||
    userRole === "student" ||
    userRole === "upper_level";
  userRole === "attending"

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
            ...extraUpdates,
          }
          : profile
      )
    );

    try {
      setSavingProfileId(profileId);
      setProfilesMessage("");

      if (Object.keys(extraUpdates).length > 0) {
        await updateProfileDetails(profileId, {
          role: effectiveRole,
          classification: effectiveClassification,
          ...extraUpdates,
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
      mammogramStatus:
        selectedEncounter.mammogramStatus || selectedEncounter.mammogramPapSmear || "",
      papStatus: selectedEncounter.papStatus || "",
      fluShot: selectedEncounter.fluShot || "",
      htn: selectedEncounter.htn || false,
      dm: selectedEncounter.dm || false,
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

  function buildProgramEntriesFromIntake(patient, intakeForm, coordinatorName = "") {
    const entries = [];
    const createdAt = new Date().toISOString();

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

    return entries;
  }

  async function createProgramEntriesFromIntake(patient, intakeForm) {
    const coordinatorName =
      profiles.find((profile) => profile.id === session?.user?.id)?.full_name || "";

    const entries = buildProgramEntriesFromIntake(patient, intakeForm, coordinatorName);

    if (entries.length === 0) return;

    const hasOpenReferral = (patientId, programType) => {
      return programEntries.some(
        (entry) =>
          String(entry.patientId) === String(patientId) &&
          entry.programType === programType &&
          entry.status !== "Completed" &&
          entry.status !== "Declined"
      );
    };

    for (const entry of entries) {
      if (hasOpenReferral(entry.patientId, entry.programType)) continue;
      await addProgramEntry(entry);
    }
  }

  async function submitPatient() {
    if (!intakeForm.firstName || !intakeForm.lastName || !intakeForm.dob || !intakeForm.chiefComplaint) {
      return;
    }
    if (intakeForm.mrn.trim() && mrnExists(patients, intakeForm.mrn, editingPatientId)) {
      window.alert("That MRN is already being used by another patient. Please use a different MRN.");
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
        const nextStatus =
          selectedEncounter.status === "undergrad_complete" ? "ready" : "started";

        const savedEncounter = await updateEncounterInSupabase(selectedEncounter.id, {
          chiefComplaint: intakeForm.chiefComplaint,
          notes: intakeForm.notes,
          newReturning: intakeForm.newReturning,
          visitLocation: intakeForm.visitLocation,
          transportation: intakeForm.transportation,
          needsElevator: intakeForm.needsElevator,
          spanishSpeaking: intakeForm.spanishSpeaking,
          mammogramStatus: intakeForm.mammogramStatus,
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
                      status: nextStatus,
                      leadershipIntakeComplete: true,
                      newReturning: intakeForm.newReturning,
                      visitLocation: intakeForm.visitLocation,
                      chiefComplaint: intakeForm.chiefComplaint,
                      notes: intakeForm.notes,
                      transportation: intakeForm.transportation,
                      needsElevator: intakeForm.needsElevator,
                      spanishSpeaking: intakeForm.spanishSpeaking,
                      mammogramStatus: intakeForm.mammogramStatus,
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
                    }
                    : encounter
                ),
              }
              : patient
          )
        );
        await createProgramEntriesFromIntake(
          {
            ...selectedPatient,
            firstName: intakeForm.firstName,
            lastName: intakeForm.lastName,
            mrn: intakeForm.mrn.trim() || selectedPatient.mrn || "",
            dob: intakeForm.dob,
            phone: intakeForm.phone,
          },
          intakeForm
        );

        setShowIntakeModal(false);
        setIntakeTab(0);
        setIntakeMatchPatientId(null);
        setAutoFilledMatchPatientId(null);
        setIsEditingIntake(false);
        setEditingPatientId(null);
        setActiveView("queue");
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
      status: "ready",
      clinicDate: normalizeClinicDate(baseEncounter.clinicDate) || formatClinicDate(),
      createdAt: baseEncounter.createdAt || new Date().toISOString(),
    };


    if (potentialDuplicate) {
      try {
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
        await createProgramEntriesFromIntake(
          {
            ...potentialDuplicate,
            firstName: intakeForm.firstName,
            lastName: intakeForm.lastName,
            mrn: potentialDuplicate.mrn || intakeForm.mrn.trim() || "",
            dob: intakeForm.dob,
            phone: intakeForm.phone,
          },
          intakeForm
        );
      } catch (error) {
        console.error("Failed to create duplicate-patient encounter:", error);
        window.alert(`Supabase save error: ${error.message}`);
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
        await createProgramEntriesFromIntake(hydratedPatient, intakeForm);
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
    if (!dashboardSelectedPatient) {
      alert("Select a patient first from the dashboard.");
      return;
    }

    setShowPatientInfoEditModal(true);
  }

  async function saveDashboardPatientEdits(patientId, updates) {
    const trimmedMrn = (updates.mrn || "").trim();

    if (trimmedMrn && mrnExists(patients, trimmedMrn, patientId)) {
      alert("That MRN is already being used by another patient. Please use a different MRN.");
      return;
    }

    try {
      const savedPatient = await updatePatientInSupabase(patientId, {
        ...updates,
        mrn: trimmedMrn,
      });

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? {
              ...patient,
              ...savedPatient,
              ...updates,
              mrn: trimmedMrn,
            }
            : patient
        )
      );
    } catch (error) {
      console.error("Failed to save patient edits:", error);
      alert(`Failed to save patient edits: ${error.message}`);
    }
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
    setSoapDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
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
      alert("Please select a room before assigning this patient.");
      return;
    }

    if (!nextStudent && !nextUpperLevel) {
      alert("Please assign a student or upper level before starting the visit.");
      return;
    }

    const numericRoom = Number(nextRoomNumber);

    if (!canAssignRoom(encounter, numericRoom)) {
      alert("Pap smear patients cannot be assigned to Room 9 or Room 10.");
      return;
    }

    const conflict = getRoomConflictDetails(numericRoom, encounterId, {
      assignedStudent: nextStudent,
      assignedUpperLevel: nextUpperLevel,
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
      await applyEncounterTransition(encounterId, {
        assignedStudent: nextStudent,
        assignedUpperLevel: nextUpperLevel,
        roomNumber: String(numericRoom),
        status: "in_visit",
      });

    } catch (error) {
      console.error("Failed to assign encounter from queue:", error);
      alert(`Failed to save assignment: ${error.message}`);
    }
  }

  async function assignEncounter() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedPatient || !selectedEncounter) return;

    if (!assignmentForm.roomNumber) {
      alert("Please select a room before assigning this patient.");
      return;
    }

    if (!assignmentForm.studentName && !assignmentForm.upperLevelName) {
      alert("Please assign a student or upper level before starting the visit.");
      return;
    }

    const roomNumber = Number(assignmentForm.roomNumber);

    if (!canAssignRoom(selectedEncounter, roomNumber)) {
      alert("Pap smear patients cannot be assigned to Room 9 or Room 10.");
      return;
    }

    const conflict = getRoomConflictDetails(roomNumber, selectedEncounter.id, {
      assignedStudent: assignmentForm.studentName,
      assignedUpperLevel: assignmentForm.upperLevelName,
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
      await applyEncounterTransition(selectedEncounter.id, {
        roomNumber: String(roomNumber),
        status: "in_visit",
        assignedStudent: assignmentForm.studentName,
        assignedUpperLevel: assignmentForm.upperLevelName,
      });

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

    if (!canAssignRoom(selectedEncounter, numericRoom)) {
      alert("Pap smear patients cannot be assigned to Room 9 or Room 10.");
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
  async function deletePatientCompletely(patientId) {
    const confirmed = window.confirm(
      "Delete this patient completely? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deletePatientInSupabase(patientId); // let DB handle cascade

      setPatients((prev) => prev.filter((p) => p.id !== patientId));
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
        ? { status: "ready", roomNumber: "" }
        : { status };

    try {
      await applyEncounterTransition(selectedEncounter.id, updates);
    } catch (error) {
      console.error("Failed to update encounter status:", error);
      alert(`Failed to update status: ${error.message}`);
    }
  }
  async function clearEncounterRoom() {
    if (!canManageRooms) return;
    if (leadershipActionLocked) return;
    if (!selectedPatient || !selectedEncounter) return;

    lockLeadershipActions();

    try {
      await applyEncounterTransition(selectedEncounter.id, {
        roomNumber: "",
        status: "in_visit",
      });

    } catch (error) {
      console.error("Failed to clear encounter room:", error);
      alert(`Failed to clear room: ${error.message}`);
      return;
    }


    setAssignmentForm((prev) => ({
      ...prev,
      roomNumber: "",
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
      alert(`Failed to prescribe medication: ${error.message}`);

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
        alert(`Failed to save medication: ${error.message}`);

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
      alert(`Failed to save medication: ${error.message}`);

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

      alert("Refill request submitted.");
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
      alert(`Failed to update medication: ${error.message}`);
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
        alert(`Failed to delete medication: ${error.message}`);

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
      alert(`Failed to delete medication: ${error.message}`);
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

    const currentSoapStatus = selectedEncounter.soapStatus || "draft";

    const authorId = showConfirmation
      ? session.user.id
      : (selectedEncounter.soapAuthorId || session.user.id);

    const authorRole = showConfirmation
      ? userRole
      : (selectedEncounter.soapAuthorRole || userRole);

    try {
      setSoapBusy(true);

      if (showConfirmation) {
        setSoapUiMessage("Saving...");
      }

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
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
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
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

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
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

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
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

      await updateEncounterInSupabase(selectedEncounter.id, {
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

    try {
      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        attendingSignedBy: session.user.id,
        attendingSignedAt: signedAt,
        soapStatus: "signed",
        status: "done",
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

      setSoapBusy(true);
      setSoapUiMessage("Saving...");

      await updateEncounterInSupabase(selectedEncounter.id, {
        soapSubjective: soapDraft.soapSubjective || "",
        soapObjective: soapDraft.soapObjective || "",
        soapAssessment: soapDraft.soapAssessment || "",
        soapPlan: soapDraft.soapPlan || "",
        notes: soapDraft.notes || "",
        soapAuthorId: authorId,
        soapAuthorRole: authorRole,
        attendingSignedBy: attending.id,
        attendingSignedAt: signedAt,
        soapStatus: "signed",
        status: "done",
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
                    soapSubjective: soapDraft.soapSubjective || "",
                    soapObjective: soapDraft.soapObjective || "",
                    soapAssessment: soapDraft.soapAssessment || "",
                    soapPlan: soapDraft.soapPlan || "",
                    notes: soapDraft.notes || "",
                    soapAuthorId: authorId,
                    soapAuthorRole: authorRole,
                    attendingSignedBy: attending.id,
                    attendingSignedAt: signedAt,
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


  async function exportClinicSummaryToWord() {
    const clinicDateLabel = selectedClinicDate || formatClinicDate();

    const rowsForDate = visibleEncounterRows.filter(
      ({ encounter }) =>
        !selectedClinicDate ||
        normalizeClinicDate(encounter.clinicDate) === selectedClinicDate
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
    function formatDobForSummary(dob) {
      if (!dob) return "";

      const parts = String(dob).split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${month}-${day}-${year}`;
      }

      return String(dob).replaceAll("/", "-");
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
            bodyCell(clinicSummary.refillCount || "", AlignmentType.CENTER),
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
            bodyCell(""),
            bodyCell(""),
            bodyCell("Labs"),
            bodyCell(clinicSummary.labsCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("Mental Health"),
            bodyCell(clinicSummary.mentalHealthCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("Ophthalmology"),
            bodyCell(clinicSummary.ophthalmologyCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("Social Work"),
            bodyCell(clinicSummary.socialWorkCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("Zoom"),
            bodyCell(clinicSummary.zoomCount || "", AlignmentType.CENTER),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("Phone"),
            bodyCell(clinicSummary.phoneCount || "", AlignmentType.CENTER),
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
                  text: "Patients Seen: ",
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

            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(#) = number of patients seen for clinic AND specialty",
                }),
              ],
            }),
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
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${authMode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
                  }`}
              >
                Log In
              </button>
              <button
                onClick={() => setAuthMode("signup")}
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
                  <input
                    className="w-full rounded-lg border px-3 py-3 text-sm"
                    placeholder="Full name"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                  />

                  <select
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
                  </select>

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

              <input
                className="w-full rounded-lg border px-3 py-3 text-sm"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />

              <input
                className="w-full rounded-lg border px-3 py-3 text-sm"
                placeholder="Password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />

              {authMessage ? (
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {authMessage}
                </div>
              ) : null}

              {authMode === "login" ? (
                <button
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? "Signing In..." : "Log In"}
                </button>
              ) : (
                <button
                  onClick={handleSignUp}
                  disabled={authLoading}
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? "Creating Account..." : "Create Account"}
                </button>
              )}
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
        roomMap={roomMap}
        getPatientBoardName={getPatientBoardName}
        getStudentBoardName={getStudentBoardName}
        spanishBadge={spanishBadge}
        priorityBadge={priorityBadge}
        elevatorBadge={elevatorBadge}
        diabetesBadge={diabetesBadge}
        fluBadge={fluBadge}
        papBadge={papBadge}
        getStatusClasses={getStatusClasses}
        allEncounterRows={allEncounterRows}
      />
    );
  }


  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
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
      />

      <div className="min-w-0 flex-1 bg-slate-100 lg:ml-64 lg:flex lg:flex-col">
        <AppHeader
          activeView={activeView}
          selectedPatient={selectedPatient}
          getFullPatientName={getFullPatientName}
          formatDate={formatDate}
          user={session?.user}
          userRole={userRole}
          handleResetSession={handleResetSession}
          isLeadershipView={isLeadershipView}
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
          {activeView === "dashboard" && (
            <DashboardView
              isLeadershipView={isLeadershipView}
              canEditMrn={userRole === "undergraduate" || isLeadershipView}
              canEditUndergradFields={userRole === "undergraduate" || isLeadershipView}
              canEditAllPatientFields={isLeadershipView}
              canEditPatient={isLeadershipView}
              canDeletePatient={isLeadershipView}
              deletePatientCompletely={deletePatientCompletely}
              openPatientEditModal={openPatientEditModal}
              dashboardSelectedPatient={dashboardSelectedPatient}
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
            />
          )}

          {activeView === "registration" && (
            <RegistrationView
              registrationRows={registrationRows}
              openUndergradRegistration={openUndergradRegistration}
              openLeadershipRegistration={openLeadershipRegistration}
              getFullPatientName={getFullPatientName}
              formatDate={formatDate}
              userRole={userRole}
              isLeadershipView={isLeadershipView}
              onRemoveFromRegistration={removeFromRegistration}
            />
          )}

          {activeView === "undergrad-intake" && userRole === "undergraduate" && (
            <UndergradIntakeView
              onSave={handleUndergradStartEncounter}
              patients={patients}
            />
          )}

          {activeView === "queue" && (
            <QueueView
              userRole={userRole}
              searchForm={searchForm}
              waitingEncounterRows={waitingEncounterRows}
              openPatientChart={openPatientChart}
              getPatientBoardName={getPatientBoardName}
              spanishBadge={spanishBadge}
              priorityBadge={priorityBadge}
              diabetesBadge={diabetesBadge}
              elevatorBadge={elevatorBadge}
              fluBadge={fluBadge}
              papBadge={papBadge}
              formatWaitTime={formatWaitTime}
              studentNameOptions={studentNameOptions}
              upperLevelNameOptions={upperLevelNameOptions}
              ROOM_OPTIONS={roomDropdownOptions}
              onAssignFromQueue={assignEncounterFromQueue}
              refillRequests={refillRequests}
              canRefill={canRefill}
              patients={patients}
              activeAttendings={activeAttendings}
              onApproveRefillRequest={handleApproveRefillRequestWithPin}
              profileNameMap={profileNameMap}
              onApproveRefillAsSignedInAttending={handleApproveRefillRequestAsSignedInAttending}
              onDeleteRefillRequest={handleDeleteRefillRequest}
            />
          )}

          {activeView === "specialty-queue" && canAccessSpecialtyQueue && (
            <SpecialtyQueueView
              specialtyEncounterRows={specialtyEncounterRows}
              openPatientChart={openPatientChart}
              getFullPatientName={getFullPatientName}
              formatDate={formatDate}
              isLeadershipView={isLeadershipView}
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
              diabetesBadge={diabetesBadge}
              fluBadge={fluBadge}
              papBadge={papBadge}
              getStatusClasses={getStatusClasses}
              assignEncounterToRoom={assignEncounterToRoom}
              selectedPatient={selectedPatient}
              selectedEncounter={selectedEncounter}
              openPatientChart={openPatientChart}
              isLeadershipView={canManageRooms}
              SPECIALTY_ROOM_RULES={specialtyRoomRulesForBoard}
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
              onApproveUser={handleApproveUser}
              onDeleteUser={handleDeleteUser}
              onResetPassword={handleResetUserPassword}
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
              deleteEncounter={deleteEncounter}
              canStartEncounter={userRole === "leadership" || userRole === "undergraduate"}
              openEditIntake={openEditIntake}
              isLeadershipView={isLeadershipView}
              getFullPatientName={getFullPatientName}
              lastVisitLabel={lastVisitLabel}
              openPatientChart={openPatientChart}
              spanishBadge={spanishBadge}
              papBadge={papBadge}
              diabetesBadge={diabetesBadge}
              elevatorBadge={elevatorBadge}
              fluBadge={fluBadge}
              priorityBadge={priorityBadge}
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
            />
          )}

          {activeView === "summary" && isLeadershipView && (
            <ClinicSummaryView
              selectedClinicDate={selectedClinicDate}
              setSelectedClinicDate={setSelectedClinicDate}
              clinicSummary={clinicSummary}
              setClinicSummary={setClinicSummary}
              newPatientCount={newPatientCount}
              returningPatientCount={returningPatientCount}
              totalPatientCount={totalPatientCount}
              exportClinicSummaryToWord={exportClinicSummaryToWord}
              specialtyCounts={specialtyCounts}
            />
          )}

          {activeView === "programs" && isLeadershipView && (
            <ProgramsView
              programEntries={programEntries}
              addProgramEntry={addProgramEntry}
              updateProgramEntry={updateProgramEntry}
              removeProgramEntry={removeProgramEntry}
              patients={patients}
              selectedClinicDate={selectedClinicDate}
              leadershipOptions={profiles
                .filter((profile) => profile.role === "leadership")
                .map((profile) => (profile.full_name || "").trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))}
            />
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

      <UndergradRegistrationModal
        show={showUndergradRegistrationModal}
        form={undergradRegistrationForm}
        setForm={setUndergradRegistrationForm}
        onClose={() => {
          setShowUndergradRegistrationModal(false);
          setRegistrationPatientId(null);
          setRegistrationEncounterId(null);
          setUndergradRegistrationForm(EMPTY_UNDERGRAD_REGISTRATION_FORM);
        }}
        onSubmit={saveUndergradRegistration}
      />

      <PatientInfoEditModal
        show={showPatientInfoEditModal}
        patient={dashboardSelectedPatient}
        canEditUndergradFields={userRole === "undergraduate" || isLeadershipView}
        canEditAllPatientFields={isLeadershipView}
        onClose={() => setShowPatientInfoEditModal(false)}
        onSave={async (patientId, updates) => {
          await saveDashboardPatientEdits(patientId, updates);
          setShowPatientInfoEditModal(false);
        }}
      />
    </div>
  );
}