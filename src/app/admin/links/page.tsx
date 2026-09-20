'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, Link2, Power, Trash2, Home, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { generateLinkCode } from '@/lib/ids';
import { OPTIONAL_FIELD_REGISTRY } from '@/lib/validation/application';
import { formatDate, cn } from '@/lib/utils';
import type { ApplicationLink } from '@/types';

export default function LinksPage() {
  const [links, setLinks] = useState<ApplicationLink[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; selected: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [prefix, setPrefix] = useState('FE');
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [linksRes, appsRes] = await Promise.all([
      supabase.from('application_links').select('*').order('created_at', { ascending: false }),
      supabase.from('applications').select('link_id, status'),
    ]);
    setLinks((linksRes.data as ApplicationLink[]) ?? []);

    const s: Record<string, { total: number; selected: number }> = {};
    (appsRes.data ?? []).forEach((a: any) => {
      if (!a.link_id) return;
      if (!s[a.link_id]) s[a.link_id] = { total: 0, selected: 0 };
      s[a.link_id].total += 1;
      if (a.status === 'selected') s[a.link_id].selected += 1;
    });
    setStats(s);
    setLoading(false);
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
      required_fields: [...requiredFields], show_on_homepage: showOnHomepage,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Application link generated');
    setLabel(''); setRoleTitle(''); setDepartment(''); setRequiredFields(new Set()); setShowOnHomepage(false); setShowForm(false);
    load();
  }

  async function toggleActive(link: ApplicationLink) {
    const supabase = createClient();
    await supabase.from('application_links').update({ is_active: !link.is_active }).eq('id', link.id);
    load();
  }

  async function toggleHomepage(link: ApplicationLink) {
    const supabase = createClient();
    const { error } = await supabase.from('application_links').update({ show_on_homepage: !link.show_on_homepage }).eq('id', link.id);
    if (error) { toast.error(error.message); return; }
    toast.success(link.show_on_homepage ? 'Removed from careers homepage' : 'Now showing on careers homepage');
    load();
  }

  async function deleteLink(link: ApplicationLink) {
    setDeletingId(link.id);
    const supabase = createClient();
    const { error } = await supabase.from('application_links').delete().eq('id', link.id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (error) {
      toast.error(
        error.message.includes('foreign key')
          ? "Can't delete — this link has applications tied to it. Deactivate it instead."
          : error.message
      );
      return;
    }
    toast.success('Link deleted');
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
          <p className="text-sm text-ink-500">Generate unlimited unique links, control what shows on the homepage, and track results per link.</p>
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

            <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 p-3">
              <input type="checkbox" checked={showOnHomepage} onChange={(e) => setShowOnHomepage(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-ink-700">
                <span className="block font-medium text-ink-900">Show on careers homepage</span>
                <span className="block text-xs text-ink-400">Featured in "Currently Hiring" on careers.storeshift.in. Leave unchecked to share this link privately without publishing it.</span>
              </span>
            </label>

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

      {loading ? <PageSkeleton rows={4} /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-50 bg-mist/60 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Label</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Applications</th>
                  <th className="px-5 py-3 font-medium">Selected</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Homepage</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const s = stats[l.id] ?? { total: 0, selected: 0 };
                  return (
                    <tr key={l.id} className="border-b border-ink-50 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3 font-medium text-ink-900">{l.label}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{l.code}</td>
                      <td className="px-5 py-3 text-ink-600">{l.role_title}</td>
                      <td className="px-5 py-3">
                        <Badge tone="default"><Users size={11} className="mr-1" />{s.total}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={s.selected > 0 ? 'brand' : 'default'}><CheckCircle2 size={11} className="mr-1" />{s.selected}</Badge>
                      </td>
                      <td className="px-5 py-3 text-ink-400">{formatDate(l.created_at)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={l.is_active ? 'brand' : 'default'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => toggleHomepage(l)} title={l.show_on_homepage ? 'Showing on homepage — click to hide' : 'Not on homepage — click to show'}>
                          <Badge tone={l.show_on_homepage ? 'brand' : 'default'}>
                            <Home size={11} className="mr-1" />{l.show_on_homepage ? 'Visible' : 'Hidden'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        {confirmDeleteId === l.id ? (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="danger" disabled={deletingId === l.id} onClick={() => deleteLink(l)}>
                              {deletingId === l.id ? 'Deleting…' : 'Confirm'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => copyUrl(l.code)} title="Copy link"><Copy size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleActive(l)} title={l.is_active ? 'Deactivate' : 'Activate'}><Power size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(l.id)} title="Delete link" className="hover:!text-coral-500"><Trash2 size={14} /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {links.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-ink-400">
                    <Link2 className="mx-auto mb-2 text-ink-200" size={28} />
                    No application links yet — generate your first one above.
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
