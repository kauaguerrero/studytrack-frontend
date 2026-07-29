'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Button } from '@/components/ui/button';
import {
  RevealGroup,
  RevealItem,
  ElevatedCard,
  KpiCard,
  CHART_TOOLTIP_STYLE,
} from '@/components/partners/founder-ui';
import {
  ArrowLeft,
  KeyRound,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  PenLine,
  Clock,
  FileText,
  Star,
  Activity,
  CalendarDays,
  Award,
  Eye,
  EyeOff,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssocPermissions {
  can_correct: boolean;
  can_import: boolean;
  can_view_students: boolean;
}

interface AssocProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  associate_permissions: AssocPermissions;
  created_at: string;
}

interface AssocMetrics {
  corrections_today: number;
  corrections_week: number;
  corrections_month: number;
  corrections_total: number;
  avg_essay_score: number | null;
  best_essay_score: number | null;
  avg_turnaround_hours: number | null;
  pending_essays: number;
}

interface DayPoint {
  date: string;
  corrections: number;
  avg_score: number | null;
  avg_turnaround_hours: number | null;
}

interface CompAvg {
  competency: string;
  avg: number;
  count: number;
}

interface RecentCorrection {
  essay_id: string;
  student_name: string | null;
  submitted_at: string | null;
  corrected_at: string;
  total_score: number | null;
  turnaround_hours: number | null;
}

interface AssocDetailData {
  profile: AssocProfile;
  metrics: AssocMetrics;
  daily_evolution: DayPoint[];
  competency_avgs: CompAvg[];
  recent_corrections: RecentCorrection[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 28, label: '28 dias' },
  { value: 90, label: '90 dias' },
];

const COMP_META: Record<string, { label: string; color: string }> = {
  C1: { label: 'Domínio da Escrita Formal', color: '#6366f1' },
  C2: { label: 'Compreensão do Tema', color: '#8b5cf6' },
  C3: { label: 'Organização e Argumentação', color: '#06b6d4' },
  C4: { label: 'Mecanismos Linguísticos', color: '#10b981' },
  C5: { label: 'Proposta de Intervenção', color: '#f59e0b' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function formatDay(date: string): string {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

function formatFullDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function scoreBadgeClass(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40';
  if (score >= 800) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
  if (score >= 600) return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
  if (score >= 400) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  return 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssociadoDetailPage() {
  const params = useParams();
  const { org } = useOrg();
  const router = useRouter();

  const associateId = params.id as string;
  const accent = org.brand_primary ?? '#6366f1';
  const accentSecondary = org.brand_secondary ?? '#8b5cf6';
  const accentHex = org.brand_primary;

  // State
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AssocDetailData | null>(null);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null);

  // Fetch
  const fetchData = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${associateId}/profile?days=${d}`);
      if (res.status === 404) {
        router.push(`/partners/${org.slug}/associados`);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as AssocDetailData;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [org.slug, associateId, router]);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  // Handlers
  async function handleGeneratePassword() {
    setGeneratingPassword(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${associateId}/password`, {
        method: 'POST',
        headers: { 'x-studytrack-csrf': '1' },
      });
      const d = await res.json().catch(() => ({} as { temporary_password?: string; error?: string }));
      if (!res.ok || !d.temporary_password) throw new Error(d.error || 'Não foi possível gerar senha.');
      setTempPassword(d.temporary_password);
      setShowTempPassword(false);
      toast.success('Senha temporária gerada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar senha.');
    } finally {
      setGeneratingPassword(false);
    }
  }

  async function handleToggleActive() {
    const currentActive = optimisticActive ?? data?.profile?.active ?? true;
    const newActive = !currentActive;
    const msg = newActive
      ? 'Reativar este associado? Ele voltará a ter acesso ao portal.'
      : 'Desativar este associado? Ele perderá acesso ao portal.';
    if (!confirm(msg)) return;
    setTogglingActive(true);
    setOptimisticActive(newActive);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${associateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-studytrack-csrf': '1' },
        body: JSON.stringify({ active: newActive }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(d.error || 'Não foi possível atualizar.');
      }
      toast.success(newActive ? 'Associado reativado.' : 'Associado desativado.');
      router.refresh();
      // Re-fetch para sincronizar estado real
      await fetchData(days);
    } catch (err) {
      setOptimisticActive(currentActive);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setTogglingActive(false);
    }
  }

  const profile = data?.profile;
  const metrics = data?.metrics;

  // Estado ativo resolvido (otimista tem prioridade sobre dado da API)
  const isActive = optimisticActive ?? profile?.active ?? true;

  // Chart helpers
  const chartData = data?.daily_evolution ?? [];
  const hasScoreData = chartData.some(d => d.avg_score !== null);
  const hasTurnaroundData = chartData.some(d => d.avg_turnaround_hours !== null);
  const tickInterval = days === 7 ? 0 : days === 28 ? 6 : 14;
  const barSize = days <= 7 ? 28 : days <= 28 ? 12 : 5;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PartnerLayout variant="founder">
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-12 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <RevealGroup className="mx-auto max-w-5xl space-y-5">

          {/* ── Back button ─────────────────────────────────────────────── */}
          <RevealItem>
            <Link
              href={`/partners/${org.slug}/associados`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Associados
            </Link>
          </RevealItem>

          {/* ── Profile header card ──────────────────────────────────────── */}
          <RevealItem>
            <ElevatedCard>
              <div className="p-5 md:p-6">
                {loading ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-5 w-44 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
                      <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
                      <div className="h-3 w-64 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
                    </div>
                  </div>
                ) : profile ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: avatar + info */}
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-md"
                        style={{ backgroundColor: accent }}
                      >
                        {profile.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt=""
                            width={64}
                            height={64}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(profile.full_name)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {profile.full_name ?? '—'}
                          </h1>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-white/40">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Inativo
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {profile.email ?? '—'}
                        </p>

                        {/* Permissions badges */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {(
                            [
                              { key: 'can_correct', label: 'Corrigir' },
                              { key: 'can_import', label: 'Importar' },
                              { key: 'can_view_students', label: 'Ver Alunos' },
                            ] as { key: keyof AssocPermissions; label: string }[]
                          ).map(({ key, label }) => {
                            const active = profile.associate_permissions[key];
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  active
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                                    : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/30 line-through'
                                }`}
                              >
                                {active ? (
                                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                ) : (
                                  <XCircle className="h-2.5 w-2.5 shrink-0" />
                                )}
                                {label}
                              </span>
                            );
                          })}
                        </div>

                        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          Membro desde {formatFullDate(profile.created_at.slice(0, 10))}
                        </p>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end sm:shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generatingPassword}
                        onClick={handleGeneratePassword}
                        className="gap-1.5 text-xs h-8"
                      >
                        {generatingPassword ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        Gerar Senha
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingActive}
                        onClick={handleToggleActive}
                        className={`gap-1.5 text-xs h-8 ${
                          isActive
                            ? 'text-amber-600 hover:text-amber-700 hover:border-amber-300 dark:text-amber-400'
                            : 'text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 dark:text-emerald-400'
                        }`}
                      >
                        {togglingActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isActive ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {isActive ? 'Desativar' : 'Reativar'}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Temporary password reveal */}
                {tempPassword && (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/20 p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                        Senha temporária gerada — entregue com segurança para {profile?.full_name ?? 'o associado'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-amber-100 dark:bg-amber-800/40 px-3 py-1.5 text-sm font-bold text-amber-900 dark:text-amber-100 break-all">
                        {showTempPassword ? tempPassword : '•'.repeat(Math.min(tempPassword.length, 14))}
                      </code>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => setShowTempPassword(p => !p)}
                        >
                          {showTempPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showTempPassword ? 'Ocultar' : 'Mostrar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success('Copiado!'); }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-400"
                          onClick={() => setTempPassword(null)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                      O associado deverá trocar a senha no primeiro login.
                    </p>
                  </div>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>

          {/* ── KPI cards — Activity ────────────────────────────────────── */}
          <RevealItem>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Atividade
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  title="Hoje"
                  value={loading ? '—' : (metrics?.corrections_today ?? 0)}
                  subtitle="correções nas últimas 24h"
                  icon={PenLine}
                  accentColor={accent}
                  accentHex={accentHex}
                  loading={loading}
                />
                <KpiCard
                  title="Esta Semana"
                  value={loading ? '—' : (metrics?.corrections_week ?? 0)}
                  subtitle="correções últimos 7 dias"
                  icon={Activity}
                  accentColor={accent}
                  accentHex={accentHex}
                  loading={loading}
                />
                <KpiCard
                  title="Este Mês"
                  value={loading ? '—' : (metrics?.corrections_month ?? 0)}
                  subtitle="correções últimos 30 dias"
                  icon={BarChart2}
                  accentColor={accentSecondary}
                  accentHex={accentSecondary}
                  loading={loading}
                />
                <KpiCard
                  title="Total Acumulado"
                  value={loading ? '—' : (metrics?.corrections_total ?? 0)}
                  subtitle="histórico completo"
                  icon={Award}
                  accentColor={accentSecondary}
                  accentHex={accentSecondary}
                  loading={loading}
                />
              </div>
            </div>
          </RevealItem>

          {/* ── KPI cards — Quality ─────────────────────────────────────── */}
          <RevealItem>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Qualidade
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  title="Score Médio"
                  value={loading ? '—' : (metrics?.avg_essay_score != null ? String(metrics.avg_essay_score) : '—')}
                  subtitle="pontos por redação"
                  icon={Star}
                  accentColor="#10b981"
                  accentHex="#10b981"
                  loading={loading}
                />
                <KpiCard
                  title="Melhor Nota"
                  value={loading ? '—' : (metrics?.best_essay_score != null ? String(metrics.best_essay_score) : '—')}
                  subtitle="maior score corrigido"
                  icon={TrendingUp}
                  accentColor="#10b981"
                  accentHex="#10b981"
                  loading={loading}
                />
                <KpiCard
                  title="Tempo Médio"
                  value={loading ? '—' : formatHours(metrics?.avg_turnaround_hours ?? null)}
                  subtitle="por correção"
                  icon={Clock}
                  accentColor="#6366f1"
                  accentHex="#6366f1"
                  loading={loading}
                />
                <KpiCard
                  title="Pendentes"
                  value={loading ? '—' : (metrics?.pending_essays ?? 0)}
                  subtitle="redações aguardando"
                  icon={FileText}
                  accentColor="#f59e0b"
                  accentHex="#f59e0b"
                  loading={loading}
                />
              </div>
            </div>
          </RevealItem>

          {/* ── Charts ──────────────────────────────────────────────────── */}
          <RevealItem>
            <ElevatedCard>
              <div className="p-4 md:p-5">
                {/* Chart header with range filter */}
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Evolução Temporal
                    </p>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                      Análise de Desempenho
                    </h2>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-white/5 p-0.5 self-start sm:self-auto">
                    {RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setDays(opt.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          days === opt.value
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart 1: Corrections per day — full width */}
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Correções por Dia</p>
                  </div>
                  {loading ? (
                    <div className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                  ) : (
                    <ResponsiveContainer width="100%" height={144}>
                      <BarChart data={chartData} barSize={barSize} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradAssoc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={accent} stopOpacity={1} />
                            <stop offset="100%" stopColor={accent} stopOpacity={0.55} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDay}
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval={tickInterval}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelFormatter={(v) => formatFullDate(String(v))}
                          formatter={(value: unknown) => [`${value}`, 'correções'] as [string, string]}
                        />
                        <Bar
                          dataKey="corrections"
                          name="Correções"
                          fill="url(#barGradAssoc)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Charts 2 & 3: Score and Turnaround — side by side */}
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Score evolution */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Score Médio das Redações</p>
                    </div>
                    {loading ? (
                      <div className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    ) : !hasScoreData ? (
                      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                        <p className="text-xs text-slate-400">Sem dados de score no período</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={144}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="scoreGradAssoc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDay}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval={tickInterval}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 1000]}
                          />
                          <Tooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            labelFormatter={(v) => formatFullDate(String(v))}
                            formatter={(value: unknown) => [
                              value != null ? `${value} pts` : '—',
                              'Score médio',
                            ] as [string, string]}
                          />
                          <Area
                            type="monotone"
                            dataKey="avg_score"
                            name="Score"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#scoreGradAssoc)"
                            dot={false}
                            connectNulls={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Turnaround evolution */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tempo Médio de Entrega (horas)</p>
                    </div>
                    {loading ? (
                      <div className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    ) : !hasTurnaroundData ? (
                      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                        <p className="text-xs text-slate-400">Sem dados de tempo no período</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={144}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDay}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval={tickInterval}
                          />
                          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            labelFormatter={(v) => formatFullDate(String(v))}
                            formatter={(value: unknown) => [
                              value != null ? formatHours(Number(value)) : '—',
                              'Tempo médio',
                            ] as [string, string]}
                          />
                          <Line
                            type="monotone"
                            dataKey="avg_turnaround_hours"
                            name="Tempo"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </ElevatedCard>
          </RevealItem>

          {/* ── Competency breakdown ─────────────────────────────────────── */}
          {(loading || (data?.competency_avgs?.length ?? 0) > 0) && (
            <RevealItem>
              <ElevatedCard>
                <div className="p-4 md:p-5">
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Competências ENEM
                    </p>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                      Qualidade das Redações Corrigidas
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Média das notas atribuídas por competência · escala 0 – 200
                    </p>
                  </div>

                  {loading ? (
                    <div className="space-y-3.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {(data?.competency_avgs ?? []).map(({ competency, avg, count }) => {
                        const meta = COMP_META[competency] ?? { label: competency, color: '#6366f1' };
                        const pct = Math.min(Math.round((avg / 200) * 100), 100);
                        return (
                          <div key={competency}>
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="text-xs font-black shrink-0 w-5"
                                  style={{ color: meta.color }}
                                >
                                  {competency}
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                                  {meta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                                  {count} redações
                                </span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                  {avg}
                                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/200</span>
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: meta.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ElevatedCard>
            </RevealItem>
          )}

          {/* ── Recent corrections ───────────────────────────────────────── */}
          <RevealItem>
            <ElevatedCard>
              <div className="p-4 md:p-5">
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Histórico
                  </p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Correções Recentes
                  </h2>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    ))}
                  </div>
                ) : (data?.recent_corrections ?? []).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <PenLine className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma correção registrada ainda.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {(data?.recent_corrections ?? []).map((corr, idx) => (
                      <div
                        key={`${corr.essay_id}-${idx}`}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        {/* Date chip */}
                        <div className="shrink-0 w-10 rounded-lg bg-slate-100 dark:bg-white/10 px-1.5 py-1 text-center">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none uppercase">
                            {corr.corrected_at.slice(5, 7)}/{corr.corrected_at.slice(2, 4)}
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                            {corr.corrected_at.slice(8, 10)}
                          </p>
                        </div>

                        {/* Student name + submit date */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {corr.student_name ?? 'Aluno desconhecido'}
                          </p>
                          {corr.submitted_at && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              Enviada {formatFullDate(corr.submitted_at.slice(0, 10))}
                            </p>
                          )}
                        </div>

                        {/* Score badge */}
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreBadgeClass(corr.total_score)}`}
                        >
                          {corr.total_score != null ? `${corr.total_score}` : '—'}
                        </span>

                        {/* Turnaround chip */}
                        <span className="shrink-0 hidden sm:flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatHours(corr.turnaround_hours)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>

        </RevealGroup>
      </div>
    </PartnerLayout>
  );
}
