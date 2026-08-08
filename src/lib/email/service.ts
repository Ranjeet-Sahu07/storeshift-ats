/**
 * Pluggable email service.
 *
 * EMAIL_PROVIDER=console (default) — logs the email and writes it to the
 *   `email_log` table instead of sending it. Safe for local dev / demos.
 * EMAIL_PROVIDER=smtp — sends through any SMTP server, including Gmail /
 *   Google Workspace. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *   (and optionally SMTP_SECURE) — see .env.example. For Gmail, SMTP_USER
 *   must be the full address (e.g. careers@storeshift.in) and
 *   SMTP_PASSWORD must be a 16-character **App Password**, not the normal
 *   account password — Gmail rejects plain-password SMTP auth entirely.
 *   Generate one at https://myaccount.google.com/apppasswords (requires
 *   2-Step Verification to be turned on for that account first).
 * EMAIL_PROVIDER=resend — sends through Resend (https://resend.com).
 *   Set RESEND_API_KEY and EMAIL_FROM in your environment.
 *
 * To add another provider (SendGrid, SES, Postmark…) implement the
 * `EmailProvider` interface below and register it in `getProvider()`.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  relatedApplicationId?: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ id: string; status: 'sent' | 'failed'; error?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    // eslint-disable-next-line no-console
    console.log(`[email:console] → ${input.to} :: ${input.subject}`);
    return { id: `console_${Date.now()}`, status: 'sent' as const };
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { id: '', status: 'failed' as const, error: 'RESEND_API_KEY not configured' };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'StoreShift Careers <careers@storeshift.in>',
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { id: '', status: 'failed' as const, error: JSON.stringify(data) };
      return { id: data.id, status: 'sent' as const };
    } catch (err: any) {
      return { id: '', status: 'failed' as const, error: err.message };
    }
  }
}

class SmtpEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      return { id: '', status: 'failed' as const, error: 'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must all be set' };
    }

    try {
      // Dynamic import so `nodemailer` (a server-only Node package) never
      // gets pulled into any client bundle — this file is only ever
      // imported from server code (API routes), but the dynamic import
      // is a belt-and-suspenders guard against that changing by accident.
      const nodemailer = (await import('nodemailer')).default;
      const port = Number(process.env.SMTP_PORT ?? 587);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? user,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      return { id: info.messageId, status: 'sent' as const };
    } catch (err: any) {
      return { id: '', status: 'failed' as const, error: err.message };
    }
  }
}

function getProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
    case 'smtp':
      return new SmtpEmailProvider();
    case 'resend':
      return new ResendEmailProvider();
    default:
      return new ConsoleEmailProvider();
  }
}

/** Simple {{token}} interpolation for email templates. */
export function renderTemplate(body: string, vars: Record<string, string | number | undefined>) {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(vars[key] ?? ''));
}

export async function sendEmail(input: SendEmailInput) {
  const provider = getProvider();
  return provider.send(input);
}

/**
 * Fetches an admin-editable template row by its stable `key` and renders
 * its subject + body with the given tokens. Falls back to the provided
 * defaults if the row is missing (e.g. a fresh database that hasn't run
 * the seed yet) so email sending never hard-fails on a missing template.
 * `admin` must be a service-role client (this is always called from
 * server-side code that already has one).
 */
export async function renderStoredTemplate(
  admin: any,
  key: string,
  vars: Record<string, string | number | undefined>,
  fallback: { subject: string; bodyHtml: string }
): Promise<{ subject: string; bodyHtml: string }> {
  const { data } = await admin.from('email_templates').select('subject, body_html').eq('key', key).maybeSingle();
  const subject = renderTemplate(data?.subject ?? fallback.subject, vars);
  const bodyHtml = renderTemplate(data?.body_html ?? fallback.bodyHtml, vars);
  return { subject, bodyHtml };
}

/** Fire off a batch of emails sequentially, collecting results (bulk-send feature). */
export async function sendBulkEmails(inputs: SendEmailInput[]) {
  const results = [];
  for (const input of inputs) {
    results.push({ to: input.to, ...(await sendEmail(input)) });
  }
  return results;
}
