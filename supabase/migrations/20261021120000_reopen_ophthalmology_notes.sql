-- Reopening and archiving the final version must succeed together.
create or replace function public.reopen_ophthalmology_note(
  target_encounter_id uuid,
  reopen_reason text,
  expected_workflow_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  original public.encounters%rowtype;
  actor_name text;
  next_version bigint;
begin
  select full_name into actor_name from public.profiles
  where id = auth.uid() and role = 'leadership' and approval_status = 'approved';
  if not found then
    raise exception 'Approved leadership access is required' using errcode = '42501';
  end if;
  if nullif(btrim(reopen_reason), '') is null then
    raise exception 'A reopening reason is required';
  end if;

  select * into original from public.encounters where id = target_encounter_id for update;
  if not found or not (
    original.note_type = 'ophthalmology' or
    lower(coalesce(original.intake_data->>'specialtyType', original.intake_data->>'specialty_type', ''))
      in ('ophthalmology', 'ophtho', 'optho')
  ) then
    raise exception 'Ophthalmology note not found';
  end if;
  if original.soap_status not in ('completed', 'signed') or original.soap_status is null then
    raise exception 'Only a final note can be reopened';
  end if;
  if expected_workflow_version is distinct from original.workflow_version then
    raise exception 'The note changed. Refresh the chart and try again';
  end if;

  insert into public.audit_log
    (encounter_id, patient_id, actor_user_id, actor_name, actor_role, action, details)
  values (original.id, original.patient_id, auth.uid(), coalesce(actor_name, 'Leadership'),
    'leadership', 'ophthalmology_note_reopened', jsonb_build_object(
      'reason', btrim(reopen_reason), 'previous_status', original.soap_status,
      'original_note', jsonb_build_object(
        'hpi', original.hpi, 'objective', original.objective,
        'assessment', original.assessment, 'plan', original.plan,
        'notes', original.notes, 'ophthalmology_note', original.ophthalmology_note,
        'soap_author_id', original.soap_author_id, 'soap_author_role', original.soap_author_role,
        'soap_completed_at', original.soap_completed_at,
        'workflow_version', original.workflow_version)));

  perform set_config('clinic.reopening_ophthalmology', original.id::text, true);
  update public.encounters set soap_status = 'draft', soap_completed_at = null
  where id = original.id returning workflow_version into next_version;
  perform set_config('clinic.reopening_ophthalmology', '', true);
  return jsonb_build_object('workflow_version', next_version);
end;
$$;

revoke all on function public.reopen_ophthalmology_note(uuid, text, bigint) from public, anon;
grant execute on function public.reopen_ophthalmology_note(uuid, text, bigint) to authenticated;

-- Final note content cannot be changed by direct updates or stale autosaves.
create or replace function public.protect_final_ophthalmology_note()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.soap_status in ('completed', 'signed') and (
    old.note_type = 'ophthalmology' or
    lower(coalesce(old.intake_data->>'specialtyType', old.intake_data->>'specialty_type', ''))
      in ('ophthalmology', 'ophtho', 'optho')
  ) and row(new.hpi, new.objective, new.assessment, new.plan, new.notes,
    new.ophthalmology_note, new.soap_status, new.soap_completed_at,
    new.soap_author_id, new.soap_author_role, new.note_type,
    new.intake_data->>'specialtyType', new.intake_data->>'specialty_type')
    is distinct from row(old.hpi, old.objective, old.assessment, old.plan, old.notes,
    old.ophthalmology_note, old.soap_status, old.soap_completed_at,
    old.soap_author_id, old.soap_author_role, old.note_type,
    old.intake_data->>'specialtyType', old.intake_data->>'specialty_type')
  then
    if current_setting('clinic.reopening_ophthalmology', true) is distinct from old.id::text then
      raise exception 'Final ophthalmology notes must be reopened by leadership before editing'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_final_ophthalmology_note on public.encounters;
create trigger protect_final_ophthalmology_note before update on public.encounters
for each row execute function public.protect_final_ophthalmology_note();
