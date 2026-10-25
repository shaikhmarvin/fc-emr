alter table public.lab_import_packets add column if not exists review_progress_json jsonb not null default '{}'::jsonb;
comment on column public.lab_import_packets.review_progress_json is 'Reviewer page checks, confirmed target, and selected encounter; separate from chart results.';
