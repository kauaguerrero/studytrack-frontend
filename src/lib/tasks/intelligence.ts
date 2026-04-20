export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskSignalType =
  | 'low_task_completeness'
  | 'task_aging_too_high'
  | 'in_progress_without_recent_update'
  | 'blocked_too_long'
  | 'sprint_high_carry_over'
  | 'review_bottleneck'
  | 'rework_above_baseline'
  | 'wip_too_high'
  | 'critical_task_blocked'
  | 'done_task_reopened';

export interface TaskActor {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TaskHistoryEntry {
  id?: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changer?: { full_name: string } | null;
}

export interface TaskBlockEvent {
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
}

export interface TaskReopenEvent {
  id: string;
  reopened_from_status: TaskStatus;
  reopened_to_status: TaskStatus;
  reason: string;
  category: string | null;
  actor_id: string;
  created_at: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  scope: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  deadline?: string | null;
  target_date?: string | null;
  created_by: string;
  assignee_id?: string | null;
  co_assignee_id?: string | null;
  assignee?: TaskActor | null;
  co_assignee?: TaskActor | null;
  creator?: TaskActor | null;
  description?: string | null;
  task_type?: string | null;
  problem_context?: string | null;
  expected_outcome?: string | null;
  expected_impact?: string | null;
  dependencies?: unknown;
  request_source?: string | null;
  acceptance_criteria?: string | null;
  estimate_hours?: number | null;
  tags?: unknown;
  module_or_area?: string | null;
  progress_notes?: string | null;
  completed_work?: string | null;
  remaining_work?: string | null;
  next_step?: string | null;
  current_blockers?: string | null;
  dependency_updates?: string | null;
  delivery_summary?: string | null;
  pending_items?: string | null;
  delivery_evidence?: string | null;
  had_rework?: boolean | null;
  had_scope_deviation?: boolean | null;
  had_delay?: boolean | null;
  delay_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  reopened_count?: number | null;
  blocked_count?: number | null;
  total_blocked_time_seconds?: number | null;
  last_progress_update_at?: string | null;
  blocked_from_status?: TaskStatus | null;
  block_reason?: string | null;
  block_category?: string | null;
  expected_unblock_date?: string | null;
  last_blocked_at?: string | null;
  last_reopened_at?: string | null;
  progress?: {
    already_done?: string | null;
    currently_doing?: string | null;
    remaining?: string | null;
    updated_at?: string | null;
  } | null;
  completion?: {
    files_modified_count?: number | null;
    files_modified_list?: string[] | null;
    summary?: string | null;
    completed_at?: string | null;
  } | null;
  history?: TaskHistoryEntry[];
  block_events?: TaskBlockEvent[];
  reopen_events?: TaskReopenEvent[];
  active_sprint?: {
    id: string;
    goal: string;
    status: 'active' | 'completed';
    start_date: string;
    end_date: string;
  } | null;
}

export interface ScoreRule {
  id: string;
  label: string;
  met: boolean;
}

export interface CompletenessScore {
  score: number;
  percentage: number;
  missing_fields: string[];
  rules: ScoreRule[];
}

export interface TaskCompleteness {
  creation: CompletenessScore;
  progress: CompletenessScore;
  closure: CompletenessScore;
  consolidated: number;
  consolidated_percentage: number;
  missing_fields: string[];
}

export interface IntelligenceSignal {
  id: string;
  type: TaskSignalType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  diagnosis: string;
  evidence: string[];
  suggestion: string;
  scope: 'task' | 'portfolio' | 'sprint';
  created_at: string;
  updated_at: string;
}

export interface StageTiming {
  status: TaskStatus;
  seconds: number;
}

export interface SprintSnapshot {
  id: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  completed_at?: string | null;
  tasks: TaskRecord[];
}

export interface MetricValue {
  value: number;
  formatted: string;
  period: string;
  label: string;
  description: string;
  calculation: string;
  delta?: number | null;
  trend?: 'up' | 'down' | 'stable';
  suggested_action?: string;
}

export interface DashboardMetrics {
  executive_summary: {
    throughput: MetricValue;
    lead_time: MetricValue;
    cycle_time: MetricValue;
    sprint_completion_rate: MetricValue;
    carry_over_rate: MetricValue;
    rework_rate: MetricValue;
    block_rate: MetricValue;
    average_completeness_score: MetricValue;
    operational_risk: MetricValue;
    main_bottleneck: string;
    weekly_focus: string;
  };
  flow: {
    aging: MetricValue;
    time_in_stage: StageTiming[];
    distribution_by_status: Record<TaskStatus, number>;
    wip: MetricValue;
    review_bottleneck_count: number;
    stale_tasks_count: number;
    blocked_tasks_count: number;
    average_blocked_time: MetricValue;
  };
  predictability: {
    sprint_completion_rate: MetricValue;
    carry_over_by_sprint: Array<{ sprint_id: string; goal: string; rate: number }>;
    planned_vs_completed: Array<{ sprint_id: string; goal: string; planned: number; completed: number }>;
    estimate_vs_actual: MetricValue;
    on_time_vs_delayed: { on_time: number; delayed: number };
    scope_stability: Array<{ sprint_id: string; goal: string; had_scope_deviation: number }>;
  };
  quality: {
    creation_completeness: MetricValue;
    progress_completeness: MetricValue;
    closure_completeness: MetricValue;
    consolidated_completeness: MetricValue;
    most_missing_fields: Array<{ field: string; count: number }>;
    low_completeness_tasks: number;
  };
  blockers_and_risk: {
    block_rate: MetricValue;
    average_blocked_time: MetricValue;
    blocked_aging_hours: number;
    block_categories: Array<{ category: string; count: number }>;
    critical_blocked_tasks: number;
    retrabalho: MetricValue;
    reopening_rate: MetricValue;
    risk_by_sprint: Array<{ sprint_id: string; goal: string; risk_score: number }>;
  };
}

export interface AIInsight {
  title: string;
  bottleneck: string;
  evidence: string[];
  probable_impact: string;
  recommended_action: string;
  top_priorities: string[];
  focus_of_week: string;
  task_improvement_suggestions: string[];
  next_step_suggestions: string[];
  operational_summary: string;
  source: 'deterministic' | 'ai';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter(Boolean).join(', ').trim();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  const text = asText(value);
  if (!text) return [];
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return asText(value).length > 0;
}

function safeDate(dateLike: string | null | undefined): Date | null {
  if (!dateLike) return null;
  const value = new Date(dateLike);
  return Number.isNaN(value.getTime()) ? null : value;
}

function hoursBetween(start: string | null | undefined, end: string | null | undefined = new Date().toISOString()): number {
  const startDate = safeDate(start);
  const endDate = safeDate(end);
  if (!startDate || !endDate) return 0;
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / HOUR_MS);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatHours(value: number): string {
  if (value < 24) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTaskCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function topMissingFields(tasks: TaskRecord[], limit = 3): string[] {
  const missingFieldsMap = new Map<string, number>();

  for (const task of tasks) {
    const completeness = calculateTaskCompleteness(task);
    const contextual = getContextualCompleteness(task, completeness);
    for (const field of contextual.missing_fields) {
      missingFieldsMap.set(field, (missingFieldsMap.get(field) ?? 0) + 1);
    }
  }

  return [...missingFieldsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([field]) => field);
}

function buildScore(rules: ScoreRule[]): CompletenessScore {
  const total = rules.length || 1;
  const met = rules.filter((rule) => rule.met).length;
  const score = met / total;
  return {
    score,
    percentage: Math.round(score * 100),
    missing_fields: rules.filter((rule) => !rule.met).map((rule) => rule.label),
    rules,
  };
}

export function calculateTaskCompleteness(task: TaskRecord): TaskCompleteness {
  const requiresProgress = ['in_progress', 'review', 'blocked'].includes(task.status);
  const requiresClosure = task.status === 'done';

  const creation = buildScore([
    { id: 'title', label: 'titulo', met: isFilled(task.title) },
    { id: 'problem', label: 'descricao_do_problema', met: isFilled(task.description) || isFilled(task.scope) || isFilled(task.problem_context) },
    { id: 'outcome', label: 'resultado_esperado', met: isFilled(task.expected_outcome) },
    { id: 'priority', label: 'prioridade', met: isFilled(task.priority) },
    { id: 'assignee', label: 'responsavel', met: isFilled(task.assignee_id) },
    { id: 'type', label: 'tipo', met: isFilled(task.task_type) },
    { id: 'target', label: 'prazo_alvo', met: isFilled(task.target_date) || isFilled(task.deadline) },
  ]);

  const progress = buildScore([
    { id: 'recent_update', label: 'atualizacao_recente', met: !requiresProgress || hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, undefined) <= 72 },
    { id: 'completed_work', label: 'trabalho_concluido', met: !requiresProgress || isFilled(task.completed_work) || isFilled(task.progress?.already_done) },
    { id: 'remaining_work', label: 'trabalho_restante', met: !requiresProgress || isFilled(task.remaining_work) || isFilled(task.progress?.remaining) },
    { id: 'blockers', label: 'bloqueios_informados', met: !requiresProgress || task.status !== 'blocked' || isFilled(task.current_blockers) || isFilled(task.block_reason) },
  ]);

  const closure = buildScore([
    { id: 'delivery_summary', label: 'resumo_da_entrega', met: !requiresClosure || isFilled(task.delivery_summary) || isFilled(task.completion?.summary) },
    { id: 'delivery_evidence', label: 'evidencias', met: !requiresClosure || isFilled(task.delivery_evidence) || (task.completion?.files_modified_count ?? 0) > 0 },
    { id: 'rework_recorded', label: 'retrabalho_registrado', met: !requiresClosure || task.had_rework != null || (task.reopened_count ?? 0) > 0 },
    { id: 'delay_recorded', label: 'atraso_registrado', met: !requiresClosure || task.had_delay != null || isFilled(task.delay_reason) },
  ]);

  const consolidated = average([
    creation.score,
    ...(requiresProgress ? [progress.score] : []),
    ...(requiresClosure ? [closure.score] : []),
  ]);
  const missingFields = Array.from(
    new Set([
      ...creation.missing_fields,
      ...(requiresProgress ? progress.missing_fields : []),
      ...(requiresClosure ? closure.missing_fields : []),
    ])
  );

  return {
    creation,
    progress,
    closure,
    consolidated,
    consolidated_percentage: Math.round(consolidated * 100),
    missing_fields: missingFields,
  };
}

function getContextualCompleteness(task: TaskRecord, completeness = calculateTaskCompleteness(task)) {
  if (task.status === 'done') {
    return completeness.closure;
  }

  if (['in_progress', 'review', 'blocked'].includes(task.status)) {
    return completeness.progress;
  }

  return completeness.creation;
}

export function calculateStageTimings(task: TaskRecord, now = new Date()): StageTiming[] {
  const timings: Record<TaskStatus, number> = {
    backlog: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    blocked: 0,
    archived: 0,
  };

  const history = [...(task.history ?? [])]
    .filter((entry) => entry.field_changed === 'status')
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  let cursorStatus: TaskStatus = 'backlog';
  let cursorTime = safeDate(task.created_at) ?? now;

  for (const entry of history) {
    const changedAt = safeDate(entry.changed_at) ?? cursorTime;
    timings[cursorStatus] += Math.max(0, (changedAt.getTime() - cursorTime.getTime()) / 1000);
    const nextStatus = entry.new_value as TaskStatus | null;
    if (nextStatus) {
      cursorStatus = nextStatus;
      cursorTime = changedAt;
    }
  }

  timings[task.status] += Math.max(0, (now.getTime() - cursorTime.getTime()) / 1000);

  return (Object.keys(timings) as TaskStatus[]).map((status) => ({
    status,
    seconds: Math.round(timings[status]),
  }));
}

export function buildTaskSignals(task: TaskRecord, referenceDate = new Date().toISOString()): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];
  const completeness = calculateTaskCompleteness(task);
  const contextualCompleteness = getContextualCompleteness(task, completeness);
  const now = safeDate(referenceDate) ?? new Date();
  const agingHours = hoursBetween(task.created_at, referenceDate);
  const blockedHours = hoursBetween(task.last_blocked_at, referenceDate);
  const progressHours = hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, referenceDate);
  const isOpenTask = task.status !== 'done' && task.status !== 'archived';

  const createSignal = (
    type: TaskSignalType,
    severity: IntelligenceSignal['severity'],
    diagnosis: string,
    evidence: string[],
    suggestion: string
  ) => {
    signals.push({
      id: `${type}:${task.id}`,
      type,
      severity,
      diagnosis,
      evidence,
      suggestion,
      scope: 'task',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  };

  if (isOpenTask && contextualCompleteness.score < 0.6) {
    createSignal(
      'low_task_completeness',
      contextualCompleteness.score < 0.4 ? 'high' : 'medium',
      'A task está com baixa completude operacional.',
      [`Score do estágio atual em ${contextualCompleteness.percentage}%`, `Campos ausentes: ${contextualCompleteness.missing_fields.join(', ') || 'nenhum'}`],
      'Completar os campos ausentes antes de avançar o fluxo.'
    );
  }

  if (task.status !== 'done' && task.status !== 'archived' && agingHours > 45 * 24) {
    createSignal(
      'task_aging_too_high',
      agingHours > 60 * 24 ? 'high' : 'medium',
      'A task está envelhecendo acima do esperado.',
      [`Aging atual: ${formatHours(agingHours)}`, `Status atual: ${task.status}`],
      'Reavaliar escopo, prioridade e impedimentos da task.'
    );
  }

  if (task.status === 'in_progress' && progressHours > 72) {
    createSignal(
      'in_progress_without_recent_update',
      progressHours > 120 ? 'high' : 'medium',
      'Task em andamento sem atualização recente.',
      [`Última atualização há ${formatHours(progressHours)}`],
      'Registrar progresso, próximo passo e bloqueios atuais.'
    );
  }

  if (task.status === 'blocked' && blockedHours > 48) {
    createSignal(
      'blocked_too_long',
      blockedHours > 120 ? 'critical' : 'high',
      'Task bloqueada por tempo excessivo.',
      [`Tempo bloqueado atual: ${formatHours(blockedHours)}`, `Motivo: ${asText(task.block_reason) || 'não informado'}`],
      'Atuar no desbloqueio imediatamente ou redefinir o plano operacional.'
    );
  }

  if (task.priority === 'critical' && task.status === 'blocked') {
    createSignal(
      'critical_task_blocked',
      'critical',
      'Task crítica bloqueada.',
      [`Categoria: ${asText(task.block_category) || 'não informada'}`, `Tempo bloqueado: ${formatHours(blockedHours)}`],
      'Escalar o bloqueio e definir owner e prazo de resolução.'
    );
  }

  if (isOpenTask && (task.reopened_count ?? 0) > 0) {
    createSignal(
      'done_task_reopened',
      (task.reopened_count ?? 0) > 1 ? 'high' : 'medium',
      'Task concluída já foi reaberta.',
      [`Quantidade de reaberturas: ${task.reopened_count ?? 0}`, `Última reabertura: ${task.last_reopened_at ?? 'n/d'}`],
      'Revisar qualidade da definição e dos critérios de aceite.'
    );
  }

  return signals;
}

export function buildPortfolioSignals(tasks: TaskRecord[], sprints: SprintSnapshot[], referenceDate = new Date().toISOString()): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];
  const now = safeDate(referenceDate) ?? new Date();
  const reviewTasks = tasks.filter((task) => task.status === 'review');
  const wipCount = tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length;
  const activeAssignees = new Set(tasks.map((task) => task.assignee_id).filter(Boolean)).size || 1;
  const reopenedRate = percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length);

  const createSignal = (
    type: TaskSignalType,
    severity: IntelligenceSignal['severity'],
    diagnosis: string,
    evidence: string[],
    suggestion: string,
    scope: IntelligenceSignal['scope']
  ) => {
    signals.push({
      id: `${type}:${scope}`,
      type,
      severity,
      diagnosis,
      evidence,
      suggestion,
      scope,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  };

  if (reviewTasks.length >= 3) {
    createSignal(
      'review_bottleneck',
      reviewTasks.length >= 6 ? 'high' : 'medium',
      'Há gargalo de revisão no fluxo atual.',
      [`Tasks em review: ${reviewTasks.length}`],
      'Rebalancear capacidade de revisão ou quebrar lote de entregas.',
      'portfolio'
    );
  }

  if (wipCount > Math.max(5, activeAssignees * 3)) {
    createSignal(
      'wip_too_high',
      'high',
      'WIP acima do limite operacional esperado.',
      [`WIP atual: ${wipCount}`, `Responsáveis ativos: ${activeAssignees}`],
      'Reduzir trabalho simultâneo antes de puxar novas tasks.',
      'portfolio'
    );
  }

  if (reopenedRate >= 0.25) {
    createSignal(
      'rework_above_baseline',
      reopenedRate >= 0.4 ? 'critical' : 'high',
      'Retrabalho acima da linha de base.',
      [`Taxa de reabertura: ${formatPercent(reopenedRate)}`],
      'Revisar definição de pronto, critérios de aceite e revisão técnica.',
      'portfolio'
    );
  }

  for (const sprint of sprints) {
    if (!sprint.tasks.length) continue;
    const carryOverRate = percent(
      sprint.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length,
      sprint.tasks.length
    );

    if (carryOverRate >= 0.35) {
      createSignal(
        'sprint_high_carry_over',
        carryOverRate >= 0.5 ? 'critical' : 'high',
        'Carry-over de sprint acima do desejado.',
        [`Sprint: ${sprint.goal}`, `Carry-over: ${formatPercent(carryOverRate)}`],
        'Revisar capacidade planejada, dependências e critérios de entrada da sprint.',
        'sprint'
      );
    }
  }

  return signals;
}

export function buildDeterministicAIInsight(tasks: TaskRecord[], metrics: DashboardMetrics, signals: IntelligenceSignal[]): AIInsight {
  const blockedTasks = tasks.filter((task) => task.status === 'blocked');
  const staleTasks = tasks.filter((task) => task.status === 'in_progress' && hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at) > 72);
  const reviewTasks = tasks.filter((task) => task.status === 'review');
  const lowCompleteness = tasks
    .map((task) => ({ task, completeness: getContextualCompleteness(task) }))
    .filter((item) => item.task.status !== 'done' && item.task.status !== 'archived' && item.completeness.score < 0.6);
  const mostMissingFields = topMissingFields(
    tasks.filter((task) => task.status !== 'done' && task.status !== 'archived')
  );
  const carryOverRate = metrics.predictability.carry_over_by_sprint.length
    ? average(metrics.predictability.carry_over_by_sprint.map((item) => item.rate))
    : 0;
  const sprintCompletionRate = metrics.predictability.sprint_completion_rate.value;
  const completenessScore = metrics.executive_summary.average_completeness_score.value;
  const staleRate = percent(staleTasks.length, Math.max(tasks.filter((task) => task.status === 'in_progress').length, 1));
  const reviewPressure = reviewTasks.length >= 4;
  const blockedPressure = blockedTasks.length > 0;
  const completenessPressure = lowCompleteness.length >= 3;

  const bottleneck = blockedPressure
    ? `${formatTaskCount(blockedTasks.length, 'task bloqueada está', 'tasks bloqueadas estão')} concentrando risco imediato e travando previsibilidade.`
    : reviewPressure
      ? `${formatTaskCount(reviewTasks.length, 'task está', 'tasks estão')} acumuladas em review e comprimindo a vazão final do fluxo.`
      : completenessPressure
        ? `A qualidade de entrada está abaixo do necessário: ${formatTaskCount(lowCompleteness.length, 'task está', 'tasks estão')} com baixa completude.`
        : 'O fluxo não apresenta um gargalo único dominante, mas ainda depende de disciplina de atualização e definição clara das tasks prioritárias.';

  const topPriorities = [
    blockedTasks.length
      ? `Desbloquear ${formatTaskCount(blockedTasks.length, 'a task', 'as tasks')} em status blocked, começando pelas ${formatTaskCount(tasks.filter((task) => task.status === 'blocked' && task.priority === 'critical').length, 'crítica', 'críticas')}.`
      : '',
    staleTasks.length
      ? `Atualizar ${formatTaskCount(staleTasks.length, 'a task', 'as tasks')} em andamento sem progresso recente para recuperar visibilidade operacional.`
      : '',
    lowCompleteness.length
      ? `Enriquecer ${formatTaskCount(lowCompleteness.length, 'a task', 'as tasks')} com baixa completude, priorizando ${mostMissingFields.join(', ') || 'campos críticos'}.`
      : '',
  ].filter(Boolean).slice(0, 3);

  const evidence = [
    `Throughput atual em ${metrics.executive_summary.throughput.formatted} tasks concluídas na base analisada.`,
    `Block rate em ${metrics.executive_summary.block_rate.formatted} com ${formatTaskCount(blockedTasks.length, 'bloqueio ativo', 'bloqueios ativos')}.`,
    `Sprint completion em ${formatPercent(sprintCompletionRate)} e carry-over médio em ${formatPercent(carryOverRate)}.`,
    `Completude média em ${metrics.executive_summary.average_completeness_score.formatted}${mostMissingFields.length ? `; campos mais ausentes: ${mostMissingFields.join(', ')}.` : '.'}`,
  ];

  const probableImpact = blockedPressure
    ? `Se os bloqueios permanecerem, a tendência é elevar o carry-over acima de ${formatPercent(carryOverRate)} e manter a taxa de conclusão da sprint pressionada em ${formatPercent(sprintCompletionRate)}.`
    : reviewPressure
      ? `Se a fila de review não girar, entregas prontas continuarão represadas e o throughput tende a cair mesmo com execução em andamento.`
      : completenessPressure
        ? `Se a qualidade de entrada não subir, o efeito esperado é aumento de retrabalho, mais interrupções na execução e degradação da previsibilidade.`
        : 'Mantendo o WIP sob controle e as atualizações em dia, o fluxo tende a seguir estável sem aumento material do risco operacional.';

  const recommendedAction = blockedPressure
    ? `Fazer uma varredura imediata nas ${blockedTasks.length} tasks bloqueadas, definir owner e prazo de resolução para cada uma e retirar da sprint o que não puder ser destravado no curto prazo.`
    : reviewPressure
      ? `Redistribuir capacidade de review nas próximas 24 horas para reduzir a fila atual de ${reviewTasks.length} tasks e evitar acúmulo no fim do fluxo.`
      : completenessPressure
        ? `Corrigir os campos de contexto que mais faltam nas tasks com baixa completude: ${mostMissingFields.join(', ') || 'itens de contexto'}.`
        : 'Manter rotina semanal de revisão do board, limitando WIP e reforçando atualização de progresso nas tasks em andamento.';

  return {
    title: 'Inteligência Operacional',
    bottleneck,
    evidence,
    probable_impact: probableImpact,
    recommended_action: recommendedAction,
    top_priorities: topPriorities.length ? topPriorities : ['Fluxo operacional sem alertas acionáveis acima do baseline no momento.'],
    focus_of_week: blockedPressure
      ? `Reduzir bloqueios ativos e proteger a entrega da sprint antes de expandir escopo.`
      : staleRate >= 0.3
        ? `Restabelecer cadência de atualização nas tasks em andamento e reduzir frentes simultâneas.`
        : `Elevar a qualidade de definição das tasks prioritárias para sustentar previsibilidade.`,
    task_improvement_suggestions: [
      staleTasks.length
        ? `Padronizar atualização de completed_work, remaining_work e progress_notes nas ${staleTasks.length} tasks sem update recente.`
        : 'Preservar rotina de atualização objetiva em todas as tasks in_progress.',
      lowCompleteness.length
        ? `Priorizar o preenchimento de ${mostMissingFields.join(', ') || 'campos críticos'} nas tasks com menor completude operacional.`
        : 'Manter fechamento com summary e evidências da entrega para sustentar rastreabilidade.',
    ],
    next_step_suggestions: [
      blockedTasks.length
        ? `Resolver primeiro a task bloqueada há mais tempo e revisar as demais na sequência.`
        : `Revisar a task aberta com maior aging para validar prioridade, dependências e necessidade de fatiamento.`,
      reviewPressure
        ? `Esvaziar a fila de review antes de puxar novas entregas para execução.`
        : staleTasks.length
          ? `Atualizar as tasks sem progresso recente com próximo passo e impedimentos atuais.`
          : `Revisar o WIP atual e evitar abrir novas frentes sem concluir as mais próximas da entrega.`,
    ],
    operational_summary: `${tasks.length} tasks monitoradas, ${formatTaskCount(blockedTasks.length, 'bloqueada', 'bloqueadas')}, ${formatTaskCount(reviewTasks.length, 'em review', 'em review')}, ${formatTaskCount(staleTasks.length, 'sem atualização recente', 'sem atualização recente')}, risco operacional em ${metrics.executive_summary.operational_risk.formatted} e completude média em ${formatPercent(completenessScore)}.`,
    source: 'deterministic',
  };
}

export function buildDashboardMetrics(tasks: TaskRecord[], sprints: SprintSnapshot[], referenceDate = new Date().toISOString()): DashboardMetrics {
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived');
  const activeExecutionTasks = tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status));
  const backlogTasks = tasks.filter((task) => task.status === 'backlog');
  const blockedTasks = tasks.filter((task) => task.status === 'blocked');
  const reviewTasks = tasks.filter((task) => task.status === 'review');
  const staleTasks = tasks.filter((task) => task.status === 'in_progress' && hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at, referenceDate) > 72);
  const completeness = tasks.map(calculateTaskCompleteness);
  const openCompleteness = openTasks.map(calculateTaskCompleteness);
  const doneCompleteness = doneTasks.map(calculateTaskCompleteness);
  const activeExecutionCompleteness = activeExecutionTasks.map(calculateTaskCompleteness);
  const contextualOpenCompleteness = openTasks.map((task) => {
    const completeness = calculateTaskCompleteness(task);
    return {
      task,
      contextual: getContextualCompleteness(task, completeness),
    };
  });
  const stageTimings = tasks.flatMap((task) => calculateStageTimings(task));
  const timeInStage = (['backlog', 'in_progress', 'review', 'done', 'blocked', 'archived'] as TaskStatus[]).map((status) => ({
    status,
    seconds: Math.round(
      average(
        stageTimings
          .filter((entry) => entry.status === status)
          .map((entry) => entry.seconds)
      )
    ),
  }));

  const throughput = doneTasks.length;
  const leadTimes = doneTasks
    .filter((task) => safeDate(task.completed_at))
    .map((task) => hoursBetween(task.created_at, task.completed_at));
  const cycleTimes = doneTasks
    .filter((task) => safeDate(task.started_at) && safeDate(task.completed_at))
    .map((task) => hoursBetween(task.started_at, task.completed_at));
  const agingValues = openTasks.map((task) => hoursBetween(task.created_at, referenceDate));
  const blockedTimes = tasks
    .map((task) => (task.total_blocked_time_seconds ?? 0) / 3600)
    .filter((value) => value > 0);
  const creationScores = openCompleteness.map((item) => item.creation.score);
  const progressScores = activeExecutionCompleteness.map((item) => item.progress.score);
  const closureScores = doneCompleteness.map((item) => item.closure.score);
  const consolidatedScores = openCompleteness.map((item) => item.consolidated);
  const contextualOpenScores = contextualOpenCompleteness.map((item) => item.contextual.score);
  const signals = buildPortfolioSignals(tasks, sprints, referenceDate);
  const taskSignals = tasks.flatMap((task) => buildTaskSignals(task, referenceDate));
  const allSignals = [...signals, ...taskSignals];
  const currentOperationalSignals = allSignals.filter((signal) =>
    [
      'blocked_too_long',
      'critical_task_blocked',
      'in_progress_without_recent_update',
      'review_bottleneck',
      'wip_too_high',
      'low_task_completeness',
    ].includes(signal.type)
  );

  const completedOnTime = doneTasks.filter((task) => {
    const target = safeDate(task.target_date ?? task.deadline);
    const completedAt = safeDate(task.completed_at);
    return !target || !completedAt || completedAt.getTime() <= target.getTime();
  }).length;

  const delayedTasks = doneTasks.length - completedOnTime;
  const estimateVsActualValues = doneTasks
    .filter((task) => (task.estimate_hours ?? 0) > 0 && safeDate(task.started_at) && safeDate(task.completed_at))
    .map((task) => hoursBetween(task.started_at, task.completed_at) / Math.max(task.estimate_hours ?? 1, 1));

  const sprintCompletion = sprints.map((sprint) => ({
    sprint_id: sprint.id,
    goal: sprint.goal,
    isCompleted: sprint.status === 'completed',
    planned: sprint.tasks.length,
    completed: sprint.tasks.filter((task) => task.status === 'done').length,
    carryOver: sprint.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length,
    hadScopeDeviation: sprint.tasks.filter((task) => task.had_scope_deviation === true).length,
    riskScore: average(
      sprint.tasks.map((task) => {
        const taskCompleteness = getContextualCompleteness(task);
        const riskBase = task.status === 'blocked' ? 0.5 : 0;
        const reworkBase = Math.min((task.reopened_count ?? 0) * 0.2, 0.4);
        return Math.min(1, riskBase + reworkBase + (1 - taskCompleteness.score));
      })
    ),
  }));
  const completedSprintCompletion = sprintCompletion.filter((item) => item.isCompleted);

  const blockCategoriesMap = new Map<string, number>();
  for (const task of blockedTasks) {
    const category = asText(task.block_category) || 'uncategorized';
    blockCategoriesMap.set(category, (blockCategoriesMap.get(category) ?? 0) + 1);
  }

  const missingFieldsMap = new Map<string, number>();
  for (const item of contextualOpenCompleteness) {
    for (const field of item.contextual.missing_fields) {
      missingFieldsMap.set(field, (missingFieldsMap.get(field) ?? 0) + 1);
    }
  }

  const lowExecutionCompletenessTasks = activeExecutionTasks.filter((task) => getContextualCompleteness(task).score < 0.6);
  const lowBacklogCompletenessTasks = backlogTasks.filter((task) => getContextualCompleteness(task).score < 0.6);

  const mainBottleneck = blockedTasks.length
    ? 'Bloqueios ativos concentrando risco operacional.'
    : reviewTasks.length >= 3
      ? 'Fila de review acima do nível saudável.'
      : staleTasks.length >= 3
        ? 'Tasks em andamento sem atualização recente reduzindo previsibilidade.'
        : lowExecutionCompletenessTasks.length >= 3
          ? 'Baixa qualidade de atualização nas tasks em andamento.'
          : lowBacklogCompletenessTasks.length >= 3
            ? 'Definição insuficiente das tasks antes da execução.'
            : 'O fluxo está estável, sem um gargalo operacional dominante no momento.';

  const weeklyFocus = blockedTasks.length
    ? 'Destravar as tasks críticas bloqueadas e reduzir carry-over.'
    : staleTasks.length
      ? 'Atualizar tasks em andamento e reduzir WIP antes de abrir novas frentes.'
      : lowExecutionCompletenessTasks.length
        ? 'Reforçar atualização de progresso, próximos passos e bloqueios das tasks em andamento.'
        : lowBacklogCompletenessTasks.length
          ? 'Melhorar definição e critérios de aceite das tasks que ainda vão entrar em execução.'
          : 'Manter a disciplina operacional atual e revisar o board semanalmente.';

  return {
    executive_summary: {
      throughput: {
        value: throughput,
        formatted: formatNumber(throughput),
        period: 'Janela atual de tasks carregadas',
        label: 'Throughput',
        description: 'Quantidade de tasks concluídas no período analisado.',
        calculation: 'Contagem de tasks com status done.',
        suggested_action: 'Comparar com a capacidade planejada da sprint.',
      },
      lead_time: {
        value: median(leadTimes),
        formatted: formatHours(median(leadTimes)),
        period: 'Tasks concluídas no período',
        label: 'Lead Time',
        description: 'Tempo entre criação e conclusão.',
        calculation: 'Mediana de completed_at - created_at.',
        suggested_action: 'Atuar em bloqueios e clareza das tasks para reduzir o lead time.',
      },
      cycle_time: {
        value: median(cycleTimes),
        formatted: formatHours(median(cycleTimes)),
        period: 'Tasks concluídas com started_at',
        label: 'Cycle Time',
        description: 'Tempo entre início real e conclusão.',
        calculation: 'Mediana de completed_at - started_at.',
        suggested_action: 'Reduzir interrupções e dependências durante a execução.',
      },
      sprint_completion_rate: {
        value: average(completedSprintCompletion.map((item) => percent(item.completed, item.planned))),
        formatted: formatPercent(average(completedSprintCompletion.map((item) => percent(item.completed, item.planned)))),
        period: completedSprintCompletion.length ? 'Sprints concluídas' : 'Sem sprint concluída',
        label: 'Sprint Completion Rate',
        description: 'Percentual médio de tasks concluídas por sprint.',
        calculation: 'Média de completed/planned apenas nas sprints concluídas.',
        suggested_action: 'Replanejar escopo quando a taxa cair abaixo do nível esperado.',
      },
      carry_over_rate: {
        value: average(completedSprintCompletion.map((item) => percent(item.carryOver, item.planned))),
        formatted: formatPercent(average(completedSprintCompletion.map((item) => percent(item.carryOver, item.planned)))),
        period: completedSprintCompletion.length ? 'Sprints concluídas' : 'Sem sprint concluída',
        label: 'Carry-over Rate',
        description: 'Percentual médio de trabalho que sobra ao fim da sprint.',
        calculation: 'Média de carryOver/planned apenas nas sprints concluídas.',
        suggested_action: 'Reduzir WIP e revisar dependências antes da entrada na sprint.',
      },
      rework_rate: {
        value: percent(tasks.filter((task) => (task.had_rework === true) || (task.reopened_count ?? 0) > 0).length, tasks.length),
        formatted: formatPercent(percent(tasks.filter((task) => (task.had_rework === true) || (task.reopened_count ?? 0) > 0).length, tasks.length)),
        period: 'Portfolio atual',
        label: 'Rework Rate',
        description: 'Percentual de tasks com retrabalho identificado.',
        calculation: 'Tasks com had_rework=true ou reopened_count>0 dividido pelo total.',
        suggested_action: 'Melhorar definição de pronto e critérios de aceite.',
      },
      block_rate: {
        value: percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length),
        formatted: formatPercent(percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length)),
        period: 'Portfolio atual',
        label: 'Block Rate',
        description: 'Percentual de tasks que sofreram bloqueio.',
        calculation: 'Tasks com blocked_count>0 ou status blocked dividido pelo total.',
        suggested_action: 'Atacar categorias de bloqueio mais frequentes.',
      },
      average_completeness_score: {
        value: average(contextualOpenScores),
        formatted: formatPercent(average(contextualOpenScores)),
        period: 'Tasks abertas',
        label: 'Average Completeness Score',
        description: 'Score médio de completude considerando o estágio atual de cada task aberta.',
        calculation: 'Backlog usa criação; em andamento/review/blocked usam progresso.',
        suggested_action: 'Corrigir os campos faltantes conforme o estágio atual das tasks abertas.',
      },
      operational_risk: {
        value: Math.min(1, average([
          percent(blockedTasks.length, Math.max(openTasks.length, 1)),
          percent(staleTasks.length, Math.max(openTasks.length, 1)),
          1 - average(contextualOpenScores.length ? contextualOpenScores : [1]),
          percent(
            currentOperationalSignals.filter((signal) => signal.severity === 'critical').length,
            Math.max(currentOperationalSignals.length, 1)
          ),
        ])),
        formatted: formatPercent(Math.min(1, average([
          percent(blockedTasks.length, Math.max(openTasks.length, 1)),
          percent(staleTasks.length, Math.max(openTasks.length, 1)),
          1 - average(contextualOpenScores.length ? contextualOpenScores : [1]),
          percent(
            currentOperationalSignals.filter((signal) => signal.severity === 'critical').length,
            Math.max(currentOperationalSignals.length, 1)
          ),
        ]))),
        period: 'Portfolio atual',
        label: 'Risco Operacional Geral',
        description: 'Leitura composta de bloqueios, stale work, completude contextual e sinais críticos do fluxo atual.',
        calculation: 'Média normalizada dos componentes de risco do estado operacional atual.',
        suggested_action: 'Priorizar sinais críticos antes de aumentar o escopo.',
      },
      main_bottleneck: mainBottleneck,
      weekly_focus: weeklyFocus,
    },
    flow: {
      aging: {
        value: median(agingValues),
        formatted: formatHours(median(agingValues)),
        period: 'Tasks abertas',
        label: 'Aging',
        description: 'Tempo mediano que as tasks abertas estão no sistema.',
        calculation: 'Mediana de now - created_at para tasks não encerradas.',
      },
      time_in_stage: timeInStage,
      distribution_by_status: {
        backlog: tasks.filter((task) => task.status === 'backlog').length,
        in_progress: tasks.filter((task) => task.status === 'in_progress').length,
        review: reviewTasks.length,
        done: doneTasks.length,
        blocked: blockedTasks.length,
        archived: tasks.filter((task) => task.status === 'archived').length,
      },
      wip: {
        value: tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length,
        formatted: formatNumber(tasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status)).length),
        period: 'Estado atual',
        label: 'WIP',
        description: 'Trabalho em andamento incluindo review e bloqueios.',
        calculation: 'Contagem de in_progress + review + blocked.',
        suggested_action: 'Limitar novas entradas quando o WIP ultrapassar a capacidade.',
      },
      review_bottleneck_count: reviewTasks.length,
      stale_tasks_count: staleTasks.length,
      blocked_tasks_count: blockedTasks.length,
      average_blocked_time: {
        value: average(blockedTimes),
        formatted: formatHours(average(blockedTimes)),
        period: 'Tasks com histórico de bloqueio',
        label: 'Average Blocked Time',
        description: 'Tempo médio acumulado em bloqueio por task.',
        calculation: 'Média de total_blocked_time_seconds / 3600.',
        suggested_action: 'Atacar categorias de bloqueio com maior impacto.',
      },
    },
    predictability: {
      sprint_completion_rate: {
        value: average(completedSprintCompletion.map((item) => percent(item.completed, item.planned))),
        formatted: formatPercent(average(completedSprintCompletion.map((item) => percent(item.completed, item.planned)))),
        period: completedSprintCompletion.length ? 'Sprints concluídas' : 'Sem sprint concluída',
        label: 'Sprint Completion Rate',
        description: 'Percentual médio de tasks concluídas por sprint.',
        calculation: 'Média de completed/planned apenas nas sprints concluídas.',
      },
      carry_over_by_sprint: completedSprintCompletion.map((item) => ({
        sprint_id: item.sprint_id,
        goal: item.goal,
        rate: percent(item.carryOver, item.planned),
      })),
      planned_vs_completed: sprintCompletion.map((item) => ({
        sprint_id: item.sprint_id,
        goal: item.goal,
        planned: item.planned,
        completed: item.completed,
      })),
      estimate_vs_actual: {
        value: average(estimateVsActualValues),
        formatted: estimateVsActualValues.length ? `${average(estimateVsActualValues).toFixed(2)}x` : 'n/d',
        period: 'Tasks concluídas com estimativa',
        label: 'Estimate vs Actual',
        description: 'Relação média entre esforço real e estimado.',
        calculation: 'Média de actual_hours / estimate_hours.',
        suggested_action: 'Revisar calibragem das estimativas em tasks similares.',
      },
      on_time_vs_delayed: {
        on_time: completedOnTime,
        delayed: delayedTasks,
      },
      scope_stability: sprintCompletion.map((item) => ({
        sprint_id: item.sprint_id,
        goal: item.goal,
        had_scope_deviation: item.hadScopeDeviation,
      })),
    },
    quality: {
      creation_completeness: {
        value: average(creationScores),
        formatted: formatPercent(average(creationScores)),
        period: 'Tasks abertas',
        label: 'Creation Completeness',
        description: 'Score médio de completude de criação das tasks abertas.',
        calculation: 'Média do score de criação das tasks abertas.',
      },
      progress_completeness: {
        value: average(progressScores),
        formatted: formatPercent(average(progressScores)),
        period: 'Tasks em execução',
        label: 'Progress Completeness',
        description: 'Score médio de completude de progresso das tasks em execução.',
        calculation: 'Média do score de progresso das tasks em andamento, review e blocked.',
      },
      closure_completeness: {
        value: average(closureScores),
        formatted: formatPercent(average(closureScores)),
        period: 'Tasks concluídas',
        label: 'Closure Completeness',
        description: 'Score médio de completude de encerramento das tasks concluídas.',
        calculation: 'Média do score de closure das tasks com status done.',
      },
      consolidated_completeness: {
        value: average(contextualOpenScores),
        formatted: formatPercent(average(contextualOpenScores)),
        period: 'Tasks abertas',
        label: 'Consolidated Completeness',
        description: 'Score médio de completude das tasks abertas conforme o estágio atual.',
        calculation: 'Backlog usa criação; execução usa progresso.',
      },
      most_missing_fields: [...missingFieldsMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([field, count]) => ({ field, count })),
      low_completeness_tasks: contextualOpenCompleteness.filter((item) => item.contextual.score < 0.6).length,
    },
    blockers_and_risk: {
      block_rate: {
        value: percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length),
        formatted: formatPercent(percent(tasks.filter((task) => (task.blocked_count ?? 0) > 0 || task.status === 'blocked').length, tasks.length)),
        period: 'Portfolio atual',
        label: 'Block Rate',
        description: 'Percentual de tasks com histórico de bloqueio.',
        calculation: 'Tasks bloqueadas / total de tasks.',
      },
      average_blocked_time: {
        value: average(blockedTimes),
        formatted: formatHours(average(blockedTimes)),
        period: 'Tasks com bloqueio',
        label: 'Average Blocked Time',
        description: 'Tempo médio em bloqueio.',
        calculation: 'Média de total_blocked_time_seconds.',
      },
      blocked_aging_hours: median(blockedTasks.map((task) => hoursBetween(task.last_blocked_at, referenceDate))),
      block_categories: [...blockCategoriesMap.entries()].map(([category, count]) => ({ category, count })),
      critical_blocked_tasks: blockedTasks.filter((task) => task.priority === 'critical').length,
      retrabalho: {
        value: percent(tasks.filter((task) => task.had_rework === true).length, tasks.length),
        formatted: formatPercent(percent(tasks.filter((task) => task.had_rework === true).length, tasks.length)),
        period: 'Portfolio atual',
        label: 'Retrabalho',
        description: 'Percentual de tasks com retrabalho marcado.',
        calculation: 'Tasks com had_rework dividido pelo total.',
      },
      reopening_rate: {
        value: percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length),
        formatted: formatPercent(percent(tasks.filter((task) => (task.reopened_count ?? 0) > 0).length, tasks.length)),
        period: 'Portfolio atual',
        label: 'Reopening Rate',
        description: 'Percentual de tasks reabertas.',
        calculation: 'Tasks com reopened_count>0 dividido pelo total.',
      },
      risk_by_sprint: sprintCompletion.map((item) => ({
        sprint_id: item.sprint_id,
        goal: item.goal,
        risk_score: item.riskScore,
      })),
    },
  };
}
