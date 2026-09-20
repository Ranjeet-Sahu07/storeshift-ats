'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, PauseCircle, Video, Trophy,
  Mail, Phone, MapPin, GraduationCap, Github, Linkedin, Link as LinkIcon, FileText, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/ui/progress';
import { formatDate, cn } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@/types';

const ACTIONS: { status: ApplicationStatus; label: string; icon: any; variant: any }[] = [
  { status: 'shortlisted', label: 'Shortlist', icon: CheckCircle2, variant: 'outline' },
  { status: 'interview_scheduled', label: 'Move to Interview', icon: Video, variant: 'outline' },
  { status: 'on_hold', label: 'Put on Hold', icon: PauseCircle, variant: 'outline' },
  { status: 'selected', label: 'Select', icon: Trophy, variant: 'primary' },
  { status: 'rejected', label: 'Reject', icon: XCircle, variant: 'danger' },
];

const STATUS_TONE: Record<ApplicationStatus, 'brand' | 'amber' | 'coral' | 'default'> = {
  submitted: 'default', under_review: 'amber', shortlisted: 'brand', assignment_sent: 'amber',
  interview_scheduled: 'brand', interviewed: 'brand', on_hold: 'amber', selected: 'brand',
  rejected: 'coral', withdrawn: 'default',
};

export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [noteText, setNoteText] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase.from('applications').select('*').eq('id', id).single();
    if (error) {
      toast.error(`Couldn't load this applicant: ${error.message}`);
      setLoading(false);
      return;
    }
    setApp(data as Application);
    setNotes(data?.admin_notes ?? '');
    const { data: ev } = await supabase
      .from('application_events')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false });
    setEvents(ev ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: ApplicationStatus) {
    if (!app || pendingStatus) return;
    setPendingStatus(status);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const previousStatus = app.status;

    // .select().single() so we get the row back and can confirm the write
    // actually landed (an RLS policy silently rejecting an update returns
    // no error but also no changed row — this catches that case instead of
    // showing a false "success").
    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', app.id)
      .select()
      .single();

    if (error || !updated) {
      toast.error(error?.message ?? "Status didn't update — you may not have permission for this action.");
      setPendingStatus(null);
      return;
    }

    // Update local state immediately from the confirmed row instead of
    // waiting on a full reload.
    setApp(updated as Application);

    const { data: eventRow } = await supabase
      .from('application_events')
      .insert({
        application_id: app.id, actor_id: user?.id, event_type: 'status_change',
        from_status: previousStatus, to_status: status,
      })
      .select()
      .single();

    if (eventRow) setEvents((prev) => [eventRow, ...prev]);

    toast.success(`Marked as ${APPLICATION_STATUS_LABELS[status]}`);
    setPendingStatus(null);
  }

  async function saveNotes() {
    if (!app) return;
    setSavingNotes(true);
    const supabase = createClient();
    const { error } = await supabase.from('applications').update({ admin_notes: notes }).eq('id', app.id);
    setSavingNotes(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Notes saved');
  }

  async function addNote() {
    if (!app || !noteText.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('admin_notes').insert({ application_id: app.id, author_id: user?.id, note: noteText });
    if (error) { toast.error(error.message); return; }
    setNoteText('');
    toast.success('Note added');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }
  if (!app) return <p className="text-sm text-ink-400">Application not found.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={app.full_name} className="h-14 w-14 text-lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">{app.full_name}</h1>
            <p className="text-sm text-ink-500">{app.preferred_role} · {app.application_id}</p>
          </div>
        </div>
        <Badge tone={STATUS_TONE[app.status]} className="!text-sm !px-3 !py-1">{APPLICATION_STATUS_LABELS[app.status]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => {
          const isCurrent = app.status === a.status;
          const isPending = pendingStatus === a.status;
          return (
            <Button
              key={a.status}
              variant={isCurrent ? 'secondary' : a.variant}
              size="sm"
              onClick={() => updateStatus(a.status)}
              disabled={isCurrent || pendingStatus !== null}
              className={cn(isCurrent && 'ring-2 ring-ink-900/20')}
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <a.icon size={15} />}
              {isCurrent ? `Currently: ${a.label}` : a.label}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Personal & Contact</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Info icon={Mail} label={app.email} />
              <Info icon={Phone} label={app.phone} />
              <Info icon={MapPin} label={[app.city, app.state].filter(Boolean).join(', ') || '—'} />
              <Info icon={GraduationCap} label={`${app.degree ?? ''} ${app.branch ?? ''}`.trim() || '—'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Education</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Field label="College" value={app.college} />
              <Field label="Graduation Year" value={app.graduation_year?.toString()} />
              <Field label="CGPA" value={app.cgpa?.toString()} />
              <Field label="10th %" value={app.tenth_percentage != null ? `${app.tenth_percentage}%` : undefined} />
              <Field label="12th %" value={app.twelfth_percentage != null ? `${app.twelfth_percentage}%` : undefined} />
              <Field label="Graduation %" value={app.graduation_percentage != null ? `${app.graduation_percentage}%` : undefined} />
              <Field label="Skills" value={app.skills?.join(', ')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Links & Documents</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {app.resume_url ? (
                <a href={app.resume_url} target="_blank" rel="noreferrer">
                  <DocChip icon={FileText} label="Open Resume" highlight />
                </a>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-100 px-3 py-1.5 text-xs text-ink-400">
                  <FileText size={14} /> No resume link provided
                </span>
              )}
              {app.github_url && <a href={app.github_url} target="_blank" rel="noreferrer"><DocChip icon={Github} label="GitHub" /></a>}
              {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer"><DocChip icon={Linkedin} label="LinkedIn" /></a>}
              {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer"><DocChip icon={LinkIcon} label="Portfolio" /></a>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Questionnaire</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {Object.entries(app.questionnaire || {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-semibold uppercase text-ink-400">{k.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-ink-700">{v as string}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Admin Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Internal notes visible only to staff…" />
              <Button size="sm" onClick={saveNotes} disabled={savingNotes}>{savingNotes ? 'Saving…' : 'Save Notes'}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Application Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} placeholder="Add a timeline note…" />
              </div>
              <Button size="sm" variant="outline" onClick={addNote}>Add Note</Button>
              <div className="space-y-3 border-t border-ink-50 pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm text-ink-700">Application submitted</p>
                    <p className="text-xs text-ink-400">{formatDate(app.submitted_at)}</p>
                  </div>
                </div>
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink-200" />
                    <div>
                      <p className="text-sm text-ink-700">
                        Status changed to <strong>{APPLICATION_STATUS_LABELS[e.to_status as ApplicationStatus] ?? e.to_status}</strong>
                      </p>
                      <p className="text-xs text-ink-400">{formatDate(e.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-600">
      <Icon size={15} className="text-ink-400" /> {label}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-medium text-ink-900">{value || '—'}</p>
    </div>
  );
}

function DocChip({ icon: Icon, label, highlight }: { icon: any; label: string; highlight?: boolean }) {
  return (
    <span className={cn(
      'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium',
      highlight
        ? 'border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100'
        : 'border-ink-100 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-600'
    )}>
      <Icon size={14} /> {label}
    </span>
  );
}
