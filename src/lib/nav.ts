import {
  LayoutDashboard, FileSearch, CalendarCheck, GraduationCap, ShieldCheck,
  ListChecks, Award, FileText, Mail, BarChart3, Link2, Settings,
  Github, BookOpen, MessageSquare, FileStack, ClipboardCheck, Send,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; perm: string | null };

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { href: '/admin/applications', label: 'Applications', icon: FileSearch, perm: 'applications.review' },
  { href: '/admin/links', label: 'Application Links', icon: Link2, perm: 'links.generate' },
  { href: '/admin/interviews', label: 'Interviews', icon: CalendarCheck, perm: 'interviews.schedule' },
  { href: '/admin/interns', label: 'Intern Management', icon: GraduationCap, perm: 'interns.manage' },
  { href: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck, perm: 'attendance.mark' },
  { href: '/admin/roles', label: 'Role Management', icon: ShieldCheck, perm: 'roles.manage' },
  { href: '/admin/tasks', label: 'Task Manager', icon: ListChecks, perm: 'tasks.assign' },
  { href: '/admin/certificates', label: 'Certificates', icon: Award, perm: 'certificates.generate' },
  { href: '/admin/offer-letters', label: 'Offer Letters', icon: FileText, perm: 'offers.generate' },
  { href: '/admin/lor', label: 'LOR Generator', icon: Mail, perm: 'lor.generate' },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3, perm: 'reports.view' },
  { href: '/admin/emails', label: 'Email Center', icon: Send, perm: 'emails.send' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
];

export const INTERN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ListChecks, perm: null },
  { href: '/dashboard/github', label: 'GitHub', icon: Github, perm: null },
  { href: '/dashboard/learning', label: 'Learning', icon: BookOpen, perm: null },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, perm: null },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, perm: null },
  { href: '/dashboard/documents', label: 'Documents', icon: FileStack, perm: null },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, perm: null },
];
