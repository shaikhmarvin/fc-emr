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
    attendingArrivedAt: data?.attending_arrived_at || null,
  };
}

export async function saveStaffRoster(clinicDate, roster) {
  if (!clinicDate) return;

  const { data, error } = await supabase
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
  ).select("*").single();

  if (error) {
    console.error("Error saving staff roster:", error);
    throw error;
  }
  return {
    attendings: data.attendings || "",
    residents: data.residents || "",
    upperLevels: data.upper_levels || "",
    attendingArrivedAt: data.attending_arrived_at || null,
  };
}

export async function fetchAttendingArrivals(startDate, endDate) {
  let query = supabase.from("clinic_staff_roster").select("clinic_date, attending_arrived_at");
  if (startDate) query = query.gte("clinic_date", startDate);
  if (endDate) query = query.lte("clinic_date", endDate);
  const { data, error } = await query;
  if (error) throw error;
  return Object.fromEntries(data.map(row => [row.clinic_date, row.attending_arrived_at]));
}
