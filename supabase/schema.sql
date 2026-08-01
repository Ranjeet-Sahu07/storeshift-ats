-- ============================================================================
-- StoreShift Internship Management System — Database Schema
-- Completely separate Supabase project from the main storeshift.in product.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum (
  'founder', 'super_admin', 'hr_manager', 'recruiter',
  'mentor', 'technical_interviewer', 'certificate_manager',
  'intern', 'applicant'
);

create type application_status as enum (
  'submitted', 'under_review', 'shortlisted', 'assignment_sent',
  'interview_scheduled', 'interviewed', 'on_hold', 'selected',
  'rejected', 'withdrawn'
);

create type task_status as enum ('todo', 'in_progress', 'in_review', 'done', 'blocked');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type attendance_status as enum ('present', 'absent', 'leave', 'half_day');
create type document_kind as enum ('offer_letter', 'certificate', 'lor', 'resume', 'portfolio', 'photo', 'other');
create type interview_stage as enum ('hr_screening', 'technical', 'final');

-- ----------------------------------------------------------------------------
-- PROFILES  (mirrors auth.users; one row per platform user, any role)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  official_email text unique, -- e.g. rahul.int23@storeshift.in, only for selected interns/staff
  phone text,
  avatar_url text,
  role user_role not null default 'applicant',
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- ----------------------------------------------------------------------------
-- ROLE PERMISSIONS  (fine-grained RBAC matrix, editable from Admin > Roles)
-- ----------------------------------------------------------------------------
create table role_permissions (
  role user_role not null,
  permission text not null, -- e.g. 'applications.review', 'certificates.generate'
  allowed boolean not null default true,
  primary key (role, permission)
);

-- ----------------------------------------------------------------------------
-- APPLICATION LINKS  (admin-generated unique apply links, with attribution)
-- ----------------------------------------------------------------------------
create table application_links (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique, -- e.g. FE2026A18KD92
  label text not null, -- internal name, e.g. "Frontend Intern - LinkedIn Post"
  role_title text not null, -- e.g. "Frontend Developer Intern"
  department text,
  created_by uuid references profiles(id),
  max_applications integer, -- null = unlimited
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_application_links_code on application_links(code);

-- ----------------------------------------------------------------------------
-- APPLICATIONS
-- ----------------------------------------------------------------------------
create table applications (
  id uuid primary key default uuid_generate_v4(),
  application_id text not null unique, -- human-readable e.g. SS-APP-2026-000482
  link_id uuid references application_links(id),

  -- Personal Information
  full_name text not null,
  email text not null,
  phone text not null,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,

  -- Education
  college text,
  degree text,
  branch text,
  graduation_year integer,
  cgpa numeric(4,2),

  -- Skills
  skills text[] default '{}',
  preferred_role text,

  -- Documents (Supabase Storage paths)
  resume_path text,
  portfolio_url text,
  photo_path text,
  github_url text,
  linkedin_url text,

  -- Questionnaire (flexible JSON: question -> answer)
  questionnaire jsonb default '{}',

  -- Declaration
  declaration_accepted boolean not null default false,
  declaration_accepted_at timestamptz,

  status application_status not null default 'submitted',
  admin_notes text,
  rejection_reason text,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_applications_status on applications(status);
create index idx_applications_link on applications(link_id);
create index idx_applications_email on applications(email);

-- ----------------------------------------------------------------------------
-- APPLICATION TIMELINE  (every state change / note, for the activity trail)
-- ----------------------------------------------------------------------------
create table application_events (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  actor_id uuid references profiles(id),
  event_type text not null, -- 'status_change', 'note_added', 'email_sent', ...
  from_status application_status,
  to_status application_status,
  note text,
  created_at timestamptz not null default now()
);

create index idx_application_events_app on application_events(application_id);

-- ----------------------------------------------------------------------------
-- INTERVIEWS
-- ----------------------------------------------------------------------------
create table interviews (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  stage interview_stage not null,
  interviewer_id uuid references profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  meeting_link text,
  feedback text,
  score integer check (score between 1 and 10),
  recommendation text, -- 'strong_yes' | 'yes' | 'no' | 'strong_no'
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_interviews_application on interviews(application_id);

-- ----------------------------------------------------------------------------
-- INTERNSHIPS  (created once an application is selected)
-- ----------------------------------------------------------------------------
create table internships (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications(id),
  intern_id uuid not null references profiles(id) on delete cascade,
  mentor_id uuid references profiles(id),
  department text not null,
  role_title text not null,
  skills text[] default '{}',
  start_date date not null,
  end_date date not null,
  duration_months integer not null,
  access_level text not null default 'standard',
  status text not null default 'active', -- active | completed | terminated
  github_repo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_internships_intern on internships(intern_id);
create index idx_internships_mentor on internships(mentor_id);

-- ----------------------------------------------------------------------------
-- TASKS  (kanban)
-- ----------------------------------------------------------------------------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  internship_id uuid not null references internships(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assigned_by uuid references profiles(id),
  deadline date,
  github_repo_url text,
  pull_request_url text,
  attachments text[] default '{}',
  progress integer not null default 0 check (progress between 0 and 100),
  position integer not null default 0, -- for drag-and-drop ordering within a column
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_internship on tasks(internship_id);
create index idx_tasks_status on tasks(status);

create table task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ATTENDANCE
-- ----------------------------------------------------------------------------
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  internship_id uuid not null references internships(id) on delete cascade,
  date date not null,
  status attendance_status not null,
  check_in time,
  check_out time,
  note text,
  marked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (internship_id, date)
);

-- ----------------------------------------------------------------------------
-- PERFORMANCE REVIEWS
-- ----------------------------------------------------------------------------
create table performance_reviews (
  id uuid primary key default uuid_generate_v4(),
  internship_id uuid not null references internships(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  month integer not null,
  year integer not null,
  technical_score integer check (technical_score between 1 and 10),
  communication_score integer check (communication_score between 1 and 10),
  ownership_score integer check (ownership_score between 1 and 10),
  overall_rating numeric(3,1),
  comments text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- LEARNING RESOURCES
-- ----------------------------------------------------------------------------
create table learning_resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  url text,
  department text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MESSAGES  (internal chat between mentor <-> intern)
-- ----------------------------------------------------------------------------
create table messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_recipient on messages(recipient_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications(recipient_id);

-- ----------------------------------------------------------------------------
-- CERTIFICATES
-- ----------------------------------------------------------------------------
create table certificates (
  id uuid primary key default uuid_generate_v4(),
  certificate_id text not null unique, -- e.g. SS-INT-2026-0001
  internship_id uuid not null references internships(id),
  intern_name text not null,
  role_title text not null,
  department text not null,
  duration_text text not null,
  skills text[] default '{}',
  issue_date date not null default current_date,
  completion_date date not null,
  pdf_path text,
  qr_verification_url text not null,
  status text not null default 'issued', -- issued | revoked
  generated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_certificates_certificate_id on certificates(certificate_id);

-- ----------------------------------------------------------------------------
-- OFFER LETTERS
-- ----------------------------------------------------------------------------
create table offer_letters (
  id uuid primary key default uuid_generate_v4(),
  offer_id text not null unique, -- e.g. SS-OFR-2026-0001
  internship_id uuid not null references internships(id),
  pdf_path text,
  issued_at timestamptz not null default now(),
  generated_by uuid references profiles(id)
);

-- ----------------------------------------------------------------------------
-- LETTERS OF RECOMMENDATION
-- ----------------------------------------------------------------------------
create table letters_of_recommendation (
  id uuid primary key default uuid_generate_v4(),
  lor_id text not null unique, -- e.g. SS-LOR-2026-0001
  internship_id uuid not null references internships(id),
  body text not null,
  signatory_name text not null default 'Ranjeet Kumar',
  signatory_title text not null default 'Founder & CEO',
  pdf_path text,
  issued_at timestamptz not null default now(),
  generated_by uuid references profiles(id)
);

-- ----------------------------------------------------------------------------
-- DOCUMENTS  (generic vault: resumes, generated PDFs, with version history)
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id),
  kind document_kind not null,
  file_path text not null,
  version integer not null default 1,
  replaced_by uuid references documents(id),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ADMIN NOTES  (freeform notes on any applicant/intern)
-- ----------------------------------------------------------------------------
create table admin_notes (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references applications(id) on delete cascade,
  author_id uuid references profiles(id),
  note text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AUDIT LOGS
-- ----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null, -- e.g. 'application.status_changed', 'certificate.generated'
  entity_type text not null,
  entity_id text,
  metadata jsonb default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_actor on audit_logs(actor_id);

-- ----------------------------------------------------------------------------
-- EMAIL LOG  (every email attempted, for the bulk-send / template features)
-- ----------------------------------------------------------------------------
create table email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  body_html text not null,
  category text, -- 'application', 'interview', 'offer', 'rejection', 'certificate'
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table email_log (
  id uuid primary key default uuid_generate_v4(),
  to_email text not null,
  subject text not null,
  template_id uuid references email_templates(id),
  related_application_id uuid references applications(id),
  status text not null default 'queued', -- queued | sent | failed
  provider_response jsonb,
  sent_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table applications enable row level security;
alter table application_links enable row level security;
alter table application_events enable row level security;
alter table interviews enable row level security;
alter table internships enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table attendance enable row level security;
alter table performance_reviews enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table certificates enable row level security;
alter table offer_letters enable row level security;
alter table letters_of_recommendation enable row level security;
alter table documents enable row level security;
alter table admin_notes enable row level security;
alter table audit_logs enable row level security;
alter table role_permissions enable row level security;

-- Helper: is the current user staff (any role except intern/applicant)?
create or replace function is_staff()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role not in ('intern', 'applicant')
  );
$$;

create or replace function current_role_name()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

-- Profiles: users see their own row; staff see everyone
create policy "profiles_self_or_staff" on profiles
  for select using (id = auth.uid() or is_staff());
create policy "profiles_self_update" on profiles
  for update using (id = auth.uid() or is_staff());

-- Applications: public INSERT (via anon key, applying through a link),
-- but only staff can SELECT / UPDATE.
create policy "applications_public_insert" on applications
  for insert with check (true);
create policy "applications_staff_select" on applications
  for select using (is_staff());
create policy "applications_staff_update" on applications
  for update using (is_staff());

-- Application links: public SELECT of active links (to validate a code),
-- staff manage.
create policy "links_public_select_active" on application_links
  for select using (is_active = true or is_staff());
create policy "links_staff_write" on application_links
  for all using (is_staff());

-- Everything else: staff-only by default, interns see their own scoped rows.
create policy "events_staff" on application_events for all using (is_staff());

create policy "interviews_staff" on interviews for all using (is_staff());

create policy "internships_staff_all" on internships for all using (is_staff());
create policy "internships_own_select" on internships
  for select using (intern_id = auth.uid());

create policy "tasks_staff_all" on tasks for all using (is_staff());
create policy "tasks_own_select" on tasks
  for select using (
    exists (select 1 from internships i where i.id = tasks.internship_id and i.intern_id = auth.uid())
  );
create policy "tasks_own_update_status" on tasks
  for update using (
    exists (select 1 from internships i where i.id = tasks.internship_id and i.intern_id = auth.uid())
  );

create policy "comments_participants" on task_comments for all using (
  is_staff() or exists (
    select 1 from tasks t join internships i on i.id = t.internship_id
    where t.id = task_comments.task_id and i.intern_id = auth.uid()
  )
);

create policy "attendance_staff_all" on attendance for all using (is_staff());
create policy "attendance_own_select" on attendance for select using (
  exists (select 1 from internships i where i.id = attendance.internship_id and i.intern_id = auth.uid())
);

create policy "performance_staff_all" on performance_reviews for all using (is_staff());
create policy "performance_own_select" on performance_reviews for select using (
  exists (select 1 from internships i where i.id = performance_reviews.internship_id and i.intern_id = auth.uid())
);

create policy "messages_participants" on messages for all using (
  sender_id = auth.uid() or recipient_id = auth.uid()
);

create policy "notifications_owner" on notifications for all using (recipient_id = auth.uid());

create policy "certificates_staff_all" on certificates for all using (is_staff());
create policy "certificates_public_verify" on certificates for select using (status = 'issued');
create policy "certificates_own_select" on certificates for select using (
  exists (select 1 from internships i where i.id = certificates.internship_id and i.intern_id = auth.uid())
);

create policy "offer_letters_staff_all" on offer_letters for all using (is_staff());
create policy "offer_letters_own_select" on offer_letters for select using (
  exists (select 1 from internships i where i.id = offer_letters.internship_id and i.intern_id = auth.uid())
);

create policy "lor_staff_all" on letters_of_recommendation for all using (is_staff());
create policy "lor_own_select" on letters_of_recommendation for select using (
  exists (select 1 from internships i where i.id = letters_of_recommendation.internship_id and i.intern_id = auth.uid())
);

create policy "documents_staff_all" on documents for all using (is_staff());
create policy "documents_own" on documents for select using (owner_id = auth.uid());

create policy "admin_notes_staff" on admin_notes for all using (is_staff());
create policy "audit_logs_staff_read" on audit_logs for select using (is_staff());
create policy "audit_logs_insert" on audit_logs for insert with check (true);
create policy "role_permissions_staff_read" on role_permissions for select using (is_staff());
create policy "role_permissions_founder_write" on role_permissions for all using (current_role_name() in ('founder','super_admin'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_applications_updated before update on applications
  for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'applicant')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- STORAGE BUCKETS  (run once; also creatable via Supabase Dashboard)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('resumes', 'resumes', false),
  ('portfolios', 'portfolios', false),
  ('photos', 'photos', false),
  ('certificates', 'certificates', true),
  ('offer-letters', 'offer-letters', false),
  ('lor', 'lor', false)
on conflict (id) do nothing;
