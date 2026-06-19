create table if not exists public.clinic_board_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null,
  is_active boolean not null default false,
  is_saved boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_board_messages_active_idx
  on public.clinic_board_messages (is_active, updated_at desc);

create index if not exists clinic_board_messages_saved_idx
  on public.clinic_board_messages (is_saved, updated_at desc);

alter table public.clinic_board_messages enable row level security;

drop policy if exists "Authenticated users can read board messages" on public.clinic_board_messages;
create policy "Authenticated users can read board messages"
  on public.clinic_board_messages
  for select
  using (auth.uid() is not null);

drop policy if exists "Leadership can create board messages" on public.clinic_board_messages;
create policy "Leadership can create board messages"
  on public.clinic_board_messages
  for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'leadership'
    )
  );

drop policy if exists "Leadership can update board messages" on public.clinic_board_messages;
create policy "Leadership can update board messages"
  on public.clinic_board_messages
  for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'leadership'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'leadership'
    )
  );

drop policy if exists "Leadership can delete saved board messages" on public.clinic_board_messages;
create policy "Leadership can delete saved board messages"
  on public.clinic_board_messages
  for delete
  using (
    is_saved = true
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'leadership'
    )
  );
