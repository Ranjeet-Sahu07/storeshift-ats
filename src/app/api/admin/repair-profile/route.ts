import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

/**
 * Admin-only: creates the missing `profiles` row for an auth user that
 * already exists in Supabase Auth but has no profile — repairs the
 * "can't log in" state without touching their auth account or password.
 *
 * Body: { userId, fullName, email, role }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!actorProfile || !['founder', 'super_admin'].includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, fullName, email, role } = await req.json();
  if (!userId || !fullName || !email || !role) {
    return NextResponse.json({ error: 'userId, fullName, email, and role are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').upsert(
    { id: userId, full_name: fullName, email: email.trim().toLowerCase(), role: role as UserRole, is_active: true },
    { onConflict: 'id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'profile.repaired', entity_type: 'profile', entity_id: userId, metadata: { role },
  });

  return NextResponse.json({ ok: true });
}
