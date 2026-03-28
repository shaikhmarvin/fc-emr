import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { signIn, signUp } from "../api/auth";
import { completeProfileSetup } from "../api/profiles";

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
    const [authFullName, setAuthFullName] = useState("");
    const [authClassification, setAuthClassification] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [authMessage, setAuthMessage] = useState("");
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [onboardingFullName, setOnboardingFullName] = useState("");
    const [onboardingClassification, setOnboardingClassification] = useState("");
    const isSigningOutRef = useRef(false);
    const [authRole, setAuthRole] = useState("");
    const [authPin, setAuthPin] = useState("");
const [authPinConfirm, setAuthPinConfirm] = useState("");

  const isLeadershipView = authReady && userRole === "leadership";

 async function fetchProfileWithRetry(userId, attempt = 1) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, classification, approval_status, signature_pin_set")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const role = profile?.role || null;
  const classification = profile?.classification ?? null;
  const roleRequiresClassification =
    role === "student" || role === "upper_level";

  const profileReady =
  !!role && (!roleRequiresClassification || classification !== null);

  if (profileReady) {
    return profile;
  }

  if (attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    return fetchProfileWithRetry(userId, attempt + 1);
  }

  return profile;
}

  async function handleSignUp() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthMessage("");
    
     if (!authFullName.trim()) {
  setAuthMessage("Please enter your full name.");
  setAuthLoading(false);
  return;
}

if (!authRole) {
  setAuthMessage("Please select a role.");
  setAuthLoading(false);
  return;
}

if (authRole === "student" || authRole === "upper_level") {
  if (!authClassification) {
    setAuthMessage("Please select a classification.");
    setAuthLoading(false);
    return;
  }
}

if (authRole === "attending") {
  if (authPin.length !== 4 || !/^\d{4}$/.test(authPin)) {
    setAuthMessage("PIN must be exactly 4 digits.");
    setAuthLoading(false);
    return;
  }

  if (authPin !== authPinConfirm) {
    setAuthMessage("PINs do not match.");
    setAuthLoading(false);
    return;
  }
}

    try {
     await signUp(authEmail, authPassword, {
  full_name: authFullName,
  classification: authClassification || null,
  role: authRole,
  approval_status: "pending",
  signature_pin: authRole === "attending" ? authPin : null,
});
      setAuthMessage("Signup successful. You can now sign in.");
      setAuthPassword("");
setAuthPin("");
setAuthPinConfirm("");
    } catch (error) {
      console.error(error);
      setAuthMessage(`Signup failed: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignIn() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthReady(false);
    setAuthMessage("");
    setUserRole(null);

    try {
      await signIn(authEmail, authPassword);
      setAuthMessage("Sign in worked.");
    } catch (error) {
      console.error(error);
      setAuthMessage(`Sign in failed: ${error.message}`);
      setAuthReady(true);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (authLoading) return;

    isSigningOutRef.current = true;
    setAuthLoading(true);
    setAuthMessage("");

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Sign out failed:", error);

      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.error("Failed clearing local auth storage:", storageError);
      }
    } finally {
      setSession(null);
      setUserRole(null);
        setAuthEmail("");
        setAuthPassword("");
        setAuthFullName("");
        setAuthClassification("");
        setOnboardingFullName("");
        setOnboardingClassification("");
        setNeedsOnboarding(false);
        setAuthMessage("Signed out.");
        setAuthLoading(false);

      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }

  function handleResetSession() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to reset session:", error);
    }

      setSession(null);
      setUserRole(null);
      setAuthReady(false);
      setNeedsOnboarding(false);
      setOnboardingFullName("");
      setOnboardingClassification("");

    window.location.reload();
  }

    async function handleCompleteOnboarding() {
  if (authLoading) return;
  if (!session?.user?.id) return;

  if (!onboardingFullName.trim()) {
    setAuthMessage("Please enter your full name.");
    return;
  }

  if (
  (userRole === "student" || userRole === "upper_level") &&
  !onboardingClassification
) {
    setAuthMessage("Please select your classification.");
    return;
  }

  try {
    setAuthLoading(true);
    setAuthMessage("");

    const profile = await completeProfileSetup(
      session.user.id,
      onboardingFullName.trim(),
      onboardingClassification
    );

    setUserRole(profile.role);
    setNeedsOnboarding(false);
    setAuthFullName(profile.full_name || onboardingFullName.trim());
    setAuthClassification(profile.classification || onboardingClassification);
    setOnboardingFullName(profile.full_name || onboardingFullName.trim());
    setOnboardingClassification(
      profile.classification || onboardingClassification
    );
    setAuthMessage("");
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    setAuthMessage(`Failed to complete setup: ${error.message}`);
  } finally {
    setAuthLoading(false);
  }
}

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (isSigningOutRef.current) return;

      setAuthReady(false);
      setAuthMessage("");
      setSession(newSession);

      if (!newSession) {
        setUserRole(null);
        setAuthReady(true);
        return;
      }

      const userId = newSession.user?.id;

      if (!userId) {
        setUserRole(null);
        setAuthReady(true);
        return;
      }

      setTimeout(async () => {
        try {
            const profile = await fetchProfileWithRetry(userId);

if (!profile) {
  console.error("No profile found for user:", userId);
  setAuthMessage("No profile found. Contact leadership.");
  setUserRole(null);
  setAuthReady(true);
  return;
}

await supabase
  .from("profiles")
  .update({ last_seen_at: new Date().toISOString() })
  .eq("id", userId);

            console.log("PROFILE FROM onAuthStateChange:", profile, "EVENT:", event);

            const role = profile?.role || null;
            const classification = profile?.classification ?? null;
            const roleRequiresClassification =
                role === "student" || role === "upper_level";

            if (profile?.approval_status !== "approved") {
              setUserRole(null);
              setNeedsOnboarding(false);
              setAuthMessage("Awaiting leadership approval.");
              setAuthReady(true);   // ✅ ADD THIS
              return;
            }

if (
  role &&
  (!roleRequiresClassification || classification !== null)
) {
  setUserRole(role);
  setNeedsOnboarding(false);
  setOnboardingFullName(profile?.full_name || "");
  setOnboardingClassification(classification || "");
  setAuthMessage("");
}

        } catch (error) {
          console.error("Failed to load profile from auth state change:", error);
          setAuthMessage("Profile reload failed. Use Reset Session if role looks wrong.");
        } finally {
          setAuthReady(true);
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    userRole,
    authReady,
    isLeadershipView,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authFullName,
    setAuthFullName,
    authLoading,
    authMessage,
    handleSignUp,
    handleSignIn,
    handleSignOut,
    handleResetSession,
    authClassification,
    setAuthClassification,
    needsOnboarding,
    onboardingFullName,
    setOnboardingFullName,
    onboardingClassification,
    setOnboardingClassification,
    handleCompleteOnboarding,
    authRole,
    setAuthRole,
    authPin,
setAuthPin,
authPinConfirm,
setAuthPinConfirm,
  };
}