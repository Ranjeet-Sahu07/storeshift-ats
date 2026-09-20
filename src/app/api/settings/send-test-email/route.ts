import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/service';

const STAFF_ROLES = ['founder', 'super_admin', 'hr_manager', 'recruiter', 'mentor', 'technical_interviewer', 'certificate_manager'];

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Bug fix: this previously only checked that *some* user was logged
  // in — an intern account could hit this route directly and use the
  // app's own SMTP/Resend credentials to send mail to any address.
  const { data: actorProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!actorProfile || !STAFF_ROLES.includes(actorProfile.role)) {
    return NextResponse.json({ error: 'Forbidden — staff access required' }, { status: 403 });
  }

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: 'StoreShift — Test Email',
    html: '<p>This is a test email from your StoreShift Careers admin panel. If you received this, outbound email is working correctly.</p>',
  });

  return NextResponse.json(result);
}
