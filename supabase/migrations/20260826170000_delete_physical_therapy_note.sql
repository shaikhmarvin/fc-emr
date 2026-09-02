-- Allow only approved Physical Therapy or leadership users to permanently
-- delete discipline-specific PT note encounters.

create or replace function public.delete_physical_therapy_note(
  target_encounter_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_id uuid;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('physical_therapy', 'leadership')
      and approval_status = 'approved'
  ) then
    raise exception 'An approved Physical Therapy or leadership account is required to delete this note'
      using errcode = '42501';
  end if;

  delete from public.encounters
  where id = target_encounter_id
    and (
      note_type = 'physical_therapy'
      or lower(coalesce(intake_data ->> 'specialtyType', intake_data ->> 'specialty_type', ''))
        in ('pt', 'physical_therapy', 'physical therapy')
    )
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'A Physical Therapy note was not found'
      using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_physical_therapy_note(uuid) from public, anon;
grant execute on function public.delete_physical_therapy_note(uuid) to authenticated;
