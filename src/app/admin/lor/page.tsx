'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateLorId } from '@/lib/ids';
import { generateLetterPdf } from '@/lib/pdf/letter-pdf';
import { formatDate } from '@/lib/utils';

export default function LorPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [lors, setLors] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: internList } = await supabase
      .from('internships')
      .select('*, profiles!internships_intern_id_fkey(full_name)')
      .eq('status', 'completed');
    setInternships(internList ?? []);
    const { data } = await supabase.from('letters_of_recommendation').select('*').order('issued_at', { ascending: false });
    setLors(data ?? []);
  }

  useEffect(() => { load(); }, []);

  const issuedIds = new Set(lors.map((l) => l.internship_id));
  const eligible = internships.filter((i) => !issuedIds.has(i.id));

  async function generate(internship: any) {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('letters_of_recommendation').select('*', { count: 'exact', head: true });
    const lorId = generateLorId((count ?? 0) + 1);

    const body = `This is to certify that ${internship.profiles?.full_name} completed a ${internship.duration_months}-month internship as a ${internship.role_title} in the ${internship.department} department at StoreShift. Throughout the internship, they demonstrated strong technical skills, reliability, and a collaborative attitude. We recommend them for future opportunities without reservation.`;

    const pdfBlob = generateLetterPdf({
      title: 'Letter of Recommendation',
      letterId: lorId,
      bodyLines: [`To Whom It May Concern,`, '', body],
      signatoryName: 'Ranjeet Kumar',
      signatoryTitle: 'Founder & CEO',
      issueDate: new Date().toLocaleDateString('en-IN'),
    });

    const path = `${lorId}.pdf`;
    await supabase.storage.from('lor').upload(path, pdfBlob, { upsert: true });
    await supabase.from('letters_of_recommendation').insert({
      lor_id: lorId, internship_id: internship.id, body, pdf_path: path, generated_by: user?.id,
    });

    toast.success(`LOR ${lorId} generated`);
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Letter of Recommendation Generator</h1>
        <p className="text-sm text-ink-500">Auto-filled from the intern&apos;s completed profile.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Eligible Interns (Completed)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {eligible.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                <p className="text-xs text-ink-400">{i.role_title} · {i.department}</p>
              </div>
              <Button size="sm" onClick={() => generate(i)} disabled={busy}>Generate LOR</Button>
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
              <tr><th className="px-5 py-3 font-medium">LOR ID</th><th className="px-5 py-3 font-medium">Issued</th><th className="px-5 py-3 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {lors.map((l) => (
                <tr key={l.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{l.lor_id}</td>
                  <td className="px-5 py-3 text-ink-400">{formatDate(l.issued_at)}</td>
                  <td className="px-5 py-3"><Badge tone="brand"><Mail size={11} className="mr-1" />Issued</Badge></td>
                </tr>
              ))}
              {lors.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-ink-400">No letters issued yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
