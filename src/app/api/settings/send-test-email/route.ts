import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: 'StoreShift — Test Email',
    html: '<p>This is a test email from your StoreShift Careers admin panel. If you received this, outbound email is working correctly.</p>',
  });

  return NextResponse.json(result);
}
