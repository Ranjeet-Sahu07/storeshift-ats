-- ============================================================================
-- Migration 007: RPC-based application submission + homepage link control
--
-- BUG FIXED: "new row violates row-level security policy for table
-- applications" — happened for anonymous (public) applicants specifically,
-- while working fine for logged-in staff testing the same form. The
-- previous approach had the browser do a plain client-side
-- select-then-insert-or-update against `applications` directly, which
-- depends on the `applications_public_insert` RLS policy being exactly
-- right for the anon role at the moment of the request — a specific,
-- occasionally-drifted policy is a fragile thing to depend on for the
-- most important public-facing write in the whole app.
--
-- Fix: a SECURITY DEFINER RPC function. It runs with the function
-- owner's privileges, so it doesn't depend on the caller's RLS grants at
-- all — only on EXECUTE being granted on the function itself (done
-- below, explicitly, to `anon` and `authenticated`). It also makes the
-- "same email on this link = correction, not a new row" logic atomic
-- (one round trip, no race between a separate check and a separate
-- insert/update from two different client calls).
-- ============================================================================

create or replace function public.submit_application(
  p_link_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_date_of_birth date,
  p_gender text,
  p_address text,
  p_city text,
  p_state text,
  p_college text,
  p_degree text,
  p_branch text,
  p_graduation_year integer,
  p_cgpa numeric,
  p_tenth_percentage numeric,
  p_twelfth_percentage numeric,
  p_graduation_percentage numeric,
  p_skills text[],
  p_preferred_role text,
  p_resume_url text,
  p_portfolio_url text,
  p_github_url text,
  p_linkedin_url text,
  p_questionnaire jsonb,
  p_declaration_accepted boolean,
  p_declaration_accepted_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_application_id text;
begin
  if p_declaration_accepted is not true then
    raise exception 'Declaration must be accepted';
  end if;

  -- Same email applying again through this same link = a correction to
  -- their existing application, not a new submission.
  select id, application_id
  into v_existing_id, v_application_id
  from public.applications
  where lower(email) = lower(p_email)
    and link_id is not distinct from p_link_id
  limit 1;

  if v_existing_id is not null then
    update public.applications
    set
      full_name = p_full_name,
      email = p_email,
      phone = p_phone,
      date_of_birth = p_date_of_birth,
      gender = p_gender,
      address = p_address,
      city = p_city,
      state = p_state,
      college = p_college,
      degree = p_degree,
      branch = p_branch,
      graduation_year = p_graduation_year,
      cgpa = p_cgpa,
      tenth_percentage = p_tenth_percentage,
      twelfth_percentage = p_twelfth_percentage,
      graduation_percentage = p_graduation_percentage,
      skills = p_skills,
      preferred_role = p_preferred_role,
      resume_url = p_resume_url,
      portfolio_url = p_portfolio_url,
      github_url = p_github_url,
      linkedin_url = p_linkedin_url,
      questionnaire = p_questionnaire,
      declaration_accepted = p_declaration_accepted,
      declaration_accepted_at = p_declaration_accepted_at,
      status = 'submitted'
    where id = v_existing_id;

    return v_application_id;
  end if;

  -- application_id is intentionally omitted — the BEFORE INSERT trigger
  -- from migration 006 (set_application_id) generates it atomically.
  insert into public.applications (
    link_id, full_name, email, phone, date_of_birth, gender, address, city, state,
    college, degree, branch, graduation_year, cgpa, tenth_percentage, twelfth_percentage,
    graduation_percentage, skills, preferred_role, resume_url, portfolio_url, github_url,
    linkedin_url, questionnaire, declaration_accepted, declaration_accepted_at, status
  )
  values (
    p_link_id, p_full_name, p_email, p_phone, p_date_of_birth, p_gender, p_address, p_city, p_state,
    p_college, p_degree, p_branch, p_graduation_year, p_cgpa, p_tenth_percentage, p_twelfth_percentage,
    p_graduation_percentage, p_skills, p_preferred_role, p_resume_url, p_portfolio_url, p_github_url,
    p_linkedin_url, p_questionnaire, p_declaration_accepted, p_declaration_accepted_at, 'submitted'
  )
  returning application_id into v_application_id;

  return v_application_id;
end;
$$;

-- The function runs as its owner (bypassing the caller's RLS), so
-- access control happens here instead: only the roles that should ever
-- be able to submit an application get EXECUTE.
revoke all on function public.submit_application from public;
grant execute on function public.submit_application to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Homepage visibility is now an explicit admin decision, not "every
-- active, non-expired link automatically appears." Defaults to false so
-- existing links don't suddenly start appearing until an admin opts them in.
-- ----------------------------------------------------------------------------
alter table application_links add column if not exists show_on_homepage boolean not null default false;
