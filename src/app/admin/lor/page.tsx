'use client';

import { useEffect, useState } from 'react';
import { Mail, Download, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateLorId } from '@/lib/ids';
import { generateLetterPdf } from '@/lib/pdf/letter-pdf';
import { downloadDocument, notifyDocumentReady } from '@/lib/documents';

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

const FALLBACK_TEMPLATE = 'To Whom It May Concern,\n\nThis is to certify that {{full_name}} completed a {{duration_months}}-month internship as a {{role_title}} in the {{department}} department at StoreShift. Throughout the internship, they demonstrated strong technical skills, reliability, and a collaborative attitude. We recommend them for future opportunities without reservation.';

export default function LorPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [lors, setLors] = useState<any[]>([]);
  const [template, setTemplate] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [internRes, lorRes, templateRes] = await Promise.all([
      supabase.from('internships').select('*, profiles!internships_intern_id_fkey(full_name)').eq('status', 'completed'),
      supabase.from('letters_of_recommendation').select('*, internships(role_title, profiles!internships_intern_id_fkey(full_name))').order('issued_at', { ascending: false }),
      supabase.from('letter_templates').select('*').eq('type', 'lor').maybeSingle(),
    ]);
    setInternships(internRes.data ?? []);
    setLors(lorRes.data ?? []);
    setTemplate(templateRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const issuedIds = new Set(lors.map((l) => l.internship_id));
  const eligible = internships.filter((i) => !issuedIds.has(i.id));

  function buildBody(internship: any) {
    const tpl = template?.body_template ?? FALLBACK_TEMPLATE;
    const rendered = renderTemplate(tpl, {
      full_name: internship.profiles?.full_name ?? '',
      role_title: internship.role_title,
      department: internship.department,
      duration_months: internship.duration_months,
    });
    return rendered.split(/\n\n+/);
  }

  async function generate(internship: any) {
    setBusy(internship.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { count } = await supabase.from('letters_of_recommendation').select('*', { count: 'exact', head: true });
      const lorId = generateLorId((count ?? 0) + 1);
      const bodyLines = buildBody(internship);

      const pdfBlob = await generateLetterPdf({
        title: template?.title ?? 'Letter of Recommendation',
        letterId: lorId,
        bodyLines,
        signatoryName: template?.signatory_name ?? 'Ranjeet Kumar',
        signatoryTitle: template?.signatory_title ?? 'Founder & CEO',
        issueDate: new Date().toLocaleDateString('en-IN'),
      });

      const path = `${lorId}.pdf`;
      const { error: uploadError } = await supabase.storage.from('lor').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: lorRow, error: insertError } = await supabase.from('letters_of_recommendation').insert({
        lor_id: lorId, internship_id: internship.id, body: bodyLines.join('\n\n'), pdf_path: path, generated_by: user?.id,
      }).select().single();
      if (insertError) throw insertError;
      if (lorRow) await notifyDocumentReady('lor', internship.id, lorRow.id);

      toast.success(`LOR ${lorId} generated`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate letter');
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(lor: any) {
    setRegeneratingId(lor.id);
    try {
      const supabase = createClient();
      const internship = internships.find((i) => i.id === lor.internship_id);

      const pdfBlob = await generateLetterPdf({
        title: template?.title ?? 'Letter of Recommendation',
        letterId: lor.lor_id,
        bodyLines: internship ? buildBody(internship) : [lor.body],
        signatoryName: template?.signatory_name ?? 'Ranjeet Kumar',
        signatoryTitle: template?.signatory_title ?? 'Founder & CEO',
        issueDate: formatDate(lor.issued_at),
      });
      const path = lor.pdf_path ?? `${lor.lor_id}.pdf`;
      const { error: uploadError } = await supabase.storage.from('lor').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
      if (!lor.pdf_path) await supabase.from('letters_of_recommendation').update({ pdf_path: path }).eq('id', lor.id);
      await notifyDocumentReady('lor', lor.internship_id, lor.id);
      toast.success('Letter file regenerated');
    } catch (err: any) {
      toast.error(err.message ?? 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Letter of Recommendation Generator</h1>
        <p className="text-sm text-ink-500">
          Auto-filled from the intern's completed profile. Wording comes from the template in{' '}
          <a href="/admin/settings" className="text-brand-600 underline">Settings → Letter Templates</a>.
        </p>
      </div>

      {loading ? <PageSkeleton rows={4} /> : (
        <>
          <Card>
            <CardHeader><CardTitle>Eligible Interns (Completed)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {eligible.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                    <p className="text-xs text-ink-400">{i.role_title} · {i.department}</p>
                  </div>
                  <Button size="sm" onClick={() => generate(i)} disabled={busy === i.id}>
                    {busy === i.id ? 'Generating…' : 'Generate LOR'}
                  </Button>
                </div>
              ))}
              {eligible.length === 0 && <p className="text-sm text-ink-400">No interns have completed their program yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Issued Letters</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Intern</th>
                    <th className="px-5 py-3 font-medium">LOR ID</th>
                    <th className="px-5 py-3 font-medium">Issued</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lors.map((l) => (
                    <tr key={l.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3 font-medium text-ink-900">{l.internships?.profiles?.full_name ?? '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{l.lor_id}</td>
                      <td className="px-5 py-3 text-ink-400">{formatDate(l.issued_at)}</td>
                      <td className="px-5 py-3"><Badge tone="brand"><Mail size={11} className="mr-1" />Issued</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => downloadDocument('lor', l.id)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                            <Download size={13} /> PDF
                          </button>
                          <button onClick={() => regenerate(l)} disabled={regeneratingId === l.id} className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-ink-600">
                            <RotateCw size={12} className={regeneratingId === l.id ? 'animate-spin' : ''} /> {regeneratingId === l.id ? 'Regenerating…' : 'Regenerate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lors.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No letters issued yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
