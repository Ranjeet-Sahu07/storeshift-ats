'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { can } from '@/lib/rbac';
import { Logo } from '@/components/ui/logo';
import { ADMIN_NAV } from '@/lib/nav';
import type { UserRole } from '@/types';

export function NavLinks({
  items,
  onNavigate,
}: {
  items: Array<{
    href: string;
    label: string;
    icon: typeof ADMIN_NAV[number]['icon'];
    perm?: string | null;
  }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  
  return (
    <>
    {items.map((item) => {
      const active =
      pathname === item.href ||
      (item.href !== '/admin' &&
      item.href !== '/dashboard' &&
      pathname?.startsWith(item.href));
      
      return (
        <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          active
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-600 hover:bg-ink-50'
        )}
        >
        <item.icon size={18} />
        {item.label}
        </Link>
      );
    })}
    </>
  );
}

export function AdminSidebar({ role }: { role: UserRole }) {
  const items = ADMIN_NAV.filter(
    (item) => !item.perm || can(role, item.perm)
  );
  
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-ink-50 bg-white lg:flex">
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-ink-50 px-5">
    <Logo height={26} />
    </div>
    
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
    <NavLinks items={items} />
    </nav>
    </aside>
  );
}
