export function canStartIntake(role) {
  return role === "leadership";
}

export function canManageRoomBoard(role) {
  return role === "leadership";
}

export function canEditFormulary(role) {
  return role === "leadership";
}

export function canPrescribe(role) {
  return (
    role === "student" ||
    role === "upper_level" ||
    role === "attending" ||
    role === "leadership"
  );
}

export function canChart(role) {
  return (
    role === "student" ||
    role === "upper_level" ||
    role === "attending" ||
    role === "leadership"
  );
}

export function getRoleFromClassification(classification) {
  if (!classification) return "student";

  const value = classification.toLowerCase();

  if (value === "ms1" || value === "ms2") return "student";
  if (value === "ms3" || value === "ms4") return "upper_level";

  return "student";
}