import { supabase } from "../lib/supabase";

function todayClinicDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchTodayStaffRoster() {
  const clinicDate = todayClinicDate();

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

export async function saveTodayStaffRoster(roster) {
  const clinicDate = todayClinicDate();

  const { error } = await supabase.from("clinic_staff_roster").upsert({
    clinic_date: clinicDate,
    attendings: roster?.attendings || "",
    residents: roster?.residents || "",
    upper_levels: roster?.upperLevels || "",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving staff roster:", error);
    throw error;
  }
}