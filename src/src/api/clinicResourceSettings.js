import { supabase } from "../lib/supabase";

export async function fetchClinicResourceSettings() {
  const { data, error } = await supabase
    .from("clinic_resource_settings")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateClinicResourceSetting(resourceKey, updates) {
  const { data, error } = await supabase
    .from("clinic_resource_settings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("resource_key", resourceKey)
    .select()
    .single();

  if (error) throw error;
  return data;
}