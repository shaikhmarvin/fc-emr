import { supabase } from "../lib/supabase";

export async function fetchChartingSettings() {
  const { data, error } = await supabase
    .from("clinic_charting_settings")
    .select("medical_soap_enabled, updated_at, updated_by")
    .eq("id", true)
    .single();

  if (error) throw error;
  return {
    medicalSoapEnabled: data?.medical_soap_enabled === true,
    updatedAt: data?.updated_at || null,
    updatedBy: data?.updated_by || null,
  };
}

export async function setMedicalSoapEnabled(enabled) {
  const { data, error } = await supabase.rpc("set_medical_soap_enabled", {
    enabled: Boolean(enabled),
  });

  if (error) throw error;
  return data;
}
