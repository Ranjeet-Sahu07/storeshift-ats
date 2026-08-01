import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default async function AttendancePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const { data: internship } = await supabase.from('internships').select('id').eq('intern_id', profile!.id).eq('status', 'active').maybeSingle();
  const { data: records } = internship
    ? await supabase.from('attendance').select('*').eq('internship_id', internship.id).order('date', { ascending: false })
    : { data: [] };

  const present = (records ?? []).filter((r: any) => r.status === 'present').length;
  const total = (records ?? []).length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const toneMap: Record<string, any> = { present: 'brand', absent: 'coral', leave: 'default', half_day: 'amber' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Attendance</h1>
        <p className="text-sm text-ink-500">{pct}% present across {total} recorded days.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Attendance Log</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Note</th></tr>
            </thead>
            <tbody>
              {(records ?? []).map((r: any) => (
                <tr key={r.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 text-ink-700">{formatDate(r.date)}</td>
                  <td className="px-5 py-3"><Badge tone={toneMap[r.status]}>{r.status.replace('_', ' ')}</Badge></td>
                  <td className="px-5 py-3 text-ink-400">{r.note ?? '—'}</td>
                </tr>
              ))}
              {(!records || records.length === 0) && <tr><td colSpan={3} className="px-5 py-10 text-center text-ink-400">No attendance recorded yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
