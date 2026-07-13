import { supabase } from "../lib/supabase";

function mapSocialWorkNote(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    encounterId: row.encounter_id || null,
    noteText: row.note_text || "",
    status: row.status || "draft",
    authorId: row.author_id || null,
    authorRole: row.author_role || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at || null,
    completedBy: row.completed_by || null,
  };
}

export async function fetchSocialWorkNotes() {
  const { data, error } = await supabase
    .from("social_work_notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapSocialWorkNote);
}

export async function saveSocialWorkNote({
  id,
  patientId,
  encounterId,
  noteText,
  authorId,
  authorRole,
}) {
  const payload = id
    ? {
        note_text: noteText,
        updated_at: new Date().toISOString(),
      }
    : {
        patient_id: patientId,
        encounter_id: encounterId || null,
        note_text: noteText,
        author_id: authorId || null,
        author_role: authorRole || "social_work",
        updated_at: new Date().toISOString(),
      };

  const query = id
    ? supabase.from("social_work_notes").update(payload).eq("id", id)
    : supabase.from("social_work_notes").insert(payload);
  const { data, error } = await query.select().single();

  if (error) throw error;
  return mapSocialWorkNote(data);
}

export async function completeSocialWorkNote(noteId) {
  const { data, error } = await supabase
    .rpc("complete_social_work_note", { target_note_id: noteId });

  if (error) throw error;
  return mapSocialWorkNote(data);
}
