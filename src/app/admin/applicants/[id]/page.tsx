'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, PauseCircle, Video, Trophy,
  Mail, Phone, MapPin, GraduationCap, Github, Linkedin, Link as LinkIcon, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@/types';

const ACTIONS: { status: ApplicationStatus; label: string; icon: any; variant: any }[] = [
  { status: 'shortlisted', label: 'Shortlist', icon: CheckCircle2, variant: 'outline' },
  { status: 'interview_scheduled', label: 'Move to Interview', icon: Video, variant: 'outline' },
  { status: 'on_hold', label: 'Put on Hold', icon: PauseCircle, variant: 'outline' },
  { status: 'selected', label: 'Select', icon: Trophy, variant: 'primary' },
  { status: 'rejected', label: 'Reject', icon: XCircle, variant: 'danger' },
];

export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [noteText, setNoteText] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('applications').select('*').eq('id', id).single();
    setApp(data as Application);
    setNotes(data?.admin_notes ?? '');
    const { data: ev } = await supabase.from('application_events').select('*').eq('application_id', id).order('created_at', { ascending: false });
    setEvents(ev ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: ApplicationStatus) {
    if (!app) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('applications').update({ status }).eq('id', app.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('application_events').insert({
      application_id: app.id, actor_id: user?.id, event_type: 'status_change',
      from_status: app.status, to_status: status,
    });
    toast.success(`Application marked as ${APPLICATION_STATUS_LABELS[status]}`);
    load();
  }

  async function saveNotes() {
    if (!app) return;
    const supabase = createClient();
    await supabase.from('applications').update({ admin_notes: notes }).eq('id', app.id);
    toast.success('Notes saved');
  }

  async function addNote() {
    if (!app || !noteText.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_notes').insert({ application_id: app.id, author_id: user?.id, note: noteText });
    setNoteText('');
    toast.success('Note added');
  }

  if (loading) return <p className="text-sm text-ink-400">Loading…</p>;
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
        <Badge tone="brand" className="!text-sm">{APPLICATION_STATUS_LABELS[app.status]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.status} variant={a.variant} size="sm" onClick={() => updateStatus(a.status)}>
            <a.icon size={15} /> {a.label}
          </Button>
        ))}
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
              <Field label="Skills" value={app.skills?.join(', ')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Links & Documents</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {app.resume_path && <DocChip icon={FileText} label="Resume" />}
              {app.github_url && <a href={app.github_url} target="_blank" rel="noreferrer"><DocChip icon={Github} label="GitHub" /></a>}
              {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer"><DocChip icon={Linkedin} label="LinkedIn" /></a>}
              {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer"><DocChip icon={LinkIcon} label="Portfolio" /></a>}
              {!app.resume_path && !app.github_url && !app.linkedin_url && !app.portfolio_url && (
                <p className="text-sm text-ink-400">No documents provided.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Questionnaire</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {Object.entries(app.questionnaire || {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-semibold uppercase text-ink-400">{k.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-ink-700">{v}</p>
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
              <Button size="sm" onClick={saveNotes}>Save Notes</Button>
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

function DocChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-600">
      <Icon size={14} /> {label}
    </span>
  );
}
