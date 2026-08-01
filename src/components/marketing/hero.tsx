import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATS = [
  { value: '250+', label: 'Applications' },
  { value: '25+', label: 'Interns' },
  { value: '5+', label: 'Live Projects' },
  { value: '95%', label: 'Completion Rate' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #28A745 0, transparent 40%), radial-gradient(circle at 85% 10%, #7BC043 0, transparent 35%)',
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <div className="animate-fade-up">
          <span className="verified-chip !bg-white/10 !border-white/10 !text-brand-300">
            <Sparkles size={14} /> Internship Program 2026 is open
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Build the future of <span className="text-brand-400">local commerce</span> with us.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-100/80">
            Join StoreShift&apos;s internship program and work on real SaaS products,
            ship code that reaches merchants across India, and grow alongside
            engineers who care about craft.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#positions">
              <Button size="lg" className="group">
                Apply Now <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </a>
            <a href="#roadmap">
              <Button size="lg" variant="outline" className="!bg-white/5 !border-white/20 !text-white hover:!bg-white/10">
                View Roadmap
              </Button>
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-4 gap-4 border-t border-white/10 pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold text-white sm:text-3xl">{s.value}</dt>
                <dd className="mt-1 text-xs text-ink-100/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-fade-up [animation-delay:150ms]">
          <div className="glass !bg-white/95 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-50 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-coral-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              </div>
              <span className="text-xs font-medium text-ink-400">Intern Dashboard — Live Preview</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-mist p-4">
                <p className="text-xs text-ink-400">Internship Progress</p>
                <p className="mt-1 font-display text-2xl font-bold text-ink-900">68%</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100">
                  <div className="h-1.5 w-[68%] rounded-full bg-brand-500" />
                </div>
              </div>
              <div className="rounded-xl bg-mist p-4">
                <p className="text-xs text-ink-400">Attendance</p>
                <p className="mt-1 font-display text-2xl font-bold text-ink-900">92%</p>
                <p className="mt-2 text-xs text-brand-600">↑ 8% from last month</p>
              </div>
              <div className="col-span-2 rounded-xl bg-mist p-4">
                <p className="text-xs text-ink-400">Task Board</p>
                <div className="mt-2 flex gap-2">
                  {['To Do 5', 'In Progress 3', 'Done 8'].map((t) => (
                    <span key={t} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-ink-600 shadow-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-xl bg-white p-3 shadow-xl sm:block">
            <p className="verified-chip">✓ Certificate Verified</p>
          </div>
        </div>
      </div>
    </section>
  );
}
