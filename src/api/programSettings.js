import { supabase } from "../lib/supabase";

export async function fetchProgramSettings() {
  const { data, error } = await supabase
    .from("program_settings")
    .select("*");

  if (error) {
    console.error("Error fetching program settings:", error);
    return [];
  }

  return data;
}

export async function updateProgramSetting(program_type, updates) {
  const { error } = await supabase
    .from("program_settings")
    .update(updates)
    .eq("program_type", program_type);

  if (error) {
    console.error("Error updating program settings:", error);
  }
}