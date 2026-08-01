import { FileText, Award, Mail, Download } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const { data: internship } = await supabase.from('internships').select('id').eq('intern_id', profile!.id).maybeSingle();

  let offer: any = null, certificate: any = null, lor: any = null;
  if (internship) {
    const [o, c, l] = await Promise.all([
      supabase.from('offer_letters').select('*').eq('internship_id', internship.id).maybeSingle(),
      supabase.from('certificates').select('*').eq('internship_id', internship.id).maybeSingle(),
      supabase.from('letters_of_recommendation').select('*').eq('internship_id', internship.id).maybeSingle(),
    ]);
    offer = o.data; certificate = c.data; lor = l.data;
  }

  const docs = [
    { label: 'Offer Letter', icon: FileText, issued: !!offer, id: offer?.offer_id },
    { label: 'Certificate of Internship', icon: Award, issued: !!certificate, id: certificate?.certificate_id },
    { label: 'Letter of Recommendation', icon: Mail, issued: !!lor, id: lor?.lor_id },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Documents</h1>
        <p className="text-sm text-ink-500">Official documents issued by StoreShift admin.</p>
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
                  <button className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600">
                    <Download size={14} /> Download
                  </button>
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-400">Not issued yet</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
