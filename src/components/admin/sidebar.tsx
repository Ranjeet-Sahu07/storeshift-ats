'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileSearch, Briefcase, CalendarCheck, ClipboardCheck,
  GraduationCap, ShieldCheck, ListChecks, Award, FileText, Mail, BarChart3,
  Bell, Link2, Settings, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { can } from '@/lib/rbac';
import type { UserRole } from '@/types';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { href: '/admin/applications', label: 'Applications', icon: FileSearch, perm: 'applications.review' },
  { href: '/admin/links', label: 'Application Links', icon: Link2, perm: 'links.generate' },
  { href: '/admin/interviews', label: 'Interviews', icon: CalendarCheck, perm: 'interviews.schedule' },
  { href: '/admin/interns', label: 'Intern Management', icon: GraduationCap, perm: 'interns.manage' },
  { href: '/admin/roles', label: 'Role Management', icon: ShieldCheck, perm: 'roles.manage' },
  { href: '/admin/tasks', label: 'Task Manager', icon: ListChecks, perm: 'tasks.assign' },
  { href: '/admin/certificates', label: 'Certificates', icon: Award, perm: 'certificates.generate' },
  { href: '/admin/offer-letters', label: 'Offer Letters', icon: FileText, perm: 'offers.generate' },
  { href: '/admin/lor', label: 'LOR Generator', icon: Mail, perm: 'lor.generate' },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3, perm: 'reports.view' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
];

export function AdminSidebar({ role }: { role: UserRole }) {
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
        {NAV.filter((item) => !item.perm || can(role, item.perm)).map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
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
