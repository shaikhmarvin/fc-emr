-- Prevent stale devices from overwriting newer encounter workflow decisions.

alter table public.encounters
  add column if not exists workflow_version bigint not null default 0;

create or replace function public.bump_encounter_workflow_version()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if
    new.status is distinct from old.status
    or new.soap_status is distinct from old.soap_status
    or new.upper_level_signed_by is distinct from old.upper_level_signed_by
    or new.upper_level_signed_at is distinct from old.upper_level_signed_at
    or new.attending_signed_by is distinct from old.attending_signed_by
    or new.attending_signed_at is distinct from old.attending_signed_at
    or new.attending_signature_data_url is distinct from old.attending_signature_data_url
    or new.skip_upper_level is distinct from old.skip_upper_level
    or new.skip_upper_level_by is distinct from old.skip_upper_level_by
    or new.skip_upper_level_at is distinct from old.skip_upper_level_at
    or new.discipline_note_status is distinct from old.discipline_note_status
    or new.discipline_signed_by is distinct from old.discipline_signed_by
    or new.discipline_signed_at is distinct from old.discipline_signed_at
    or new.discipline_signature_data_url is distinct from old.discipline_signature_data_url
  then
    new.workflow_version := old.workflow_version + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists encounters_workflow_version_trigger on public.encounters;
create trigger encounters_workflow_version_trigger
before update on public.encounters
for each row execute function public.bump_encounter_workflow_version();
