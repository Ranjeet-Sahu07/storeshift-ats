-- ============================================================================
-- Migration 010: Bulk/broadcast email feature
--
-- Adds a private storage bucket for attachments uploaded through the new
-- admin "Email Center" (Broadcast) composer, and an `attachments` column
-- on email_log so sent broadcasts keep a record of what was attached
-- (filenames/sizes only — not the file bytes, which stay in storage).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', false)
on conflict (id) do nothing;

create policy "staff_manage_email_attachments" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'email-attachments' and is_staff())
  with check (bucket_id = 'email-attachments' and is_staff());

alter table email_log add column if not exists attachments jsonb;

-- hr_manager gets the new emails.send permission in the Roles admin
-- screen (matches src/lib/rbac.ts in the same change).
insert into role_permissions (role, permission)
values ('hr_manager', 'emails.send'), ('recruiter', 'emails.send')
on conflict do nothing;
