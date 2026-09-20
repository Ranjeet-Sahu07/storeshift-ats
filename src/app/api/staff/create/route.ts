import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail, renderStoredTemplate } from '@/lib/email/service';
import { brandedEmailShell, eyebrow, heading, credentialTable, emailButton } from '@/lib/email/templates';
import { ROLE_LABELS, type UserRole } from '@/types';

/**
 * Admin-only: creates a staff login (HR Manager, Recruiter, Mentor,
 * Technical Interviewer, Certificate Manager, or another Admin) directly —
 * for team members who didn't come through the applicant pipeline.
 *
 * Body: { fullName, email, password, role, department }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!actorProfile || !['founder', 'super_admin'].includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Only Founder or Super Admin can create staff accounts' }, { status: 403 });
  }

  const { fullName, email, password, role, department } = await req.json();

  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: 'Full name, email, password, and role are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .or(`email.eq.${normalizedEmail},official_email.eq.${normalizedEmail}`)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: `"${normalizedEmail}" is already registered. Use a different email.`, code: 'EMAIL_TAKEN' }, { status: 409 });
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createError || !newUser?.user) {
    const message = createError?.message?.toLowerCase().includes('already been registered')
      ? `"${normalizedEmail}" is already registered. Use a different email.`
      : createError?.message ?? 'Failed to create account';
    return NextResponse.json({ error: message, code: 'EMAIL_TAKEN' }, { status: 409 });
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: newUser.user.id,
      full_name: fullName,
      email: normalizedEmail,
      official_email: normalizedEmail,
      role,
      department: department || null,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    return NextResponse.json({ error: `Auth account was created but the profile record failed: ${profileError.message}. Contact support before retrying.` }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'staff.account_created', entity_type: 'profile', entity_id: newUser.user.id,
    metadata: { role, email: normalizedEmail },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in';
  const roleLabel = ROLE_LABELS[role as UserRole] ?? role;
  const { subject, bodyHtml } = await renderStoredTemplate(
    admin,
    'staff_welcome',
    { full_name: fullName, role_label: roleLabel },
    { subject: 'Welcome to the StoreShift team 🎉', bodyHtml: '<p>An account has been created for you on the StoreShift admin panel as a <strong>{{role_label}}</strong>.</p>' }
  );
  const html = brandedEmailShell(
    `${eyebrow('Welcome to the Team')}${heading(`Hi ${fullName},`)}${bodyHtml}${credentialTable([['Login Email', normalizedEmail], ['Temporary Password', password]])}<p style="color:#5A6B6A;font-size:13px;">Please log in and change your password on first access.</p>${emailButton('Log In', `${siteUrl}/login`)}`
  );
  const emailResult = await sendEmail({ to: normalizedEmail, subject, html });

  await admin.from('email_log').insert({
    to_email: normalizedEmail, subject, status: emailResult.status, sent_by: user.id,
    provider_response: { kind: 'staff_welcome', providerId: emailResult.id, error: (emailResult as any).error ?? null },
  });

  return NextResponse.json({ userId: newUser.user.id, email: normalizedEmail, emailStatus: emailResult.status });
}
