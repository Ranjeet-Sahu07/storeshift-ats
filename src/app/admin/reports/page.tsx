import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FunnelChart } from '@/components/admin/funnel-chart';
import { StatCard } from '@/components/admin/stat-card';
import { Users, Award, ListChecks, Building2 } from 'lucide-react';

export default async function ReportsPage() {
  const supabase = createClient();

  const [{ count: totalApps }, { count: certs }, { data: applications }, { data: internships }] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('status, college'),
    supabase.from('internships').select('department, status'),
  ]);

  const statusCounts: Record<string, number> = {};
  (applications ?? []).forEach((a: any) => { statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1; });

  const collegeCounts: Record<string, number> = {};
  (applications ?? []).forEach((a: any) => {
    const key = a.college || 'Unknown';
    collegeCounts[key] = (collegeCounts[key] ?? 0) + 1;
  });
  const topColleges = Object.entries(collegeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const deptCounts: Record<string, number> = {};
  (internships ?? []).forEach((i: any) => { deptCounts[i.department] = (deptCounts[i.department] ?? 0) + 1; });

  const activeInterns = (internships ?? []).filter((i: any) => i.status === 'active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Reports & Analytics</h1>
        <p className="text-sm text-ink-500">Hiring funnel, task completion, and program-wide statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={totalApps ?? 0} icon={Users} tone="brand" />
        <StatCard label="Certificates Issued" value={certs ?? 0} icon={Award} tone="brand" />
        <StatCard label="Active Interns" value={activeInterns} icon={ListChecks} tone="amber" />
        <StatCard label="Departments" value={Object.keys(deptCounts).length} icon={Building2} tone="ink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent>
            <FunnelChart stages={Object.entries(statusCounts).map(([label, value]) => ({ label: label.replace('_', ' '), value }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>College-wise Applications</CardTitle></CardHeader>
          <CardContent>
            <FunnelChart stages={topColleges.map(([label, value]) => ({ label, value }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Department-wise Interns</CardTitle></CardHeader>
        <CardContent>
          <FunnelChart stages={Object.entries(deptCounts).map(([label, value]) => ({ label, value }))} />
        </CardContent>
      </Card>
    </div>
  );
}
