import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import {
  type AIInsight,
  type DashboardMetrics,
  type IntelligenceSignal,
  type SprintSnapshot,
  type TaskRecord,
  buildDashboardMetrics,
  buildDeterministicAIInsight,
  buildPortfolioSignals,
  buildTaskSignals,
  calculateTaskCompleteness,
} from '@/lib/tasks/intelligence';

type AdminClient = any;

function nowIso() {
  return new Date().toISOString();
}

function severityWeight(severity: IntelligenceSignal['severity']) {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function toTextArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function patchTaskShape(task: Record<string, unknown>): TaskRecord {
  return {
    ...task,
    description: (task.description as string | null | undefined) ?? (task.scope as string),
  } as TaskRecord;
}

async function selectSingleTask(supabaseAdmin: AdminClient, taskId: string) {
  return supabaseAdmin
    .from('admin_tasks')
    .select('*')
    .eq('id', taskId)
    .single();
}

async function getLatestDashboardAISnapshot(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from('admin_task_ai_snapshots')
    .select('generated_at, generated_by, insight')
    .eq('scope', 'dashboard')
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function listTaskAssignableProfiles(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('role', ['admin', 'dev'])
    .order('full_name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function buildTasksDataset(supabaseAdmin: AdminClient) {
  const [
    tasksRes,
    progressRes,
    completionRes,
    historyRes,
    blockEventsRes,
    reopenEventsRes,
    sprintLinksRes,
    sprintsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('admin_tasks')
      .select(`
        *,
        assignee:profiles!admin_tasks_assignee_id_fkey(id, full_name, avatar_url),
        co_assignee:profiles!admin_tasks_co_assignee_id_fkey(id, full_name, avatar_url),
        creator:profiles!admin_tasks_created_by_fkey(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('admin_task_progress').select('*'),
    supabaseAdmin.from('admin_task_completion').select('*'),
    supabaseAdmin
      .from('admin_task_history')
      .select('*, changer:profiles!admin_task_history_changed_by_fkey(full_name)')
      .order('changed_at', { ascending: true }),
    supabaseAdmin.from('admin_task_block_events').select('*').order('created_at', { ascending: true }),
    supabaseAdmin.from('admin_task_reopen_events').select('*').order('created_at', { ascending: true }),
    supabaseAdmin
      .from('admin_sprint_tasks')
      .select('task_id, sprint_id, created_at'),
    supabaseAdmin
      .from('admin_sprints')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  for (const res of [tasksRes, progressRes, completionRes, historyRes, blockEventsRes, reopenEventsRes, sprintLinksRes, sprintsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const progressMap = new Map<string, any>((progressRes.data ?? []).map((row: any) => [row.task_id, row]));
  const completionMap = new Map<string, any>((completionRes.data ?? []).map((row: any) => [row.task_id, row]));
  const historyMap = new Map<string, any[]>();
  for (const row of historyRes.data ?? []) {
    const current = historyMap.get(row.task_id) ?? [];
    current.push(row);
    historyMap.set(row.task_id, current);
  }
  const blockEventsMap = new Map<string, any[]>();
  for (const row of blockEventsRes.data ?? []) {
    const current = blockEventsMap.get(row.task_id) ?? [];
    current.push(row);
    blockEventsMap.set(row.task_id, current);
  }
  const reopenEventsMap = new Map<string, any[]>();
  for (const row of reopenEventsRes.data ?? []) {
    const current = reopenEventsMap.get(row.task_id) ?? [];
    current.push(row);
    reopenEventsMap.set(row.task_id, current);
  }

  const sprints = new Map<string, any>((sprintsRes.data ?? []).map((row: any) => [row.id, row]));
  const sprintLinkMap = new Map<string, any>();
  for (const row of sprintLinksRes.data ?? []) {
    const sprint = sprints.get(row.sprint_id);
    if (!sprint) continue;
    const existing = sprintLinkMap.get(row.task_id);
    if (!existing || existing.status !== 'active') {
      sprintLinkMap.set(row.task_id, sprint);
    }
  }

  const tasks = (tasksRes.data ?? []).map((row: any) => patchTaskShape({
    ...row,
    progress: progressMap.get(row.id) ?? null,
    completion: completionMap.get(row.id) ?? null,
    history: historyMap.get(row.id) ?? [],
    block_events: blockEventsMap.get(row.id) ?? [],
    reopen_events: reopenEventsMap.get(row.id) ?? [],
    active_sprint: sprintLinkMap.get(row.id) ?? null,
  }));

  const sprintSnapshots: SprintSnapshot[] = (sprintsRes.data ?? []).map((sprint: any) => ({
    ...sprint,
    tasks: tasks.filter((task: TaskRecord) => task.active_sprint?.id === sprint.id),
  }));

  return {
    tasks,
    sprints: sprintSnapshots,
  };
}

export async function buildTaskWorkspaceSummary(supabaseAdmin: AdminClient, role: 'admin' | 'dev') {
  const { tasks, sprints } = await buildTasksDataset(supabaseAdmin);
  if (role === 'dev') {
    return {
      role,
      summary: null,
    };
  }

  const metrics = buildDashboardMetrics(tasks, sprints);
  const signals = buildPortfolioSignals(tasks, sprints);
  const aiInsight = buildDeterministicAIInsight(tasks, metrics, signals);

  return {
    role,
    summary: {
      throughput: metrics.executive_summary.throughput,
      block_rate: metrics.executive_summary.block_rate,
      average_completeness_score: metrics.executive_summary.average_completeness_score,
      operational_risk: metrics.executive_summary.operational_risk,
      main_bottleneck: metrics.executive_summary.main_bottleneck,
      weekly_focus: metrics.executive_summary.weekly_focus,
      alerts: signals.slice(0, 4),
      ai: aiInsight,
    },
  };
}

export async function buildTaskDashboardPayload(supabaseAdmin: AdminClient) {
  const { tasks, sprints } = await buildTasksDataset(supabaseAdmin);
  const metrics: DashboardMetrics = buildDashboardMetrics(tasks, sprints);
  const taskAnalyses = tasks
    .map((task: TaskRecord) => {
      const signals = buildTaskSignals(task);
      if (!signals.length) return null;
      const completeness = calculateTaskCompleteness(task);

      const severity = [...signals].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))[0]?.severity ?? 'low';

      return {
        task_id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee_name: task.assignee?.full_name ?? null,
        active_sprint_goal: task.active_sprint?.goal ?? null,
        severity,
        signals_count: signals.length,
        missing_fields: completeness.missing_fields,
        signals,
      };
    })
    .filter((item: {
      task_id: string;
      title: string;
      status: TaskRecord['status'];
      priority: TaskRecord['priority'];
      assignee_name: string | null;
      active_sprint_goal: string | null;
      severity: IntelligenceSignal['severity'];
      signals_count: number;
      missing_fields: string[];
      signals: IntelligenceSignal[];
    } | null): item is {
      task_id: string;
      title: string;
      status: TaskRecord['status'];
      priority: TaskRecord['priority'];
      assignee_name: string | null;
      active_sprint_goal: string | null;
      severity: IntelligenceSignal['severity'];
      signals_count: number;
      missing_fields: string[];
      signals: IntelligenceSignal[];
    } => item !== null);
  const taskSignals = taskAnalyses.flatMap((item: {
    signals: IntelligenceSignal[];
  }) => item.signals ?? []);
  const portfolioSignals = buildPortfolioSignals(tasks, sprints);
  const signals = [...portfolioSignals, ...taskSignals];
  const deterministicAI = buildDeterministicAIInsight(tasks, metrics, signals);
  const aiSnapshot = await getLatestDashboardAISnapshot(supabaseAdmin);
  const snapshotInsight = aiSnapshot?.insight && typeof aiSnapshot.insight === 'object' ? aiSnapshot.insight as AIInsight : null;
  const ai = snapshotInsight ?? deterministicAI;

  return {
    generated_at: nowIso(),
    metrics,
    signals,
    tasks,
    ai_snapshot: aiSnapshot
      ? {
          generated_at: aiSnapshot.generated_at,
          generated_by: aiSnapshot.generated_by ?? null,
          source: (snapshotInsight?.source ?? 'deterministic') as AIInsight['source'],
        }
      : null,
    task_analyses: taskAnalyses,
    ai,
    tasks_count: tasks.length,
    sprints_count: sprints.length,
  };
}

export async function buildTaskIntelligence(supabaseAdmin: AdminClient, taskId: string) {
  const { tasks, sprints } = await buildTasksDataset(supabaseAdmin);
  const task = tasks.find((item: TaskRecord) => item.id === taskId);
  if (!task) return null;
  const completeness = calculateTaskCompleteness(task);
  const signals = buildTaskSignals(task);
  const dashboardMetrics = buildDashboardMetrics(tasks, sprints);
  const ai = buildDeterministicAIInsight([task], dashboardMetrics, signals);

  return {
    task_id: taskId,
    completeness,
    signals,
    ai,
  };
}

export async function blockTask(
  supabaseAdmin: AdminClient,
  taskId: string,
  actorId: string,
  payload: {
    reason: string;
    category: string | null;
    expected_unblock_date: string | null;
  }
) {
  const current = await selectSingleTask(supabaseAdmin, taskId);
  if (current.error || !current.data) throw new Error('Task não encontrada');

  const task = current.data as TaskRecord;
  if (!['in_progress', 'review', 'done'].includes(task.status)) {
    throw new Error('Apenas tasks em andamento, review ou done podem ser bloqueadas');
  }

  const timestamp = nowIso();
  const nextBlockedCount = (task.blocked_count ?? 0) + 1;
  const updatePayload = {
    status: 'blocked',
    blocked_from_status: task.status,
    block_reason: payload.reason,
    block_category: payload.category,
    expected_unblock_date: payload.expected_unblock_date,
    last_blocked_at: timestamp,
    blocked_count: nextBlockedCount,
    had_delay: task.had_delay ?? null,
  };

  const { error: updateErr } = await supabaseAdmin
    .from('admin_tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (updateErr) throw new Error(updateErr.message);

  await Promise.all([
    supabaseAdmin.from('admin_task_history').insert({
      task_id: taskId,
      changed_by: actorId,
      field_changed: 'status',
      old_value: task.status,
      new_value: 'blocked',
    }),
    supabaseAdmin.from('admin_task_block_events').insert({
      task_id: taskId,
      event_kind: 'blocked',
      blocked_from_status: task.status,
      target_status: 'blocked',
      actor_id: actorId,
      reason: payload.reason,
      category: payload.category,
      expected_unblock_date: payload.expected_unblock_date,
    }),
  ]);
}

export async function unblockTask(
  supabaseAdmin: AdminClient,
  taskId: string,
  actorId: string,
  payload: {
    target_status: 'in_progress' | 'review' | 'done';
    resolution_note: string | null;
  }
) {
  const current = await selectSingleTask(supabaseAdmin, taskId);
  if (current.error || !current.data) throw new Error('Task não encontrada');

  const task = current.data as TaskRecord;
  if (task.status !== 'blocked') {
    throw new Error('Apenas tasks bloqueadas podem ser desbloqueadas');
  }

  const blockStartedAt = task.last_blocked_at ? new Date(task.last_blocked_at).getTime() : null;
  const blockedDeltaSeconds = blockStartedAt
    ? Math.max(0, Math.round((Date.now() - blockStartedAt) / 1000))
    : 0;

  const { error: updateErr } = await supabaseAdmin
    .from('admin_tasks')
    .update({
      status: payload.target_status,
      blocked_from_status: null,
      block_reason: null,
      block_category: null,
      expected_unblock_date: null,
      total_blocked_time_seconds: (task.total_blocked_time_seconds ?? 0) + blockedDeltaSeconds,
    })
    .eq('id', taskId);

  if (updateErr) throw new Error(updateErr.message);

  await Promise.all([
    supabaseAdmin.from('admin_task_history').insert({
      task_id: taskId,
      changed_by: actorId,
      field_changed: 'status',
      old_value: 'blocked',
      new_value: payload.target_status,
    }),
    supabaseAdmin.from('admin_task_block_events').insert({
      task_id: taskId,
      event_kind: 'unblocked',
      blocked_from_status: task.blocked_from_status ?? null,
      target_status: payload.target_status,
      actor_id: actorId,
      reason: task.block_reason ?? null,
      category: task.block_category ?? null,
      resolution_note: payload.resolution_note,
    }),
  ]);
}

export async function reopenTask(
  supabaseAdmin: AdminClient,
  taskId: string,
  actorId: string,
  payload: {
    target_status: 'in_progress' | 'review' | 'blocked';
    reason: string;
    category: string | null;
  }
) {
  const current = await selectSingleTask(supabaseAdmin, taskId);
  if (current.error || !current.data) throw new Error('Task não encontrada');

  const task = current.data as TaskRecord;
  if (task.status !== 'done') {
    throw new Error('Apenas tasks concluídas podem ser reabertas');
  }

  const reopenedCount = (task.reopened_count ?? 0) + 1;
  const timestamp = nowIso();
  const updatePayload: Record<string, unknown> = {
    status: payload.target_status,
    reopened_count: reopenedCount,
    last_reopened_at: timestamp,
    had_rework: true,
    completed_at: null,
    completed_by: null,
  };

  if (payload.target_status === 'blocked') {
    updatePayload.blocked_from_status = 'done';
    updatePayload.block_reason = payload.reason;
    updatePayload.block_category = payload.category;
    updatePayload.last_blocked_at = timestamp;
    updatePayload.blocked_count = (task.blocked_count ?? 0) + 1;
  }

  const { error: updateErr } = await supabaseAdmin
    .from('admin_tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (updateErr) throw new Error(updateErr.message);

  const operations: Promise<PostgrestSingleResponse<null>>[] = [
    supabaseAdmin.from('admin_task_history').insert({
      task_id: taskId,
      changed_by: actorId,
      field_changed: 'status',
      old_value: 'done',
      new_value: payload.target_status,
    }),
    supabaseAdmin.from('admin_task_reopen_events').insert({
      task_id: taskId,
      reopened_from_status: 'done',
      reopened_to_status: payload.target_status,
      reason: payload.reason,
      category: payload.category,
      actor_id: actorId,
    }),
  ];

  if (payload.target_status === 'blocked') {
    operations.push(
      supabaseAdmin.from('admin_task_block_events').insert({
        task_id: taskId,
        event_kind: 'blocked',
        blocked_from_status: 'done',
        target_status: 'blocked',
        actor_id: actorId,
        reason: payload.reason,
        category: payload.category,
      })
    );
  }

  await Promise.all(operations);
}

export function sanitizeTaskUpdateBody(body: Record<string, unknown>) {
  return { ...body };
}

export function getDeterministicWeeklyFocus(ai: AIInsight, metrics: DashboardMetrics, signals: IntelligenceSignal[]) {
  const topSignal = signals.find((signal) => signal.severity === 'critical') ?? signals[0];
  return {
    focus: ai.focus_of_week,
    top_signal: topSignal ?? null,
    recommendation: ai.recommended_action,
    bottleneck: metrics.executive_summary.main_bottleneck,
  };
}
