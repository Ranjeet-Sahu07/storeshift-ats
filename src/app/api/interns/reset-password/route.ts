import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail, renderStoredTemplate } from '@/lib/email/service';
import { brandedEmailShell, eyebrow, heading, credentialTable, emailButton } from '@/lib/email/templates';

/**
 * Admin-only: resets an existing intern's (or any user's) password to a
 * fresh temporary one. The new password is both returned directly in the
 * response (so admin can hand it over one-time, in-app) AND emailed to
 * the account holder — the two aren't mutually exclusive; email delivery
 * isn't guaranteed to be configured/working, so the in-app one-time view
 * stays the reliable fallback.
 *
 * Body: { userId }
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

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const admin = createAdminClient();
  const tempPassword = `SS-${Math.random().toString(36).slice(2, 10)}!A1`;

  const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'intern.password_reset', entity_type: 'profile', entity_id: userId, metadata: {},
  });

  const { data: recipient } = await admin.from('profiles').select('full_name, email').eq('id', userId).maybeSingle();
  let emailStatus: string = 'skipped';

  if (recipient) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in';
    const { subject, bodyHtml } = await renderStoredTemplate(
      admin,
      'password_reset',
      { full_name: recipient.full_name },
      { subject: 'Your StoreShift password has been reset', bodyHtml: '<p>An admin has reset your StoreShift account password. Your new temporary password is below — please log in and change it as soon as possible.</p>' }
    );
    const html = brandedEmailShell(
      `${eyebrow('Security Update')}${heading(`Hi ${recipient.full_name},`)}${bodyHtml}${credentialTable([['Login Email', recipient.email], ['New Password', tempPassword]])}${emailButton('Log In', `${siteUrl}/login`)}`
    );
    const result = await sendEmail({ to: recipient.email, subject, html });
    emailStatus = result.status;

    await admin.from('email_log').insert({
      to_email: recipient.email, subject, status: result.status, sent_by: user.id,
      provider_response: { kind: 'password_reset', providerId: result.id, error: (result as any).error ?? null },
    });
  }

  return NextResponse.json({ tempPassword, emailStatus });
}
