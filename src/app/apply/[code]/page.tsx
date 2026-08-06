import { notFound } from 'next/navigation';
import { AlertTriangle, ShieldCheck, Clock, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ApplicationForm } from '@/components/forms/application-form';
import { Logo } from '@/components/ui/logo';
import Link from 'next/link';

export default async function ApplyPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: link } = await supabase
    .from('application_links')
    .select('*')
    .eq('code', params.code)
    .single();

  if (!link) notFound();

  const expired = link.expires_at && new Date(link.expires_at) < new Date();
  const inactive = !link.is_active || expired;

  return (
    <main className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-ink-50 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/"><Logo height={26} /></Link>
          <span className="hidden font-mono text-xs text-ink-400 sm:inline">Ref: {link.code}</span>
        </div>
      </header>

      {/* Company banner — sets a formal, "big company application" tone */}
      <div className="relative overflow-hidden bg-ink-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #28A745 0, transparent 40%), radial-gradient(circle at 90% 80%, #7BC043 0, transparent 35%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-300">
            <Building2 size={13} /> {link.department ?? 'StoreShift'} · Internship Program
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
            Application for {link.role_title}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-100/70">
            Please complete every section accurately. Your application is reviewed by our hiring
            team, and you'll receive a confirmation email once it's submitted.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-100/60">
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-400" /> Confidential & secure</span>
            <span className="flex items-center gap-1.5"><Clock size={13} className="text-brand-400" /> Takes about 8 minutes</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
        {inactive ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-10 text-center">
            <AlertTriangle className="text-amber-500" size={32} />
            <p className="font-display font-semibold text-ink-900">This application link is no longer active</p>
            <p className="text-sm text-ink-500">Please contact StoreShift HR for a new invite link.</p>
          </div>
        ) : (
          <ApplicationForm link={link} />
        )}
      </div>
    </main>
  );
}
