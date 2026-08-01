'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  { q: 'Who can apply?', a: 'Students and recent graduates who received an application link from our team, or applied through an open posting on this site.' },
  { q: 'Is the internship paid?', a: 'Stipend details are shared during the interview stage and vary by role and duration.' },
  { q: 'How long is the internship?', a: 'Most internships run 3–4 months, with duration confirmed by the admin team at the offer stage.' },
  { q: 'Do I get a certificate?', a: 'Yes — every intern who completes the program receives a QR-verifiable certificate and, on request, a letter of recommendation.' },
  { q: 'Can I apply without an invite link?', a: 'Applications are opened periodically for specific roles — check the Open Positions section above for currently active links.' },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="verified-chip">FAQs</span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Questions, answered</h2>
      </div>
      <div className="mt-10 space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="overflow-hidden rounded-xl border border-ink-50 bg-white">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-ink-900">{f.q}</span>
              <ChevronDown size={18} className={cn('text-ink-400 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <div className="px-5 pb-4 text-sm text-ink-500">{f.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
