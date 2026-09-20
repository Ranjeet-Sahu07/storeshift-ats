import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const BUCKETS: Record<string, string> = {
  offer_letter: 'offer-letters',
  certificate: 'certificates',
  lor: 'lor',
};

const TABLES: Record<string, string> = {
  offer_letter: 'offer_letters',
  certificate: 'certificates',
  lor: 'letters_of_recommendation',
};

/**
 * Returns a short-lived download URL for a generated document.
 *
 * Security model: this route does NOT check the caller's role itself —
 * it relies on the row-level lookup below going through the normal,
 * cookie-authenticated client, which is bound by the existing RLS
 * policies (`*_own_select` lets an intern see only their own row,
 * `*_staff_all` lets any staff member see any row). If that lookup
 * returns nothing, the caller has no legitimate access and we stop
 * there. Only once a row is confirmed visible to *this* caller do we
 * use the service-role client to mint a signed URL for the underlying
 * file — the service role never bypasses the authorization check above,
 * it just has permission to sign URLs against the private buckets.
 *
 * Body: { kind: 'offer_letter' | 'certificate' | 'lor', id }
 */
export async function POST(req: NextRequest) {
  const { kind, id } = await req.json();
  if (!kind || !id || !BUCKETS[kind]) {
    return NextResponse.json({ error: 'Invalid document kind' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const table = TABLES[kind];
  const { data: row, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: 'Document not found or you do not have access to it' }, { status: 404 });

  const path = row.pdf_path;
  if (!path) return NextResponse.json({ error: 'This document has no file attached yet' }, { status: 404 });

  const bucket = BUCKETS[kind];
  const admin = createAdminClient();

  if (bucket === 'certificates') {
    // Certificates bucket is public — no signing needed.
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  }

  const { data: signed, error: signError } = await admin.storage.from(bucket).createSignedUrl(path, 300);
  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? 'Could not generate a download link' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
