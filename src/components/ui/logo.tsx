import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Official StoreShift brand mark — the real logo asset (public/logo-mark.png),
 * not a redrawn approximation. Use for compact spaces: nav bars, sidebars,
 * favicons, avatars.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo-mark.png"
      alt="StoreShift"
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      priority
    />
  );
}

/**
 * The logo's wordmark is dark ink text (by design — matches the brand
 * sheet), which disappears against dark backgrounds. Use this wherever the
 * logo sits on a dark surface (this certificate verify hero, dark modals,
 * etc.) — it wraps the full lockup in the white pill the brand sheet itself
 * shows as the "for dark backgrounds" variant, instead of placing the
 * dark-on-dark logo directly on the surface.
 */
export function LogoOnDark({ className, height = 30 }: { className?: string; height?: number }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-white px-4 py-2 shadow-sm', className)}>
      <Logo height={height} />
    </span>
  );
}

/**
 * Full brand lockup — the real logo asset (public/logo-full.png) with the
 * "StoreShift" wordmark baked in. Use wherever there's enough horizontal
 * room: navbars, headers, login screen, footer.
 */
export function Logo({
  className,
  height = 32,
  showTagline = false,
}: {
  className?: string;
  height?: number;
  showTagline?: boolean;
}) {
  // Source asset is 840x270 (~3.11:1)
  const width = Math.round(height * (840 / 270));
  return (
    <span className={cn('flex items-center', className)}>
      <Image
        src="/logo-full.png"
        alt="StoreShift — Shift Your Store. Grow Your Business."
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showTagline && (
        <span className="sr-only">Shift Your Store. Grow Your Business.</span>
      )}
    </span>
  );
}
