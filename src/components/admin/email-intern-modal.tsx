'use client';

import { useEffect, useState } from 'react';
import { X, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Recipient {
  id: string;
  full_name: string;
  email: string;
}

export function EmailInternModal({ recipient, onClose }: { recipient: Recipient; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('email_log')
      .select('*')
      .eq('to_email', recipient.email)
      .order('created_at', { ascending: false })
      .limit(15);
    setHistory(data ?? []);
    setLoadingHistory(false);
  }

  useEffect(() => { loadHistory(); }, [recipient.email]);

  async function send() {
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are both required'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/interns/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: recipient.id, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to send'); return; }
      toast.success(data.status === 'sent' ? 'Email sent' : 'Queued — check Settings → Email Delivery if it never arrives');
      setSubject('');
      setMessage('');
      loadHistory();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-50 px-5 py-4">
          <div>
            <p className="font-display font-semibold text-ink-900">Email {recipient.full_name}</p>
            <p className="font-mono text-xs text-ink-400">{recipient.email}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Update on your project timeline" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" />
              <p className="mt-1 text-xs text-ink-400">Sent from StoreShift's branded email template — separate paragraphs with a blank line.</p>
            </div>
            <Button size="sm" onClick={send} disabled={sending}>
              <Send size={14} /> {sending ? 'Sending…' : 'Send Email'}
            </Button>
          </div>

          <div className="border-t border-ink-50 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Email History</p>
            {loadingHistory ? (
              <p className="text-sm text-ink-400">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-ink-400">No emails sent to this address yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start justify-between gap-3 rounded-xl border border-ink-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{h.subject}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                        <Clock size={11} /> {formatDate(h.created_at, { hour: '2-digit', minute: '2-digit' })}
                        {h.provider_response?.kind && <span className="capitalize"> · {h.provider_response.kind.replace('_', ' ')}</span>}
                      </p>
                    </div>
                    <Badge tone={h.status === 'sent' ? 'brand' : 'coral'} className="shrink-0">
                      {h.status === 'sent' ? <CheckCircle2 size={11} className="mr-1" /> : <XCircle size={11} className="mr-1" />}
                      {h.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
