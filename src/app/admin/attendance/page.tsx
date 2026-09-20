'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, CheckCircle2, Download, Layers, Inbox, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { cn, formatDate } from '@/lib/utils';
import { can } from '@/lib/rbac';
import { notifyUser } from '@/lib/notify';
import type { UserRole, AttendanceStatus, AttendanceRectificationRequest, Batch } from '@/types';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; tone: 'brand' | 'coral' | 'amber' | 'default' }[] = [
  { value: 'present', label: 'Present', tone: 'brand' },
  { value: 'absent', label: 'Absent', tone: 'coral' },
  { value: 'half_day', label: 'Half Day', tone: 'amber' },
  { value: 'leave', label: 'Leave', tone: 'default' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function monthsBetween(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Tab = 'mark' | 'requests' | 'batches';

export default function AttendancePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('mark');
  const [loading, setLoading] = useState(true);

  const isAdmin = role ? can(role, 'attendance.manage') : false;

  // --- Mark tab state ---
  const [internships, setInternships] = useState<any[]>([]);
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [bulking, setBulking] = useState(false);
  const [rectifyFor, setRectifyFor] = useState<{ internshipId: string; name: string } | null>(null);
  const [rectifyForm, setRectifyForm] = useState({ status: 'present' as AttendanceStatus, checkIn: '', checkOut: '', reason: '' });
  const [submittingRectify, setSubmittingRectify] = useState(false);

  // --- Requests tab state ---
  const [requests, setRequests] = useState<(AttendanceRectificationRequest & { internships?: any })[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectNoteFor, setRejectNoteFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // --- Batches tab state ---
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allInternships, setAllInternships] = useState<any[]>([]);
  const [newBatch, setNewBatch] = useState({ name: '', startDate: '', endDate: '', notes: '' });
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [savingDuration, setSavingDuration] = useState<string | null>(null);

  // --- Download sheet state ---
  const [showDownload, setShowDownload] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => todayStr().slice(0, 8) + '01');
  const [rangeEnd, setRangeEnd] = useState(todayStr());
  const [downloading, setDownloading] = useState(false);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    setRole((profile?.role as UserRole) ?? null);
  }

  async function loadMarkTab(currentUserId: string, admin: boolean) {
    const supabase = createClient();
    let query = supabase
      .from('internships')
      .select('*, profiles!internships_intern_id_fkey(full_name, avatar_url)')
      .eq('status', 'active');
    if (!admin) query = query.eq('mentor_id', currentUserId);
    const { data: internList } = await query.order('start_date', { ascending: false });
    setInternships(internList ?? []);

    const ids = (internList ?? []).map((i: any) => i.id);
    if (ids.length === 0) { setRecords({}); return; }
    const { data: attendanceRows } = await supabase.from('attendance').select('*').eq('date', date).in('internship_id', ids);
    const map: Record<string, any> = {};
    (attendanceRows ?? []).forEach((r: any) => { map[r.internship_id] = r; });
    setRecords(map);
  }

  async function loadRequests(currentUserId: string, admin: boolean) {
    const supabase = createClient();
    let query = supabase
      .from('attendance_rectification_requests')
      .select('*, internships(role_title, profiles!internships_intern_id_fkey(full_name))')
      .order('created_at', { ascending: false });
    if (!admin) query = query.eq('requested_by', currentUserId);
    const { data } = await query;
    setRequests((data as any[]) ?? []);
  }

  async function loadBatchesTab() {
    const supabase = createClient();
    const [batchRes, internRes] = await Promise.all([
      supabase.from('batches').select('*').order('start_date', { ascending: false }),
      supabase.from('internships').select('*, profiles!internships_intern_id_fkey(full_name)').order('start_date', { ascending: false }),
    ]);
    setBatches((batchRes.data as Batch[]) ?? []);
    setAllInternships(internRes.data ?? []);
  }

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!userId || role === null) return;
    setLoading(true);
    (async () => {
      if (tab === 'mark') await loadMarkTab(userId, isAdmin);
      if (tab === 'requests') await loadRequests(userId, isAdmin);
      if (tab === 'batches' && isAdmin) await loadBatchesTab();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role, tab, date]);

  function canDirectEdit(internshipId: string) {
    if (isAdmin) return true;
    if (date === todayStr()) return true;
    return !records[internshipId];
  }

  async function markStatus(internshipId: string, status: AttendanceStatus) {
    setSaving(internshipId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('attendance')
      .upsert({ internship_id: internshipId, date, status, marked_by: user?.id }, { onConflict: 'internship_id,date' })
      .select()
      .single();
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setRecords((prev) => ({ ...prev, [internshipId]: data }));
  }

  async function markAllPresent() {
    setBulking(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const rows = internships
      .filter((i) => !records[i.id] && canDirectEdit(i.id))
      .map((i) => ({ internship_id: i.id, date, status: 'present', marked_by: user?.id }));

    if (rows.length === 0) { toast.info('Everyone already has attendance marked for this day'); setBulking(false); return; }

    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'internship_id,date' });
    setBulking(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${rows.length} intern(s) present`);
    if (userId) loadMarkTab(userId, isAdmin);
  }

  function openRectify(internshipId: string, name: string) {
    const existing = records[internshipId];
    setRectifyForm({ status: existing?.status ?? 'present', checkIn: existing?.check_in ?? '', checkOut: existing?.check_out ?? '', reason: '' });
    setRectifyFor({ internshipId, name });
  }

  async function submitRectify() {
    if (!rectifyFor || !userId) return;
    if (!rectifyForm.reason.trim()) { toast.error('Please explain why this needs correcting'); return; }
    setSubmittingRectify(true);
    const supabase = createClient();
    const existing = records[rectifyFor.internshipId];
    const { error } = await supabase.from('attendance_rectification_requests').insert({
      internship_id: rectifyFor.internshipId,
      date,
      requested_status: rectifyForm.status,
      requested_check_in: rectifyForm.checkIn || null,
      requested_check_out: rectifyForm.checkOut || null,
      reason: rectifyForm.reason.trim(),
      previous_status: existing?.status ?? null,
      requested_by: userId,
    });
    setSubmittingRectify(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Rectification request sent to admin');
    setRectifyFor(null);
  }

  async function reviewRequest(req: AttendanceRectificationRequest & { internships?: any }, approve: boolean, note?: string) {
    setReviewingId(req.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (approve) {
      const { error: attnError } = await supabase.from('attendance').upsert({
        internship_id: req.internship_id,
        date: req.date,
        status: req.requested_status,
        check_in: req.requested_check_in,
        check_out: req.requested_check_out,
        note: `Rectified: ${req.reason}`,
        marked_by: user?.id,
      }, { onConflict: 'internship_id,date' });
      if (attnError) { toast.error(attnError.message); setReviewingId(null); return; }
    }

    const { error } = await supabase.from('attendance_rectification_requests').update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      admin_note: note ?? null,
    }).eq('id', req.id);

    setReviewingId(null);
    setRejectNoteFor(null);
    setRejectNote('');
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? 'Approved and attendance updated' : 'Request rejected');

    const { data: internship } = await supabase.from('internships').select('intern_id').eq('id', req.internship_id).maybeSingle();
    if (internship) {
      await notifyUser(
        supabase,
        internship.intern_id,
        approve ? 'Attendance correction approved' : 'Attendance correction rejected',
        `${formatDate(req.date)} — ${approve ? 'updated to ' + req.requested_status : 'request was rejected'}`,
        '/dashboard/attendance'
      );
    }
    if (userId) loadRequests(userId, isAdmin);
  }

  async function createBatch() {
    if (!newBatch.name.trim() || !newBatch.startDate || !newBatch.endDate) { toast.error('Name, start date, and end date are required'); return; }
    setCreatingBatch(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('batches').insert({
      name: newBatch.name.trim(), start_date: newBatch.startDate, end_date: newBatch.endDate,
      notes: newBatch.notes.trim() || null, created_by: user?.id,
    });
    setCreatingBatch(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Batch created');
    setNewBatch({ name: '', startDate: '', endDate: '', notes: '' });
    loadBatchesTab();
  }

  async function updateInternshipDuration(internshipId: string, patch: { batch_id?: string | null; start_date?: string; end_date?: string }) {
    setSavingDuration(internshipId);
    const supabase = createClient();
    const current = allInternships.find((i) => i.id === internshipId);
    const nextStart = patch.start_date ?? current?.start_date;
    const nextEnd = patch.end_date ?? current?.end_date;
    const duration_months = monthsBetween(nextStart, nextEnd);
    const { error } = await supabase.from('internships').update({ ...patch, duration_months }).eq('id', internshipId);
    setSavingDuration(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Updated');
    setAllInternships((prev) => prev.map((i) => (i.id === internshipId ? { ...i, ...patch, duration_months } : i)));
  }

  async function handleDownload() {
    if (!userId) return;
    if (rangeStart > rangeEnd) { toast.error('Start date must be before end date'); return; }
    setDownloading(true);
    const supabase = createClient();

    let internQuery = supabase.from('internships').select('id, role_title, mentor_id, profiles!internships_intern_id_fkey(full_name)');
    if (!isAdmin) internQuery = internQuery.eq('mentor_id', userId);
    const { data: internList } = await internQuery;
    const idToInfo: Record<string, { name: string; role: string }> = {};
    (internList ?? []).forEach((i: any) => { idToInfo[i.id] = { name: i.profiles?.full_name ?? 'Unknown', role: i.role_title }; });
    const ids = Object.keys(idToInfo);
    if (ids.length === 0) { toast.info('No attendance records in scope'); setDownloading(false); return; }

    const { data: rows, error } = await supabase
      .from('attendance')
      .select('*')
      .in('internship_id', ids)
      .gte('date', rangeStart)
      .lte('date', rangeEnd)
      .order('date');

    setDownloading(false);
    if (error) { toast.error(error.message); return; }
    if (!rows || rows.length === 0) { toast.info('No attendance records for that range'); return; }

    const csvRows = [
      ['Date', 'Intern Name', 'Role', 'Status', 'Check In', 'Check Out', 'Note'],
      ...rows.map((r: any) => [
        r.date, idToInfo[r.internship_id]?.name ?? 'Unknown', idToInfo[r.internship_id]?.role ?? '',
        r.status, r.check_in ?? '', r.check_out ?? '', r.note ?? '',
      ]),
    ];
    downloadCsv(`attendance_${rangeStart}_to_${rangeEnd}.csv`, csvRows);
    setShowDownload(false);
  }

  const unmarkedCount = internships.filter((i) => !records[i.id] && canDirectEdit(i.id)).length;
  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayStr()) setDate(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Attendance</h1>
          <p className="text-sm text-ink-500">
            {isAdmin ? 'Mark, rectify, and manage attendance across all interns.' : "Mark today's attendance and request corrections for past days."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowDownload((s) => !s)}>
            <Download size={14} /> Download Sheet
          </Button>
        </div>
      </div>

      {showDownload && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-5">
            <div><Label>From</Label><Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="!w-auto" /></div>
            <div><Label>To</Label><Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="!w-auto" max={todayStr()} /></div>
            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
            <p className="text-xs text-ink-400">{isAdmin ? 'Includes every intern.' : 'Includes only interns you mentor.'}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm shadow-ink-900/5">
        <TabButton active={tab === 'mark'} onClick={() => setTab('mark')} icon={ClipboardCheck} label="Mark Attendance" />
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')} icon={Inbox} label="Rectification Requests" badge={pendingCount || undefined} />
        {isAdmin && <TabButton active={tab === 'batches'} onClick={() => setTab('batches')} icon={Layers} label="Batches & Duration" />}
      </div>

      {tab === 'mark' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-900"><ChevronLeft size={16} /></button>
              {formatDate(date)}
              <button onClick={() => shiftDate(1)} disabled={date >= todayStr()} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"><ChevronRight size={16} /></button>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-auto" max={todayStr()} />
              {unmarkedCount > 0 && (
                <Button size="sm" variant="outline" onClick={markAllPresent} disabled={bulking}>
                  <CheckCircle2 size={14} /> Mark {unmarkedCount} Remaining Present
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <PageSkeleton rows={3} />}
            {!loading && internships.map((i) => {
              const record = records[i.id];
              const editable = canDirectEdit(i.id);
              return (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                    <p className="text-xs text-ink-400">{i.role_title}</p>
                  </div>
                  {editable ? (
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt.value} disabled={saving === i.id} onClick={() => markStatus(i.id, opt.value)}>
                          <Badge tone={record?.status === opt.value ? opt.tone : 'default'} className={record?.status === opt.value ? '' : 'opacity-50 hover:opacity-100'}>
                            {opt.label}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {record ? (
                        <Badge tone={STATUS_OPTIONS.find((o) => o.value === record.status)?.tone ?? 'default'}>
                          {STATUS_OPTIONS.find((o) => o.value === record.status)?.label ?? record.status}
                        </Badge>
                      ) : (
                        <Badge tone="coral">Not marked</Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openRectify(i.id, i.profiles?.full_name)}>
                        <Clock size={13} /> Request Rectification
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && internships.length === 0 && (
              <p className="px-1 py-8 text-center text-sm text-ink-400">
                <ClipboardCheck className="mx-auto mb-2 text-ink-200" size={28} />
                {isAdmin ? 'No active interns to mark attendance for.' : 'You have no assigned interns.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'requests' && (
        <Card>
          <CardHeader><CardTitle>{isAdmin ? 'Rectification Requests' : 'My Requests'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <PageSkeleton rows={3} />}
            {!loading && requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{r.internships?.profiles?.full_name ?? 'Intern'} — {formatDate(r.date)}</p>
                    <p className="text-xs text-ink-400">
                      {r.previous_status ? `${r.previous_status} → ` : 'New entry → '}
                      <span className="font-medium text-ink-700">{r.requested_status}</span>
                      {r.requested_check_in && ` · In: ${r.requested_check_in}`}
                      {r.requested_check_out && ` · Out: ${r.requested_check_out}`}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">&ldquo;{r.reason}&rdquo;</p>
                    {r.admin_note && <p className="mt-1 text-xs text-ink-400">Admin note: {r.admin_note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'brand' : 'coral'}>{r.status}</Badge>
                    {isAdmin && r.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => reviewRequest(r, true)} disabled={reviewingId === r.id}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectNoteFor(rejectNoteFor === r.id ? null : r.id)}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
                {rejectNoteFor === r.id && (
                  <div className="mt-3 flex items-center gap-2 border-t border-ink-50 pt-3">
                    <Input placeholder="Reason for rejecting (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                    <Button size="sm" variant="danger" onClick={() => reviewRequest(r, false, rejectNote || undefined)} disabled={reviewingId === r.id}>Confirm Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {!loading && requests.length === 0 && (
              <p className="px-1 py-8 text-center text-sm text-ink-400">
                <Inbox className="mx-auto mb-2 text-ink-200" size={28} />
                No rectification requests.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'batches' && isAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Create Batch</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px]"><Label>Name</Label><Input value={newBatch.name} onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })} placeholder="e.g. Winter 2026 Cohort" /></div>
              <div><Label>Start Date</Label><Input type="date" value={newBatch.startDate} onChange={(e) => setNewBatch({ ...newBatch, startDate: e.target.value })} className="!w-auto" /></div>
              <div><Label>End Date</Label><Input type="date" value={newBatch.endDate} onChange={(e) => setNewBatch({ ...newBatch, endDate: e.target.value })} className="!w-auto" /></div>
              <div className="min-w-[180px] flex-1"><Label>Notes (optional)</Label><Input value={newBatch.notes} onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })} /></div>
              <Button onClick={createBatch} disabled={creatingBatch}>{creatingBatch ? 'Creating…' : 'Create Batch'}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Batches ({batches.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {batches.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{b.name}</p>
                    <p className="text-xs text-ink-400">{formatDate(b.start_date)} – {formatDate(b.end_date)}{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  <p className="text-xs text-ink-400">{allInternships.filter((i) => i.batch_id === b.id).length} intern(s)</p>
                </div>
              ))}
              {batches.length === 0 && <p className="px-1 py-6 text-center text-sm text-ink-400">No batches yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Intern Batch & Duration</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-3">Intern</th>
                    <th className="py-2 pr-3">Batch</th>
                    <th className="py-2 pr-3">Start Date</th>
                    <th className="py-2 pr-3">End Date</th>
                    <th className="py-2 pr-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {allInternships.map((i) => (
                    <tr key={i.id} className="border-b border-ink-50/60">
                      <td className="py-2 pr-3 font-medium text-ink-900">{i.profiles?.full_name}</td>
                      <td className="py-2 pr-3">
                        <Select value={i.batch_id ?? ''} onChange={(e) => updateInternshipDuration(i.id, { batch_id: e.target.value || null })} disabled={savingDuration === i.id} className="!h-8 !text-xs">
                          <option value="">— None —</option>
                          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <Input type="date" defaultValue={i.start_date} onBlur={(e) => e.target.value !== i.start_date && updateInternshipDuration(i.id, { start_date: e.target.value })} disabled={savingDuration === i.id} className="!h-8 !w-auto !text-xs" />
                      </td>
                      <td className="py-2 pr-3">
                        <Input type="date" defaultValue={i.end_date} onBlur={(e) => e.target.value !== i.end_date && updateInternshipDuration(i.id, { end_date: e.target.value })} disabled={savingDuration === i.id} className="!h-8 !w-auto !text-xs" />
                      </td>
                      <td className="py-2 pr-3 text-ink-500">{i.duration_months} mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allInternships.length === 0 && <p className="px-1 py-6 text-center text-sm text-ink-400">No internships yet.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {rectifyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={() => setRectifyFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-ink-900">Request Rectification</h3>
            <p className="mt-1 text-sm text-ink-500">{rectifyFor.name} — {formatDate(date)}</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label>Correct Status</Label>
                <Select value={rectifyForm.status} onChange={(e) => setRectifyForm({ ...rectifyForm, status: e.target.value as AttendanceStatus })}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Check In</Label><Input type="time" value={rectifyForm.checkIn} onChange={(e) => setRectifyForm({ ...rectifyForm, checkIn: e.target.value })} /></div>
                <div><Label>Check Out</Label><Input type="time" value={rectifyForm.checkOut} onChange={(e) => setRectifyForm({ ...rectifyForm, checkOut: e.target.value })} /></div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={rectifyForm.reason} onChange={(e) => setRectifyForm({ ...rectifyForm, reason: e.target.value })} placeholder="Why does this need correcting?" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRectifyFor(null)}>Cancel</Button>
              <Button onClick={submitRectify} disabled={submittingRectify}>{submittingRectify ? 'Sending…' : 'Send Request'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge }: { active: boolean; onClick: () => void; icon: any; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
      )}
    >
      <Icon size={14} /> {label}
      {!!badge && <span className={cn('ml-1 rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-coral-100 text-coral-600')}>{badge}</span>}
    </button>
  );
}
