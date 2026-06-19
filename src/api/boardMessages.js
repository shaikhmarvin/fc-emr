import { supabase } from "../lib/supabase";

function mapBoardMessage(row) {
  return {
    id: row.id,
    title: row.title || "",
    body: row.body || "",
    isActive: row.is_active === true,
    isSaved: row.is_saved === true,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchBoardMessages() {
  const { data, error } = await supabase
    .from("clinic_board_messages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data || []).map(mapBoardMessage);

  return {
    activeMessage: rows.find((message) => message.isActive) || null,
    savedMessages: rows.filter((message) => message.isSaved),
  };
}

export async function displayBoardMessage({ title = "", body, userId }) {
  const cleanBody = String(body || "").trim();
  if (!cleanBody) {
    throw new Error("Message cannot be blank.");
  }

  const { error: clearError } = await supabase
    .from("clinic_board_messages")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  if (clearError) throw clearError;

  const { data, error } = await supabase
    .from("clinic_board_messages")
    .insert([
      {
        title: String(title || "").trim(),
        body: cleanBody,
        is_active: true,
        is_saved: false,
        created_by: userId || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return mapBoardMessage(data);
}

export async function clearActiveBoardMessage() {
  const { error } = await supabase
    .from("clinic_board_messages")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  if (error) throw error;
}

export async function saveBoardMessageTemplate({ title = "", body, userId }) {
  const cleanBody = String(body || "").trim();
  if (!cleanBody) {
    throw new Error("Message cannot be blank.");
  }

  const { data, error } = await supabase
    .from("clinic_board_messages")
    .insert([
      {
        title: String(title || "").trim() || cleanBody.slice(0, 80),
        body: cleanBody,
        is_active: false,
        is_saved: true,
        created_by: userId || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return mapBoardMessage(data);
}

export async function deleteBoardMessageTemplate(messageId) {
  const { error } = await supabase
    .from("clinic_board_messages")
    .delete()
    .eq("id", messageId)
    .eq("is_saved", true);

  if (error) throw error;
}
