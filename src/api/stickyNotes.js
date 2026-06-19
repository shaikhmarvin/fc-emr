import { supabase } from "../lib/supabase";

function mapStickyNote(row) {
  return {
    id: row.id,
    userId: row.user_id,
    patientId: row.patient_id,
    title: row.title || "",
    body: row.body || "",
    color: row.color || "yellow",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchStickyNotes() {
  const { data, error } = await supabase
    .from("sticky_notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapStickyNote);
}

export async function createStickyNoteInSupabase({
  userId,
  patientId = null,
  title = "",
  body,
  color = "yellow",
}) {
  const rowToInsert = {
    user_id: userId,
    patient_id: patientId || null,
    title: title || "",
    body: body || "",
    color: color || "yellow",
  };

  const { data, error } = await supabase
    .from("sticky_notes")
    .insert([rowToInsert])
    .select()
    .single();

  if (error) throw error;
  return mapStickyNote(data);
}

export async function updateStickyNoteInSupabase(noteId, updates) {
  const rowToUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (updates.body !== undefined) {
    rowToUpdate.body = updates.body || "";
  }

  if (updates.title !== undefined) {
    rowToUpdate.title = updates.title || "";
  }

  if (updates.patientId !== undefined) {
    rowToUpdate.patient_id = updates.patientId || null;
  }

  if (updates.color !== undefined) {
    rowToUpdate.color = updates.color || "yellow";
  }

  const { data, error } = await supabase
    .from("sticky_notes")
    .update(rowToUpdate)
    .eq("id", noteId)
    .select()
    .single();

  if (error) throw error;
  return mapStickyNote(data);
}

export async function deleteStickyNoteInSupabase(noteId) {
  const { error } = await supabase
    .from("sticky_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw error;
}
