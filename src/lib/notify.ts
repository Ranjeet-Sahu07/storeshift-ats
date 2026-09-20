import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Inserts a notification row for another user (e.g. an intern getting a
 * new task, a mentor getting a new message). Best-effort — a failure here
 * should never block the action that triggered it (task creation,
 * document generation, etc.), so callers should fire-and-forget or
 * swallow the error the same way `notifyDocumentReady` does for email.
 *
 * Requires `supabase/migrations/008_*.sql` — the original notifications
 * RLS policy only allowed inserting a row addressed to yourself, which
 * made notifying anyone else impossible.
 */
export async function notifyUser(
  supabase: SupabaseClient,
  recipientId: string,
  title: string,
  body?: string,
  link?: string
) {
  try {
    await supabase.from('notifications').insert({ recipient_id: recipientId, title, body: body ?? null, link: link ?? null });
  } catch {
    // Non-critical — the primary action already succeeded.
  }
}
