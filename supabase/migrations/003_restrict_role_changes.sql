-- ============================================================================
-- Migration 003: restrict profile/role changes to Founder + Super Admin
-- Run this if you already executed the original supabase/schema.sql.
--
-- The original policy let ANY staff member (recruiter, mentor, etc.) update
-- ANY user's profile — including their `role` column, which meant a
-- recruiter could technically promote themselves (or anyone) to
-- founder. This tightens it: only the record owner, or a Founder /
-- Super Admin, can update a profile.
-- ============================================================================

drop policy if exists "profiles_self_update" on profiles;

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid() or current_role_name() in ('founder', 'super_admin'));
