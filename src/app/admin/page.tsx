import { Users, FileSearch, CalendarCheck, UserCheck, Handshake, Plus } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/admin/stat-card';
import { FunnelChart } from '@/components/admin/funnel-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS } from '@/types';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [{ count: total }, { count: underReview }, { count: interviews }, { count: selected }, { data: recent }] =
    await Promise.all([
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
      supabase.from('interviews').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'selected'),
      supabase.from('applications').select('*').order('submitted_at', { ascending: false }).limit(5),
    ]);

  const stageCounts: Record<string, number> = {};
  for (const status of ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'selected'] as const) {
    const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', status);
    stageCounts[status] = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500">Here&apos;s what&apos;s happening with your hiring pipeline.</p>
        </div>
        <Link href="/admin/links">
          <Button><Plus size={16} /> Generate Application Link</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applicants" value={total ?? 0} icon={Users} tone="brand" />
        <StatCard label="In Review" value={underReview ?? 0} icon={FileSearch} tone="amber" />
        <StatCard label="Interviews Scheduled" value={interviews ?? 0} icon={CalendarCheck} tone="ink" />
        <StatCard label="Hired" value={selected ?? 0} icon={Handshake} tone="brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Hiring Pipeline</CardTitle></CardHeader>
          <CardContent>
            <FunnelChart
              stages={[
                { label: 'Applications', value: stageCounts.submitted + stageCounts.under_review + stageCounts.shortlisted + stageCounts.interview_scheduled + stageCounts.selected },
                { label: 'Under Review', value: stageCounts.under_review },
                { label: 'Shortlisted', value: stageCounts.shortlisted },
                { label: 'Interview', value: stageCounts.interview_scheduled },
                { label: 'Selected', value: stageCounts.selected },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Applicants</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-4">
            {(recent ?? []).length === 0 && <p className="px-1 text-sm text-ink-400">No applications yet.</p>}
            {(recent ?? []).map((a: any) => (
              <Link
                key={a.id}
                href={`/admin/applicants/${a.id}`}
                className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-mist"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{a.full_name}</p>
                  <p className="text-xs text-ink-400">{a.preferred_role}</p>
                </div>
                <Badge tone="brand">{APPLICATION_STATUS_LABELS[a.status as keyof typeof APPLICATION_STATUS_LABELS]}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <Link href="/admin/applications" className="text-sm font-medium text-brand-600">View All</Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((a: any) => (
                <tr key={a.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3">
                    <Link href={`/admin/applicants/${a.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {a.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{a.preferred_role}</td>
                  <td className="px-5 py-3"><Badge tone="brand">{APPLICATION_STATUS_LABELS[a.status as keyof typeof APPLICATION_STATUS_LABELS]}</Badge></td>
                  <td className="px-5 py-3 text-ink-400">{formatDate(a.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
