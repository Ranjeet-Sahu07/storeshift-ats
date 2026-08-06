'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { Search, Filter, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';
import { generateApplicationId } from '@/lib/ids';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@/types';

const STATUS_TONE: Record<ApplicationStatus, 'brand' | 'amber' | 'coral' | 'default'> = {
  submitted: 'default', under_review: 'amber', shortlisted: 'brand', assignment_sent: 'amber',
  interview_scheduled: 'brand', interviewed: 'brand', on_hold: 'amber', selected: 'brand',
  rejected: 'coral', withdrawn: 'default',
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('applications').select('*').order('submitted_at', { ascending: false });
    setApps((data as Application[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = apps.filter((a) => {
    const matchesQuery =
      !query ||
      a.full_name.toLowerCase().includes(query.toLowerCase()) ||
      a.application_id.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || a.status === status;
    return matchesQuery && matchesStatus;
  });

  function exportCsv() {
    const rows = [
      ['Application ID', 'Name', 'Email', 'Role', 'Status', 'Submitted'],
      ...filtered.map((a) => [a.application_id, a.full_name, a.email, a.preferred_role ?? '', a.status, a.submitted_at]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applications.csv';
    a.click();
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const supabase = createClient();
        let imported = 0;
        let failed = 0;
        let seq = apps.length + 1;

        for (const row of rows) {
          const fullName = row['Name'] || row['full_name'] || row['Full Name'];
          const email = row['Email'] || row['email'];
          if (!fullName || !email) { failed++; continue; }

          const { error } = await supabase.from('applications').insert({
            application_id: generateApplicationId(seq++),
            full_name: fullName,
            email,
            phone: row['Phone'] || row['phone'] || 'N/A',
            college: row['College'] || row['college'] || null,
            preferred_role: row['Role'] || row['preferred_role'] || null,
            skills: (row['Skills'] || row['skills'] || '').split(',').map((s) => s.trim()).filter(Boolean),
            status: (row['Status'] || row['status'] || 'submitted').toLowerCase().replace(/\s+/g, '_') as ApplicationStatus,
            city: row['City'] || row['city'] || null,
            state: row['State'] || row['state'] || null,
            declaration_accepted: true,
          });

          if (error) failed++; else imported++;
        }

        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success(`Imported ${imported} application(s)${failed ? ` — ${failed} row(s) skipped (missing name/email or invalid data)` : ''}`);
        load();
      },
      error: (err) => {
        setImporting(false);
        toast.error(`Couldn't read that file: ${err.message}`);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Applications</h1>
          <p className="text-sm text-ink-500">{filtered.length} of {apps.length} applications</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
          <Button variant="outline" onClick={triggerImport} disabled={importing}>
            <Upload size={16} /> {importing ? 'Importing…' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={exportCsv}><Download size={16} /> Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-100 px-3 py-2 sm:max-w-xs">
            <Search size={16} className="text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, ID…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-ink-400" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!h-9 !w-48">
              <option value="all">All Statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="space-y-2 p-5">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Application ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">College</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                    <td className="px-5 py-3 font-mono text-xs text-ink-500">{a.application_id}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/applicants/${a.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                        {a.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-600">{a.preferred_role}</td>
                    <td className="px-5 py-3 text-ink-600">{a.college}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-400">{formatDate(a.submitted_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No applications match your filters.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
