import { useEffect, useState, useCallback, useRef } from "react";
import { getEncounterVisitTypeKey } from "../constants";
import { supabase } from "../lib/supabase";
import {
  fetchClinicFlowEncounters,
  fetchEncounters,
  fetchMedications,
} from "../api/encounters";
import { fetchClinicFlowPatients, fetchPatients } from "../api/patients";
import { fetchAllergies } from "../api/allergies";
import { fetchSocialWorkNotes } from "../api/socialWorkNotes";
import { mapDbStatusToUi } from "../utils";

function buildPatientMap(patientsData, encountersData, medicationsData, allergiesData, socialWorkNotesData) {
  const patientMap = {};

  patientsData.forEach((patient) => {
    patientMap[patient.id] = {
      ...patient,
      encounters: [],
      allergyList: [],
      medicationList: [],
      socialWorkNotes: [],
    };
  });

  encountersData.forEach((encounter) => {
    const patient = patientMap[encounter.patient_id];
    if (!patient) return;

    const intake = encounter.intake_data || {};
    const visitType = getEncounterVisitTypeKey(encounter);
    const specialtyType = intake.specialtyType || "";
    const dualVisit = intake.dualVisit ?? false;

    patient.encounters.push({
      id: encounter.id,
      clinicDate: encounter.clinic_date,
      createdAt: encounter.created_at,
      undergradCompletedAt: encounter.undergrad_completed_at || null,
      leadershipIntakeCompletedAt:
        encounter.leadership_intake_completed_at || null,
      readyAt: encounter.ready_at || null,
      roomedAt: encounter.roomed_at || null,
      assignedAt: encounter.assigned_at || null,
      studentAssignedAt: encounter.student_assigned_at || null,
      upperLevelAssignedAt: encounter.upper_level_assigned_at || null,
      doneAt: encounter.done_at || null,
      cancelledAt: encounter.cancelled_at || null,
      pharmacyPickedUpAt: encounter.pharmacy_picked_up_at || null,
      labType: encounter.lab_type || "",
      labStatus: encounter.lab_status || "none",
      labCollectedAt: encounter.lab_collected_at || null,
      labUnableAt: encounter.lab_unable_at || null,
      labNote: encounter.lab_note || "",
      visitCompletedAt: encounter.visit_completed_at || null,
      newReturning: intake.newReturning ?? "Returning",
      dailyNumber:
        intake.dailyNumber ??
        intake.daily_number ??
        intake.dailyCardNumber ??
        intake.daily_card_number ??
        intake.cardNumber ??
        intake.card_number ??
        intake.queueNumber ??
        intake.queue_number ??
        intake.patientNumber ??
        intake.patient_number ??
        "",
      refillNumber:
        intake.refillNumber ??
        intake.refill_number ??
        intake.refillQueueNumber ??
        intake.refill_queue_number ??
        "",
      visitLocation: intake.visitLocation ?? "In Clinic",
      chiefComplaint: encounter.chief_complaint || "",
      transportation: intake.transportation ?? "",
      needsElevator: intake.needsElevator ?? false,
      spanishSpeaking: intake.spanishSpeaking ?? false,
      mammogramStatus:
        intake.mammogramStatus ?? intake.mammogramPapSmear ?? "",
      papStatus: intake.papStatus ?? "",
      fluShot: intake.fluShot ?? "",
      htn: intake.htn ?? false,
      dm: intake.dm ?? false,
      labsLast6Months: intake.labsLast6Months ?? "",
      nicotineUse: intake.nicotineUse ?? "",
      nicotineDetails: intake.nicotineDetails ?? "",
      substanceUseConcern: intake.substanceUseConcern ?? "",
      substanceUseTreatment: intake.substanceUseTreatment ?? "",
      substanceUseNotes: intake.substanceUseNotes ?? "",
      dermatology: intake.dermatology ?? "N/A",
      ophthalmology: intake.ophthalmology ?? "N/A",
      optometry: intake.optometry ?? "N/A",
      diabeticEyeExamPastYear: intake.diabeticEyeExamPastYear ?? "N/A",
      physicalTherapy: intake.physicalTherapy ?? "N/A",
      mentalHealthCombined: intake.mentalHealthCombined ?? "N/A",
      counseling: intake.counseling ?? "N/A",
      anyMentalHealthPositive: intake.anyMentalHealthPositive ?? false,
      status: mapDbStatusToUi(encounter.status),
      assignedStudent: encounter.assigned_student || "",
      assignedUpperLevel: encounter.assigned_upper_level || "",
      roomNumber: encounter.room || "",
      notes: encounter.notes || "",
      noteType: encounter.note_type || "medical",
      groupNote: encounter.group_note || "",
      inHouseLabs: encounter.in_house_labs || {},
      sendOutLabs: encounter.send_out_labs || {},
      importedSendOutLabs:
        encounter.imported_send_out_labs ||
        encounter.importedSendOutLabs ||
        [],
      medications: [],
      vitalsHistory: encounter.vitals || [],
      soapSubjective: encounter.hpi || "",
      soapObjective: encounter.objective || "",
      soapAssessment: encounter.assessment || "",
      soapPlan: encounter.plan || "",
      ophthalmologyNote: encounter.ophthalmology_note || null,
      ophthalmology_note: encounter.ophthalmology_note || null,
      soapSavedAt: "",
      soapStatus: encounter.soap_status || "draft",
      soapAuthorId: encounter.soap_author_id || null,
      soapAuthorRole: encounter.soap_author_role || null,
      upperLevelSignedBy: encounter.upper_level_signed_by || null,
      upperLevelSignedAt: encounter.upper_level_signed_at || null,
      attendingSignedBy: encounter.attending_signed_by || null,
      attendingSignedAt: encounter.attending_signed_at || null,
      attendingSignatureData: encounter.attending_signature_data_url || "",
      disciplineNoteStatus: encounter.discipline_note_status || "draft",
      disciplineSignedBy: encounter.discipline_signed_by || null,
      disciplineSignedAt: encounter.discipline_signed_at || null,
      disciplineSignerName: encounter.discipline_signer_name || "",
      disciplineSignatureData: encounter.discipline_signature_data_url || "",
      workflowVersion: Number(encounter.workflow_version || 0),
      visitType,
      specialtyType,
      dualVisit,
      refillMedicationRequest:
        intake.refillMedicationRequest ??
        intake.refill_medication_request ??
        intake.refillRequest ??
        intake.refill_request ??
        "",
        socialWorkSeen:
  intake.socialWorkSeen ??
  intake.social_work_seen ??
  false,

socialWorkSeenAt:
  intake.socialWorkSeenAt ??
  intake.social_work_seen_at ??
  null,

socialWorkSeenBy:
  intake.socialWorkSeenBy ??
  intake.social_work_seen_by ??
  null,
      leadershipIntakeComplete: encounter.leadership_intake_complete ?? false,
      pharmacyStatus: encounter.pharmacy_status || "",
      skipUpperLevel: encounter.skip_upper_level ?? false,
      skipUpperLevelBy: encounter.skip_upper_level_by || null,
      skipUpperLevelAt: encounter.skip_upper_level_at || null,
      pharmacyReadyAt: encounter.pharmacy_ready_at || null,
      pharmacyReadyBy: encounter.pharmacy_ready_by || null,
      pharmacyNotifiedAt: encounter.pharmacy_notified_at || null,
      pharmacyNotifiedBy: encounter.pharmacy_notified_by || null,
    });
  });

  Object.values(patientMap).forEach((patient) => {
    patient.encounters.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  });

  medicationsData.forEach((medication) => {
    const patient = patientMap[medication.patient_id];
    if (!patient) return;

    patient.medicationList.push({
      id: medication.id,
      name: medication.name || "",
      dosage: medication.dosage || "",
      frequency: medication.frequency || "",
      route: medication.route || "",
      dispenseAmount: medication.dispense_amount ?? "",
      refillCount: medication.refill_count ?? "",
      instructions: medication.instructions || "",
      startedDate: medication.medication_started_at || "",
      medicationStartedAt: medication.medication_started_at || "",
      lastUpdatedEncounterId: medication.last_updated_encounter_id || null,
      isActive: medication.is_active ?? true,
    });
  });

  allergiesData.forEach((allergy) => {
    const patient = patientMap[allergy.patient_id];
    if (!patient) return;

    patient.allergyList.push({
      id: allergy.id,
      allergen: allergy.allergen || "",
      reaction: allergy.reaction || "",
      severity: allergy.severity || "",
      notes: allergy.notes || "",
      isActive: allergy.is_active ?? true,
    });
  });

  socialWorkNotesData.forEach((note) => {
    const patient = patientMap[note.patientId];
    if (!patient) return;
    patient.socialWorkNotes.push(note);
  });

  return Object.values(patientMap);
}

export function useClinicData({ authReady, session, userRole, isBoardDisplayMode = false }) {
  const [patients, setPatients] = useState([]);

  const timeoutRef = useRef(null);
  const inFlightRef = useRef(false);
  const queuedReloadRef = useRef(false);
  const lastVisibleRefreshRef = useRef(0);
  const patientsRef = useRef([]);

  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const loadData = useCallback(async () => {
    if (!authReady || !session || !userRole) return;

    if (inFlightRef.current) {
      queuedReloadRef.current = true;
      return;
    }

    inFlightRef.current = true;

    try {
      const [patientsData, encountersData, socialWorkNotesData] =
        await Promise.all([
          isBoardDisplayMode ? fetchClinicFlowPatients() : fetchPatients(),
          isBoardDisplayMode ? fetchClinicFlowEncounters() : fetchEncounters(),
          isBoardDisplayMode ? Promise.resolve([]) : fetchSocialWorkNotes(),
        ]);

      const activePatientIds = [
        ...new Set(
          (encountersData || [])
            .map((encounter) => encounter.patient_id)
            .filter(Boolean)
        ),
      ];

      const [medicationsData, allergiesData] = isBoardDisplayMode
        ? [[], []]
        : await Promise.all([
            fetchMedications(activePatientIds),
            fetchAllergies(activePatientIds),
          ]);

      setPatients(
        buildPatientMap(
          patientsData,
          encountersData,
          medicationsData,
          allergiesData,
          socialWorkNotesData
        )
      );
    } catch (error) {
      console.error("Failed loading data:", error);
    } finally {
      inFlightRef.current = false;

      if (queuedReloadRef.current) {
        queuedReloadRef.current = false;
        loadData();
      }
    }
  }, [authReady, session, userRole, isBoardDisplayMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!authReady || !session || !userRole) return;

    const triggerReload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        loadData();
      }, 250);
    };

    const applyEncounterChange = (payload) => {
      const row = payload.new;
      const encounterId = row?.id || payload.old?.id;

      if (!encounterId) {
        triggerReload();
        return;
      }

      if (payload.eventType === "DELETE") {
        setPatients((currentPatients) =>
          currentPatients.map((patient) => ({
            ...patient,
            encounters: (patient.encounters || []).filter(
              (encounter) => String(encounter.id) !== String(encounterId)
            ),
          }))
        );
        return;
      }

      if (!row?.patient_id) {
        triggerReload();
        return;
      }

      // Reuse the normal database-to-UI mapping so realtime rows have exactly
      // the same shape as rows received during a full reconciliation.
      const mappedEncounter = buildPatientMap(
        [{ id: row.patient_id }],
        [row],
        [],
        [],
        []
      )[0]?.encounters?.[0];

      if (!mappedEncounter) {
        triggerReload();
        return;
      }

      const patientFound = patientsRef.current.some(
        (patient) => String(patient.id) === String(row.patient_id)
      );

      setPatients((currentPatients) => {
        const nextPatients = currentPatients.map((patient) => {
          const withoutChangedEncounter = (patient.encounters || []).filter(
            (encounter) => String(encounter.id) !== String(encounterId)
          );

          if (String(patient.id) !== String(row.patient_id)) {
            return withoutChangedEncounter.length === patient.encounters.length
              ? patient
              : { ...patient, encounters: withoutChangedEncounter };
          }

          return {
            ...patient,
            encounters: [mappedEncounter, ...withoutChangedEncounter].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            ),
          };
        });

        return nextPatients;
      });

      // A new encounter can arrive before its patient record reaches this
      // device. Reconcile that uncommon case instead of displaying a partial row.
      if (!patientFound) {
        triggerReload();
      }
    };

    // Keep realtime focused on the live clinic flow.
    // Patients, medications, and allergies are still refreshed after local saves,
    // on window focus, and by the fallback interval below. Subscribing every
    // open device to all four tables was causing full-dataset reload storms.
    const channel = supabase
      .channel("clinic-encounters-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "encounters" },
        applyEncounterChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_work_notes" },
        triggerReload
      )
      .subscribe((status) => {
        // A display may have been disconnected while an assignment changed.
        // Refresh once whenever realtime connects or reconnects so it cannot
        // remain stuck on the pre-disconnect snapshot.
        if (status === "SUBSCRIBED" && isBoardDisplayMode) {
          triggerReload();
        }
      });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [authReady, session, userRole, loadData, isBoardDisplayMode]);

  useEffect(() => {
    if (!authReady || !session || !userRole) return;

    const refreshVisibleTab = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - lastVisibleRefreshRef.current < 15000) return;

      lastVisibleRefreshRef.current = now;
      loadData();
    };

    const fallbackInterval = setInterval(() => {
      // Hidden tabs should not keep burning Supabase Disk I/O overnight.
      refreshVisibleTab();
    }, isBoardDisplayMode ? 60000 : 120000);

    const refreshFromRoomBoardTab = (event) => {
      if (event.key === "clinic-room-board-refresh") {
        loadData();
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshVisibleTab();
      }
    };

    const refreshOnFocus = () => {
      refreshVisibleTab();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("storage", refreshFromRoomBoardTab);

    return () => {
      clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("storage", refreshFromRoomBoardTab);
    };
  }, [authReady, session, userRole, loadData, isBoardDisplayMode]);

  return {
    patients,
    setPatients,
    refreshClinicData: loadData,
  };
}
