'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('email_templates').select('*').order('category');
    setTemplates(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('email_templates')
      .update({ subject: editing.subject, body_html: editing.body_html })
      .eq('id', editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Template saved');
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Email templates and platform configuration.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Email Templates</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-ink-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-400">{t.category}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
              </div>
              {editing?.id === t.id && (
                <div className="mt-4 space-y-3 border-t border-ink-50 pt-4">
                  <div>
                    <Label>Subject</Label>
                    <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
                  </div>
                  <div>
                    <Label>Body (HTML, supports {'{{tokens}}'})</Label>
                    <Textarea rows={5} value={editing.body_html} onChange={(e) => setEditing({ ...editing, body_html: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={save}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Email Provider</CardTitle></CardHeader>
        <CardContent className="text-sm text-ink-600">
          <p>
            Configured via the <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">EMAIL_PROVIDER</code> environment
            variable (currently pluggable between <strong>console</strong> logging for development and{' '}
            <strong>Resend</strong> for production — see <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">src/lib/email/service.ts</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
