import { NextResponse } from 'next/server';

export async function GET() {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  let configured = true;
  if (provider === 'resend') {
    configured = !!process.env.RESEND_API_KEY;
  } else if (provider === 'smtp') {
    configured = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
  }

  return NextResponse.json({ provider, configured });
}
