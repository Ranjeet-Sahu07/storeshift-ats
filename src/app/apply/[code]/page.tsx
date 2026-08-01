import { notFound } from 'next/navigation';
import { AlertTriangle, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ApplicationForm } from '@/components/forms/application-form';
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
      <header className="border-b border-ink-50 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
              <ShoppingBag size={18} strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold text-ink-900">
              Store<span className="text-brand-500">Shift</span>
            </span>
          </Link>
          <span className="font-mono text-xs text-ink-400">{link.code}</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink-900">Apply for {link.role_title}</h1>
          <p className="mt-2 text-ink-500">{link.department ?? 'StoreShift'} · Internship Program</p>
        </div>

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
