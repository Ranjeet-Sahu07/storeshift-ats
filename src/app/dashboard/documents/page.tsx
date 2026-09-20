import { FileText, Award, Mail, Download, Clock } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const { data: internship } = await supabase
    .from('internships')
    .select('id')
    .eq('intern_id', profile!.id)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let offer: any = null, certificate: any = null, lor: any = null;
  if (internship) {
    const [o, c, l] = await Promise.all([
      supabase.from('offer_letters').select('*').eq('internship_id', internship.id).maybeSingle(),
      supabase.from('certificates').select('*').eq('internship_id', internship.id).maybeSingle(),
      supabase.from('letters_of_recommendation').select('*').eq('internship_id', internship.id).maybeSingle(),
    ]);
    offer = o.data; certificate = c.data; lor = l.data;
  }

  // Generate download links server-side. We already confirmed ownership
  // above via the normal (RLS-scoped) client, so it's safe to use the
  // service-role client here purely to sign the file URLs — this never
  // runs in the browser.
  const admin = createAdminClient();
  async function signedUrlFor(bucket: string, path: string | null) {
    if (!path) return null;
    if (bucket === 'certificates') {
      const { data } = admin.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    const { data } = await admin.storage.from(bucket).createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  }

  const [offerUrl, certUrl, lorUrl] = await Promise.all([
    signedUrlFor('offer-letters', offer?.pdf_path ?? null),
    signedUrlFor('certificates', certificate?.pdf_path ?? null),
    signedUrlFor('lor', lor?.pdf_path ?? null),
  ]);

  const docs = [
    { label: 'Offer Letter', icon: FileText, issued: !!offer, id: offer?.offer_id, url: offerUrl },
    { label: 'Certificate of Internship', icon: Award, issued: !!certificate, id: certificate?.certificate_id, url: certUrl },
    { label: 'Letter of Recommendation', icon: Mail, issued: !!lor, id: lor?.lor_id, url: lorUrl },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Documents</h1>
        <p className="text-sm text-ink-500">Official documents issued by StoreShift admin — downloadable as PDF.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {docs.map((d) => (
          <Card key={d.label} className="p-5">
            <CardContent className="p-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><d.icon size={20} /></span>
              <p className="mt-3 font-display font-semibold text-ink-900">{d.label}</p>
              {d.issued ? (
                <>
                  <p className="mt-1 font-mono text-xs text-ink-400">{d.id}</p>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      <Download size={14} /> Download PDF
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-amber-600">File not available yet — check with HR.</p>
                  )}
                </>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-400">
                  <Clock size={13} /> Not issued yet
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!internship && (
        <p className="text-sm text-ink-400">
          No internship record found on your account yet — documents will appear here once one is set up.
        </p>
      )}
    </div>
  );
}
