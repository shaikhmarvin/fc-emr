alter table public.sticky_notes
  add column if not exists title text not null default '';
