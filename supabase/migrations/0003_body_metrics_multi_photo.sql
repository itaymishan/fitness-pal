-- Body metrics: support multiple screenshot photos per entry.
-- Run this in the Supabase SQL editor (after 0002_body_metrics.sql).

alter table public.body_metrics
  add column if not exists photo_urls text[];

-- Backfill from the old single-photo column.
update public.body_metrics
  set photo_urls = array[photo_url]
  where photo_url is not null and photo_urls is null;
