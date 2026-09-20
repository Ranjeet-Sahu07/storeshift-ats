'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { GripVertical, Github, GitPullRequest, Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Task, TaskStatus } from '@/types';

const COLUMNS: { id: TaskStatus; label: string; tone: 'default' | 'amber' | 'brand' | 'coral' }[] = [
  { id: 'todo', label: 'To Do', tone: 'default' },
  { id: 'in_progress', label: 'In Progress', tone: 'amber' },
  { id: 'in_review', label: 'In Review', tone: 'brand' },
  { id: 'done', label: 'Done', tone: 'brand' },
  { id: 'blocked', label: 'Blocked', tone: 'coral' },
];

const PRIORITY_TONE = { low: 'default', medium: 'amber', high: 'coral', urgent: 'coral' } as const;

export function KanbanBoard({
  tasks,
  onStatusChange,
  readOnly = false,
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  readOnly?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) onStatusChange(task.id, newStatus);
  }

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column key={col.id} id={col.id} label={col.label} tone={col.tone} count={tasks.filter((t) => t.status === col.id).length}>
            {tasks
              .filter((t) => t.status === col.id)
              .map((task) => (
                <TaskCard key={task.id} task={task} readOnly={readOnly} />
              ))}
          </Column>
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} readOnly overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id, label, tone, count, children,
}: { id: string; label: string; tone: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-2xl border border-ink-50 bg-mist/60 p-3 transition-colors',
        isOver && 'border-brand-300 bg-brand-50/50'
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <Badge>{count}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 min-h-[80px]">{children}</div>
    </div>
  );
}

function TaskCard({ task, readOnly, overlay }: { task: Task; readOnly?: boolean; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id, disabled: readOnly });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(readOnly ? {} : { ...listeners, ...attributes })}
      className={cn(
        'rounded-xl border border-ink-50 bg-white p-3 shadow-sm',
        !readOnly && 'cursor-grab active:cursor-grabbing',
        overlay && 'rotate-2 shadow-xl'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-900">{task.title}</p>
        {!readOnly && <GripVertical size={14} className="mt-0.5 shrink-0 text-ink-300" />}
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-ink-400">{task.description}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
        {task.deadline && (
          <span className="flex items-center gap-1 text-[11px] text-ink-400"><Calendar size={11} /> {formatDate(task.deadline)}</span>
        )}
      </div>
      {(task.github_repo_url || task.pull_request_url) && (
        <div className="mt-2 flex gap-2">
          {task.github_repo_url && <Github size={13} className="text-ink-400" />}
          {task.pull_request_url && <GitPullRequest size={13} className="text-brand-500" />}
        </div>
      )}
      {task.progress > 0 && (
        <div className="mt-2 h-1 w-full rounded-full bg-ink-50">
          <div className="h-1 rounded-full bg-brand-500" style={{ width: `${task.progress}%` }} />
        </div>
      )}
    </div>
  );
}
