-- ============================================================================
-- Migration 006: ID race conditions, duplicate applications, per-link
-- required fields, and a `key` column for editable system email templates
-- ============================================================================

-- --- Part 1: DB sequences replace client-side "count rows, add one" ---------
-- The old approach (`generateApplicationId((count ?? 0) + 1)` etc. on the
-- client) races under concurrent submissions and after any row is ever
-- deleted — two people submitting at the same moment can compute the same
-- "next" number and collide on the unique constraint. Sequences are
-- atomic at the database level, so this can't happen.

create sequence if not exists application_id_seq;
create sequence if not exists certificate_id_seq;
create sequence if not exists offer_id_seq;
create sequence if not exists lor_id_seq;

create or replace function set_application_id()
returns trigger language plpgsql as $$
begin
  if new.application_id is null or new.application_id = '' then
    new.application_id := 'SS-APP-' || extract(year from now())::int || '-' || lpad(nextval('application_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_application_id on applications;
create trigger trg_set_application_id before insert on applications
  for each row execute function set_application_id();

create or replace function set_certificate_id()
returns trigger language plpgsql as $$
begin
  if new.certificate_id is null or new.certificate_id = '' then
    new.certificate_id := 'SS-INT-' || extract(year from now())::int || '-' || lpad(nextval('certificate_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_certificate_id on certificates;
create trigger trg_set_certificate_id before insert on certificates
  for each row execute function set_certificate_id();

create or replace function set_offer_id()
returns trigger language plpgsql as $$
begin
  if new.offer_id is null or new.offer_id = '' then
    new.offer_id := 'SS-OFR-' || extract(year from now())::int || '-' || lpad(nextval('offer_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_offer_id on offer_letters;
create trigger trg_set_offer_id before insert on offer_letters
  for each row execute function set_offer_id();

create or replace function set_lor_id()
returns trigger language plpgsql as $$
begin
  if new.lor_id is null or new.lor_id = '' then
    new.lor_id := 'SS-LOR-' || extract(year from now())::int || '-' || lpad(nextval('lor_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_lor_id on letters_of_recommendation;
create trigger trg_set_lor_id before insert on letters_of_recommendation
  for each row execute function set_lor_id();

-- Fast-forward each sequence past any IDs already issued under the old
-- scheme, so newly-generated IDs never collide with existing ones.
select setval('application_id_seq', greatest(1, coalesce((
  select max(substring(application_id from '(\d+)$')::int) from applications
  where application_id ~ '\d+$'
), 0)), true);

select setval('certificate_id_seq', greatest(1, coalesce((
  select max(substring(certificate_id from '(\d+)$')::int) from certificates
  where certificate_id ~ '\d+$'
), 0)), true);

select setval('offer_id_seq', greatest(1, coalesce((
  select max(substring(offer_id from '(\d+)$')::int) from offer_letters
  where offer_id ~ '\d+$'
), 0)), true);

select setval('lor_id_seq', greatest(1, coalesce((
  select max(substring(lor_id from '(\d+)$')::int) from letters_of_recommendation
  where lor_id ~ '\d+$'
), 0)), true);

-- --- Part 2: duplicate applications treated as a correction ----------------
-- Enforced at the database level (not just app code) so it holds even if
-- a future code path forgets to check first: the same email applying
-- again through the same link updates their existing row instead of
-- erroring or creating a second one.
create unique index if not exists uq_applications_email_link on applications (email, link_id) where link_id is not null;
create unique index if not exists uq_applications_email_no_link on applications (email) where link_id is null;

-- --- Part 3: which fields a given application link requires ----------------
alter table application_links add column if not exists required_fields text[] default '{}';
comment on column application_links.required_fields is
  'Optional fields the admin has marked mandatory for this specific link — e.g. {portfolio_url,github_url,cgpa}. Fields not listed here stay optional.';

-- --- Part 4: stable `key` for system email templates (so renaming the
-- display name in the admin UI never breaks the code that looks them up) --
alter table email_templates add column if not exists key text unique;

update email_templates set key = 'application_received' where name = 'Application Received' and key is null;
update email_templates set key = 'interview_invitation' where name = 'Interview Invitation' and key is null;
update email_templates set key = 'offer_letter_stage' where name = 'Offer Letter' and key is null;
update email_templates set key = 'application_status_update' where name = 'Application Update' and key is null;

insert into email_templates (key, name, subject, body_html, category) values
  (
    'intern_welcome_temp_password',
    'Intern Welcome — Temporary Password',
    'Welcome to StoreShift 🎉',
    '<p>You''ve officially joined the team as a <strong>{{role_title}}</strong> intern. We''re excited to have you on board.</p>',
    'onboarding'
  ),
  (
    'intern_welcome_invite',
    'Intern Welcome — Set Your Password',
    'Welcome to StoreShift 🎉',
    '<p>You''ve officially joined the team as a <strong>{{role_title}}</strong> intern. We''re excited to have you on board. Click below to set your password and access your dashboard.</p>',
    'onboarding'
  ),
  (
    'document_ready',
    'Document Ready',
    'Your {{document_label}} is ready — StoreShift',
    '<p>Your <strong>{{document_label}}</strong> has been generated by the StoreShift team.</p>',
    'documents'
  ),
  (
    'password_reset',
    'Password Reset',
    'Your StoreShift password has been reset',
    '<p>An admin has reset your StoreShift account password. Your new temporary password is below — please log in and change it as soon as possible.</p>',
    'onboarding'
  ),
  (
    'staff_welcome',
    'Staff Welcome',
    'Welcome to the StoreShift team 🎉',
    '<p>An account has been created for you on the StoreShift admin panel as a <strong>{{role_label}}</strong>.</p>',
    'onboarding'
  )
on conflict (key) do nothing;
