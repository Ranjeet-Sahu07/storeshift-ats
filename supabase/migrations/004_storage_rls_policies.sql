-- ============================================================================
-- Migration 004: storage RLS policies (CRITICAL — run this first)
--
-- This is the fix for:
--   - "new row violates row-level security policy" when generating an
--     offer letter or LOR
--   - Certificate/offer-letter downloads returning 404 "Object not found"
--     even though the database row says the document was issued
--
-- Root cause: creating a storage bucket does not grant any access to it.
-- storage.objects has its own RLS, separate from every policy in
-- schema.sql on the public tables. No policy existed for the
-- certificates / offer-letters / lor buckets, so every upload was
-- silently rejected — but the code path that ran afterwards still
-- inserted the database row referencing a file that was never actually
-- written, which is why some rows show "Issued" but 404 on download.
--
-- After running this migration, RE-GENERATE any document that currently
-- 404s (the admin UI now has a "Regenerate" action for exactly this) —
-- this migration fixes future uploads, it doesn't restore files that
-- were never written in the first place.
-- ============================================================================

drop policy if exists "staff_manage_generated_documents" on storage.objects;
create policy "staff_manage_generated_documents" on storage.objects
  for all
  to authenticated
  using (bucket_id in ('certificates', 'offer-letters', 'lor') and is_staff())
  with check (bucket_id in ('certificates', 'offer-letters', 'lor') and is_staff());

drop policy if exists "public_read_certificates" on storage.objects;
create policy "public_read_certificates" on storage.objects
  for select
  using (bucket_id = 'certificates');
