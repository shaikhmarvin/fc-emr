alter table public.clinic_staff_roster
  add column if not exists attending_arrived_at timestamptz;

-- Capture the first attending saved for a clinic date, atomically across clients.
-- Existing rosters are not backfilled: their actual arrival time is unknown.
create or replace function public.capture_attending_arrival()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    new.attending_arrived_at := old.attending_arrived_at;
    if old.attending_arrived_at is null
      and new.clinic_date::date = (clock_timestamp() at time zone 'America/Chicago')::date
      and btrim(coalesce(old.attendings, '')) = ''
      and btrim(coalesce(new.attendings, '')) <> '' then
      new.attending_arrived_at := clock_timestamp();
    end if;
  else
    new.attending_arrived_at := case
      when new.clinic_date::date = (clock_timestamp() at time zone 'America/Chicago')::date
        and btrim(coalesce(new.attendings, '')) <> '' then clock_timestamp()
      else null end;
  end if;
  return new;
end;
$$;

create trigger capture_first_attending_arrival
before insert or update on public.clinic_staff_roster
for each row execute function public.capture_attending_arrival();
