import { GraduationCap, Users2, TrendingUp, ShieldCheck, Laptop, Award } from 'lucide-react';

const BENEFITS = [
  { icon: GraduationCap, title: 'Real mentorship', desc: 'Paired with a mentor who reviews your code and your growth.' },
  { icon: Users2, title: 'Team ownership', desc: 'You ship features that go live — not throwaway assignments.' },
  { icon: TrendingUp, title: 'Career growth', desc: 'Top interns get pre-placement offers for full-time roles.' },
  { icon: ShieldCheck, title: 'Structured program', desc: 'Clear roadmap, tasks, and performance reviews every month.' },
  { icon: Laptop, title: 'Modern stack', desc: 'Work with the same tools our full-time engineers use daily.' },
  { icon: Award, title: 'Verified certificate', desc: 'A QR-verifiable certificate and letter of recommendation.' },
];

export function Benefits() {
  return (
    <section id="benefits" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="verified-chip">Why Join StoreShift</span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Built for interns who want to ship</h2>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-2xl border border-ink-50 bg-white p-6 shadow-card transition-shadow hover:shadow-glass">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-lime text-white">
              <b.icon size={20} />
            </div>
            <h3 className="font-display font-semibold text-ink-900">{b.title}</h3>
            <p className="mt-1.5 text-sm text-ink-500">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
