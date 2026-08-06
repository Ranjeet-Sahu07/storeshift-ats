import Link from 'next/link';
import { CheckCircle2, ListChecks, CalendarCheck, Github } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default async function InternDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: internship } = await supabase
    .from('internships')
    .select('*')
    .eq('intern_id', profile!.id)
    .eq('status', 'active')
    .maybeSingle();

  let tasks: any[] = [];
  let attendance: any[] = [];
  if (internship) {
    const { data: t } = await supabase.from('tasks').select('*').eq('internship_id', internship.id);
    tasks = t ?? [];
    const { data: a } = await supabase.from('attendance').select('*').eq('internship_id', internship.id);
    attendance = a ?? [];
  }

  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const present = attendance.filter((a) => a.status === 'present').length;
  const attendancePct = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  if (!internship) {
    return (
      <div className="rounded-2xl border border-ink-50 bg-white p-10 text-center">
        <h1 className="font-display text-xl font-bold text-ink-900">Welcome, {profile?.full_name}</h1>
        <p className="mt-2 text-sm text-ink-500">Your internship record hasn't been set up yet. Please check with your mentor or HR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Welcome back, {profile?.full_name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-ink-500">Keep going — you're making great progress on {internship.role_title}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tasks Completed" value={done} icon={CheckCircle2} tone="brand" />
        <StatCard label="Total Tasks" value={total} icon={ListChecks} tone="ink" />
        <StatCard label="Attendance" value={`${attendancePct}%`} icon={CalendarCheck} tone="amber" />
        <StatCard label="GitHub Repo" value={internship.github_repo_url ? 'Linked' : 'Not linked'} icon={Github} tone="brand" />
      </div>

      <Card>
        <CardHeader><CardTitle>Internship Progress</CardTitle></CardHeader>
        <CardContent>
          <p className="font-display text-3xl font-bold text-ink-900">{progress}%</p>
          <Progress value={progress} className="mt-3" />
          <p className="mt-2 text-sm text-ink-500">
            {progress >= 100 ? "You've completed your internship tasks!" : "Great! You're on track to complete your internship."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Board</CardTitle>
          <Link href="/dashboard/tasks" className="text-sm font-medium text-brand-600">View Board</Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {['todo', 'in_progress', 'done'].map((status) => (
            <div key={status} className="rounded-xl bg-mist p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-ink-400">{status.replace('_', ' ')}</p>
              <div className="space-y-1.5">
                {tasks.filter((t) => t.status === status).slice(0, 3).map((t) => (
                  <div key={t.id} className="rounded-lg bg-white px-2.5 py-1.5 text-xs text-ink-700 shadow-sm">{t.title}</div>
                ))}
                {tasks.filter((t) => t.status === status).length === 0 && (
                  <p className="text-xs text-ink-300">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
