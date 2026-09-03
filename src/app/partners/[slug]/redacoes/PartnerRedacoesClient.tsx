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
import { createClient } from '@/lib/supabase/client';
import { useOrgCorrectionPresence, type CorrectionPresenceEntry } from '@/hooks/useOrgCorrectionPresence';
import {
  RevealGroup, RevealItem, ElevatedCard, KpiCard, SectionTitle,
  BrandPill, BrandButton, Segmented, Medal, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';
import {
  AlertTriangle,
  Archive,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Info,
  Lock,
  Search,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import {
  EssayTypeAndPeriodFilter,
  CorrectedEssaysFilterDropdown,
  DEFAULT_DATE_FILTER,
  DEFAULT_SCORE_RANGE,
  type DateFilterValue,
  type ScoreRangeValue,
} from './EssayFiltersDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen' | 'awaiting_second' | 'second_corrected';
  essay_type?: string | null;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  average_score?: number | null;
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
  second_corrector_id?: string | null;
  second_corrector_name?: string | null;
  correction_lock_user_id?: string | null;
  correction_lock_at?: string | null;
  correction_lock_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  is_historical?: boolean;
  historical_date?: string | null;
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
  historical_received_week?: number;
  pending_count: number;
  avg_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  ranking: RankingItem[];
  competency_scores: CompetencyScore[];
  weakest_competency: { competency: number; avg: number } | null;
  avg_correction_days: number | null;
  improvement_rate: number | null;
  improvement_students_improved?: number;
  improvement_students_eligible?: number;
  second_corrections_count?: number;
  pending_by_type?: Record<string, number>;
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
  historical_received_week: 0,
  pending_count: 0,
  avg_score: null,
  highest_score: null,
  lowest_score: null,
  ranking: [],
  competency_scores: [],
  weakest_competency: null,
  avg_correction_days: null,
  improvement_rate: null,
  improvement_students_improved: 0,
  improvement_students_eligible: 0,
  second_corrections_count: 0,
  pending_by_type: {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function essayEffectiveScore(item: EssayListItem): number | null {
  const score = item.status === 'second_corrected' && item.average_score != null
    ? item.average_score
    : item.total_score;
  return typeof score === 'number' ? score : null;
}

// ─── Card padrão da página (mesmo estilo em todas as seções) ───────────────

const SECTION_CARD_CLASS =
  'overflow-hidden rounded-2xl border border-[var(--brand-primary)]/30 bg-white/90 shadow-md ring-1 ring-[var(--brand-primary)]/10 dark:border-[var(--brand-primary)]/35 dark:bg-slate-900/80';

function SectionIconTitle({
  icon: Icon,
  iconColor = 'var(--brand-primary)',
  title,
  subtitle,
  badge,
}: {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: iconColor, filter: `drop-shadow(0 2px 3px color-mix(in srgb, ${iconColor} 45%, transparent))` }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
}

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

// Converte um instante ISO (UTC) para o valor de um <input type="datetime-local">
// sempre exibido em horário de Brasília (BRT, UTC-3 fixo) — independente do
// fuso horário do navegador de quem está usando a página.
function isoToLocalInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// Converte o valor de um <input type="datetime-local"> (sempre interpretado
// como horário de Brasília, BRT/UTC-3 fixo — sem horário de verão desde
// 2019) de volta para um instante ISO (UTC) para salvar no backend.
function brtLocalInputValueToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = timePart.split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, (h || 0) + 3, min || 0)).toISOString();
}

function formatDateShortBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysBetweenBrtKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, (am || 1) - 1, ad || 1);
  const end = Date.UTC(by, (bm || 1) - 1, bd || 1);
  return Math.round((end - start) / 86400000);
}

function relativeTimeFromNow(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'há pouco tempo';
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `há ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  // Diferença por dia de calendário (BRT), não horas corridas — fica
  // consistente com a data completa (DD/MM/YY) exibida ao lado.
  const days = Math.max(1, daysBetweenBrtKeys(toBrtDateKey(date), toBrtDateKey(new Date())));
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

function PendingOtherTypesDrawer({
  open,
  onClose,
  items,
  onSelectType,
}: {
  open: boolean;
  onClose: () => void;
  items: { type: EssayType; label: string; count: number }[];
  onSelectType: (type: EssayType) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      setMounted(false);
    };
  }, [open, onClose]);

  if (!open) return null;
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/15 backdrop-blur-[2px] transition-opacity duration-300 dark:bg-black/30',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-900',
          mounted ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              Redações pendentes em outras bancas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Você tem {total} redaç{total === 1 ? 'ão pendente' : 'ões pendentes'} para correção nas seguintes bancas:
          </p>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectType(item.type)}
                className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:border-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:hover:bg-red-500/20"
              >
                <span className="text-sm font-bold text-red-700 dark:text-red-300">{item.label}</span>
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CorrectorPresenceBadge({ correctors }: { correctors: CorrectionPresenceEntry[] }) {
  const shown = correctors.slice(0, 2);
  const extra = correctors.length - shown.length;
  const label = correctors.length === 1
    ? `${shown[0]?.name} está corrigindo...`
    : `${shown[0]?.name} +${correctors.length - 1} corrigindo...`;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((c) => (
          <div
            key={c.userId}
            title={c.name}
            className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-900"
          >
            {c.avatarUrl ? (
              <Image src={c.avatarUrl} alt={c.name} fill className="object-cover" sizes="28px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-orange-400 text-[10px] font-bold text-white">
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {extra > 0 && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-300 ring-2 ring-white text-[10px] font-bold text-slate-700 dark:bg-slate-600 dark:text-white dark:ring-slate-900">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{label}</span>
    </div>
  );
}

function EssayQueueCard({
  slug,
  item,
  mode,
  onArchive,
  onDelete,
  onOpenForCorrection,
  archiving,
  deleting,
  opening,
  nowMs,
  allowManageActions,
  canViewStudents,
  currentUserId,
  activeCorrectors,
}: {
  slug: string;
  item: EssayListItem;
  mode: 'pending' | 'corrected';
  onArchive: (essay: EssayListItem) => void;
  onDelete: (essay: EssayListItem) => void;
  onOpenForCorrection: (essay: EssayListItem) => void;
  archiving: boolean;
  deleting: boolean;
  opening: boolean;
  nowMs: number;
  allowManageActions: boolean;
  canViewStudents: boolean;
  currentUserId?: string | null;
  activeCorrectors?: CorrectionPresenceEntry[];
}) {
  const preview = item.text?.length > 100 ? `${item.text.slice(0, 100)}...` : (item.text || '');
  const isAwaitingSecond = item.status === 'awaiting_second';
  const isAssignedToMe = isAwaitingSecond && !!currentUserId && item.second_corrector_id === currentUserId;
  const isLockedForMe = isAwaitingSecond && !isAssignedToMe;
  const lockAgeMs = item.correction_lock_at ? nowMs - new Date(item.correction_lock_at).getTime() : Number.POSITIVE_INFINITY;
  const hasActiveDbLock = Boolean(item.correction_lock_user_id && lockAgeMs >= 0 && lockAgeMs < 90_000);
  const dbLockedByOther = hasActiveDbLock && item.correction_lock_user_id !== currentUserId;
  const dbLockCorrector = item.correction_lock_user
    ? [{
        userId: item.correction_lock_user.id,
        name: item.correction_lock_user.full_name || 'Corretor',
        avatarUrl: item.correction_lock_user.avatar_url,
        essayId: item.id,
      }]
    : [];
  const displayedCorrectors = dbLockedByOther ? dbLockCorrector : (activeCorrectors || []);
  const isBeingCorrected = mode === 'pending' && !isLockedForMe && !isAssignedToMe && (dbLockedByOther || displayedCorrectors.length > 0);
  const canShowManageActions = allowManageActions && !isBeingCorrected;
  const displayScore = item.status === 'second_corrected' && item.average_score != null
    ? Math.round(item.average_score)
    : item.total_score;
  const essayTheme = pickEssayTheme(item);
  const credit = item.student_plan;

  return (
    <article className="partner-elevated-card partner-elevated-card-hover rounded-2xl bg-white p-4 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            {canViewStudents ? (
              <Link
                href={`/partners/${slug}/alunos/${item.student.id}`}
                className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:ring-offset-slate-900"
                title="Abrir perfil do aluno"
              >
                <StudentAvatar name={item.student.full_name} avatarUrl={item.student.avatar_url} />
              </Link>
            ) : (
              <span className="shrink-0 rounded-full">
                <StudentAvatar name={item.student.full_name} avatarUrl={item.student.avatar_url} />
              </span>
            )}
            <div className="min-w-0">
              {canViewStudents ? (
                <Link
                  href={`/partners/${slug}/alunos/${item.student.id}`}
                  className="truncate text-sm font-bold text-slate-900 underline-offset-2 transition hover:underline dark:text-white"
                  title="Abrir perfil do aluno"
                >
                  {item.student.full_name || 'Aluno'}
                </Link>
              ) : (
                <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {item.student.full_name || 'Aluno'}
                </span>
              )}
              <p className="truncate text-xs text-slate-400 dark:text-white/40">{item.student.email || '-'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-white/35">
              Enviada {relativeTimeFromNow(item.submitted_at)} - {formatDateShortBR(item.submitted_at)}
            </p>
            {isAssignedToMe && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                2ª CORREÇÃO
              </span>
            )}
            {isLockedForMe && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-white/40">
                <Lock className="h-2.5 w-2.5" />
                {item.second_corrector_name ? `Para ${item.second_corrector_name}` : 'Alocada'}
              </span>
            )}
            {item.status === 'second_corrected' && (
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                DUPLA CORREÇÃO
              </span>
            )}
            {item.is_historical && (
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                IMPORTADA
              </span>
            )}
          </div>
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
          {isBeingCorrected && displayedCorrectors.length > 0 && (
            <CorrectorPresenceBadge correctors={displayedCorrectors} />
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {mode === 'corrected' && displayScore !== null && (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-black tabular-nums text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {displayScore}/{ESSAY_TYPE_CONFIGS[(item.essay_type as EssayType) ?? 'enem']?.total_max ?? 1000}
              {item.status === 'second_corrected' && (
                <span className="ml-1 text-[10px] font-semibold opacity-60">média</span>
              )}
            </span>
          )}
          {isBeingCorrected ? (
            <span
              className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-400 sm:flex-none dark:bg-orange-500/10 dark:text-orange-400/70"
              title={`${displayedCorrectors.map((c) => c.name).join(', ')} está corrigindo esta redação`}
            >
              Sendo corrigida
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (mode === 'pending' && !isLockedForMe) {
                  onOpenForCorrection(item);
                  return;
                }
                window.location.href = `/partners/${slug}/redacoes/${item.id}`;
              }}
              disabled={opening}
              className={cn(
                'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-70 sm:flex-none',
                isAssignedToMe
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25'
                  : isLockedForMe
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10'
                    : mode === 'pending'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15',
              )}
            >
              {opening
                ? 'Abrindo...'
                : isAssignedToMe
                ? 'Fazer 2ª Correção'
                : isLockedForMe
                  ? 'Ver Redação'
                  : mode === 'pending'
                    ? 'Corrigir'
                    : 'Visualizar correção'}
            </button>
          )}
          {canShowManageActions && (
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
  const isAssociate = userProfile.role === 'associate';
  const canManagePrompts = userProfile.role === 'founder' || userProfile.role === 'admin';
  const canImportEssay = !isAssociate || (userProfile.associatePermissions?.can_import === true);
  const canViewStudents = !isAssociate || (userProfile.associatePermissions?.can_view_students === true);

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
  // `'all'` = todas as bancas. As métricas de rubrica (competências, nota
  // máxima) caem no molde ENEM nesse modo — ver `activeConfig` abaixo.
  const [activeTypeFilter, setActiveTypeFilter] = useState<EssayType | 'all'>('enem');
  const [pendingSortOrder, setPendingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [otherTypesAlertOpen, setOtherTypesAlertOpen] = useState(false);
  const [scoreRange, setScoreRange] = useState<ScoreRangeValue>(DEFAULT_SCORE_RANGE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'corrected' | 'seen'>('all');
  const [studentFilterId, setStudentFilterId] = useState<string | null>(null);
  const [studentFilterName, setStudentFilterName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingEssayId, setOpeningEssayId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [queueOpen, setQueueOpen] = useState(() =>
    (initialOverview?.pagination?.pending?.total || 0) > 0,
  );
  const [correctedOpen, setCorrectedOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
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

  const [myStats, setMyStats] = useState<{ today: number; week: number; month: number; total: number } | null>(null);
  const [myStatsLoading, setMyStatsLoading] = useState(isAssociate);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!isAssociate) return;
    setMyStatsLoading(true);
    fetch(`/api/partners/${slug}/associates/my-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMyStats(d); })
      .finally(() => setMyStatsLoading(false));
  }, [isAssociate, slug]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  const { presenceByEssay } = useOrgCorrectionPresence({
    orgId: org.id,
    currentUserId,
    currentUserName: userProfile.fullName,
    currentUserAvatarUrl: userProfile.avatarUrl,
  });

  const activeConfig = ESSAY_TYPE_CONFIGS[activeTypeFilter === 'all' ? 'enem' : activeTypeFilter];
  const competencyNames = activeConfig.competencies;
  const getCompetencyMax = (idx: number): number => {
    const options = activeConfig.score_options[idx] || [];
    const max = options.length ? Math.max(...options) : 200;
    return Number.isFinite(max) ? max : 200;
  };

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setMetricsLoading(true);
      setQueueLoading(true);
    }
    try {
      const params = new URLSearchParams({
        pending_page: String(pendingPage),
        pending_limit: '10',
        corrected_page: String(correctedPage),
        corrected_limit: '10',
      });
      params.set('essay_type', activeTypeFilter);
      params.set('pending_sort', pendingSortOrder);
      if (dateFilter.preset === 'custom') {
        if (dateFilter.from) params.set('date_from', dateFilter.from);
        if (dateFilter.to) params.set('date_to', dateFilter.to);
      } else if (dateFilter.preset) {
        params.set('date_preset', dateFilter.preset);
      }
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
      if (!options?.silent) {
        setMetricsLoading(false);
        setQueueLoading(false);
      }
    }
  }, [slug, pendingPage, correctedPage, activeTypeFilter, dateFilter, pendingSortOrder]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`essay-locks:${org.id}`)
      // UPDATE cobre correção/lock/status; INSERT cobre redação nova entrando na
      // fila. Com os dois, a tela reage na hora a qualquer mudança e o intervalo
      // abaixo é só uma rede de segurança (ex: WebSocket caiu sem avisar).
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'essays', filter: `org_id=eq.${org.id}` },
        () => {
          void loadOverview({ silent: true });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'essays', filter: `org_id=eq.${org.id}` },
        () => {
          void loadOverview({ silent: true });
        },
      )
      .subscribe();

    // Antes eram 3s: com ~12 consultas por chamada (uma delas sobre 500
    // redações), uma aba aberta durante uma sessão de correção sozinha já
    // consumia vários GB de egress/mês. O realtime acima é o caminho normal de
    // atualização; 60s aqui só pega o caso raro de o canal ter caído.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadOverview({ silent: true });
      }
    }, 60000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [org.id, loadOverview]);

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

  const assignedSecondEssays = useMemo(() =>
    pendingEssays.filter(
      (e) => e.status === 'awaiting_second' && !!currentUserId && e.second_corrector_id === currentUserId,
    ),
  [pendingEssays, currentUserId]);

  const displayPendingCount = Math.max(0, pendingTotalItems);
  const regularPendingCount = Math.max(0, pendingTotalItems - assignedSecondEssays.length);
  const regularPendingTotalPages = Math.max(1, Math.ceil(regularPendingCount / 10));

  const filteredPending = useMemo(() => {
    if (statusFilter !== 'all' && statusFilter !== 'pending') return [];
    return pendingEssays
      .filter((e) => !(e.status === 'awaiting_second' && !!currentUserId && e.second_corrector_id === currentUserId))
      .filter(matchesSearch)
      .filter((item) => !studentFilterId || item.student.id === studentFilterId);
  }, [pendingEssays, currentUserId, statusFilter, matchesSearch, studentFilterId]);

  const filteredCorrected = useMemo(() => {
    let base = correctedEssays
      .filter(matchesSearch)
      .filter((item) => !studentFilterId || item.student.id === studentFilterId);
    if (statusFilter === 'corrected') base = base.filter((i) => i.status === 'corrected' || i.status === 'second_corrected');
    else if (statusFilter === 'seen') base = base.filter((i) => i.status === 'seen');
    else if (statusFilter === 'pending') return [];
    if (scoreRange.min !== null || scoreRange.max !== null) {
      base = base.filter((item) => {
        const score = essayEffectiveScore(item);
        if (score === null) return false;
        if (scoreRange.min !== null && score < scoreRange.min) return false;
        if (scoreRange.max !== null && score > scoreRange.max) return false;
        return true;
      });
    }
    return base;
  }, [correctedEssays, statusFilter, matchesSearch, studentFilterId, scoreRange]);

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
    const active = presenceByEssay.get(item.id) || [];
    if (item.status === 'pending' && active.length > 0) {
      toast.error('Não é possível excluir enquanto a redação está sendo corrigida.');
      return;
    }
    const lockAgeMs = item.correction_lock_at ? Date.now() - new Date(item.correction_lock_at).getTime() : Number.POSITIVE_INFINITY;
    const activeDbLock = Boolean(item.correction_lock_user_id && lockAgeMs >= 0 && lockAgeMs < 90_000);
    if (item.status === 'pending' && activeDbLock && item.correction_lock_user_id !== currentUserId) {
      const name = item.correction_lock_user?.full_name || 'Outro corretor';
      toast.error(`${name} está corrigindo esta redação. Não é possível excluir agora.`);
      await loadOverview({ silent: true });
      return;
    }
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

  async function handleOpenForCorrection(item: EssayListItem) {
    setOpeningEssayId(item.id);
    try {
      const res = await fetch(`/api/partners/${slug}/essays/${item.id}/lock`, {
        method: 'PATCH',
      });
      const payload = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) {
        toast.error(payload?.error || 'Esta redação já está sendo corrigida.');
        await loadOverview({ silent: true });
        return;
      }
      window.location.href = `/partners/${slug}/redacoes/${item.id}`;
    } catch {
      toast.error('Não foi possível iniciar a correção agora.');
      await loadOverview({ silent: true });
    } finally {
      setOpeningEssayId(null);
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
          starts_at: brtLocalInputValueToIso(promptForm.starts_at),
          ends_at: brtLocalInputValueToIso(promptForm.ends_at),
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

  const showSecondCorrectionsCard = metricsLoading || (metrics.second_corrections_count ?? 0) > 0;

  const receivedKpiTitle = dateFilter.preset === 'today'
    ? 'Recebidas hoje'
    : dateFilter.preset === 'yesterday'
      ? 'Recebidas ontem'
      : dateFilter.preset === 'month'
        ? 'Recebidas este mês'
        : dateFilter.preset === 'custom'
          ? 'Recebidas no período'
          : 'Recebidas esta semana';

  const improvementRateColor = metrics.improvement_rate === null
    ? '#94a3b8'
    : metrics.improvement_rate >= 60
      ? '#10b981'
      : metrics.improvement_rate >= 40
        ? '#f59e0b'
        : '#ef4444';

  // Com "Todas as bancas" selecionado não existe "outras bancas" — a fila já
  // mostra todos os tipos.
  const otherTypesPending = activeTypeFilter === 'all'
    ? []
    : (Object.entries(metrics.pending_by_type || {}) as [EssayType, number][])
        .filter(([type, count]) => type !== activeTypeFilter && count > 0)
        .map(([type, count]) => ({ type, count, label: ESSAY_TYPE_CONFIGS[type]?.label ?? type }))
        .sort((a, b) => b.count - a.count);
  const otherTypesPendingTotal = otherTypesPending.reduce((sum, item) => sum + item.count, 0);

  const goToTypeQueue = (type: EssayType) => {
    setActiveTypeFilter(type);
    setOtherTypesAlertOpen(false);
    setQueueOpen(true);
    queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas space-y-6 min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="edificar-page-frame space-y-6 p-3 md:p-4">
        <div className="space-y-4">
          <SectionTitle
            kicker="Correção"
            title="Redações"
            hex={org.brand_primary}
            action={
              displayPendingCount > 0 ? (
                <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                  {displayPendingCount} {displayPendingCount === 1 ? 'pendente' : 'pendentes'}
                </span>
              ) : undefined
            }
          />

          {isAssociate && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hoje', value: myStats?.today ?? 0 },
                { label: 'Semana', value: myStats?.week ?? 0 },
                { label: 'Mês', value: myStats?.month ?? 0 },
                { label: 'Total', value: myStats?.total ?? 0 },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center rounded-xl border border-[var(--brand-primary)]/20 bg-white/80 dark:bg-slate-800/60 px-2 py-2.5 text-center shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-none mb-1">{label}</p>
                  {myStatsLoading ? (
                    <div className="h-5 w-8 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                  ) : (
                    <p className="text-lg font-extrabold leading-none" style={{ color: 'var(--brand-primary)' }}>{value}</p>
                  )}
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">correções</p>
                </div>
              ))}
            </div>
          )}

          {/* Ajustar Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <EssayTypeAndPeriodFilter
              essayType={activeTypeFilter}
              onEssayTypeChange={setActiveTypeFilter}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              neutralType="enem"
            />
            {!metricsLoading && otherTypesPending.length > 0 && (
              <button
                type="button"
                onClick={() => setOtherTypesAlertOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-all hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Você tem {otherTypesPendingTotal} redaç{otherTypesPendingTotal === 1 ? 'ão pendente' : 'ões pendentes'} em outras bancas
              </button>
            )}
            {metricsLoading && (
              <span className="text-[11px] text-slate-400 animate-pulse">Carregando...</span>
            )}
          </div>

          <PendingOtherTypesDrawer
            open={otherTypesAlertOpen}
            onClose={() => setOtherTypesAlertOpen(false)}
            items={otherTypesPending}
            onSelectType={goToTypeQueue}
          />

          <div className={cn('grid grid-cols-2 gap-3 lg:gap-4', showSecondCorrectionsCard ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
            <KpiCard
              title={receivedKpiTitle}
              value={metricsLoading ? '...' : metrics.received_week}
              subtitle={
                !metricsLoading && (metrics.historical_received_week ?? 0) > 0
                  ? `${metrics.historical_received_week} importada${(metrics.historical_received_week ?? 0) > 1 ? 's' : ''}`
                  : undefined
              }
              icon={FileText}
              accentColor="var(--brand-primary)"
              accentHex={org.brand_primary}
              loading={metricsLoading}
            />
            <KpiCard
              title="Aguardando correção"
              value={metricsLoading ? '...' : displayPendingCount}
              icon={Clock}
              accentColor={otherTypesPending.length > 0 ? '#ef4444' : 'var(--brand-secondary)'}
              accentHex={otherTypesPending.length > 0 ? '#ef4444' : org.brand_secondary}
              loading={metricsLoading}
              topRightBadge={
                !metricsLoading && otherTypesPending.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOtherTypesAlertOpen(true);
                    }}
                    title="Redações pendentes em outras bancas"
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(90deg, #ef4444, color-mix(in srgb, #ef4444 40%, white))',
                      boxShadow: '0 2px 8px color-mix(in srgb, #ef4444 30%, transparent)',
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    +{otherTypesPendingTotal}
                  </button>
                ) : undefined
              }
              iconAdornment={
                dateFilter.preset ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info('Este número segue o filtro de período', {
                        description: 'Mostra as redações enviadas dentro do período selecionado que ainda estão aguardando correção. Redações pendentes enviadas fora desse período não entram nessa contagem.',
                      });
                    }}
                    title="Como o filtro de período afeta esse número?"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:bg-white/10 dark:text-white/40 dark:hover:bg-white/20"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                ) : undefined
              }
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
            {showSecondCorrectionsCard && (
              <KpiCard
                title="Duplas correções"
                value={metricsLoading ? '...' : (metrics.second_corrections_count ?? 0)}
                icon={CheckCircle2}
                accentColor="#0ea5e9"
                accentHex="#0ea5e9"
                loading={metricsLoading}
              />
            )}
          </div>

          {/* ── Métricas expandidas ─────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-3">

            {/* Tempo médio de correção */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, #3b82f6, color-mix(in srgb, #3b82f6 40%, white))' }}
              />
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
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${improvementRateColor}, color-mix(in srgb, ${improvementRateColor} 40%, white))` }}
              />
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
              {!metricsLoading && metrics.improvement_rate !== null && (
                <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                  {metrics.improvement_students_improved ?? 0} de {metrics.improvement_students_eligible ?? 0}{' '}
                  aluno{(metrics.improvement_students_eligible ?? 0) === 1 ? '' : 's'} com 2+ redações corrigidas melhoraram a nota
                </p>
              )}
            </div>

            {/* Competência mais fraca */}
            {!metricsLoading && weakestCompetency && (
              <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: 'linear-gradient(90deg, #f59e0b, color-mix(in srgb, #f59e0b 40%, white))' }}
                />
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
            <div className={SECTION_CARD_CLASS}>
              <div className="px-4 pb-2 pt-3">
                <SectionIconTitle icon={TrendingUp} title="Desempenho da turma por competência" />
              </div>
              <div className="space-y-2.5 px-4 pb-4">
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
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Baseado nas redações corrigidas com score por competência
                </p>
              </div>
            </div>
          )}

          {canManagePrompts && (
            <div className={SECTION_CARD_CLASS}>
              <button
                type="button"
                onClick={() => setPromptsOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--brand-primary)]/5"
              >
                <SectionIconTitle
                  icon={FileText}
                  title="Gestão de Coletâneas de Redação"
                  subtitle="Crie e gerencie temas com materiais de apoio"
                  badge={
                    <span className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">
                      {prompts.filter((p) => p.is_active).length} ativas
                    </span>
                  }
                />
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

          <div className={SECTION_CARD_CLASS}>
            <button
              type="button"
              onClick={() => setRankingOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--brand-primary)]/5"
            >
              <SectionIconTitle icon={Trophy} title="Ranking dos alunos (Top 10)" />
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200"
                style={{ transform: rankingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {rankingOpen && (
            <div className="px-4 pb-4">
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
                            {canViewStudents ? (
                              <>
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
                              </>
                            ) : (
                              <>
                                <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {row.full_name || 'Aluno'}
                                </span>
                              </>
                            )}
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
                              {canViewStudents ? (
                                <>
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
                                </>
                              ) : (
                                <>
                                  <StudentAvatar name={row.full_name} avatarUrl={row.avatar_url} size={28} />
                                  <span className="font-medium">{row.full_name || 'Aluno'}</span>
                                </>
                              )}
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
            )}
          </div>
        </div>

        {assignedSecondEssays.length > 0 && (
          <div className={SECTION_CARD_CLASS}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <SectionIconTitle
                icon={AlertTriangle}
                iconColor="#f59e0b"
                title="Aguardando Sua Correção"
                badge={
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {assignedSecondEssays.length}
                  </span>
                }
              />
            </div>
            <div className="space-y-3 px-4 pb-4">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Você foi solicitado(a) para realizar a segunda correção das redações abaixo.
              </p>
              {assignedSecondEssays.map((item) => (
                <EssayQueueCard
                  key={item.id}
                  slug={slug}
                  item={item}
                  mode="pending"
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onOpenForCorrection={handleOpenForCorrection}
                  archiving={archivingId === item.id}
                  deleting={deletingId === item.id}
                  opening={openingEssayId === item.id}
                  nowMs={nowMs}
                  allowManageActions={false}
                  canViewStudents={canViewStudents}
                  currentUserId={currentUserId}
                  activeCorrectors={presenceByEssay.get(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={queueSectionRef} className={SECTION_CARD_CLASS}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <SectionIconTitle
              icon={Clock}
              title="Redações a Corrigir"
              badge={
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    regularPendingCount > 0
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                  )}
                >
                  {regularPendingCount}
                </span>
              }
            />

            <div className="flex items-center gap-2">
              {canImportEssay && (
                <Link
                  href={`/partners/${slug}/redacoes/importar`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload className="h-4 w-4" />
                  Importar Redação
                </Link>
              )}
              <button
                type="button"
                onClick={() => setQueueOpen((v) => !v)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {queueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {queueOpen ? 'Ocultar fila' : 'Mostrar fila'}
              </button>
            </div>
          </div>

          {queueOpen && (
            <div className="space-y-3 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Ordenar por
                </span>
                <Segmented
                  options={[
                    { value: 'asc', label: 'Mais antigas' },
                    { value: 'desc', label: 'Mais recentes' },
                  ]}
                  value={pendingSortOrder}
                  onChange={setPendingSortOrder}
                  hex={org.brand_primary}
                />
              </div>
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
                      onOpenForCorrection={handleOpenForCorrection}
                      archiving={archivingId === item.id}
                      deleting={deletingId === item.id}
                      opening={openingEssayId === item.id}
                      nowMs={nowMs}
                      allowManageActions={!isAssociate}
                      canViewStudents={canViewStudents}
                      currentUserId={currentUserId}
                      activeCorrectors={presenceByEssay.get(item.id)}
                    />
                  ))}
                </div>
              )}
              <PaginationControls
                page={pendingPage}
                totalPages={regularPendingTotalPages}
                totalItems={regularPendingCount}
                loading={queueLoading}
                onPageChange={setPendingPage}
              />
            </div>
          )}
        </div>

        <div className={SECTION_CARD_CLASS}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <SectionIconTitle icon={CheckCircle2} title="Redações já corrigidas" />
            <button
              type="button"
              onClick={() => setCorrectedOpen((v) => !v)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {correctedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {correctedOpen ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
          </div>

          <div className="space-y-4 px-4 pb-4">
          <label className="group block">
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

          <div className="flex flex-wrap items-center gap-2">
            <CorrectedEssaysFilterDropdown
              status={statusFilter}
              onStatusChange={setStatusFilter}
              essayType={activeTypeFilter}
              onEssayTypeChange={setActiveTypeFilter}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              scoreRange={scoreRange}
              onScoreRangeChange={setScoreRange}
              maxScore={activeConfig?.total_max}
              neutralType="enem"
            />

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
          </div>

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
                      onOpenForCorrection={handleOpenForCorrection}
                      archiving={archivingId === item.id}
                      deleting={deletingId === item.id}
                      opening={openingEssayId === item.id}
                      nowMs={nowMs}
                      allowManageActions={!isAssociate}
                      canViewStudents={canViewStudents}
                      currentUserId={currentUserId}
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
          </div>
        </div>
        </div>
      </div>
    </PartnerLayout>
  );
}
