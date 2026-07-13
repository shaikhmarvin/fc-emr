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
      'physical_therapy'
    )
  );

-- Repair a PT signup if Auth created the user before the old role constraint
-- rejected the corresponding clinic profile.
insert into public.profiles (
  id,
  email,
  full_name,
  classification,
  role,
  approval_status,
  signature_pin_set,
  signature_pin_hash
)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  null,
  'physical_therapy',
  'pending',
  false,
  null
from auth.users users
where users.raw_user_meta_data ->> 'role' = 'physical_therapy'
  and not exists (
    select 1 from public.profiles profiles where profiles.id = users.id
  );
