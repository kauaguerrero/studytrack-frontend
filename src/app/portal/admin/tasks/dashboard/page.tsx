'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  ListFilter,
  PieChart as PieChartIcon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useTaskDashboard } from '../hooks/useTasks';
import { mutate } from 'swr';
import type { IntelligenceSignal, StageTiming, TaskPriority, TaskRecord, TaskStatus } from '@/lib/tasks/intelligence';
import { calculateStageTimings } from '@/lib/tasks/intelligence';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6366f1',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
  archived: '#71717a',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
  blocked: 'Bloqueado',
  archived: 'Arquivado',
};

const SEVERITY_CARD: Record<string, string> = {
  low: 'border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30',
  medium: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
  high: 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30',
  critical: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
};

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítico',
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const HOUR_MS = 60 * 60 * 1000;

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursBetween(start: string | null | undefined, end = new Date()) {
  const startDate = safeDate(start);
  if (!startDate) return 0;
  return Math.max(0, (end.getTime() - startDate.getTime()) / HOUR_MS);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatHours(value: number) {
  if (!value) return '0h';
  if (value < 24) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

function averageStageTimings(tasks: TaskRecord[]): StageTiming[] {
  return (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => {
    const values = tasks
      .flatMap((task) => calculateStageTimings(task))
      .filter((entry) => entry.status === status)
      .map((entry) => entry.seconds);

    return {
      status,
      seconds: Math.round(average(values)),
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  helper,
  description,
  suggestedAction,
}: {
  label: string;
  value: string;
  helper?: string;
  description: string;
  suggestedAction?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">{label}</p>
      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{value}</p>
      {helper && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{helper}</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed flex-1">{description}</p>
      {suggestedAction && (
        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-3 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-2">
          → {suggestedAction}
        </p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TaskAnalysisCard({
  analysis,
}: {
  analysis: {
    task_id: string;
    title: string;
    status: string;
    priority: string;
    assignee_name: string | null;
    active_sprint_goal: string | null;
    severity: IntelligenceSignal['severity'];
    signals_count: number;
    missing_fields?: string[];
    signals: IntelligenceSignal[];
  };
}) {
  const topSignals = [...analysis.signals]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
    .slice(0, 3);
  const missingFields = analysis.missing_fields ?? [];

  return (
    <div className={`rounded-2xl border p-4 ${SEVERITY_CARD[analysis.severity] ?? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${SEVERITY_BADGE[analysis.severity] ?? ''}`}>
              {SEVERITY_LABELS[analysis.severity] ?? analysis.severity}
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {STATUS_LABELS[analysis.status] ?? analysis.status}
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {analysis.priority}
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{analysis.title}</p>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
            {analysis.assignee_name ? `Owner: ${analysis.assignee_name}` : 'Sem owner definido'}
            {analysis.active_sprint_goal ? ` • Sprint: ${analysis.active_sprint_goal}` : ''}
          </p>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {analysis.signals_count} sinal{analysis.signals_count !== 1 ? 'is' : ''}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {missingFields.length > 0 && (
          <div className="rounded-xl bg-white/70 dark:bg-zinc-950/50 border border-white/70 dark:border-zinc-900 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Campos Ausentes
            </p>
            <p className="text-xs text-zinc-900 dark:text-zinc-100 mt-1 leading-snug">
              {missingFields.join(', ')}
            </p>
          </div>
        )}
        {topSignals.map((signal) => (
          <div key={signal.id} className="rounded-xl bg-white/70 dark:bg-zinc-950/50 border border-white/70 dark:border-zinc-900 px-3 py-2">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{signal.diagnosis}</p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">{signal.suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeInStageChart({ data }: { data: StageTiming[] }) {
  const chartData = data
    .filter((item) => item.status !== 'done' && item.status !== 'archived')
    .map((item) => ({
      name: STATUS_LABELS[item.status] ?? item.status,
      horas: parseFloat((item.seconds / 3600).toFixed(1)),
      color: STATUS_COLORS[item.status] ?? '#71717a',
    }));

  if (!chartData.length) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
        Histórico de status insuficiente para calcular tempo por estágio.
      </p>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
          <Tooltip formatter={(v) => [`${v as number}h`, "Tempo médio"]} />
          <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeInStageLineChart({ data }: { data: StageTiming[] }) {
  const chartData = data
    .filter((item) => item.status !== 'done' && item.status !== 'archived')
    .map((item) => ({
      name: STATUS_LABELS[item.status] ?? item.status,
      horas: parseFloat((item.seconds / 3600).toFixed(1)),
    }));

  if (!chartData.length) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
        Histórico de status insuficiente para calcular tempo por estágio.
      </p>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} />
          <Tooltip formatter={(v) => [`${v as number}h`, 'Tempo médio']} />
          <Line type="monotone" dataKey="horas" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlannedVsCompletedChart({
  data,
}: {
  data: { sprint_id: string; goal: string; planned: number; completed: number }[];
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
        Nenhuma sprint com dados de planejamento vs. execução.
      </p>
    );
  }

  const chartData = data.map((item) => ({
    name: item.goal.length > 14 ? item.goal.slice(0, 14) + '…' : item.goal,
    Planejado: item.planned,
    Concluído: item.completed,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Planejado" fill="#6366f1" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          <Bar dataKey="Concluído" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BlockCategoriesChart({ data }: { data: { category: string; count: number }[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
        Sem categorias de bloqueio registradas.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count ?? 1;

  return (
    <div className="space-y-2.5">
      {sorted.map((item) => (
        <div key={item.category} className="flex items-center gap-3">
          <span className="text-xs text-zinc-700 dark:text-zinc-300 w-32 truncate capitalize">{item.category}</span>
          <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-400 dark:bg-red-500 transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 w-5 text-right tabular-nums">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaskIntelligenceDashboardPage() {
  const { data, isLoading, error } = useTaskDashboard();
  const [isOperationalDialogOpen, setIsOperationalDialogOpen] = useState(false);
  const [isGeneratingAIAnalysis, setIsGeneratingAIAnalysis] = useState(false);
  const [aiAnalysisError, setAIAnalysisError] = useState<string | null>(null);
  const [flowPeriodFilter, setFlowPeriodFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [flowAssigneeFilter, setFlowAssigneeFilter] = useState('all');
  const [flowPriorityFilter, setFlowPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [flowDistributionView, setFlowDistributionView] = useState<'pie' | 'bar'>('pie');
  const [flowStageView, setFlowStageView] = useState<'bar' | 'line'>('bar');
  const [predictabilityCarryOverView, setPredictabilityCarryOverView] = useState<'bar' | 'line'>('bar');
  const [predictabilityDeliveryView, setPredictabilityDeliveryView] = useState<'bar' | 'line'>('bar');
  const [riskChartView, setRiskChartView] = useState<'bar' | 'line'>('bar');
  const tasks = data?.tasks ?? [];
  const taskAnalyses = data?.task_analyses ?? [];
  const portfolioSignals = (data?.signals ?? []).filter((signal) => signal.scope !== 'task');

  const flowAssigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) {
      if (task.assignee?.id && task.assignee.full_name) map.set(task.assignee.id, task.assignee.full_name);
      if (task.co_assignee?.id && task.co_assignee.full_name) map.set(task.co_assignee.id, task.co_assignee.full_name);
    }

    return [...map.entries()]
      .map(([id, full_name]) => ({ id, full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
  }, [tasks]);

  const filteredFlowTasks = useMemo(() => {
    const now = new Date();
    const periodDays = flowPeriodFilter === '7d' ? 7 : flowPeriodFilter === '30d' ? 30 : flowPeriodFilter === '90d' ? 90 : null;

    return tasks.filter((task) => {
      const createdAt = safeDate(task.created_at);
      const matchesPeriod = periodDays == null || !createdAt
        ? true
        : now.getTime() - createdAt.getTime() <= periodDays * 24 * HOUR_MS;
      const matchesAssignee = flowAssigneeFilter === 'all'
        ? true
        : task.assignee_id === flowAssigneeFilter || task.co_assignee_id === flowAssigneeFilter;
      const matchesPriority = flowPriorityFilter === 'all' ? true : task.priority === flowPriorityFilter;

      return matchesPeriod && matchesAssignee && matchesPriority;
    });
  }, [flowAssigneeFilter, flowPeriodFilter, flowPriorityFilter, tasks]);

  const filteredDistribution = useMemo(
    () =>
      (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => ({
        key: status,
        name: STATUS_LABELS[status],
        value: filteredFlowTasks.filter((task) => task.status === status).length,
        color: STATUS_COLORS[status] ?? '#71717a',
      })),
    [filteredFlowTasks]
  );

  const filteredTimeInStage = useMemo(() => averageStageTimings(filteredFlowTasks), [filteredFlowTasks]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-14 rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 rounded-3xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error instanceof Error ? error.message : String(error ?? '');
    return (
      <div className="space-y-4">
        <Link
          href="/portal/admin/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o board operacional
        </Link>
        <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-base font-bold text-red-800 dark:text-red-200">
                Falha ao carregar o dashboard analítico
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-md">
                {errorMessage || 'A requisição retornou um erro. Verifique se há tarefas cadastradas e tente novamente.'}
              </p>
            </div>
            <button
              onClick={() => mutate('/api/admin/tasks/dashboard')}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = data.metrics;
  const ai = data.ai;
  const aiSnapshot = data.ai_snapshot;
  const filteredOpenTasks = filteredFlowTasks.filter((task) => task.status !== 'done' && task.status !== 'archived');
  const filteredExecutionTasks = filteredFlowTasks.filter((task) => ['in_progress', 'review', 'blocked'].includes(task.status));
  const filteredBlockedTasks = filteredFlowTasks.filter((task) => task.status === 'blocked');
  const filteredReviewTasks = filteredFlowTasks.filter((task) => task.status === 'review');
  const filteredStaleTasks = filteredFlowTasks.filter(
    (task) => task.status === 'in_progress' && hoursBetween(task.last_progress_update_at ?? task.progress?.updated_at) > 72
  );
  const filteredAgingHours = median(filteredOpenTasks.map((task) => hoursBetween(task.created_at)));
  const filteredBlockedTime = average(
    filteredFlowTasks
      .map((task) => (task.total_blocked_time_seconds ?? 0) / 3600)
      .filter((value) => value > 0)
  );

  const carryOverChart = (metrics.predictability.carry_over_by_sprint ?? []).map((item) => ({
    name: item.goal.length > 14 ? item.goal.slice(0, 14) + '…' : item.goal,
    value: Math.round(item.rate * 100),
  }));

  const riskChart = (metrics.blockers_and_risk.risk_by_sprint ?? []).map((item) => ({
    name: item.goal.length > 14 ? item.goal.slice(0, 14) + '…' : item.goal,
    value: Math.round(item.risk_score * 100),
  }));

  const criticalTasks = taskAnalyses.filter((task) => task.severity === 'critical').length;
  const highTasks = taskAnalyses.filter((task) => task.severity === 'high').length;
  const analyzedTasksCount = taskAnalyses.length;
  const generatedAt = new Date(data.generated_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const aiGeneratedAt = aiSnapshot?.generated_at
    ? new Date(aiSnapshot.generated_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  async function generateAIAnalysis() {
    try {
      setAIAnalysisError(null);
      setIsGeneratingAIAnalysis(true);
      const response = await fetch('/api/admin/tasks/dashboard/ai-analysis', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao gerar análise com IA');
      }
      await mutate('/api/admin/tasks/dashboard');
      setAIAnalysisError(null);
    } catch (err) {
      setAIAnalysisError(err instanceof Error ? err.message : 'Falha ao gerar análise com IA');
    } finally {
      setIsGeneratingAIAnalysis(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <Link
            href="/portal/admin/tasks"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o board operacional
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard Analítico de Tasks
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Organizado por perguntas de gestão: fluxo, previsibilidade, qualidade operacional, risco e recomendações.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.tasks_count}</span> tasks
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.sprints_count}</span> sprints
              </span>
            </div>
            {criticalTasks > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {criticalTasks} task{criticalTasks !== 1 ? 's' : ''} crítica{criticalTasks !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {highTasks > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  {highTasks} task{highTasks !== 1 ? 's' : ''} alta severidade
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Gerado {generatedAt}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOperationalDialogOpen(true)}
          className="rounded-2xl border border-fuchsia-200/60 dark:border-fuchsia-900/40 bg-fuchsia-50/60 dark:bg-fuchsia-950/20 px-4 py-3 lg:max-w-sm xl:max-w-md flex-shrink-0 text-left transition-colors hover:bg-fuchsia-100/70 dark:hover:bg-fuchsia-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                Inteligência Operacional
              </p>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">Abrir leitura executiva</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {aiGeneratedAt ? `Última análise IA em ${aiGeneratedAt}` : 'Nenhuma análise IA salva ainda'}
              </p>
            </div>
          </div>
        </button>
      </div>

      <Dialog open={isOperationalDialogOpen} onOpenChange={setIsOperationalDialogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[min(88vh,720px)] flex flex-col rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 gap-0 overflow-hidden">
          <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div>
                  <DialogTitle className="text-zinc-900 dark:text-zinc-100">Inteligência Operacional</DialogTitle>
                  <DialogDescription className="mt-1 text-zinc-500 dark:text-zinc-400">
                    {aiGeneratedAt
                      ? `Exibindo a análise mais recente gerada em ${aiGeneratedAt}.`
                      : 'Exibindo a leitura determinística atual até que uma análise com IA seja gerada.'}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void generateAIAnalysis()}
                disabled={isGeneratingAIAnalysis}
                className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-bold text-white transition-colors"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingAIAnalysis ? 'animate-pulse' : ''}`} />
                {isGeneratingAIAnalysis ? 'Gerando análise...' : 'Gerar nova análise com IA'}
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {aiAnalysisError && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-300">{aiAnalysisError}</p>
              </div>
            )}
            <div className="rounded-2xl border border-fuchsia-200/70 dark:border-fuchsia-900/40 bg-fuchsia-50/70 dark:bg-fuchsia-950/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                Gargalo Atual
              </p>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2 leading-snug">{ai.bottleneck}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-3 leading-relaxed">{ai.operational_summary}</p>
            </div>

            {ai.evidence.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
                  Evidências
                </p>
                <div className="space-y-2">
                  {ai.evidence.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3"
                    >
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Ação Recomendada
              </p>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-2 leading-relaxed">
                {ai.recommended_action}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─ 1. Resumo Executivo ─────────────────────────────────────────────── */}
      <SectionCard
        icon={Gauge}
        title="Resumo Executivo"
        description="Leitura rápida do estado operacional para tomada de decisão, sem precisar inferir o significado das métricas."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard
            label="Tasks concluídas"
            value={metrics.executive_summary.throughput.formatted}
            description={metrics.executive_summary.throughput.description}
          />
          <MetricCard
            label="Tempo total de entrega"
            value={metrics.executive_summary.lead_time.formatted}
            description={metrics.executive_summary.lead_time.description}
          />
          <MetricCard
            label="Tempo em execução"
            value={metrics.executive_summary.cycle_time.formatted}
            description={metrics.executive_summary.cycle_time.description}
          />
          <MetricCard
            label="Conclusão da sprint"
            value={metrics.executive_summary.sprint_completion_rate.formatted}
            description={metrics.executive_summary.sprint_completion_rate.description}
          />
          <MetricCard
            label="Tasks carregadas"
            value={metrics.executive_summary.carry_over_rate.formatted}
            description={metrics.executive_summary.carry_over_rate.description}
          />
          <MetricCard
            label="Taxa de retrabalho"
            value={metrics.executive_summary.rework_rate.formatted}
            description={metrics.executive_summary.rework_rate.description}
          />
          <MetricCard
            label="Taxa de bloqueio"
            value={metrics.executive_summary.block_rate.formatted}
            description={metrics.executive_summary.block_rate.description}
          />
          <MetricCard
            label="Completude média"
            value={metrics.executive_summary.average_completeness_score.formatted}
            description={metrics.executive_summary.average_completeness_score.description}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Risco operacional geral</p>
            </div>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
              {metrics.executive_summary.operational_risk.formatted}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {metrics.executive_summary.operational_risk.description}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Gargalo principal</p>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2 leading-snug">
              {metrics.executive_summary.main_bottleneck}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Foco recomendado da semana</p>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2 leading-snug">
              {metrics.executive_summary.weekly_focus}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ─ 2. Fluxo Operacional ────────────────────────────────────────────── */}
      <SectionCard
        icon={Activity}
        title="Fluxo Operacional"
        description="Onde o trabalho está ficando preso, quanto estamos mantendo em andamento e como o board está distribuído."
      >
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-zinc-500" />
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Filtros do fluxo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Select value={flowPeriodFilter} onValueChange={(value) => setFlowPeriodFilter(value as '7d' | '30d' | '90d' | 'all')}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flowAssigneeFilter} onValueChange={setFlowAssigneeFilter}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {flowAssigneeOptions.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={flowPriorityFilter} onValueChange={(value) => setFlowPriorityFilter(value as 'all' | TaskPriority)}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as criticidades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flowDistributionView} onValueChange={(value) => setFlowDistributionView(value as 'pie' | 'bar')}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Visual de status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Status em pizza</SelectItem>
                <SelectItem value="bar">Status em barras</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flowStageView} onValueChange={(value) => setFlowStageView(value as 'bar' | 'line')}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Visual por etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Tempo em barras</SelectItem>
                <SelectItem value="line">Tempo em linha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            O recorte abaixo considera {filteredFlowTasks.length} task{filteredFlowTasks.length !== 1 ? 's' : ''} após os filtros selecionados.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Distribuição por status</p>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {flowDistributionView === 'pie' ? <PieChartIcon className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                {flowDistributionView === 'pie' ? 'Pizza' : 'Barras'}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {flowDistributionView === 'pie' ? (
                  <PieChart>
                    <Pie data={filteredDistribution} dataKey="value" nameKey="name" outerRadius={95} innerRadius={52}>
                      {filteredDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v as number, 'Tasks']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                ) : (
                  <BarChart data={filteredDistribution}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v as number, 'Tasks']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {filteredDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 content-start">
            <MetricCard
              label="Tempo em aberto"
              value={formatHours(filteredAgingHours)}
              description="Tempo mediano das tasks abertas no recorte selecionado."
            />
            <MetricCard
              label="Trabalho em andamento"
              value={String(filteredExecutionTasks.length)}
              description="Quantidade de tasks em andamento, review ou bloqueadas."
            />
            <MetricCard
              label="Bloqueadas"
              value={String(filteredBlockedTasks.length)}
              description="Quantidade de tasks atualmente bloqueadas."
            />
            <MetricCard
              label="Sem atualização"
              value={String(filteredStaleTasks.length)}
              description="Tasks em andamento há mais de 72h sem atualização."
            />
            <MetricCard
              label="Fila de revisão"
              value={String(filteredReviewTasks.length)}
              description="Quantidade de tasks aguardando revisão."
            />
            <MetricCard
              label="Tempo bloqueado"
              value={formatHours(filteredBlockedTime)}
              description="Tempo médio acumulado em bloqueio nas tasks do recorte."
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tempo médio por estágio</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Quanto tempo as tasks passam, em média, em cada etapa do fluxo filtrado.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {flowStageView === 'line' ? <LineChartIcon className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {flowStageView === 'line' ? 'Linha' : 'Barras'}
            </div>
          </div>
          {flowStageView === 'line' ? (
            <TimeInStageLineChart data={filteredTimeInStage} />
          ) : (
            <TimeInStageChart data={filteredTimeInStage} />
          )}
        </div>
      </SectionCard>

      {/* ─ 3. Previsibilidade ──────────────────────────────────────────────── */}
      <SectionCard
        icon={Target}
        title="Previsibilidade"
        description="Se a sprint está entregando o que foi planejado, quanto está sobrando e onde há instabilidade de escopo."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tasks carregadas por sprint</p>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {predictabilityCarryOverView === 'line' ? <LineChartIcon className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                {predictabilityCarryOverView === 'line' ? 'Linha' : 'Barras'}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {predictabilityCarryOverView === 'line' ? (
                  <LineChart data={carryOverChart}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v as number}%`, 'Tasks carregadas']} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={carryOverChart}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v as number}%`, 'Tasks carregadas']} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPredictabilityCarryOverView('bar')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${predictabilityCarryOverView === 'bar' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
              >
                Barras
              </button>
              <button
                type="button"
                onClick={() => setPredictabilityCarryOverView('line')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${predictabilityCarryOverView === 'line' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
              >
                Linha
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 content-start">
            <MetricCard
              label="Conclusão da sprint"
              value={metrics.predictability.sprint_completion_rate.formatted}
              description={metrics.predictability.sprint_completion_rate.description}
            />
            <MetricCard
              label="Estimado x realizado"
              value={metrics.predictability.estimate_vs_actual.formatted}
              description={metrics.predictability.estimate_vs_actual.description}
            />
            <MetricCard
              label="No Prazo"
              value={String(metrics.predictability.on_time_vs_delayed.on_time)}
              description="Quantidade de tasks finalizadas no prazo alvo."
            />
            <MetricCard
              label="Com Atraso"
              value={String(metrics.predictability.on_time_vs_delayed.delayed)}
              description="Quantidade de tasks finalizadas com atraso."
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Planejado x concluído por sprint</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Compara o que entrou na sprint com o que realmente foi entregue.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {predictabilityDeliveryView === 'line' ? <LineChartIcon className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {predictabilityDeliveryView === 'line' ? 'Linha' : 'Barras'}
            </div>
          </div>
          {predictabilityDeliveryView === 'line' ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.predictability.planned_vs_completed.map((item) => ({
                  name: item.goal.length > 14 ? item.goal.slice(0, 14) + '…' : item.goal,
                  Planejado: item.planned,
                  Concluído: item.completed,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Planejado" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Concluído" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PlannedVsCompletedChart data={metrics.predictability.planned_vs_completed} />
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPredictabilityDeliveryView('bar')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${predictabilityDeliveryView === 'bar' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
            >
              Barras
            </button>
            <button
              type="button"
              onClick={() => setPredictabilityDeliveryView('line')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${predictabilityDeliveryView === 'line' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
            >
              Linha
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ─ 4. Qualidade Operacional ────────────────────────────────────────── */}
      <SectionCard
        icon={CheckCircle2}
        title="Qualidade da Task"
        description="A leitura operacional atual considera tasks abertas; o fechamento histórico fica separado na métrica de encerramento."
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard
            label="Definição inicial"
            value={metrics.quality.creation_completeness.formatted}
            description={metrics.quality.creation_completeness.description}
          />
          <MetricCard
            label="Atualização de progresso"
            value={metrics.quality.progress_completeness.formatted}
            description={metrics.quality.progress_completeness.description}
          />
          <MetricCard
            label="Fechamento"
            value={metrics.quality.closure_completeness.formatted}
            description={metrics.quality.closure_completeness.description}
          />
          <MetricCard
            label="Qualidade geral"
            value={metrics.quality.consolidated_completeness.formatted}
            description={metrics.quality.consolidated_completeness.description}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Campos mais ausentes</p>
            <div className="space-y-2">
              {metrics.quality.most_missing_fields.length > 0 ? (
                metrics.quality.most_missing_fields.map((item) => (
                  <div
                    key={item.field}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-950 px-3 py-2"
                  >
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.field}</span>
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum campo crítico ausente.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            <MetricCard
              label="Tasks com atenção"
              value={String(metrics.quality.low_completeness_tasks)}
              description="Tasks abertas com score consolidado abaixo do nível saudável."
            />
          </div>
        </div>
      </SectionCard>

      {/* ─ 5. Bloqueios, Risco e Inteligência ─────────────────────────────── */}
      <SectionCard
        icon={ShieldAlert}
        title="Bloqueios, Risco e Inteligência"
        description="Leitura combinada de sinais determinísticos, categorias de bloqueio e recomendações operacionais baseadas em dados."
      >
        {/* Risk chart + block categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Risco por sprint</p>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {riskChartView === 'line' ? <LineChartIcon className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                {riskChartView === 'line' ? 'Linha' : 'Barras'}
              </div>
            </div>
            {riskChart.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {riskChartView === 'line' ? (
                    <LineChart data={riskChart}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v as number}%`, 'Risco']} />
                      <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={riskChart}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v as number}%`, 'Risco']} />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
                Nenhuma sprint com dados de risco.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setRiskChartView('bar')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${riskChartView === 'bar' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
              >
                Barras
              </button>
              <button
                type="button"
                onClick={() => setRiskChartView('line')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${riskChartView === 'line' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
              >
                Linha
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Categorias de bloqueio</p>
              {metrics.blockers_and_risk.critical_blocked_tasks > 0 && (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-lg">
                  {metrics.blockers_and_risk.critical_blocked_tasks} crítica
                  {metrics.blockers_and_risk.critical_blocked_tasks !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <BlockCategoriesChart data={metrics.blockers_and_risk.block_categories} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Taxa de bloqueio</p>
                <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                  {metrics.blockers_and_risk.block_rate.formatted}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Reabertura</p>
                <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                  {metrics.blockers_and_risk.reopening_rate.formatted}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI insights + recommendations */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="rounded-2xl border border-fuchsia-200/60 dark:border-fuchsia-900/40 bg-fuchsia-50/40 dark:bg-fuchsia-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-fuchsia-500" />
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Resumo operacional</p>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{ai.operational_summary}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 italic">{ai.probable_impact}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">Foco da semana</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{ai.focus_of_week}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">Top prioridades</p>
              <div className="space-y-2">
                {ai.top_priorities.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 leading-snug"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">Próximos passos sugeridos</p>
              <div className="space-y-2">
                {ai.next_step_suggestions.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <Zap className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">Melhorias de tasks sugeridas</p>
              <div className="space-y-2">
                {ai.task_improvement_suggestions.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Task analyses */}
        <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Análise por task ({analyzedTasksCount})
            </p>
            {analyzedTasksCount > 0 && (
              <div className="flex items-center gap-1.5">
                {criticalTasks > 0 && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-1.5 py-0.5 rounded-md">
                    {criticalTasks} crítica{criticalTasks !== 1 ? 's' : ''}
                  </span>
                )}
                {highTasks > 0 && (
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-1.5 py-0.5 rounded-md">
                    {highTasks} alta
                  </span>
                )}
                {portfolioSignals.length > 0 && (
                  <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5 rounded-md">
                    {portfolioSignals.length} sinal{portfolioSignals.length !== 1 ? 'is' : ''} sistêmico{portfolioSignals.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Cada card consolida a leitura da task inteira e resume os principais problemas daquela execução.
          </p>
          {taskAnalyses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma task exige análise individual no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
              {[...taskAnalyses]
                .sort((a, b) => {
                  const severityDelta = (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
                  if (severityDelta !== 0) return severityDelta;
                  return b.signals_count - a.signals_count;
                })
                .map((analysis) => (
                  <TaskAnalysisCard key={analysis.task_id} analysis={analysis} />
                ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
