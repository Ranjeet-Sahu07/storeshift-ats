'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateOfferId } from '@/lib/ids';
import { generateLetterPdf } from '@/lib/pdf/letter-pdf';
import { downloadDocument } from '@/lib/documents';
import { formatDate } from '@/lib/utils';
import { PageSkeleton } from '@/components/ui/page-skeleton';

function renderTemplate(
  body: string,
  vars: Record<string, string | number | undefined>
) {
  return body.replace(
    /{{\s*(\w+)\s*}}/g,
                      (_, key) => String(vars[key] ?? '')
  );
}

const FALLBACK_TEMPLATE = 'Dear {{full_name}},\n\nWe are pleased to offer you the position of {{role_title}} in the {{department}} department as part of the StoreShift Internship Program.\n\nYour internship will run for {{duration_months}} months, starting {{start_date}}.\n\nYour official StoreShift email will be {{official_email}}.\n\nWe look forward to having you on the team.';

export default function OfferLettersPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [template, setTemplate] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [internRes, offerRes, templateRes] = await Promise.all([
      supabase.from('internships').select('*, profiles!internships_intern_id_fkey(full_name, official_email)'),
      supabase.from('offer_letters').select('*, internships(role_title, profiles!internships_intern_id_fkey(full_name))').order('issued_at', { ascending: false }),
      supabase.from('letter_templates').select('*').eq('type', 'offer_letter').maybeSingle(),
    ]);
    setInternships(internRes.data ?? []);
    setOffers(offerRes.data ?? []);
    setTemplate(templateRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const issuedIds = new Set(offers.map((o) => o.internship_id));
  const eligible = internships.filter((i) => !issuedIds.has(i.id));

  function buildBody(internship: any) {
    const tpl = template?.body_template ?? FALLBACK_TEMPLATE;
    const rendered = renderTemplate(tpl, {
      full_name: internship.profiles?.full_name ?? '',
      role_title: internship.role_title,
      department: internship.department,
      duration_months: internship.duration_months,
      start_date: new Date(internship.start_date).toLocaleDateString('en-IN'),
      official_email: internship.profiles?.official_email ?? 'assigned separately',
    });
    return rendered.split(/\n\n+/);
  }

  async function generate(internship: any) {
    setBusy(internship.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { count } = await supabase.from('offer_letters').select('*', { count: 'exact', head: true });
      const offerId = generateOfferId((count ?? 0) + 1);

      const pdfBlob = await generateLetterPdf({
        title: template?.title ?? 'Internship Offer Letter',
        letterId: offerId,
        bodyLines: buildBody(internship),
        signatoryName: template?.signatory_name ?? 'Ranjeet Kumar',
        signatoryTitle: template?.signatory_title ?? 'Founder & CEO',
        issueDate: new Date().toLocaleDateString('en-IN'),
      });

      const path = `${offerId}.pdf`;
      const { error: uploadError } = await supabase.storage.from('offer-letters').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('offer_letters').insert({ offer_id: offerId, internship_id: internship.id, pdf_path: path, generated_by: user?.id });
      if (insertError) throw insertError;

      toast.success(`Offer letter ${offerId} generated`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate offer letter');
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(offer: any) {
    setRegeneratingId(offer.id);
    try {
      const supabase = createClient();
      const internship = internships.find((i) => i.id === offer.internship_id);
      if (!internship) throw new Error('Underlying internship record not found');

      const pdfBlob = await generateLetterPdf({
        title: template?.title ?? 'Internship Offer Letter',
        letterId: offer.offer_id,
        bodyLines: buildBody(internship),
        signatoryName: template?.signatory_name ?? 'Ranjeet Kumar',
        signatoryTitle: template?.signatory_title ?? 'Founder & CEO',
        issueDate: formatDate(offer.issued_at),
      });
      const path = offer.pdf_path ?? `${offer.offer_id}.pdf`;
      const { error: uploadError } = await supabase.storage.from('offer-letters').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
      if (!offer.pdf_path) await supabase.from('offer_letters').update({ pdf_path: path }).eq('id', offer.id);
      toast.success('Offer letter file regenerated');
    } catch (err: any) {
      toast.error(err.message ?? 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Offer Letter Generator</h1>
        <p className="text-sm text-ink-500">
          Auto-filled from the intern's profile. Wording comes from the template in{' '}
          <a href="/admin/settings" className="text-brand-600 underline">Settings → Letter Templates</a>.
        </p>
      </div>

      {loading ? <PageSkeleton rows={4} /> : (
        <>
          <Card>
            <CardHeader><CardTitle>Pending Offer Letters</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {eligible.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                    <p className="text-xs text-ink-400">{i.role_title} · {i.department}</p>
                  </div>
                  <Button size="sm" onClick={() => generate(i)} disabled={busy === i.id}>
                    {busy === i.id ? 'Generating…' : 'Generate Offer Letter'}
                  </Button>
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
                  <tr>
                    <th className="px-5 py-3 font-medium">Intern</th>
                    <th className="px-5 py-3 font-medium">Offer ID</th>
                    <th className="px-5 py-3 font-medium">Issued</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3 font-medium text-ink-900">{o.internships?.profiles?.full_name ?? '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{o.offer_id}</td>
                      <td className="px-5 py-3 text-ink-400">{formatDate(o.issued_at)}</td>
                      <td className="px-5 py-3"><Badge tone="brand"><FileText size={11} className="mr-1" />Issued</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => downloadDocument('offer_letter', o.id)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                            <Download size={13} /> PDF
                          </button>
                          <button onClick={() => regenerate(o)} disabled={regeneratingId === o.id} className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-ink-600">
                            <RotateCw size={12} className={regeneratingId === o.id ? 'animate-spin' : ''} /> {regeneratingId === o.id ? 'Regenerating…' : 'Regenerate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {offers.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No offer letters issued yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
