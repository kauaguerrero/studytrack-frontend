'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Archive,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  FileText,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';

interface EssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  text: string;
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  student_plan?: {
    plan_name?: string | null;
    limit?: number | null;
    period?: 'week' | 'month' | null;
    used?: number | null;
    remaining?: number | null;
  } | null;
}

interface RankingItem {
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  avg_score: number;
  last_essay_at: string | null;
}

interface EssaysMetrics {
  received_week: number;
  pending_count: number;
  avg_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  ranking: RankingItem[];
}

const DEFAULT_METRICS: EssaysMetrics = {
  received_week: 0,
  pending_count: 0,
  avg_score: null,
  highest_score: null,
  lowest_score: null,
  ranking: [],
};

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function relativeTimeFromNow(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs)) return 'há pouco tempo';

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `há ${Math.max(1, minutes)} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

function pickEssayTheme(item: EssayListItem): string | null {
  const candidates = [item.theme, item.essay_theme, item.tema, item.topic, item.title];
  const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return found ? found.trim() : null;
}

function normalizePlanLabel(raw?: string | null): string {
  const value = String(raw || '').trim().toLowerCase();
  if (!value || value === 'legado' || value === 'legacy' || value === 'b2b_student' || value === 'b2b_pro' || value === 'free' || value === 'none' || value === 'null') {
    return 'Sem plano vinculado';
  }
  return String(raw).trim();
}

function StudentAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: number;
}) {
  const label = name?.trim() || 'Aluno';
  const initials = label
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={label}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
      }}
    >
      {initials}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  badge?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
          <Icon className="h-4 w-4 text-slate-700 dark:text-slate-100" />
        </div>
        {badge}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function EssayQueueCard({
  slug,
  item,
  mode,
  onArchive,
  onDelete,
  archiving,
  deleting,
  allowManageActions,
}: {
  slug: string;
  item: EssayListItem;
  mode: 'pending' | 'corrected';
  onArchive: (essay: EssayListItem) => void;
  onDelete: (essay: EssayListItem) => void;
  archiving: boolean;
  deleting: boolean;
  allowManageActions: boolean;
}) {
  const preview = item.text?.length > 100 ? `${item.text.slice(0, 100)}...` : (item.text || '');
  const essayTheme = pickEssayTheme(item);
  const credit = item.student_plan;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href={`/partners/${slug}/alunos/${item.student.id}`}
              className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
              title="Abrir perfil do aluno"
            >
              <StudentAvatar name={item.student.full_name} avatarUrl={item.student.avatar_url} />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/partners/${slug}/alunos/${item.student.id}`}
                className="truncate text-sm font-semibold text-slate-900 underline-offset-2 transition hover:text-[var(--brand-primary)] hover:underline dark:text-slate-100"
                title="Abrir perfil do aluno"
              >
                {item.student.full_name || 'Aluno'}
              </Link>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.student.email || '-'}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enviada {relativeTimeFromNow(item.submitted_at)}
          </p>
          <p className="text-sm text-slate-600 break-words [overflow-wrap:anywhere] dark:text-slate-300">
            <span className="font-semibold">Tema:</span> {essayTheme || 'Não informado'}
          </p>
          {credit && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Plano: {normalizePlanLabel(credit.plan_name)} • {
                credit.limit && credit.limit > 0
                  ? `Créditos: ${credit.remaining ?? 0} disponíveis de ${credit.limit} por ${credit.period === 'week' ? 'semana' : 'mês'}${typeof credit.used === 'number' ? ` (${credit.used} usados)` : ''}`
                  : 'Créditos: ilimitados'
              }
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-600 break-words [overflow-wrap:anywhere] dark:text-slate-300">{preview}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {mode === 'corrected' && item.total_score !== null && (
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {item.total_score}/1000
            </span>
          )}
          <Link
            href={`/partners/${slug}/redacoes/${item.id}`}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition sm:flex-none',
              mode === 'pending'
                ? 'border-emerald-400/70 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
            )}
          >
            {mode === 'pending' ? 'Corrigir' : 'Visualizar correção'}
          </Link>
          {allowManageActions && (
            <>
              <button
                type="button"
                disabled={archiving || mode === 'pending'}
                onClick={() => onArchive(item)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                title={mode === 'pending' ? 'Somente redações corrigidas podem ser arquivadas' : 'Arquivar redação'}
              >
                <Archive className="h-3.5 w-3.5" />
                Arquivar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete(item)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PartnerRedacoesPage() {
  const { org, userProfile } = useOrg();
  const isAssociate = userProfile.role === 'associate' || userProfile.role === 'teacher';

  const [metrics, setMetrics] = useState<EssaysMetrics>(DEFAULT_METRICS);
  const [pendingEssays, setPendingEssays] = useState<EssayListItem[]>([]);
  const [correctedEssays, setCorrectedEssays] = useState<EssayListItem[]>([]);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'corrected' | 'seen'>('all');
  const [studentFilterId, setStudentFilterId] = useState<string | null>(null);
  const [studentFilterName, setStudentFilterName] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [correctedOpen, setCorrectedOpen] = useState(false);
  const queueSectionRef = useRef<HTMLDivElement | null>(null);

  // Evita sobrescrever manual toggle após primeira sincronização com pending_count.
  const [queueInitDone, setQueueInitDone] = useState(false);

  type EssaysOverviewPayload = {
    metrics: EssaysMetrics;
    pending_items: EssayListItem[];
    all_items: EssayListItem[];
  };

  const loadOverview = useCallback(async () => {
    setMetricsLoading(true);
    setQueueLoading(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/essays/overview`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: EssaysOverviewPayload = await res.json();
      setMetrics(data.metrics || DEFAULT_METRICS);
      const pendingItems = (data.pending_items || [])
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      const doneItems = (data.all_items || [])
        .filter((item) => item.status === 'corrected' || item.status === 'seen')
        .sort((a, b) => {
          const aTs = new Date(a.corrected_at || a.submitted_at).getTime();
          const bTs = new Date(b.corrected_at || b.submitted_at).getTime();
          return bTs - aTs;
        });
      setPendingEssays(pendingItems);
      setCorrectedEssays(doneItems);
    } catch {
      toast.error('Não foi possível carregar as métricas de redações.');
    } finally {
      setMetricsLoading(false);
      setQueueLoading(false);
    }
  }, [org.slug]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await loadOverview();
    })();
    return () => {
      mounted = false;
    };
  }, [org.slug, loadOverview]);

  useEffect(() => {
    if (queueInitDone) return;
    if (metricsLoading) return;
    setQueueOpen(metrics.pending_count > 0);
    setQueueInitDone(true);
  }, [metrics.pending_count, metricsLoading, queueInitDone]);

  const pendingByStudent = useMemo(() => {
    const map = new Map<string, EssayListItem>();
    pendingEssays.forEach((essay) => {
      const current = map.get(essay.student.id);
      if (!current) {
        map.set(essay.student.id, essay);
        return;
      }
      const currDate = new Date(current.submitted_at).getTime();
      const nextDate = new Date(essay.submitted_at).getTime();
      if (nextDate > currDate) map.set(essay.student.id, essay);
    });
    return map;
  }, [pendingEssays]);

  const matchesSearch = useCallback((item: EssayListItem) => {
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    const blob = `${item.student.full_name || ''} ${item.student.email || ''} ${item.text || ''}`.toLowerCase();
    return blob.includes(query);
  }, [search]);

  const filteredPending = useMemo(() => {
    if (statusFilter !== 'all' && statusFilter !== 'pending') return [];
    return pendingEssays
      .filter(matchesSearch)
      .filter((item) => !studentFilterId || item.student.id === studentFilterId);
  }, [pendingEssays, statusFilter, matchesSearch, studentFilterId]);

  const filteredCorrected = useMemo(() => {
    const base = correctedEssays
      .filter(matchesSearch)
      .filter((item) => !studentFilterId || item.student.id === studentFilterId);
    if (statusFilter === 'corrected') return base.filter((i) => i.status === 'corrected');
    if (statusFilter === 'seen') return base.filter((i) => i.status === 'seen');
    if (statusFilter === 'pending') return [];
    return base;
  }, [correctedEssays, statusFilter, matchesSearch, studentFilterId]);

  async function handleArchive(item: EssayListItem) {
    if (item.status === 'pending') return;
    setArchivingId(item.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/essays/${item.id}/archive`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao arquivar redação.');
      }
      toast.success('Redação arquivada com sucesso.');
      await loadOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao arquivar redação.';
      toast.error(message);
    } finally {
      setArchivingId(null);
    }
  }

  async function handleDelete(item: EssayListItem) {
    const ok = window.confirm(`Excluir a redação de ${item.student.full_name || 'Aluno'}? Essa ação não pode ser desfeita.`);
    if (!ok) return;

    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/essays/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao excluir redação.');
      }
      toast.success('Redação excluída.');
      await loadOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir redação.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  const avgScoreLabel = metrics.avg_score !== null
    ? `${Math.round(metrics.avg_score)} / 1000`
    : '—';

  const rangeLabel = metrics.lowest_score !== null && metrics.highest_score !== null
    ? `${metrics.lowest_score} – ${metrics.highest_score}`
    : '—';

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas space-y-6 min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="edificar-page-frame space-y-6 p-3 md:p-4">
        <section
          className="relative space-y-4 overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm md:p-5 dark:border-slate-700"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 7%, white) 0%, rgba(255,255,255,0.96) 32%, rgba(255,255,255,0.98) 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 20%, #0f172a) 0%, color-mix(in srgb, var(--brand-secondary) 14%, #0f172a) 100%)' }}
          />
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-40"
            style={{ background: 'color-mix(in srgb, var(--brand-secondary) 38%, transparent)' }}
          />
          <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Redações</h1>
            {metrics.pending_count > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                {metrics.pending_count} pendente(s)
              </span>
            )}
          </div>

          <div className="space-y-4">
            <label className="group">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Buscar redações
              </span>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por aluno, email ou trecho da redação..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 group-hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </label>

            <div className="mt-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filtro por status
                </span>
              </span>
              <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 md:flex-wrap md:overflow-visible dark:border-slate-800 dark:bg-slate-950">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'pending', label: 'Pendentes' },
                  { value: 'corrected', label: 'Corrigidas' },
                  { value: 'seen', label: 'Arquivadas' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value as 'all' | 'pending' | 'corrected' | 'seen')}
                    className={cn(
                      'min-h-9 shrink-0 snap-start rounded-lg px-2.5 py-1 text-[11px] font-semibold transition',
                      statusFilter === opt.value
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {studentFilterId && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                Filtrando por aluno: {studentFilterName || 'Aluno'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStudentFilterId(null);
                  setStudentFilterName(null);
                }}
                className="min-h-9 rounded-md border border-emerald-300 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/40 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              >
                Limpar filtro
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Recebidas essa semana"
              value={metricsLoading ? '...' : metrics.received_week}
              icon={FileText}
            />
            <KpiCard
              label="Aguardando correção"
              value={metricsLoading ? '...' : metrics.pending_count}
              icon={Clock}
              badge={
                !metricsLoading && metrics.pending_count > 0 ? (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    urgente
                  </span>
                ) : undefined
              }
            />
            <KpiCard
              label="Nota média geral"
              value={metricsLoading ? '...' : avgScoreLabel}
              icon={TrendingUp}
            />
            <KpiCard
              label="Intervalo de notas"
              value={metricsLoading ? '...' : rangeLabel}
              icon={BarChart2}
            />
          </div>

          <div className="edificar-soft-surface rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Ranking dos alunos (Top 10)</h2>

            {metricsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800/70" />
                ))}
              </div>
            ) : metrics.ranking.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados de ranking ainda.</p>
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {metrics.ranking.map((row, idx) => {
                    const pendingForStudent = pendingByStudent.get(row.student_id);
                    return (
                      <article key={row.student_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">#{idx + 1}</span>
                            <Link
                              href={`/partners/${org.slug}/alunos/${row.student_id}`}
                              className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
                              title="Abrir perfil do aluno"
                            >
                              <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                            </Link>
                            <Link
                              href={`/partners/${org.slug}/alunos/${row.student_id}`}
                              className="text-sm font-medium text-slate-900 underline-offset-2 transition hover:text-[var(--brand-primary)] hover:underline dark:text-slate-100"
                              title="Abrir perfil do aluno"
                            >
                              {row.full_name || 'Aluno'}
                            </Link>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{Math.round(row.avg_score)} / 1000</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {pendingForStudent
                            ? `Enviada em ${formatDateBR(pendingForStudent.submitted_at)} (pendente)`
                            : `Corrigida em ${formatDateBR(row.last_essay_at)}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentFilterId(row.student_id);
                            setStudentFilterName(row.full_name || 'Aluno');
                            setQueueOpen(true);
                            setCorrectedOpen(true);
                            queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-400/60 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                        >
                          Visualizar redações do aluno
                        </button>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-2">Pos.</th>
                      <th className="py-2 pr-2">Aluno</th>
                      <th className="py-2 pr-2">Média</th>
                      <th className="py-2 pr-2">Última redação</th>
                      <th className="py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ranking.map((row, idx) => {
                      const pendingForStudent = pendingByStudent.get(row.student_id);
                      return (
                        <tr key={row.student_id} className="border-t border-slate-200 dark:border-slate-800/70 text-slate-700 dark:text-slate-200">
                          <td className="py-2 pr-2 font-semibold text-slate-600 dark:text-slate-300">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/partners/${org.slug}/alunos/${row.student_id}`}
                                className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
                                title="Abrir perfil do aluno"
                              >
                                <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                              </Link>
                              <Link
                                href={`/partners/${org.slug}/alunos/${row.student_id}`}
                                className="font-medium underline-offset-2 transition hover:text-[var(--brand-primary)] hover:underline"
                                title="Abrir perfil do aluno"
                              >
                                {row.full_name || 'Aluno'}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2 pr-2 font-semibold">{Math.round(row.avg_score)} / 1000</td>
                          <td className="py-2 pr-2 text-slate-600 dark:text-slate-300">
                            {pendingForStudent
                              ? `Enviada em ${formatDateBR(pendingForStudent.submitted_at)} (pendente)`
                              : `Corrigida em ${formatDateBR(row.last_essay_at)}`}
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setStudentFilterId(row.student_id);
                                setStudentFilterName(row.full_name || 'Aluno');
                                setQueueOpen(true);
                                setCorrectedOpen(true);
                                queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className="inline-flex items-center rounded-lg border border-emerald-400/60 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                            >
                              Visualizar redações do aluno
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          </div>{/* end relative z-10 */}
        </section>

        <section ref={queueSectionRef} className="edificar-major-surface space-y-3 rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Redações a Corrigir</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  metrics.pending_count > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                )}
              >
                {metrics.pending_count}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen((v) => !v)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {queueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {queueOpen ? 'Ocultar fila' : 'Mostrar fila'}
            </button>
          </div>

          {queueOpen && (
            <>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((k) => (
                    <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
                  ))}
                </div>
              ) : filteredPending.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-950">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Nenhuma redação pendente para os filtros atuais.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPending.map((item) => (
                    <EssayQueueCard
                      key={item.id}
                      slug={org.slug}
                      item={item}
                      mode="pending"
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                      archiving={archivingId === item.id}
                      deleting={deletingId === item.id}
                      allowManageActions={!isAssociate}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setCorrectedOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <span>Redações já corrigidas</span>
            {correctedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {correctedOpen && (
            <>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((k) => (
                    <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
                  ))}
                </div>
              ) : filteredCorrected.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Ainda não há redações corrigidas.</p>
              ) : (
                <div className="space-y-3">
                  {filteredCorrected.map((item) => (
                    <EssayQueueCard
                      key={item.id}
                      slug={org.slug}
                      item={item}
                      mode="corrected"
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                      archiving={archivingId === item.id}
                      deleting={deletingId === item.id}
                      allowManageActions={!isAssociate}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
        </div>
      </div>
    </PartnerLayout>
  );
}
