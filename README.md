# StoreShift Careers — Enterprise Internship Management System

A production-grade Applicant Tracking System (ATS) + Internship Management
System (IMS) for StoreShift, built as a **completely separate** application
from the main storeshift.in product (own auth, own database, own storage).

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth + Storage) · deployed on Netlify**.

---

## 1. Quick Start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project keys
npm run dev
```

### Set up Supabase

1. Create a **new** Supabase project (keep it separate from any main
   StoreShift product database).
2. In the SQL Editor, run `supabase/schema.sql` — this creates every table,
   enum, RLS policy, trigger, and storage bucket.
3. Run `supabase/seed.sql` to load the default RBAC permission matrix and
   starter email templates.
4. Copy your Project URL, anon key, and service role key into `.env.local`
   (see `.env.example`).
5. Create your first `founder`/`super_admin` user: sign up through
   Supabase Auth (or `/login` after inserting a temporary account), then in
   the `profiles` table set that user's `role` to `founder`.

### Deploy

- **Netlify**: connect the repo, it will pick up `netlify.toml`
  automatically (uses `@netlify/plugin-nextjs`). Add the same environment
  variables from `.env.local` in Netlify's dashboard.
- Point `careers.storeshift.in` at the Netlify site; the main
  `storeshift.in` site links out to it (this repo does not include the
  main marketing site).

---

## 2. What's fully implemented

- **Careers homepage** — hero, live "Open Positions" (pulled from
  admin-generated links), roadmap, tech stack, hiring process, benefits,
  life-at-StoreShift, certificate preview, FAQ.
- **Application links** — admins generate unlimited unique links
  (`/apply/{code}`), each with its own analytics (applications received).
- **Multi-step application form** — Personal → Education → Skills →
  Documents → Questionnaire → Declaration, validated with Zod, file
  uploads to Supabase Storage, generates a unique Application ID on submit.
- **Full RBAC** — 9 roles (Founder, Super Admin, HR Manager, Recruiter,
  Mentor, Technical Interviewer, Certificate Manager, Intern, Applicant),
  enforced at the database level via Postgres RLS policies (see
  `supabase/schema.sql`) *and* mirrored in the UI (`src/lib/rbac.ts`) so
  nothing is "automatic without admin permission."
- **Admin dashboard** — pipeline funnel, stat cards, recent applicants.
- **Applications & Applicant management** — searchable/filterable table,
  full applicant detail view with Accept / Reject / Hold / Interview /
  Select actions, admin notes, and an activity timeline.
- **Interview scheduling** — HR/technical/final stages, meeting links.
- **Intern account creation** — converting a selected applicant into an
  official StoreShift account (`rahul.int23@storeshift.in` style email),
  department/role/mentor/duration/access-level assignment, credentials
  emailed automatically (`/api/interns/create`).
- **Role management** — editable permission matrix.
- **Task Manager** — drag-and-drop Kanban board (`@dnd-kit`), shared
  between admin (assign/oversee) and intern (update own status) views,
  with priority, deadline, GitHub repo/PR links, and progress.
- **Certificate Generator** — client-side PDF generation (`jsPDF`) with a
  real QR code (`qrcode`) linking to a public verification URL, unique
  certificate IDs, single + bulk generation, uploaded to Supabase Storage.
- **Public Certificate Verification** (`/certificate/verify`) — search by
  ID or scan the QR code, shows verified details or a clear "not found."
- **Offer Letter & LOR generators** — auto-filled PDFs from the intern's
  profile.
- **Reports & Analytics** — hiring funnel, status breakdown, college-wise
  and department-wise charts.
- **Intern dashboard** — progress, task board, attendance, GitHub/PRs,
  learning resources, mentor chat (internal messaging), documents
  (offer letter / certificate / LOR), and profile/password settings.
- **Audit logging** — key actions (intern account creation, etc.) are
  written to `audit_logs`.
- **Email templates** — editable per-template subject/body with
  `{{token}}` interpolation.

## 3. What's scaffolded / stubbed (and how to finish it)

Full production wiring for these needs credentials/infrastructure this
environment can't provision — the code is structured so you drop in a key
and it works:

- **Outbound email delivery** — `src/lib/email/service.ts` implements a
  provider interface. `EMAIL_PROVIDER=console` (default) logs emails for
  local development; set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` to
  send for real. Adding SendGrid/SES/Postmark is a ~20-line class.
- **Bulk email sending** — `sendBulkEmails()` exists and loops the same
  provider; wire a "select applicants → send template" admin screen on
  top of it whenever you're ready (the `email_log` table is already
  there to record results).
- **File version history** — the `documents` table has a `version` /
  `replaced_by` self-reference ready for a version-history UI; only a
  single-version flow is wired in the demo.
- **Global "search everywhere"** (⌘K) — the topbar has the visual affordance;
  hook it up to a Postgres full-text search or Supabase Edge Function.
- **AI-ready architecture** — schema and file storage are structured so a
  future resume-screening / interview-assistant service can read
  `applications.resume_path` and write back to `admin_notes` /
  `interviews.feedback` without any migration.

## 4. Project Structure

```
supabase/
  schema.sql        All tables, enums, RLS policies, triggers, storage buckets
  seed.sql           Default RBAC matrix + starter email templates
src/
  app/
    page.tsx                     Careers homepage
    apply/[code]/page.tsx        Multi-step application form
    certificate/verify/page.tsx  Public verification
    login/page.tsx
    admin/...                    Staff-only app (RBAC-gated)
    dashboard/...                Intern-only app
    api/...                      Route handlers (intern account creation, etc.)
  components/
    marketing/   Homepage sections
    forms/       Application form + stepper
    admin/       Sidebar, topbar, stat cards, funnel chart
    intern/      Intern sidebar
    tasks/       Shared Kanban board
    ui/          Design-system primitives
  lib/
    supabase/    Browser / server / admin Supabase clients
    email/       Pluggable email service
    pdf/         Certificate + letter PDF generators
    rbac.ts      Permission matrix + `can()` helper
    ids.ts       ID/code generators
    auth.ts      Server-side "current user" helper
  middleware.ts  Session refresh + /admin & /dashboard route protection
```

## 5. Security notes

- The anon key is safe to expose (used in browser client); every table has
  RLS enabled, so access is enforced by Postgres regardless of what the
  client sends.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — it's used exclusively
  in `src/lib/supabase/server.ts::createAdminClient()` inside trusted
  Route Handlers (e.g. creating an intern's auth account, which requires
  admin privileges). Never import it in a Client Component.
- Applicants can only `INSERT` into `applications` (via the public apply
  form) — they cannot read or modify applications after submitting.
