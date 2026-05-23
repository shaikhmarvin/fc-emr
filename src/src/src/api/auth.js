import { supabase } from "../lib/supabase";

import { getRoleFromClassification } from "../utils/permissions";

export async function signUp(email, password, profileData) {
  const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: profileData.full_name || "",
      role: profileData.role || "student",
      classification: profileData.classification || null,
    },
  },
});

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("No user returned from signup");

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: profileData.full_name || "",
    classification: profileData.classification || null,
    role: profileData.role || null,
    approval_status: profileData.approval_status || "pending",
    signature_pin_set: false,
    signature_pin_hash: null,
  });

  if (profileError) throw profileError;

  if (profileData.role === "attending" && profileData.signature_pin) {
    let session = data.session;

    if (!session) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw new Error(
          "Account created, but PIN could not be set automatically. Sign in first, then set the PIN."
        );
      }

      session = signInData.session;
    }

    const { error: pinError } = await supabase.rpc("set_signature_pin", {
      target_user_id: user.id,
      raw_pin: profileData.signature_pin,
    });

    if (pinError) throw pinError;
  }

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

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) throw error;
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