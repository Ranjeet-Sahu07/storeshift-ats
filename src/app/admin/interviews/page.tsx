'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Video } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [stage, setStage] = useState('hr_screening');
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

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
      application_id: applicationId, stage, scheduled_at: scheduledAt,
      meeting_link: meetingLink || null, interviewer_id: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('applications').update({ status: 'interview_scheduled' }).eq('id', applicationId);
    toast.success('Interview scheduled');
    setShowForm(false); setApplicationId(''); setScheduledAt(''); setMeetingLink('');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Interviews</h1>
          <p className="text-sm text-ink-500">Schedule and track HR, technical, and final round interviews.</p>
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
            <div className="sm:col-span-2">
              <Button onClick={schedule}>Confirm Schedule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Applicant</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
                <th className="px-5 py-3 font-medium">Link</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3 font-medium text-ink-900">{iv.applications?.full_name}</td>
                  <td className="px-5 py-3 text-ink-600 capitalize">{iv.stage.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-ink-400">{formatDate(iv.scheduled_at, { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3">
                    {iv.meeting_link ? (
                      <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600">
                        <Video size={14} /> Join
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={iv.completed ? 'brand' : 'amber'}>{iv.completed ? 'Completed' : 'Scheduled'}</Badge>
                  </td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">
                  <CalendarCheck className="mx-auto mb-2 text-ink-200" size={28} />
                  No interviews scheduled yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
