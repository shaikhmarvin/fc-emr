import { supabase } from "../lib/supabase";

export async function fetchStaffRoster(clinicDate) {
  if (!clinicDate) return { attendings: "", residents: "", upperLevels: "" };

  const { data, error } = await supabase
    .from("clinic_staff_roster")
    .select("*")
    .eq("clinic_date", clinicDate)
    .maybeSingle();

  if (error) {
    console.error("Error fetching staff roster:", error);
    return { attendings: "", residents: "", upperLevels: "" };
  }

  return {
    attendings: data?.attendings || "",
    residents: data?.residents || "",
    upperLevels: data?.upper_levels || "",
  };
}

export async function saveStaffRoster(clinicDate, roster) {
  if (!clinicDate) return;

  const { error } = await supabase
  .from("clinic_staff_roster")
  .upsert(
    {
      clinic_date: clinicDate,
      attendings: roster?.attendings || "",
      residents: roster?.residents || "",
      upper_levels: roster?.upperLevels || "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_date" }
  );

  if (error) {
    console.error("Error saving staff roster:", error);
    throw error;
  }
}