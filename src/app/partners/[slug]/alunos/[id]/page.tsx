'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, BookOpen, FileText, Target,
  Flame, TrendingUp, TrendingDown, Award, BarChart2, Zap,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { BRT_TIMEZONE, toBrtDateKey } from '@/lib/brt-date';

interface StudentDetail {
  profile: {
    id: string;
    full_name: string;
    email: string;
    plan_tier: string;
    plan_id?: string | null;
    plan_name?: string | null;
    plan_assignment_status?: 'active' | 'inactive' | null;
    plan_last_payment_at?: string | null;
    last_activity_date: string | null;
    joined_organization_at: string | null;
    avatar_url: string | null;
    focus_area: string | null;
    study_pace: string | null;
    hours_per_day: number | null;
    days_per_week: number | null;
    current_streak?: number | null;
  };
  metrics: {
    questions_today: number;
    questions_week: number;
    questions_month: number;
    questions_total: number;
    simulados_month: number;
    simulados_total: number;
    accuracy_pct: number | null;
  };
  subject_breakdown: { subject: string; total: number; correct: number; accuracy_pct: number }[];
  weekly_evolution: { week_start: string; total: number; accuracy_pct: number }[];
  daily_evolution?: { date: string; total: number; accuracy_pct: number }[];
  recent_answers: { id: string; question_id: string; selected_option: string; is_correct: boolean; subject: string; created_at: string }[];
  recent_simulados: { id: string; config: Record<string, unknown>; score: number; total_questions: number; tri_score: number | null; time_taken_secs: number; completed_at: string }[];
  essay_stats?: {
    delivered_count: number;
    corrected_count: number;
    avg_score: number | null;
    best_score: number | null;
    trend: 'up' | 'down' | 'neutral' | null;
    trend_delta: number | null;
  };
  essay_evolution?: {
    id: string;
    status: 'pending' | 'corrected' | 'seen';
    submitted_at: string;
    corrected_at: string | null;
    total_score: number | null;
  }[];
  essay_competency_avgs?: {
    competency: number;
    avg: number | null;
    count: number;
  }[];
  essay_by_type?: {
    type: string;
    delivered_count: number;
    corrected_count: number;
    avg_score: number | null;
    best_score: number | null;
    trend: 'up' | 'down' | 'neutral' | null;
    trend_delta: number | null;
    evolution: {
      id: string;
      status: 'pending' | 'corrected' | 'seen';
      submitted_at: string;
      corrected_at: string | null;
      total_score: number | null;
    }[];
    competency_avgs: {
      competency: number;
      avg: number | null;
      count: number;
    }[];
  }[];
}

interface StudentEssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  theme: string | null;
}

interface OrgPlanOption {
  id: string;
  name: string;
  is_active: boolean | string | number | null;
}

const PACE_LABELS: Record<string, string> = { slow: 'Leve', moderate: 'Moderado', intense: 'Intensivo' };

const COMPETENCY_NAMES = [
  'Norma Culta',
  'Compreensão da Proposta',
  'Organização das Informações',
  'Mecanismos Linguísticos',
  'Proposta de Intervenção',
];

function getTrendColor(trend: string | null | undefined): string {
  if (trend === 'up') return 'text-emerald-600 dark:text-emerald-400';
  if (trend === 'down') return 'text-red-500 dark:text-red-400';
  return 'text-slate-500 dark:text-slate-400';
}

function getTrendLabel(trend: string | null | undefined, delta: number | null | undefined): string {
  if (!trend || delta === null || delta === undefined) return '—';
  const sign = delta > 0 ? '+' : '';
  if (trend === 'up') return `↑ ${sign}${delta} pts (últimas 3)`;
  if (trend === 'down') return `↓ ${sign}${delta} pts (últimas 3)`;
  return `→ Estável (últimas 3)`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isPlanActive(value: OrgPlanOption['is_active']): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizePlanLabel(raw?: string | null): string {
  const value = String(raw || '').trim().toLowerCase();
  if (!value || value === 'legado' || value === 'legacy' || value === 'b2b_student' || value === 'b2b_pro' || value === 'free' || value === 'none' || value === 'null') {
    return 'Sem plano vinculado';
  }
  return String(raw).trim();
}

function formatIsoToBrtDate(value?: string | null): string {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return toBrtDateKey(dt);
}

function formatIsoToBrtMonthDay(value?: string | null): string {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  const full = toBrtDateKey(dt);
  return full.length >= 10 ? full.slice(5, 10) : full;
}

// Retorna DD/MM/YYYY para exibição (não usar como chave de ordenação)
function formatIsoToBrtDateBR(value?: string | null): string {
  const ymd = formatIsoToBrtDate(value);
  if (ymd === '—' || ymd.length < 10) return ymd;
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
}

const SIM_FORMAT_LABELS: Record<string, string> = {
  custom: 'Personalizado',
  enem: 'ENEM',
};

export default function StudentProfilePage() {
  const { org } = useOrg();
  const params = useParams<{ slug: string; id: string }>();
  const studentId = params.id;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [fallbackEssayStats, setFallbackEssayStats] = useState<{ delivered: number; corrected: number }>({
    delivered: 0,
    corrected: 0,
  });
  const [studentEssays, setStudentEssays] = useState<StudentEssayListItem[]>([]);
  const [plans, setPlans] = useState<OrgPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  type EvolutionGranularity = 'daily' | 'weekly' | 'monthly';
  const [evolutionGranularity, setEvolutionGranularity] = useState<EvolutionGranularity>('daily');
  const [rangedays, setRangedays] = useState(28);

  const RANGE_OPTIONS: { label: string; days: number }[] = [
    { label: '7d', days: 7 },
    { label: '14d', days: 14 },
    { label: '28d', days: 28 },
    { label: '60d', days: 60 },
    { label: '90d', days: 90 },
  ];

  const fetchProfile = useCallback(async (days: number) => {
      // Rejeita IDs com formato inválido antes de qualquer chamada de rede
      if (!UUID_RE.test(studentId)) {
        toast.error('Aluno não encontrado.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      try {
        const [resProfile, resEssays, resPlans] = await Promise.all([
          fetch(`${api}/api/partners/${org.slug}/students/${studentId}?days=${days}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${api}/api/partners/${org.slug}/essays?status=all&page=1&limit=500`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${api}/api/partners/${org.slug}/plans?include_inactive=false`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        if (resProfile.ok) {
          setData(await resProfile.json());
        } else {
          toast.error('Aluno não encontrado.');
        }

        if (resEssays.ok) {
          const payload = await resEssays.json();
          const items = (payload?.items || []) as Array<{
            id?: string;
            status?: 'pending' | 'corrected' | 'seen';
            student?: { id?: string } | Array<{ id?: string }>;
            student_id?: string;
            submitted_at?: string;
            corrected_at?: string | null;
            total_score?: number | null;
            theme?: string | null;
            essay_theme?: string | null;
            tema?: string | null;
            topic?: string | null;
            title?: string | null;
          }>;
          const fromStudent = items.filter((e) => {
            const studentFromJoin = Array.isArray(e.student) ? e.student[0]?.id : e.student?.id;
            const candidateId = studentFromJoin || e.student_id;
            return candidateId === studentId;
          });

          const normalizedEssays: StudentEssayListItem[] = fromStudent
            .map((e) => {
              const themeCandidates = [e.theme, e.essay_theme, e.tema, e.topic, e.title];
              const themeFound = themeCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || null;
              return {
                id: String(e.id || ''),
                status: e.status || 'pending',
                submitted_at: String(e.submitted_at || ''),
                corrected_at: e.corrected_at ?? null,
                total_score: typeof e.total_score === 'number' ? e.total_score : null,
                theme: themeFound ? themeFound.trim() : null,
              };
            })
            .filter((essay) => Boolean(essay.id && essay.submitted_at))
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

          setStudentEssays(normalizedEssays);

          setFallbackEssayStats({
            delivered: fromStudent.length,
            corrected: fromStudent.filter((e) => e.total_score !== null && e.total_score !== undefined).length,
          });
        }

        if (resPlans.ok) {
          const plansPayload = await resPlans.json().catch(() => null);
          const planItems = Array.isArray(plansPayload?.items) ? plansPayload.items : [];
          setPlans(planItems.filter((plan: OrgPlanOption) => isPlanActive(plan.is_active)));
        }
      } catch {
        toast.error('Erro ao buscar perfil.');
      } finally {
        setLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, studentId]);

  useEffect(() => {
    fetchProfile(rangedays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile, rangedays]);

  async function handlePlanChange(newPlanId: string) {
    if (!data) return;
    if (!UUID_RE.test(studentId)) return;
    setUpdatingPlan(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const selectedPlan = plans.find((plan) => plan.id === newPlanId);
      const isNone = newPlanId === 'none';
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: isNone ? null : newPlanId,
          plan_assignment_status: isNone ? null : 'active',
          plan_last_payment_at: isNone ? null : toBrtDateKey(new Date()),
        }),
      });
      if (res.ok) {
        setData((d) => d ? {
          ...d,
          profile: {
            ...d.profile,
            plan_id: isNone ? null : newPlanId,
            plan_name: isNone ? null : (selectedPlan?.name || d.profile.plan_name || null),
            plan_assignment_status: isNone ? null : 'active',
            plan_last_payment_at: isNone ? null : toBrtDateKey(new Date()),
          },
        } : d);
        toast.success('Plano atualizado.');
      } else {
        toast.error('Erro ao atualizar plano.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingPlan(false);
    }
  }

  const profile = data?.profile;
  const metrics = data?.metrics;
  const essayStats = data?.essay_stats;
  const initials = (profile?.full_name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const focusAndPaceLabel = [
    profile?.focus_area || 'geral',
    profile?.study_pace ? (PACE_LABELS[profile.study_pace] ?? profile.study_pace) : null,
  ].filter(Boolean).join(' ');
  const essayEvolution = data?.essay_evolution || [];
  const correctedEssayEvolution = essayEvolution.filter((e) => e.total_score !== null && e.total_score !== undefined);
  const essayEvolutionChart = correctedEssayEvolution.map((e) => ({
    date: formatIsoToBrtMonthDay(e.submitted_at),
    score: e.total_score as number,
  }));
  const deliveredCount = Math.max(essayStats?.delivered_count ?? 0, fallbackEssayStats.delivered, essayEvolution.length);
  const correctedCount = Math.max(essayStats?.corrected_count ?? 0, fallbackEssayStats.corrected);
  const selectedPlanValue = profile?.plan_id ?? 'none';
  const currentPlanLabel = profile?.plan_name
    ? normalizePlanLabel(profile.plan_name)
    : (selectedPlanValue !== 'none'
      ? (plans.find((plan) => plan.id === selectedPlanValue)?.name || 'Sem plano vinculado')
      : 'Sem plano vinculado');

  // Evolução diária: usa daily_evolution do backend (4 semanas de dados)
  const dailyEvolution = (data?.daily_evolution ?? []).map((d) => ({
    label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`, // DD/MM
    accuracy_pct: d.accuracy_pct,
  }));

  // Consistência de volume: questões por dia
  const volumeChartData = (data?.daily_evolution ?? []).map((d) => ({
    label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`, // DD/MM
    total: d.total,
  }));

  // Evolução mensal: agrega weekly_evolution por mês
  const monthlyEvolution = (() => {
    const weeks = data?.weekly_evolution ?? [];
    const monthMap: Record<string, { totalAnswers: number; sumCorrect: number }> = {};
    for (const w of weeks) {
      const month = w.week_start.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { totalAnswers: 0, sumCorrect: 0 };
      monthMap[month].totalAnswers += w.total;
      monthMap[month].sumCorrect += Math.round((w.accuracy_pct / 100) * w.total);
    }
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        label: `${month.slice(5)}/${month.slice(2, 4)}`, // MM/AA
        accuracy_pct: v.totalAnswers > 0 ? Math.round((v.sumCorrect / v.totalAnswers) * 100) : 0,
      }));
  })();

  const evolutionChartData =
    evolutionGranularity === 'daily' ? dailyEvolution
    : evolutionGranularity === 'weekly'
      ? (data?.weekly_evolution ?? []).map((w) => ({ label: `${w.week_start.slice(8, 10)}/${w.week_start.slice(5, 7)}`, accuracy_pct: w.accuracy_pct }))
    : monthlyEvolution;

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={`/partners/${org.slug}/alunos`}>
            <ArrowLeft className="h-4 w-4" /> Voltar para Alunos
          </Link>
        </Button>

        {/* Header do perfil */}
        <section
          className="relative overflow-hidden rounded-3xl border p-5 shadow-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-primary) 24%, #e5e7eb)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, white) 0%, color-mix(in srgb, var(--brand-secondary) 10%, white) 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 22%, #0f172a) 0%, color-mix(in srgb, var(--brand-secondary) 16%, #0f172a) 100%)' }}
          />
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-60"
            style={{ background: 'color-mix(in srgb, var(--brand-secondary) 54%, transparent)' }}
          />
          <div className="relative z-10 mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              color: 'var(--brand-primary)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 28%, transparent)',
              background: 'color-mix(in srgb, var(--brand-primary) 12%, rgba(255,255,255,0.72))',
            }}
          >
            <Target className="h-3.5 w-3.5" />
            Visão individual do aluno
          </div>
          <Card className="border-white/70 bg-white/88 shadow-none backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ backgroundColor: 'var(--brand-primary)' }}>
                    {profile?.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      : initials}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      {profile?.full_name || 'Aluno'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs border-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] text-slate-700 dark:text-slate-200 dark:border-[color-mix(in_srgb,var(--brand-secondary)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)]">
                        {focusAndPaceLabel}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-slate-500 dark:text-slate-300">
                    <p>Plano atual</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-100">{currentPlanLabel}</p>
                  </div>
                  <Select
                    value={selectedPlanValue}
                    onValueChange={handlePlanChange}
                    disabled={updatingPlan}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano vinculado</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        </section>

        {/* ── GRUPO 1: Volume ─────────────────────────── */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Volume
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Questões no mês',
                value: metrics?.questions_month ?? '—',
                sub: `${metrics?.questions_total ?? 0} no total`,
                icon: BookOpen,
                color: 'var(--brand-primary)',
              },
              {
                label: 'Questões esta semana',
                value: metrics?.questions_week ?? '—',
                sub: `${metrics?.questions_today ?? 0} hoje`,
                icon: Zap,
                color: 'var(--brand-primary)',
              },
              {
                label: 'Simulados',
                value: metrics?.simulados_month ?? '—',
                sub: 'no mês',
                icon: FileText,
                color: '#3b82f6',
              },
              {
                label: 'Redações enviadas',
                value: deliveredCount,
                sub: `${correctedCount} corrigidas`,
                icon: FileText,
                color: '#8b5cf6',
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div
                key={label}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: `${color}18` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {loading ? '—' : value}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── GRUPO 2: Qualidade ───────────────────────── */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Qualidade
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Taxa de acerto',
                value: metrics?.accuracy_pct != null ? `${metrics.accuracy_pct}%` : '—',
                sub: 'questões do mês',
                icon: Target,
                color: metrics?.accuracy_pct != null && metrics.accuracy_pct >= 60
                  ? '#22c55e' : metrics?.accuracy_pct != null && metrics.accuracy_pct >= 40
                    ? '#f59e0b' : '#ef4444',
              },
              {
                label: 'Nota média redações',
                value: data?.essay_stats?.avg_score != null
                  ? `${data.essay_stats.avg_score}`
                  : '—',
                sub: 'sobre 1000 pts',
                icon: TrendingUp,
                color: data?.essay_stats?.avg_score != null && data.essay_stats.avg_score >= 700
                  ? '#22c55e' : data?.essay_stats?.avg_score != null && data.essay_stats.avg_score >= 500
                    ? '#f59e0b' : '#ef4444',
              },
              {
                label: 'Melhor nota',
                value: data?.essay_stats?.best_score != null
                  ? `${data.essay_stats.best_score}`
                  : '—',
                sub: 'sobre 1000 pts',
                icon: Award,
                color: 'var(--brand-primary)',
              },
              {
                label: 'Sequência atual',
                value: data?.profile?.current_streak ?? 0,
                sub: 'dias seguidos',
                icon: Flame,
                color: '#f97316',
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div
                key={label}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: `${color}18` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {loading ? '—' : value}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Redações por tipo ─────────────────────────── */}
        {!loading && (data?.essay_by_type ?? []).map((et) => {
          const typeLabel: Record<string, string> = { enem: 'ENEM', ufu: 'UFU', ueg: 'UEG' };
          const label = typeLabel[et.type] ?? et.type.toUpperCase();
          const isEnem = et.type === 'enem';
          const correctedEvol = et.evolution.filter((e) => e.total_score !== null);
          const chartData = correctedEvol.map((e) => ({
            date: formatIsoToBrtMonthDay(e.submitted_at),
            score: e.total_score as number,
          }));
          const hasCompetencies = isEnem && et.competency_avgs.some((c) => c.avg !== null);

          return (
            <div key={et.type} className="space-y-4">
              {/* Header do tipo */}
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Redações {label}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{et.delivered_count}</span> entregues
                  <span>·</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{et.corrected_count}</span> corrigidas
                  {et.avg_score !== null && (
                    <>
                      <span>·</span>
                      <span>média <span className="font-semibold text-slate-700 dark:text-slate-300">{et.avg_score}{isEnem ? '/1000' : ''}</span></span>
                    </>
                  )}
                </div>
              </div>

              {/* Tendência */}
              {et.trend && (
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  et.trend === 'up'
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    : et.trend === 'down'
                      ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                }`}>
                  {et.trend === 'up' && <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                  {et.trend === 'down' && <TrendingDown className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />}
                  {et.trend === 'neutral' && <BarChart2 className="h-4 w-4 shrink-0 text-slate-500" />}
                  <div>
                    <p className={`text-sm font-semibold ${getTrendColor(et.trend)}`}>
                      {getTrendLabel(et.trend, et.trend_delta)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Comparando as últimas 3 redações {label} com as 3 anteriores
                    </p>
                  </div>
                </div>
              )}

              {/* Gráfico de evolução + Competências */}
              {(chartData.length >= 2 || hasCompetencies) && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {chartData.length >= 2 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Evolução das notas — {label}
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis domain={isEnem ? [0, 1000] : ['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => [isEnem ? `${v} / 1000` : String(v), 'Nota']} />
                          <Line type="monotone" dataKey="score" stroke="var(--brand-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--brand-primary)', strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {hasCompetencies && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Média por competência ENEM
                      </p>
                      <div className="space-y-2.5">
                        {et.competency_avgs.map((c) => {
                          const pct = c.avg !== null ? Math.round((c.avg / 200) * 100) : 0;
                          const barColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
                          return (
                            <div key={c.competency} className="flex items-center gap-3">
                              <span className="w-5 shrink-0 text-xs font-black text-slate-400">C{c.competency}</span>
                              <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {COMPETENCY_NAMES[c.competency - 1]}
                                  </p>
                                  <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                    {c.avg !== null ? `${c.avg}/200` : '—'}
                                  </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Evolução de acertos + Volume + Acertos por matéria */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">Evolução temporal</p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Range */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-0.5">
              {RANGE_OPTIONS.map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => { setRangedays(days); setLoading(true); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    rangedays === days
                      ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                      : 'text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Granularity */}
            <Select
              value={evolutionGranularity}
              onValueChange={(v) => setEvolutionGranularity(v as EvolutionGranularity)}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Evolução de acertos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : evolutionChartData.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">Sem dados ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={evolutionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, 'Acertos']} />
                    <Line type="monotone" dataKey="accuracy_pct" stroke="var(--brand-primary)" strokeWidth={2} dot={rangedays <= 28 ? { r: 3 } : false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Consistência de volume</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : volumeChartData.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">Sem dados ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={volumeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v}`, 'Questões']} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={rangedays <= 28 ? { r: 3 } : false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Acertos por Matéria (mês)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (data?.subject_breakdown?.length ?? 0) === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">Sem dados ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data!.subject_breakdown} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="subject" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Acertos']} />
                    <Bar dataKey="accuracy_pct" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ponto fraco / Ponto forte por matéria */}
        {!loading && (data?.subject_breakdown?.length ?? 0) > 0 && (() => {
          const eligible = (data!.subject_breakdown).filter((s) => s.total >= 3);
          if (eligible.length === 0) return null;
          const weakest = eligible.reduce((a, b) => a.accuracy_pct <= b.accuracy_pct ? a : b);
          const strongest = eligible.reduce((a, b) => a.accuracy_pct >= b.accuracy_pct ? a : b);
          return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/25 dark:bg-red-500/10">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 dark:bg-red-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">Ponto fraco</p>
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{weakest.subject}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {weakest.accuracy_pct}% de acertos · {weakest.total} questões no mês
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Ponto forte</p>
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{strongest.subject}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {strongest.accuracy_pct}% de acertos · {strongest.total} questões no mês
                </p>
              </div>
            </div>
          );
        })()}

        {/* Últimos simulados */}
        {(data?.recent_simulados?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimos Simulados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data!.recent_simulados.map((s) => {
                  const pct = Math.round((s.score / s.total_questions) * 100);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl border dark:border-slate-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {(() => {
                            const fmt = (s.config as { format?: string })?.format;
                            if (typeof fmt === 'string') return SIM_FORMAT_LABELS[fmt.toLowerCase()] ?? fmt;
                            return 'Simulado';
                          })()}
                        </p>
                        <p className="text-xs text-slate-400">{formatIsoToBrtDateBR(s.completed_at)}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {s.score}/{s.total_questions}
                        </p>
                        <p className="text-[10px] text-slate-400">questões</p>
                      </div>
                      <div
                        className="text-lg font-black shrink-0 w-14 text-right"
                        style={{ color: pct >= 60 ? 'var(--brand-primary)' : '#f43f5e' }}
                      >
                        {pct}%
                      </div>
                      {s.tri_score != null && (
                        <div className="text-center shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{s.tri_score}</p>
                          <p className="text-[10px] text-slate-400">TRI</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de redações */}
        <Card className="border-[color:color-mix(in_srgb,var(--brand-secondary)_18%,transparent)]">
          <CardHeader>
            <CardTitle className="text-sm">Histórico de redações</CardTitle>
            <CardDescription>Todas as redações enviadas por este aluno</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : studentEssays.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Nenhuma redação encontrada para este aluno.</p>
            ) : (
              <div className="space-y-2">
                {studentEssays.map((essay) => (
                  <Link
                    key={essay.id}
                    href={`/partners/${org.slug}/redacoes/${essay.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-[var(--brand-primary)] hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {essay.theme || 'Tema não informado'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enviada em {formatIsoToBrtDate(essay.submitted_at)}
                        {essay.corrected_at ? ` • Corrigida em ${formatIsoToBrtDate(essay.corrected_at)}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {essay.total_score !== null && (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {essay.total_score}/1000
                        </span>
                      )}
                      <span
                        className={
                          essay.status === 'pending'
                            ? 'rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : essay.status === 'corrected'
                              ? 'rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }
                      >
                        {essay.status === 'pending' ? 'Pendente' : essay.status === 'corrected' ? 'Corrigida' : 'Arquivada'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
