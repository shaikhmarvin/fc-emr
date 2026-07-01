-- Reset Physical Therapy scheduler rows after each month closes.
-- Completed referrals are preserved; all other PT rows return to a fresh
-- referral state and are removed from the prior schedule.

create table if not exists public.program_monthly_resets (
  program_type text primary key,
  last_reset_month text not null,
  reset_at timestamptz not null default now()
);

create or replace function public.reset_physical_therapy_statuses_for_month_end()
returns table(reset_count integer, reset_month text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_month text;
  current_month_start date;
  affected_count integer := 0;
begin
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
