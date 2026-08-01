import { Github, ExternalLink, GitPullRequest } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function InternGithubPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const { data: internship } = await supabase.from('internships').select('*').eq('intern_id', profile!.id).eq('status', 'active').maybeSingle();
  const { data: tasks } = internship
    ? await supabase.from('tasks').select('*').eq('internship_id', internship.id).not('pull_request_url', 'is', null)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">GitHub Repository</h1>
        <p className="text-sm text-ink-500">Your assigned repository and open pull requests.</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-white"><Github size={20} /></span>
            <div>
              <p className="font-display font-semibold text-ink-900">{internship?.department ?? 'Your'} Project Repository</p>
              <p className="text-sm text-ink-400">{internship?.github_repo_url ?? 'Not linked yet — ask your mentor to link a repo.'}</p>
            </div>
          </div>
          {internship?.github_repo_url && (
            <a href={internship.github_repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-brand-600">
              Open <ExternalLink size={14} />
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pull Requests from Your Tasks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(tasks ?? []).map((t: any) => (
            <a key={t.id} href={t.pull_request_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-ink-50 p-3 hover:bg-mist">
              <div className="flex items-center gap-2">
                <GitPullRequest size={16} className="text-brand-500" />
                <span className="text-sm font-medium text-ink-900">{t.title}</span>
              </div>
              <Badge tone="brand">{t.status.replace('_', ' ')}</Badge>
            </a>
          ))}
          {(!tasks || tasks.length === 0) && <p className="text-sm text-ink-400">No pull requests linked yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
