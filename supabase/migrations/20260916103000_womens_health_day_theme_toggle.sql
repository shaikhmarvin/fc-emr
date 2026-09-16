-- The event date does not activate the theme. Rose & Plum is the sole option.
alter table public.womens_health_day_settings
add column if not exists theme_enabled boolean not null default false;

update public.womens_health_day_settings set theme = 'rose';

drop function if exists public.set_womens_health_day_settings(date, text);

create function public.set_womens_health_day_settings(next_event_date date, next_theme_enabled boolean)
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

  update public.womens_health_day_settings
  set event_date = next_event_date,
      theme = 'rose',
      theme_enabled = coalesce(next_theme_enabled, false),
      updated_at = now(),
      updated_by = auth.uid()
  where id = true returning * into result;
  return result;
end;
$$;

revoke all on function public.set_womens_health_day_settings(date, boolean) from public, anon;
grant execute on function public.set_womens_health_day_settings(date, boolean) to authenticated;
