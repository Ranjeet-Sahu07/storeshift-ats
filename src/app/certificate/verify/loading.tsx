import { LogoMark } from '@/components/ui/logo';

export default function VerifyLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-900">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-brand-500" />
        <LogoMark size={30} />
      </div>
      <p className="text-sm font-medium text-ink-100/60">Loading…</p>
    </div>
  );
}
