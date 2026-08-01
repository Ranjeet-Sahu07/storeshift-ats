'use client';

import { useEffect, useState } from 'react';
import { UserPlus, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/progress';

export default function InternsPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [interns, setInterns] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<any | null>(null);
  const [form, setForm] = useState({
    department: '', roleTitle: '', mentorId: '', durationMonths: '3', accessLevel: 'standard', roleShortCode: 'int',
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: apps } = await supabase.from('applications').select('*').eq('status', 'selected');
    const { data: existingInternships } = await supabase.from('internships').select('application_id');
    const convertedIds = new Set((existingInternships ?? []).map((i: any) => i.application_id));
    setPending((apps ?? []).filter((a: any) => !convertedIds.has(a.id)));

    const { data: internList } = await supabase
      .from('internships')
      .select('*, profiles!internships_intern_id_fkey(full_name, official_email, avatar_url)')
      .order('start_date', { ascending: false });
    setInterns(internList ?? []);

    const { data: mentorList } = await supabase.from('profiles').select('id, full_name').eq('role', 'mentor');
    setMentors(mentorList ?? []);
  }

  useEffect(() => { load(); }, []);

  function openForm(app: any) {
    setActiveApp(app);
    setForm({
      department: app.preferred_role?.split(' ')[0] ?? '', roleTitle: app.preferred_role ?? '',
      mentorId: '', durationMonths: '3', accessLevel: 'standard', roleShortCode: 'int',
    });
  }

  async function createAccount() {
    if (!activeApp) return;
    setCreating(true);
    try {
      const res = await fetch('/api/interns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: activeApp.id, department: form.department, roleTitle: form.roleTitle,
          mentorId: form.mentorId || null, durationMonths: form.durationMonths, accessLevel: form.accessLevel,
          skills: activeApp.skills, roleShortCode: form.roleShortCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Intern account created — ${data.officialEmail}`);
      setActiveApp(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Intern Management</h1>
        <p className="text-sm text-ink-500">Convert selected applicants into official StoreShift accounts.</p>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Awaiting Account Creation ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={a.full_name} />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{a.full_name}</p>
                    <p className="text-xs text-ink-400">{a.preferred_role}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => openForm(a)}><UserPlus size={14} /> Create Account</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeApp && (
        <Card>
          <CardHeader><CardTitle>New Intern Account — {activeApp.full_name}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Role Title</Label>
              <Input value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} />
            </div>
            <div>
              <Label>Mentor</Label>
              <Select value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })}>
                <option value="">Unassigned</option>
                {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Duration (months)</Label>
              <Input type="number" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} />
            </div>
            <div>
              <Label>Access Level</Label>
              <Select value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="elevated">Elevated</option>
                <option value="restricted">Restricted</option>
              </Select>
            </div>
            <div>
              <Label>Email Role Code</Label>
              <Input value={form.roleShortCode} onChange={(e) => setForm({ ...form, roleShortCode: e.target.value })} placeholder="int / fe / ui / ai" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={createAccount} disabled={creating}>{creating ? 'Creating…' : 'Create Official Account & Email Credentials'}</Button>
              <Button variant="ghost" onClick={() => setActiveApp(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Active & Past Interns</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Intern</th>
                <th className="px-5 py-3 font-medium">Official Email</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {interns.map((i) => (
                <tr key={i.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3 font-medium text-ink-900">{i.profiles?.full_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{i.profiles?.official_email}</td>
                  <td className="px-5 py-3 text-ink-600">{i.department}</td>
                  <td className="px-5 py-3 text-ink-600">{i.duration_months} months</td>
                  <td className="px-5 py-3"><Badge tone={i.status === 'active' ? 'brand' : 'default'}>{i.status}</Badge></td>
                </tr>
              ))}
              {interns.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">
                  <GraduationCap className="mx-auto mb-2 text-ink-200" size={28} />
                  No interns onboarded yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
