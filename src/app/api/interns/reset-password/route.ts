import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Admin-only: resets an existing intern's (or any user's) password to a
 * fresh temporary one and returns it directly in the response — for cases
 * where the original credential email never arrived, got lost, or the
 * account was created before email delivery was configured.
 *
 * Body: { userId }
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

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const admin = createAdminClient();
  const tempPassword = `SS-${Math.random().toString(36).slice(2, 10)}!A1`;

  const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'intern.password_reset', entity_type: 'profile', entity_id: userId, metadata: {},
  });

  return NextResponse.json({ tempPassword });
}
