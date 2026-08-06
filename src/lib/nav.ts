import {
  LayoutDashboard, FileSearch, CalendarCheck, GraduationCap, ShieldCheck,
  ListChecks, Award, FileText, Mail, BarChart3, Link2, Settings,
  Github, BookOpen, MessageSquare, FileStack, ClipboardCheck,
} from 'lucide-react';

export const ADMIN_NAV = [
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
  { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
];

export const INTERN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/dashboard/github', label: 'GitHub', icon: Github },
  { href: '/dashboard/learning', label: 'Learning', icon: BookOpen },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/documents', label: 'Documents', icon: FileStack },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];
