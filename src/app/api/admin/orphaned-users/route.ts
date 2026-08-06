import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Admin-only: finds auth.users rows that have no matching `profiles` row —
 * the exact "account created in auth but not in the table, so login
 * doesn't work" bug. Lets an admin see and repair these without deleting
 * and recreating the account.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!actorProfile || !['founder', 'super_admin'].includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: authUsers, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await admin.from('profiles').select('id');
  const profileIds = new Set((profiles ?? []).map((p: any) => p.id));

  const orphaned = authUsers.users
    .filter((u) => !profileIds.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email,
      fullName: (u.user_metadata as any)?.full_name ?? u.email,
      suggestedRole: (u.user_metadata as any)?.role ?? 'applicant',
      createdAt: u.created_at,
    }));

  return NextResponse.json({ orphaned });
}
