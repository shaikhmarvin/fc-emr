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

const DEFAULT_RESOURCES = [WOMENS_HEALTH_DAY_RESOURCE, ...[ ["mental_health_addiction", "Mental Health/Addiction Medicine"], ["mental_health_addiction_undergrad", "Mental Health/Addiction Medicine in undergrad intake"] ].map(([resource_key, display_name]) => ({ ...WOMENS_HEALTH_DAY_RESOURCE, resource_key, display_name, sex_restriction: "any" }))];

export async function fetchClinicResourceSettings() {
  const { data, error } = await supabase
    .from("clinic_resource_settings")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw error;
  const rows = data || [];
  return [...rows, ...DEFAULT_RESOURCES.filter(setting => !rows.some(row => row.resource_key === setting.resource_key)).map(setting => ({ ...setting, is_unsaved_default: true }))].sort((a,b) => a.display_name.localeCompare(b.display_name));
}

export async function updateClinicResourceSetting(resourceKey, updates, currentSetting = null) {
  if (DEFAULT_RESOURCES.some(setting => setting.resource_key === resourceKey) && currentSetting?.is_unsaved_default) {
    const setting = { ...DEFAULT_RESOURCES.find(setting => setting.resource_key === resourceKey), ...currentSetting, ...updates };
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
