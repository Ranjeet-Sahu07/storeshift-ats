'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ListChecks, Github, BookOpen, CalendarCheck,
  MessageSquare, FileStack, Settings, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/dashboard/github', label: 'GitHub', icon: Github },
  { href: '/dashboard/learning', label: 'Learning', icon: BookOpen },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/documents', label: 'Documents', icon: FileStack },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function InternSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-50 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-ink-50 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
          <ShoppingBag size={18} strokeWidth={2.5} />
        </span>
        <span className="font-display text-base font-bold text-ink-900">
          Store<span className="text-brand-500">Shift</span>
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
