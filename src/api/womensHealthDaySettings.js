import { supabase } from "../lib/supabase";
import { WHD_DEFAULT_CAPACITIES } from "../utils/womensHealthSchedule";

export function mapWomensHealthSettings(data) {
  return { eventDate: data.event_date || "", themeEnabled: data.theme_enabled === true, slotCapacities: data.slot_capacities || WHD_DEFAULT_CAPACITIES };
}

export async function fetchWomensHealthDaySettings() {
  const { data, error } = await supabase
    .from("womens_health_day_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw error;
  return mapWomensHealthSettings(data);
}

export async function saveWomensHealthDaySettings({ eventDate, themeEnabled, slotCapacities = WHD_DEFAULT_CAPACITIES }) {
  const { data, error } = await supabase.rpc("set_womens_health_day_settings", {
    next_event_date: eventDate || null,
    next_theme_enabled: themeEnabled === true,
    next_slot_capacities: slotCapacities,
  });
  if (error) throw error;
  return mapWomensHealthSettings(data);
}

export function isWomensHealthDay(eventDate, today = new Date()) {
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return Boolean(eventDate) && eventDate === localDate;
}
