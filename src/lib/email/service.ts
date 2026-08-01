/**
 * Pluggable email service.
 *
 * EMAIL_PROVIDER=console (default) — logs the email and writes it to the
 *   `email_log` table instead of sending it. Safe for local dev / demos.
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

function getProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
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

/** Fire off a batch of emails sequentially, collecting results (bulk-send feature). */
export async function sendBulkEmails(inputs: SendEmailInput[]) {
  const results = [];
  for (const input of inputs) {
    results.push({ to: input.to, ...(await sendEmail(input)) });
  }
  return results;
}
