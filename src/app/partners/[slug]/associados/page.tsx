'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  RevealGroup,
  RevealItem,
  ElevatedCard,
  KpiCard,
  Segmented,
  CHART_TOOLTIP_STYLE,
} from '@/components/partners/founder-ui';
import {
  UsersRound,
  UserPlus,
  PenLine,
  Clock,
  FileText,
  KeyRound,
  Copy,
  Trash2,
  Loader2,
  ShieldCheck,
  Mail,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart2,
  Star,
  Activity,
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
  CartesianGrid,
  Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricWindow = 'today' | 'week' | 'month' | 'total';

interface AssociatePermissions {
  can_correct: boolean;
  can_import: boolean;
  can_view_students: boolean;
}

interface Associate {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  associate_permissions: AssociatePermissions;
}

interface AssociateStats {
  corrections_in_window: number;
  total_corrections: number;
  avg_essay_score: number | null;
  avg_turnaround_hours: number | null;
}

interface OrgSummary {
  total_associates: number;
  active_associates: number;
  inactive_associates: number;
  pending_essays: number;
  corrections_in_window: number;
  total_corrections: number;
  avg_turnaround_hours: number | null;
  avg_essay_score: number | null;
}

interface TrendPoint {
  date: string;
  corrections: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WINDOW_OPTIONS: { value: MetricWindow; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'total', label: 'Total' },
];

const WINDOW_LABEL: Record<MetricWindow, string> = {
  today: 'Hoje',
  week: 'Esta Semana',
  month: 'Este Mês',
  total: 'Total',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null) {
  if (!name) return '??';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatHours(h: number | null) {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function formatDateTick(v: string, win: MetricWindow): string {
  if (win === 'today') return `${v}h`;
  if (win === 'total') {
    const [y, m] = v.split('-');
    return `${m}/${String(y).slice(2)}`;
  }
  const [, m, d] = v.split('-');
  return `${d}/${m}`;
}

function formatDateLabel(v: string, win: MetricWindow): string {
  if (win === 'today') return `Hora: ${v}h`;
  if (win === 'total') {
    const [y, m] = v.split('-');
    return `${m}/${y}`;
  }
  const [y, m, d] = v.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PermBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
      active
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/30 line-through'
    }`}>
      {active ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <XCircle className="h-2.5 w-2.5 shrink-0" />}
      {label}
    </span>
  );
}

function StatCell({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white dark:bg-slate-800 px-2 py-2 text-center shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">
        {value}
        {unit && <span className="text-[9px] font-normal text-slate-400 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssociadosPage() {
  const { org } = useOrg();
  const router = useRouter();
  const accent = org.brand_primary ?? '#6366f1';
  const accentSecondary = org.brand_secondary ?? '#8b5cf6';
  const accentHex = org.brand_primary;

  // ── State ────────────────────────────────────────────────────────────────
  const [metricWindow, setMetricWindow] = useState<MetricWindow>('week');
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [stats, setStats] = useState<Record<string, AssociateStats>>({});
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedAccess, setGeneratedAccess] = useState<{ fullName: string; email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/partners/${org.slug}/associates`);
    if (res.ok) {
      const d = await res.json() as { associates?: Associate[] };
      setAssociates(Array.isArray(d.associates) ? d.associates : []);
    }
  }, [org.slug]);

  const fetchStats = useCallback(async (win: MetricWindow, initial = false) => {
    if (initial) setLoading(true); else setStatsLoading(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/stats?window=${win}`);
      if (res.ok) {
        const d = await res.json() as {
          summary: OrgSummary;
          associate_stats: Record<string, AssociateStats>;
          trend: TrendPoint[];
        };
        setSummary(d.summary);
        setStats(d.associate_stats ?? {});
        setTrend(d.trend ?? []);
      }
    } finally {
      if (initial) setLoading(false); else setStatsLoading(false);
    }
  }, [org.slug]);

  useEffect(() => {
    Promise.all([fetchList(), fetchStats('week', true)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug]);

  useEffect(() => {
    if (!loading) fetchStats(metricWindow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricWindow]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  async function handleCreate() {
    const name = newName.trim();
    const email = newEmail.trim();
    if (!name) { toast.error('Informe o nome do associado.'); return; }
    if (!email || !email.includes('@')) { toast.error('Informe um e-mail válido.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-studytrack-csrf': '1' },
        body: JSON.stringify({ full_name: name, email, role: 'associate' }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; associate?: Associate }));
      if (!res.ok) throw new Error(data.error || 'Não foi possível adicionar o associado.');

      toast.success('Associado adicionado!');
      setNewName('');
      setNewEmail('');
      setGeneratedAccess(null);

      if (data.associate?.id) {
        const passRes = await fetch(`/api/partners/${org.slug}/associates/${data.associate.id}/password`, {
          method: 'POST',
          headers: { 'x-studytrack-csrf': '1' },
        });
        if (passRes.ok) {
          const passData = await passRes.json().catch(() => ({} as { temporary_password?: string }));
          if (passData.temporary_password) {
            setGeneratedAccess({ fullName: name, email, password: passData.temporary_password });
            setShowPassword(false);
          }
        }
      }

      await Promise.all([fetchList(), fetchStats(metricWindow)]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar associado.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(member: Associate) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-studytrack-csrf': '1' },
        body: JSON.stringify({ active: !member.active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(d.error || 'Não foi possível atualizar.');
      }
      toast.success(member.active ? 'Associado desativado.' : 'Associado reativado.');
      await Promise.all([fetchList(), fetchStats(metricWindow)]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdatePermission(member: Associate, key: keyof AssociatePermissions, value: boolean) {
    const next = { ...member.associate_permissions, [key]: value };
    if (!next.can_correct && !next.can_import && !next.can_view_students) {
      toast.error('O associado deve ter ao menos uma permissão ativa.');
      return;
    }
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-studytrack-csrf': '1' },
        body: JSON.stringify({ permissions: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(d.error || 'Não foi possível atualizar.');
      }
      toast.success('Permissões atualizadas.');
      await fetchList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar permissões.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleGeneratePassword(member: Associate) {
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}/password`, {
        method: 'POST',
        headers: { 'x-studytrack-csrf': '1' },
      });
      const data = await res.json().catch(() => ({} as { error?: string; temporary_password?: string }));
      if (!res.ok || !data.temporary_password) throw new Error(data.error || 'Não foi possível gerar senha.');
      setGeneratedAccess({ fullName: member.full_name || 'Associado', email: member.email || '', password: data.temporary_password });
      setShowPassword(false);
      setSheetOpen(true);
      toast.success('Senha temporária gerada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar senha temporária.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member: Associate) {
    if (!confirm(`Remover "${member.full_name ?? member.email}" da organização?`)) return;
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}`, {
        method: 'DELETE',
        headers: { 'x-studytrack-csrf': '1' },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(d.error || 'Não foi possível remover.');
      }
      toast.success('Associado removido.');
      await Promise.all([fetchList(), fetchStats(metricWindow)]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover associado.');
    } finally {
      setBusyId(null);
    }
  }

  // ── Chart data ────────────────────────────────────────────────────────────
  const barData = associates.map(a => ({
    name: (a.full_name ?? a.email ?? '').split(' ')[0],
    fullName: a.full_name ?? a.email ?? '—',
    correções: stats[a.id]?.corrections_in_window ?? 0,
    active: a.active,
  }));

  const windowLabel = WINDOW_LABEL[metricWindow];
  const chartInterval = metricWindow === 'today' ? 3 : metricWindow === 'month' ? 6 : 'preserveStartEnd';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PartnerLayout variant="founder">
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <RevealGroup className="mx-auto max-w-5xl space-y-5">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <RevealItem>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  Gestão de Associados
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitore o time de correctores e gerencie acessos.
                </p>
              </div>
              <Button
                onClick={() => { setGeneratedAccess(null); setSheetOpen(true); }}
                style={{ backgroundColor: accent }}
                className="gap-2 text-white hover:opacity-90 shrink-0 self-start"
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Adicionar Associado</span>
              </Button>
            </div>
          </RevealItem>

          {/* ── Period filter ─────────────────────────────────────────────── */}
          <RevealItem>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Período de análise
              </p>
              <Segmented
                options={WINDOW_OPTIONS}
                value={metricWindow}
                onChange={setMetricWindow}
                hex={accentHex}
              />
            </div>
          </RevealItem>

          {/* ── KPI Cards — 6 cards ───────────────────────────────────────── */}
          <RevealItem>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <KpiCard
                title="Associados"
                value={loading ? '—' : (summary?.total_associates ?? 0)}
                subtitle={loading ? '' : `${summary?.active_associates ?? 0} ativo${(summary?.active_associates ?? 0) !== 1 ? 's' : ''}`}
                icon={UsersRound}
                accentColor={accent}
                accentHex={accentHex}
                loading={loading}
              />
              <KpiCard
                title={`Correções · ${windowLabel}`}
                value={loading || statsLoading ? '—' : (summary?.corrections_in_window ?? 0)}
                subtitle="no período selecionado"
                icon={PenLine}
                accentColor={accentSecondary}
                accentHex={accentSecondary}
                loading={loading || statsLoading}
              />
              <KpiCard
                title="Pendentes"
                value={loading ? '—' : (summary?.pending_essays ?? 0)}
                subtitle="aguardando correção"
                icon={FileText}
                accentColor="#f59e0b"
                accentHex="#f59e0b"
                loading={loading}
              />
              <KpiCard
                title="Score Médio"
                value={loading ? '—' : (summary?.avg_essay_score != null ? `${summary.avg_essay_score}` : '—')}
                subtitle="pontos por redação"
                icon={Star}
                accentColor="#10b981"
                accentHex="#10b981"
                loading={loading}
              />
              <KpiCard
                title="Tempo Médio"
                value={loading ? '—' : formatHours(summary?.avg_turnaround_hours ?? null)}
                subtitle="por correção"
                icon={Clock}
                accentColor="#6366f1"
                accentHex="#6366f1"
                loading={loading}
              />
              <KpiCard
                title="Total de Correções"
                value={loading ? '—' : (summary?.total_corrections ?? 0)}
                subtitle="histórico acumulado"
                icon={Activity}
                accentColor="#ec4899"
                accentHex="#ec4899"
                loading={loading}
              />
            </div>
          </RevealItem>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <RevealItem>
            <div className="grid gap-4 md:grid-cols-2">

              {/* Bar: Corrections per associate */}
              <ElevatedCard>
                <div className="p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        Correções por Associado
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{windowLabel}</span>
                  </div>
                  {loading || statsLoading ? (
                    <div className="h-44 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                  ) : barData.length === 0 ? (
                    <div className="flex h-44 items-center justify-center text-sm text-slate-400">
                      Nenhum dado disponível
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={176}>
                      <BarChart data={barData} barSize={28} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                          formatter={(value: unknown, _name: unknown, entry: { payload?: { fullName?: string } }) => [
                            `${value} correções`,
                            entry.payload?.fullName ?? '',
                          ] as [string, string]}
                        />
                        <Bar dataKey="correções" radius={[6, 6, 0, 0]}>
                          {barData.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={entry.active ? accent : '#cbd5e1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ElevatedCard>

              {/* Area: Correction trend */}
              <ElevatedCard>
                <div className="p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        Volume de Correções
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{windowLabel}</span>
                  </div>
                  {loading || statsLoading ? (
                    <div className="h-44 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                  ) : (
                    <ResponsiveContainer width="100%" height={176}>
                      <AreaChart data={trend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="corrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => formatDateTick(v, metricWindow)}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          interval={chartInterval}
                        />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelFormatter={(v) => formatDateLabel(String(v), metricWindow)}
                          formatter={(value: unknown) => [`${value} correções`, ''] as [string, string]}
                        />
                        <Area type="monotone" dataKey="corrections" name="correções" stroke={accent} strokeWidth={2} fill="url(#corrGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ElevatedCard>
            </div>
          </RevealItem>

          {/* ── Associate Cards ───────────────────────────────────────────── */}
          <RevealItem>
            <ElevatedCard>
              <div className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Equipe</p>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Associados Cadastrados</h2>
                  </div>
                  {associates.length > 0 && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}
                    >
                      {associates.length}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    ))}
                  </div>
                ) : associates.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, white)` }}
                    >
                      <UsersRound className="h-7 w-7" style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Nenhum associado ainda</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Adicione um corrector para começar a delegar redações.
                      </p>
                    </div>
                    <Button
                      onClick={() => { setGeneratedAccess(null); setSheetOpen(true); }}
                      style={{ backgroundColor: accent }}
                      className="mt-1 gap-2 text-white hover:opacity-90"
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Adicionar Associado
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {associates.map(member => {
                      const s = stats[member.id];
                      const perms = member.associate_permissions;
                      const isBusy = busyId === member.id;
                      const isExpanded = expandedId === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
                            member.active
                              ? 'border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/5'
                              : 'border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] opacity-70'
                          }`}
                        >
                          {/* ─ Card header: always visible ─ */}
                          <div className="p-3 md:p-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: member.active ? accent : '#94a3b8' }}
                              >
                                {member.avatar_url ? (
                                  <Image src={member.avatar_url} alt="" width={36} height={36} className="h-full w-full rounded-full object-cover" />
                                ) : getInitials(member.full_name)}
                              </div>

                              {/* Name + email + status */}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Link
                                    href={`/partners/${org.slug}/associados/${member.id}`}
                                    className="text-sm font-semibold text-slate-900 dark:text-white hover:underline decoration-dashed underline-offset-2 truncate max-w-[140px] sm:max-w-none"
                                  >
                                    {member.full_name ?? '—'}
                                  </Link>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                                    member.active
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${member.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {member.active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {member.email ?? '—'}
                                </p>
                              </div>

                              {/* Expand toggle */}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : member.id)}
                                className="ml-auto shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                              >
                                {isExpanded ? 'Fechar ▲' : 'Detalhes ▼'}
                              </button>
                            </div>

                            {/* Permission badges (always visible, compact) */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <PermBadge label="Corrigir" active={perms.can_correct} />
                              <PermBadge label="Importar" active={perms.can_import} />
                              <PermBadge label="Ver Alunos" active={perms.can_view_students} />
                            </div>

                            {/* KPI metrics row (always visible) */}
                            {member.active && (
                              <div className="mt-2.5 grid grid-cols-4 gap-1.5 sm:gap-2">
                                <StatCell
                                  label={metricWindow === 'today' ? 'Hoje' : metricWindow === 'week' ? 'Semana' : metricWindow === 'month' ? 'Mês' : 'Período'}
                                  value={s?.corrections_in_window ?? 0}
                                />
                                <StatCell label="Total" value={s?.total_corrections ?? 0} />
                                <StatCell
                                  label="Score"
                                  value={s?.avg_essay_score != null ? s.avg_essay_score : '—'}
                                  unit={s?.avg_essay_score != null ? 'pts' : ''}
                                />
                                <StatCell label="Tempo" value={formatHours(s?.avg_turnaround_hours ?? null)} />
                              </div>
                            )}
                          </div>

                          {/* ─ Expanded section: permissions + actions ─ */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-800/50 px-3 py-3 md:px-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Permission toggles */}
                                {member.active && (
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                                    {([
                                      { key: 'can_correct' as const, label: 'Pode Corrigir' },
                                      { key: 'can_import' as const, label: 'Pode Importar' },
                                      { key: 'can_view_students' as const, label: 'Ver Alunos' },
                                    ]).map(({ key, label }) => (
                                      <div key={key} className="flex items-center gap-2">
                                        <Switch
                                          id={`${member.id}-${key}`}
                                          checked={perms[key]}
                                          disabled={isBusy}
                                          onCheckedChange={v => handleUpdatePermission(member, key, v)}
                                          className="scale-[0.8]"
                                        />
                                        <Label htmlFor={`${member.id}-${key}`} className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                                          {label}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-1.5 sm:ml-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="h-7 gap-1 px-2 text-xs"
                                  >
                                    <Link href={`/partners/${org.slug}/associados/${member.id}`}>
                                      Ver Análise
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy || !member.active}
                                    onClick={() => handleGeneratePassword(member)}
                                    className="h-7 gap-1 px-2 text-xs"
                                  >
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">Senha</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => handleToggleActive(member)}
                                    className="h-7 gap-1 px-2 text-xs"
                                  >
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                                      member.active
                                        ? <XCircle className="h-3.5 w-3.5 text-amber-500" />
                                        : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    )}
                                    {member.active ? 'Desativar' : 'Reativar'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => handleRemove(member)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                    title="Remover"
                                  >
                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>

        </RevealGroup>
      </div>

      {/* ── Sheet: Add / Password ──────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-sm sm:max-w-md overflow-y-auto">
          <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {generatedAccess ? 'Acesso Gerado' : 'Adicionar Associado'}
          </SheetTitle>

          {/* Generated password banner */}
          {generatedAccess && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/20 p-4">
              <div className="flex items-start gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Senha temporária gerada</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Entregue com segurança para <strong>{generatedAccess.fullName}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <code className="rounded-lg bg-amber-100 dark:bg-amber-800/40 px-3 py-1.5 text-sm font-bold text-amber-900 dark:text-amber-100 break-all">
                  {showPassword ? generatedAccess.password : '••••••••••••'}
                </code>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setShowPassword(p => !p)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"
                    onClick={() => { navigator.clipboard.writeText(generatedAccess.password); toast.success('Copiado!'); }}>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                O associado deverá trocar a senha no primeiro login.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => setGeneratedAccess(null)}
              >
                Adicionar outro associado
              </Button>
            </div>
          )}

          {/* Add form */}
          {!generatedAccess && (
            <>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                O associado terá acesso restrito ao portal para corrigir redações.
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assoc_name" className="text-xs font-medium">Nome completo</Label>
                  <Input
                    id="assoc_name"
                    placeholder="Ana Silva"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    disabled={submitting}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assoc_email" className="text-xs font-medium">E-mail</Label>
                  <Input
                    id="assoc_email"
                    type="email"
                    placeholder="ana@cursinho.com.br"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    disabled={submitting}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span>Permissão padrão: corrigir redações. Configure outras permissões após a criação.</span>
              </div>
              <Button
                className="mt-5 w-full gap-2 text-white hover:opacity-90"
                style={{ backgroundColor: accent }}
                disabled={submitting}
                onClick={handleCreate}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {submitting ? 'Adicionando...' : 'Adicionar Associado'}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PartnerLayout>
  );
}
