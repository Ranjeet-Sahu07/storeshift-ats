import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';
import { STAFF_ROLES } from '@/types';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) redirect('/login');
  if (!STAFF_ROLES.includes(profile.role)) redirect('/dashboard');

  return (
    <div className="flex min-h-screen bg-mist">
      <AdminSidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar profile={profile} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
