import { supabase } from "../lib/supabase";

function mapFormularyRow(row) {
  return {
    id: row.id,
    name: row.name || row.medication_name || "",
    strength: row.strength || "",
    dosageForm: row.dosageForm || row.form || "",
    use: row.use || "",
    inStock:
      typeof row.inStock === "boolean"
        ? row.inStock
        : typeof row.active === "boolean"
        ? row.active
        : false,
    notes: row.notes || row.instructions || "",
  };
}

export async function fetchFormularyItems() {
  const { data, error } = await supabase
    .from("formulary_items")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map(mapFormularyRow);
}

export async function createFormularyItemInSupabase(item) {
  const payload = {
    name: item.name,
    medication_name: item.name,
    strength: item.strength || "",
    dosageForm: item.dosageForm || "",
    form: item.dosageForm || "",
    use: item.use || "",
    inStock: item.inStock ?? true,
    active: item.inStock ?? true,
    notes: item.notes || "",
    instructions: item.notes || "",
    stock: item.inStock ? 1 : 0,
  };

  const { data, error } = await supabase
    .from("formulary_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return mapFormularyRow(data);
}

export async function updateFormularyItemInSupabase(id, updates) {
  const payload = {};

  if ("name" in updates) {
    payload.name = updates.name;
    payload.medication_name = updates.name;
  }
  if ("strength" in updates) payload.strength = updates.strength || "";
  if ("dosageForm" in updates) {
    payload.dosageForm = updates.dosageForm || "";
    payload.form = updates.dosageForm || "";
  }
  if ("use" in updates) payload.use = updates.use || "";
  if ("inStock" in updates) {
    payload.inStock = updates.inStock;
    payload.active = updates.inStock;
    payload.stock = updates.inStock ? 1 : 0;
  }
  if ("notes" in updates) {
    payload.notes = updates.notes || "";
    payload.instructions = updates.notes || "";
  }

  const { data, error } = await supabase
    .from("formulary_items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return mapFormularyRow(data);
}

export async function deleteFormularyItemInSupabase(id) {
  const { error } = await supabase
    .from("formulary_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}