import { supabase } from "../lib/supabase";

export async function fetchAllergies() {
  const { data, error } = await supabase
    .from("allergies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAllergyInSupabase(patientId, allergy) {
  const { data, error } = await supabase
    .from("allergies")
    .insert([
      {
        patient_id: patientId,
        allergen: allergy.allergen || "",
        reaction: allergy.reaction || "",
        severity: allergy.severity || "",
        notes: allergy.notes || "",
        is_active: allergy.isActive ?? true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAllergyInSupabase(allergyId, updates) {
  const payload = {};

  if (updates.allergen !== undefined) payload.allergen = updates.allergen;
  if (updates.reaction !== undefined) payload.reaction = updates.reaction;
  if (updates.severity !== undefined) payload.severity = updates.severity;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("allergies")
    .update(payload)
    .eq("id", allergyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAllergyInSupabase(allergyId) {
  const { error } = await supabase
    .from("allergies")
    .delete()
    .eq("id", allergyId);

  if (error) throw error;
}