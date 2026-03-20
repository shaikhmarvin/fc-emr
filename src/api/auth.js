import { supabase } from "../lib/supabase";

import { getRoleFromClassification } from "../utils/permissions";

export async function signUp(email, password, profileData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("No user returned from signup");

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: profileData.full_name || "",
    classification: profileData.classification || null,
    role: profileData.role || null,
    approval_status: profileData.approval_status || "pending",
    signature_pin_hash: profileData.signature_pin_hash || null,
    signature_pin_set: !!profileData.signature_pin_set,
  });

  if (profileError) throw profileError;

  return user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function fetchMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}