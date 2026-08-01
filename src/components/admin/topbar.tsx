'use client';

import { Bell, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/types';
import type { Profile } from '@/types';

export function AdminTopbar({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-ink-50 bg-white px-4 sm:px-6">
      <div className="hidden items-center gap-2 rounded-xl bg-mist px-3.5 py-2 text-sm text-ink-400 sm:flex sm:w-80">
        <Search size={16} />
        <span>Search applicants, jobs, tasks…</span>
        <kbd className="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-medium shadow-sm">⌘K</kbd>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-xl p-2 text-ink-500 hover:bg-mist" aria-label="Notifications">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral-500" />
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-mist">
          <Avatar name={profile.full_name} src={profile.avatar_url} />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-ink-900">{profile.full_name}</p>
            <p className="text-xs text-ink-400">{ROLE_LABELS[profile.role]}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
