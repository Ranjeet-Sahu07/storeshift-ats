import type { UserRole } from '@/types';

/**
 * Client-side permission matrix mirrored from supabase/seed.sql
 * (role_permissions table). This copy powers UI decisions like hiding
 * nav items; the database RLS policies remain the actual security
 * boundary — never trust this file alone for access control.
 */
export const PERMISSIONS: Record<UserRole, string[]> = {
  founder: ['*'],
  super_admin: ['*'],
  hr_manager: ['applications.manage', 'interns.manage', 'offers.generate', 'reports.view', 'links.generate'],
  recruiter: ['applications.review', 'links.generate', 'interviews.schedule'],
  mentor: ['tasks.assign', 'performance.review', 'attendance.mark', 'messages.send'],
  technical_interviewer: ['interviews.conduct', 'applications.view'],
  certificate_manager: ['certificates.generate', 'lor.generate', 'offers.generate'],
  intern: ['tasks.view_own', 'attendance.view_own', 'documents.view_own'],
  applicant: ['application.view_own'],
};

export function can(role: UserRole | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export const NAV_PERMISSIONS: Record<string, string> = {
  applications: 'applications.review',
  interviews: 'interviews.schedule',
  interns: 'interns.manage',
  tasks: 'tasks.assign',
  certificates: 'certificates.generate',
  'offer-letters': 'offers.generate',
  lor: 'lor.generate',
  reports: 'reports.view',
  roles: 'roles.manage',
  links: 'links.generate',
  settings: 'settings.manage',
};
