create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  patient_id uuid references public.patients(id) on delete set null,
  title text not null default '',
  body text not null,
  color text not null default 'yellow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sticky_notes_user_updated_idx
  on public.sticky_notes (user_id, updated_at desc);

create index if not exists sticky_notes_patient_idx
  on public.sticky_notes (patient_id);

alter table public.sticky_notes enable row level security;

drop policy if exists "Users can read their own sticky notes" on public.sticky_notes;
create policy "Users can read their own sticky notes"
  on public.sticky_notes
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can create their own sticky notes" on public.sticky_notes;
create policy "Users can create their own sticky notes"
  on public.sticky_notes
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own sticky notes" on public.sticky_notes;
create policy "Users can update their own sticky notes"
  on public.sticky_notes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own sticky notes" on public.sticky_notes;
create policy "Users can delete their own sticky notes"
  on public.sticky_notes
  for delete
  using (user_id = auth.uid());
