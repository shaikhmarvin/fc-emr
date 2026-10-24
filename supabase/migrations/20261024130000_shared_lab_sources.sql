-- Private source images are temporary; extracted results and audit records remain.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lab-import-sources', 'lab-import-sources', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "approved lab reviewers read shared originals"
on storage.objects for select to authenticated
using (bucket_id = 'lab-import-sources' and exists (
  select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')
));

create policy "approved lab reviewers upload originals to their batch"
on storage.objects for insert to authenticated
with check (bucket_id = 'lab-import-sources' and exists (
  select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')
) and exists (
  select 1 from public.lab_import_batches b
  where b.id::text = (storage.foldername(name))[1] and b.created_by = auth.uid()
));

-- Check completion on the server too, so a stale browser cannot delete a pending source.
create policy "approved reviewers remove completed lab originals"
on storage.objects for delete to authenticated
using (bucket_id = 'lab-import-sources' and exists (
  select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')
) and exists (
  select 1 from public.lab_import_batches b where b.id::text = (storage.foldername(name))[1]
) and not exists (
  select 1 from public.lab_import_packets p
  where p.batch_id::text = (storage.foldername(name))[1]
  and (p.review_status is null or p.review_status not in ('saved', 'skipped'))
));
-- Reviewers must see every packet in a shared batch, including other uploaders' packets.
create policy "approved reviewers read shared lab batches"
on public.lab_import_batches for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')));
create policy "approved reviewers read all shared lab packets"
on public.lab_import_packets for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')));
create policy "approved reviewers update shared lab packets"
on public.lab_import_packets for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')))
with check (exists (select 1 from public.profiles where id = auth.uid()
  and approval_status = 'approved' and role in ('leadership', 'lab')));
