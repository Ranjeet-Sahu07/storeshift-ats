import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Admin-only: sets or updates an intern's "official" StoreShift-branded
 * email (e.g. rahul.int23@storeshift.in) — a purely informational field
 * shown on their dashboard, certificate, and offer letter. This is
 * intentionally separate from their login email (which stays their
 * personal email from the application) so it can be assigned, corrected,
 * or left blank at any time without touching auth or risking a duplicate-
 * login error.
 *
 * Body: { userId, officialEmail }
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

  const { userId, officialEmail } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const admin = createAdminClient();
  const normalized = officialEmail?.trim().toLowerCase() || null;

  if (normalized) {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('official_email', normalized)
      .neq('id', userId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: `"${normalized}" is already assigned to another account.` }, { status: 409 });
    }
  }

  const { error } = await admin.from('profiles').update({ official_email: normalized }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'intern.official_email_updated', entity_type: 'profile', entity_id: userId,
    metadata: { official_email: normalized },
  });

  return NextResponse.json({ ok: true, officialEmail: normalized });
}
