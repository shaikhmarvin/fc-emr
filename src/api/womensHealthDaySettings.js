import { supabase } from "../lib/supabase";

export async function fetchWomensHealthDaySettings() {
  const { data, error } = await supabase
    .from("womens_health_day_settings")
    .select("event_date, theme_enabled")
    .eq("id", true)
    .single();
  if (error) throw error;
  return { eventDate: data.event_date || "", themeEnabled: data.theme_enabled === true };
}

export async function saveWomensHealthDaySettings({ eventDate, themeEnabled }) {
  const { data, error } = await supabase.rpc("set_womens_health_day_settings", {
    next_event_date: eventDate || null,
    next_theme_enabled: themeEnabled === true,
  });
  if (error) throw error;
  return { eventDate: data.event_date || "", themeEnabled: data.theme_enabled === true };
}

export function isWomensHealthDay(eventDate, today = new Date()) {
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return Boolean(eventDate) && eventDate === localDate;
}
