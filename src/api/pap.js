import { supabase } from "../lib/supabase";

function mapPapRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id || "",
    patientName: row.patient_name || "",
    mrn: row.mrn || "",
    phone: row.phone || "",
    medication: row.medication || "",
    company: row.company || "",
    status: row.status || "Pending Application",
    startedDate: row.started_date || "",
    assignedLeadership: row.assigned_leadership || "",
    approvalUntilDate: row.approval_until_date || "",
    nextFollowUpDate: row.next_follow_up_date || "",
    nextRefillDate: row.next_refill_date || "",
    denialReason: row.denial_reason || "",
    discontinuedReason: row.discontinued_reason || "",
    prescriptionChangeNotes: row.prescription_change_notes || "",
    todoNotes: row.todo_notes || "",
    generalNotes: row.general_notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export async function fetchPapEntries() {
  const { data, error } = await supabase
    .from("pap_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapPapRow);
}

export async function createPapEntryInSupabase(entry) {
  const payload = {
    patient_id: entry.patientId || null,
    patient_name: entry.patientName || "",
    mrn: entry.mrn || "",
    phone: entry.phone || "",
    medication: entry.medication || "",
    company: entry.company || "",
    status: entry.status || "Pending Application",
    started_date: entry.startedDate || "",
    assigned_leadership: entry.assignedLeadership || "",
    approval_until_date: entry.approvalUntilDate || "",
    next_follow_up_date: entry.nextFollowUpDate || "",
    next_refill_date: entry.nextRefillDate || "",
    denial_reason: entry.denialReason || "",
    discontinued_reason: entry.discontinuedReason || "",
    prescription_change_notes: entry.prescriptionChangeNotes || "",
    todo_notes: entry.todoNotes || "",
    general_notes: entry.generalNotes || "",
  };

  const { data, error } = await supabase
    .from("pap_entries")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return mapPapRow(data);
}

export async function updatePapEntryInSupabase(entryId, updates) {
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if ("patientId" in updates) payload.patient_id = updates.patientId || null;
  if ("patientName" in updates) payload.patient_name = updates.patientName || "";
  if ("mrn" in updates) payload.mrn = updates.mrn || "";
  if ("phone" in updates) payload.phone = updates.phone || "";
  if ("medication" in updates) payload.medication = updates.medication || "";
  if ("company" in updates) payload.company = updates.company || "";
  if ("status" in updates) payload.status = updates.status || "Pending Application";
  if ("startedDate" in updates) payload.started_date = updates.startedDate || "";
  if ("assignedLeadership" in updates) {
    payload.assigned_leadership = updates.assignedLeadership || "";
  }
  if ("approvalUntilDate" in updates) {
    payload.approval_until_date = updates.approvalUntilDate || "";
  }
  if ("nextFollowUpDate" in updates) {
    payload.next_follow_up_date = updates.nextFollowUpDate || "";
  }
  if ("nextRefillDate" in updates) {
    payload.next_refill_date = updates.nextRefillDate || "";
  }
  if ("denialReason" in updates) payload.denial_reason = updates.denialReason || "";
  if ("discontinuedReason" in updates) {
    payload.discontinued_reason = updates.discontinuedReason || "";
  }
  if ("prescriptionChangeNotes" in updates) {
    payload.prescription_change_notes = updates.prescriptionChangeNotes || "";
  }
  if ("todoNotes" in updates) payload.todo_notes = updates.todoNotes || "";
  if ("generalNotes" in updates) payload.general_notes = updates.generalNotes || "";

  const { data, error } = await supabase
    .from("pap_entries")
    .update(payload)
    .eq("id", entryId)
    .select()
    .single();

  if (error) throw error;

  return mapPapRow(data);
}

export async function deletePapEntryInSupabase(entryId) {
  const { error } = await supabase
    .from("pap_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
}