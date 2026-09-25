-- Keep event clinician preference separate from patient demographics.
alter table public.program_entries
  add column if not exists clinician_gender_preference text not null default ''
  check (clinician_gender_preference in ('', 'Male', 'Female'));
