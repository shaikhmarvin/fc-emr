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
  fired: row.fired ?? false,
  firedReason: row.fired_reason ?? "",
  firedAt: row.fired_at ?? "",
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
  fired: intakeForm.fired || false,
  fired_reason: intakeForm.firedReason || "",
  fired_at: intakeForm.firedAt || null,
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
  const rowToUpdate = {};

  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    const fullName = `${updates.firstName || ""} ${updates.lastName || ""}`.trim();
    rowToUpdate.name = fullName;
  }

  if (updates.preferredName !== undefined) {
    rowToUpdate.preferred_name = updates.preferredName || "";
  }

  if (updates.dob !== undefined) {
    rowToUpdate.dob = updates.dob || null;
  }

  if (updates.mrn !== undefined) {
    rowToUpdate.mrn = updates.mrn?.trim() || "";
  }

  if (updates.last4ssn !== undefined) {
    rowToUpdate.last4ssn = updates.last4ssn || "";
  }

  if (updates.phone !== undefined) {
    rowToUpdate.phone = updates.phone || "";
  }

  if (updates.pronouns !== undefined) {
    rowToUpdate.pronouns = updates.pronouns || "";
  }

  if (updates.ethnicity !== undefined) {
    rowToUpdate.ethnicity = updates.ethnicity || "";
  }

  if (updates.sex !== undefined) {
    rowToUpdate.sex = updates.sex || "";
  }

  if (updates.ttuStudent !== undefined) {
    rowToUpdate.ttu_student = updates.ttuStudent || false;
  }

  if (updates.address !== undefined) {
    rowToUpdate.address = updates.address || "";
  }

  if (updates.city !== undefined) {
    rowToUpdate.city = updates.city || "";
  }

  if (updates.state !== undefined) {
    rowToUpdate.state = updates.state || "";
  }

  if (updates.zipCode !== undefined) {
    rowToUpdate.zip_code = updates.zipCode || "";
  }

  if (updates.emergencyContactName !== undefined) {
    rowToUpdate.emergency_contact_name = updates.emergencyContactName || "";
  }

  if (updates.emergencyContactRelation !== undefined) {
    rowToUpdate.emergency_contact_relation = updates.emergencyContactRelation || "";
  }

  if (updates.emergencyContactPhone !== undefined) {
    rowToUpdate.emergency_contact_phone = updates.emergencyContactPhone || "";
  }

  if (updates.incomeRange !== undefined) {
    rowToUpdate.income_range = updates.incomeRange || "";
  }

  if (updates.spanishOnly !== undefined) {
    rowToUpdate.spanish_only = updates.spanishOnly || "";
  }

  if (updates.chronicConditions !== undefined) {
    rowToUpdate.chronic_conditions = updates.chronicConditions || [];
  }

  if (updates.chronicConditionsOther !== undefined) {
    rowToUpdate.chronic_conditions_other = updates.chronicConditionsOther || "";
  }

  if (updates.intakeStatus !== undefined) {
    rowToUpdate.intake_status = updates.intakeStatus || "";
  }

  if (updates.fired !== undefined) {
    rowToUpdate.fired = !!updates.fired;
  }

  if (updates.firedReason !== undefined) {
    rowToUpdate.fired_reason = updates.firedReason || "";
  }

  if (updates.firedAt !== undefined) {
    rowToUpdate.fired_at = updates.firedAt || null;
  }

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
  const { data, error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Patient was not deleted. This is usually caused by a missing RLS delete policy or a database relationship blocking deletion."
    );
  }

  return data;
}