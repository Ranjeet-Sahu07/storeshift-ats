'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, type UserRole } from '@/types';

const ALL_PERMISSIONS = [
  'applications.manage', 'applications.review', 'applications.view',
  'links.generate', 'interviews.schedule', 'interviews.conduct',
  'interns.manage', 'tasks.assign', 'performance.review', 'attendance.mark',
  'certificates.generate', 'offers.generate', 'lor.generate',
  'reports.view', 'roles.manage', 'settings.manage', 'messages.send',
];

export default function RolesPage() {
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [users, setUsers] = useState<any[]>([]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('role_permissions').select('*');
    const m: Record<string, Set<string>> = {};
    (data ?? []).forEach((row: any) => {
      if (!m[row.role]) m[row.role] = new Set();
      if (row.allowed) m[row.role].add(row.permission);
    });
    setMatrix(m);

    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20);
    setUsers(profiles ?? []);
  }

  useEffect(() => { load(); }, []);

  async function togglePermission(role: UserRole, permission: string) {
    const supabase = createClient();
    const has = matrix[role]?.has(permission);
    if (has) {
      await supabase.from('role_permissions').delete().eq('role', role).eq('permission', permission);
    } else {
      await supabase.from('role_permissions').upsert({ role, permission, allowed: true });
    }
    toast.success('Permission updated');
    load();
  }

  const roles = Object.keys(ROLE_LABELS).filter((r) => r !== 'applicant') as UserRole[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Role Management</h1>
        <p className="text-sm text-ink-500">Fine-grained, role-based access control across the platform.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Permission Matrix</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-50 bg-mist/60 uppercase text-ink-400">
              <tr>
                <th className="sticky left-0 bg-mist/60 px-4 py-3 font-medium">Permission</th>
                {roles.map((r) => <th key={r} className="whitespace-nowrap px-3 py-3 font-medium">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm} className="border-b border-ink-50 last:border-0">
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-mono text-ink-700">{perm}</td>
                  {roles.map((r) => {
                    const founderLike = r === 'founder' || r === 'super_admin';
                    const checked = founderLike || matrix[r]?.has(perm);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={founderLike}
                          checked={!!checked}
                          onChange={() => togglePermission(r, perm)}
                          className="h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3 font-medium text-ink-900">{u.full_name}</td>
                  <td className="px-5 py-3 text-ink-500">{u.official_email ?? u.email}</td>
                  <td className="px-5 py-3"><Badge tone="ink"><ShieldCheck size={11} className="mr-1" />{ROLE_LABELS[u.role as UserRole]}</Badge></td>
                  <td className="px-5 py-3"><Badge tone={u.is_active ? 'brand' : 'coral'}>{u.is_active ? 'Active' : 'Disabled'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
