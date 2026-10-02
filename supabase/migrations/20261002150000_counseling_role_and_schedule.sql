-- Keep the profile role allowlist aligned with the signup and leadership forms.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'student',
      'upper_level',
      'attending',
      'leadership',
      'undergraduate',
      'pharmacy',
      'lab',
      'social_work',
      'physical_therapy',
      'counseling'
    )
  );


alter table public.program_settings add column if not exists counseling_enabled boolean not null default true;
insert into public.program_settings (program_type, primary_count, backup_count) values ('Counseling', 8, 3)
on conflict (program_type) do nothing;
