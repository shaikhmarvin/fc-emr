-- Permit leadership to create the resource row if an older clinic database lacks it.
create policy "leadership can insert womens health resource"
on public.clinic_resource_settings for insert to authenticated
with check (
  resource_key = 'womens_health_day'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leadership' and approval_status = 'approved'
  )
);

insert into public.clinic_resource_settings (
  resource_key, display_name, enabled, sex_restriction,
  min_age, max_age, seasonal
)
values ('womens_health_day', 'Women''s Health Day', true, 'female', null, null, false)
on conflict (resource_key) do nothing;
