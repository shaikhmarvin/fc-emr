import { supabase } from "../lib/supabase";

export async function fetchResearchAccess() {
  const { data, error } = await supabase
    .from("research_access_settings")
    .select("leadership_enabled")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data?.leadership_enabled === true;
}

export async function setResearchLeadershipAccess(enabled) {
  const { data, error } = await supabase.rpc("set_research_leadership_access", {
    enabled: Boolean(enabled),
  });
  if (error) throw error;
  return data?.leadership_enabled === true;
}
