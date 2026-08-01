const VALUES = [
  { label: 'Innovate', desc: 'Solve real problems' },
  { label: 'Collaborate', desc: 'Work as one team' },
  { label: 'Grow', desc: 'Build your future' },
  { label: 'Impact', desc: 'Empower businesses' },
];

export function LifeAt() {
  return (
    <section id="life" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="verified-chip">Life at StoreShift</span>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
            Code, collaborate, grow.
          </h2>
          <p className="mt-4 text-ink-600">
            Our interns sit alongside full-time engineers, join the same standups,
            and get their work reviewed with the same bar we hold ourselves to.
            No fetch-coffee internships here — you&apos;ll be in pull requests from week one.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div key={v.label} className="rounded-xl border border-ink-50 bg-white p-4 shadow-card">
                <p className="font-display font-semibold text-ink-900">{v.label}</p>
                <p className="text-xs text-ink-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-600 to-brand-700 p-8">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 0, transparent 45%)' }} />
          <div className="relative flex h-full flex-col justify-end gap-3">
            <div className="glass !bg-white/10 !border-white/10 rounded-xl p-4 text-white">
              <p className="text-sm font-medium">&quot;Build. Innovate. Grow.&quot;</p>
              <p className="mt-1 text-xs text-white/60">— StoreShift engineering wall</p>
            </div>
            <div className="flex gap-3">
              <div className="glass !bg-white/10 !border-white/10 flex-1 rounded-xl p-3 text-center text-white">
                <p className="font-display text-xl font-bold">10+</p>
                <p className="text-[11px] text-white/60">Mentors</p>
              </div>
              <div className="glass !bg-white/10 !border-white/10 flex-1 rounded-xl p-3 text-center text-white">
                <p className="font-display text-xl font-bold">5+</p>
                <p className="text-[11px] text-white/60">Live Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
