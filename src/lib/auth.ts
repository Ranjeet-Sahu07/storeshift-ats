import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

/**
 * Reads the current user's profile for use in layouts/pages.
 *
 * Uses `getUser()`, not `getSession()` — this result is used to decide
 * *what role/profile a person is granted* (admin vs intern layouts,
 * which nav items render, etc.), which is an authorization decision, not
 * just a fast existence check. `getSession()` trusts whatever the cookie
 * claims without contacting the Auth server; `getUser()` re-validates the
 * token server-side, which is what Supabase recommends whenever the
 * result is used to make an access decision (see the "Using the user
 * object as returned from getSession()... could be insecure" warning).
 * Middleware's pre-check is a separate, appropriately lighter-weight
 * case — see the comment in src/middleware.ts.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return profile as Profile | null;
}
