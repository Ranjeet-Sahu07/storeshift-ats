'use client';

export function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const widthPct = 30 + (s.value / max) * 70;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-ink-500">{s.label}</span>
            <div className="h-8 flex-1 rounded-lg bg-ink-50">
              <div
                className="flex h-8 items-center justify-end rounded-lg px-3 text-xs font-semibold text-white transition-all"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, #1F8A38, #7BC043)`,
                  opacity: 1 - i * 0.08,
                }}
              >
                {s.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
