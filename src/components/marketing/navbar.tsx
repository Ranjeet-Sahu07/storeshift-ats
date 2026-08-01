'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '#positions', label: 'Open Positions' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#life', label: 'Life at StoreShift' },
  { href: '#faq', label: 'FAQs' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-50/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
            <ShoppingBag size={18} strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold text-ink-900">
            Store<span className="text-brand-500">Shift</span>
            <span className="ml-1 text-xs font-medium text-ink-400">Careers</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-600 hover:text-brand-600 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="outline" size="sm">Login</Button>
          </Link>
          <a href="#positions">
            <Button size="sm">Apply Now</Button>
          </a>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-50 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-ink-600">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">Login</Button>
              </Link>
              <a href="#positions" className="flex-1">
                <Button size="sm" className="w-full">Apply Now</Button>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
