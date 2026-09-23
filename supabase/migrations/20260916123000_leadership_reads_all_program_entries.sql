-- An approved leadership account can read every specialty referral,
-- regardless of who entered or coordinates it. Existing policies remain intact.
create policy "approved leadership can read all program entries"
on public.program_entries for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'leadership'
      and approval_status = 'approved'
  )
);
