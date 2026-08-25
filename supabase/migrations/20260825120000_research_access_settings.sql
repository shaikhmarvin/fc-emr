create table if not exists public.research_access_settings (
  id boolean primary key default true check (id = true),
  leadership_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.research_access_settings (id, leadership_enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.research_access_settings enable row level security;

create policy "authenticated users can read research access"
on public.research_access_settings for select
to authenticated
using (true);

create or replace function public.set_research_leadership_access(enabled boolean)
returns public.research_access_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.research_access_settings;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'marvin.shaikh@ttuhsc.edu' then
    raise exception 'Only the research owner can change this setting';
  end if;

  update public.research_access_settings
  set leadership_enabled = enabled,
      updated_at = now(),
      updated_by = auth.uid()
  where id = true
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_research_leadership_access(boolean) from public;
revoke all on function public.set_research_leadership_access(boolean) from anon;
grant execute on function public.set_research_leadership_access(boolean) to authenticated;

alter publication supabase_realtime add table public.research_access_settings;
