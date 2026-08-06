-- ============================================================================
-- Migration 002: resume-as-link + education percentages
-- Run this if you already executed the original supabase/schema.sql.
-- Safe to re-run (all statements are guarded with IF NOT EXISTS / OR REPLACE).
-- ============================================================================

alter table applications add column if not exists resume_url text;
alter table applications add column if not exists tenth_percentage numeric(5,2);
alter table applications add column if not exists twelfth_percentage numeric(5,2);
alter table applications add column if not exists graduation_percentage numeric(5,2);

-- photo_path is no longer collected by the application form. The column is
-- left in place (harmless, nullable) so you don't lose any photos already
-- uploaded under the old flow — drop it manually later if you don't need it:
--   alter table applications drop column if exists photo_path;
