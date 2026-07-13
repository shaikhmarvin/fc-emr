-- Completed Physical Therapy notes carry an electronic attestation and a
-- snapshot of the therapist's saved drawn signature.

alter table public.encounters
  add column if not exists discipline_note_status text not null default 'draft',
  add column if not exists discipline_signed_by uuid references auth.users(id),
  add column if not exists discipline_signed_at timestamptz,
  add column if not exists discipline_signer_name text,
  add column if not exists discipline_signature_data_url text;

alter table public.encounters
  drop constraint if exists encounters_discipline_note_status_check;
alter table public.encounters
  add constraint encounters_discipline_note_status_check
  check (discipline_note_status in ('draft', 'completed'));

create or replace function public.set_clinical_signature(
  target_user_id uuid,
  signature_data text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_role text;
  caller_approved boolean;
  target_role text;
begin
  select role, approval_status = 'approved'
  into caller_role, caller_approved
  from public.profiles
  where id = auth.uid();

  select role into target_role
  from public.profiles
  where id = target_user_id;

  if caller_approved is not true or not (
    caller_role = 'leadership'
    or (caller_role in ('attending', 'physical_therapy') and auth.uid() = target_user_id)
  ) then
    raise exception 'Not authorized to save this signature'
      using errcode = '42501';
  end if;

  if target_role not in ('attending', 'physical_therapy') then
    raise exception 'Signatures can only be assigned to attending or Physical Therapy accounts'
      using errcode = '22023';
  end if;

  if signature_data is not null and (
    signature_data !~ '^data:image/png;base64,'
    or length(signature_data) > 500000
  ) then
    raise exception 'Signature must be a PNG image under 500 KB'
      using errcode = '22023';
  end if;

  update public.profiles
  set signature_data_url = nullif(signature_data, ''),
      signature_updated_at = now(),
      signature_updated_by = auth.uid()
  where id = target_user_id;
end;
$$;

create or replace function public.complete_physical_therapy_note(target_encounter_id uuid)
returns public.encounters
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  therapist public.profiles;
  result public.encounters;
begin
  select * into therapist
  from public.profiles
  where id = auth.uid()
    and role = 'physical_therapy'
    and approval_status = 'approved';

  if therapist.id is null then
    raise exception 'An approved Physical Therapy account is required to complete this note'
      using errcode = '42501';
  end if;

  if therapist.signature_data_url is null then
    raise exception 'Save a Physical Therapy signature before completing this note'
      using errcode = '22023';
  end if;

  update public.encounters
  set note_type = 'physical_therapy',
      discipline_note_status = 'completed',
      discipline_signed_by = therapist.id,
      discipline_signed_at = now(),
      discipline_signer_name = coalesce(nullif(therapist.full_name, ''), therapist.email, 'Physical Therapist'),
      discipline_signature_data_url = therapist.signature_data_url
  where id = target_encounter_id
    and discipline_note_status = 'draft'
    and length(trim(coalesce(group_note, ''))) > 0
    and (
      note_type = 'physical_therapy'
      or lower(coalesce(intake_data ->> 'specialtyType', intake_data ->> 'specialty_type', ''))
        in ('pt', 'physical_therapy', 'physical therapy')
    )
  returning * into result;

  if result.id is null then
    raise exception 'An editable Physical Therapy note was not found'
      using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.set_clinical_signature(uuid, text) from public, anon;
grant execute on function public.set_clinical_signature(uuid, text) to authenticated;
revoke all on function public.complete_physical_therapy_note(uuid) from public, anon;
grant execute on function public.complete_physical_therapy_note(uuid) to authenticated;
