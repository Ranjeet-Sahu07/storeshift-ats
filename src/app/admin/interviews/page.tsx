'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Video, Pencil, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

function toLocalInputValue(iso: string) {
  // datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not UTC ISO.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [stage, setStage] = useState('hr_screening');
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Editing / rescheduling an existing interview
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editMeetingLink, setEditMeetingLink] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editScore, setEditScore] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: iv } = await supabase
      .from('interviews')
      .select('*, applications(full_name, preferred_role, application_id)')
      .order('scheduled_at', { ascending: true });
    setInterviews(iv ?? []);
    const { data: apps } = await supabase
      .from('applications')
      .select('id, full_name, application_id')
      .in('status', ['shortlisted', 'interview_scheduled', 'under_review']);
    setApplications(apps ?? []);
  }

  useEffect(() => { load(); }, []);

  async function schedule() {
    if (!applicationId || !scheduledAt) { toast.error('Select an applicant and a time'); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('interviews').insert({
      application_id: applicationId, stage, scheduled_at: new Date(scheduledAt).toISOString(),
      meeting_link: meetingLink || null, interviewer_id: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('applications').update({ status: 'interview_scheduled' }).eq('id', applicationId);
    toast.success('Interview scheduled');
    setShowForm(false); setApplicationId(''); setScheduledAt(''); setMeetingLink('');
    load();
  }

  function openEdit(iv: any) {
    setEditingId(iv.id);
    setEditScheduledAt(toLocalInputValue(iv.scheduled_at));
    setEditMeetingLink(iv.meeting_link ?? '');
    setEditFeedback(iv.feedback ?? '');
    setEditScore(iv.score?.toString() ?? '');
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('interviews')
      .update({
        scheduled_at: new Date(editScheduledAt).toISOString(),
        meeting_link: editMeetingLink || null,
        feedback: editFeedback || null,
        score: editScore ? Number(editScore) : null,
      })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Interview updated');
    setEditingId(null);
    load();
  }

  async function toggleComplete(iv: any) {
    const supabase = createClient();
    const { error } = await supabase.from('interviews').update({ completed: !iv.completed }).eq('id', iv.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Interviews</h1>
          <p className="text-sm text-ink-500">Schedule, reschedule, and track HR, technical, and final round interviews.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}><Plus size={16} /> Schedule Interview</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Schedule Interview</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Applicant</Label>
              <Select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">Select applicant…</option>
                {applications.map((a) => <option key={a.id} value={a.id}>{a.full_name} ({a.application_id})</option>)}
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="hr_screening">HR Screening</option>
                <option value="technical">Technical Interview</option>
                <option value="final">Final Round</option>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label>Meeting Link (optional)</Label>
              <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={schedule}>Confirm Schedule</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {interviews.map((iv) => (
          <Card key={iv.id}>
            <CardContent className="p-4">
              {editingId === iv.id ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Reschedule Date & Time</Label>
                    <Input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} />
                  </div>
                  <div>
                    <Label>Meeting Link</Label>
                    <Input value={editMeetingLink} onChange={(e) => setEditMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" />
                  </div>
                  <div>
                    <Label>Score (1-10)</Label>
                    <Input type="number" min={1} max={10} value={editScore} onChange={(e) => setEditScore(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Feedback</Label>
                    <Textarea rows={2} value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} placeholder="Interview notes…" />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button size="sm" onClick={() => saveEdit(iv.id)} disabled={saving}>
                      <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X size={14} /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{iv.applications?.full_name}</p>
                    <p className="text-xs text-ink-500 capitalize">{iv.stage.replace('_', ' ')} · {iv.applications?.application_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-ink-500">{formatDate(iv.scheduled_at, { hour: '2-digit', minute: '2-digit' })}</span>
                    {iv.meeting_link && (
                      <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600">
                        <Video size={14} /> Join
                      </a>
                    )}
                    <Badge
                      tone={iv.completed ? 'brand' : 'amber'}
                      className="cursor-pointer"
                      onClick={() => toggleComplete(iv)}
                    >
                      {iv.completed ? 'Completed' : 'Scheduled'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => openEdit(iv)}>
                      <Pencil size={13} /> Reschedule / Edit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {interviews.length === 0 && (
          <Card>
            <CardContent className="px-5 py-10 text-center text-ink-400">
              <CalendarCheck className="mx-auto mb-2 text-ink-200" size={28} />
              No interviews scheduled yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
