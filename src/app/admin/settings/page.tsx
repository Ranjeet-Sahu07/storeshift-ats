'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Send, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';

const PROVIDER_LABEL: Record<string, string> = { console: 'Console (dev only)', resend: 'Resend', smtp: 'SMTP' };

export default function SettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [letterTemplates, setLetterTemplates] = useState<any[]>([]);
  const [editingLetter, setEditingLetter] = useState<any | null>(null);
  const [savingLetter, setSavingLetter] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ provider: string; configured: boolean } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const [templatesRes, letterRes, statusRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('category'),
      supabase.from('letter_templates').select('*').order('type'),
      fetch('/api/settings/email-status'),
    ]);
    setTemplates(templatesRes.data ?? []);
    setLetterTemplates(letterRes.data ?? []);
    if (statusRes.ok) setEmailStatus(await statusRes.json());
    setLoading(false);
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

  async function saveLetterTemplate() {
    if (!editingLetter) return;
    setSavingLetter(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('letter_templates')
      .update({
        title: editingLetter.title,
        body_template: editingLetter.body_template,
        signatory_name: editingLetter.signatory_name,
        signatory_title: editingLetter.signatory_title,
        updated_by: user?.id,
      })
      .eq('id', editingLetter.id);
    setSavingLetter(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Letter template saved — future generations will use this wording');
    setEditingLetter(null);
    load();
  }

  async function sendTest() {
    if (!testEmail) { toast.error('Enter an email address first'); return; }
    setSendingTest(true);
    try {
      const res = await fetch('/api/settings/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.status === 'sent') {
        toast.success(
          emailStatus?.provider === 'console'
            ? "Logged to server console — you're on the console provider, so no real email was sent."
            : `Test email sent to ${testEmail}`
        );
      } else {
        toast.error(data.error ?? 'Failed to send test email');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingTest(false);
    }
  }

  const availableTokens: Record<string, string[]> = {
    offer_letter: ['full_name', 'role_title', 'department', 'duration_months', 'start_date', 'official_email'],
    lor: ['full_name', 'role_title', 'department', 'duration_months'],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Email delivery, and the wording used for generated documents.</p>
      </div>

      {loading ? <PageSkeleton rows={3} /> : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery</CardTitle>
              {emailStatus && (
                <Badge tone={emailStatus.provider === 'console' ? 'amber' : 'brand'}>
                  {PROVIDER_LABEL[emailStatus.provider] ?? emailStatus.provider}{emailStatus.provider !== 'console' ? ' — active' : ''}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {emailStatus?.provider === 'console' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm text-amber-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Emails aren't actually being delivered right now.</p>
                    <p className="mt-1 text-amber-700/80">
                      You're on the <code className="rounded bg-white/60 px-1 font-mono text-xs">console</code> provider —
                      outbound emails are only logged on the server, not sent. Set{' '}
                      <code className="rounded bg-white/60 px-1 font-mono text-xs">EMAIL_PROVIDER=smtp</code> to send through
                      Gmail/Google Workspace SMTP (see <code className="rounded bg-white/60 px-1 font-mono text-xs">.env.example</code> for
                      the exact variables), or <code className="rounded bg-white/60 px-1 font-mono text-xs">EMAIL_PROVIDER=resend</code> for
                      Resend. Until one is configured, use the "temporary password" option (shows the password directly)
                      instead of "invite email" when creating intern accounts.
                    </p>
                  </div>
                </div>
              )}
              {emailStatus?.provider === 'resend' && !emailStatus.configured && (
                <div className="flex items-start gap-2.5 rounded-xl border border-coral-500/30 bg-coral-500/5 p-3.5 text-sm text-coral-600">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>Resend is selected but <code className="font-mono">RESEND_API_KEY</code> is missing — emails will fail. Add the key to your environment.</p>
                </div>
              )}
              {emailStatus?.provider === 'smtp' && !emailStatus.configured && (
                <div className="flex items-start gap-2.5 rounded-xl border border-coral-500/30 bg-coral-500/5 p-3.5 text-sm text-coral-600">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>SMTP is selected but one or more of <code className="font-mono">SMTP_HOST / SMTP_USER / SMTP_PASSWORD</code> is missing — emails will fail.</p>
                </div>
              )}
              {emailStatus?.provider !== 'console' && emailStatus?.configured && (
                <div className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-700">
                  <CheckCircle2 size={16} className="shrink-0" /> {PROVIDER_LABEL[emailStatus.provider] ?? emailStatus.provider} is configured — outbound email should be working.
                </div>
              )}

              <div className="flex gap-2">
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" type="email" className="max-w-xs" />
                <Button size="sm" variant="outline" onClick={sendTest} disabled={sendingTest}>
                  <Send size={14} /> {sendingTest ? 'Sending…' : 'Send Test Email'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Letter Templates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-ink-500">
                Controls the actual wording printed on generated Offer Letters and Letters of Recommendation.
              </p>
              {letterTemplates.map((t) => (
                <div key={t.id} className="rounded-xl border border-ink-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-ink-400" />
                      <div>
                        <p className="text-sm font-medium text-ink-900">{t.title}</p>
                        <p className="text-xs text-ink-400">{t.type === 'offer_letter' ? 'Offer Letter' : 'Letter of Recommendation'}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditingLetter(t)}>Edit</Button>
                  </div>
                  {editingLetter?.id === t.id && (
                    <div className="mt-4 space-y-3 border-t border-ink-50 pt-4">
                      <div>
                        <Label>Title (printed on the letter)</Label>
                        <Input value={editingLetter.title} onChange={(e) => setEditingLetter({ ...editingLetter, title: e.target.value })} />
                      </div>
                      <div>
                        <Label>
                          Body — available tokens:{' '}
                          {availableTokens[t.type]?.map((tok) => (
                            <code key={tok} className="mr-1 rounded bg-mist px-1 py-0.5 font-mono text-[10px]">{`{{${tok}}}`}</code>
                          ))}
                        </Label>
                        <Textarea rows={8} value={editingLetter.body_template} onChange={(e) => setEditingLetter({ ...editingLetter, body_template: e.target.value })} />
                        <p className="mt-1 text-xs text-ink-400">Separate paragraphs with a blank line.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Signatory Name</Label>
                          <Input value={editingLetter.signatory_name} onChange={(e) => setEditingLetter({ ...editingLetter, signatory_name: e.target.value })} />
                        </div>
                        <div>
                          <Label>Signatory Title</Label>
                          <Input value={editingLetter.signatory_title} onChange={(e) => setEditingLetter({ ...editingLetter, signatory_title: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveLetterTemplate} disabled={savingLetter}>{savingLetter ? 'Saving…' : 'Save'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLetter(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

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
        </>
      )}
    </div>
  );
}
