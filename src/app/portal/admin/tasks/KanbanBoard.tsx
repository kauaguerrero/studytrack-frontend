'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { Task, TaskStatus, apiUpdateStatus } from './hooks/useTasks';
import KanbanColumn from './KanbanColumn';
import MoveToProgressModal from './MoveToProgressModal';
import CompleteTaskModal from './CompleteTaskModal';

const COLUMNS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done', 'archived'];

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['in_progress', 'archived'],
  in_progress: ['review', 'backlog', 'archived'],
  review: ['done', 'in_progress', 'archived'],
  done: ['archived'],
  archived: ['backlog'],
};

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  statusFilter?: TaskStatus | '';
}

export default function KanbanBoard({ tasks, onTaskClick, statusFilter }: Props) {
  const [dragging, setDragging] = useState<Task | null>(null);
  const [progressModal, setProgressModal] = useState<{ task: Task } | null>(null);
  const [completeModal, setCompleteModal] = useState<{ task: Task } | null>(null);

  function tasksByStatus(status: TaskStatus) {
    return tasks.filter(t => t.status === status);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!dragging || dragging.status === targetStatus) {
      setDragging(null);
      return;
    }
    const valid = VALID_TRANSITIONS[dragging.status] ?? [];
    if (!valid.includes(targetStatus)) {
      toast.error(`Transição inválida: ${dragging.status} → ${targetStatus}`);
      setDragging(null);
      return;
    }
    const task = dragging;
    setDragging(null);
    if (targetStatus === 'in_progress') {
      setProgressModal({ task });
    } else if (targetStatus === 'done') {
      setCompleteModal({ task });
    } else {
      performStatusUpdate(task, targetStatus);
    }
  }

  async function performStatusUpdate(task: Task, newStatus: TaskStatus, extra?: object) {
    try {
      await apiUpdateStatus(task.id, { status: newStatus, ...extra });
      toast.success('Status atualizado!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao atualizar status');
    }
  }

  const visibleColumns = statusFilter ? COLUMNS.filter(c => c === statusFilter) : COLUMNS;

  return (
    <>
      <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
        {visibleColumns.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus(status)}
            onTaskClick={onTaskClick}
            onDragStart={setDragging}
            onDrop={handleDrop}
            collapsible={status === 'archived'}
          />
        ))}
      </div>

      {progressModal && (
        <MoveToProgressModal
          open
          taskTitle={progressModal.task.title}
          onConfirm={async (data) => {
            await performStatusUpdate(progressModal.task, 'in_progress', { progress: data });
            setProgressModal(null);
          }}
          onCancel={() => setProgressModal(null)}
        />
      )}

      {completeModal && (
        <CompleteTaskModal
          open
          taskTitle={completeModal.task.title}
          onConfirm={async (data) => {
            await performStatusUpdate(completeModal.task, 'done', { completion_report: data });
            setCompleteModal(null);
          }}
          onCancel={() => setCompleteModal(null)}
        />
      )}
    </>
  );
}
