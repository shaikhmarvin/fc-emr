-- Allow leadership to schedule Women's Health Day on any calendar date.
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

  update public.womens_health_day_settings
  set event_date = next_event_date, theme = next_theme,
      updated_at = now(), updated_by = auth.uid()
  where id = true returning * into result;
  return result;
end;
$$;
