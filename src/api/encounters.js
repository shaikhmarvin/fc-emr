import { supabase } from "../lib/supabase";

export async function fetchEncounters() {
  const { data, error } = await supabase
    .from("encounters")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

function buildIntakeData(encounter) {
  return {
    newReturning: encounter.newReturning ?? "Returning",
    visitLocation: encounter.visitLocation ?? "In Clinic",
    transportation: encounter.transportation ?? "",
    needsElevator: encounter.needsElevator ?? false,
    spanishSpeaking: encounter.spanishSpeaking ?? false,
    mammogramStatus: encounter.mammogramStatus ?? encounter.mammogramPapSmear ?? "",
    papStatus: encounter.papStatus ?? "",
    fluShot: encounter.fluShot ?? "",
    htn: encounter.htn ?? false,
    dm: encounter.dm ?? false,
    labsLast6Months: encounter.labsLast6Months ?? "",
    nicotineUse: encounter.nicotineUse || "",
    nicotineDetails: encounter.nicotineDetails || "",
    substanceUseConcern: encounter.substanceUseConcern || "",
    substanceUseTreatment: encounter.substanceUseTreatment || "",
    substanceUseNotes: encounter.substanceUseNotes || "",
    dermatology: encounter.dermatology ?? "N/A",
    ophthalmology: encounter.ophthalmology ?? "N/A",
    optometry: encounter.optometry ?? "N/A",
    diabeticEyeExamPastYear: encounter.diabeticEyeExamPastYear ?? "N/A",
    physicalTherapy: encounter.physicalTherapy ?? "N/A",
    mentalHealthCombined: encounter.mentalHealthCombined ?? "N/A",
    counseling: encounter.counseling ?? "N/A",
    anyMentalHealthPositive: encounter.anyMentalHealthPositive ?? false,
    visitType: encounter.visitType ?? "general",
    specialtyType: encounter.specialtyType ?? "",
  };
}

export async function createEncounterInSupabase(patientId, encounter) {
  const row = {
  patient_id: patientId,
  clinic_date: encounter.clinicDate,
  chief_complaint: encounter.chiefComplaint || "",
  status: mapUiStatusToDb(encounter.status || "Waiting"),
  room: encounter.roomNumber || "",
  notes: encounter.notes || "",
  intake_data: buildIntakeData(encounter),
  leadership_intake_complete: encounter.leadershipIntakeComplete ?? false,
};

  const { data, error } = await supabase
    .from("encounters")
    .insert([row])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateEncounterInSupabase(encounterId, updates) {
  const payload = {};

  if (updates.chiefComplaint !== undefined) {
    payload.chief_complaint = updates.chiefComplaint;
  }

  if (updates.roomNumber !== undefined) {
    payload.room = updates.roomNumber || "";
  }

  if (updates.soapSubjective !== undefined) {
    payload.hpi = updates.soapSubjective;
  }

  if (updates.soapObjective !== undefined) {
    payload.objective = updates.soapObjective;
  }

  if (updates.soapAssessment !== undefined) {
    payload.assessment = updates.soapAssessment;
  }

  if (updates.soapPlan !== undefined) {
    payload.plan = updates.soapPlan;
  }

  if (updates.notes !== undefined) {
    payload.notes = updates.notes;
  }

  if (updates.leadershipIntakeComplete !== undefined) {
  payload.leadership_intake_complete = updates.leadershipIntakeComplete;
}

  if (updates.vitalsHistory !== undefined) {
    payload.vitals = updates.vitalsHistory;
  }

    if (updates.inHouseLabs !== undefined) {
    payload.in_house_labs = updates.inHouseLabs;
  }

  if (updates.sendOutLabs !== undefined) {
    payload.send_out_labs = updates.sendOutLabs;
  }

  if (updates.status !== undefined) {
    payload.status = mapUiStatusToDb(updates.status);
  }

  if (updates.assignedStudent !== undefined) {
    payload.assigned_student = updates.assignedStudent;
  }

  if (updates.assignedUpperLevel !== undefined) {
    payload.assigned_upper_level = updates.assignedUpperLevel;
  }

  if (updates.soapStatus !== undefined) {
    payload.soap_status = updates.soapStatus;
  }

  if (updates.soapAuthorId !== undefined) {
    payload.soap_author_id = updates.soapAuthorId;
  }

  if (updates.soapAuthorRole !== undefined) {
    payload.soap_author_role = updates.soapAuthorRole;
  }

  if (updates.upperLevelSignedBy !== undefined) {
    payload.upper_level_signed_by = updates.upperLevelSignedBy;
  }

  if (updates.upperLevelSignedAt !== undefined) {
    payload.upper_level_signed_at = updates.upperLevelSignedAt;
  }

  if (updates.attendingSignedBy !== undefined) {
    payload.attending_signed_by = updates.attendingSignedBy;
  }

  if (updates.attendingSignedAt !== undefined) {
    payload.attending_signed_at = updates.attendingSignedAt;
  }

  const intakeFields = [
  "newReturning",
  "visitLocation",
  "transportation",
  "needsElevator",
  "spanishSpeaking",
  "mammogramStatus",
  "papStatus",
  "fluShot",
  "htn",
  "dm",
  "labsLast6Months",
  "nicotineUse",
  "nicotineDetails",
  "substanceUseConcern",
  "substanceUseTreatment",
  "substanceUseNotes",
  "dermatology",
  "ophthalmology",
  "optometry",
  "diabeticEyeExamPastYear",
  "physicalTherapy",
  "mentalHealthCombined",
  "counseling",
  "anyMentalHealthPositive",
  "visitType",
  "specialtyType",
];

  const hasIntakeUpdates = intakeFields.some(
    (field) => updates[field] !== undefined
  );

  if (hasIntakeUpdates) {
    payload.intake_data = {
  newReturning: updates.newReturning ?? "Returning",
  visitLocation: updates.visitLocation ?? "In Clinic",
  transportation: updates.transportation ?? "",
  needsElevator: updates.needsElevator ?? false,
  spanishSpeaking: updates.spanishSpeaking ?? false,
  mammogramStatus: updates.mammogramStatus ?? "",
  papStatus: updates.papStatus ?? "",
  fluShot: updates.fluShot ?? "",
  htn: updates.htn ?? false,
  dm: updates.dm ?? false,
  labsLast6Months: updates.labsLast6Months ?? "",
  nicotineUse: updates.nicotineUse ?? "",
  nicotineDetails: updates.nicotineDetails ?? "",
  substanceUseConcern: updates.substanceUseConcern ?? "",
  substanceUseTreatment: updates.substanceUseTreatment ?? "",
  substanceUseNotes: updates.substanceUseNotes ?? "",
  dermatology: updates.dermatology ?? "N/A",
  ophthalmology: updates.ophthalmology ?? "N/A",
  optometry: updates.optometry ?? "N/A",
  diabeticEyeExamPastYear: updates.diabeticEyeExamPastYear ?? "N/A",
  physicalTherapy: updates.physicalTherapy ?? "N/A",
  mentalHealthCombined: updates.mentalHealthCombined ?? "N/A",
  counseling: updates.counseling ?? "N/A",
  anyMentalHealthPositive: updates.anyMentalHealthPositive ?? false,
  visitType: updates.visitType ?? "general",
  specialtyType: updates.specialtyType ?? "",
};
  }

  const { error } = await supabase
  .from("encounters")
  .update(payload)
  .eq("id", encounterId);

if (error) throw error;

return { id: encounterId, ...updates };
}

function mapUiStatusToDb(status) {
  switch (status) {
    case "started":
      return "started";
    case "undergrad_complete":
      return "undergrad_complete";
    case "ready":
      return "ready";
    case "roomed":
    case "Assigned":
      return "roomed";
    case "in_visit":
    case "In Visit":
      return "in_visit";
    case "done":
    case "Completed":
      return "done";
    case "cancelled":
    case "Cancelled":
      return "cancelled";
    case "waiting":
    case "Waiting":
      return "started";
    default:
      return "started";
  }
}

function mapDbStatusToUi(status) {
  switch (status) {
    case "started":
      return "started";
    case "undergrad_complete":
      return "undergrad_complete";
    case "ready":
      return "ready";
    case "roomed":
      return "roomed";
    case "in_visit":
      return "in_visit";
    case "done":
      return "done";
    case "cancelled":
      return "cancelled";
    default:
      return "started";
  }
}

export async function fetchMedications() {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function createMedicationInSupabase(patientId, medication, encounterId = null) {
  const row = {
    patient_id: patientId,
    encounter_id: encounterId,
    last_updated_encounter_id: encounterId,
    name: medication.name || "",
    dosage: medication.dosage || "",
    frequency: medication.frequency || "",
    route: medication.route || "",
    dispense_amount:
      medication.dispenseAmount === "" || medication.dispenseAmount === null
        ? null
        : Number(medication.dispenseAmount),
    refill_count:
      medication.refillCount === "" || medication.refillCount === null
        ? null
        : Number(medication.refillCount),
    instructions: medication.instructions || "",
    is_active: medication.isActive ?? true,
  };

  const { data, error } = await supabase
    .from("medications")
    .insert([row])
    .select()
    .single();

  if (error) throw error;
  return data;
}
export async function updateMedicationInSupabase(medicationId, updates) {
  const payload = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.dosage !== undefined) payload.dosage = updates.dosage;
  if (updates.frequency !== undefined) payload.frequency = updates.frequency;
  if (updates.route !== undefined) payload.route = updates.route;
  if (updates.dispenseAmount !== undefined) {
    payload.dispense_amount =
      updates.dispenseAmount === "" || updates.dispenseAmount === null
        ? null
        : Number(updates.dispenseAmount);
  }
  if (updates.refillCount !== undefined) {
    payload.refill_count =
      updates.refillCount === "" || updates.refillCount === null
        ? null
        : Number(updates.refillCount);
  }
  if (updates.instructions !== undefined) payload.instructions = updates.instructions;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.lastUpdatedEncounterId !== undefined) {
    payload.last_updated_encounter_id = updates.lastUpdatedEncounterId;
  }

  const { data, error } = await supabase
    .from("medications")
    .update(payload)
    .eq("id", medicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMedicationInSupabase(medicationId) {
  const { error } = await supabase
    .from("medications")
    .delete()
    .eq("id", medicationId);

  if (error) throw error;
}

export async function deleteEncounterInSupabase(encounterId) {
  const { error } = await supabase.rpc("delete_encounter_tree", {
    target_encounter_id: encounterId,
  });

  if (error) throw error;
}

export async function createRefillRequest(
  patientId,
  medicationId,
  userId,
  requestPayload = null
) {
  const { data, error } = await supabase
    .from("refill_requests")
    .insert([{
      patient_id: patientId,
      medication_id: medicationId,
      requested_by: userId,
      request_payload: requestPayload,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


export async function approveRefillRequestInSupabase(
  refillRequestId,
  approvedBy
) {
  const approvedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("refill_requests")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: approvedAt,
    })
    .eq("id", refillRequestId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteRefillRequestInSupabase(refillRequestId) {
  const { error } = await supabase
    .from("refill_requests")
    .delete()
    .eq("id", refillRequestId);

  if (error) throw error;
}

export async function fetchRefillRequests() {
  const { data, error } = await supabase
    .from("refill_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

