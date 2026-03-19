import { supabase } from "../lib/supabase";

function splitName(fullName = "") {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  const lastPart = parts[parts.length - 1].toLowerCase();

  if (parts.length >= 3 && suffixes.has(lastPart)) {
    return {
      firstName: parts.slice(0, -2).join(" "),
      lastName: parts.slice(-2).join(" "),
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function mapPatientFromSupabase(row) {
  const { firstName, lastName } = splitName(row.name || "");
  const dob = row.dob ?? "";
  const age = dob
    ? String(new Date().getFullYear() - new Date(dob).getFullYear())
    : "";

  return {
    id: row.id,
    mrn: row.mrn ?? "",
    firstName,
    preferredName: row.preferred_name ?? "",
    lastName,
    dob,
    age,
    last4ssn: row.last4ssn ?? "",
    phone: row.phone ?? "",
    pronouns: row.pronouns ?? "",
    ethnicity: row.ethnicity ?? "",
    sex: row.sex ?? "",
    ttuStudent: row.ttu_student ?? false,
    chiefComplaint: row.chief_complaint ?? "",
    medications: [],
    encounters: [
      {
        id: `temp-${row.id}`,
        clinicDate: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString(),
        status: "Waiting",
        assignedStudent: "",
        assignedUpperLevel: "",
        roomNumber: "",
        transportation: "",
        needsElevator: false,
        spanishSpeaking: false,
        chiefComplaint: row.chief_complaint ?? "",
        notes: "",
        vitalsHistory: [],
        soapSubjective: "",
        soapObjective: "",
        soapAssessment: "",
        soapPlan: "",
        soapSavedAt: "",
      },
    ],
  };
}

export async function fetchPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapPatientFromSupabase);
}

export async function createPatientInSupabase(intakeForm) {
  const fullName = `${intakeForm.firstName || ""} ${intakeForm.lastName || ""}`.trim();

  const rowToInsert = {
    name: fullName,
    preferred_name: intakeForm.preferredName || "",
    dob: intakeForm.dob,
    mrn: intakeForm.mrn.trim(),
    last4ssn: intakeForm.last4ssn || "",
    phone: intakeForm.phone || "",
    pronouns: intakeForm.pronouns || "",
    ethnicity: intakeForm.ethnicity || "",
    sex: intakeForm.sex || "",
    ttu_student: intakeForm.ttuStudent || false,
    chief_complaint: intakeForm.chiefComplaint || "",
  };

  const { data, error } = await supabase
    .from("patients")
    .insert([rowToInsert])
    .select()
    .single();

  if (error) throw error;

  return mapPatientFromSupabase(data);
}

export async function updatePatientInSupabase(patientId, updates) {
  const fullName = `${updates.firstName || ""} ${updates.lastName || ""}`.trim();

  const rowToUpdate = {
    name: fullName,
    preferred_name: updates.preferredName || "",
    dob: updates.dob,
    mrn: updates.mrn?.trim() || "",
    last4ssn: updates.last4ssn || "",
    phone: updates.phone || "",
    pronouns: updates.pronouns || "",
    ethnicity: updates.ethnicity || "",
    sex: updates.sex || "",
    ttu_student: updates.ttuStudent || false,
  };

  const { data, error } = await supabase
    .from("patients")
    .update(rowToUpdate)
    .eq("id", patientId)
    .select()
    .single();

  if (error) throw error;

  return mapPatientFromSupabase(data);
}