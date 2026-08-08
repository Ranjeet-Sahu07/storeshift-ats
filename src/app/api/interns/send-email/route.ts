import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/service';
import { brandedEmailShell, eyebrow, heading, renderMessageParagraphs } from '@/lib/email/templates';

/**
 * Admin-only: sends a custom email to an intern (or any user) from within
 * the admin panel, and logs it to `email_log` so it shows up in that
 * person's message history.
 *
 * Body: { userId, subject, message }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  const staffRoles = ['founder', 'super_admin', 'hr_manager', 'recruiter', 'mentor', 'technical_interviewer', 'certificate_manager'];
  if (!actorProfile || !staffRoles.includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, subject, message } = await req.json();
  if (!userId || !subject || !message) {
    return NextResponse.json({ error: 'userId, subject, and message are all required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: recipient } = await admin.from('profiles').select('full_name, email').eq('id', userId).single();
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  const html = brandedEmailShell(
    `${eyebrow('Message from StoreShift')}${heading(`Hi ${recipient.full_name},`)}${renderMessageParagraphs(message)}<p style="color:#9AA5A4;font-size:12px;margin-top:20px;">— ${actorProfile.full_name}, StoreShift</p>`
  );

  const result = await sendEmail({ to: recipient.email, subject, html });

  await admin.from('email_log').insert({
    to_email: recipient.email, subject, status: result.status, sent_by: user.id,
    provider_response: { kind: 'admin_message', body: message, providerId: result.id, error: (result as any).error ?? null },
  });

  return NextResponse.json({ status: result.status });
}
