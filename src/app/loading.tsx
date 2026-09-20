import { LogoMark } from '@/components/ui/logo';

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mist">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
        <LogoMark size={30} />
      </div>
      <p className="text-sm font-medium text-ink-400">Loading…</p>
    </div>
  );
}
