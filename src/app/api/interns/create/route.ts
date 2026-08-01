import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { generateOfficialEmail } from '@/lib/ids';
import { sendEmail, renderTemplate } from '@/lib/email/service';

/**
 * Admin-only: converts a selected application into an official StoreShift
 * intern account. Creates the auth user (with a generated password),
 * mirrors the profile row, opens an `internships` record, and emails the
 * credentials to the applicant.
 *
 * Body: { applicationId, department, roleTitle, mentorId, durationMonths,
 *         accessLevel, skills, roleShortCode }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const staffRoles = ['founder', 'super_admin', 'hr_manager', 'certificate_manager'];
  if (!actorProfile || !staffRoles.includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { applicationId, department, roleTitle, mentorId, durationMonths, accessLevel, skills, roleShortCode } = body;

  const admin = createAdminClient();

  const { data: application } = await supabase.from('applications').select('*').eq('id', applicationId).single();
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const officialEmail = generateOfficialEmail(application.full_name, roleShortCode || 'int');
  const tempPassword = `SS-${Math.random().toString(36).slice(2, 10)}!A1`;

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: officialEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: application.full_name, role: 'intern' },
  });

  if (createError || !newUser?.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create account' }, { status: 500 });
  }

  await admin
    .from('profiles')
    .update({ official_email: officialEmail, department, role: 'intern' })
    .eq('id', newUser.user.id);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + Number(durationMonths || 3));

  const { data: internship, error: internshipError } = await admin
    .from('internships')
    .insert({
      application_id: applicationId,
      intern_id: newUser.user.id,
      mentor_id: mentorId || null,
      department,
      role_title: roleTitle,
      skills: skills || [],
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      duration_months: Number(durationMonths || 3),
      access_level: accessLevel || 'standard',
      created_by: user.id,
    })
    .select()
    .single();

  if (internshipError) return NextResponse.json({ error: internshipError.message }, { status: 500 });

  await admin.from('applications').update({ status: 'selected' }).eq('id', applicationId);

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'intern.account_created', entity_type: 'internship', entity_id: internship.id,
    metadata: { official_email: officialEmail },
  });

  const emailResult = await sendEmail({
    to: application.email,
    subject: 'Welcome to StoreShift 🎉',
    html: renderTemplate(
      '<p>Hi {{full_name}},</p><p>Congratulations — you have been selected for the {{role_title}} internship at StoreShift.</p><p>Your official login:</p><p>Email: <strong>{{official_email}}</strong><br/>Temporary Password: <strong>{{password}}</strong></p><p>Please log in and change your password on first access.</p>',
      { full_name: application.full_name, role_title: roleTitle, official_email: officialEmail, password: tempPassword }
    ),
    relatedApplicationId: applicationId,
  });

  return NextResponse.json({ internship, officialEmail, emailStatus: emailResult.status });
}
