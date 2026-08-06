'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NavLinks } from '@/components/admin/sidebar';
import { Logo } from '@/components/ui/logo';
import { ADMIN_NAV, INTERN_NAV } from '@/lib/nav';
import { can } from '@/lib/rbac';
import type { UserRole } from '@/types';

export function MobileNavDrawer({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const items = isAdmin ? ADMIN_NAV.filter((item) => !item.perm || can(role, item.perm)) : INTERN_NAV;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-mist lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-50 px-5">
              <Logo height={24} />
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-900" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
