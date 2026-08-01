'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [mentor, setMentor] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: internship } = await supabase.from('internships').select('mentor_id').eq('intern_id', user.id).eq('status', 'active').maybeSingle();
    if (internship?.mentor_id) {
      const { data: mentorProfile } = await supabase.from('profiles').select('*').eq('id', internship.mentor_id).single();
      setMentor(mentorProfile);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${internship.mentor_id}),and(sender_id.eq.${internship.mentor_id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(msgs ?? []);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim() || !mentor || !userId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('messages').insert({ sender_id: userId, recipient_id: mentor.id, body: text }).select().single();
    if (!error && data) setMessages((prev) => [...prev, data]);
    setText('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Messages</h1>
        <p className="text-sm text-ink-500">{mentor ? `Chat with your mentor, ${mentor.full_name}` : 'No mentor assigned yet.'}</p>
      </div>

      <Card className="flex h-[520px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.sender_id === userId ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-xs rounded-2xl px-4 py-2.5 text-sm',
                m.sender_id === userId ? 'bg-brand-600 text-white' : 'bg-mist text-ink-700'
              )}>
                {m.body}
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-center text-sm text-ink-400">No messages yet — say hello!</p>}
          <div ref={endRef} />
        </div>
        {mentor && (
          <div className="flex items-center gap-2 border-t border-ink-50 p-4">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={send} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Send size={16} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
