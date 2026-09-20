import Link from 'next/link';
import { ShieldCheck, ShieldX, Search, Award, Calendar, Building2, Sparkles, QrCode } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogoOnDark, LogoMark } from '@/components/ui/logo';
import { Footer } from '@/components/marketing/footer';
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
    <main className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-900 to-mist">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/"><LogoOnDark height={22} /></Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-300">
            <ShieldCheck size={14} /> Official Verification Portal
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold text-white sm:text-4xl">Verify a StoreShift certificate</h1>
          <p className="mt-3 text-ink-100/70">
            Every certificate we issue carries a unique ID and QR code. Enter it below, or scan the
            code printed on the certificate, to confirm it's authentic.
          </p>
        </div>

        <form className="mx-auto mt-8 flex max-w-md gap-2" action="/certificate/verify">
          <Input
            name="id"
            defaultValue={id}
            placeholder="e.g. SS-INT-2026-0001"
            className="h-12 rounded-xl border-0 bg-white font-mono text-sm shadow-lg"
          />
          <Button type="submit" size="lg">
            <Search size={16} /> Verify
          </Button>
        </form>

        {!searched && (
          <div className="mx-auto mt-14 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <QrCode className="text-brand-400" size={32} />
            <p className="text-sm text-ink-100/60">
              Certificate IDs look like <span className="font-mono text-white/80">SS-INT-2026-0001</span> and
              are printed on every StoreShift internship certificate, next to the QR code.
            </p>
          </div>
        )}

        {searched && (
          <div className="mt-10 animate-fade-up">
            {certificate ? (
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center gap-2 bg-brand-600 px-6 py-3 text-white">
                  <ShieldCheck size={18} />
                  <p className="text-sm font-semibold">This certificate is genuine and currently valid</p>
                </div>

                {/* Certificate-styled preview — mirrors the real issued PDF */}
                <div className="relative m-4 overflow-hidden rounded-xl border-2 border-amber-400/40 p-6 sm:p-8">
                  <div className="pointer-events-none absolute -left-6 -top-6 h-16 w-16 rotate-45 bg-ink-900" />
                  <div className="pointer-events-none absolute -bottom-6 -right-6 h-16 w-16 rotate-45 bg-ink-900" />
                  <div className="relative flex items-center justify-between border-b border-dashed border-amber-300 pb-4">
                    <LogoMark size={40} />
                    <span className="rounded-full bg-ink-900 px-3 py-1 text-[10px] font-semibold text-amber-300">VERIFIED</span>
                  </div>

                  <p className="mt-5 text-center font-display text-2xl font-bold text-ink-900">CERTIFICATE</p>
                  <p className="text-center text-xs uppercase tracking-[0.3em] text-amber-600">◆ of Internship ◆</p>
                  <p className="mt-4 text-center font-display text-2xl font-bold italic text-brand-600">{certificate.intern_name}</p>
                  <p className="mt-2 text-center text-sm text-ink-500">
                    successfully completed the internship as a <strong>{certificate.role_title}</strong> in the{' '}
                    <strong>{certificate.department}</strong> department
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-3 border-t border-dashed border-amber-300 pt-5 sm:grid-cols-3">
                    <DetailBlock icon={Calendar} label="Duration" value={certificate.duration_text} />
                    <DetailBlock icon={Building2} label="Issue Date" value={formatDate(certificate.issue_date)} />
                    <DetailBlock icon={Award} label="Certificate ID" value={certificate.certificate_id} mono />
                  </div>

                  {certificate.skills?.length > 0 && (
                    <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                      {certificate.skills.map((s: string) => (
                        <span key={s} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 bg-mist px-6 py-4 text-xs text-ink-400">
                  <Sparkles size={13} /> Verified against StoreShift's official records
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-coral-500/30 bg-white p-10 text-center shadow-xl">
                <ShieldX className="text-coral-500" size={36} />
                <p className="font-display text-lg font-semibold text-ink-900">No matching certificate found</p>
                <p className="text-sm text-ink-500">
                  We couldn't verify "<span className="font-mono">{id}</span>". Double-check the certificate ID
                  and try again, or contact StoreShift HR if you believe this is an error.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

function DetailBlock({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-mist/60 py-3 text-center">
      <Icon size={15} className="text-brand-600" />
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={mono ? 'font-mono text-xs font-semibold text-ink-900' : 'text-sm font-semibold text-ink-900'}>{value}</p>
    </div>
  );
}
