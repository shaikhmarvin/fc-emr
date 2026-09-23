-- Shared capacities; existing referral rows remain the source of appointments.
alter table public.womens_health_day_settings
  add column if not exists slot_capacities jsonb not null
  default '{"10:00":8,"11:00":8,"12:00":8}'::jsonb;

create function public.set_womens_health_day_settings(
  next_event_date date, next_theme_enabled boolean, next_slot_capacities jsonb
)
returns public.womens_health_day_settings
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  result public.womens_health_day_settings;
  slot text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leadership' and approval_status = 'approved'
  ) then
    raise exception 'Only leadership can change Women''s Health Day settings';
  end if;
  if next_slot_capacities is null or jsonb_typeof(next_slot_capacities) <> 'object' then
    raise exception 'Appointment capacities are required';
  end if;
  foreach slot in array array['10:00', '11:00', '12:00'] loop
    if not (next_slot_capacities ? slot)
       or jsonb_typeof(next_slot_capacities -> slot) <> 'number'
       or (next_slot_capacities ->> slot) !~ '^[0-9]+$' then
      raise exception 'Enter a whole number of places, zero or greater, for each time';
    end if;
  end loop;

  -- The same lock serializes bookings and capacity changes across all clients.
  perform 1 from public.womens_health_day_settings where id = true for update;
  if exists (
    select 1 from public.program_entries
    where program_type = 'Women''s Health Day' and status = 'Accepted'
      and coalesce(specialty_date::text, '') <> ''
      and appointment_slot in ('10:00', '11:00', '12:00')
    group by specialty_date, appointment_slot
    having count(*) > (next_slot_capacities ->> appointment_slot)::integer
  ) then
    raise exception 'Capacity cannot be lower than the number already scheduled. Move patients first.';
  end if;

  update public.womens_health_day_settings
  set event_date = next_event_date, theme = 'rose',
      theme_enabled = coalesce(next_theme_enabled, false),
      slot_capacities = next_slot_capacities,
      updated_at = now(), updated_by = auth.uid()
  where id = true returning * into result;
  return result;
end;
$$;
revoke all on function public.set_womens_health_day_settings(date, boolean, jsonb) from public, anon;
grant execute on function public.set_womens_health_day_settings(date, boolean, jsonb) to authenticated;

create function public.enforce_womens_health_day_capacity()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  capacities jsonb;
  booked integer;
begin
  if new.program_type <> 'Women''s Health Day' then return new; end if;
  -- Preserve older times when editing only a reason or other unrelated details.
  if TG_OP = 'UPDATE' then
    if new.program_type is not distinct from old.program_type
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
  where program_type = 'Women''s Health Day' and status = 'Accepted'
    and specialty_date = new.specialty_date and appointment_slot = new.appointment_slot
    and id is distinct from new.id;
  if booked >= (capacities ->> new.appointment_slot)::integer then
    raise exception 'That appointment time is full. Choose another time.';
  end if;
  if exists (
    select 1 from public.program_entries
    where program_type = 'Women''s Health Day' and status = 'Accepted'
      and specialty_date = new.specialty_date and coalesce(appointment_slot, '') <> ''
      and patient_id = new.patient_id and id is distinct from new.id
  ) then
    raise exception 'This patient already has an appointment on that date';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_womens_health_day_capacity() from public, anon, authenticated;
create trigger enforce_womens_health_day_capacity
before insert or update on public.program_entries
for each row execute function public.enforce_womens_health_day_capacity();
