import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail, renderStoredTemplate } from '@/lib/email/service';
import { brandedEmailShell, eyebrow, heading, emailButton, credentialTable } from '@/lib/email/templates';

/**
 * Admin-only: creates an official StoreShift intern account.
 *
 * Two entry points, both handled here:
 *  1. From an application (`applicationId` provided) — normal pipeline.
 *  2. Manual / backdated ("Add Past Intern") — `applicationId` omitted,
 *     `fullName` + `personalEmail` provided directly, plus optional
 *     `startDate` / `endDate` / `status` for someone who already worked
 *     with StoreShift before this system existed.
 *
 * IMPORTANT — login identity: the auth account (and therefore login) uses
 * the applicant's PERSONAL email, not a generated "official" one.
 *
 * IMPORTANT — email delivery: for BOTH credential modes, the actual email
 * is sent through our own configured provider (SMTP/Resend/console — see
 * src/lib/email/service.ts), never through Supabase's own mailer. For
 * `invite_email` mode this means using `admin.auth.admin.generateLink()`
 * (which creates the invite token but sends nothing) rather than
 * `inviteUserByEmail()` (which both creates the token AND dispatches an
 * email from Supabase's own service) — we only want the former, then we
 * deliver the resulting link ourselves in our own branded template.
 *
 * IMPORTANT — profile row: we `upsert` it explicitly rather than relying
 * on the `handle_new_user` trigger alone, so the row is guaranteed to
 * exist before `internships` references it.
 *
 * Body: { applicationId?, fullName?, personalEmail?, department, roleTitle,
 *         mentorId, durationMonths, accessLevel, skills, officialEmail?,
 *         credentialMode, startDate?, endDate?, status? }
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
  const {
    applicationId, fullName: manualFullName, personalEmail: manualEmail,
    department, roleTitle, mentorId, durationMonths, accessLevel, skills,
    officialEmail, credentialMode = 'temp_password',
    startDate, endDate, status,
  } = body;

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in';

  let fullName: string;
  let loginEmail: string;

  if (applicationId) {
    const { data: application } = await supabase.from('applications').select('*').eq('id', applicationId).single();
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    fullName = application.full_name;
    loginEmail = application.email;
  } else {
    if (!manualFullName || !manualEmail) {
      return NextResponse.json({ error: 'Full name and personal email are required' }, { status: 400 });
    }
    fullName = manualFullName;
    loginEmail = manualEmail;
  }
  loginEmail = loginEmail.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', loginEmail)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      { error: `"${loginEmail}" already has an account. Use a different email, or reset that account's password instead.`, code: 'EMAIL_TAKEN' },
      { status: 409 }
    );
  }

  let newUserId: string;
  let tempPassword: string | null = null;
  let magicLinkUrl: string | null = null;
  let inviteSent = false;

  if (credentialMode === 'invite_email') {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: loginEmail,
      options: { data: { full_name: fullName, role: 'intern' }, redirectTo: `${siteUrl}/set-password` },
    });
    if (linkError || !linkData?.user) {
      const message = linkError?.message?.toLowerCase().includes('already been registered')
        ? `"${loginEmail}" is already registered.`
        : linkError?.message ?? 'Failed to create invite link';
      return NextResponse.json({ error: message, code: 'EMAIL_TAKEN' }, { status: 409 });
    }
    newUserId = linkData.user.id;
    magicLinkUrl = linkData.properties?.action_link ?? `${siteUrl}/login`;
    inviteSent = true;
  } else {
    tempPassword = `SS-${Math.random().toString(36).slice(2, 10)}!A1`;
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'intern' },
    });
    if (createError || !newUser?.user) {
      const message = createError?.message?.toLowerCase().includes('already been registered')
        ? `"${loginEmail}" is already registered.`
        : createError?.message ?? 'Failed to create account';
      return NextResponse.json({ error: message, code: 'EMAIL_TAKEN' }, { status: 409 });
    }
    newUserId = newUser.user.id;
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: newUserId,
      full_name: fullName,
      email: loginEmail,
      official_email: officialEmail?.trim().toLowerCase() || null,
      department,
      role: 'intern',
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    return NextResponse.json({ error: `Account was created but the profile record failed: ${profileError.message}. Contact support before retrying.` }, { status: 500 });
  }

  const resolvedStart = startDate ? new Date(startDate) : new Date();
  const resolvedEnd = endDate
    ? new Date(endDate)
    : (() => { const d = new Date(resolvedStart); d.setMonth(d.getMonth() + Number(durationMonths || 3)); return d; })();
  const resolvedDuration = Math.max(
    1,
    Math.round((resolvedEnd.getTime() - resolvedStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  const resolvedStatus = status || (resolvedEnd < new Date() ? 'completed' : 'active');

  const { data: internship, error: internshipError } = await admin
    .from('internships')
    .insert({
      application_id: applicationId || null,
      intern_id: newUserId,
      mentor_id: mentorId || null,
      department,
      role_title: roleTitle,
      skills: skills || [],
      start_date: resolvedStart.toISOString().slice(0, 10),
      end_date: resolvedEnd.toISOString().slice(0, 10),
      duration_months: durationMonths ? Number(durationMonths) : resolvedDuration,
      access_level: accessLevel || 'standard',
      status: resolvedStatus,
      created_by: user.id,
    })
    .select()
    .single();

  if (internshipError) {
    return NextResponse.json({ error: `Profile was created (${loginEmail}) but the internship record failed: ${internshipError.message}` }, { status: 500 });
  }

  if (applicationId) {
    await admin.from('applications').update({ status: 'selected' }).eq('id', applicationId);
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'intern.account_created', entity_type: 'internship', entity_id: internship.id,
    metadata: { login_email: loginEmail, official_email: officialEmail ?? null, credentialMode, manual: !applicationId },
  });

  // Congratulations email — always through our own provider (never
  // Supabase's mailer), with wording pulled from the admin-editable
  // template (Settings → Email Templates) so this isn't hardcoded copy.
  const templateKey = credentialMode === 'invite_email' ? 'intern_welcome_invite' : 'intern_welcome_temp_password';
  const { subject, bodyHtml } = await renderStoredTemplate(
    admin,
    templateKey,
    { full_name: fullName, role_title: roleTitle },
    {
      subject: 'Welcome to StoreShift 🎉',
      bodyHtml: `<p>You've officially joined the team as a <strong>{{role_title}}</strong> intern. We're excited to have you on board.</p>`,
    }
  );

  const credentialsBlock = tempPassword
    ? credentialTable([['Login Email', loginEmail], ['Temporary Password', tempPassword]]) +
      `<p style="color:#5A6B6A;font-size:13px;">Please log in and change your password on first access.</p>` +
      emailButton('Log In to Your Dashboard', `${siteUrl}/login`)
    : `<p style="color:#5A6B6A;font-size:14px;line-height:1.6;">Your login email is <strong style="color:#0D2B2A;">${loginEmail}</strong>.</p>` +
      emailButton('Set Your Password', magicLinkUrl ?? `${siteUrl}/login`);

  const html = brandedEmailShell(`${eyebrow('Congratulations 🎉')}${heading(`Welcome to StoreShift, ${fullName}!`)}${bodyHtml}${credentialsBlock}`);
  const emailResult = await sendEmail({ to: loginEmail, subject, html, relatedApplicationId: applicationId || undefined });

  await admin.from('email_log').insert({
    to_email: loginEmail, subject, status: emailResult.status,
    sent_by: user.id, related_application_id: applicationId || null,
    provider_response: { kind: 'welcome', credentialMode, providerId: emailResult.id, error: (emailResult as any).error ?? null },
  });

  return NextResponse.json({
    internship,
    loginEmail,
    officialEmail: officialEmail ?? null,
    credentialMode,
    tempPassword,
    inviteSent,
    emailStatus: emailResult.status,
  });
}
