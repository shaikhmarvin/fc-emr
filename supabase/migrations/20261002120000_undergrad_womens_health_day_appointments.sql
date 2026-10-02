-- Read-only appointment access for event-day undergraduate intake.
create policy "undergraduates read todays womens health appointments"
on public.program_entries for select to authenticated
using (
  program_type = 'Women''s Health Day'
  and status = 'Accepted'
  and coalesce(appointment_slot, '') <> ''
  and specialty_date = to_char(now() at time zone 'America/Chicago', 'YYYY-MM-DD')
  and exists (
    select 1 from public.womens_health_day_settings
    where id = true
      and event_date::text = to_char(now() at time zone 'America/Chicago', 'YYYY-MM-DD')
  )
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'undergraduate' and approval_status = 'approved'
  )
);
