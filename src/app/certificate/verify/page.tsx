import Link from 'next/link';
import { ShoppingBag, ShieldCheck, ShieldX, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id?.trim();
  let certificate: any = null;
  let searched = false;

  if (id) {
    searched = true;
    const supabase = createClient();
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_id', id)
      .eq('status', 'issued')
      .maybeSingle();
    certificate = data;
  }

  return (
    <main className="min-h-screen bg-mist">
      <header className="border-b border-ink-50 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
              <ShoppingBag size={18} strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold text-ink-900">
              Store<span className="text-brand-500">Shift</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="verified-chip">Certificate Verification</span>
          <h1 className="mt-4 font-display text-3xl font-bold text-ink-900">Verify a StoreShift certificate</h1>
          <p className="mt-2 text-ink-500">Enter a certificate ID or scan the QR code on the certificate.</p>
        </div>

        <form className="mt-8 flex gap-2" action="/certificate/verify">
          <Input name="id" defaultValue={id} placeholder="SS-INT-2026-0001" className="font-mono" />
          <Button type="submit">
            <Search size={16} /> Verify
          </Button>
        </form>

        {searched && (
          <div className="mt-8">
            {certificate ? (
              <div className="rounded-2xl border-2 border-brand-500/30 bg-white p-6 shadow-glass">
                <div className="flex items-center gap-2 text-brand-700">
                  <ShieldCheck size={22} />
                  <p className="font-display font-semibold">Verified Certificate</p>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <Row label="Intern Name" value={certificate.intern_name} />
                  <Row label="Role" value={certificate.role_title} />
                  <Row label="Department" value={certificate.department} />
                  <Row label="Duration" value={certificate.duration_text} />
                  <Row label="Skills" value={(certificate.skills ?? []).join(', ')} />
                  <Row label="Issue Date" value={formatDate(certificate.issue_date)} />
                  <Row label="Certificate ID" value={certificate.certificate_id} mono />
                </dl>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-coral-500/30 bg-coral-500/5 p-10 text-center">
                <ShieldX className="text-coral-500" size={32} />
                <p className="font-display font-semibold text-ink-900">No matching certificate found</p>
                <p className="text-sm text-ink-500">Double-check the certificate ID and try again.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink-50 pb-2">
      <dt className="text-ink-400">{label}</dt>
      <dd className={mono ? 'font-mono font-semibold text-ink-900' : 'font-medium text-ink-900'}>{value}</dd>
    </div>
  );
}
