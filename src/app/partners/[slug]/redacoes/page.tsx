'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-lg bg-white/10 p-2">
          <Icon className="h-4 w-4 text-white/85" />
        </div>
        {badge}
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</p>
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
}: {
  slug: string;
  item: EssayListItem;
  mode: 'pending' | 'corrected';
  onArchive: (essay: EssayListItem) => void;
  onDelete: (essay: EssayListItem) => void;
  archiving: boolean;
  deleting: boolean;
}) {
  const preview = item.text?.length > 100 ? `${item.text.slice(0, 100)}...` : (item.text || '');

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <StudentAvatar name={item.student.full_name} avatarUrl={item.student.avatar_url} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {item.student.full_name || 'Aluno'}
              </p>
              <p className="truncate text-xs text-slate-400">{item.student.email || '-'}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Enviada {relativeTimeFromNow(item.submitted_at)}
          </p>
          <p className="text-sm leading-relaxed text-slate-300">{preview}</p>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'corrected' && item.total_score !== null && (
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-300">
              {item.total_score}/1000
            </span>
          )}
          <Link
            href={`/partners/${slug}/redacoes/${item.id}`}
            className={cn(
              'inline-flex items-center rounded-xl border px-3 py-2 text-sm font-semibold transition',
              mode === 'pending'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500',
            )}
          >
            {mode === 'pending' ? 'Corrigir' : 'Visualizar correção'}
          </Link>
          <button
            type="button"
            disabled={archiving || mode === 'pending'}
            onClick={() => onArchive(item)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            title={mode === 'pending' ? 'Somente redações corrigidas podem ser arquivadas' : 'Arquivar redação'}
          >
            <Archive className="h-3.5 w-3.5" />
            Arquivar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(item)}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PartnerRedacoesPage() {
  const { org } = useOrg();

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

  async function getAccessToken(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  const fetchMetrics = useCallback(async (token?: string) => {
    const accessToken = token || await getAccessToken();
    if (!accessToken) return;
    setMetricsLoading(true);
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/essays/metrics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      const data: EssaysMetrics = await res.json();
      setMetrics(data);
    } catch {
      toast.error('Não foi possível carregar as métricas de redações.');
    } finally {
      setMetricsLoading(false);
    }
  }, [org.slug]);

  const fetchQueue = useCallback(async (token?: string) => {
    const accessToken = token || await getAccessToken();
    if (!accessToken) return;
    setQueueLoading(true);
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch(`${api}/api/partners/${org.slug}/essays?status=pending&page=1&limit=200`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${api}/api/partners/${org.slug}/essays?status=all&page=1&limit=300`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const pendingPayload = pendingRes.ok ? await pendingRes.json() : { items: [] };
      const allPayload = allRes.ok ? await allRes.json() : { items: [] };

      const pendingItems: EssayListItem[] = (pendingPayload.items || [])
        .sort((a: EssayListItem, b: EssayListItem) => {
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        });

      const doneItems: EssayListItem[] = (allPayload.items || [])
        .filter((item: EssayListItem) => item.status === 'corrected' || item.status === 'seen')
        .sort((a: EssayListItem, b: EssayListItem) => {
          const aTs = new Date(a.corrected_at || a.submitted_at).getTime();
          const bTs = new Date(b.corrected_at || b.submitted_at).getTime();
          return bTs - aTs;
        });

      setPendingEssays(pendingItems);
      setCorrectedEssays(doneItems);
    } finally {
      setQueueLoading(false);
    }
  }, [org.slug]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const token = await getAccessToken();
      if (!token || !mounted) return;
      await Promise.all([fetchMetrics(token), fetchQueue(token)]);
    })();
    return () => {
      mounted = false;
    };
  }, [org.slug, fetchMetrics, fetchQueue]);

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
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/partners/${org.slug}/essays/${item.id}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao arquivar redação.');
      }
      toast.success('Redação arquivada com sucesso.');
      await Promise.all([fetchMetrics(accessToken), fetchQueue(accessToken)]);
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
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/partners/${org.slug}/essays/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao excluir redação.');
      }
      toast.success('Redação excluída.');
      await Promise.all([fetchMetrics(accessToken), fetchQueue(accessToken)]);
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
      <div className="space-y-6 min-h-full bg-slate-950 -mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 pt-4 md:px-8 md:pt-8 pb-8">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur md:p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-white">Redações</h1>
            {metrics.pending_count > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                {metrics.pending_count} pendente(s)
              </span>
            )}
          </div>

          <div className="space-y-4">
            <label className="group">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Buscar redações
              </span>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por aluno, email ou trecho da redação..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 group-hover:border-slate-500"
                />
              </div>
            </label>

            <div className="mt-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filtro por status
                </span>
              </span>
              <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
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
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      statusFilter === opt.value
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {studentFilterId && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <span className="text-xs font-semibold text-emerald-200">
                Filtrando por aluno: {studentFilterName || 'Aluno'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStudentFilterId(null);
                  setStudentFilterName(null);
                }}
                className="rounded-md border border-emerald-400/40 px-2 py-0.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
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

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">Ranking dos alunos (Top 10)</h2>

            {metricsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="h-10 animate-pulse rounded-lg bg-slate-800/70" />
                ))}
              </div>
            ) : metrics.ranking.length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados de ranking ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
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
                        <tr key={row.student_id} className="border-t border-slate-800/70 text-slate-200">
                          <td className="py-2 pr-2 font-semibold text-slate-300">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2">
                              <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                              <span className="font-medium">{row.full_name || 'Aluno'}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-2 font-semibold">{Math.round(row.avg_score)} / 1000</td>
                          <td className="py-2 pr-2 text-slate-300">
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
                              className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
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
            )}
          </div>
        </section>

        <section ref={queueSectionRef} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Redações a Corrigir</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  metrics.pending_count > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-200',
                )}
              >
                {metrics.pending_count}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
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
                    <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-800/70" />
                  ))}
                </div>
              ) : filteredPending.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                  <p className="font-semibold text-slate-100">Nenhuma redação pendente para os filtros atuais.</p>
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
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            type="button"
            onClick={() => setCorrectedOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            <span>Redações já corrigidas</span>
            {correctedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {correctedOpen && (
            <>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((k) => (
                    <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-800/70" />
                  ))}
                </div>
              ) : filteredCorrected.length === 0 ? (
                <p className="text-sm text-slate-400">Ainda não há redações corrigidas.</p>
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
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </PartnerLayout>
  );
}
