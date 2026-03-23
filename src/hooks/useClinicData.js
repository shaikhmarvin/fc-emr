import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchEncounters,
  fetchMedications,
} from "../api/encounters";
import { fetchPatients } from "../api/patients";
import { fetchAllergies } from "../api/allergies";

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
      mammogramPapSmear: intake.mammogramPapSmear ?? "",
      fluShot: intake.fluShot ?? "",
      htn: intake.htn ?? false,
      dm: intake.dm ?? false,
      labsLast6Months: intake.labsLast6Months ?? "",
      tobaccoScreening: intake.tobaccoScreening ?? "",
      dermatology: intake.dermatology ?? "N/A",
      ophthalmology: intake.ophthalmology ?? "N/A",
      optometry: intake.optometry ?? "N/A",
      diabeticEyeExamPastYear: intake.diabeticEyeExamPastYear ?? "N/A",
      physicalTherapy: intake.physicalTherapy ?? "N/A",
      mentalHealthCombined: intake.mentalHealthCombined ?? "N/A",
      counseling: intake.counseling ?? "N/A",
      anyMentalHealthPositive: intake.anyMentalHealthPositive ?? false,
      status:
        encounter.status === "waiting"
          ? "Waiting"
          : encounter.status === "roomed"
          ? "Assigned"
          : encounter.status === "in_visit"
          ? "In Visit"
          : encounter.status === "done"
          ? "Completed"
          : encounter.status === "cancelled"
          ? "Cancelled"
          : "Waiting",
      assignedStudent: encounter.assigned_student || "",
      assignedUpperLevel: encounter.assigned_upper_level || "",
      roomNumber: encounter.room || "",
      notes: encounter.notes || "",
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
    });
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

function mapEncounterRow(encounter) {
  const intake = encounter.intake_data || {};

  return {
    id: encounter.id,
    clinicDate: encounter.clinic_date,
    createdAt: encounter.created_at,
    newReturning: intake.newReturning ?? "Returning",
    visitLocation: intake.visitLocation ?? "In Clinic",
    chiefComplaint: encounter.chief_complaint || "",
    transportation: intake.transportation ?? "",
    needsElevator: intake.needsElevator ?? false,
    spanishSpeaking: intake.spanishSpeaking ?? false,
    mammogramPapSmear: intake.mammogramPapSmear ?? "",
    fluShot: intake.fluShot ?? "",
    htn: intake.htn ?? false,
    dm: intake.dm ?? false,
    labsLast6Months: intake.labsLast6Months ?? "",
    tobaccoScreening: intake.tobaccoScreening ?? "",
    dermatology: intake.dermatology ?? "N/A",
    ophthalmology: intake.ophthalmology ?? "N/A",
    optometry: intake.optometry ?? "N/A",
    diabeticEyeExamPastYear: intake.diabeticEyeExamPastYear ?? "N/A",
    physicalTherapy: intake.physicalTherapy ?? "N/A",
    mentalHealthCombined: intake.mentalHealthCombined ?? "N/A",
    counseling: intake.counseling ?? "N/A",
    anyMentalHealthPositive: intake.anyMentalHealthPositive ?? false,
    status:
      encounter.status === "waiting"
        ? "Waiting"
        : encounter.status === "roomed"
        ? "Assigned"
        : encounter.status === "in_visit"
        ? "In Visit"
        : encounter.status === "done"
        ? "Completed"
        : encounter.status === "cancelled"
        ? "Cancelled"
        : "Waiting",
    assignedStudent: encounter.assigned_student || "",
    assignedUpperLevel: encounter.assigned_upper_level || "",
    roomNumber: encounter.room || "",
    notes: encounter.notes || "",
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
  };
}

export function useClinicData({
  authReady,
  session,
  userRole,
  selectedEncounterId,
}) {
  const [patients, setPatients] = useState([]);

const [isLoaded, setIsLoaded] = useState(false);

useEffect(() => {
  if (!authReady || !session || !userRole || isLoaded) return;

  async function loadData() {
    try {
      const patientsData = await fetchPatients();
      const encountersData = await fetchEncounters();
      const medicationsData = await fetchMedications();
      const allergiesData = await fetchAllergies();

      setPatients(
        buildPatientMap(
          patientsData,
          encountersData,
          medicationsData,
          allergiesData
        )
      );

      setIsLoaded(true); // 👈 IMPORTANT
    } catch (error) {
      console.error("Failed loading data:", error);
    }
  }

  loadData();
}, [authReady, session, userRole, isLoaded]);

  return {
    patients,
    setPatients,
  };
}