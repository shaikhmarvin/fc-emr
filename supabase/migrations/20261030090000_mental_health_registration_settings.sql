-- Shared availability controls for registration and undergraduate intake.
insert into public.clinic_resource_settings (resource_key, display_name, enabled, sex_restriction, min_age, max_age, seasonal)
values ('mental_health_addiction', 'Mental Health/Addiction Medicine', true, 'any', null, null, false),
       ('mental_health_addiction_undergrad', 'Mental Health/Addiction Medicine in undergrad intake', true, 'any', null, null, false)
on conflict (resource_key) do nothing;

create policy "leadership can insert mental health registration settings"
on public.clinic_resource_settings for insert to authenticated
with check (
  resource_key in ('mental_health_addiction', 'mental_health_addiction_undergrad')
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'leadership' and approval_status = 'approved')
);
