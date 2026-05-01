import { supabase } from "../lib/supabase";

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

function mapEncounterRow(row) {
  const intake = row.intake_data || {};

  return {
    id: row.id,
    patientId: row.patient_id,
    clinicDate: row.clinic_date || "",
    createdAt: row.created_at || "",
    chiefComplaint: row.chief_complaint || "",
    status: mapDbStatusToUi(row.status),
    roomNumber: row.room || "",
    notes: row.notes || "",

    dailyNumber: intake.dailyNumber ?? "",
    newReturning: intake.newReturning ?? "Returning",
    visitLocation: intake.visitLocation ?? "In Clinic",
    transportation: intake.transportation ?? "",
    needsElevator: intake.needsElevator ?? false,
    spanishSpeaking: intake.spanishSpeaking ?? false,
    mammogramStatus: intake.mammogramStatus ?? "",
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
    visitType: intake.visitType ?? "general",
    specialtyType: intake.specialtyType ?? "",

    leadershipIntakeComplete: row.leadership_intake_complete ?? false,

    soapSubjective: row.hpi || "",
    soapObjective: row.objective || "",
    soapAssessment: row.assessment || "",
    soapPlan: row.plan || "",

        soapStatus: row.soap_status || "draft",
    soapAuthorId: row.soap_author_id || null,
    soapAuthorRole: row.soap_author_role || "",
    upperLevelSignedBy: row.upper_level_signed_by || null,
    upperLevelSignedAt: row.upper_level_signed_at || null,
    attendingSignedBy: row.attending_signed_by || null,
    attendingSignedAt: row.attending_signed_at || null,
    skipUpperLevel: row.skip_upper_level ?? false,
    skipUpperLevelBy: row.skip_upper_level_by || null,
    skipUpperLevelAt: row.skip_upper_level_at || null,

    vitalsHistory: row.vitals || [],
    inHouseLabs: row.in_house_labs || {},
    importedSendOutLabs: row.imported_send_out_labs || [],

    ophthalmologyNote: {
      ...EMPTY_OPHTHO_NOTE,
      ...(row.ophthalmology_note || {}),
    },
  };
}

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
    dailyNumber: encounter.dailyNumber ?? "",
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
dualVisit: encounter.dualVisit ?? false,
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
    hpi: encounter.soapSubjective || "",
    objective: encounter.soapObjective || "",
    assessment: encounter.soapAssessment || "",
    plan: encounter.soapPlan || "",
    soap_status: encounter.soapStatus || "draft",
    ophthalmology_note: encounter.ophthalmologyNote || null,
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

    if (updates.importedSendOutLabs !== undefined) {
    payload.imported_send_out_labs = updates.importedSendOutLabs;
  }

  if (updates.imported_send_out_labs !== undefined) {
    payload.imported_send_out_labs = updates.imported_send_out_labs;
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

  if (updates.skipUpperLevel !== undefined) {
    payload.skip_upper_level = updates.skipUpperLevel;
  }

  if (updates.skipUpperLevelBy !== undefined) {
    payload.skip_upper_level_by = updates.skipUpperLevelBy;
  }

  if (updates.skipUpperLevelAt !== undefined) {
    payload.skip_upper_level_at = updates.skipUpperLevelAt;
  }

  if (updates.pharmacyStatus !== undefined) {
  payload.pharmacy_status = updates.pharmacyStatus;
}

if (updates.pharmacyReadyAt !== undefined) {
  payload.pharmacy_ready_at = updates.pharmacyReadyAt;
}

if (updates.pharmacyReadyBy !== undefined) {
  payload.pharmacy_ready_by = updates.pharmacyReadyBy;
}

if (updates.pharmacyNotifiedAt !== undefined) {
  payload.pharmacy_notified_at = updates.pharmacyNotifiedAt;
}

if (updates.pharmacyNotifiedBy !== undefined) {
  payload.pharmacy_notified_by = updates.pharmacyNotifiedBy;
}

  if (updates.ophthalmologyNote !== undefined) {
    payload.ophthalmology_note = updates.ophthalmologyNote;
  }

  const intakeFields = [
    "dailyNumber",
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
"dualVisit",
  ];

  const hasIntakeUpdates = intakeFields.some(
    (field) => updates[field] !== undefined
  );

  if (hasIntakeUpdates) {
  const { data: existingEncounter, error: existingError } = await supabase
    .from("encounters")
    .select("intake_data")
    .eq("id", encounterId)
    .maybeSingle();

  if (existingError) throw existingError;

  const currentIntake = existingEncounter?.intake_data || {};

  payload.intake_data = {
    ...currentIntake,
    dailyNumber: updates.dailyNumber ?? currentIntake.dailyNumber ?? "",
    newReturning: updates.newReturning ?? currentIntake.newReturning ?? "Returning",
    visitLocation: updates.visitLocation ?? currentIntake.visitLocation ?? "In Clinic",
    transportation: updates.transportation ?? currentIntake.transportation ?? "",
    needsElevator: updates.needsElevator ?? currentIntake.needsElevator ?? false,
    spanishSpeaking: updates.spanishSpeaking ?? currentIntake.spanishSpeaking ?? false,
    mammogramStatus: updates.mammogramStatus ?? currentIntake.mammogramStatus ?? "",
    papStatus: updates.papStatus ?? currentIntake.papStatus ?? "",
    fluShot: updates.fluShot ?? currentIntake.fluShot ?? "",
    htn: updates.htn ?? currentIntake.htn ?? false,
    dm: updates.dm ?? currentIntake.dm ?? false,
    labsLast6Months: updates.labsLast6Months ?? currentIntake.labsLast6Months ?? "",
    nicotineUse: updates.nicotineUse ?? currentIntake.nicotineUse ?? "",
    nicotineDetails: updates.nicotineDetails ?? currentIntake.nicotineDetails ?? "",
    substanceUseConcern:
      updates.substanceUseConcern ?? currentIntake.substanceUseConcern ?? "",
    substanceUseTreatment:
      updates.substanceUseTreatment ?? currentIntake.substanceUseTreatment ?? "",
    substanceUseNotes:
      updates.substanceUseNotes ?? currentIntake.substanceUseNotes ?? "",
    dermatology: updates.dermatology ?? currentIntake.dermatology ?? "N/A",
    ophthalmology: updates.ophthalmology ?? currentIntake.ophthalmology ?? "N/A",
    optometry: updates.optometry ?? currentIntake.optometry ?? "N/A",
    diabeticEyeExamPastYear:
      updates.diabeticEyeExamPastYear ??
      currentIntake.diabeticEyeExamPastYear ??
      "N/A",
    physicalTherapy:
      updates.physicalTherapy ?? currentIntake.physicalTherapy ?? "N/A",
    mentalHealthCombined:
      updates.mentalHealthCombined ?? currentIntake.mentalHealthCombined ?? "N/A",
    counseling: updates.counseling ?? currentIntake.counseling ?? "N/A",
    anyMentalHealthPositive:
      updates.anyMentalHealthPositive ??
      currentIntake.anyMentalHealthPositive ??
      false,
    visitType: updates.visitType ?? currentIntake.visitType ?? "general",
    specialtyType: updates.specialtyType ?? currentIntake.specialtyType ?? "",
dualVisit: updates.dualVisit ?? currentIntake.dualVisit ?? false,
  };
}
  
  if (Object.keys(payload).length === 0) {
    throw new Error("No encounter fields were provided for update.");
  }
  const { data, error } = await supabase
    .from("encounters")
    .update(payload)
    .eq("id", encounterId)
    .select()
    .single();

  if (error) throw error;

  return data;
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
medication_started_at:
  medication.medicationStartedAt ||
  medication.startedDate ||
  null,
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

if (
  updates.medicationStartedAt !== undefined ||
  updates.startedDate !== undefined ||
  updates.medication_started_at !== undefined
) {
  payload.medication_started_at =
    updates.medicationStartedAt ||
    updates.startedDate ||
    updates.medication_started_at ||
    null;
}

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

export async function fetchEncountersByPatient(patientId) {
  const { data, error } = await supabase
    .from("encounters")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

