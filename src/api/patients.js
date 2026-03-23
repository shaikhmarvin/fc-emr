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
      address: row.address ?? "",
  city: row.city ?? "",
  state: row.state ?? "",
  zipCode: row.zip_code ?? "",
  emergencyContactName: row.emergency_contact_name ?? "",
  emergencyContactRelation: row.emergency_contact_relation ?? "",
  emergencyContactPhone: row.emergency_contact_phone ?? "",
  incomeRange: row.income_range ?? "",
  spanishOnly: row.spanish_only ?? "",
  chronicConditions: row.chronic_conditions ?? [],
  chronicConditionsOther: row.chronic_conditions_other ?? "",
  intakeStatus: row.intake_status ?? "",
    medications: [],
    encounters: [],
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
  mrn: intakeForm.mrn?.trim() || "",
  last4ssn: intakeForm.last4Ssn || "",
  phone: intakeForm.phone || "",
  pronouns: intakeForm.pronouns || "",
  ethnicity: intakeForm.ethnicity || "",
  sex: intakeForm.sex || "",
  ttu_student: intakeForm.ttuStudent || false,
  chief_complaint: intakeForm.chiefComplaint || "",

  address: intakeForm.addressLine1 || "",
  city: intakeForm.city || "",
  state: intakeForm.state || "",
  zip_code: intakeForm.zipCode || "",

  emergency_contact_name: intakeForm.emergencyContactName || "",
  emergency_contact_relation: intakeForm.emergencyContactRelation || "",
  emergency_contact_phone: intakeForm.emergencyContactPhone || "",

  income_range: intakeForm.incomeRange || "",
  spanish_only: intakeForm.spanishOnly || "",
  chronic_conditions: intakeForm.chronicConditions || [],
  chronic_conditions_other: intakeForm.chronicConditionsOther || "",

  intake_status: intakeForm.intakeStatus || "undergrad-complete",
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

  address: updates.address || "",
  city: updates.city || "",
  state: updates.state || "",
  zip_code: updates.zipCode || "",

  emergency_contact_name: updates.emergencyContactName || "",
  emergency_contact_relation: updates.emergencyContactRelation || "",
  emergency_contact_phone: updates.emergencyContactPhone || "",

  income_range: updates.incomeRange || "",
  spanish_only: updates.spanishOnly || "",
  chronic_conditions: updates.chronicConditions || [],
  chronic_conditions_other: updates.chronicConditionsOther || "",

  intake_status: updates.intakeStatus || "",
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

export async function deletePatientInSupabase(patientId) {
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId);

  if (error) throw error;
}