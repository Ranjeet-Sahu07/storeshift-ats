import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'brand' | 'amber' | 'coral' | 'ink';

const toneClasses: Record<Tone, string> = {
  default: 'bg-ink-50 text-ink-600',
  brand: 'bg-brand-50 text-brand-700 border border-brand-200',
  amber: 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
  coral: 'bg-coral-500/10 text-coral-500 border border-coral-500/30',
  ink: 'bg-ink-900 text-white',
};

export function Badge({
  className,
  tone = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
