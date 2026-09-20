import { FileEdit, Search, ClipboardCheck, Video, Mail, LayoutDashboard, Award } from 'lucide-react';

const STEPS = [
  { icon: FileEdit, title: 'Apply', desc: 'Submit your application through your unique invite link.' },
  { icon: Search, title: 'Resume Review', desc: 'Our team reviews your profile against the role.' },
  { icon: ClipboardCheck, title: 'Assignment', desc: 'A short task to see how you think and build.' },
  { icon: Video, title: 'Interview', desc: 'A conversation with your future mentor and team.' },
  { icon: Mail, title: 'Selection', desc: 'Admin reviews and makes the final call.' },
  { icon: LayoutDashboard, title: 'Offer Letter', desc: 'Get your official StoreShift account and access.' },
  { icon: Award, title: 'Certificate', desc: 'Verified certificate and LOR at completion.' },
];

export function HiringProcess() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="verified-chip">How It Works</span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Hiring process, end to end</h2>
        <p className="mt-3 text-ink-600">
          Every step is reviewed by a real person on our team — nothing here moves without admin sign-off.
        </p>
      </div>

      <ol className="mx-auto mt-12 max-w-xl space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-4 rounded-2xl border border-ink-50 bg-white p-4 shadow-card">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <s.icon size={20} />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-semibold text-ink-900">
                {i + 1}. {s.title}
              </p>
              <p className="text-sm text-ink-500">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
