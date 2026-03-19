'use client';

import useSWR, { mutate } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  scope: string;
  status: TaskStatus;
  assignee_id: string | null;
  assignee: { id: string; full_name: string } | null;
  created_by: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  currently_doing?: string | null;
}

export interface TaskDetail extends Task {
  creator: { id: string; full_name: string } | null;
  progress: {
    task_id: string;
    already_done: string;
    currently_doing: string;
    remaining: string;
    updated_at: string;
  } | null;
  completion: {
    task_id: string;
    files_modified_count: number;
    files_modified_list: string[];
    summary: string;
    completed_at: string;
  } | null;
  history: {
    id: string;
    field_changed: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    changer: { full_name: string } | null;
  }[];
}

export interface AISuggestion {
  id: string;
  suggestion_title: string;
  suggestion_scope: string;
  priority: TaskPriority;
  source_context: string | null;
  created_at: string;
  promoted_to_task_id: string | null;
  dismissed_at: string | null;
}

const TASKS_KEY = '/api/admin/tasks';

export function useTasks(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, error, isLoading } = useSWR<Task[]>(
    `${TASKS_KEY}${qs}`,
    apiFetcher,
    { refreshInterval: 30_000 }
  );
  return {
    tasks: data ?? [],
    isLoading,
    error,
    reload: () => mutate(`${TASKS_KEY}${qs}`),
  };
}

export function useTaskDetail(taskId: string | null) {
  const { data, error, isLoading } = useSWR<TaskDetail>(
    taskId ? `/api/admin/tasks/${taskId}` : null,
    apiFetcher
  );
  return { task: data, isLoading, error };
}

export function useAISuggestions() {
  const { data, error, isLoading } = useSWR<AISuggestion[]>(
    '/api/admin/tasks/ai/suggestions',
    apiFetcher,
    { refreshInterval: 60_000 }
  );
  return {
    suggestions: data ?? [],
    isLoading,
    error,
    reload: () => mutate('/api/admin/tasks/ai/suggestions'),
  };
}

// Mutations (fire-and-forget helpers, caller should mutate SWR after)
export async function apiUpdateStatus(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiCreateTask(body: object): Promise<Task> {
  const res = await fetch('/api/admin/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiUpdateProgress(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDeleteTask(taskId: string): Promise<void> {
  const res = await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
}

export async function apiPromoteSuggestion(id: string): Promise<Task> {
  const res = await fetch(`/api/admin/tasks/ai/suggestions/${id}/promote`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDismissSuggestion(id: string): Promise<void> {
  const res = await fetch(`/api/admin/tasks/ai/suggestions/${id}/dismiss`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
}

export async function apiGenerateSuggestions(): Promise<void> {
  await fetch('/api/admin/tasks/ai/suggestions', { method: 'POST' });
}
