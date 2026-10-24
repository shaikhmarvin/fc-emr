-- Keep large lab JSON in the request body, while preserving atomic conflict checks.
create or replace function public.save_imported_labs_if_unchanged(
  target_encounter_id uuid,
  target_patient_id uuid,
  expected_labs jsonb,
  proposed_labs jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare saved_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before saving labs' using errcode = '42501';
  end if;
  if proposed_labs is null or jsonb_typeof(proposed_labs) <> 'array' then
    raise exception 'Imported lab results must be an array' using errcode = '22023';
  end if;
  update public.encounters
  set imported_send_out_labs = proposed_labs
  where id = target_encounter_id and patient_id = target_patient_id
    and imported_send_out_labs::jsonb is not distinct from expected_labs
  returning id into saved_id;
  return saved_id;
end;
$$;
revoke all on function public.save_imported_labs_if_unchanged(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_imported_labs_if_unchanged(uuid, uuid, jsonb, jsonb) to authenticated;
