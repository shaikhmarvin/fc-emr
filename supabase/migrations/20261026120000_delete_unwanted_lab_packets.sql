-- Keep a minimal deleted marker so stale reviews cannot recreate an unwanted fax.
create or replace function public.delete_unwanted_lab_packets(packet_ids uuid[])
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare packet public.lab_import_packets%rowtype; batch uuid; seen integer := 0; expected integer;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and approval_status='approved' and role in ('leadership','lab')) then
    raise exception 'Approved lab reviewer access required' using errcode='42501';
  end if;
  select count(distinct id) into expected from unnest(packet_ids) id;
  if expected=0 then raise exception 'Select a packet to delete'; end if;
  for packet in select * from public.lab_import_packets where id=any(packet_ids) order by id for update loop
    seen:=seen+1;
    if packet.review_status in ('saved','deleted') then raise exception 'This packet was already saved or deleted. Reload before continuing.'; end if;
    if batch is not null and batch<>packet.batch_id then raise exception 'Delete packets from one upload at a time'; end if;
    batch:=packet.batch_id;
    if exists(select 1 from public.encounters e cross join lateral jsonb_array_elements(coalesce(e.imported_send_out_labs,'[]'::jsonb)) l where l->>'sourceImportPacketId'=packet.id::text)
      or exists(select 1 from public.patients p cross join lateral jsonb_array_elements(p.imported_send_out_labs) l where l->>'sourceImportPacketId'=packet.id::text) then
      raise exception 'This packet has saved chart results and cannot be deleted here';
    end if;
  end loop;
  if seen<>expected then raise exception 'A packet is no longer available. Reload before continuing.'; end if;
  delete from public.lab_import_audit_items where packet_id=any(select id::text from unnest(packet_ids) id);
  update public.lab_import_packets set review_status='deleted',raw_text='',parsed_labs_json='[]'::jsonb,
    extracted_name='',extracted_dob=null,collected_date=null,matched_patient_id=null,matched_encounter_id=null,
    match_candidates_json='[]'::jsonb,review_progress_json='{}'::jsonb,suspicious_count=0,missing_count=0,total_lab_count=0,
    reviewer_note='Deleted: unwanted fax / not our patient',reviewed_by=auth.uid(),reviewed_at=now(),
    duplicate_summary_json=jsonb_build_object('sourceDocument',jsonb_build_object(
      'id',duplicate_summary_json->'sourceDocument'->>'id',
      'sharedFile',duplicate_summary_json->'sourceDocument'->'sharedFile'))
    where id=any(packet_ids);
  return batch;
end; $$;
revoke all on function public.delete_unwanted_lab_packets(uuid[]) from public, anon;
grant execute on function public.delete_unwanted_lab_packets(uuid[]) to authenticated;

create or replace function public.protect_deleted_lab_packet()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if old.review_status='deleted' and (new.review_status is distinct from 'deleted'
   or coalesce(new.raw_text,'')<>'' or new.parsed_labs_json is distinct from '[]'::jsonb
   or coalesce(new.extracted_name,'')<>'' or new.extracted_dob is not null or new.collected_date is not null
   or new.matched_patient_id is not null or new.matched_encounter_id is not null
   or new.review_progress_json is distinct from '{}'::jsonb or new.match_candidates_json is distinct from '[]'::jsonb) then
   raise exception 'This packet has been deleted. Reload the lab import queue.';
 end if;
 return new;
end; $$;
drop trigger if exists protect_deleted_lab_packet on public.lab_import_packets;
create trigger protect_deleted_lab_packet before update on public.lab_import_packets
for each row execute function public.protect_deleted_lab_packet();

-- A stale browser must not save chart results after another reviewer deletes
-- the packet. Lock its marker until the chart write finishes.
create or replace function public.reject_deleted_lab_source()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare lab jsonb; state text;
begin
 for lab in select value from jsonb_array_elements(coalesce(new.imported_send_out_labs,'[]'::jsonb))
   except select value from jsonb_array_elements(coalesce(old.imported_send_out_labs,'[]'::jsonb)) loop
   if lab->>'sourceImportPacketId' is null then continue; end if;
   select review_status into state from public.lab_import_packets where id::text=lab->>'sourceImportPacketId' for update;
   if state='deleted' then raise exception 'This lab packet was deleted by another reviewer. Reload before saving.'; end if;
 end loop;
 return new;
end; $$;
drop trigger if exists reject_deleted_lab_source on public.encounters;
create trigger reject_deleted_lab_source before update of imported_send_out_labs on public.encounters
for each row execute function public.reject_deleted_lab_source();
drop trigger if exists reject_deleted_lab_source on public.patients;
create trigger reject_deleted_lab_source before update of imported_send_out_labs on public.patients
for each row execute function public.reject_deleted_lab_source();

drop policy if exists "approved reviewers remove completed lab originals" on storage.objects;
create policy "approved reviewers remove completed lab originals" on storage.objects for delete to authenticated
using(bucket_id='lab-import-sources'
 and exists(select 1 from public.profiles where id=auth.uid() and approval_status='approved' and role in ('leadership','lab'))
 and exists(select 1 from public.lab_import_batches b where b.id::text=(storage.foldername(name))[1])
 and not exists(select 1 from public.lab_import_packets p where p.batch_id::text=(storage.foldername(name))[1]
   and (p.review_status is null or p.review_status not in ('saved','deleted'))));

create or replace function public.clear_completed_lab_batch(target_batch_id uuid)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and approval_status='approved' and role in ('leadership','lab')) then
   raise exception 'Approved lab reviewer access required' using errcode='42501'; end if;
 perform id from public.lab_import_packets where batch_id=target_batch_id for update;
 if not exists(select 1 from public.lab_import_packets where batch_id=target_batch_id)
   or exists(select 1 from public.lab_import_packets where batch_id=target_batch_id and (review_status is null or review_status not in ('saved','deleted'))) then return false; end if;
 update public.lab_import_packets set raw_text='',parsed_labs_json='[]'::jsonb,match_candidates_json='[]'::jsonb,
   review_progress_json='{}'::jsonb,duplicate_summary_json=jsonb_build_object('sourceDocument',jsonb_build_object(
   'id',duplicate_summary_json->'sourceDocument'->>'id','name',duplicate_summary_json->'sourceDocument'->>'name','completed',true))
   where batch_id=target_batch_id;
 update public.lab_import_batches set status='completed' where id=target_batch_id;
 return true;
end; $$;
revoke all on function public.clear_completed_lab_batch(uuid) from public,anon;
grant execute on function public.clear_completed_lab_batch(uuid) to authenticated;
