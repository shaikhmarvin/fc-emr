-- Check-in copies the referral reason and completes only its matching tracker.
-- The clinical encounter remains active for care and documentation.
create or replace function public.complete_tracker_on_specialty_checkin()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  program text;
  tracker public.program_entries%rowtype;
  visit_type text;
begin
  if new.status = 'cancelled' then return new; end if;
  if TG_OP = 'UPDATE' then
    if new.patient_id is not distinct from old.patient_id
       and new.clinic_date is not distinct from old.clinic_date
       and new.intake_data->>'visitType' is not distinct from old.intake_data->>'visitType'
       and new.intake_data->>'specialtyType' is not distinct from old.intake_data->>'specialtyType'
    then return new; end if;
  end if;
  visit_type := coalesce(new.intake_data->>'visitType', 'general');
  if visit_type not in ('specialty_only', 'both') then return new; end if;
  program := case lower(replace(coalesce(new.intake_data->>'specialtyType', ''), ' ', '_'))
    when 'pt' then 'Physical Therapy' when 'physical_therapy' then 'Physical Therapy'
    when 'dermatology' then 'Dermatology' when 'ophthalmology' then 'Ophthalmology'
    when 'mental_health' then 'Mental Health' when 'counseling' then 'Counseling'
    when 'addiction' then 'Addiction Medicine' when 'addiction_medicine' then 'Addiction Medicine'
    else null end;
  if program is null then return new; end if;

  select * into tracker from public.program_entries
  where patient_id = new.patient_id and program_type = program and archived_at is null
    and status not in ('Completed', 'Declined', 'Denied', 'Unable to Reach')
    and (specialty_date = new.clinic_date::text or coalesce(specialty_date, '') = '')
    and (created_at at time zone 'America/Chicago')::date <= new.clinic_date::date
  order by (specialty_date = new.clinic_date::text) desc nulls last, created_at desc, id desc
  limit 1 for update;

  if not found then return new; end if;
  new.chief_complaint := coalesce(tracker.reason, '');
  new.intake_data := coalesce(new.intake_data, '{}'::jsonb) || jsonb_build_object(
    'specialtyTrackerId', tracker.id::text, 'specialtyTrackerReason', coalesce(tracker.reason, '')
  );
  update public.program_entries set status = 'Completed', specialty_date = new.clinic_date::text
  where id = tracker.id;
  return new;
end;
$$;
revoke all on function public.complete_tracker_on_specialty_checkin() from public, anon, authenticated;
create trigger complete_tracker_on_specialty_checkin
before insert or update of patient_id, clinic_date, intake_data on public.encounters
for each row execute function public.complete_tracker_on_specialty_checkin();
