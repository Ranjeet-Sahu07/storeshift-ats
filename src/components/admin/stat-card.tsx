import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'amber' | 'coral' | 'ink';
}) {
  const toneClasses = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-500/10 text-amber-500',
    coral: 'bg-coral-500/10 text-coral-500',
    ink: 'bg-ink-50 text-ink-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-ink-50 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-400">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneClasses)}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink-900">{value}</p>
      {delta && <p className="mt-1 text-xs text-brand-600">{delta}</p>}
    </div>
  );
}
