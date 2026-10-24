-- Skipped packets remain reviewable, so their original must remain available.
drop policy if exists "approved reviewers remove completed lab originals" on storage.objects;
create policy "approved reviewers remove completed lab originals"
on storage.objects for delete to authenticated
using (bucket_id = 'lab-import-sources'
  and exists (select 1 from public.profiles where id = auth.uid() and approval_status = 'approved' and role in ('leadership', 'lab'))
  and exists (select 1 from public.lab_import_batches b where b.id::text = (storage.foldername(name))[1])
  and not exists (select 1 from public.lab_import_packets p where p.batch_id::text = (storage.foldername(name))[1] and p.review_status is distinct from 'saved'));

create or replace function public.clear_completed_lab_batch(target_batch_id uuid)
returns boolean language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and approval_status = 'approved' and role in ('leadership', 'lab')) then
    raise exception 'Approved lab reviewer access required' using errcode = '42501';
  end if;
  perform id from public.lab_import_packets where batch_id = target_batch_id for update;
  if not exists (select 1 from public.lab_import_packets where batch_id = target_batch_id)
    or exists (select 1 from public.lab_import_packets where batch_id = target_batch_id and review_status is distinct from 'saved') then return false; end if;
  -- Minimal fingerprint and patient/visit links remain for duplicate detection.
  update public.lab_import_packets set raw_text = '', parsed_labs_json = '[]'::jsonb,
    match_candidates_json = '[]'::jsonb,
    duplicate_summary_json = jsonb_build_object('sourceDocument', jsonb_build_object(
      'id', duplicate_summary_json->'sourceDocument'->>'id',
      'name', duplicate_summary_json->'sourceDocument'->>'name', 'completed', true))
  where batch_id = target_batch_id;
  update public.lab_import_batches set status = 'completed' where id = target_batch_id;
  return true;
end; $$;
revoke all on function public.clear_completed_lab_batch(uuid) from public, anon;
grant execute on function public.clear_completed_lab_batch(uuid) to authenticated;
create policy "approved reviewers complete shared lab batches"
on public.lab_import_batches for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and approval_status = 'approved' and role in ('leadership', 'lab')))
with check (exists (select 1 from public.profiles where id = auth.uid() and approval_status = 'approved' and role in ('leadership', 'lab')));
