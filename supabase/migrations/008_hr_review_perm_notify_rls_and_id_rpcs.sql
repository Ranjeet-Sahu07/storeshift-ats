-- ============================================================================
-- Migration 008: HR Manager "review" permission, atomic ID-generation RPCs
-- for Certificates/Offer Letters/LORs/CSV import, and a Notifications RLS
-- fix (staff/mentors could never actually create a notification for
-- someone else before this).
-- ============================================================================

-- --- Part 1: HR Manager couldn't see the Applications nav item -------------
-- role_permissions is what the Roles admin page displays/edits, so this
-- keeps that screen honest. The actual nav-gating fix (src/lib/rbac.ts)
-- ships in the same code change as this migration.
insert into role_permissions (role, permission)
values ('hr_manager', 'applications.review')
on conflict do nothing;

-- --- Part 2: atomic ID-generation RPCs --------------------------------------
-- Certificates, Offer Letters, LORs, and CSV-imported Applications were
-- still computing their next ID client-side as "count existing rows, add
-- one" — the exact race-condition pattern that migration 006 fixed for
-- normal application submission, just left behind in these four other
-- spots. These RPCs expose the same atomic sequences (created in 006)
-- directly, so the client can get a real, collision-proof ID up front
-- (needed before it can build the QR/verification URL or the PDF).
-- The BEFORE INSERT triggers from 006 still work unchanged — they only
-- generate an ID when one wasn't already supplied — so passing one of
-- these values into an insert is exactly equivalent to leaving the
-- column null and letting the trigger fill it in.
create or replace function public.next_application_id()
returns text language plpgsql security definer as $$
begin
  return 'SS-APP-' || extract(year from now())::int || '-' || lpad(nextval('application_id_seq')::text, 6, '0');
end;
$$;

create or replace function public.next_certificate_id()
returns text language plpgsql security definer as $$
begin
  return 'SS-INT-' || extract(year from now())::int || '-' || lpad(nextval('certificate_id_seq')::text, 4, '0');
end;
$$;

create or replace function public.next_offer_id()
returns text language plpgsql security definer as $$
begin
  return 'SS-OFR-' || extract(year from now())::int || '-' || lpad(nextval('offer_id_seq')::text, 4, '0');
end;
$$;

create or replace function public.next_lor_id()
returns text language plpgsql security definer as $$
begin
  return 'SS-LOR-' || extract(year from now())::int || '-' || lpad(nextval('lor_id_seq')::text, 4, '0');
end;
$$;

revoke all on function public.next_application_id from public;
revoke all on function public.next_certificate_id from public;
revoke all on function public.next_offer_id from public;
revoke all on function public.next_lor_id from public;

-- Staff-only in practice (only called from admin pages, which are already
-- gated by RLS/role checks elsewhere) — restricted to authenticated so an
-- anonymous visitor can't burn through the sequence.
grant execute on function public.next_application_id to authenticated;
grant execute on function public.next_certificate_id to authenticated;
grant execute on function public.next_offer_id to authenticated;
grant execute on function public.next_lor_id to authenticated;

-- --- Part 3: notifications RLS actually blocked the one thing it exists
-- for ----------------------------------------------------------------------
-- The original "notifications_owner" policy was `for all using
-- (recipient_id = auth.uid())` — which also governs INSERT, meaning the
-- only row anyone could ever insert was a notification addressed to
-- *themselves*. Nothing in the app could ever notify someone else (an
-- intern about a new task, a mentor about a new message, etc.), so the
-- notifications table stayed permanently empty and the bell in the
-- topbar had nothing to show. Split into three policies: any
-- authenticated user (staff or intern) can create a notification for
-- anyone, but only the recipient can read or mark their own as read.
drop policy if exists "notifications_owner" on notifications;

create policy "notifications_select_own" on notifications
  for select using (recipient_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (recipient_id = auth.uid());

create policy "notifications_insert_authenticated" on notifications
  for insert to authenticated with check (true);
