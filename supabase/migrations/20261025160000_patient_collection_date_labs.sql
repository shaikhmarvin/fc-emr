-- Outside reports belong to the patient even when there is no corresponding visit.
alter table public.patients add column if not exists imported_send_out_labs jsonb not null default '[]'::jsonb;

create or replace function public.save_patient_imported_labs_if_unchanged(
  target_patient_id uuid, expected_labs jsonb, proposed_labs jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare saved_id uuid; item jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and approval_status = 'approved' and role in ('leadership', 'lab')
  ) then raise exception 'Approved lab reviewer access required' using errcode = '42501'; end if;
  if proposed_labs is null or jsonb_typeof(proposed_labs) <> 'array' then
    raise exception 'Imported lab results must be an array' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(proposed_labs) loop
    if coalesce(item->>'collectedDate','') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Every chart lab needs its collection date' using errcode = '22023';
    end if;
    perform (item->>'collectedDate')::date;
  end loop;
  update public.patients set imported_send_out_labs = proposed_labs
    where id = target_patient_id and imported_send_out_labs is not distinct from expected_labs
    returning id into saved_id;
  return saved_id;
end; $$;
revoke all on function public.save_patient_imported_labs_if_unchanged(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_patient_imported_labs_if_unchanged(uuid,jsonb,jsonb) to authenticated;

-- New additions require a nearby visit. Existing results keep their original dates.
create or replace function public.save_imported_labs_if_unchanged(
  target_encounter_id uuid, target_patient_id uuid, expected_labs jsonb, proposed_labs jsonb
) returns uuid language plpgsql security invoker set search_path = pg_catalog, public as $$
declare saved_id uuid; visit_date date; item jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in before saving labs' using errcode = '42501'; end if;
  if proposed_labs is null or jsonb_typeof(proposed_labs) <> 'array' then
    raise exception 'Imported lab results must be an array' using errcode = '22023';
  end if;
  select clinic_date into visit_date from public.encounters where id = target_encounter_id and patient_id = target_patient_id and status <> 'cancelled';
  if not found then return null; end if;
  for item in select value from jsonb_array_elements(proposed_labs)
    except select value from jsonb_array_elements(coalesce(expected_labs,'[]'::jsonb)) loop
    if coalesce(item->>'collectedDate','') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Enter a collection date before saving labs' using errcode = '22023';
    end if;
    if visit_date is null or abs((item->>'collectedDate')::date - visit_date) > 2 then
      raise exception 'This visit is more than two days from collection. Save to the patient chart under the collection date instead.' using errcode = '22023';
    end if;
  end loop;
  update public.encounters set imported_send_out_labs = proposed_labs
    where id = target_encounter_id and patient_id = target_patient_id
      and imported_send_out_labs::jsonb is not distinct from expected_labs
    returning id into saved_id;
  return saved_id;
end; $$;
revoke all on function public.save_imported_labs_if_unchanged(uuid,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_imported_labs_if_unchanged(uuid,uuid,jsonb,jsonb) to authenticated;
