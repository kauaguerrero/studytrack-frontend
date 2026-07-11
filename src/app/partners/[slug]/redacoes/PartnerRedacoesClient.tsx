'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, KpiCard, SectionTitle,
  BrandPill, BrandButton, Segmented, Medal, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';
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
  Upload,
  Link as LinkIcon,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  essay_type?: string | null;
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

interface CompetencyScore {
  competency: number;
  avg: number | null;
  count: number;
}

interface SupportItem {
  type: 'text' | 'image' | 'link';
  content: string;
  label?: string;
}

interface EssayPrompt {
  id: string;
  title: string;
  description: string | null;
  support_items: SupportItem[];
  is_active: boolean;
  created_at: string;
  essay_type?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

interface EssaysMetrics {
  received_week: number;
  pending_count: number;
  avg_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  ranking: RankingItem[];
  competency_scores: CompetencyScore[];
  weakest_competency: { competency: number; avg: number } | null;
  avg_correction_days: number | null;
  improvement_rate: number | null;
}

type EssaysOverviewPayload = {
  essay_type_filter?: string;
  metrics: EssaysMetrics;
  pending_items: EssayListItem[];
  corrected_items: EssayListItem[];
  pagination?: {
    pending?: { page?: number; limit?: number; total?: number; total_pages?: number };
    corrected?: { page?: number; limit?: number; total?: number; total_pages?: number };
  };
};

export type { EssaysOverviewPayload };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_METRICS: EssaysMetrics = {
  received_week: 0,
  pending_count: 0,
  avg_score: null,
  highest_score: null,
  lowest_score: null,
  ranking: [],
  competency_scores: [],
  weakest_competency: null,
  avg_correction_days: null,
  improvement_rate: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isoToLocalInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffsetMinutes * 60_000);
  return localDate.toISOString().slice(0, 16);
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
  loading,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (next: number) => void;
  loading?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-white/5">
      <span className="font-semibold text-slate-500 dark:text-white/50">
        Página {page} de {totalPages} • {totalItems} redação(ões)
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="min-h-9 rounded-lg bg-white px-2.5 py-1 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-white/70 dark:hover:bg-slate-800"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="min-h-9 rounded-lg bg-white px-2.5 py-1 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-white/70 dark:hover:bg-slate-800"
        >
          Próxima
        </button>
      </div>
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
    <article className="partner-elevated-card partner-elevated-card-hover rounded-2xl bg-white p-4 dark:bg-slate-900">
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
                className="truncate text-sm font-bold text-slate-900 underline-offset-2 transition hover:underline dark:text-white"
                title="Abrir perfil do aluno"
              >
                {item.student.full_name || 'Aluno'}
              </Link>
              <p className="truncate text-xs text-slate-400 dark:text-white/40">{item.student.email || '-'}</p>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-400 dark:text-white/35">
            Enviada {relativeTimeFromNow(item.submitted_at)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-slate-600 break-words [overflow-wrap:anywhere] dark:text-white/70">
              <span className="font-bold text-slate-800 dark:text-white/90">Tema:</span> {essayTheme || 'Não informado'}
            </p>
            {item.essay_type && item.essay_type !== 'enem' && (
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-white/50">
                {ESSAY_TYPE_CONFIGS[(item.essay_type as EssayType)]?.label ?? item.essay_type.toUpperCase()}
              </span>
            )}
          </div>
          {credit && (
            <p className="text-xs text-slate-400 dark:text-white/35">
              Plano: {normalizePlanLabel(credit.plan_name)} • {
                credit.limit && credit.limit > 0
                  ? `Créditos: ${credit.remaining ?? 0} disponíveis de ${credit.limit} por ${credit.period === 'week' ? 'semana' : 'mês'}${typeof credit.used === 'number' ? ` (${credit.used} usados)` : ''}`
                  : 'Créditos: ilimitados'
              }
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-500 break-words [overflow-wrap:anywhere] dark:text-white/60">{preview}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {mode === 'corrected' && item.total_score !== null && (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-black tabular-nums text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {item.total_score}/{ESSAY_TYPE_CONFIGS[(item.essay_type as EssayType) ?? 'enem']?.total_max ?? 1000}
            </span>
          )}
          <Link
            href={`/partners/${slug}/redacoes/${item.id}`}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition sm:flex-none',
              mode === 'pending'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15',
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
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-200 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                title={mode === 'pending' ? 'Somente redações corrigidas podem ser arquivadas' : 'Arquivar redação'}
              >
                <Archive className="h-3.5 w-3.5" />
                Arquivar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete(item)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface PartnerRedacoesClientProps {
  slug: string;
  initialOverview: EssaysOverviewPayload | null;
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function PartnerRedacoesClient({ slug, initialOverview }: PartnerRedacoesClientProps) {
  const { org, userProfile } = useOrg();
  const isAssociate = userProfile.role === 'associate' || userProfile.role === 'teacher';
  const canManagePrompts = userProfile.role === 'founder' || userProfile.role === 'admin';

  const [metrics, setMetrics] = useState<EssaysMetrics>(initialOverview?.metrics || DEFAULT_METRICS);
  const [pendingEssays, setPendingEssays] = useState<EssayListItem[]>(initialOverview?.pending_items || []);
  const [correctedEssays, setCorrectedEssays] = useState<EssayListItem[]>(initialOverview?.corrected_items || []);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(
    initialOverview?.pagination?.pending?.total_pages || 1,
  );
  const [pendingTotalItems, setPendingTotalItems] = useState(
    initialOverview?.pagination?.pending?.total || 0,
  );
  const [correctedPage, setCorrectedPage] = useState(1);
  const [correctedTotalPages, setCorrectedTotalPages] = useState(
    initialOverview?.pagination?.corrected?.total_pages || 1,
  );
  const [correctedTotalItems, setCorrectedTotalItems] = useState(
    initialOverview?.pagination?.corrected?.total || 0,
  );

  const [metricsLoading, setMetricsLoading] = useState(initialOverview === null);
  const [queueLoading, setQueueLoading] = useState(initialOverview === null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<EssayType>('enem');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'corrected' | 'seen'>('all');
  const [studentFilterId, setStudentFilterId] = useState<string | null>(null);
  const [studentFilterName, setStudentFilterName] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(() =>
    (initialOverview?.pagination?.pending?.total || 0) > 0,
  );
  const [correctedOpen, setCorrectedOpen] = useState(false);
  const [prompts, setPrompts] = useState<EssayPrompt[]>([]);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [promptForm, setPromptForm] = useState<{
    title: string;
    description: string;
    support_items: SupportItem[];
    essay_type: string;
    starts_at: string;
    ends_at: string;
  } | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<Map<number, 'url' | 'upload'>>(new Map());
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const queueSectionRef = useRef<HTMLDivElement | null>(null);

  const [queueInitDone, setQueueInitDone] = useState(initialOverview !== null);
  const activeConfig = ESSAY_TYPE_CONFIGS[activeTypeFilter];
  const competencyNames = activeConfig.competencies;
  const getCompetencyMax = (idx: number): number => {
    const options = activeConfig.score_options[idx] || [];
    const max = options.length ? Math.max(...options) : 200;
    return Number.isFinite(max) ? max : 200;
  };

  const loadOverview = useCallback(async () => {
    setMetricsLoading(true);
    setQueueLoading(true);
    try {
      const params = new URLSearchParams({
        pending_page: String(pendingPage),
        pending_limit: '10',
        corrected_page: String(correctedPage),
        corrected_limit: '10',
      });
      params.set('essay_type', activeTypeFilter);
      const res = await fetch(`/api/partners/${slug}/essays/overview?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string; details?: string } | null;
        throw new Error(payload?.error || 'Não foi possível carregar as métricas de redações.');
      }
      const data: EssaysOverviewPayload = await res.json();
      setMetrics(data.metrics || DEFAULT_METRICS);
      setPendingEssays(data.pending_items || []);
      setCorrectedEssays(data.corrected_items || []);
      const pendingMeta = data.pagination?.pending;
      const correctedMeta = data.pagination?.corrected;
      setPendingTotalPages(Math.max(1, Number(pendingMeta?.total_pages || 1)));
      setPendingTotalItems(Math.max(0, Number(pendingMeta?.total || 0)));
      setCorrectedTotalPages(Math.max(1, Number(correctedMeta?.total_pages || 1)));
      setCorrectedTotalItems(Math.max(0, Number(correctedMeta?.total || 0)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar as métricas de redações.';
      toast.error(message);
    } finally {
      setMetricsLoading(false);
      setQueueLoading(false);
    }
  }, [slug, pendingPage, correctedPage, activeTypeFilter]);

  // Reset pagination when slug changes
  useEffect(() => {
    setPendingPage(1);
    setCorrectedPage(1);
    setQueueInitDone(false);
  }, [slug]);

  const isFirstMount = useRef(true);

  // Skip first fetch if server pre-loaded data; fire on pagination/slug changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const initialFilter = initialOverview?.essay_type_filter;
      if (initialOverview !== null && initialFilter === activeTypeFilter) {
        return;
      }
    }

    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await loadOverview();
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, loadOverview, initialOverview, activeTypeFilter]);

  useEffect(() => {
    if (queueInitDone) return;
    if (metricsLoading) return;
    setQueueOpen(pendingTotalItems > 0);
    setQueueInitDone(true);
  }, [pendingTotalItems, metricsLoading, queueInitDone]);

  useEffect(() => {
    if (pendingPage > pendingTotalPages) setPendingPage(pendingTotalPages);
  }, [pendingPage, pendingTotalPages]);

  useEffect(() => {
    if (correctedPage > correctedTotalPages) setCorrectedPage(correctedTotalPages);
  }, [correctedPage, correctedTotalPages]);

  useEffect(() => {
    if (!canManagePrompts) return;
    fetch(`/api/partners/${slug}/essay-prompts`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setPrompts(data.prompts ?? []); })
      .catch(() => {});
  }, [slug, canManagePrompts]);

  const pendingByStudent = useMemo(() => {
    const map = new Map<string, EssayListItem>();
    pendingEssays.forEach((essay) => {
      const current = map.get(essay.student.id);
      if (!current) { map.set(essay.student.id, essay); return; }
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

  const weakestCompetency = useMemo(() => {
    const scored = metrics.competency_scores
      .filter((c) => c.avg !== null)
      .map((c) => {
        const compMax = getCompetencyMax(c.competency - 1);
        return {
          competency: c.competency,
          avg: c.avg as number,
          compMax,
          ratio: compMax > 0 ? (c.avg as number) / compMax : 1,
        };
      });

    if (scored.length === 0) return null;
    return scored.reduce((min, cur) => (cur.ratio < min.ratio ? cur : min));
  }, [metrics.competency_scores, activeTypeFilter]);

  async function handleArchive(item: EssayListItem) {
    if (item.status === 'pending') return;
    setArchivingId(item.id);
    try {
      const res = await fetch(`/api/partners/${slug}/essays/${item.id}/archive`, { method: 'PATCH' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao arquivar redação.');
      }
      toast.success('Redação arquivada com sucesso.');
      await loadOverview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao arquivar redação.');
    } finally {
      setArchivingId(null);
    }
  }

  async function handleDelete(item: EssayListItem) {
    const ok = window.confirm(`Excluir a redação de ${item.student.full_name || 'Aluno'}? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/partners/${slug}/essays/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao excluir redação.');
      }
      toast.success('Redação excluída.');
      await loadOverview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir redação.');
    } finally {
      setDeletingId(null);
    }
  }

  async function savePrompt() {
    if (!promptForm || !promptForm.title.trim()) return;
    setSavingPrompt(true);
    try {
      const url = editingPromptId
        ? `/api/partners/${slug}/essay-prompts/${editingPromptId}`
        : `/api/partners/${slug}/essay-prompts`;
      const method = editingPromptId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promptForm,
          essay_type: promptForm.essay_type || 'enem',
          starts_at: promptForm.starts_at ? new Date(promptForm.starts_at).toISOString() : null,
          ends_at: promptForm.ends_at ? new Date(promptForm.ends_at).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao salvar');
        return;
      }
      const updated = editingPromptId
        ? prompts.map((p) => p.id === editingPromptId ? json.prompt : p)
        : [json.prompt, ...prompts];
      setPrompts(updated);
      setPromptForm(null);
      setEditingPromptId(null);
      toast.success(editingPromptId ? 'Coletânea atualizada' : 'Coletânea criada');
    } finally {
      setSavingPrompt(false);
    }
  }

  async function togglePromptActive(prompt: EssayPrompt) {
    const res = await fetch(`/api/partners/${slug}/essay-prompts/${prompt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !prompt.is_active }),
    });
    if (res.ok) {
      setPrompts((prev) => prev.map((p) =>
        p.id === prompt.id ? { ...p, is_active: !p.is_active } : p
      ));
    }
  }

  function addSupportItem(type: SupportItem['type']) {
    setPromptForm((f) => f ? {
      ...f,
      support_items: [...f.support_items, { type, content: '', label: '' }],
    } : f);
  }

  async function resizeImageFile(file: File, maxPx = 1920, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = w > maxPx || h > maxPx ? maxPx / Math.max(w, h) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name, { type: outType }));
          },
          outType,
          quality,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')); };
      img.src = url;
    });
  }

  async function handleImageUpload(index: number, file: File) {
    setUploadingIndex(index);
    try {
      const resized = await resizeImageFile(file);
      const fd = new FormData();
      fd.append('file', resized);
      const res = await fetch(`/api/partners/${slug}/essay-prompts/upload-image`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha no upload da imagem');
        return;
      }
      setPromptForm((f) => {
        if (!f) return f;
        const items = [...f.support_items];
        items[index] = { ...items[index], content: json.url };
        return { ...f, support_items: items };
      });
      toast.success('Imagem enviada com sucesso');
    } catch {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingIndex(null);
    }
  }

  const totalMax = activeConfig?.total_max ?? 1000;
  const avgScoreLabel = metrics.avg_score !== null
    ? `${Math.round(metrics.avg_score)} / ${totalMax}`
    : '—';

  const rangeLabel = metrics.lowest_score !== null && metrics.highest_score !== null
    ? `${metrics.lowest_score} – ${metrics.highest_score} (máx ${totalMax})`
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
            {pendingTotalItems > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                {pendingTotalItems} {pendingTotalItems === 1 ? 'pendente' : 'pendentes'}
              </span>
            )}
          </div>

          {canManagePrompts && (
            <div className="overflow-hidden rounded-2xl border border-[var(--brand-primary)]/30 bg-white/90 shadow-md ring-1 ring-[var(--brand-primary)]/10 dark:border-[var(--brand-primary)]/35 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setPromptsOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--brand-primary)]/5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      Gestão de Coletâneas de Redação
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Crie e gerencie temas com materiais de apoio
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">
                    {prompts.filter((p) => p.is_active).length} ativas
                  </span>
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200"
                  style={{ transform: promptsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              <div
                className="transition-all duration-300 ease-in-out"
                style={{ display: promptsOpen ? 'block' : 'none' }}
              >
                <div className="space-y-3 border-t border-[var(--brand-primary)]/15 bg-white/80 p-4 dark:bg-slate-900/60">
                  {prompts.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Nenhuma coletânea criada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {prompts.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                            p.is_active
                              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {p.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {ESSAY_TYPE_CONFIGS[(p.essay_type as EssayType) || 'enem']?.label ?? 'ENEM'}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {p.support_items.length} item(s) de apoio ·{' '}
                                {p.is_active ? 'Ativa' : 'Inativa'}
                              </span>
                              {(p.starts_at || p.ends_at) && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  {p.starts_at && (
                                    <span>Início: {formatDateTimeBR(p.starts_at)}</span>
                                  )}
                                  {p.ends_at && (
                                    <span>· Prazo: {formatDateTimeBR(p.ends_at)}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPromptId(p.id);
                                setPromptForm({
                                  title: p.title,
                                  description: p.description ?? '',
                                  support_items: p.support_items,
                                  essay_type: p.essay_type || 'enem',
                                  starts_at: isoToLocalInputValue(p.starts_at),
                                  ends_at: isoToLocalInputValue(p.ends_at),
                                });
                                setImageUploadMode(new Map());
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePromptActive(p)}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                p.is_active
                                  ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-300 hover:text-red-500'
                                  : 'border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                              }`}
                            >
                              {p.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {promptForm !== null ? (
                    <div className="rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>
                        {editingPromptId ? 'Editar coletânea' : 'Nova coletânea'}
                      </p>
                      <input
                        value={promptForm.title}
                        onChange={(e) => setPromptForm((f) => f ? { ...f, title: e.target.value } : f)}
                        placeholder="Título do tema (ex: Mobilidade Urbana no Brasil)"
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                      />

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Tipo de redação
                        </p>
                        <div className="flex gap-2">
                          {(Object.entries(ESSAY_TYPE_CONFIGS) as [EssayType, typeof ESSAY_TYPE_CONFIGS[EssayType]][]).map(([key, cfg]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPromptForm((f) => f ? { ...f, essay_type: key } : f)}
                              className={cn(
                                'flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                                promptForm.essay_type === key
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)]',
                              )}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={promptForm.description}
                        onChange={(e) => setPromptForm((f) => f ? { ...f, description: e.target.value } : f)}
                        placeholder="Descrição ou orientação para os alunos (opcional)"
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)] resize-none"
                      />

                      {/* Agendamento — início e prazo */}
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Agendamento (opcional)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Início das entregas
                            </label>
                            <input
                              type="datetime-local"
                              value={promptForm.starts_at}
                              onChange={(e) => setPromptForm((f) => f ? { ...f, starts_at: e.target.value } : f)}
                              className="h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                            />
                            <p className="mt-1 text-[10px] text-slate-400">
                              Alunos só poderão enviar a partir deste horário.
                            </p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Prazo final de entrega
                            </label>
                            <input
                              type="datetime-local"
                              value={promptForm.ends_at}
                              onChange={(e) => setPromptForm((f) => f ? { ...f, ends_at: e.target.value } : f)}
                              min={promptForm.starts_at || undefined}
                              className="h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                            />
                            <p className="mt-1 text-[10px] text-slate-400">
                              Após este prazo, a coletânea fecha automaticamente.
                            </p>
                          </div>
                        </div>
                        {promptForm.starts_at && promptForm.ends_at && new Date(promptForm.ends_at) <= new Date(promptForm.starts_at) && (
                          <p className="text-[11px] font-semibold text-red-500">
                            O prazo final deve ser após o início.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Textos de apoio</p>
                        {promptForm.support_items.map((item, i) => {
                          const imgMode = imageUploadMode.get(i) ?? 'url';
                          return (
                          <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                {item.type === 'text' ? 'Texto' : item.type === 'image' ? 'Imagem' : 'Link'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPromptForm((f) => f ? {
                                  ...f,
                                  support_items: f.support_items.filter((_, j) => j !== i),
                                } : f)}
                                className="text-[10px] text-red-500 hover:text-red-700"
                              >
                                Remover
                              </button>
                            </div>
                            <input
                              value={item.label ?? ''}
                              onChange={(e) => setPromptForm((f) => {
                                if (!f) return f;
                                const items = [...f.support_items];
                                items[i] = { ...items[i], label: e.target.value };
                                return { ...f, support_items: items };
                              })}
                              placeholder="Rótulo (ex: Texto I)"
                              className="h-8 w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs outline-none"
                            />
                            {item.type === 'text' ? (
                              <textarea
                                value={item.content}
                                onChange={(e) => setPromptForm((f) => {
                                  if (!f) return f;
                                  const items = [...f.support_items];
                                  items[i] = { ...items[i], content: e.target.value };
                                  return { ...f, support_items: items };
                                })}
                                placeholder="Conteúdo do texto de apoio..."
                                rows={3}
                                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs outline-none resize-none"
                              />
                            ) : item.type === 'image' ? (
                              <div className="space-y-2">
                                {/* Toggle URL / Upload */}
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setImageUploadMode((m) => { const n = new Map(m); n.set(i, 'url'); return n; })}
                                    className={cn(
                                      'flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition',
                                      imgMode === 'url'
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400',
                                    )}
                                  >
                                    <LinkIcon className="h-2.5 w-2.5" /> URL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setImageUploadMode((m) => { const n = new Map(m); n.set(i, 'upload'); return n; })}
                                    className={cn(
                                      'flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition',
                                      imgMode === 'upload'
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400',
                                    )}
                                  >
                                    <Upload className="h-2.5 w-2.5" /> Upload
                                  </button>
                                </div>

                                {imgMode === 'url' ? (
                                  <input
                                    value={item.content}
                                    onChange={(e) => setPromptForm((f) => {
                                      if (!f) return f;
                                      const items = [...f.support_items];
                                      items[i] = { ...items[i], content: e.target.value };
                                      return { ...f, support_items: items };
                                    })}
                                    placeholder="URL da imagem (https://...)"
                                    className="h-8 w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs outline-none"
                                  />
                                ) : (
                                  <label className={cn(
                                    'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 text-center transition',
                                    uploadingIndex === i
                                      ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5'
                                      : 'border-slate-300 dark:border-slate-700 hover:border-[var(--brand-primary)]/50 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                                  )}>
                                    {uploadingIndex === i ? (
                                      <span className="text-[11px] text-[var(--brand-primary)] animate-pulse">Enviando...</span>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 text-slate-400" />
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                          Clique para selecionar
                                        </span>
                                        <span className="text-[10px] text-slate-400">JPG, PNG, WebP ou GIF • máx 10 MB</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      className="sr-only"
                                      disabled={uploadingIndex !== null}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void handleImageUpload(i, file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}

                                {/* Preview da imagem se tiver URL */}
                                {item.content && (
                                  <div className="relative mt-1 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-800">
                                      <Image
                                        src={item.content}
                                        alt="Preview"
                                        fill
                                        className="object-contain"
                                        onError={() => {}}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPromptForm((f) => {
                                        if (!f) return f;
                                        const items = [...f.support_items];
                                        items[i] = { ...items[i], content: '' };
                                        return { ...f, support_items: items };
                                      })}
                                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                                      title="Remover imagem"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                value={item.content}
                                onChange={(e) => setPromptForm((f) => {
                                  if (!f) return f;
                                  const items = [...f.support_items];
                                  items[i] = { ...items[i], content: e.target.value };
                                  return { ...f, support_items: items };
                                })}
                                placeholder="URL do link"
                                className="h-8 w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs outline-none"
                              />
                            )}
                          </div>
                          );
                        })}
                        <div className="flex gap-2">
                          {(['text', 'image', 'link'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => addSupportItem(type)}
                              className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                            >
                              + {type === 'text' ? 'Texto' : type === 'image' ? 'Imagem' : 'Link'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={savePrompt}
                          disabled={savingPrompt}
                          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          {savingPrompt ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPromptForm(null); setEditingPromptId(null); setImageUploadMode(new Map()); }}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setPromptForm({ title: '', description: '', support_items: [], essay_type: 'enem', starts_at: '', ends_at: '' }); setImageUploadMode(new Map()); }}
                      className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600 py-2.5 text-sm font-semibold text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                    >
                      + Nova coletânea
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seletor de tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Métricas por tipo:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(ESSAY_TYPE_CONFIGS) as [EssayType, typeof ESSAY_TYPE_CONFIGS[EssayType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTypeFilter(key)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTypeFilter === key
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[var(--brand-primary)]/40'
                  }`}
                >
                  {cfg.label}
                  <span className="ml-1 font-normal opacity-60">/ {cfg.total_max}</span>
                </button>
              ))}
            </div>
            {metricsLoading && (
              <span className="text-[11px] text-slate-400 animate-pulse">Carregando...</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              title="Recebidas esta semana"
              value={metricsLoading ? '...' : metrics.received_week}
              icon={FileText}
              accentColor="var(--brand-primary)"
              accentHex={org.brand_primary}
              loading={metricsLoading}
            />
            <KpiCard
              title="Aguardando correção"
              value={metricsLoading ? '...' : pendingTotalItems}
              subtitle={!metricsLoading && pendingTotalItems > 0 ? 'Urgente' : undefined}
              icon={Clock}
              accentColor="var(--brand-secondary)"
              accentHex={org.brand_secondary}
              loading={metricsLoading}
            />
            <KpiCard
              title="Nota média geral"
              value={metricsLoading ? '...' : avgScoreLabel}
              icon={TrendingUp}
              accentColor="var(--brand-accent)"
              accentHex={org.brand_accent}
              loading={metricsLoading}
            />
            <KpiCard
              title="Intervalo de notas"
              value={metricsLoading ? '...' : rangeLabel}
              icon={BarChart2}
              accentColor="#8b5cf6"
              accentHex="#8b5cf6"
              loading={metricsLoading}
            />
          </div>

          {/* ── Métricas expandidas ─────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-3">

            {/* Tempo médio de correção */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tempo médio de correção
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {metricsLoading
                  ? '...'
                  : metrics.avg_correction_days === null
                    ? '—'
                    : metrics.avg_correction_days === 0
                      ? '< 1 dia'
                      : metrics.avg_correction_days === 1
                        ? '1 dia'
                        : `${metrics.avg_correction_days} dias`}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Entre envio e correção
              </p>
            </div>

            {/* Taxa de melhoria */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Taxa de melhoria
              </p>
              <p className={`mt-2 text-2xl font-extrabold ${
                !metricsLoading && metrics.improvement_rate !== null
                  ? metrics.improvement_rate >= 60
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : metrics.improvement_rate >= 40
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {metricsLoading
                  ? '...'
                  : metrics.improvement_rate === null
                    ? '—'
                    : `${metrics.improvement_rate}%`}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Alunos que melhoraram a nota
              </p>
            </div>

            {/* Competência mais fraca */}
            {!metricsLoading && weakestCompetency && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Foco pedagógico
                </p>
                <p className="mt-2 text-base font-extrabold text-amber-900 dark:text-amber-200">
                  C{weakestCompetency.competency} — {competencyNames[weakestCompetency.competency - 1] ?? `Critério ${weakestCompetency.competency}`}
                </p>
                <p className="mt-0.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                  Média: {weakestCompetency.avg} / {weakestCompetency.compMax}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                  Competência com menor desempenho da turma
                </p>
              </div>
            )}
          </div>

          {/* ── Desempenho por competência ──────────────────────────── */}
          {!metricsLoading && metrics.competency_scores.some((c) => c.avg !== null) && (
            <div className="edificar-soft-surface rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Desempenho da turma por competência
              </h2>
              <div className="space-y-2.5">
                {metrics.competency_scores.map((c) => {
                  const compMax = getCompetencyMax(c.competency - 1);
                  const pct = c.avg !== null ? Math.round((c.avg / compMax) * 100) : 0;
                  const isWeakest = weakestCompetency?.competency === c.competency;
                  const barColor = pct >= 70
                    ? '#16a34a'
                    : pct >= 50
                      ? '#d97706'
                      : '#dc2626';
                  return (
                    <div key={c.competency} className="flex items-center gap-3">
                      <span className={`w-5 shrink-0 text-xs font-black ${
                        isWeakest ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        C{c.competency}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                            {competencyNames[c.competency - 1] ?? `Critério ${c.competency}`}
                          </p>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                            {c.avg !== null ? `${c.avg}/${compMax}` : '—'}
                          </span>
                        </div>
                        <div className={`h-2 overflow-hidden rounded-full ${
                          isWeakest ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: c.avg !== null ? `${pct}%` : '0%',
                              backgroundColor: isWeakest ? '#f59e0b' : barColor,
                            }}
                          />
                        </div>
                      </div>
                      {c.count > 0 && (
                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                          {c.count} aval.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                Baseado nas redações corrigidas com score por competência
              </p>
            </div>
          )}

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
                              href={`/partners/${slug}/alunos/${row.student_id}`}
                              className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
                              title="Abrir perfil do aluno"
                            >
                              <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                            </Link>
                            <Link
                              href={`/partners/${slug}/alunos/${row.student_id}`}
                              className="text-sm font-medium text-slate-900 underline-offset-2 transition hover:text-[var(--brand-primary)] hover:underline dark:text-slate-100"
                              title="Abrir perfil do aluno"
                            >
                              {row.full_name || 'Aluno'}
                            </Link>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {activeConfig ? `${Math.round(row.avg_score)} / ${activeConfig.total_max}` : Math.round(row.avg_score)}
                          </span>
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
                                href={`/partners/${slug}/alunos/${row.student_id}`}
                                className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
                                title="Abrir perfil do aluno"
                              >
                                <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                              </Link>
                              <Link
                                href={`/partners/${slug}/alunos/${row.student_id}`}
                                className="font-medium underline-offset-2 transition hover:text-[var(--brand-primary)] hover:underline"
                                title="Abrir perfil do aluno"
                              >
                                {row.full_name || 'Aluno'}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2 pr-2 font-semibold">
                            {activeConfig ? `${Math.round(row.avg_score)} / ${activeConfig.total_max}` : Math.round(row.avg_score)}
                          </td>
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
          </div>
        </section>

        <section ref={queueSectionRef} className="edificar-major-surface space-y-3 rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Redações a Corrigir</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  pendingTotalItems > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                )}
              >
                {pendingTotalItems}
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
                      slug={slug}
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
              <PaginationControls
                page={pendingPage}
                totalPages={pendingTotalPages}
                totalItems={pendingTotalItems}
                loading={queueLoading}
                onPageChange={setPendingPage}
              />
            </>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

          <div className="mt-3">
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
                      slug={slug}
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
              <PaginationControls
                page={correctedPage}
                totalPages={correctedTotalPages}
                totalItems={correctedTotalItems}
                loading={queueLoading}
                onPageChange={setCorrectedPage}
              />
            </>
          )}
        </section>
        </div>
      </div>
    </PartnerLayout>
  );
}
