import { supabase } from "../lib/supabase";

export async function createAuditLog({
  encounterId = null,
  patientId = null,
  actorUserId = null,
  actorName = "Unknown User",
  actorRole = "",
  action,
  details = {},
}) {
  const { data, error } = await supabase
    .from("audit_log")
    .insert([
      {
        encounter_id: encounterId,
        patient_id: patientId,
        actor_user_id: actorUserId,
        actor_name: actorName,
        actor_role: actorRole,
        action,
        details,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAuditLogForEncounter(encounterId) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("encounter_id", encounterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}