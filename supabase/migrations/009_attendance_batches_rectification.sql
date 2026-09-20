-- ============================================================================
-- Migration 009: Attendance overhaul — batches, admin/mentor-scoped RLS,
-- and a rectification-request workflow for correcting past attendance.
--
-- Previously ANY staff member (including mentors) could freely insert,
-- update, or delete an attendance row for ANY date via
-- "attendance_staff_all" — there was no actual distinction between what
-- an admin could do and what a mentor could do; the UI happened to only
-- expose one flow. This migration makes that distinction a real RLS
-- boundary:
--   - Admins (founder / super_admin / hr_manager) can insert, update, or
--     delete any attendance row for any date, create/edit batches, and
--     fix an internship's start/end date directly.
--   - Mentors can insert a new attendance row for today or for any past
--     date that has no record yet (i.e. genuinely backfilling a missed
--     day), and can update an existing row only if it's for today.
--     Correcting an *existing* row for a past date has to go through
--     attendance_rectification_requests, which an admin approves or
--     rejects.
-- ============================================================================

-- --- Batches -----------------------------------------------------------
create table batches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table internships add column if not exists batch_id uuid references batches(id) on delete set null;
create index if not exists idx_internships_batch on internships(batch_id);

alter table batches enable row level security;

-- --- Rectification requests ---------------------------------------------
create type attendance_request_status as enum ('pending', 'approved', 'rejected');

create table attendance_rectification_requests (
  id uuid primary key default uuid_generate_v4(),
  internship_id uuid not null references internships(id) on delete cascade,
  date date not null,
  requested_status attendance_status not null,
  requested_check_in time,
  requested_check_out time,
  reason text not null,
  previous_status attendance_status,          -- snapshot of what it was before (null = no existing record)
  status attendance_request_status not null default 'pending',
  requested_by uuid not null references profiles(id),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now()
);

create index idx_attn_req_internship on attendance_rectification_requests(internship_id);
create index idx_attn_req_status on attendance_rectification_requests(status);

alter table attendance_rectification_requests enable row level security;

-- --- Helper: is the current user an attendance admin? -------------------
create or replace function is_attendance_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('founder', 'super_admin', 'hr_manager')
  );
$$;

-- --- Batches RLS ----------------------------------------------------------
create policy "batches_staff_select" on batches for select using (is_staff());
create policy "batches_admin_write" on batches for insert with check (is_attendance_admin());
create policy "batches_admin_update" on batches for update using (is_attendance_admin());
create policy "batches_admin_delete" on batches for delete using (is_attendance_admin());

-- --- Rectification requests RLS -------------------------------------------
-- Any staff member can see requests (mentors need to see their own
-- status; admins need to see everyone's to action them).
create policy "attn_req_staff_select" on attendance_rectification_requests
  for select using (is_staff());

-- A mentor may only file a request for an internship they actually mentor;
-- admins can also file one (rarely needed, since they can just edit
-- directly, but kept for consistency).
create policy "attn_req_insert" on attendance_rectification_requests
  for insert with check (
    requested_by = auth.uid()
    and (
      is_attendance_admin()
      or exists (select 1 from internships i where i.id = internship_id and i.mentor_id = auth.uid())
    )
  );

-- Only an admin can approve/reject (i.e. update status/review fields).
create policy "attn_req_admin_update" on attendance_rectification_requests
  for update using (is_attendance_admin());

-- --- Attendance RLS — replaces the old blanket "any staff, any date" ------
drop policy if exists "attendance_staff_all" on attendance;

-- Admins: unrestricted.
create policy "attendance_admin_all" on attendance
  for all using (is_attendance_admin()) with check (is_attendance_admin());

-- All staff (including mentors) can read attendance — unchanged from
-- before, needed for reports/dashboards/sheet export.
create policy "attendance_staff_select" on attendance
  for select using (is_staff());

-- Mentors: insert allowed for today, or for a past date with no existing
-- row yet (backfilling a genuinely missed day) — enforced by the table's
-- existing unique(internship_id, date) constraint doing the "no existing
-- row" check for us. Only for interns they actually mentor.
create policy "attendance_mentor_insert" on attendance
  for insert with check (
    date <= current_date
    and exists (select 1 from internships i where i.id = attendance.internship_id and i.mentor_id = auth.uid())
  );

-- Mentors: update allowed only for today's own row — anything else must
-- go through a rectification request.
create policy "attendance_mentor_update_today" on attendance
  for update using (
    date = current_date
    and exists (select 1 from internships i where i.id = attendance.internship_id and i.mentor_id = auth.uid())
  ) with check (
    date = current_date
    and exists (select 1 from internships i where i.id = attendance.internship_id and i.mentor_id = auth.uid())
  );

-- --- hr_manager gets the new attendance.manage permission in the Roles
-- admin screen (matches src/lib/rbac.ts in the same change) -------------
insert into role_permissions (role, permission)
values ('hr_manager', 'attendance.manage')
on conflict do nothing;
