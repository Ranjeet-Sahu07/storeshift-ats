'use client';

import { Logo } from '@/components/ui/logo';
import { NavLinks } from '@/components/admin/sidebar';
import { INTERN_NAV } from '@/lib/nav';

export function InternSidebar() {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-ink-50 bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-ink-50 px-5">
        <Logo height={26} />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <NavLinks items={INTERN_NAV} />
      </nav>
    </aside>
  );
}
