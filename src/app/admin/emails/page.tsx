'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send, Paperclip, X, Users, Mail, History } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { formatDate } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // soft warning threshold

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailCenterPage() {
  const [interns, setInterns] = useState<any[]>([]);
  const [internSearch, setInternSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  async function load() {
    const supabase = createClient();
    const [internRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, official_email').eq('role', 'intern').order('full_name'),
      supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setInterns(internRes.data ?? []);
    setHistory((historyRes.data ?? []).filter((h: any) => h.provider_response?.kind === 'broadcast').slice(0, 30));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filteredInterns = useMemo(
    () => interns.filter((i) => i.full_name?.toLowerCase().includes(internSearch.toLowerCase()) || i.email?.toLowerCase().includes(internSearch.toLowerCase())),
    [interns, internSearch]
  );

  const customEmailList = useMemo(
    () => Array.from(new Set(customEmails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean))),
    [customEmails]
  );
  const invalidCustomEmails = customEmailList.filter((e) => !EMAIL_RE.test(e));
  const selectedInternEmails = interns.filter((i) => selectedIds.has(i.id)).map((i) => i.email);
  const totalRecipients = new Set([...selectedInternEmails, ...customEmailList.filter((e) => EMAIL_RE.test(e))]).size;
  const totalAttachmentBytes = files.reduce((sum, f) => sum + f.size, 0);

  function toggleIntern(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredInterns.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function onFilesChosen(fileList: FileList | null) {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    if (totalRecipients === 0) { toast.error('Add at least one recipient'); return; }
    if (invalidCustomEmails.length > 0) { toast.error(`Invalid email address: ${invalidCustomEmails[0]}`); return; }
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are both required'); return; }

    setSending(true);
    const supabase = createClient();
    const uploadedAttachments: { path: string; filename: string; contentType: string }[] = [];

    try {
      for (const file of files) {
        const path = `${nanoid()}-${file.name}`;
        const { error } = await supabase.storage.from('email-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (error) throw new Error(`Couldn't upload "${file.name}": ${error.message}`);
        uploadedAttachments.push({ path, filename: file.name, contentType: file.type || 'application/octet-stream' });
      }

      const recipients = Array.from(new Set([...selectedInternEmails, ...customEmailList]));
      const res = await fetch('/api/admin/emails/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject: subject.trim(), message: message.trim(), attachments: uploadedAttachments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');

      toast.success(`Sent to ${data.sentCount} recipient(s)${data.failedCount ? `, ${data.failedCount} failed` : ''}`);
      setSubject('');
      setMessage('');
      setFiles([]);
      setSelectedIds(new Set());
      setCustomEmails('');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Email Center</h1>
        <p className="text-sm text-ink-500">Send an announcement, promotion, or update to interns or any other email address.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users size={16} /> Recipients — Interns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Search interns…" value={internSearch} onChange={(e) => setInternSearch(e.target.value)} />
              <Button size="sm" variant="outline" onClick={selectAllFiltered}>Select All</Button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink-50 p-2">
              {filteredInterns.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50">
                  <input type="checkbox" checked={selectedIds.has(i.id)} onChange={() => toggleIntern(i.id)} className="rounded border-ink-200" />
                  <span className="text-sm text-ink-900">{i.full_name}</span>
                  <span className="text-xs text-ink-400">{i.email}</span>
                </label>
              ))}
              {filteredInterns.length === 0 && <p className="px-2 py-6 text-center text-sm text-ink-400">No interns match your search.</p>}
            </div>
            <p className="text-xs text-ink-400">{selectedIds.size} intern(s) selected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail size={16} /> Recipients — Any Email Address</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>One per line, or comma-separated</Label>
            <Textarea rows={6} value={customEmails} onChange={(e) => setCustomEmails(e.target.value)} placeholder="someone@example.com&#10;another@company.com" />
            {invalidCustomEmails.length > 0 && (
              <p className="text-xs text-coral-500">Invalid: {invalidCustomEmails.join(', ')}</p>
            )}
            <p className="text-xs text-ink-400">{customEmailList.filter((e) => EMAIL_RE.test(e)).length} valid address(es)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" /></div>
          <div><Label>Message</Label><Textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement here. Leave a blank line between paragraphs." /></div>

          <div>
            <Label>Attachments (photos, PDFs, etc.)</Label>
            <input type="file" multiple onChange={(e) => onFilesChosen(e.target.files)} className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-ink-100" />
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-ink-50 px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-ink-700"><Paperclip size={13} /> {f.name} <span className="text-xs text-ink-400">({formatBytes(f.size)})</span></span>
                    <button onClick={() => removeFile(idx)} className="text-ink-400 hover:text-coral-500"><X size={14} /></button>
                  </div>
                ))}
                {totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES && (
                  <p className="text-xs text-amber-500">Total attachment size is {formatBytes(totalAttachmentBytes)} — some providers may reject very large emails.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink-50 pt-4">
            <p className="text-sm text-ink-500">
              Sending to <span className="font-semibold text-ink-900">{totalRecipients}</span> recipient(s)
            </p>
            <Button onClick={handleSend} disabled={sending}>
              <Send size={14} /> {sending ? 'Sending…' : 'Send Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History size={16} /> Recent Sends</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {history.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-ink-900">{h.subject}</p>
                <p className="text-xs text-ink-400">{h.to_email} · {formatDate(h.created_at)}</p>
              </div>
              <Badge tone={h.status === 'sent' ? 'brand' : 'coral'}>{h.status}</Badge>
            </div>
          ))}
          {history.length === 0 && <p className="px-1 py-6 text-center text-sm text-ink-400">No broadcasts sent yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
