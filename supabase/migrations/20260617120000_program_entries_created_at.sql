-- Track and sort specialty program entries by the date the referral entry was created.
-- For intake-generated historical referrals, backfill created_at from the matching
-- encounter request date when that encounter is earlier than the tracker row.

alter table public.program_entries
  add column if not exists created_at timestamptz;

alter table public.program_entries
  alter column created_at set default now();

update public.program_entries
set created_at = now()
where created_at is null;

alter table public.program_entries
  alter column created_at set not null;

create index if not exists program_entries_created_at_idx
  on public.program_entries (created_at desc);

with requested_encounters as (
  select
    pe.id as program_entry_id,
    min(
      coalesce(
        e.created_at,
        (nullif(e.clinic_date::text, '')::date)::timestamptz
      )
    ) as requested_at
  from public.program_entries pe
  join public.encounters e
    on e.patient_id = pe.patient_id
  where e.intake_data is not null
    and (
      (
        pe.program_type = 'Physical Therapy'
        and nullif(trim(e.intake_data->>'physicalTherapy'), '') is not null
        and lower(trim(e.intake_data->>'physicalTherapy')) <> 'n/a'
      )
      or (
        pe.program_type = 'Dermatology'
        and nullif(trim(e.intake_data->>'dermatology'), '') is not null
        and lower(trim(e.intake_data->>'dermatology')) <> 'n/a'
      )
      or (
        pe.program_type = 'Ophthalmology'
        and nullif(trim(e.intake_data->>'ophthalmology'), '') is not null
        and lower(trim(e.intake_data->>'ophthalmology')) <> 'n/a'
      )
      or (
        pe.program_type = 'Mental Health'
        and nullif(trim(e.intake_data->>'mentalHealthCombined'), '') is not null
        and lower(trim(e.intake_data->>'mentalHealthCombined')) <> 'n/a'
      )
      or (
        pe.program_type = 'Counseling'
        and nullif(trim(e.intake_data->>'counseling'), '') is not null
        and lower(trim(e.intake_data->>'counseling')) <> 'n/a'
      )
      or (
        pe.program_type = 'Addiction Medicine'
        and (
          lower(trim(e.intake_data->>'substanceUseTreatment')) in ('yes', 'maybe')
          or (
            nullif(trim(e.intake_data->>'substanceUseNotes'), '') is not null
            and lower(trim(e.intake_data->>'substanceUseNotes')) <> 'n/a'
          )
        )
      )
      or (
        pe.program_type = 'Mammogram'
        and lower(trim(e.intake_data->>'mammogramStatus')) = 'interested'
      )
      or (
        pe.program_type = 'Colonoscopy'
        and lower(trim(e.intake_data->>'colonoscopyStatus')) = 'interested'
      )
    )
  group by pe.id
)
update public.program_entries pe
set created_at = requested_encounters.requested_at
from requested_encounters
where pe.id = requested_encounters.program_entry_id
  and requested_encounters.requested_at is not null
  and requested_encounters.requested_at < pe.created_at;
