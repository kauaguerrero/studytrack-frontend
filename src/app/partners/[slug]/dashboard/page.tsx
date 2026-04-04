'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Typewriter } from '@/components/ui/typewriter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Users, Activity, BookOpen, FileText, TrendingUp, ArrowUpRight,
  Trophy, Award, Star, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgStats {
  total_students: number;
  active_today: number;
  active_week: number;
  active_month: number;
  active_total: number;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  plan_distribution: Record<string, number>;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_tier: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_price_cents?: number | null;
  plan_duration_days?: number | null;
  plan_last_payment_at?: string | null;
  essay_credits_remaining?: number | null;
  essay_credits_limit?: number | null;
  essay_credits_period?: 'week' | 'month' | null;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  accuracy_pct: number | null;
}

interface EssayListItem {
  id: string;
  submitted_at: string;
}

type MetricWindow = 'today' | 'week' | 'month' | 'total';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COLORS = [
  'var(--brand-primary)',
  'var(--brand-secondary)',
  '#22c55e',
  '#f59e0b',
  '#e11d48',
  '#0ea5e9',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#334155',
];

function normalizePlanLabel(raw: string): string {
  if (raw === 'b2b_student' || raw === 'b2b_pro' || raw === 'free' || raw === 'none' || raw === 'null') {
    return 'Sem plano vinculado';
  }
  return raw;
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgb(255 255 255 / 0.98)',
  border: '1px solid rgb(226 232 240)',
  borderRadius: '12px',
  color: '#0f172a',
};

function LiquidGlassDefs() {
  return (
    <svg aria-hidden className="hidden">
      <defs>
        <filter id="brand-liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.025"
            numOctaves={2}
            seed={2}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.6" result="noise-blur" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise-blur"
            scale={18}
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="0.8" />
        </filter>
      </defs>
    </svg>
  );
}

function BrandLiquidGlass({
  accentColor,
  intensity = 16,
}: {
  accentColor: string;
  intensity?: number;
}) {
  return (
    <div className="hidden dark:block">
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-slate-200 dark:border-white/10 opacity-48"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${accentColor} ${Math.max(3, Math.round(intensity * 0.34))}%, transparent) 0%, rgba(255,255,255,0.01) 40%, color-mix(in srgb, ${accentColor} 3%, transparent) 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 color-mix(in srgb, ${accentColor} 8%, transparent), 0 4px 14px rgba(0,0,0,0.11)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-[1px] rounded-[inherit] opacity-24"
        style={{
          filter: 'url("#brand-liquid-glass")',
          background: `radial-gradient(circle at 18% 8%, color-mix(in srgb, ${accentColor} 14%, rgba(255,255,255,0.08)), transparent 46%),
            radial-gradient(circle at 82% 92%, color-mix(in srgb, ${accentColor} 8%, rgba(255,255,255,0.06)), transparent 52%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_58%)]" />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Card dark com suporte a cor de acento via CSS variable ou cor fixa.
 * accentColor define a tinta do background e da borda.
 */
function TintedCard({
  children,
  className,
  accentColor,
  accentStrength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  accentStrength?: number;
}) {
  const bg = accentColor
    ? `color-mix(in srgb, ${accentColor} ${accentStrength}%, var(--partner-surface-base))`
    : 'rgb(255 255 255)';
  const border = accentColor
    ? `color-mix(in srgb, ${accentColor} 22%, var(--partner-surface-base))`
    : 'rgb(255 255 255 / 0.10)';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'hover:shadow-md hover:-translate-y-[1px] dark:hover:shadow-none',
        className,
      )}
      style={{ background: bg, borderColor: border }}
    >
      <BrandLiquidGlass accentColor={accentColor || 'var(--brand-primary)'} intensity={12 + accentStrength} />
      <div className="relative z-10">{children}</div>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  loading,
  accentColor,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
  accentColor: string;
}) {
  const bg      = `color-mix(in srgb, ${accentColor} 13%, var(--partner-surface-base))`;
  const border  = `color-mix(in srgb, ${accentColor} 28%, var(--partner-surface-base))`;
  const iconBg  = `color-mix(in srgb, ${accentColor} 34%, var(--partner-surface-base))`;
  const glowBg  = `radial-gradient(circle at top right, color-mix(in srgb, ${accentColor} 14%, transparent), transparent 70%)`;

  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5',
        'border',
        'hover:brightness-105 hover:shadow-md dark:hover:shadow-none',
        'transition-all duration-300 group',
        href && 'cursor-pointer'
      )}
      style={{ background: bg, borderColor: border }}
    >
      <BrandLiquidGlass accentColor={accentColor} intensity={18} />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: glowBg }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20"
            style={{
              background: iconBg,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px color-mix(in srgb, ${accentColor} 24%, transparent)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{ background: `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${accentColor} 24%, rgba(255,255,255,0.2)), transparent 60%)` }}
            />
            <Icon
              className="relative z-10 h-5 w-5"
              style={{ color: accentColor, filter: `drop-shadow(0 0 6px color-mix(in srgb, ${accentColor} 42%, transparent))` }}
            />
          </div>
          {href && (
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-white/20 group-hover:text-slate-700 dark:group-hover:text-white/60 transition-colors" />
          )}
        </div>

        {loading ? (
          <div className="h-9 w-24 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        ) : (
          <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
        )}

        <p className="text-xs font-semibold text-slate-600 dark:text-white/50 mt-1">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-white/30 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const { org } = useOrg();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [rankingStudents, setRankingStudents] = useState<Student[]>([]);
  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [metricWindow, setMetricWindow] = useState<MetricWindow>('week');
  const [activePlanIndex, setActivePlanIndex] = useState<number | null>(null);
  const [showRevenueValue, setShowRevenueValue] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

      try {
        const [resStats, resEssays, resRankingFirstPage] = await Promise.all([
          fetch(`${api}/api/partners/${org.slug}/stats`, { headers }),
          fetch(`${api}/api/partners/${org.slug}/essays?status=all&page=1&limit=1000`, { headers }),
          fetch(`${api}/api/partners/${org.slug}/students?limit=100&page=1&sort=full_name&order=asc`, { headers }),
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resRankingFirstPage.ok) {
          const firstPayload = await resRankingFirstPage.json();
          const firstStudents = Array.isArray(firstPayload?.students) ? firstPayload.students : [];
          const total = Number(firstPayload?.total || 0);
          const pageSize = Number(firstPayload?.limit || 100);
          const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

          if (totalPages <= 1) {
            setRankingStudents(firstStudents);
            setStudents(firstStudents);
          } else {
            const pageFetches: Promise<Response>[] = [];
            for (let page = 2; page <= totalPages; page += 1) {
              pageFetches.push(
                fetch(`${api}/api/partners/${org.slug}/students?limit=100&page=${page}&sort=full_name&order=asc`, { headers }),
              );
            }
            const pageResponses = await Promise.all(pageFetches);
            const extraStudents: Student[] = [];
            for (const response of pageResponses) {
              if (!response.ok) continue;
              const payload = await response.json();
              if (Array.isArray(payload?.students)) {
                extraStudents.push(...payload.students);
              }
            }
            const allStudents = [...firstStudents, ...extraStudents];
            setRankingStudents(allStudents);
            setStudents(allStudents);
          }
        }
        if (resEssays.ok) {
          const data = await resEssays.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setEssays(
            items
              .map((e: { id?: string; submitted_at?: string }) => ({
                id: e.id ?? '',
                submitted_at: e.submitted_at ?? '',
              }))
              .filter((e: EssayListItem) => Boolean(e.id && e.submitted_at)),
          );
        }
      } catch {
        // Não loga detalhes em produção para evitar information disclosure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [org.slug]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const planChartData = useMemo(() => {
    if (!stats) return [];
    const grouped: Record<string, number> = {};
    for (const [rawKey, count] of Object.entries(stats.plan_distribution)) {
      const label = normalizePlanLabel(rawKey);
      grouped[label] = (grouped[label] || 0) + count;
    }
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const projectedRevenueCents = useMemo(
    () => students.reduce((acc, student) => (
      acc + (student.plan_id ? Number(student.plan_price_cents || 0) : 0)
    ), 0),
    [students],
  );

  const studentsNearExpiry = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return students
      .map((student) => {
        if (!student.plan_id || !student.plan_last_payment_at || !student.plan_duration_days) return null;
        const lastPayment = parseIsoDate(student.plan_last_payment_at);
        if (!lastPayment) return null;
        const expiresAtMs = lastPayment.getTime() + Number(student.plan_duration_days) * dayMs;
        const daysLeft = Math.ceil((expiresAtMs - now) / dayMs);
        if (daysLeft < 0 || daysLeft > 7) return null;
        return {
          id: student.id,
          full_name: student.full_name,
          plan_name: student.plan_name || 'Plano',
          daysLeft,
        };
      })
      .filter((item): item is { id: string; full_name: string; plan_name: string; daysLeft: number } => Boolean(item))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [students]);

  const metricLabel = {
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês',
    total: 'Total',
  }[metricWindow];

  const getQuestionsByWindow = (s: Student) => (
    metricWindow === 'today' ? s.questions_today
      : metricWindow === 'week' ? s.questions_week
        : metricWindow === 'month' ? s.questions_month
          : s.questions_total
  );
  const getSimuladosByWindow = (s: Student) => (
    metricWindow === 'today' ? s.simulados_today
      : metricWindow === 'week' ? s.simulados_week
        : metricWindow === 'month' ? s.simulados_month
          : s.simulados_total
  );

  const rankingPool = rankingStudents.length > 0 ? rankingStudents : students;
  const sortedByActivity = [...rankingPool].sort((a, b) => (
    getQuestionsByWindow(b) - getQuestionsByWindow(a)
    || getSimuladosByWindow(b) - getSimuladosByWindow(a)
    || (b.last_activity_date || '').localeCompare(a.last_activity_date || '')
  ));
  const topStudents = sortedByActivity.slice(0, 5);
  const rankingBaseCount = rankingPool.length;
  const studentsForTable = sortedByActivity.slice(0, 10);

  const activeValue = stats
    ? (metricWindow === 'today' ? stats.active_today
      : metricWindow === 'week' ? stats.active_week
        : metricWindow === 'month' ? stats.active_month
          : stats.active_total)
    : 0;
  const questionsValue = stats
    ? (metricWindow === 'today' ? stats.questions_today
      : metricWindow === 'week' ? stats.questions_week
        : metricWindow === 'month' ? stats.questions_month
          : stats.questions_total)
    : 0;
  const simuladosValue = stats
    ? (metricWindow === 'today' ? stats.simulados_today
      : metricWindow === 'week' ? stats.simulados_week
        : metricWindow === 'month' ? stats.simulados_month
          : stats.simulados_total)
    : 0;
  const activeRate = stats
    ? Math.round((activeValue / Math.max(stats.total_students, 1)) * 100)
    : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  const jsDay = startOfWeek.getDay();
  const daysSinceMonday = (jsDay + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const deliveredEssaysCount = essays.filter((essay) => {
    if (!essay.submitted_at) return false;
    if (metricWindow === 'total') return true;
    const submitted = new Date(essay.submitted_at);
    if (Number.isNaN(submitted.getTime())) return false;
    if (metricWindow === 'today') return submitted >= startOfToday;
    if (metricWindow === 'week') return submitted >= startOfWeek;
    return submitted >= startOfMonth;
  }).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PartnerLayout>
      <div className="space-y-6 min-h-full bg-slate-50 dark:bg-slate-950 -mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 pt-4 md:px-8 md:pt-8 pb-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <LiquidGlassDefs />

        {/* ── Hero Header ───────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 p-6 mb-2 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_18%,white)_0%,color-mix(in_srgb,var(--brand-secondary)_10%,white)_100%)] dark:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_22%,#0f172a)_0%,#0f172a_62%)]"
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
            style={{ background: 'var(--brand-primary)' }}
          />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-1">
                Central de Inteligência
              </p>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-slate-600 dark:text-white/50 mt-1">Visão geral de {org.name}</p>
              <div className="mt-3 flex items-center justify-start">
                <div
                  className="relative inline-flex items-center gap-3 overflow-hidden rounded-full border px-3 py-1.5
                    bg-[color-mix(in_srgb,var(--brand-primary)_18%,white)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_20%,#0f172a)]
                    border-[color-mix(in_srgb,var(--brand-primary)_42%,white)] dark:border-[color-mix(in_srgb,var(--brand-primary)_42%,#0f172a)]
                    ring-1 ring-inset ring-[color-mix(in_srgb,var(--brand-primary)_12%,white)] dark:ring-[color-mix(in_srgb,var(--brand-primary)_12%,#0f172a)]"
                >
                  <BrandLiquidGlass accentColor="var(--brand-primary)" intensity={14} />
                  <span
                    className="relative z-10 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    Período
                  </span>
                  <Select value={metricWindow} onValueChange={(value) => setMetricWindow(value as MetricWindow)}>
                    <SelectTrigger className="relative z-10 h-8 w-[170px] overflow-hidden border-slate-300 dark:border-white/25 bg-white dark:bg-slate-900/70 text-xs font-semibold text-slate-800 dark:text-white">
                      <BrandLiquidGlass accentColor="var(--brand-primary)" intensity={10} />
                      <span className="relative z-10">
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mês</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-full border border-slate-300/80 dark:border-white/15 bg-white/90 dark:bg-slate-900/70 px-4 py-2.5 text-base font-semibold text-slate-700 dark:text-white/85">
                <span className="mr-2">📚 Nós nascemos para</span>
                <Typewriter
                  text={['Estudar.', 'Evoluir.', 'Conquistar.', 'Aprovar.']}
                  speed={80}
                  deleteSpeed={42}
                  waitTime={2200}
                  className="font-black text-[var(--brand-primary)]"
                  cursorClassName="ml-1 text-[var(--brand-primary)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            title="Alunos Cadastrados"
            value={stats?.total_students ?? '—'}
            subtitle={`de ${org.max_students} vagas`}
            icon={Users}
            href={`/partners/${org.slug}/alunos`}
            loading={loading}
            accentColor="var(--brand-primary)"
          />
          <KpiCard
            title={`Ativos • ${metricLabel}`}
            value={activeValue ?? '—'}
            subtitle={`${activeRate}% do total`}
            icon={Activity}
            loading={loading}
            accentColor="var(--brand-secondary)"
          />
          <KpiCard
            title={`Questões • ${metricLabel}`}
            value={questionsValue ?? '—'}
            subtitle="respondidas pela turma"
            icon={BookOpen}
            loading={loading}
            accentColor="var(--brand-accent)"
          />
          <KpiCard
            title={`Simulados • ${metricLabel}`}
            value={simuladosValue ?? '—'}
            subtitle="realizados pela turma"
            icon={FileText}
            loading={loading}
            accentColor="#8b5cf6"
          />
        </div>

        <TintedCard accentColor="var(--brand-primary)" accentStrength={9}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-slate-700 dark:text-white/80 font-bold">Redações entregues</CardTitle>
              <Link
                href={`/partners/${org.slug}/redacoes`}
                className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition
                  border-[color-mix(in_srgb,var(--brand-secondary)_45%,white)] dark:border-[color-mix(in_srgb,var(--brand-secondary)_45%,#0f172a)]
                  bg-[color-mix(in_srgb,var(--brand-secondary)_22%,white)] dark:bg-[color-mix(in_srgb,var(--brand-secondary)_24%,#0f172a)]
                  text-slate-800 dark:text-white hover:brightness-105"
              >
                <BrandLiquidGlass accentColor="var(--brand-secondary)" intensity={14} />
                <FileText className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">Redações</span>
              </Link>
            </div>
            <span className="text-xs text-slate-500 dark:text-white/45">Período: {metricLabel}</span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-10 w-24 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-end justify-between gap-3">
                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{deliveredEssaysCount}</p>
                <p className="text-xs text-slate-500 dark:text-white/45">redações no período selecionado</p>
              </div>
            )}
          </CardContent>
        </TintedCard>

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Distribuição de Planos — tinta secondary */}
          <TintedCard accentColor="var(--brand-secondary)" accentStrength={7}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm text-slate-700 dark:text-white/80 font-bold">
                    Projeção de receita com planos
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-white/35">Valor estimado: preço do plano x alunos vinculados</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRevenueValue((prev) => !prev)}
                  className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/90 dark:bg-slate-900/70 text-slate-700 dark:text-white/80 transition hover:brightness-105"
                  aria-label={showRevenueValue ? 'Ocultar receita' : 'Mostrar receita'}
                  title={showRevenueValue ? 'Ocultar receita' : 'Mostrar receita'}
                >
                  <BrandLiquidGlass accentColor="var(--brand-secondary)" intensity={14} />
                  {showRevenueValue ? <Eye className="relative z-10 h-4 w-4" /> : <EyeOff className="relative z-10 h-4 w-4" />}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-900/10 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Receita projetada</p>
                <p
                  className={cn(
                    'mt-1 text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 transition',
                    !showRevenueValue && 'blur-sm select-none',
                  )}
                >
                  {formatMoney(projectedRevenueCents)}
                </p>
              </div>

              {studentsNearExpiry.length > 0 && (
                <Link
                  href={`/partners/${org.slug}/planos?expiring=1`}
                  className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-amber-900 transition hover:bg-amber-100 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">{studentsNearExpiry.length} aluno(s) próximo(s) do vencimento</p>
                    <p className="opacity-80">Clique para abrir a página de planos e marcar como pago.</p>
                  </div>
                </Link>
              )}

              {loading ? (
                <div className="h-40 w-full bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
              ) : planChartData.length > 0 ? (
                <>
                  <p className="mb-2 text-xs text-slate-500 dark:text-white/35">Distribuição de planos</p>
                  {/* Pie sem legenda interna */}
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={planChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePlanIndex(index)}
                        onMouseLeave={() => setActivePlanIndex(null)}
                      >
                        {planChartData.map((_, i) => {
                          const isActive = activePlanIndex === i;
                          return (
                            <Cell
                              key={i}
                              fill={PLAN_COLORS[i % PLAN_COLORS.length]}
                              stroke={isActive ? '#0f172a' : 'transparent'}
                              strokeWidth={isActive ? 2 : 0}
                              fillOpacity={activePlanIndex === null || isActive ? 1 : 0.45}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${v} alunos`]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legenda customizada — espaçada e com fonte mais pesada */}
                  <div className="flex flex-col gap-2.5 mt-4 px-1">
                    {planChartData.map((entry, i) => (
                      <button
                        key={entry.name}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-all',
                          activePlanIndex === i
                            ? 'bg-slate-100 dark:bg-white/10'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5',
                        )}
                        onMouseEnter={() => setActivePlanIndex(i)}
                        onMouseLeave={() => setActivePlanIndex(null)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                          />
                          <span
                            className={cn(
                              'text-sm transition-all',
                              activePlanIndex === i
                                ? 'font-black text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-700 dark:text-white/75',
                            )}
                          >
                            {entry.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-sm tabular-nums transition-all',
                            activePlanIndex === i ? 'font-black' : 'font-bold',
                          )}
                          style={{ color: PLAN_COLORS[i % PLAN_COLORS.length] }}
                        >
                          {entry.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-slate-400 dark:text-white/30 py-10">Nenhum aluno ainda</p>
              )}
            </CardContent>
          </TintedCard>

          {/* Ranking por período — tinta primary */}
          <TintedCard accentColor="var(--brand-primary)" accentStrength={6} className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm text-slate-700 dark:text-white/80 font-bold">
                    Ranking • {metricLabel}
                  </CardTitle>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                      color: 'var(--brand-primary)',
                      borderColor: 'color-mix(in srgb, var(--brand-primary) 42%, transparent)',
                    }}
                  >
                    TOP 5
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/35">
                  Ordenado por questões e simulados no período
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-slate-500 dark:text-white/35 whitespace-nowrap">
                  Baseado em {rankingBaseCount} aluno{rankingBaseCount === 1 ? '' : 's'}
                </span>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-white/20 text-[10px] font-bold text-slate-500 dark:text-white/60"
                  title={`Critério: Questões (${metricLabel}) desc, depois Simulados (${metricLabel}) desc e última atividade mais recente.`}
                >
                  i
                </span>
                <Link
                  href={`/partners/${org.slug}/alunos`}
                  className="text-xs font-medium flex items-center gap-1 shrink-0"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 w-full bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : topStudents.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-white/30 py-8">Nenhum aluno ativo ainda</p>
              ) : (
                <div className="space-y-2">
                  {topStudents.map((student, idx) => {
                    const max = getQuestionsByWindow(topStudents[0]) || 1;
                    const pct = Math.round((getQuestionsByWindow(student) / max) * 100);
                    const barOpacity = Math.max(0.3, 1 - idx * 0.15);

                    const today = new Date().toISOString().slice(0, 10);
                    const isOnline = student.last_activity_date === today;

                    const RankIcon =
                      idx === 0 ? Trophy :
                      idx === 1 ? Award :
                      idx === 2 ? Star : null;

                    const rankColor =
                      idx === 0 ? '#f59e0b' :   // gold
                      idx === 1 ? '#94a3b8' :   // silver
                      '#cd7c2f';                 // bronze

                    return (
                      <Link
                        key={student.id}
                        href={`/partners/${org.slug}/alunos/${student.id}`}
                        className="group block"
                      >
                        <div
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl p-3',
                            'hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200',
                            idx === 0 && 'bg-slate-100 dark:bg-white/5 ring-1 ring-white/10',
                          )}
                        >
                          {/* Rank icon */}
                          <div className="w-8 shrink-0 flex items-center justify-center">
                            {RankIcon ? (
                              <RankIcon
                                className="h-4 w-4"
                                style={{ color: rankColor }}
                              />
                            ) : (
                              <span className="text-xs font-black text-slate-400 dark:text-white/20">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Avatar + indicador online */}
                          <div className="relative shrink-0">
                            {student.avatar_url ? (
                              <Image
                                src={student.avatar_url}
                                alt={student.full_name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-slate-900 dark:text-white"
                                style={{
                                  background: `color-mix(in srgb, var(--brand-primary) ${Math.max(6, 30 - idx * 4)}%, #1e293b)`,
                                }}
                              >
                                {(student.full_name || '?')[0].toUpperCase()}
                              </div>
                            )}
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1 ring-slate-900" />
                              </span>
                            )}
                          </div>

                          {/* Nome + stats + barra */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-semibold text-slate-700 dark:text-white/80 truncate group-hover:text-slate-900 dark:group-hover:text-slate-900 dark:text-white transition-colors">
                                {student.full_name?.split(' ')[0] || '—'}
                              </span>
                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                <span
                                  className="text-xs font-black tabular-nums"
                                  style={{ color: 'var(--brand-primary)', opacity: barOpacity }}
                                >
                                  {getQuestionsByWindow(student)} Questões
                                </span>
                                <span className="text-slate-900 dark:text-white/15 text-xs">·</span>
                                <span
                                  className="text-xs font-bold tabular-nums text-slate-500 dark:text-white/35"
                                >
                                  {getSimuladosByWindow(student)} Simulados
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg,
                                    color-mix(in srgb, var(--brand-primary) ${Math.round(barOpacity * 100)}%, #1e293b),
                                    var(--brand-primary))`,
                                  opacity: barOpacity,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </TintedCard>
        </div>

        {/* ── Tabela de Atividade Recente — tinta accent ────────────────────── */}
        <TintedCard accentColor="var(--brand-accent)" accentStrength={5}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: 'var(--brand-primary)' }}
              >
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--brand-accent)' }} />
                Ranking de Atividade
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-white/45">Alunos mais ativos em {metricLabel.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-white/20 text-[10px] font-bold text-slate-500 dark:text-white/60"
                title={`Tabela ordenada por Questões (${metricLabel}) desc, Simulados (${metricLabel}) desc e última atividade.`}
              >
                i
              </span>
              <Link
                href={`/partners/${org.slug}/alunos`}
                className="text-xs font-medium flex items-center gap-1 shrink-0"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver tabela completa <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-white/30 py-8">
                Nenhum aluno cadastrado ainda.{' '}
                <Link
                  href={`/partners/${org.slug}/alunos/convidar`}
                  className="underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Importar alunos
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-left text-[10px] uppercase tracking-widest">
                      <th className="pb-3 font-semibold pl-1" style={{ color: 'var(--brand-primary)' }}>Aluno</th>
                      <th className="pb-3 font-semibold text-center hidden sm:table-cell" style={{ color: 'var(--brand-primary)' }}>Plano</th>
                      <th className="pb-3 font-semibold text-center" style={{ color: 'var(--brand-primary)' }}>
                        {`Questões (${metricLabel.toLowerCase()})`}
                      </th>
                      <th className="pb-3 font-semibold text-center hidden sm:table-cell" style={{ color: 'var(--brand-primary)' }}>
                        {`Simulados (${metricLabel.toLowerCase()})`}
                      </th>
                      <th className="pb-3 font-semibold text-center" style={{ color: 'var(--brand-primary)' }}>Taxa de acerto</th>
                      <th className="pb-3 font-semibold text-center hidden md:table-cell" style={{ color: 'var(--brand-primary)' }}>Última atividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsForTable.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 pl-1">
                          <Link
                            href={`/partners/${org.slug}/alunos/${s.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:underline"
                          >
                            {s.full_name || '—'}
                          </Link>
                          <p className="text-xs text-slate-500 dark:text-white/35 hidden xs:block">{s.email}</p>
                        </td>
                        <td className="py-3 text-center hidden sm:table-cell">
                          <Badge className="text-[10px] border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60">
                            {s.plan_name || 'Sem plano vinculado'}
                          </Badge>
                        </td>
                        <td className="py-3 text-center font-medium text-slate-600 dark:text-white/70">
                          {getQuestionsByWindow(s)}
                        </td>
                        <td className="py-3 text-center text-slate-500 dark:text-white/50 hidden sm:table-cell">
                          {getSimuladosByWindow(s)}
                        </td>
                        <td className="py-3 text-center">
                          {s.accuracy_pct != null ? (
                            <span
                              className={s.accuracy_pct < 60 ? 'text-rose-400' : ''}
                              style={
                                s.accuracy_pct >= 60
                                  ? { color: 'var(--brand-primary)' }
                                  : undefined
                              }
                            >
                              {s.accuracy_pct}%
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-white/30">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center text-xs text-slate-400 dark:text-white/30 hidden md:table-cell">
                          {s.last_activity_date ?? 'Nunca'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </TintedCard>

      </div>
    </PartnerLayout>
  );
}
