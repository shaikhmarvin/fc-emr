begin;

alter table public.program_entries
  drop constraint if exists program_entries_clinician_gender_preference_check;

-- A previously recorded Male preference does not mean No Preference.
update public.program_entries
set clinician_gender_preference = ''
where clinician_gender_preference = 'Male';

alter table public.program_entries
  add constraint program_entries_clinician_gender_preference_check
  check (clinician_gender_preference in ('', 'No Preference', 'Female'));

commit;
