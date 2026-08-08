import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

/**
 * Reads the current user's profile for use in layouts/pages. Uses
 * `getSession()` (cookie-local, no network call) rather than `getUser()`
 * to get the user id — middleware has already gated this route to a
 * logged-in session, so this only needs to be fast, not re-prove
 * identity from scratch. The actual data access is still fully protected
 * by RLS regardless.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return profile as Profile | null;
}
