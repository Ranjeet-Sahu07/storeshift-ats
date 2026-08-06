import Link from 'next/link';
import { LogoOnDark } from '@/components/ui/logo';

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'radial-gradient(circle at 10% 10%, #28A745 0, transparent 40%), radial-gradient(circle at 90% 90%, #7BC043 0, transparent 35%)' }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div>
            <Link href="/"><LogoOnDark height={26} /></Link>
            <p className="mt-3 max-w-xs text-sm text-ink-100/60">Shift Your Store. Grow Your Business.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Careers</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-100/70">
                <li><a href="#positions" className="hover:text-white">Open Positions</a></li>
                <li><a href="#roadmap" className="hover:text-white">Roadmap</a></li>
                <li><a href="#faq" className="hover:text-white">FAQs</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-100/70">
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
                <li><Link href="/certificate/verify" className="hover:text-white">Verify Certificate</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-100/70">
                <li><a href="https://storeshift.in" className="hover:text-white">storeshift.in</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-ink-100/50">
          © {new Date().getFullYear()} StoreShift. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
