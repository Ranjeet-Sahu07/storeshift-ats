'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, Link2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { generateLinkCode } from '@/lib/ids';
import { OPTIONAL_FIELD_REGISTRY } from '@/lib/validation/application';
import { formatDate, cn } from '@/lib/utils';
import type { ApplicationLink } from '@/types';

export default function LinksPage() {
  const [links, setLinks] = useState<ApplicationLink[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [prefix, setPrefix] = useState('FE');
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('application_links').select('*').order('created_at', { ascending: false });
    setLinks((data as ApplicationLink[]) ?? []);

    const { data: apps } = await supabase.from('applications').select('link_id');
    const c: Record<string, number> = {};
    (apps ?? []).forEach((a: any) => { if (a.link_id) c[a.link_id] = (c[a.link_id] ?? 0) + 1; });
    setCounts(c);
  }

  useEffect(() => { load(); }, []);

  function toggleRequired(key: string) {
    setRequiredFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function createLink() {
    if (!label || !roleTitle) { toast.error('Label and role title are required'); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const code = generateLinkCode(prefix || 'GEN');
    const { error } = await supabase.from('application_links').insert({
      code, label, role_title: roleTitle, department: department || null, created_by: user?.id,
      required_fields: [...requiredFields],
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Application link generated');
    setLabel(''); setRoleTitle(''); setDepartment(''); setRequiredFields(new Set()); setShowForm(false);
    load();
  }

  async function toggleActive(link: ApplicationLink) {
    const supabase = createClient();
    await supabase.from('application_links').update({ is_active: !link.is_active }).eq('id', link.id);
    load();
  }

  function copyUrl(code: string) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in'}/apply/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Application Links</h1>
          <p className="text-sm text-ink-500">Generate unlimited unique links and track applications per link.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}><Plus size={16} /> Generate Link</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Application Link</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Internal Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Frontend Intern - LinkedIn Post" />
              </div>
              <div>
                <Label>Role Title</Label>
                <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Frontend Developer Intern" />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" />
              </div>
              <div>
                <Label>Code Prefix</Label>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 4))} placeholder="FE" />
              </div>
            </div>

            <div>
              <Label>Which optional fields should be required on this form?</Label>
              <p className="mb-2 text-xs text-ink-400">Everything else (name, email, resume link, etc.) is always required. Tick anything extra you need for this role.</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_FIELD_REGISTRY.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleRequired(f.key)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      requiredFields.has(f.key) ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-100 bg-white text-ink-600 hover:border-brand-300'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={createLink}>Generate Link</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Label</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Required Extras</th>
                <th className="px-5 py-3 font-medium">Applications</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3 font-medium text-ink-900">{l.label}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{l.code}</td>
                  <td className="px-5 py-3 text-ink-600">{l.role_title}</td>
                  <td className="px-5 py-3 text-xs text-ink-500">
                    {l.required_fields?.length
                      ? l.required_fields
                          .map((k: string) => OPTIONAL_FIELD_REGISTRY.find((f) => f.key === k)?.label ?? k)
                          .join(', ')
                      : <span className="text-ink-300">Defaults only</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="brand">{counts[l.id] ?? 0}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-400">{formatDate(l.created_at)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={l.is_active ? 'brand' : 'default'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => copyUrl(l.code)}><Copy size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(l)}><Power size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-400">
                  <Link2 className="mx-auto mb-2 text-ink-200" size={28} />
                  No application links yet — generate your first one above.
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
