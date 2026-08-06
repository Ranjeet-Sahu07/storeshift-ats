import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stepper({
  steps,
  current,
  icons,
}: {
  steps: string[];
  current: number;
  icons?: LucideIcon[];
}) {
  const pct = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div>
      {/* Mobile: compact progress bar + current step label */}
      <div className="mb-1 flex items-center justify-between sm:hidden">
        <span className="text-xs font-semibold text-brand-700">Step {current + 1} of {steps.length}</span>
        <span className="text-xs text-ink-400">{steps[current]}</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-50 sm:hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Desktop: full stepper with icons */}
      <div className="hidden items-center justify-between sm:flex">
        {steps.map((label, i) => {
          const Icon = icons?.[i];
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    i < current && 'bg-brand-600 text-white',
                    i === current && 'bg-brand-600 text-white ring-4 ring-brand-100',
                    i > current && 'bg-ink-50 text-ink-400'
                  )}
                >
                  {i < current ? <Check size={15} /> : Icon ? <Icon size={15} /> : i + 1}
                </div>
                <span className={cn('text-[11px] font-medium', i === current ? 'text-ink-900' : 'text-ink-400')}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-2 h-0.5 flex-1 rounded-full', i < current ? 'bg-brand-600' : 'bg-ink-50')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
