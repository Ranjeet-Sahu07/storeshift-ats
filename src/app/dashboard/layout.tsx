import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { InternSidebar } from '@/components/intern/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-mist">
      <InternSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar profile={profile} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
