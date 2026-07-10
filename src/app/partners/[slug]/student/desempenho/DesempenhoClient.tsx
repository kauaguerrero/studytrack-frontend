'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FilePenLine,
  Flame,
  Gauge,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { cn } from '@/lib/utils';
import { RevealGroup, RevealItem } from '@/components/partners/founder-ui';
import { readableBrandText } from '@/lib/brand-color';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsResponse {
  overview: {
    total_questions: number;
    accuracy_percentage: number;
    current_streak: number;
    total_xp: number;
    total_simulados: number;
  };
  performance_by_subject: Array<{
    subject: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  activity_history: Array<{
    usage_date: string;
    questions_count: number;
    simulations_count: number;
    correct_count: number;
  }>;
}

export interface EssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  essay_type: EssayType;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  theme: string | null;
}

interface EssayListResponse {
  items?: Array<{
    id: string;
    status: EssayListItem['status'];
    essay_type?: string | null;
    submitted_at: string;
    corrected_at: string | null;
    total_score: number | null;
    theme?: string | null;
  }>;
  credits?: {
    plan_name?: string | null;
    limit?: number | null;
    period?: 'week' | 'month' | null;
    used?: number | null;
    remaining?: number | null;
  } | null;
}

export interface EssayDetail {
  id: string;
  status: EssayListItem['status'];
  essay_type?: string | null;
  total_score: number | null;
  submitted_at: string;
  corrected_at: string | null;
  competency_scores: Array<{
    competency: number;
    score: number;
    comment?: string | null;
  }>;
  general_comment?: string | null;
}

interface PartnerSummary {
  monthly_points: number;
  rank_position: number;
  points_to_top3: number;
  prize_cutoff: number;
  month_label: string;
  monthly_goal: number;
  goal_reached: boolean;
  goal_progress_pct: number;
  shield_count: number;
  progress_tier?: string | null;
  next_tier?: string | null;
  points_to_next_tier?: number | null;
}

interface PartnerRankingResponse {
  ranking: Array<{
    rank: number;
    user_id: string;
    full_name: string;
    monthly_points: number;
  }>;
  user_context?: {
    position: number;
  } | null;
}

interface SimuladoSession {
  id: string;
  score: number;
  total_questions: number;
  percentage: number;
  tri_score: number | null;
  time_taken_secs: number | null;
  completed_at: string;
  results_by_subject?: Record<string, { correct: number; total: number; percentage: number }>;
}

interface SimuladoHistoryResponse {
  sessions: SimuladoSession[];
}

export interface DashboardState {
  analytics: AnalyticsResponse;
  essays: EssayListItem[];
  essayDetails: EssayDetail[];
  summary: PartnerSummary | null;
  ranking: PartnerRankingResponse | null;
  simuladoSessions: SimuladoSession[];
  credits: EssayListResponse['credits'];
}

interface CompetencyAggregate {
  competency: number;
  label: string;
  average: number;
  maxScore: number;
  count: number;
  latest: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SUBJECT_SAMPLE = 8;
const MIN_SIMULADO_SUBJECT_SAMPLE = 2;
const SOFT_CARD_CLASS = 'partner-elevated-card partner-elevated-card-hover group relative overflow-hidden rounded-2xl border-0 bg-slate-50 p-4 transition-all duration-200 dark:bg-white/5';
const WHITE_CARD_CLASS = 'partner-elevated-card partner-elevated-card-hover group relative overflow-hidden rounded-2xl border-0 bg-white p-4 transition-all duration-200 dark:bg-slate-900';
const CHART_CARD_CLASS = 'partner-elevated-card group relative overflow-hidden rounded-[24px] border-0 bg-slate-50/90 p-4 transition-all duration-200 dark:bg-white/5';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCompactNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatDateShort(value: string | null | undefined) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
}

function formatWeekdayDate(value: string | null | undefined) {
  if (!value) return 'Data indisponível';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const int = Number.parseInt(safe, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function compareWindowTrend(values: number[], size: number) {
  if (values.length < size * 2) return null;
  const previous = average(values.slice(-size * 2, -size));
  const current = average(values.slice(-size));
  return Number((current - previous).toFixed(1));
}

function buildActivityChart(
  history: AnalyticsResponse['activity_history'],
  essays: EssayListItem[],
) {
  const questionMap = new Map(
    history.map((item) => [
      item.usage_date,
      { questions: item.questions_count, simulations: item.simulations_count },
    ]),
  );

  const essayCountMap = new Map<string, number>();
  essays.forEach((essay) => {
    const key = (essay.submitted_at || '').slice(0, 10);
    if (!key) return;
    essayCountMap.set(key, (essayCountMap.get(key) ?? 0) + 1);
  });

  const allKeys = Array.from(new Set([...questionMap.keys(), ...essayCountMap.keys()])).sort();

  return allKeys.slice(-12).map((key) => {
    const date = new Date(`${key}T12:00:00`);
    const label = Number.isNaN(date.getTime())
      ? key
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
    return {
      key,
      label,
      fullDate: formatWeekdayDate(key),
      questions: questionMap.get(key)?.questions ?? 0,
      simulations: questionMap.get(key)?.simulations ?? 0,
      essays: essayCountMap.get(key) ?? 0,
    };
  });
}

function buildEssayCompetencies(essayDetails: EssayDetail[], essayType: EssayType): CompetencyAggregate[] {
  const config = ESSAY_TYPE_CONFIGS[essayType] ?? ESSAY_TYPE_CONFIGS.enem;
  return config.competencies.map((label, idx) => {
    const competency = idx + 1;
    const options = config.score_options[idx] || [];
    const maxScore = options.length ? Math.max(...options) : 200;
    const rows = essayDetails
      .map((essay) => essay.competency_scores.find((item) => item.competency === competency))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return {
      competency,
      label,
      average: rows.length ? Number(average(rows.map((row) => row.score)).toFixed(1)) : 0,
      maxScore,
      count: rows.length,
      latest: rows.length ? rows[rows.length - 1].score : null,
    };
  });
}

function buildSimuladoSubjectStats(sessions: SimuladoSession[]) {
  const subjectMap = new Map<string, { correct: number; total: number; sessions: number }>();

  sessions.forEach((session) => {
    Object.entries(session.results_by_subject || {}).forEach(([subject, result]) => {
      const current = subjectMap.get(subject) || { correct: 0, total: 0, sessions: 0 };
      current.correct += result.correct;
      current.total += result.total;
      current.sessions += 1;
      subjectMap.set(subject, current);
    });
  });

  return Array.from(subjectMap.entries())
    .map(([subject, stats]) => ({
      subject,
      sessions: stats.sessions,
      total: stats.total,
      accuracy: stats.total ? Number(((stats.correct / stats.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

function buildHabits(history: AnalyticsResponse['activity_history']) {
  const recent30 = history.slice(-30);
  const last7 = recent30.slice(-7);
  const previous7 = recent30.slice(-14, -7);

  const countActiveDays = (items: typeof recent30) => items.filter((item) => (
    Number(item.questions_count || 0) > 0 || Number(item.simulations_count || 0) > 0
  )).length;

  const sumQuestions = (items: typeof recent30) => items.reduce((sum, item) => sum + Number(item.questions_count || 0), 0);
  const sumSimulados = (items: typeof recent30) => items.reduce((sum, item) => sum + Number(item.simulations_count || 0), 0);

  const recentLoad = sumQuestions(last7) + (sumSimulados(last7) * 10);
  const previousLoad = sumQuestions(previous7) + (sumSimulados(previous7) * 10);
  const delta = recentLoad - previousLoad;

  let rhythmLabel = 'Estável';
  let rhythmTone: 'up' | 'down' | 'stable' = 'stable';
  if (delta >= 12) { rhythmLabel = 'Acelerando'; rhythmTone = 'up'; }
  else if (delta <= -12) { rhythmLabel = 'Em queda'; rhythmTone = 'down'; }

  return {
    activeDays30: countActiveDays(recent30),
    activeDays7: countActiveDays(last7),
    questions7: sumQuestions(last7),
    simulations7: sumSimulados(last7),
    rhythmLabel,
    rhythmTone,
  };
}

function getScoreTone(score: number | null | undefined, totalMax: number) {
  const value = Number(score || 0);
  const ratio = totalMax > 0 ? value / totalMax : 0;
  if (ratio >= 0.8) return 'text-emerald-600 dark:text-emerald-300';
  if (ratio >= 0.65) return 'text-sky-600 dark:text-sky-300';
  if (ratio >= 0.5) return 'text-amber-600 dark:text-amber-300';
  return 'text-rose-600 dark:text-rose-300';
}

function getDeltaTone(delta: number | null) {
  if (delta == null) return 'text-slate-500 dark:text-slate-400';
  if (delta > 0) return 'text-emerald-600 dark:text-emerald-300';
  if (delta < 0) return 'text-rose-600 dark:text-rose-300';
  return 'text-slate-500 dark:text-slate-400';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricShell({
  className,
  children,
  accent,
}: {
  className?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className={cn(
        'partner-elevated-card partner-elevated-card-hover group relative overflow-hidden rounded-[24px] border-0 bg-white p-5 transition-all duration-200 dark:bg-slate-900',
        className,
      )}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 40%, white))` }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: accent ? hexToRgba(accent, 0.12) : 'rgba(148,163,184,0.10)' }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function KPI({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  className?: string;
}) {
  const iconColor = readableBrandText(accent, accent, 42);
  return (
    <MetricShell accent={accent} className={cn('flex h-full flex-col justify-between gap-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, white)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px color-mix(in srgb, ${accent} 22%, transparent)`,
            color: iconColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-200">{hint}</div>
    </MetricShell>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="h-40 rounded-[32px] bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 lg:grid-cols-12">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 rounded-[28px] bg-slate-200 dark:bg-slate-800 lg:col-span-2" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="h-96 rounded-[28px] bg-slate-200 dark:bg-slate-800 lg:col-span-8" />
          <div className="h-96 rounded-[28px] bg-slate-200 dark:bg-slate-800 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesempenhoClientProps {
  slug: string;
  initialState: DashboardState | null;
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function DesempenhoClient({ slug, initialState }: DesempenhoClientProps) {
  const { org } = useOrg();
  const [state, setState] = useState<DashboardState | null>(initialState);
  const [loading, setLoading] = useState(initialState === null);
  const [evolutionPeriod, setEvolutionPeriod] = useState<7 | 15 | 30 | 90>(30);
  const [visibleEvolutionMetrics, setVisibleEvolutionMetrics] = useState<Array<'questions' | 'simulations' | 'essays'>>([
    'questions', 'simulations', 'essays',
  ]);
  const [habitsPeriod, setHabitsPeriod] = useState<7 | 14 | 30>(14);
  const [visibleHabitsMetrics, setVisibleHabitsMetrics] = useState<Array<'questions' | 'simulados'>>(['questions', 'simulados']);
  const [essayTypeFilter, setEssayTypeFilter] = useState<EssayType>('enem');
  const [essayTypeFilterOpen, setEssayTypeFilterOpen] = useState(false);

  useEffect(() => {
    if (initialState !== null && essayTypeFilter === 'enem') return; // server pre-fetched successfully for default filter

    let active = true;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (active) setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const hdrs = { Authorization: `Bearer ${session.access_token}` };

      try {
        const [analyticsRes, essaysRes, summaryRes, rankingRes, simuladoRes] = await Promise.all([
          fetch(`${apiUrl}/api/student/analytics/dashboard`, { headers: hdrs, cache: 'no-store' }),
          fetch(`${apiUrl}/api/partners/${slug}/essays?status=all&essay_type=${essayTypeFilter}&page=1&limit=200`, { headers: hdrs, cache: 'no-store' }),
          fetch(`${apiUrl}/api/partner/gamification/summary`, { headers: hdrs, cache: 'no-store' }),
          fetch(`${apiUrl}/api/partner/gamification/ranking?limit=10`, { headers: hdrs, cache: 'no-store' }),
          fetch(`${apiUrl}/api/simulado/history?page=1&limit=12`, { headers: hdrs, cache: 'no-store' }),
        ]);

        const analytics: AnalyticsResponse = analyticsRes.ok ? await analyticsRes.json() : {
          overview: { total_questions: 0, accuracy_percentage: 0, current_streak: 0, total_xp: 0, total_simulados: 0 },
          performance_by_subject: [],
          activity_history: [],
        };

        const essaysPayload: EssayListResponse = essaysRes.ok ? await essaysRes.json() : { items: [], credits: null };
        const summary: PartnerSummary | null = summaryRes.ok ? await summaryRes.json() : null;
        const ranking: PartnerRankingResponse | null = rankingRes.ok ? await rankingRes.json() : null;
        const simuladoPayload: SimuladoHistoryResponse = simuladoRes.ok ? await simuladoRes.json() : { sessions: [] };

        const essays: EssayListItem[] = (essaysPayload.items || []).map((item) => ({
          essay_type: String(item.essay_type || '').toLowerCase() === 'ufu'
            ? 'ufu'
            : String(item.essay_type || '').toLowerCase() === 'ueg'
              ? 'ueg'
              : 'enem',
          id: String(item.id),
          status: item.status,
          submitted_at: String(item.submitted_at),
          corrected_at: item.corrected_at ? String(item.corrected_at) : null,
          total_score: typeof item.total_score === 'number' ? item.total_score : null,
          theme: typeof item.theme === 'string' ? item.theme : null,
        }));

        const correctedRecent = essays
          .filter((item) => item.total_score != null && (item.status === 'corrected' || item.status === 'seen'))
          .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

        const detailResponses = await Promise.all(
          correctedRecent.map(async (essay) => {
            const r = await fetch(`${apiUrl}/api/partners/${slug}/essays/${essay.id}`, { headers: hdrs, cache: 'no-store' });
            if (!r.ok) return null;
            return r.json() as Promise<EssayDetail>;
          }),
        );

        if (!active) return;

        const detailsById = new Map(
          detailResponses
            .filter((item): item is EssayDetail => Boolean(item))
            .map((item) => [item.id, item]),
        );

        const essaysWithNormalizedType = essays.map((essay) => {
          const detailType = String(detailsById.get(essay.id)?.essay_type || '').toLowerCase();
          const normalizedType: EssayType = detailType === 'ufu'
            ? 'ufu'
            : detailType === 'ueg'
              ? 'ueg'
              : essay.essay_type;
          return { ...essay, essay_type: normalizedType };
        });

        setState({
          analytics,
          essays: essaysWithNormalizedType,
          essayDetails: detailResponses
            .filter((item): item is EssayDetail => Boolean(item))
            .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()),
          summary,
          ranking,
          simuladoSessions: simuladoPayload.sessions || [],
          credits: essaysPayload.credits || null,
        });
      } catch (error) {
        void reportError('StudentPerformancePageError', String(error), { page: 'partners/student/desempenho' });
        if (active) {
          setState({
            analytics: {
              overview: { total_questions: 0, accuracy_percentage: 0, current_streak: 0, total_xp: 0, total_simulados: 0 },
              performance_by_subject: [],
              activity_history: [],
            },
            essays: [],
            essayDetails: [],
            summary: null,
            ranking: null,
            simuladoSessions: [],
            credits: null,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, essayTypeFilter, initialState]);

  const derived = useMemo(() => {
    if (!state) return null;

    const { analytics, essays, essayDetails, summary, simuladoSessions } = state;
    const essayTypeConfig = ESSAY_TYPE_CONFIGS[essayTypeFilter] ?? ESSAY_TYPE_CONFIGS.enem;
    const essaysByType = essays.filter((item) => item.essay_type === essayTypeFilter);
    const correctedEssays = essaysByType
      .filter((item) => item.total_score != null && (item.status === 'corrected' || item.status === 'seen'))
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const latestEssay = correctedEssays[correctedEssays.length - 1] || null;
    const bestEssay = [...correctedEssays].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))[0] || null;
    const pendingEssays = essaysByType.filter((item) => item.status === 'pending');
    const essayAverage = correctedEssays.length
      ? Number(average(correctedEssays.map((item) => item.total_score || 0)).toFixed(1))
      : null;
    const essayMedian = correctedEssays.length
      ? Number(median(correctedEssays.map((item) => item.total_score || 0)).toFixed(1))
      : null;
    const essayTrendDelta = compareWindowTrend(correctedEssays.map((item) => item.total_score || 0), 2);
    const correctedIds = new Set(correctedEssays.map((item) => item.id));
    const essayDetailsByType = essayDetails.filter((item) => correctedIds.has(item.id));
    const competencyStats = buildEssayCompetencies(essayDetailsByType, essayTypeFilter);
    const latestEssayDetail = latestEssay ? essayDetailsByType.find((item) => item.id === latestEssay.id) || null : null;
    const latestEssayCompetencies = (latestEssayDetail?.competency_scores || [])
      .map((item) => {
        const options = essayTypeConfig.score_options[item.competency - 1] || [];
        const maxScore = options.length ? Math.max(...options) : 200;
        const ratio = maxScore > 0 ? item.score / maxScore : 0;
        return {
          ...item,
          maxScore,
          ratio,
          label: essayTypeConfig.competencies[item.competency - 1] ?? `Critério ${item.competency}`,
        };
      });
    const weakestCompetency = latestEssayCompetencies.length
      ? latestEssayCompetencies.reduce((min, cur) => (cur.ratio < min.ratio ? cur : min))
      : null;
    const strongestCompetency = latestEssayCompetencies.length
      ? latestEssayCompetencies.reduce((max, cur) => (cur.ratio > max.ratio ? cur : max))
      : null;

    const activityChart = buildActivityChart(analytics.activity_history, essaysByType);
    const simuladoSubjectStats = buildSimuladoSubjectStats(simuladoSessions);
    const bestSimuladoTri = Math.max(...simuladoSessions.map((item) => item.tri_score || 0), 0) || null;
    const recentSimuladoAvg = simuladoSessions.length
      ? Number(average(simuladoSessions.slice(0, 3).map((item) => item.percentage || 0)).toFixed(1))
      : null;
    const lastSimulado = simuladoSessions[0] || null;
    const mostConsistentArea = simuladoSubjectStats.find((item) => item.sessions >= MIN_SIMULADO_SUBJECT_SAMPLE) || null;
    const habits = buildHabits(analytics.activity_history);

    return {
      correctedEssays,
      essayTypeConfig,
      latestEssay,
      bestEssay,
      pendingEssays,
      essayAverage,
      essayMedian,
      essayTrendDelta,
      competencyStats,
      weakestCompetency,
      strongestCompetency,
      activityChart,
      simuladoSubjectStats,
      bestSimuladoTri,
      recentSimuladoAvg,
      lastSimulado,
      mostConsistentArea,
      habits,
      summary,
    };
  }, [state, essayTypeFilter]);

  if (loading) return <LoadingState />;

  if (!state || !derived) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <MetricShell className="max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Não foi possível carregar seu raio-x.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            A página depende de dados de desempenho, redação e gamificação. Recarregue para tentar novamente.
          </p>
        </MetricShell>
      </div>
    );
  }

  const { analytics, credits, ranking } = state;
  const {
    correctedEssays,
    latestEssay,
    bestEssay,
    essayAverage,
    essayMedian,
    essayTrendDelta,
    competencyStats,
    weakestCompetency,
    strongestCompetency,
    activityChart,
    simuladoSubjectStats,
    bestSimuladoTri,
    recentSimuladoAvg,
    lastSimulado,
    mostConsistentArea,
    habits,
    summary,
    essayTypeConfig,
  } = derived;

  const subjectRows = analytics.performance_by_subject.slice().sort((a, b) => b.total - a.total).slice(0, 6);
  const filteredActivityChart = activityChart.slice(-evolutionPeriod);
  const habitsChartData = analytics.activity_history.slice(-habitsPeriod).map((item) => ({
    label: formatDateShort(item.usage_date),
    questions: item.questions_count,
    simulados: item.simulations_count,
  }));

  function toggleEvolutionMetric(metric: 'questions' | 'simulations' | 'essays') {
    setVisibleEvolutionMetrics((current) => {
      if (current.includes(metric)) return current.length === 1 ? current : current.filter((item) => item !== metric);
      return [...current, metric];
    });
  }

  function toggleHabitsMetric(metric: 'questions' | 'simulados') {
    setVisibleHabitsMetrics((current) => {
      if (current.includes(metric)) return current.length === 1 ? current : current.filter((item) => item !== metric);
      return [...current, metric];
    });
  }

  // Suppress unused variable lint (credits used in future sections)
  void credits;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(241,245,249,0.98)_42%,_#e2e8f0_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(51,65,85,0.4),_rgba(15,23,42,0.98)_34%,_#020617_100%)] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <RevealGroup className="space-y-4 lg:space-y-5">
          <RevealItem>
          <Link
            href={`/partners/${slug}/student/dashboard`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          </RevealItem>

          <RevealItem className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }}>
                Meu raio-x
              </p>
              <h1 className="font-display text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">Desempenho</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Redações, simulados e hábitos.</p>
            </div>
            {summary?.month_label && (
              <span className="partner-elevated-card inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }} />
                {summary.month_label}
              </span>
            )}
          </RevealItem>

          <RevealItem className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
            <KPI
              className="lg:col-span-2"
              label="Ranking"
              value={summary?.rank_position ? `#${summary.rank_position}` : 'Sem posição'}
              hint={summary?.rank_position
                ? summary.rank_position <= (summary.prize_cutoff || 3)
                  ? 'Você está entre os melhores!'
                  : `${summary.points_to_top3 || 0} pts do top ${summary.prize_cutoff || 3}`
                : 'Sem posição'}
              icon={Trophy}
              accent="#f59e0b"
            />
            <KPI
              className="lg:col-span-2"
              label="Pontos"
              value={summary ? formatCompactNumber(summary.monthly_points) : '0'}
              hint={summary?.next_tier
                ? `${summary.points_to_next_tier || 0} pts para ${summary.next_tier}`
                : 'Neste mês'}
              icon={Award}
              accent={org.brand_primary}
            />
            <KPI
              className="lg:col-span-4"
              label="Redação"
              value={essayAverage ? `${essayAverage.toFixed(0)} / ${essayTypeConfig.total_max}` : 'Sem nota ainda'}
              hint={latestEssay
                ? <span className="block">Última {latestEssay.total_score} • melhor {bestEssay?.total_score ?? '—'}</span>
                : 'Sem correção'}
              icon={FilePenLine}
              accent="#0f766e"
            />
            <KPI
              className="lg:col-span-2"
              label="Simulados"
              value={analytics.overview.total_simulados || 0}
              hint={recentSimuladoAvg != null
                ? `${recentSimuladoAvg}% • TRI ${bestSimuladoTri || '—'}`
                : 'Sem base recente'}
              icon={Gauge}
              accent="#2563eb"
            />
            <KPI
              className="lg:col-span-2"
              label="Ofensiva"
              value={`${analytics.overview.current_streak}d`}
              hint={`${habits.activeDays7} dias ativos${summary?.shield_count ? ` • ${summary.shield_count} esc.` : ''}`}
              icon={Flame}
              accent="#ea580c"
            />
          </RevealItem>

          <RevealItem className="grid gap-3 lg:grid-cols-12 lg:gap-4">
            <MetricShell className="lg:col-span-12">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Evolução recente</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Atividade</h2>
                </div>
                <div className={cn(SOFT_CARD_CLASS, 'w-full px-4 py-3 text-sm text-slate-600 sm:w-auto dark:text-slate-200')}>
                  {essayTrendDelta != null
                    ? <span className={cn('font-semibold', getDeltaTone(essayTrendDelta))}>{essayTrendDelta > 0 ? `+${essayTrendDelta}` : essayTrendDelta} pts nas últimas correções comparáveis</span>
                    : correctedEssays.length > 0 ? 'Primeiras correções em andamento' : 'Sem redações corrigidas'}
                </div>
              </div>

              {correctedEssays.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {correctedEssays.slice(-4).map((essay) => (
                    <div key={essay.id} className={cn(SOFT_CARD_CLASS, 'px-4 py-3')}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Redação</p>
                      <p className={cn('mt-2 text-2xl font-semibold', getScoreTone(essay.total_score, essayTypeConfig.total_max))}>{essay.total_score}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{formatDateShort(essay.corrected_at || essay.submitted_at)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {([
                    { key: 'questions', label: 'Questões', color: org.brand_primary },
                    { key: 'simulations', label: 'Simulados', color: '#2563eb' },
                    { key: 'essays', label: 'Redações', color: '#0f766e' },
                  ] as const).map((item) => {
                    const active = visibleEvolutionMetrics.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleEvolutionMetric(item.key)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          active ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                        )}
                        style={{
                          borderColor: active ? hexToRgba(item.color, 0.28) : undefined,
                          backgroundColor: active ? hexToRgba(item.color, 0.12) : undefined,
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  {([7, 15, 30, 90] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setEvolutionPeriod(days)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                        evolutionPeriod === days
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : 'border-slate-300 bg-white text-slate-500 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-300',
                      )}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 h-[260px] w-full sm:h-[320px]">
                {filteredActivityChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredActivityChart} margin={{ left: -24, right: 20, top: 12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="questionsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={hexToRgba(org.brand_primary, 0.28)} />
                          <stop offset="100%" stopColor={hexToRgba(org.brand_primary, 0.02)} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} minTickGap={24} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 4]} tickCount={5} tickLine={false} axisLine={false} stroke="#0f766e" fontSize={11} width={20} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(15, 118, 110, 0.07)', strokeWidth: 0, rx: 6 }}
                        content={({ active: isActive, payload }) => {
                          if (!isActive || !payload?.length) return null;
                          const row = payload[0]?.payload as { fullDate: string; questions: number; simulations: number; essays: number };
                          return (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-2xl">
                              <p className="mb-2 font-semibold text-slate-300">{row.fullDate}</p>
                              <div className="space-y-1.5">
                                <p>Questões: <span className="font-semibold">{row.questions}</span></p>
                                <p>Simulados: <span className="font-semibold">{row.simulations}</span></p>
                                {row.essays > 0 && (
                                  <p>Redações: <span className="font-semibold text-teal-300">{row.essays}</span></p>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                      {visibleEvolutionMetrics.includes('questions') && (
                        <Area yAxisId="left" type="monotone" dataKey="questions" stroke={org.brand_primary} fill="url(#questionsFill)" strokeWidth={2.2} />
                      )}
                      {visibleEvolutionMetrics.includes('simulations') && (
                        <Line yAxisId="left" type="monotone" dataKey="simulations" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      )}
                      {visibleEvolutionMetrics.includes('essays') && (
                        <Line yAxisId="right" type="monotone" dataKey="essays" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 4, fill: '#0f766e', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-300">
                    Ainda não há histórico suficiente para desenhar evolução recente.
                  </div>
                )}
              </div>
            </MetricShell>
          </RevealItem>

          <RevealItem className="grid gap-3 lg:grid-cols-12 lg:gap-4">
            <MetricShell className="lg:col-span-7">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Redação em profundidade</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Análise Detalhada</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEssayTypeFilterOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:text-white"
                    >
                      {essayTypeConfig.label}
                      <ChevronDown className={cn('h-4 w-4 transition-transform', essayTypeFilterOpen && 'rotate-180')} />
                    </button>
                    {essayTypeFilterOpen && (
                      <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        {(Object.entries(ESSAY_TYPE_CONFIGS) as [EssayType, typeof ESSAY_TYPE_CONFIGS[EssayType]][]).map(([key, cfg]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setEssayTypeFilter(key);
                              setEssayTypeFilterOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                              essayTypeFilter === key
                                ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60',
                            )}
                          >
                            <span>{cfg.label}</span>
                            <span className="text-[11px] opacity-70">/{cfg.total_max}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/partners/${slug}/student/redacoes`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:text-white"
                  >
                    Ver redações
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Média</p>
                  <p className={cn('mt-2 text-3xl font-semibold tracking-tight', getScoreTone(essayAverage, essayTypeConfig.total_max))}>
                    {essayAverage ? essayAverage.toFixed(0) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mediana {essayMedian ? essayMedian.toFixed(0) : '—'}</p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Última nota</p>
                  <p className={cn('mt-2 text-3xl font-semibold tracking-tight', getScoreTone(latestEssay?.total_score, essayTypeConfig.total_max))}>
                    {latestEssay?.total_score ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateShort(latestEssay?.corrected_at || latestEssay?.submitted_at)}</p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Melhor nota</p>
                  <p className={cn('mt-2 text-3xl font-semibold tracking-tight', getScoreTone(bestEssay?.total_score, essayTypeConfig.total_max))}>
                    {bestEssay?.total_score ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{bestEssay?.theme || 'Tema indisponível'}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={cn(CHART_CARD_CLASS, 'h-[250px] sm:h-[280px]')}>
                  {correctedEssays.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={correctedEssays.map((essay) => ({
                          label: formatDateShort(essay.corrected_at || essay.submitted_at),
                          score: essay.total_score,
                        }))}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="essayScoreFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.32} />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} minTickGap={24} interval="preserveStartEnd" />
                        <YAxis domain={[0, essayTypeConfig.total_max]} tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          content={({ active: isActive, payload }) => {
                            if (!isActive || !payload?.length) return null;
                            const row = payload[0]?.payload as { label: string; score: number };
                            return (
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-2xl">
                                <p className="mb-1 text-slate-300">{row.label}</p>
                                <p className="font-semibold">{row.score} / {essayTypeConfig.total_max}</p>
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={3} fill="url(#essayScoreFill)" dot={{ r: 4, fill: '#0f766e', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                      Sem evolução de redação ainda: a linha aparece quando existe correção.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {competencyStats.map((item) => {
                    const width = `${Math.max(8, (item.average / item.maxScore) * 100)}%`;
                    return (
                      <div key={item.competency} className={WHITE_CARD_CLASS}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">C{item.competency} · {item.label}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.count ? `média de ${item.count}` : 'sem nota ainda'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-semibold text-slate-950 dark:text-white">{item.count ? item.average.toFixed(0) : '—'}</p>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">/{item.maxScore}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width,
                              background: item.count
                                ? item.competency === weakestCompetency?.competency ? '#e11d48'
                                  : item.competency === strongestCompetency?.competency ? '#0f766e'
                                  : org.brand_primary
                                : '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Competência mais fraca</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    {weakestCompetency
                      ? `C${weakestCompetency.competency} · ${weakestCompetency.label}`
                      : 'Você ainda não fez nenhuma redação'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {weakestCompetency ? `${weakestCompetency.score} / ${weakestCompetency.maxScore} na redação mais recente` : 'Assim que houver uma correção, este bloco aparece.'}
                  </p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Competência mais forte</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    {strongestCompetency
                      ? `C${strongestCompetency.competency} · ${strongestCompetency.label}`
                      : 'Você ainda não fez nenhuma redação'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {strongestCompetency ? `${strongestCompetency.score} / ${strongestCompetency.maxScore} na redação mais recente` : 'Assim que houver uma correção, este bloco aparece.'}
                  </p>
                </div>
              </div>
            </MetricShell>

            <MetricShell className="lg:col-span-5">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Performance por matéria</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Precisão e volume</h2>
                </div>
                <div className="rounded-2xl bg-slate-950 p-2 text-white dark:bg-white/10">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {subjectRows.length ? subjectRows.map((subject) => (
                  <div key={subject.subject} className={WHITE_CARD_CLASS}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{subject.subject}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {subject.total} tentativas • {subject.correct} acertos
                          {subject.total < MIN_SUBJECT_SAMPLE ? ' • base curta' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Precisão</span>
                          <span>{subject.accuracy}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-slate-950 dark:bg-white" style={{ width: `${Math.max(8, subject.accuracy)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Volume relativo</span>
                          <span>{subject.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(8, (subject.total / Math.max(...subjectRows.map((row) => row.total), 1)) * 100)}%`, backgroundColor: org.brand_primary }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
                    Quando houver base de questões, a página separa volume de precisão para evitar leituras enganosas.
                  </div>
                )}
              </div>
            </MetricShell>
          </RevealItem>

          <RevealItem className="grid gap-3 lg:grid-cols-12 lg:gap-4">
            <MetricShell className="lg:col-span-7">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Consistência e hábitos</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Ritmo recente</h2>
                </div>
                <div className="rounded-2xl bg-slate-950 p-2 text-white dark:bg-white/10">
                  <CalendarDays className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ofensiva</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{analytics.overview.current_streak}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">dias seguidos</p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Dias ativos</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{habits.activeDays30}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">nos últimos 30 dias</p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ritmo recente</p>
                  <p className={cn(
                    'mt-2 flex flex-wrap items-center gap-2 text-xl font-semibold leading-tight',
                    habits.rhythmTone === 'up' ? 'text-emerald-600 dark:text-emerald-300'
                      : habits.rhythmTone === 'down' ? 'text-rose-600 dark:text-rose-300'
                      : 'text-slate-950 dark:text-white',
                  )}>
                    {habits.rhythmTone === 'up' && <TrendingUp className="h-5 w-5" />}
                    {habits.rhythmTone === 'down' && <TrendingDown className="h-5 w-5" />}
                    {habits.rhythmTone === 'stable' && <CheckCircle2 className="h-5 w-5" />}
                    {habits.rhythmLabel}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">comparando as últimas 2 semanas</p>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Carga recente</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{habits.questions7}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">questões + {habits.simulations7} simulados em 7 dias</p>
                </div>
              </div>

              <div className={cn(CHART_CARD_CLASS, 'mt-6 h-[220px] sm:h-[240px]')}>
                <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {([
                      { key: 'questions', label: 'Questões', color: org.brand_primary },
                      { key: 'simulados', label: 'Simulados', color: '#2563eb' },
                    ] as const).map((item) => {
                      const active = visibleHabitsMetrics.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleHabitsMetric(item.key)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                            active ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                          )}
                          style={{
                            borderColor: active ? hexToRgba(item.color, 0.28) : undefined,
                            backgroundColor: active ? hexToRgba(item.color, 0.12) : undefined,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                    {([7, 14, 30] as const).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setHabitsPeriod(days)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          habitsPeriod === days
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                            : 'border-slate-300 bg-white text-slate-500 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-300',
                        )}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
                {habitsChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={habitsChartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} minTickGap={24} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        content={({ active: isActive, payload }) => {
                          if (!isActive || !payload?.length) return null;
                          const row = payload[0]?.payload as { label: string; questions: number; simulados: number };
                          return (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-2xl">
                              <p className="mb-1 text-slate-300">{row.label}</p>
                              <p>Questões: <span className="font-semibold">{row.questions}</span></p>
                              <p>Simulados: <span className="font-semibold">{row.simulados}</span></p>
                            </div>
                          );
                        }}
                      />
                      {visibleHabitsMetrics.includes('questions') && (
                        <Bar dataKey="questions" fill={org.brand_primary} radius={[6, 6, 0, 0]} />
                      )}
                      {visibleHabitsMetrics.includes('simulados') && (
                        <Bar dataKey="simulados" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                    Ainda não há histórico suficiente para ler hábitos com segurança.
                  </div>
                )}
              </div>
            </MetricShell>

            <MetricShell className="lg:col-span-5">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Apoio</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Simulados e ranking</h2>
                </div>
                <div className="rounded-2xl bg-slate-950 p-2 text-white dark:bg-white/10">
                  <Gauge className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Simulados</p>
                  <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
                    <div>
                      <p className="text-slate-400">Melhor TRI</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{bestSimuladoTri || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Média recente</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{recentSimuladoAvg != null ? `${recentSimuladoAvg}%` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Último</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{lastSimulado ? `${lastSimulado.percentage}%` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Área mais estável</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{mostConsistentArea?.subject || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className={SOFT_CARD_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ranking</p>
                  <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
                    <div>
                      <p className="text-slate-400">Posição</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary?.rank_position ? `#${summary.rank_position}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Pontos</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary?.monthly_points ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Top 3</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary?.rank_position && summary.rank_position <= (summary.prize_cutoff || 3) ? 0 : (summary?.points_to_top3 ?? 0)} pts</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Faixa visível</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{ranking?.ranking?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </MetricShell>
          </RevealItem>
        </RevealGroup>
      </div>
    </div>
  );
}
