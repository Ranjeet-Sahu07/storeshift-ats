/**
 * Seeds realistic test data into your Supabase project:
 *  - a demo application link
 *  - ~6 applications spread across different pipeline stages
 *  - 3 intern accounts at different stages of the program:
 *      1. Just onboarded (Month 1, no tasks done yet)
 *      2. Mid-program (Month 2-3, tasks in progress, some attendance)
 *      3. Completed (with a certificate already issued)
 *
 * Usage:
 *   node scripts/seed-test-data.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your
 * environment (e.g. `export $(cat .env.local | xargs)` first, or run with
 * `dotenv -e .env.local -- node scripts/seed-test-data.mjs`).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function rand(n) { return Math.random().toString(36).slice(2, 2 + n); }

async function main() {
  console.log('Seeding demo application link…');
  const { data: link } = await supabase
    .from('application_links')
    .insert({ code: `DEMO2026${rand(6).toUpperCase()}`, label: 'Frontend Intern — Test Data', role_title: 'Frontend Developer Intern', department: 'Engineering' })
    .select()
    .single();

  console.log('Seeding sample applications across pipeline stages…');
  const sampleApplicants = [
    { full_name: 'Aarav Sharma', status: 'submitted', college: 'VJTI Mumbai' },
    { full_name: 'Priya Verma', status: 'under_review', college: 'BITS Pilani' },
    { full_name: 'Mohit Singh', status: 'shortlisted', college: 'NIT Trichy' },
    { full_name: 'Sneha Reddy', status: 'interview_scheduled', college: 'IIIT Hyderabad' },
    { full_name: 'Vikas Patel', status: 'on_hold', college: 'DA-IICT' },
    { full_name: 'Ananya Iyer', status: 'rejected', college: 'PSG Tech' },
  ];

  let seq = Date.now() % 100000;
  for (const a of sampleApplicants) {
    await supabase.from('applications').insert({
      application_id: `SS-APP-2026-${String(seq++).padStart(6, '0')}`,
      link_id: link?.id ?? null,
      full_name: a.full_name,
      email: `${a.full_name.split(' ')[0].toLowerCase()}.${rand(4)}@example.com`,
      phone: '9876543210',
      college: a.college,
      degree: 'B.Tech',
      branch: 'Computer Science',
      graduation_year: 2026,
      cgpa: 8.2,
      skills: ['React', 'TypeScript', 'Node.js'],
      preferred_role: 'Frontend Developer',
      resume_url: 'https://drive.google.com/example-resume',
      github_url: 'https://github.com/example',
      questionnaire: { why_storeshift: 'Excited to work on real SaaS products.', biggest_project: 'Built a full-stack e-commerce app.', availability: 'full_time' },
      declaration_accepted: true,
      status: a.status,
    });
  }

  console.log('Seeding 3 interns at different program stages…');

  // Stage 1: Just onboarded
  await seedIntern({
    name: 'Kabir Mehta', emailPrefix: 'kabir.int26', roleTitle: 'Frontend Developer Intern',
    department: 'Engineering', startDaysAgo: 3, durationMonths: 3, taskCounts: { todo: 4, in_progress: 0, done: 0 },
    attendanceDays: 3, presentDays: 3, issueCertificate: false,
  });

  // Stage 2: Mid-program
  await seedIntern({
    name: 'Diya Nair', emailPrefix: 'diya.ui26', roleTitle: 'UI/UX Design Intern',
    department: 'Design', startDaysAgo: 45, durationMonths: 3, taskCounts: { todo: 2, in_progress: 3, done: 5 },
    attendanceDays: 30, presentDays: 27, issueCertificate: false,
  });

  // Stage 3: Completed, certificate issued
  await seedIntern({
    name: 'Rohan Gupta', emailPrefix: 'rohan.be26', roleTitle: 'Backend Developer Intern',
    department: 'Engineering', startDaysAgo: 120, durationMonths: 3, taskCounts: { todo: 0, in_progress: 0, done: 12 },
    attendanceDays: 90, presentDays: 85, issueCertificate: true, completed: true,
  });

  console.log('\nDone! Test data seeded:');
  console.log('  • 1 demo application link');
  console.log('  • 6 sample applications (submitted → rejected across every stage)');
  console.log('  • 3 intern accounts: Kabir (just started), Diya (mid-program), Rohan (completed + certificate)');
  console.log('\nAll seeded interns have temporary password: Test@12345');
}

async function seedIntern({ name, emailPrefix, roleTitle, department, startDaysAgo, durationMonths, taskCounts, attendanceDays, presentDays, issueCertificate, completed }) {
  const email = `${emailPrefix}@storeshift.in`;
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email, password: 'Test@12345', email_confirm: true,
    user_metadata: { full_name: name, role: 'intern' },
  });
  if (authError) { console.warn(`  ⚠ Skipping ${name} — ${authError.message}`); return; }

  await supabase.from('profiles').update({ official_email: email, department, role: 'intern' }).eq('id', authUser.user.id);

  const startDate = new Date(Date.now() - startDaysAgo * 86400000);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const { data: internship } = await supabase.from('internships').insert({
    intern_id: authUser.user.id, department, role_title: roleTitle, skills: ['React', 'Git'],
    start_date: startDate.toISOString().slice(0, 10), end_date: endDate.toISOString().slice(0, 10),
    duration_months: durationMonths, status: completed ? 'completed' : 'active',
    github_repo_url: 'https://github.com/storeshift/demo-project',
  }).select().single();

  if (!internship) return;

  const taskTitles = ['Set up project structure', 'Build login page', 'Fix responsive bugs', 'Write unit tests', 'API integration', 'Code review fixes'];
  let titleIdx = 0;
  for (const [status, count] of Object.entries(taskCounts)) {
    for (let i = 0; i < count; i++) {
      await supabase.from('tasks').insert({
        internship_id: internship.id, title: taskTitles[titleIdx++ % taskTitles.length],
        status, priority: 'medium', progress: status === 'done' ? 100 : status === 'in_progress' ? 50 : 0,
      });
    }
  }

  for (let d = 0; d < attendanceDays; d++) {
    const date = new Date(Date.now() - d * 86400000);
    await supabase.from('attendance').insert({
      internship_id: internship.id, date: date.toISOString().slice(0, 10),
      status: d < presentDays ? 'present' : 'absent',
    });
  }

  if (issueCertificate) {
    await supabase.from('certificates').insert({
      certificate_id: `SS-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      internship_id: internship.id, intern_name: name, role_title: roleTitle, department,
      duration_text: `${durationMonths} months`, skills: ['React', 'Git'],
      completion_date: endDate.toISOString().slice(0, 10),
      qr_verification_url: `https://storeshift.in/certificate/verify?id=DEMO`,
    });
  }

  console.log(`  ✓ ${name} (${email}) — ${completed ? 'completed' : 'active'}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
