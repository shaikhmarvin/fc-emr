alter table public.program_entries
  add column schedule_history jsonb not null default '{}'::jsonb;

-- Keep one roster entry per referral and clinic date. History shares the
-- referral's access rules and is removed if the referral is deleted.
create function public.record_specialty_schedule_history()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
declare
  clinic_today text := to_char(now() at time zone 'America/Chicago', 'YYYY-MM-DD');
  was_scheduled boolean;
  is_scheduled boolean;
begin
  if new.program_type not in (
    'Physical Therapy', 'Dermatology', 'Ophthalmology', 'Mental Health',
    'Addiction Medicine', 'Counseling'
  ) then
    return new;
  end if;

  is_scheduled := coalesce(new.specialty_date ~ '^\d{4}-\d{2}-\d{2}$' and (
    new.status in ('Scheduled', 'Backup', 'Attempted Contact', 'Unable to Reach')
    or (new.status = 'Completed' and new.schedule_group in ('primary', 'backup'))
  ), false);

  if tg_op = 'UPDATE' then
    was_scheduled := coalesce(old.schedule_history -> old.specialty_date ->> 'status'
      in ('Scheduled', 'Backup'), false);
    if was_scheduled and old.specialty_date >= clinic_today
       and (old.specialty_date is distinct from new.specialty_date
            or new.status not in ('Scheduled', 'Backup', 'Completed')) then
      new.schedule_history := jsonb_set(new.schedule_history,
        array[old.specialty_date, 'status'],
        to_jsonb(case when is_scheduled and old.specialty_date is distinct from new.specialty_date
          then 'Rescheduled' else 'Removed from schedule' end));
    end if;
  end if;

  if is_scheduled and (
    new.status in ('Scheduled', 'Backup')
    or not (new.schedule_history ? new.specialty_date)
  ) then
    new.schedule_history := jsonb_set(new.schedule_history, array[new.specialty_date],
      jsonb_build_object(
        'status', new.status,
        'appointmentSlot', coalesce(new.appointment_slot, ''),
        'schedulePosition', new.schedule_position,
        'scheduleType', coalesce(new.schedule_group, '')
      ));
  end if;

  return new;
end;
$$;

create trigger record_specialty_schedule_history
before insert or update of specialty_date, status, schedule_group, schedule_position, appointment_slot
on public.program_entries
for each row execute function public.record_specialty_schedule_history();

-- Seed the appointments and dated outreach still present in the tracker.
update public.program_entries set specialty_date = specialty_date
where archived_at is null
  and program_type in ('Physical Therapy', 'Dermatology', 'Ophthalmology', 'Mental Health', 'Addiction Medicine', 'Counseling')
  and specialty_date ~ '^\d{4}-\d{2}-\d{2}$'
  and (status in ('Scheduled', 'Backup', 'Attempted Contact', 'Unable to Reach')
       or (status = 'Completed' and schedule_group in ('primary', 'backup')));
