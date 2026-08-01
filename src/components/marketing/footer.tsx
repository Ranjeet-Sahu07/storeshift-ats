import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-ink-50 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
                <ShoppingBag size={18} strokeWidth={2.5} />
              </span>
              <span className="font-display text-lg font-bold text-ink-900">
                Store<span className="text-brand-500">Shift</span>
              </span>
            </Link>
            <p className="mt-2 max-w-xs text-sm text-ink-400">Shift Your Store. Grow Your Business.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Careers</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li><a href="#positions">Open Positions</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
                <li><a href="#faq">FAQs</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li><Link href="/login">Login</Link></li>
                <li><Link href="/certificate/verify">Verify Certificate</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li><a href="https://storeshift.in">storeshift.in</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-50 pt-6 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} StoreShift. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
