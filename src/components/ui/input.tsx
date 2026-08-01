import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-xl border border-ink-100 bg-white px-3.5 text-sm text-ink-900',
          'placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error && 'border-coral-500 focus:ring-coral-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-coral-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[96px] rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-900',
        'placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        error && 'border-coral-500 focus:ring-coral-500',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-coral-500">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }
>(({ className, error, children, ...props }, ref) => (
  <div className="w-full">
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-ink-100 bg-white px-3.5 text-sm text-ink-900',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        error && 'border-coral-500 focus:ring-coral-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-coral-500">{error}</p>}
  </div>
));
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-ink-900', className)} {...props} />;
}
