import 'server-only';
import { renderTemplate, escapeHtml } from './template';

/**
 * Pluggable email service — SERVER-ONLY. This file transitively imports
 * Nodemailer (a Node.js-only package that touches `fs`, `net`, `tls`,
 * etc.), so it must never be reachable from a Client Component's module
 * graph. The `server-only` import above turns any accidental client
 * import of this file into an explicit build-time error instead of the
 * much more confusing "Module not found: Can't resolve 'fs'" you'd get
 * otherwise — Next.js bundles a Client Component's imports for the
 * browser, and Nodemailer's `dkim` module requires the Node `fs` module,
 * which simply doesn't exist in a browser bundle.
 *
 * Client Components that only need the `{{token}}` interpolation logic
 * should import `renderTemplate` from `./template` directly (browser-
 * safe, zero dependencies) — it's re-exported here too, for convenience,
 * but ONLY for other server-side code that's already importing this file.
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

export { renderTemplate };

export interface EmailAttachment {
  /** File name shown to the recipient, e.g. "welcome-offer.pdf". */
  filename: string;
  /** Base64-encoded file content (no data: URL prefix). */
  content: string;
  contentType: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  relatedApplicationId?: string;
  attachments?: EmailAttachment[];
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ id: string; status: 'sent' | 'failed'; error?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    // eslint-disable-next-line no-console
    console.log(`[email:console] → ${input.to} :: ${input.subject}${input.attachments?.length ? ` (+${input.attachments.length} attachment(s))` : ''}`);
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
          attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
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
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.contentType,
        })),
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
  // Subject is a plain-text mail header — interpolate as-is, no HTML
  // escaping (that would literally show "&amp;" in someone's inbox).
  const subject = renderTemplate(data?.subject ?? fallback.subject, vars);
  // bodyHtml is spliced into an HTML document, so every variable — most
  // of which ultimately trace back to a user-supplied field like a full
  // name — must be escaped first, or a crafted value could break the
  // template's markup or inject a fake link/button into the email.
  const escapedVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, escapeHtml(String(v ?? ''))])
  );
  const bodyHtml = renderTemplate(data?.body_html ?? fallback.bodyHtml, escapedVars);
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
