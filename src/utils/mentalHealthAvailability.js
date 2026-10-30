export function mentalHealthRegistrationEnabled(settings = [], undergrad = false) {
  const enabled = key => settings.find(row => row.resource_key === key)?.enabled !== false;
  return enabled("mental_health_addiction") && (!undergrad || enabled("mental_health_addiction_undergrad"));
}
