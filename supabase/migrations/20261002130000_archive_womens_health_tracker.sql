alter table public.program_entries add column if not exists archived_at timestamptz;

create or replace function public.archive_womens_health_tracker()
returns setof text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leadership' and approval_status = 'approved'
  ) then
    raise exception 'Approved leadership access is required' using errcode = '42501';
  end if;

  return query
    update public.program_entries
    set archived_at = now()
    where program_type = 'Women''s Health Day' and archived_at is null
    returning id::text;
end;
$$;

revoke all on function public.archive_womens_health_tracker() from public, anon;
grant execute on function public.archive_womens_health_tracker() to authenticated;

-- Archived bookings do not consume slots or block new appointments.
create or replace function public.enforce_womens_health_day_capacity()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  capacities jsonb;
  booked integer;
begin
  if new.archived_at is not null then return new; end if;
  if new.program_type <> 'Women''s Health Day' then return new; end if;
  -- Preserve older times when editing only a reason or other unrelated details.
  if TG_OP = 'UPDATE' then
    if new.archived_at is not distinct from old.archived_at
       and new.program_type is not distinct from old.program_type
       and new.status is not distinct from old.status
       and new.specialty_date is not distinct from old.specialty_date
       and new.appointment_slot is not distinct from old.appointment_slot then
      return new;
    end if;
  end if;
  if new.status <> 'Accepted' then
    new.appointment_slot := '';
    return new;
  end if;
  if coalesce(new.appointment_slot, '') = '' then return new; end if;
  if coalesce(new.specialty_date::text, '') = '' then
    raise exception 'Choose an event date before selecting an appointment time';
  end if;
  if new.appointment_slot not in ('10:00', '11:00', '12:00') then
    raise exception 'Choose 10:00 AM, 11:00 AM, or 12:00 PM';
  end if;
  select slot_capacities into capacities from public.womens_health_day_settings
  where id = true for update;
  if capacities is null then raise exception 'Women''s Health Day settings are unavailable'; end if;
  select count(*) into booked from public.program_entries
  where archived_at is null and program_type = 'Women''s Health Day' and status = 'Accepted'
    and specialty_date = new.specialty_date and appointment_slot = new.appointment_slot
    and id is distinct from new.id;
  if booked >= (capacities ->> new.appointment_slot)::integer then
    raise exception 'That appointment time is full. Choose another time.';
  end if;
  if exists (
    select 1 from public.program_entries
    where archived_at is null and program_type = 'Women''s Health Day' and status = 'Accepted'
      and specialty_date = new.specialty_date and coalesce(appointment_slot, '') <> ''
      and patient_id = new.patient_id and id is distinct from new.id
  ) then
    raise exception 'This patient already has an appointment on that date';
  end if;
  return new;
end;
$$;
