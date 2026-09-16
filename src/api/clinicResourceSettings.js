import { supabase } from "../lib/supabase";

const WOMENS_HEALTH_DAY_RESOURCE = {
  resource_key: "womens_health_day",
  display_name: "Women's Health Day",
  enabled: true,
  sex_restriction: "female",
  min_age: null,
  max_age: null,
  seasonal: false,
  season_start_month: null,
  season_end_month: null,
};

export async function fetchClinicResourceSettings() {
  const { data, error } = await supabase
    .from("clinic_resource_settings")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw error;
  const rows = data || [];
  return rows.some((row) => row.resource_key === WOMENS_HEALTH_DAY_RESOURCE.resource_key)
    ? rows
    : [...rows, { ...WOMENS_HEALTH_DAY_RESOURCE, is_unsaved_default: true }]
      .sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)));
}

export async function updateClinicResourceSetting(resourceKey, updates, currentSetting = null) {
  if (resourceKey === WOMENS_HEALTH_DAY_RESOURCE.resource_key && currentSetting?.is_unsaved_default) {
    const setting = { ...WOMENS_HEALTH_DAY_RESOURCE, ...currentSetting, ...updates };
    const { data, error } = await supabase
      .from("clinic_resource_settings")
      .upsert({
        resource_key: resourceKey,
        display_name: setting.display_name,
        enabled: setting.enabled,
        sex_restriction: setting.sex_restriction,
        min_age: setting.min_age,
        max_age: setting.max_age,
        seasonal: setting.seasonal,
        season_start_month: setting.season_start_month,
        season_end_month: setting.season_end_month,
        updated_at: new Date().toISOString(),
      }, { onConflict: "resource_key" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

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
