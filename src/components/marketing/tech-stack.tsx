const STACK = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Supabase',
  'PostgreSQL', 'GitHub', 'Docker', 'AI Tooling', 'Cloud Deployment',
];

export function TechStack() {
  return (
    <section className="bg-ink-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-400">
          What you'll work with
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STACK.map((t) => (
            <div
              key={t}
              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-white/90 transition-colors hover:border-brand-500/40 hover:bg-white/10"
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
