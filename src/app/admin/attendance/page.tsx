'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', tone: 'brand' as const },
  { value: 'absent', label: 'Absent', tone: 'coral' as const },
  { value: 'half_day', label: 'Half Day', tone: 'amber' as const },
  { value: 'leave', label: 'Leave', tone: 'default' as const },
];

export default function AttendancePage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [bulking, setBulking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data: internList } = await supabase
      .from('internships')
      .select('*, profiles!internships_intern_id_fkey(full_name, avatar_url)')
      .eq('status', 'active');
    setInternships(internList ?? []);

    const { data: attendanceRows } = await supabase.from('attendance').select('*').eq('date', date);
    const map: Record<string, any> = {};
    (attendanceRows ?? []).forEach((r: any) => { map[r.internship_id] = r; });
    setRecords(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  async function markStatus(internshipId: string, status: string) {
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
      .filter((i) => !records[i.id])
      .map((i) => ({ internship_id: i.id, date, status: 'present', marked_by: user?.id }));

    if (rows.length === 0) { toast.info('Everyone already has attendance marked for this day'); setBulking(false); return; }

    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'internship_id,date' });
    setBulking(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${rows.length} intern(s) present`);
    load();
  }

  const unmarkedCount = internships.filter((i) => !records[i.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Attendance</h1>
          <p className="text-sm text-ink-500">Mark daily attendance for active interns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-auto" max={new Date().toISOString().slice(0, 10)} />
          {unmarkedCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllPresent} disabled={bulking}>
              <CheckCircle2 size={14} /> Mark {unmarkedCount} Remaining Present
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{formatDate(date)}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <PageSkeleton rows={3} />}
          {!loading && internships.map((i) => {
            const record = records[i.id];
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-50 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{i.profiles?.full_name}</p>
                  <p className="text-xs text-ink-400">{i.role_title}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={saving === i.id}
                      onClick={() => markStatus(i.id, opt.value)}
                    >
                      <Badge tone={record?.status === opt.value ? opt.tone : 'default'} className={record?.status === opt.value ? '' : 'opacity-50 hover:opacity-100'}>
                        {opt.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!loading && internships.length === 0 && (
            <p className="px-1 py-8 text-center text-sm text-ink-400">
              <ClipboardCheck className="mx-auto mb-2 text-ink-200" size={28} />
              No active interns to mark attendance for.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
