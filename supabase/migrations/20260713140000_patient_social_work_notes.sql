-- Store Social Work documentation on the patient instead of creating queue-visible encounters.

create table if not exists public.social_work_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  note_text text not null default '',
  status text not null default 'draft' check (status in ('draft', 'completed')),
  author_id uuid references auth.users(id),
  author_role text not null default 'social_work',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references auth.users(id)
);

create index if not exists social_work_notes_patient_created_idx
  on public.social_work_notes (patient_id, created_at desc);

alter table public.social_work_notes enable row level security;

drop policy if exists "Approved users can read Social Work notes" on public.social_work_notes;
create policy "Approved users can read Social Work notes"
  on public.social_work_notes for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.approval_status = 'approved'
    )
  );

drop policy if exists "Social Work can create patient notes" on public.social_work_notes;
create policy "Social Work can create patient notes"
  on public.social_work_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.approval_status = 'approved'
        and profiles.role in ('social_work', 'leadership')
    )
  );

drop policy if exists "Social Work can update draft patient notes" on public.social_work_notes;
create policy "Social Work can update draft patient notes"
  on public.social_work_notes for update to authenticated
  using (
    status = 'draft'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.approval_status = 'approved'
        and profiles.role in ('social_work', 'leadership')
    )
  )
  with check (
    status = 'draft'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.approval_status = 'approved'
        and profiles.role in ('social_work', 'leadership')
    )
  );

create or replace function public.complete_social_work_note(target_note_id uuid)
returns public.social_work_notes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result public.social_work_notes;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and approval_status = 'approved'
      and role in ('social_work', 'leadership')
  ) then
    raise exception 'Social Work or leadership approval is required'
      using errcode = '42501';
  end if;

  update public.social_work_notes
  set status = 'completed',
      completed_at = now(),
      completed_by = auth.uid(),
      updated_at = now()
  where id = target_note_id
    and status = 'draft'
  returning * into result;

  if result.id is null then
    raise exception 'Draft Social Work note not found'
      using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.complete_social_work_note(uuid) from public, anon;
grant execute on function public.complete_social_work_note(uuid) to authenticated;

-- Move notes created by the earlier encounter-based implementation, then remove
-- those synthetic encounters so they disappear from every operational queue.
insert into public.social_work_notes (
  patient_id,
  encounter_id,
  note_text,
  status,
  author_id,
  author_role,
  created_at,
  updated_at,
  completed_at,
  completed_by
)
select
  source.patient_id,
  (
    select linked.id
    from public.encounters linked
    where linked.patient_id = source.patient_id
      and linked.clinic_date = source.clinic_date
      and linked.note_type <> 'social_work'
    order by linked.created_at asc
    limit 1
  ),
  coalesce(source.group_note, ''),
  case when source.soap_status in ('signed', 'completed') then 'completed' else 'draft' end,
  source.soap_author_id,
  coalesce(nullif(source.soap_author_role, ''), 'social_work'),
  source.created_at,
  coalesce(source.soap_completed_at, source.created_at),
  case when source.soap_status in ('signed', 'completed') then coalesce(source.soap_completed_at, source.created_at) else null end,
  case when source.soap_status in ('signed', 'completed') then source.soap_author_id else null end
from public.encounters source
where source.note_type = 'social_work'
  and not exists (
    select 1 from public.social_work_notes existing
    where existing.patient_id = source.patient_id
      and existing.created_at = source.created_at
      and existing.note_text = coalesce(source.group_note, '')
  );

delete from public.encounters where note_type = 'social_work';
