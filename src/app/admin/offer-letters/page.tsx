'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateOfferId } from '@/lib/ids';
import { generateLetterPdf } from '@/lib/pdf/letter-pdf';
import { formatDate } from '@/lib/utils';

export default function OfferLettersPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: internList } = await supabase.from('internships').select('*, profiles!internships_intern_id_fkey(full_name, official_email)');
    setInternships(internList ?? []);
    const { data } = await supabase.from('offer_letters').select('*').order('issued_at', { ascending: false });
    setOffers(data ?? []);
  }

  useEffect(() => { load(); }, []);

  const issuedIds = new Set(offers.map((o) => o.internship_id));
  const eligible = internships.filter((i) => !issuedIds.has(i.id));

  async function generate(internship: any) {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('offer_letters').select('*', { count: 'exact', head: true });
    const offerId = generateOfferId((count ?? 0) + 1);

    const pdfBlob = generateLetterPdf({
      title: 'Internship Offer Letter',
      letterId: offerId,
      bodyLines: [
        `Dear ${internship.profiles?.full_name},`,
        '',
        `We are pleased to offer you the position of ${internship.role_title} in the ${internship.department} department as part of the StoreShift Internship Program.`,
        `Your internship will run for ${internship.duration_months} months, starting ${new Date(internship.start_date).toLocaleDateString('en-IN')}.`,
        `Your official StoreShift email will be ${internship.profiles?.official_email ?? 'assigned separately'}.`,
        '',
        'We look forward to having you on the team.',
      ],
      signatoryName: 'Ranjeet Kumar',
      signatoryTitle: 'Founder & CEO',
      issueDate: new Date().toLocaleDateString('en-IN'),
    });

    const path = `${offerId}.pdf`;
    await supabase.storage.from('offer-letters').upload(path, pdfBlob, { upsert: true });
    await supabase.from('offer_letters').insert({ offer_id: offerId, internship_id: internship.id, pdf_path: path, generated_by: user?.id });

    toast.success(`Offer letter ${offerId} generated`);
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Offer Letter Generator</h1>
        <p className="text-sm text-ink-500">Auto-filled from the intern&apos;s profile — generate and file in one click.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending Offer Letters</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {eligible.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                <p className="text-xs text-ink-400">{i.role_title} · {i.department}</p>
              </div>
              <Button size="sm" onClick={() => generate(i)} disabled={busy}>Generate Offer Letter</Button>
            </div>
          ))}
          {eligible.length === 0 && <p className="text-sm text-ink-400">No pending offer letters.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Issued Offer Letters</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr><th className="px-5 py-3 font-medium">Offer ID</th><th className="px-5 py-3 font-medium">Issued</th><th className="px-5 py-3 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{o.offer_id}</td>
                  <td className="px-5 py-3 text-ink-400">{formatDate(o.issued_at)}</td>
                  <td className="px-5 py-3"><Badge tone="brand"><FileText size={11} className="mr-1" />Issued</Badge></td>
                </tr>
              ))}
              {offers.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-ink-400">No offer letters issued yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
