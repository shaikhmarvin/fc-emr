-- Restrict the privileged PT month-end reset to approved leadership users.
-- SECURITY DEFINER is required so the function can update all qualifying rows,
-- but callers must never inherit that privilege without an explicit check.

create or replace function public.reset_physical_therapy_statuses_for_month_end()
returns table(reset_count integer, reset_month text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_month text;
  current_month_start date;
  affected_count integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'leadership'
      and approval_status = 'approved'
  ) then
    raise exception 'Leadership approval is required to run the PT month-end reset'
      using errcode = '42501';
  end if;

  current_month_start := date_trunc('month', current_date)::date;
  target_month := to_char(
    (current_month_start - interval '1 day')::date,
    'YYYY-MM'
  );

  perform pg_advisory_xact_lock(hashtext('physical_therapy_month_end_status_reset'));

  update public.program_entries
  set
    status = 'New Referral',
    specialty_date = '',
    schedule_group = '',
    schedule_position = null,
    appointment_slot = ''
  where program_type = 'Physical Therapy'
    and lower(trim(coalesce(status, ''))) <> 'completed'
    and (
      created_at < current_month_start
      or (
        specialty_date ~ '^\d{4}-\d{2}-\d{2}$'
        and specialty_date::date < current_month_start
      )
    )
    and (
      coalesce(status, '') <> 'New Referral'
      or coalesce(specialty_date, '') <> ''
      or coalesce(schedule_group, '') <> ''
      or schedule_position is not null
      or coalesce(appointment_slot, '') <> ''
    );

  get diagnostics affected_count = row_count;

  insert into public.program_monthly_resets (
    program_type,
    last_reset_month,
    reset_at
  )
  values (
    'Physical Therapy',
    target_month,
    now()
  )
  on conflict (program_type) do update
  set
    last_reset_month = excluded.last_reset_month,
    reset_at = excluded.reset_at;

  reset_count := affected_count;
  reset_month := target_month;
  return next;
end;
$$;

revoke all on function public.reset_physical_therapy_statuses_for_month_end() from public;
revoke all on function public.reset_physical_therapy_statuses_for_month_end() from anon;
grant execute on function public.reset_physical_therapy_statuses_for_month_end() to authenticated;
