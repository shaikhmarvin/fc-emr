import { supabase } from "../lib/supabase";

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, classification, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateProfileRole(profileId, role, classification = null) {
  const updates = { role };

  if (classification !== null) {
    updates.classification = classification;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeProfileSetup(userId, fullName, classification) {
  const role =
    classification === "MS3" || classification === "MS4"
      ? "upper_level"
      : "student";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName,
        classification,
        role,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileDetails(profileId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}