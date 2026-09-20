'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { GlobalSearch } from '@/components/admin/global-search';
import { MobileNavDrawer } from '@/components/admin/mobile-drawer';
import { ROLE_LABELS } from '@/types';
import type { Profile } from '@/types';

export function AdminTopbar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setNotifications(data ?? []));
  }, [profile.id]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Redirect to the public homepage (not /login) after logout.
    router.push('/');
    router.refresh();
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', profile.id).is('read_at', null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-50 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNavDrawer role={profile.role} />
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((o) => !o); setMenuOpen(false); }}
            className="relative rounded-xl p-2 text-ink-500 hover:bg-mist"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-coral-500" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-ink-50 bg-white shadow-glass">
              <div className="flex items-center justify-between border-b border-ink-50 px-4 py-2.5">
                <p className="text-sm font-semibold text-ink-900">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-brand-600">Mark all read</button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 && <p className="px-4 py-6 text-center text-xs text-ink-400">No notifications yet.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className="border-b border-ink-50 px-4 py-3 last:border-0">
                    <p className="text-sm font-medium text-ink-900">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-mist"
          >
            <Avatar name={profile.full_name} src={profile.avatar_url} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-ink-900">{profile.full_name}</p>
              <p className="text-xs text-ink-400">{ROLE_LABELS[profile.role]}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-ink-50 bg-white shadow-glass">
              <div className="border-b border-ink-50 px-4 py-3">
                <p className="text-sm font-medium text-ink-900">{profile.full_name}</p>
                <p className="truncate text-xs text-ink-400">{profile.official_email ?? profile.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-coral-500 hover:bg-coral-500/5"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
