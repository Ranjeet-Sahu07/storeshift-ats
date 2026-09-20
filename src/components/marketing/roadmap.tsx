import { BookOpen, Users, Rocket, Award } from 'lucide-react';

const MONTHS = [
  { n: '01', title: 'Learning', icon: BookOpen, items: ['Git & GitHub workflow', 'Codebase onboarding', 'Tooling setup'] },
  { n: '02', title: 'Live Project', icon: Users, items: ['Real feature ownership', 'Team collaboration', 'First code reviews'] },
  { n: '03', title: 'Development', icon: Rocket, items: ['Feature development', 'Testing & QA', 'Staging deployment'] },
  { n: '04', title: 'Wrap-up', icon: Award, items: ['Final project demo', 'Performance review', 'Certificate & LOR'] },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="verified-chip">The Program</span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Your four months, mapped out</h2>
        <p className="mt-3 text-ink-600">
          A structured path from onboarding to a portfolio-ready project — because a real
          internship has a real sequence.
        </p>
      </div>

      <div className="relative mt-14 grid gap-6 lg:grid-cols-4">
        <div className="absolute left-0 right-0 top-6 hidden h-px bg-ink-100 lg:block" />
        {MONTHS.map((m, i) => (
          <div key={m.n} className="relative">
            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display font-bold text-white shadow-lg shadow-brand-600/20">
              {m.n}
            </div>
            <div className="rounded-2xl border border-ink-50 bg-white p-5 shadow-card h-full">
              <m.icon className="mb-3 text-brand-600" size={22} />
              <h3 className="font-display font-semibold text-ink-900">Month {i + 1}: {m.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                {m.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
