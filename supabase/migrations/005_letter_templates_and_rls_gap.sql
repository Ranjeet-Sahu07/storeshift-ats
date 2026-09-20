-- ============================================================================
-- Migration 005: editable letter templates + a missed RLS gap
-- ============================================================================

-- --- Part 1: editable Offer Letter / LOR templates ---------------------------
create table if not exists letter_templates (
  id uuid primary key default uuid_generate_v4(),
  type text not null unique check (type in ('offer_letter', 'lor')),
  title text not null,
  body_template text not null,
  signatory_name text not null default 'Ranjeet Kumar',
  signatory_title text not null default 'Founder & CEO',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table letter_templates enable row level security;

drop policy if exists "letter_templates_staff_read" on letter_templates;
create policy "letter_templates_staff_read" on letter_templates for select using (is_staff());
drop policy if exists "letter_templates_staff_write" on letter_templates;
create policy "letter_templates_staff_write" on letter_templates for all using (is_staff());

create or replace function set_letter_template_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_letter_templates_updated on letter_templates;
create trigger trg_letter_templates_updated before update on letter_templates
  for each row execute function set_letter_template_updated_at();

insert into letter_templates (type, title, body_template, signatory_name, signatory_title) values
  (
    'offer_letter',
    'Internship Offer Letter',
    E'Dear {{full_name}},\n\nWe are pleased to offer you the position of {{role_title}} in the {{department}} department as part of the StoreShift Internship Program.\n\nYour internship will run for {{duration_months}} months, starting {{start_date}}.\n\nYour official StoreShift email will be {{official_email}}.\n\nWe look forward to having you on the team.',
    'Ranjeet Kumar',
    'Founder & CEO'
  ),
  (
    'lor',
    'Letter of Recommendation',
    E'To Whom It May Concern,\n\nThis is to certify that {{full_name}} completed a {{duration_months}}-month internship as a {{role_title}} in the {{department}} department at StoreShift. Throughout the internship, they demonstrated strong technical skills, reliability, and a collaborative attitude. We recommend them for future opportunities without reservation.',
    'Ranjeet Kumar',
    'Founder & CEO'
  )
on conflict (type) do nothing;

-- --- Part 2: email_templates / email_log never had RLS enabled --------------
-- These two tables were created in the original schema without
-- `enable row level security`, which on Postgres/Supabase means every row
-- is readable/writable by any authenticated (or, depending on grants,
-- even anonymous) request — the exact opposite of every other table in
-- this schema. email_log in particular can contain applicant email
-- addresses, so this closes a real data-exposure gap, not just a
-- theoretical one.
alter table email_templates enable row level security;
alter table email_log enable row level security;

drop policy if exists "email_templates_staff_all" on email_templates;
create policy "email_templates_staff_all" on email_templates for all using (is_staff());

drop policy if exists "email_log_staff_read" on email_log;
create policy "email_log_staff_read" on email_log for select using (is_staff());
drop policy if exists "email_log_insert" on email_log;
create policy "email_log_insert" on email_log for insert with check (true);
