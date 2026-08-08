'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, AlertCircle, Lock, Copy, CheckCircle2 } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'hr_manager', department: '' });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [staffCreated, setStaffCreated] = useState<{ email: string; password: string; emailStatus?: string } | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUserRole === 'founder' || currentUserRole === 'super_admin';

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase.from('role_permissions').select('*');
    const m: Record<string, Set<string>> = {};
    (data ?? []).forEach((row: any) => {
      if (!m[row.role]) m[row.role] = new Set();
      if (row.allowed) m[row.role].add(row.permission);
    });
    setMatrix(m);

    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    setUsers(profiles ?? []);
    if (user) {
      const me = (profiles ?? []).find((p: any) => p.id === user.id);
      if (me) setCurrentUserRole(me.role);
    }
    setLoading(false);
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

  async function createStaffAccount() {
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error); return; }
      setStaffCreated({ email: newStaff.email, password: newStaff.password, emailStatus: data.emailStatus });
      setNewStaff({ fullName: '', email: '', password: '', role: 'hr_manager', department: '' });
      load();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function changeUserRole(userId: string, role: UserRole) {
    setSavingUserId(userId);
    const supabase = createClient();
    // RLS enforces this server-side too (only founder/super_admin can
    // update another user's row — see supabase/migrations/003_*.sql) —
    // this direct client update is safe because of that policy, not
    // because of anything in this component.
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    setSavingUserId(null);
    if (error) { toast.error(`Couldn't update role: ${error.message}`); return; }
    toast.success('Role updated');
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  async function toggleActive(userId: string, isActive: boolean) {
    setSavingUserId(userId);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId);
    setSavingUserId(null);
    if (error) { toast.error(`Couldn't update: ${error.message}`); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)));
  }

  const roles = Object.keys(ROLE_LABELS).filter((r) => r !== 'applicant') as UserRole[];
  const staffUsers = users.filter((u) => u.role !== 'intern');
  const internUsers = users.filter((u) => u.role === 'intern');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Role Management</h1>
          <p className="text-sm text-ink-500">Fine-grained, role-based access control across the platform.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => { setShowAddForm((s) => !s); setStaffCreated(null); setErrorMsg(null); }}><UserPlus size={16} /> Add Team Member</Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          <Lock size={15} className="shrink-0" />
          You can view roles and permissions, but only Founder / Super Admin accounts can create staff logins or change anyone's role.
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Create Staff Login</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-coral-500/30 bg-coral-500/5 p-3 text-sm text-coral-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{errorMsg}</span>
              </div>
            )}

            {staffCreated ? (
              <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <div className="flex items-center gap-2 text-brand-700"><CheckCircle2 size={18} /> <p className="font-semibold">Staff account created</p></div>
                <div className="space-y-2 rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-400">Login Email</span>
                    <span className="flex items-center gap-2 font-mono font-medium text-ink-900">
                      {staffCreated.email}
                      <button onClick={() => { navigator.clipboard.writeText(staffCreated.email); toast.success('Copied'); }} className="text-ink-400 hover:text-brand-600"><Copy size={13} /></button>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-ink-50 pt-2">
                    <span className="text-ink-400">Password</span>
                    <span className="flex items-center gap-2 font-mono font-medium text-ink-900">
                      {staffCreated.password}
                      <button onClick={() => { navigator.clipboard.writeText(staffCreated.password); toast.success('Copied'); }} className="text-ink-400 hover:text-brand-600"><Copy size={13} /></button>
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink-500">
                  This is shown once — a welcome email with these credentials was also sent
                  {staffCreated.emailStatus && staffCreated.emailStatus !== 'sent' ? " (though delivery may have failed — check Settings → Email Delivery)" : ''}.
                </p>
                <Button size="sm" variant="outline" onClick={() => { setStaffCreated(null); setShowAddForm(false); }}>Done</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full Name</Label>
                  <Input value={newStaff.fullName} onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })} />
                </div>
                <div>
                  <Label>Email (this becomes their login)</Label>
                  <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="name@storeshift.in" />
                </div>
                <div>
                  <Label>Temporary Password</Label>
                  <Input type="text" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Min. 8 characters" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                    {roles.filter((r) => r !== 'founder').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Department (optional)</Label>
                  <Input value={newStaff.department} onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })} />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={createStaffAccount} disabled={creating}>{creating ? 'Creating…' : 'Create Account'}</Button>
                  <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <PageSkeleton rows={5} />
      ) : (
        <>
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
                          disabled={founderLike || !isSuperAdmin}
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
        <CardHeader><CardTitle>Staff Accounts ({staffUsers.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <UserTable
            users={staffUsers}
            currentUserId={currentUserId}
            isSuperAdmin={isSuperAdmin}
            savingUserId={savingUserId}
            roles={roles}
            changeUserRole={changeUserRole}
            toggleActive={toggleActive}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Intern Accounts ({internUsers.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {internUsers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">No intern accounts yet — create one from Intern Management.</p>
          ) : (
            <UserTable
              users={internUsers}
              currentUserId={currentUserId}
              isSuperAdmin={isSuperAdmin}
              savingUserId={savingUserId}
              roles={roles}
              changeUserRole={changeUserRole}
              toggleActive={toggleActive}
            />
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function UserTable({
  users, currentUserId, isSuperAdmin, savingUserId, roles, changeUserRole, toggleActive,
}: {
  users: any[];
  currentUserId: string | null;
  isSuperAdmin: boolean;
  savingUserId: string | null;
  roles: UserRole[];
  changeUserRole: (userId: string, role: UserRole) => void;
  toggleActive: (userId: string, isActive: boolean) => void;
}) {
  return (
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
        {users.map((u) => {
          const isFounder = u.role === 'founder';
          const isSelf = u.id === currentUserId;
          const canEditThisRow = isSuperAdmin && !isFounder;
          return (
            <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
              <td className="px-5 py-3 font-medium text-ink-900">
                {u.full_name} {isSelf && <span className="text-xs font-normal text-ink-400">(you)</span>}
              </td>
              <td className="px-5 py-3 text-ink-500">{u.official_email ?? u.email}</td>
              <td className="px-5 py-3">
                {canEditThisRow ? (
                  <Select
                    value={u.role}
                    onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                    disabled={savingUserId === u.id}
                    className="!h-8 !w-44 !text-xs"
                  >
                    {roles.filter((r) => r !== 'founder').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </Select>
                ) : (
                  <Badge tone="ink"><ShieldCheck size={11} className="mr-1" />{ROLE_LABELS[u.role as UserRole]}</Badge>
                )}
              </td>
              <td className="px-5 py-3">
                {canEditThisRow && !isSelf ? (
                  <button onClick={() => toggleActive(u.id, u.is_active)} disabled={savingUserId === u.id} className="cursor-pointer">
                    <Badge tone={u.is_active ? 'brand' : 'coral'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                  </button>
                ) : (
                  <Badge tone={u.is_active ? 'brand' : 'coral'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
