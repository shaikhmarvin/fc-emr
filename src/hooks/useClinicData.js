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
    };
  });

  encountersData.forEach((encounter) => {
    const patient = patientMap[encounter.patient_id];
    if (!patient) return;

    const intake = encounter.intake_data || {};
    const visitType = intake.visitType || "general";
    const specialtyType = intake.specialtyType || "";

    patient.encounters.push({
      id: encounter.id,
      clinicDate: encounter.clinic_date,
      createdAt: encounter.created_at,
      newReturning: intake.newReturning ?? "Returning",
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
      medications: [],
      vitalsHistory: encounter.vitals || [],
      soapSubjective: encounter.hpi || "",
      soapObjective: encounter.objective || "",
      soapAssessment: encounter.assessment || "",
      soapPlan: encounter.plan || "",
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
      leadershipIntakeComplete: encounter.leadership_intake_complete ?? false,
    });

  });

  Object.values(patientMap).forEach((patient) => {
    patient.encounters.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  });

  medicationsData.forEach((medication) => {
    Object.values(patientMap).forEach((patient) => {
      const encounter = patient.encounters.find(
        (enc) => enc.id === medication.encounter_id
      );

      if (!encounter) return;

      encounter.medications.push({
        id: medication.id,
        name: medication.name || "",
        dosage: medication.dosage || "",
        frequency: medication.frequency || "",
        route: medication.route || "",
        isActive: medication.is_active ?? true,
      });
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
  const loadData = useCallback(async () => {
    if (!authReady || !session || !userRole) return;

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
    }
  }, [authReady, session, userRole]);

  useEffect(() => {
    loadData().then(() => {
    });
  }, [loadData]);

  useEffect(() => {
    if (!authReady || !session || !userRole) return;



    const triggerReload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        loadData();
      }, 50);
    };


    const channel = supabase
      .channel("clinic-data-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        (payload) => {
          console.log("REALTIME patients:", payload);
          triggerReload();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "encounters" },
        (payload) => {
          console.log("REALTIME encounters:", payload);
          triggerReload();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medications" },
        (payload) => {
          console.log("REALTIME medications:", payload);
          triggerReload();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allergies" },
        (payload) => {
          console.log("REALTIME allergies:", payload);
          triggerReload();
        }
      )
      .subscribe((status) => {
        console.log("clinic-data-realtime status:", status);
      });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [authReady, session, userRole, loadData]);

  useEffect(() => {
  if (!authReady || !session || !userRole) return;

  const interval = setInterval(() => {
    loadData();
  }, 3000);

  return () => clearInterval(interval);
}, [authReady, session, userRole, loadData]);

  return {
    patients,
    setPatients,
    refreshClinicData: loadData,
  };
}