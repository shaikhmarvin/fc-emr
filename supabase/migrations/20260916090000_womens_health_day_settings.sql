create table if not exists public.womens_health_day_settings (
  id boolean primary key default true check (id = true),
  event_date date,
  theme text not null default 'rose' check (theme in ('rose', 'coral', 'lavender')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.womens_health_day_settings (id) values (true)
on conflict (id) do nothing;

alter table public.womens_health_day_settings enable row level security;

create policy "authenticated users can read womens health day settings"
on public.womens_health_day_settings for select to authenticated using (true);

create or replace function public.set_womens_health_day_settings(next_event_date date, next_theme text)
returns public.womens_health_day_settings
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result public.womens_health_day_settings;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leadership' and approval_status = 'approved'
  ) then
    raise exception 'Only leadership can change Women''s Health Day settings';
  end if;
  if next_theme not in ('rose', 'coral', 'lavender') then
    raise exception 'Invalid Women''s Health Day theme';
  end if;
  if next_event_date is not null and extract(isodow from next_event_date) <> 6 then
    raise exception 'Women''s Health Day must be on a Saturday';
  end if;

  update public.womens_health_day_settings
  set event_date = next_event_date, theme = next_theme,
      updated_at = now(), updated_by = auth.uid()
  where id = true returning * into result;
  return result;
end;
$$;

revoke all on function public.set_womens_health_day_settings(date, text) from public, anon;
grant execute on function public.set_womens_health_day_settings(date, text) to authenticated;

alter publication supabase_realtime add table public.womens_health_day_settings;
