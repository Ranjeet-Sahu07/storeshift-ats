'use client';

import { useEffect, useState } from 'react';
import {
  UserPlus, GraduationCap, AlertCircle, Copy, CheckCircle2, KeyRound, Mail,
  Wrench, ShieldAlert, History, Pencil, X, Check, FileText, Award, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/progress';
import { generateOfficialEmail } from '@/lib/ids';
import { downloadDocument } from '@/lib/documents';
import { EmailInternModal } from '@/components/admin/email-intern-modal';
import { cn } from '@/lib/utils';

type CredentialMode = 'temp_password' | 'invite_email';

const emptyForm = {
  department: '', roleTitle: '', mentorId: '', durationMonths: '3', accessLevel: 'standard',
  officialEmail: '', credentialMode: 'temp_password' as CredentialMode,
  manualFullName: '', manualEmail: '', startDate: '', endDate: '', markCompleted: false,
};

export default function InternsPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [interns, setInterns] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeApp, setActiveApp] = useState<any | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ loginEmail: string; officialEmail: string | null; tempPassword: string | null; inviteSent: boolean } | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null);

  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [orphaned, setOrphaned] = useState<any[] | null>(null);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState<Record<string, { offer?: string; cert?: string; lor?: string }>>({});
  const [messagingIntern, setMessagingIntern] = useState<{ id: string; full_name: string; email: string } | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [appsRes, internshipsRes, internListRes, mentorsRes, offersRes, certsRes, lorsRes] = await Promise.all([
      supabase.from('applications').select('*').eq('status', 'selected'),
      supabase.from('internships').select('application_id'),
      supabase.from('internships').select('*, profiles!internships_intern_id_fkey(id, full_name, email, official_email, avatar_url)').order('start_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'mentor'),
      supabase.from('offer_letters').select('id, internship_id'),
      supabase.from('certificates').select('id, internship_id'),
      supabase.from('letters_of_recommendation').select('id, internship_id'),
    ]);

    const convertedIds = new Set((internshipsRes.data ?? []).map((i: any) => i.application_id));
    setPending((appsRes.data ?? []).filter((a: any) => !convertedIds.has(a.id)));
    setInterns(internListRes.data ?? []);
    setMentors(mentorsRes.data ?? []);

    const docs: Record<string, { offer?: string; cert?: string; lor?: string }> = {};
    (offersRes.data ?? []).forEach((o: any) => { docs[o.internship_id] = { ...docs[o.internship_id], offer: o.id }; });
    (certsRes.data ?? []).forEach((c: any) => { docs[c.internship_id] = { ...docs[c.internship_id], cert: c.id }; });
    (lorsRes.data ?? []).forEach((l: any) => { docs[l.internship_id] = { ...docs[l.internship_id], lor: l.id }; });
    setDocStatus(docs);

    setLoading(false);
  }

  async function loadOrphaned() {
    const res = await fetch('/api/admin/orphaned-users');
    if (res.ok) {
      const data = await res.json();
      setOrphaned(data.orphaned ?? []);
    }
  }

  useEffect(() => { load(); loadOrphaned(); }, []);

  function openForm(app: any) {
    setActiveApp(app);
    setManualMode(false);
    setErrorMsg(null);
    setResult(null);
    setForm({ ...emptyForm, department: app.preferred_role?.split(' ')[0] ?? '', roleTitle: app.preferred_role ?? '', officialEmail: generateOfficialEmail(app.full_name, 'int') });
  }

  function openManualForm() {
    setActiveApp({ full_name: '', email: '', skills: [] });
    setManualMode(true);
    setErrorMsg(null);
    setResult(null);
    setForm({ ...emptyForm, markCompleted: true });
  }

  function closeForm() {
    setActiveApp(null);
    setResult(null);
  }

  async function createAccount() {
    if (!activeApp) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        department: form.department, roleTitle: form.roleTitle, mentorId: form.mentorId || null,
        durationMonths: form.durationMonths, accessLevel: form.accessLevel,
        officialEmail: form.officialEmail || null, credentialMode: form.credentialMode,
      };

      if (manualMode) {
        payload.fullName = form.manualFullName;
        payload.personalEmail = form.manualEmail;
        payload.skills = [];
        if (form.startDate) payload.startDate = form.startDate;
        if (form.endDate) payload.endDate = form.endDate;
        payload.status = form.markCompleted ? 'completed' : 'active';
      } else {
        payload.applicationId = activeApp.id;
        payload.skills = activeApp.skills;
      }

      const res = await fetch('/api/interns/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? 'Something went wrong'); return; }
      setResult({ loginEmail: data.loginEmail, officialEmail: data.officialEmail, tempPassword: data.tempPassword, inviteSent: data.inviteSent });
      toast.success('Intern account created');
      load();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(userId: string) {
    setResettingId(userId);
    try {
      const res = await fetch('/api/interns/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setResetResult({ userId, password: data.tempPassword });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResettingId(null);
    }
  }

  function startEditEmail(intern: any) {
    setEditingEmailId(intern.profiles?.id);
    setEditingEmailValue(intern.profiles?.official_email ?? '');
  }

  async function saveOfficialEmail(userId: string) {
    setSavingEmail(true);
    try {
      const res = await fetch('/api/interns/official-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, officialEmail: editingEmailValue }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Official email updated');
      setEditingEmailId(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function repairProfile(o: any, role: string) {
    setRepairingId(o.id);
    try {
      const res = await fetch('/api/admin/repair-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: o.id, fullName: o.fullName, email: o.email, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Fixed — ${o.email} can log in now`);
      loadOrphaned();
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRepairingId(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Intern Management</h1>
          <p className="text-sm text-ink-500">Convert selected applicants into official StoreShift accounts.</p>
        </div>
        <Button variant="outline" onClick={openManualForm}><History size={15} /> Add Past Intern</Button>
      </div>

      {orphaned !== null && orphaned.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-700"><ShieldAlert size={17} /> Accounts That Can't Log In ({orphaned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-ink-500">
              These accounts exist in authentication but are missing their profile record — a known bug where the
              account gets created but login fails. Click Fix to repair each one (no password change needed).
            </p>
            {orphaned.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{o.fullName}</p>
                  <p className="font-mono text-xs text-ink-500">{o.email}</p>
                </div>
                <Button size="sm" onClick={() => repairProfile(o, o.suggestedRole)} disabled={repairingId === o.id}>
                  <Wrench size={13} /> {repairingId === o.id ? 'Fixing…' : `Fix (as ${o.suggestedRole})`}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="space-y-3 p-5">
          <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
        </CardContent></Card>
      ) : (
        <>
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
                        <p className="text-xs text-ink-400">{a.preferred_role} · {a.email}</p>
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
              <CardHeader><CardTitle>{manualMode ? 'Add Past Intern (Backdated)' : `New Intern Account — ${activeApp.full_name}`}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-coral-500/30 bg-coral-500/5 p-3 text-sm text-coral-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{errorMsg}</span>
                  </div>
                )}

                {result ? (
                  <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <div className="flex items-center gap-2 text-brand-700"><CheckCircle2 size={18} /> <p className="font-semibold">Account created successfully</p></div>
                    <div className="space-y-2 rounded-lg bg-white p-3 text-sm">
                      <Row label="Login Email" value={result.loginEmail} onCopy={copy} />
                      {result.officialEmail && <Row label="Official Email" value={result.officialEmail} onCopy={copy} />}
                      {result.tempPassword && <Row label="Temporary Password" value={result.tempPassword} onCopy={copy} />}
                    </div>
                    <p className="text-xs text-ink-500">
                      {result.inviteSent
                        ? "An invite email was sent — the intern sets their own password when they open it."
                        : "Copy these credentials and share them directly — don't rely solely on email delivery unless it's confirmed working (Settings → Email Delivery)."}
                    </p>
                    <Button size="sm" variant="outline" onClick={closeForm}>Done</Button>
                  </div>
                ) : (
                  <>
                    {manualMode && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Full Name</Label>
                          <Input value={form.manualFullName} onChange={(e) => setForm({ ...form, manualFullName: e.target.value })} />
                        </div>
                        <div>
                          <Label>Personal Email (their login)</Label>
                          <Input type="email" value={form.manualEmail} onChange={(e) => setForm({ ...form, manualEmail: e.target.value })} />
                        </div>
                        <div>
                          <Label>Internship Start Date</Label>
                          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>Internship End Date</Label>
                          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                        <label className="flex items-center gap-2 sm:col-span-2">
                          <input type="checkbox" checked={form.markCompleted} onChange={(e) => setForm({ ...form, markCompleted: e.target.checked })} className="h-4 w-4 rounded border-ink-200 text-brand-600" />
                          <span className="text-sm text-ink-700">Mark this internship as completed (makes them eligible for certificate/LOR generation immediately)</span>
                        </label>
                      </div>
                    )}

                    {!manualMode && (
                      <div className="rounded-xl bg-mist p-3 text-sm">
                        <span className="text-ink-400">Login email (from their application): </span>
                        <span className="font-mono font-medium text-ink-900">{activeApp.email}</span>
                      </div>
                    )}

                    <div>
                      <Label>How should they get access?</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => setForm({ ...form, credentialMode: 'temp_password' })}
                          className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm', form.credentialMode === 'temp_password' ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-200')}>
                          <KeyRound size={16} className="mt-0.5 shrink-0 text-brand-600" />
                          <span><span className="block font-medium text-ink-900">Set a temporary password</span><span className="block text-xs text-ink-400">You get the password immediately to share yourself.</span></span>
                        </button>
                        <button type="button" onClick={() => setForm({ ...form, credentialMode: 'invite_email' })}
                          className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm', form.credentialMode === 'invite_email' ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-200')}>
                          <Mail size={16} className="mt-0.5 shrink-0 text-brand-600" />
                          <span><span className="block font-medium text-ink-900">Send invite email</span><span className="block text-xs text-ink-400">They set their own password via a secure link.</span></span>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                      <div><Label>Role Title</Label><Input value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} /></div>
                      <div>
                        <Label>Mentor</Label>
                        <Select value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })}>
                          <option value="">Unassigned</option>
                          {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </Select>
                      </div>
                      {!manualMode && (
                        <div><Label>Duration (months)</Label><Input type="number" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} /></div>
                      )}
                      <div>
                        <Label>Access Level</Label>
                        <Select value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}>
                          <option value="standard">Standard</option><option value="elevated">Elevated</option><option value="restricted">Restricted</option>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Official Email (optional — branding only, e.g. rahul.int23@storeshift.in)</Label>
                        <Input value={form.officialEmail} onChange={(e) => setForm({ ...form, officialEmail: e.target.value })} className="font-mono text-sm" placeholder="Leave blank to assign later" />
                        <p className="mt-1 text-xs text-ink-400">
                          This is just a display label shown on their dashboard/certificate — it's not their login, so it can be left
                          blank and set anytime later from the table below.
                        </p>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Button onClick={createAccount} disabled={creating}>{creating ? 'Creating…' : 'Create Official Account'}</Button>
                        <Button variant="ghost" onClick={closeForm}>Cancel</Button>
                      </div>
                    </div>
                  </>
                )}
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
                    <th className="px-5 py-3 font-medium">Login Email</th>
                    <th className="px-5 py-3 font-medium">Official Email</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Documents</th>
                    <th className="px-5 py-3 font-medium">Message</th>
                    <th className="px-5 py-3 font-medium">Credentials</th>
                  </tr>
                </thead>
                <tbody>
                  {interns.map((i) => {
                    const docs = docStatus[i.id] ?? {};
                    return (
                    <tr key={i.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3 font-medium text-ink-900">{i.profiles?.full_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{i.profiles?.email}</td>
                      <td className="px-5 py-3">
                        {editingEmailId === i.profiles?.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input value={editingEmailValue} onChange={(e) => setEditingEmailValue(e.target.value)} className="!h-8 !w-48 font-mono text-xs" placeholder="name.role26@storeshift.in" />
                            <button onClick={() => saveOfficialEmail(i.profiles.id)} disabled={savingEmail} className="text-brand-600"><Check size={15} /></button>
                            <button onClick={() => setEditingEmailId(null)} className="text-ink-400"><X size={15} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditEmail(i)} className="flex items-center gap-1.5 font-mono text-xs text-ink-600 hover:text-brand-600">
                            {i.profiles?.official_email || <span className="italic text-ink-300">Not set</span>}
                            <Pencil size={11} />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-600">{i.duration_months} months</td>
                      <td className="px-5 py-3"><Badge tone={i.status === 'active' ? 'brand' : i.status === 'completed' ? 'ink' : 'default'}>{i.status}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <DocIcon icon={FileText} title="Offer Letter" issued={!!docs.offer} onClick={() => docs.offer && downloadDocument('offer_letter', docs.offer)} />
                          <DocIcon icon={Award} title="Certificate" issued={!!docs.cert} onClick={() => docs.cert && downloadDocument('certificate', docs.cert)} />
                          <DocIcon icon={Mail} title="LOR" issued={!!docs.lor} onClick={() => docs.lor && downloadDocument('lor', docs.lor)} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMessagingIntern({ id: i.profiles?.id, full_name: i.profiles?.full_name, email: i.profiles?.email })}
                        >
                          <Mail size={12} /> Message
                        </Button>
                      </td>
                      <td className="px-5 py-3">
                        {resetResult && resetResult.userId === i.profiles?.id ? (
                          <span className="flex items-center gap-1.5 font-mono text-xs text-brand-700">
                            {resetResult.password}
                            <button onClick={() => copy(resetResult.password)} className="text-ink-400 hover:text-brand-600"><Copy size={12} /></button>
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" disabled={resettingId === i.profiles?.id} onClick={() => resetPassword(i.profiles?.id)}>
                            <KeyRound size={12} /> Reset Password
                          </Button>
                        )}
                      </td>
                    </tr>
                  );})}
                  {interns.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                      <GraduationCap className="mx-auto mb-2 text-ink-200" size={28} />
                      No interns onboarded yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {messagingIntern && (
        <EmailInternModal recipient={messagingIntern} onClose={() => setMessagingIntern(null)} />
      )}
    </div>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: (t: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-ink-50 pt-2 first:border-0 first:pt-0">
      <span className="text-ink-400">{label}</span>
      <span className="flex items-center gap-2 font-mono font-medium text-ink-900">
        {value}
        <button onClick={() => onCopy(value)} className="text-ink-400 hover:text-brand-600"><Copy size={13} /></button>
      </span>
    </div>
  );
}

function DocIcon({ icon: Icon, title, issued, onClick }: { icon: any; title: string; issued: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!issued}
      title={issued ? `Download ${title}` : `${title} not issued yet`}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        issued ? 'bg-brand-50 text-brand-600 hover:bg-brand-100' : 'bg-ink-50 text-ink-300 cursor-default'
      )}
    >
      <Icon size={13} />
    </button>
  );
}
