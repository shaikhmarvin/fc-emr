import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { fetchEncounters, fetchMedications } from "../api/encounters";
import { fetchPatients } from "../api/patients";
import { fetchAllergies } from "../api/allergies";
import { mapDbStatusToUi } from "../utils";

function buildPatientMap(patientsData, encountersData, medicationsData, allergiesData) {
  const patientMap = {};

  patientsData.forEach((patient) => {
    patientMap[patient.id] = {
      ...patient,
      encounters: [],
      allergyList: [],
      medicationList: [],
    };
  });

  encountersData.forEach((encounter) => {
    const patient = patientMap[encounter.patient_id];
    if (!patient) return;

    const intake = encounter.intake_data || {};
    const visitType = intake.visitType || "general";
    const specialtyType = intake.specialtyType || "";
    const dualVisit = intake.dualVisit ?? false;

    patient.encounters.push({
      id: encounter.id,
      clinicDate: encounter.clinic_date,
      createdAt: encounter.created_at,
      undergradCompletedAt: encounter.undergrad_completed_at || null,
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
      visitType,
      specialtyType,
      dualVisit,
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

  return Object.values(patientMap);
}

export function useClinicData({ authReady, session, userRole }) {
  const [patients, setPatients] = useState([]);

  const timeoutRef = useRef(null);
  const inFlightRef = useRef(false);
  const queuedReloadRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!authReady || !session || !userRole) return;

    if (inFlightRef.current) {
      queuedReloadRef.current = true;
      return;
    }

    inFlightRef.current = true;

    try {
      const [patientsData, encountersData, medicationsData, allergiesData] =
        await Promise.all([
          fetchPatients(),
          fetchEncounters(),
          fetchMedications(),
          fetchAllergies(),
        ]);

      setPatients(
        buildPatientMap(
          patientsData,
          encountersData,
          medicationsData,
          allergiesData
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
  }, [authReady, session, userRole]);

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

    const channel = supabase
      .channel("clinic-data-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        triggerReload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "encounters" },
        triggerReload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medications" },
        triggerReload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allergies" },
        triggerReload
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [authReady, session, userRole, loadData]);

  useEffect(() => {
    if (!authReady || !session || !userRole) return;

    const fallbackInterval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(fallbackInterval);
  }, [authReady, session, userRole, loadData]);

  return {
    patients,
    setPatients,
    refreshClinicData: loadData,
  };
}