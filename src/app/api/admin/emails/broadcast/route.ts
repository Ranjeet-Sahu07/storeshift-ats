import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/service';
import type { EmailAttachment } from '@/lib/email/service';
import { brandedEmailShell, eyebrow, heading, renderMessageParagraphs } from '@/lib/email/templates';
import { escapeHtml } from '@/lib/email/template';

/**
 * Admin-only: sends a one-off or bulk email — to selected interns, to any
 * freeform list of email addresses, or both — with optional attachments.
 * Powers the admin "Email Center" broadcast composer (announcements,
 * promotions, general information that doesn't belong to any one
 * automated flow).
 *
 * Attachments are uploaded by the client straight to the private
 * `email-attachments` storage bucket first (same pattern the
 * certificate/offer-letter generators use for PDFs) — this route just
 * receives the resulting storage paths, so there's no risk of hitting a
 * serverless function's request-body size limit with a photo or PDF.
 *
 * Body: {
 *   recipients: string[]              // deduped, validated email addresses
 *   subject: string
 *   message: string                   // plain text, blank-line-separated paragraphs
 *   attachments?: { path: string; filename: string; contentType: string }[]
 * }
 */
const STAFF_ROLES = ['founder', 'super_admin', 'hr_manager', 'recruiter', 'mentor', 'technical_interviewer', 'certificate_manager'];
const EMAIL_SENDER_ROLES = ['founder', 'super_admin', 'hr_manager', 'recruiter'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 500;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (!actorProfile || !STAFF_ROLES.includes(actorProfile.role) || !EMAIL_SENDER_ROLES.includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden — you do not have permission to send broadcast emails' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { recipients, subject, message, attachments } = body ?? {};
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
  }
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are both required' }, { status: 400 });
  }

  const uniqueRecipients = Array.from(new Set(recipients.map((r: string) => r.trim().toLowerCase()))).filter((r) => EMAIL_RE.test(r as string)) as string[];
  if (uniqueRecipients.length === 0) {
    return NextResponse.json({ error: 'No valid email addresses in the recipient list' }, { status: 400 });
  }
  if (uniqueRecipients.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Too many recipients — max ${MAX_RECIPIENTS} per send` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Pull attachment bytes once from storage and reuse for every recipient
  // — no need to re-download per send.
  const emailAttachments: EmailAttachment[] = [];
  const attachmentMeta: { filename: string; size: number }[] = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      if (!att?.path || !att?.filename) continue;
      const { data: fileBlob, error: dlError } = await admin.storage.from('email-attachments').download(att.path);
      if (dlError || !fileBlob) {
        return NextResponse.json({ error: `Couldn't read attachment "${att.filename}": ${dlError?.message ?? 'not found'}` }, { status: 400 });
      }
      const buf = Buffer.from(await fileBlob.arrayBuffer());
      emailAttachments.push({ filename: att.filename, content: buf.toString('base64'), contentType: att.contentType || fileBlob.type || 'application/octet-stream' });
      attachmentMeta.push({ filename: att.filename, size: buf.byteLength });
    }
  }

  const html = brandedEmailShell(
    `${eyebrow('StoreShift')}${heading(subject.trim())}${renderMessageParagraphs(message.trim())}<p style="color:#9AA5A4;font-size:12px;margin-top:20px;">— ${escapeHtml(actorProfile.full_name)}, StoreShift</p>`
  );

  const results: { to: string; status: string; error?: string }[] = [];
  for (const to of uniqueRecipients) {
    const result = await sendEmail({ to, subject: subject.trim(), html, attachments: emailAttachments });
    results.push({ to, status: result.status, error: (result as any).error });

    await admin.from('email_log').insert({
      to_email: to,
      subject: subject.trim(),
      status: result.status,
      sent_by: user.id,
      attachments: attachmentMeta.length > 0 ? attachmentMeta : null,
      provider_response: { kind: 'broadcast', body: message.trim(), providerId: result.id, error: (result as any).error ?? null },
    });
  }

  const sentCount = results.filter((r) => r.status === 'sent').length;
  return NextResponse.json({ sentCount, failedCount: results.length - sentCount, results });
}
