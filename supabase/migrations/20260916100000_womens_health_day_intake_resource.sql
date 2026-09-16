-- Add Women's Health Day to the existing registration intake resource controls.
-- Age limits remain blank until leadership chooses them in Intake Settings.
insert into public.clinic_resource_settings (
  resource_key, display_name, enabled, sex_restriction,
  min_age, max_age, seasonal
)
values (
  'womens_health_day', 'Women''s Health Day', true, 'female',
  null, null, false
)
on conflict (resource_key) do nothing;
