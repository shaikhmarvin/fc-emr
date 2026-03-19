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

  useEffect(() => {
    if (!authReady || !session || !userRole) return;

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
      } catch (error) {
        console.error("Failed loading data:", error);
      }
    }

    loadData();
  }, [authReady, session, userRole]);

  useEffect(() => {
    if (!authReady || !session || !userRole) return;

    const channel = supabase
      .channel("clinic-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "encounters",
        },
        (payload) => {
          console.log("Realtime encounter update → targeted update", payload);

          const eventType = payload.eventType;
          const newEncounter = payload.new;
          const oldEncounter = payload.old;

          if (eventType === "DELETE" && oldEncounter?.id) {
            setPatients((prevPatients) =>
              prevPatients.map((patient) => ({
                ...patient,
                encounters: patient.encounters.filter(
                  (encounter) => encounter.id !== oldEncounter.id
                ),
              }))
            );
            return;
          }

          if ((eventType === "INSERT" || eventType === "UPDATE") && newEncounter?.id) {
            const mappedEncounter = mapEncounterRow(newEncounter);

            setPatients((prevPatients) =>
              prevPatients.map((patient) => {
                if (patient.id === newEncounter.patient_id) {
                  const existingEncounter = patient.encounters.find(
                    (encounter) => encounter.id === newEncounter.id
                  );

                  let nextEncounter = mappedEncounter;

                  if (
                    selectedEncounterId &&
                    mappedEncounter.id === selectedEncounterId &&
                    existingEncounter
                  ) {
                    nextEncounter = {
                      ...mappedEncounter,
                      soapSubjective: existingEncounter.soapSubjective,
                      soapObjective: existingEncounter.soapObjective,
                      soapAssessment: existingEncounter.soapAssessment,
                      soapPlan: existingEncounter.soapPlan,
                      notes: existingEncounter.notes,
                      medications: existingEncounter.medications || [],
                    };
                  } else if (existingEncounter) {
                    nextEncounter = {
                      ...mappedEncounter,
                      medications: existingEncounter.medications || [],
                    };
                  }

                  if (existingEncounter) {
                    return {
                      ...patient,
                      encounters: patient.encounters.map((encounter) =>
                        encounter.id === newEncounter.id ? nextEncounter : encounter
                      ),
                    };
                  }

                  return {
                    ...patient,
                    encounters: [nextEncounter, ...patient.encounters],
                  };
                }

                return {
                  ...patient,
                  encounters: patient.encounters.filter(
                    (encounter) => encounter.id !== newEncounter.id
                  ),
                };
              })
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medications",
        },
        async (payload) => {
          console.log("Realtime medication update → targeted update", payload);

          const newMed = payload.new;
          const eventType = payload.eventType;

          if (eventType === "INSERT" || eventType === "UPDATE") {
            setPatients((prevPatients) =>
              prevPatients.map((patient) => ({
                ...patient,
                encounters: patient.encounters.map((encounter) => {
                  if (!newMed || encounter.id !== newMed.encounter_id) {
                    return encounter;
                  }

                  let meds = encounter.medications || [];
                  const exists = meds.find((m) => m.id === newMed.id);

                  if (exists) {
                    meds = meds.map((m) =>
                      m.id === newMed.id
                        ? {
                            id: newMed.id,
                            name: newMed.name || "",
                            dosage: newMed.dosage || "",
                            frequency: newMed.frequency || "",
                            route: newMed.route || "",
                            isActive: newMed.is_active ?? true,
                          }
                        : m
                    );
                  } else {
                    meds = [
                      ...meds,
                      {
                        id: newMed.id,
                        name: newMed.name || "",
                        dosage: newMed.dosage || "",
                        frequency: newMed.frequency || "",
                        route: newMed.route || "",
                        isActive: newMed.is_active ?? true,
                      },
                    ];
                  }

                  return {
                    ...encounter,
                    medications: meds,
                  };
                }),
              }))
            );

            return;
          }

          if (eventType === "DELETE") {
            try {
              const medicationsData = await fetchMedications();

              setPatients((prevPatients) =>
                prevPatients.map((patient) => ({
                  ...patient,
                  encounters: patient.encounters.map((encounter) => {
                    const medsForEncounter = medicationsData
                      .filter((med) => med.encounter_id === encounter.id)
                      .map((med) => ({
                        id: med.id,
                        name: med.name || "",
                        dosage: med.dosage || "",
                        frequency: med.frequency || "",
                        route: med.route || "",
                        isActive: med.is_active ?? true,
                      }));

                    return {
                      ...encounter,
                      medications: medsForEncounter,
                    };
                  }),
                }))
              );
            } catch (error) {
              console.error("Realtime medication delete refresh failed:", error);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allergies",
        },
        async () => {
          try {
            const allergiesData = await fetchAllergies();

            setPatients((prevPatients) =>
              prevPatients.map((patient) => ({
                ...patient,
                allergyList: allergiesData
                  .filter((allergy) => allergy.patient_id === patient.id)
                  .map((allergy) => ({
                    id: allergy.id,
                    allergen: allergy.allergen || "",
                    reaction: allergy.reaction || "",
                    severity: allergy.severity || "",
                    notes: allergy.notes || "",
                    isActive: allergy.is_active ?? true,
                  })),
              }))
            );
          } catch (error) {
            console.error("Realtime allergy refresh failed:", error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authReady, session, userRole, selectedEncounterId]);

  return {
    patients,
    setPatients,
  };
}