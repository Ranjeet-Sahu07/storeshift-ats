'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import type { Task, TaskStatus } from '@/types';

export default function InternTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: internship } = await supabase.from('internships').select('id').eq('intern_id', user?.id).eq('status', 'active').maybeSingle();
    if (internship) {
      const { data } = await supabase.from('tasks').select('*').eq('internship_id', internship.id).order('position');
      setTasks((data as Task[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const supabase = createClient();
    await supabase.from('tasks').update({ status }).eq('id', taskId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">My Tasks</h1>
        <p className="text-sm text-ink-500">Drag a card to update its status.</p>
      </div>
      {!loading && <KanbanBoard tasks={tasks} onStatusChange={updateStatus} />}
    </div>
  );
}
