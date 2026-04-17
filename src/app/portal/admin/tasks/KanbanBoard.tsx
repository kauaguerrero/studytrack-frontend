'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { Task, TaskStatus, apiBlockTask, apiReopenTask, apiUnblockTask, apiUpdateStatus } from './hooks/useTasks';
import KanbanColumn from './KanbanColumn';
import MoveToProgressModal from './MoveToProgressModal';
import CompleteTaskModal from './CompleteTaskModal';
import TaskStatusActionModal from './TaskStatusActionModal';

const COLUMNS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done', 'blocked', 'archived'];

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['in_progress', 'archived'],
  in_progress: ['review', 'backlog', 'blocked', 'archived'],
  review: ['done', 'in_progress', 'backlog', 'blocked', 'archived'],
  done: ['review', 'in_progress', 'blocked', 'archived'],
  blocked: ['in_progress', 'review', 'done', 'archived'],
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
  const [actionModal, setActionModal] = useState<{ mode: 'block' | 'unblock' | 'reopen'; task: Task; targetStatus?: TaskStatus } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme !== 'light';

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
    const missingAcceptanceCriteria =
      targetStatus === 'in_progress' &&
      ['high', 'critical'].includes(task.priority) &&
      !task.acceptance_criteria?.trim();

    if (missingAcceptanceCriteria) {
      toast.warning('Essa task ainda não está pronta para execução: faltam critérios de aceite.');
    }
    if (task.status === 'blocked' && ['in_progress', 'review', 'done'].includes(targetStatus)) {
      setActionModal({ mode: 'unblock', task, targetStatus });
    } else if (task.status === 'done' && ['review', 'in_progress', 'blocked'].includes(targetStatus)) {
      setActionModal({ mode: 'reopen', task, targetStatus });
    } else if (targetStatus === 'blocked') {
      setActionModal({ mode: 'block', task, targetStatus });
    } else if (targetStatus === 'in_progress') {
      setProgressModal({ task });
    } else if (targetStatus === 'done') {
      setCompleteModal({ task });
    } else {
      performStatusUpdate(task, targetStatus);
    }
  }

  async function performStatusUpdate(task: Task, newStatus: TaskStatus, extra?: object) {
    const previousTasks = tasks

    // 1. Atualiza visualmente IMEDIATO via mutate otimista
    mutate(
      (key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'),
      (current: unknown) =>
        Array.isArray(current)
          ? (current as Task[]).map(t =>
              t.id === task.id ? { ...t, status: newStatus } : t
            )
          : current,
      false // não revalida ainda
    )

    try {
      // 2. Persiste no banco em background
      await apiUpdateStatus(task.id, { status: newStatus, ...extra })
      toast.success('Status atualizado!')
      // 3. Revalida para sincronizar com o servidor
      mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'))
    } catch (e: any) {
      // 4. Rollback em caso de erro
      mutate(
        (key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'),
        (current: unknown) => Array.isArray(current) ? previousTasks : current,
        false
      )
      toast.error(e.message ?? 'Erro ao atualizar status')
    }
  }

  async function performBlock(task: Task, payload: object) {
    await apiBlockTask(task.id, payload);
    toast.success('Task bloqueada!');
    mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
  }

  async function performUnblock(task: Task, payload: object) {
    await apiUnblockTask(task.id, payload);
    toast.success('Task desbloqueada!');
    mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
  }

  async function performReopen(task: Task, payload: object) {
    await apiReopenTask(task.id, payload);
    toast.success('Task reaberta!');
    mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
  }

  const visibleColumns = statusFilter ? COLUMNS.filter(c => c === statusFilter) : COLUMNS;

  return (
    <>
      <div className="flex gap-4 items-start pb-3">
        {visibleColumns.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus(status)}
            onTaskClick={onTaskClick}
            onDragStart={setDragging}
            onDrop={handleDrop}
            collapsible={status === 'archived'}
            isDark={isDark}
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

      {actionModal && (
        <TaskStatusActionModal
          open
          mode={actionModal.mode}
          taskTitle={actionModal.task.title}
          targetStatus={actionModal.targetStatus}
          onConfirm={async (payload) => {
            try {
              if (actionModal.mode === 'block') {
                await performBlock(actionModal.task, payload);
              } else if (actionModal.mode === 'unblock') {
                await performUnblock(actionModal.task, payload);
              } else {
                await performReopen(actionModal.task, payload);
              }
              setActionModal(null);
            } catch (e: any) {
              toast.error(e.message ?? 'Falha ao executar ação');
            }
          }}
          onCancel={() => setActionModal(null)}
        />
      )}
    </>
  );
}
