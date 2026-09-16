-- Preserve every existing allowed program type while admitting Women's Health Day.
do $$
declare
  existing_check text;
begin
  select pg_get_expr(constraint_row.conbin, constraint_row.conrelid)
  into existing_check
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.program_entries'::regclass
    and constraint_row.conname = 'program_entries_program_type_check'
    and constraint_row.contype = 'c';

  if existing_check is not null
     and position('Women''s Health Day' in existing_check) = 0 then
    alter table public.program_entries
      drop constraint program_entries_program_type_check;

    execute format(
      'alter table public.program_entries add constraint program_entries_program_type_check check ((%s) or program_type = %L)',
      existing_check,
      'Women''s Health Day'
    );
  end if;
end;
$$;

-- Some installations also constrain status values; extend that check if present.
do $$
declare
  existing_check text;
begin
  select pg_get_expr(constraint_row.conbin, constraint_row.conrelid)
  into existing_check
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.program_entries'::regclass
    and constraint_row.conname = 'program_entries_status_check'
    and constraint_row.contype = 'c';

  if existing_check is not null
     and position('Pending Acceptance' in existing_check) = 0 then
    alter table public.program_entries
      drop constraint program_entries_status_check;

    execute format(
      'alter table public.program_entries add constraint program_entries_status_check check ((%s) or (program_type = %L and status in (%L, %L, %L, %L, %L)))',
      existing_check,
      'Women''s Health Day',
      'New Referral',
      'LVM',
      'Pending Acceptance',
      'Accepted',
      'Declined'
    );
  end if;
end;
$$;
