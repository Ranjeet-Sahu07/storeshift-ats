'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import type { Task, TaskStatus } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [filterIntern, setFilterIntern] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ internshipId: '', title: '', description: '', priority: 'medium', deadline: '' });

  async function load() {
    const supabase = createClient();
    const { data: internList } = await supabase
      .from('internships')
      .select('id, role_title, profiles!internships_intern_id_fkey(full_name)')
      .eq('status', 'active');
    setInternships(internList ?? []);

    const { data: taskList } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks((taskList as Task[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createTask() {
    if (!form.internshipId || !form.title) { toast.error('Intern and title are required'); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('tasks').insert({
      internship_id: form.internshipId, title: form.title, description: form.description || null,
      priority: form.priority, deadline: form.deadline || null, assigned_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Task assigned');
    setShowForm(false);
    setForm({ internshipId: '', title: '', description: '', priority: 'medium', deadline: '' });
    load();
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const supabase = createClient();
    await supabase.from('tasks').update({ status }).eq('id', taskId);
  }

  const filtered = filterIntern === 'all' ? tasks : tasks.filter((t) => t.internship_id === filterIntern);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Task Manager</h1>
          <p className="text-sm text-ink-500">Assign tasks and track progress with drag-and-drop.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}><Plus size={16} /> Assign Task</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Assign New Task</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Intern</Label>
              <Select value={form.internshipId} onChange={(e) => setForm({ ...form, internshipId: e.target.value })}>
                <option value="">Select intern…</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>{i.profiles?.full_name} — {i.role_title}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Task Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Build the login page" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={createTask}>Assign Task</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Label className="!mb-0">Filter by intern:</Label>
        <Select value={filterIntern} onChange={(e) => setFilterIntern(e.target.value)} className="!h-9 !w-56">
          <option value="all">All Interns</option>
          {internships.map((i) => <option key={i.id} value={i.id}>{i.profiles?.full_name}</option>)}
        </Select>
      </div>

      <KanbanBoard tasks={filtered} onStatusChange={updateStatus} />
    </div>
  );
}
