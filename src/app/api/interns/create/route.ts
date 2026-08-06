import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail, renderTemplate } from '@/lib/email/service';

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
 * the applicant's PERSONAL email, not a generated "official" one. This
 * avoids the whole class of bugs around inventing a unique
 * name.role26@storeshift.in address at creation time. The official
 * StoreShift-branded email is a separate, optional, purely-informational
 * field (`profiles.official_email`) that admins can set or change anytime
 * via PATCH /api/interns/official-email — it never blocks account
 * creation and never has to be unique against auth.
 *
 * IMPORTANT — profile row: we no longer rely on the `handle_new_user`
 * database trigger alone to create the `profiles` row. We `upsert` it
 * explicitly right here, so even if the trigger is slow, missing, or
 * silently failed, the profile row is guaranteed to exist and be
 * correct before we reference it from `internships`. This is the fix for
 * "account create hota hai auth me par profile table me nahi" — a plain
 * `.update()` on a nonexistent row succeeds with zero rows affected and
 * no error, which is exactly how that bug went unnoticed.
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

  // Resolve identity: from an application, or from manual entry.
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

  // Pre-check for a clearer error than the raw Supabase one.
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
  let inviteSent = false;

  if (credentialMode === 'invite_email') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in';
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(loginEmail, {
      data: { full_name: fullName, role: 'intern' },
      redirectTo: `${siteUrl}/login`,
    });
    if (inviteError || !invited?.user) {
      const message = inviteError?.message?.toLowerCase().includes('already been registered')
        ? `"${loginEmail}" is already registered.`
        : inviteError?.message ?? 'Failed to send invite';
      return NextResponse.json({ error: message, code: 'EMAIL_TAKEN' }, { status: 409 });
    }
    newUserId = invited.user.id;
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

  // Explicit upsert — see the big comment at the top of this file for why
  // this can't just be an `.update()`.
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

  let emailStatus: string = 'skipped';
  if (credentialMode === 'temp_password') {
    const result = await sendEmail({
      to: loginEmail,
      subject: 'Welcome to StoreShift 🎉',
      html: renderTemplate(
        '<p>Hi {{full_name}},</p><p>Congratulations — you have been added as a {{role_title}} intern at StoreShift.</p><p>Your login:</p><p>Email: <strong>{{login_email}}</strong><br/>Temporary Password: <strong>{{password}}</strong></p><p>Please log in and change your password on first access.</p>',
        { full_name: fullName, role_title: roleTitle, login_email: loginEmail, password: tempPassword ?? '' }
      ),
      relatedApplicationId: applicationId || undefined,
    });
    emailStatus = result.status;
  }

  return NextResponse.json({
    internship,
    loginEmail,
    officialEmail: officialEmail ?? null,
    credentialMode,
    tempPassword,
    inviteSent,
    emailStatus,
  });
}
