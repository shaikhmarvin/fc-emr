-- Configurable medical SOAP charting, discipline-specific encounters, and
-- reusable attending signatures.

create table if not exists public.clinic_charting_settings (
  id boolean primary key default true check (id = true),
  medical_soap_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.clinic_charting_settings (id, medical_soap_enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.clinic_charting_settings enable row level security;

drop policy if exists "Authenticated users can read charting settings"
  on public.clinic_charting_settings;
create policy "Authenticated users can read charting settings"
  on public.clinic_charting_settings
  for select
  to authenticated
  using (true);

alter table public.encounters
  add column if not exists note_type text not null default 'medical',
  add column if not exists group_note text not null default '',
  add column if not exists attending_signature_data_url text;

alter table public.encounters
  drop constraint if exists encounters_note_type_check;
alter table public.encounters
  add constraint encounters_note_type_check
  check (note_type in ('medical', 'social_work', 'physical_therapy', 'ophthalmology'));

update public.encounters
set note_type = 'ophthalmology'
where note_type = 'medical'
  and coalesce(intake_data ->> 'specialtyType', '') = 'ophthalmology';

alter table public.profiles
  add column if not exists signature_data_url text,
  add column if not exists signature_updated_at timestamptz,
  add column if not exists signature_updated_by uuid references auth.users(id);

create or replace function public.set_medical_soap_enabled(enabled boolean)
returns public.clinic_charting_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result public.clinic_charting_settings;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'leadership'
      and approval_status = 'approved'
  ) then
    raise exception 'Leadership approval is required to change charting settings'
      using errcode = '42501';
  end if;

  update public.clinic_charting_settings
  set medical_soap_enabled = enabled,
      updated_at = now(),
      updated_by = auth.uid()
  where id = true
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_attending_signature(
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
    or (caller_role = 'attending' and auth.uid() = target_user_id)
  ) then
    raise exception 'Not authorized to save this signature'
      using errcode = '42501';
  end if;

  if target_role <> 'attending' then
    raise exception 'Signatures can only be assigned to attending accounts'
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

revoke all on function public.set_medical_soap_enabled(boolean) from public, anon;
grant execute on function public.set_medical_soap_enabled(boolean) to authenticated;

revoke all on function public.set_attending_signature(uuid, text) from public, anon;
grant execute on function public.set_attending_signature(uuid, text) to authenticated;
