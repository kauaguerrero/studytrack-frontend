'use client';

import useSWR, { mutate } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';
import type {
  AIInsight,
  CompletenessScore,
  DashboardMetrics,
  IntelligenceSignal,
  TaskRecord,
} from '@/lib/tasks/intelligence';

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkspaceRole = 'admin' | 'dev';

export interface AdminProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role?: 'admin' | 'dev';
}

export interface Task {
  id: string;
  title: string;
  scope: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids?: string[] | null;
  assignee_id: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  assignees?: { id: string; full_name: string; avatar_url: string | null }[];
  co_assignee_id: string | null;
  co_assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  created_by: string;
  deadline: string | null;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
  task_type?: string | null;
  expected_outcome?: string | null;
  blocked_count?: number | null;
  reopened_count?: number | null;
  total_blocked_time_seconds?: number | null;
  block_reason?: string | null;
  block_category?: string | null;
  blocked_from_status?: TaskStatus | null;
  last_blocked_at?: string | null;
  last_reopened_at?: string | null;
  last_progress_update_at?: string | null;
  currently_doing?: string | null;
}

export interface SprintTaskLink {
  id: string;
  sprint_id: string;
  task_id: string;
  created_at: string;
  task: Task;
}

export interface Sprint {
  id: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  created_by: string;
  created_at: string;
  completed_at: string | null;
  report_development: string | null;
  report_positive_points: string | null;
  report_negative_points: string | null;
  report_final_summary_ai: string | null;
  report_final_summary_final: string | null;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  tasks: SprintTaskLink[];
}

export interface TaskDetail extends Task {
  creator: { id: string; full_name: string; avatar_url: string | null } | null;
  active_sprint?: { id: string; goal: string; status: 'active' | 'completed'; start_date: string; end_date: string } | null;
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
  block_events?: {
    id: string;
    event_kind: 'blocked' | 'unblocked';
    blocked_from_status: TaskStatus | null;
    target_status: TaskStatus | null;
    actor_id: string;
    reason: string | null;
    category: string | null;
    expected_unblock_date: string | null;
    resolution_note: string | null;
    created_at: string;
  }[];
  reopen_events?: {
    id: string;
    reopened_from_status: TaskStatus;
    reopened_to_status: TaskStatus;
    reason: string;
    category: string | null;
    actor_id: string;
    created_at: string;
  }[];
}

export interface TaskWorkspaceSummary {
  role: WorkspaceRole;
  summary: {
    throughput: { formatted: string; description: string; calculation: string; period: string };
    block_rate: { formatted: string; description: string; calculation: string; period: string };
    average_completeness_score: { formatted: string; description: string; calculation: string; period: string };
    operational_risk: { formatted: string; description: string; calculation: string; period: string };
    main_bottleneck: string;
    weekly_focus: string;
    alerts: IntelligenceSignal[];
    ai: AIInsight;
  } | null;
}

export interface TaskIntelligencePayload {
  task_id: string;
  completeness: {
    creation: CompletenessScore;
    progress: CompletenessScore;
    closure: CompletenessScore;
    consolidated: number;
    consolidated_percentage: number;
    missing_fields: string[];
  };
  signals: IntelligenceSignal[];
  ai: AIInsight;
}

export interface TaskDashboardPayload {
  generated_at: string;
  metrics: DashboardMetrics;
  signals: IntelligenceSignal[];
  tasks: TaskRecord[];
  ai_snapshot: {
    generated_at: string;
    generated_by: string | null;
    source: 'deterministic' | 'ai';
  } | null;
  task_analyses: {
    task_id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee_name: string | null;
    active_sprint_goal: string | null;
    severity: IntelligenceSignal['severity'];
    signals_count: number;
    missing_fields: string[];
    signals: IntelligenceSignal[];
  }[];
  ai: AIInsight;
  tasks_count: number;
  sprints_count: number;
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
const ACTIVE_SPRINT_KEY = '/api/admin/sprints';
const SPRINT_HISTORY_KEY = '/api/admin/sprints?history=true';

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

export function useTaskWorkspaceSummary() {
  const { data, error, isLoading } = useSWR<TaskWorkspaceSummary>(
    '/api/admin/tasks/intelligence/summary',
    apiFetcher,
    { refreshInterval: 60_000 }
  );
  return { data, isLoading, error };
}

export function useTaskIntelligence(taskId: string | null) {
  const { data, error, isLoading } = useSWR<TaskIntelligencePayload>(
    taskId ? `/api/admin/tasks/${taskId}/intelligence` : null,
    apiFetcher
  );
  return { data, isLoading, error };
}

export function useTaskDashboard() {
  const { data, error, isLoading } = useSWR<TaskDashboardPayload>(
    '/api/admin/tasks/dashboard',
    apiFetcher,
    { refreshInterval: 60_000 }
  );
  return { data, isLoading, error };
}

export function useAISuggestions(enabled = true) {
  const { data, error, isLoading } = useSWR<AISuggestion[]>(
    enabled ? '/api/admin/tasks/ai/suggestions' : null,
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

export function useAdminProfiles() {
  const { data, error, isLoading } = useSWR<AdminProfile[]>(
    '/api/admin/profiles',
    apiFetcher
  );
  return { profiles: data ?? [], isLoading, error };
}

export function useActiveSprint() {
  const { data, error, isLoading } = useSWR<Sprint | null>(
    ACTIVE_SPRINT_KEY,
    apiFetcher,
    { refreshInterval: 30_000 }
  );
  return {
    sprint: data ?? null,
    isLoading,
    error,
    reload: () => mutate(ACTIVE_SPRINT_KEY),
  };
}

export function useSprintHistory() {
  const { data, error, isLoading } = useSWR<Sprint[]>(
    SPRINT_HISTORY_KEY,
    apiFetcher,
    { refreshInterval: 60_000 }
  );
  return {
    sprints: data ?? [],
    isLoading,
    error,
    reload: () => mutate(SPRINT_HISTORY_KEY),
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

export async function apiBlockTask(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}/block`, {
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

export async function apiUnblockTask(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}/unblock`, {
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

export async function apiReopenTask(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}/reopen`, {
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

export async function apiUpdateTask(taskId: string, body: object): Promise<TaskDetail> {
  const res = await fetch(`/api/admin/tasks/${taskId}`, {
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

export async function apiDeleteTask(taskId: string, options?: { permanent?: boolean }): Promise<void> {
  const qs = options?.permanent ? '?permanent=true' : '';
  const res = await fetch(`/api/admin/tasks/${taskId}${qs}`, { method: 'DELETE' });
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
  const res = await fetch('/api/admin/tasks/ai/suggestions', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error ?? `HTTP ${res.status}`);
  }
}

export async function apiCreateSprint(body: object): Promise<Sprint> {
  const res = await fetch('/api/admin/sprints', {
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

export async function apiFinishSprint(sprintId: string, body: object): Promise<Sprint> {
  const res = await fetch(`/api/admin/sprints/${sprintId}/finish`, {
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

export async function apiGenerateSprintSummary(sprintId: string): Promise<{ summary: string }> {
  const res = await fetch(`/api/admin/sprints/${sprintId}/ai-summary`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
