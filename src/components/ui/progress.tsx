import { cn } from '@/lib/utils';

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-50', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn('h-9 w-9 rounded-full object-cover', className)} />;
  }
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white',
        className
      )}
    >
      {initials}
    </div>
  );
}
