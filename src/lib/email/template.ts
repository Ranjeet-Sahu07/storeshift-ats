/**
 * Pure {{token}} string interpolation — no Node.js APIs, no Supabase, no
 * email provider logic. Safe to import from Client Components.
 *
 * This is intentionally its own file, separate from `email/service.ts`
 * (which pulls in Nodemailer and is marked `server-only`) so that code
 * needing just the interpolation logic — like a Client Component
 * rendering a live preview of a letter body — never drags a Node-only
 * dependency into the browser bundle.
 */
export function renderTemplate(body: string, vars: Record<string, string | number | undefined>): string {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(vars[key] ?? ''));
}

/**
 * Escapes a string for safe interpolation into HTML. Every place that
 * builds an email by splicing a variable (an intern's name, a subject
 * line, an admin-typed message) into an HTML template needs this —
 * without it, anyone who can influence that variable (e.g. a "full name"
 * field filled in at signup) could break the email's markup or inject a
 * fake link/button into an otherwise-legitimate StoreShift email.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
