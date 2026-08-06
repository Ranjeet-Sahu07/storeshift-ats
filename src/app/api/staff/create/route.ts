import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Admin-only: creates a staff login (HR Manager, Recruiter, Mentor,
 * Technical Interviewer, Certificate Manager, or another Admin) directly —
 * for team members who didn't come through the applicant pipeline.
 *
 * Body: { fullName, email, password, role, department }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!actorProfile || !['founder', 'super_admin'].includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Only Founder or Super Admin can create staff accounts' }, { status: 403 });
  }

  const { fullName, email, password, role, department } = await req.json();

  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: 'Full name, email, password, and role are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .or(`email.eq.${normalizedEmail},official_email.eq.${normalizedEmail}`)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: `"${normalizedEmail}" is already registered. Use a different email.`, code: 'EMAIL_TAKEN' }, { status: 409 });
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createError || !newUser?.user) {
    const message = createError?.message?.toLowerCase().includes('already been registered')
      ? `"${normalizedEmail}" is already registered. Use a different email.`
      : createError?.message ?? 'Failed to create account';
    return NextResponse.json({ error: message, code: 'EMAIL_TAKEN' }, { status: 409 });
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: newUser.user.id,
      full_name: fullName,
      email: normalizedEmail,
      official_email: normalizedEmail,
      role,
      department: department || null,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    return NextResponse.json({ error: `Auth account was created but the profile record failed: ${profileError.message}. Contact support before retrying.` }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id, action: 'staff.account_created', entity_type: 'profile', entity_id: newUser.user.id,
    metadata: { role, email: normalizedEmail },
  });

  return NextResponse.json({ userId: newUser.user.id, email: normalizedEmail });
}
