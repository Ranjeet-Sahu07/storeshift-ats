import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-between overflow-x-auto pb-2">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                i < current && 'bg-brand-600 text-white',
                i === current && 'bg-brand-600 text-white ring-4 ring-brand-100',
                i > current && 'bg-ink-50 text-ink-400'
              )}
            >
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn('hidden text-[11px] font-medium sm:block', i === current ? 'text-ink-900' : 'text-ink-400')}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('mx-2 h-0.5 flex-1 rounded-full', i < current ? 'bg-brand-600' : 'bg-ink-50')} />
          )}
        </div>
      ))}
    </div>
  );
}
