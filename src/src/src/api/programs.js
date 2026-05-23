import { supabase } from "../lib/supabase";

function mapProgramRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id || "",
    patientName: row.patient_name || "",
    mrn: row.mrn || "",
    dob: row.dob || "",
    phone: row.phone || "",
    programType: row.program_type || "",
    reason: row.reason || "",
    assignedCoordinator: row.assigned_coordinator || "",
    status: row.status || "",
    specialtyDate: row.specialty_date || "",
    scheduleType: row.schedule_group || "",
    schedulePosition: row.schedule_position ?? null,
    appointmentSlot: row.appointment_slot || "",
    notes: row.notes || "",
    lastContactAttemptAt: row.last_contact_attempt_at || "",
    createdAt: row.created_at || "",
  };
}

export async function fetchProgramEntries() {
  const { data, error } = await supabase
    .from("program_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapProgramRow);
}

export async function createProgramEntryInSupabase(entry) {
  const payload = {
    id: entry.id,
    patient_id: entry.patientId || null,
    patient_name: entry.patientName || "",
    mrn: entry.mrn || "",
    dob: entry.dob || "",
    phone: entry.phone || "",
    program_type: entry.programType || "",
    reason: entry.reason || "",
    assigned_coordinator: entry.assignedCoordinator || "",
    status: entry.status || "",
    specialty_date: entry.specialtyDate || "",
    schedule_group: entry.scheduleType || "",
    schedule_position:
      entry.schedulePosition === null || entry.schedulePosition === undefined
        ? null
        : entry.schedulePosition,
    appointment_slot: entry.appointmentSlot || "",
    notes: entry.notes || "",
    last_contact_attempt_at: entry.lastContactAttemptAt || null,
    created_at: entry.createdAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("program_entries")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return mapProgramRow(data);
}

export async function updateProgramEntryInSupabase(entryId, updates) {
  const payload = {};

  if ("patientId" in updates) payload.patient_id = updates.patientId || null;
  if ("patientName" in updates) payload.patient_name = updates.patientName || "";
  if ("mrn" in updates) payload.mrn = updates.mrn || "";
  if ("dob" in updates) payload.dob = updates.dob || "";
  if ("phone" in updates) payload.phone = updates.phone || "";
  if ("programType" in updates) payload.program_type = updates.programType || "";
  if ("reason" in updates) payload.reason = updates.reason || "";

  if ("assignedCoordinator" in updates) {
    payload.assigned_coordinator = updates.assignedCoordinator || "";
  }

  if ("status" in updates) payload.status = updates.status || "";
  if ("specialtyDate" in updates) {
    payload.specialty_date = updates.specialtyDate || "";
  }

  if ("scheduleType" in updates) {
    payload.schedule_group = updates.scheduleType || "";
  }

  if ("schedulePosition" in updates) {
    payload.schedule_position =
      updates.schedulePosition === null ||
      updates.schedulePosition === undefined
        ? null
        : updates.schedulePosition;
  }

  if ("appointmentSlot" in updates) {
    payload.appointment_slot = updates.appointmentSlot || "";
  }

  if ("notes" in updates) payload.notes = updates.notes || "";

  if ("lastContactAttemptAt" in updates) {
    payload.last_contact_attempt_at = updates.lastContactAttemptAt || null;
  }

  const { data, error } = await supabase
    .from("program_entries")
    .update(payload)
    .eq("id", entryId)
    .select()
    .single();

  if (error) throw error;

  return mapProgramRow(data);
}

export async function deleteProgramEntryInSupabase(entryId) {
  const { error } = await supabase
    .from("program_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
}

export async function deleteProgramEntriesForPatient(
  patientId,
  patientName = "",
  patientDob = ""
) {
  let query = supabase
    .from("program_entries")
    .delete()
    .eq("patient_id", patientId);

  if (patientName && patientDob) {
    query = supabase
      .from("program_entries")
      .delete()
      .or(
        `patient_id.eq.${patientId},and(patient_name.eq.${patientName},dob.eq.${patientDob})`
      );
  }

  const { error } = await query;

  if (error) throw error;
}