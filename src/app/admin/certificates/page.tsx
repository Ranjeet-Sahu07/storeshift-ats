'use client';

import { useEffect, useState } from 'react';
import { Award, Download, CheckSquare, Square, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateCertificateId } from '@/lib/ids';
import { generateCertificatePdf } from '@/lib/pdf/certificate-pdf';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { downloadDocument, notifyDocumentReady } from '@/lib/documents';
import { formatDate } from '@/lib/utils';

export default function CertificatesPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [internRes, certRes] = await Promise.all([
      supabase.from('internships').select('*, profiles!internships_intern_id_fkey(full_name)'),
      supabase.from('certificates').select('*').order('created_at', { ascending: false }),
    ]);
    setInternships(internRes.data ?? []);
    setCertificates(certRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const issuedInternshipIds = new Set(certificates.map((c) => c.internship_id));
  const eligible = internships.filter((i) => !issuedInternshipIds.has(i.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generateFor(internshipIds: string[]) {
    setGenerating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('certificates').select('*', { count: 'exact', head: true });
    let seq = (count ?? 0) + 1;
    let succeeded = 0;

    for (const id of internshipIds) {
      const internship = internships.find((i) => i.id === id);
      if (!internship) continue;

      const certificateId = generateCertificateId(seq++);
      const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in'}/certificate/verify?id=${certificateId}`;
      const durationText = `${new Date(internship.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(internship.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (${internship.duration_months} months)`;

      try {
        const pdfBlob = await generateCertificatePdf({
          certificateId,
          internName: internship.profiles?.full_name ?? 'Intern',
          roleTitle: internship.role_title,
          department: internship.department,
          durationText,
          skills: internship.skills ?? [],
          issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          verificationUrl,
        });

        const path = `${certificateId}.pdf`;
        const { error: uploadError } = await supabase.storage.from('certificates').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: certRow, error: insertError } = await supabase.from('certificates').insert({
          certificate_id: certificateId,
          internship_id: internship.id,
          intern_name: internship.profiles?.full_name ?? 'Intern',
          role_title: internship.role_title,
          department: internship.department,
          duration_text: durationText,
          skills: internship.skills ?? [],
          completion_date: internship.end_date,
          pdf_path: path,
          qr_verification_url: verificationUrl,
          generated_by: user?.id,
        }).select().single();
        if (insertError) throw new Error(insertError.message);

        if (certRow) await notifyDocumentReady('certificate', internship.id, certRow.id);
        succeeded++;
      } catch (err: any) {
        toast.error(`Failed for ${internship.profiles?.full_name}: ${err.message}`);
      }
    }

    if (succeeded > 0) toast.success(`Generated ${succeeded} certificate(s)`);
    setSelected(new Set());
    setGenerating(false);
    load();
  }

  async function regenerate(cert: any) {
    setRegeneratingId(cert.id);
    try {
      const supabase = createClient();
      const pdfBlob = await generateCertificatePdf({
        certificateId: cert.certificate_id,
        internName: cert.intern_name,
        roleTitle: cert.role_title,
        department: cert.department,
        durationText: cert.duration_text,
        skills: cert.skills ?? [],
        issueDate: formatDate(cert.issue_date),
        verificationUrl: cert.qr_verification_url,
      });
      const path = cert.pdf_path ?? `${cert.certificate_id}.pdf`;
      const { error: uploadError } = await supabase.storage.from('certificates').upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
      if (!cert.pdf_path) await supabase.from('certificates').update({ pdf_path: path }).eq('id', cert.id);
      await notifyDocumentReady('certificate', cert.internship_id, cert.id);
      toast.success('Certificate file regenerated');
    } catch (err: any) {
      toast.error(err.message ?? 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Certificate Generator</h1>
          <p className="text-sm text-ink-500">Generate print-ready, QR-verifiable completion certificates.</p>
        </div>
        {selected.size > 0 && (
          <Button onClick={() => generateFor([...selected])} disabled={generating}>
            <Award size={16} /> Bulk Generate ({selected.size})
          </Button>
        )}
      </div>

      {loading ? (
        <PageSkeleton rows={4} />
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Eligible Interns</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {eligible.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                  <button onClick={() => toggle(i.id)} className="flex items-center gap-3">
                    {selected.has(i.id) ? <CheckSquare size={18} className="text-brand-600" /> : <Square size={18} className="text-ink-300" />}
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                      <p className="text-xs text-ink-400">{i.role_title} · {i.department}</p>
                    </div>
                  </button>
                  <Button size="sm" variant="outline" onClick={() => generateFor([i.id])} disabled={generating}>
                    Generate
                  </Button>
                </div>
              ))}
              {eligible.length === 0 && <p className="text-sm text-ink-400">No interns pending certificate generation.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Issued Certificates</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Certificate ID</th>
                    <th className="px-5 py-3 font-medium">Intern</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Issued</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => (
                    <tr key={c.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{c.certificate_id}</td>
                      <td className="px-5 py-3 font-medium text-ink-900">{c.intern_name}</td>
                      <td className="px-5 py-3 text-ink-600">{c.role_title}</td>
                      <td className="px-5 py-3 text-ink-400">{formatDate(c.issue_date)}</td>
                      <td className="px-5 py-3"><Badge tone="brand">{c.status}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => downloadDocument('certificate', c.id)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                            <Download size={13} /> PDF
                          </button>
                          <button onClick={() => regenerate(c)} disabled={regeneratingId === c.id} className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-ink-600">
                            <RotateCw size={12} className={regeneratingId === c.id ? 'animate-spin' : ''} /> {regeneratingId === c.id ? 'Regenerating…' : 'Regenerate'}
                          </button>
                          <a href={`/certificate/verify?id=${c.certificate_id}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-ink-400 hover:text-ink-600">
                            Verify page
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {certificates.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No certificates issued yet.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
