'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  UserPlus, Search, ChevronLeft, ChevronRight, ExternalLink,
  Users, Trash2, BookOpen, ClipboardList, FileText, Target,
  ArrowUp, ArrowDown, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { brtDateDaysAgo, toBrtDateKey } from '@/lib/brt-date';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, KpiCard, SectionTitle,
  BrandPill, Segmented, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_tier: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_assignment_status?: 'active' | 'inactive' | null;
  plan_last_payment_at?: string | null;
  essay_credits_limit?: number | null;
  essay_credits_period?: 'week' | 'month' | null;
  essay_credits_used?: number | null;
  essay_credits_remaining?: number | null;
  last_activity_date: string | null;
  joined_organization_at: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  essays_today: number;
  essays_week: number;
  essays_month: number;
  essays_total: number;
  accuracy_today: number | null;
  accuracy_week: number | null;
  accuracy_month: number | null;
  accuracy_total: number | null;
}

type MetricWindow = 'today' | 'week' | 'month' | 'total';
// API-backed sorts
type ApiSortField = 'last_activity_date' | 'full_name' | 'joined_organization_at';
// All sortable fields (includes client-side metric sorts)
type SortByField = ApiSortField | 'questions' | 'simulados' | 'essays' | 'accuracy';

const API_SORT_FIELDS: Set<string> = new Set(['last_activity_date', 'full_name', 'joined_organization_at']);

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PERIOD_OPTIONS: { key: MetricWindow; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'total', label: 'Total' },
];

const SORT_OPTIONS: { value: SortByField; label: string }[] = [
  { value: 'last_activity_date',    label: 'Último acesso' },
  { value: 'full_name',             label: 'Nome A–Z' },
  { value: 'joined_organization_at',label: 'Data de entrada' },
  { value: 'questions',             label: 'Questões' },
  { value: 'simulados',             label: 'Simulados' },
  { value: 'essays',                label: 'Redações' },
  { value: 'accuracy',              label: '% Acertos' },
];

// Widths that must match between header and row cells
const COL = {
  avatar:    'w-10',
  metric:    'w-[72px]',
  lastAccess:'w-[130px]',
  // action area: select w-36 (144) + 2 buttons w-9 (36) + 2 gaps gap-1 (8) = 224
  actions:   'w-[224px]',
} as const;

interface PlanOption {
  id: string;
  name: string;
  is_active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StudentAvatar({ student, brandHex }: { student: Student; brandHex?: string }) {
  const initial = (student.full_name || student.email || '?')[0].toUpperCase();
  if (student.avatar_url) {
    return (
      <Image
        src={student.avatar_url}
        alt={student.full_name}
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 text-sm"
      style={{ background: 'var(--brand-primary)', color: onBrandText(brandHex) }}
    >
      {initial}
    </div>
  );
}

function relativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr + 'T12:00:00').getTime();
  const d = Math.floor(diffMs / 86_400_000);
  if (d <= 0) return 'hoje';
  if (d === 1) return '1d atrás';
  if (d < 7) return `${d}d atrás`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}sem atrás`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}m atrás`;
  return `${Math.floor(d / 365)}a atrás`;
}

function getMetrics(s: Student, w: MetricWindow) {
  return {
    questions: w === 'today' ? s.questions_today : w === 'week' ? s.questions_week : w === 'month' ? s.questions_month : s.questions_total,
    simulados: w === 'today' ? s.simulados_today : w === 'week' ? s.simulados_week : w === 'month' ? s.simulados_month : s.simulados_total,
    essays:    w === 'today' ? s.essays_today    : w === 'week' ? s.essays_week    : w === 'month' ? s.essays_month    : s.essays_total,
    accuracy:  w === 'today' ? s.accuracy_today  : w === 'week' ? s.accuracy_week  : w === 'month' ? s.accuracy_month  : s.accuracy_total,
  };
}

// A single metric column cell — direct flex child so gap aligns with header
function MetricCell({ icon: Icon, value, label, accent, className }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex-col items-center shrink-0 text-center', COL.metric, className)}>
      <div className={cn(
        'flex items-center justify-center gap-1 text-sm font-black tabular-nums',
        accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-white/80',
      )}>
        <Icon className="h-3 w-3 shrink-0 opacity-50" />
        {value}
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/30 mt-0.5 leading-tight">
        {label}
      </p>
    </div>
  );
}

// Clickable column header cell
function ColHeader({ label, sortKey, currentSort, currentOrder, onSort, className, brandHex }: {
  label: string;
  sortKey: SortByField;
  currentSort: SortByField;
  currentOrder: 'asc' | 'desc';
  onSort: (field: SortByField) => void;
  className?: string;
  brandHex?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center justify-center gap-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest transition-colors',
        active
          ? 'dark:text-white/70'
          : 'text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60',
        className,
      )}
      style={active ? { color: readableBrandText(brandHex, 'var(--brand-primary)') } : undefined}
    >
      {label}
      {active
        ? currentOrder === 'desc'
          ? <ArrowDown className="h-2.5 w-2.5 ml-0.5" />
          : <ArrowUp className="h-2.5 w-2.5 ml-0.5" />
        : null}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlunosPage() {
  const { org } = useOrg();
  const [students, setStudents]         = useState<Student[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [planFilter, setPlanFilter]     = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [metricWindow, setMetricWindow] = useState<MetricWindow>('week');
  const [sortBy, setSortBy]             = useState<SortByField>('last_activity_date');
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>('desc');
  const [removing, setRemoving]         = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [customPlans, setCustomPlans]   = useState<PlanOption[]>([]);

  const today = toBrtDateKey(new Date());

  // API only knows about these sort fields
  const apiSort: ApiSortField = API_SORT_FIELDS.has(sortBy)
    ? (sortBy as ApiSortField)
    : 'last_activity_date';

  // sortOrder só é relevante para o servidor quando o sort é uma coluna API
  const apiSortOrder = API_SORT_FIELDS.has(sortBy) ? sortOrder : ('desc' as const);

  const fetchStudents = useCallback(async (
    p: number, s: string, plan: string, sf: ApiSortField, order: 'asc' | 'desc',
  ) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      sort: sf,
      order,
    });
    if (s) params.set('search', s);

    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let list: Student[] = data.students ?? [];
        if (plan !== 'all') {
          list = plan === 'none'
            ? list.filter((s) => !s.plan_id)
            : list.filter((s) => s.plan_id === plan.replace('custom:', ''));
        }
        setStudents(list);
        setTotal(data.total ?? list.length);
      }
    } catch {
      // silêncio
    } finally {
      setLoading(false);
    }
  }, [org.slug]);

  const fetchPlans = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/plans?include_inactive=false`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCustomPlans(Array.isArray(data?.items) ? data.items : []);
    } catch { /* silêncio */ }
  }, [org.slug]);

  useEffect(() => {
    fetchStudents(page, search, planFilter, apiSort, apiSortOrder);
  }, [page, search, planFilter, apiSort, apiSortOrder, fetchStudents]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function handleSortChange(field: SortByField) {
    if (field === sortBy) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
      setPage(1);
    }
  }

  async function handlePlanChange(student: Student, newPlanValue: string) {
    const studentId = student.id;
    if (!UUID_RE.test(studentId)) return;
    setUpdatingPlan(studentId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const payload = newPlanValue.startsWith('custom:')
        ? { plan_id: newPlanValue.replace('custom:', ''), plan_assignment_status: 'active', plan_last_payment_at: student.plan_last_payment_at || toBrtDateKey(new Date()) }
        : { plan_id: null };
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => {
          if (s.id !== studentId) return s;
          if (newPlanValue.startsWith('custom:')) {
            const cid = newPlanValue.replace('custom:', '');
            return { ...s, plan_id: cid, plan_name: customPlans.find(p => p.id === cid)?.name || 'Plano customizado', plan_assignment_status: 'active' };
          }
          return { ...s, plan_id: null, plan_name: null };
        }));
        toast.success('Plano atualizado.');
      } else { toast.error('Erro ao atualizar plano.'); }
    } catch { toast.error('Erro de conexão.'); }
    finally { setUpdatingPlan(null); }
  }

  async function handleRemove(studentId: string, name: string) {
    if (!UUID_RE.test(studentId)) return;
    if (!confirm(`Remover "${name}" da organização? A conta do aluno não será deletada.`)) return;
    setRemoving(studentId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setTotal(t => t - 1);
        toast.success(`${name} removido da organização.`);
      } else { toast.error('Erro ao remover aluno.'); }
    } catch { toast.error('Erro de conexão.'); }
    finally { setRemoving(null); }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const activeToday = students.filter(s => s.last_activity_date === today).length;
  const activeWeek  = students.filter(s => s.last_activity_date && s.last_activity_date >= brtDateDaysAgo(7)).length;
  const totalPages  = Math.ceil(total / PAGE_SIZE);
  const weekAgo     = brtDateDaysAgo(7);

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => {
      if (activityFilter === 'today')    return s.last_activity_date === today;
      if (activityFilter === 'week')     return s.last_activity_date != null && s.last_activity_date >= weekAgo;
      if (activityFilter === 'inactive') return s.last_activity_date == null || s.last_activity_date < weekAgo;
      return true;
    });

    // Client-side metric sorts (API sorts are already handled server-side)
    if (!API_SORT_FIELDS.has(sortBy)) {
      list = [...list].sort((a, b) => {
        const m = metricWindow;
        let va = 0, vb = 0;
        if (sortBy === 'questions') { va = getMetrics(a, m).questions ?? 0; vb = getMetrics(b, m).questions ?? 0; }
        if (sortBy === 'simulados') { va = getMetrics(a, m).simulados ?? 0; vb = getMetrics(b, m).simulados ?? 0; }
        if (sortBy === 'essays')    { va = getMetrics(a, m).essays    ?? 0; vb = getMetrics(b, m).essays    ?? 0; }
        if (sortBy === 'accuracy')  { va = getMetrics(a, m).accuracy  ?? -1; vb = getMetrics(b, m).accuracy ?? -1; }
        return sortOrder === 'desc' ? vb - va : va - vb;
      });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, activityFilter, sortBy, sortOrder, metricWindow, today, weekAgo]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.key === metricWindow)?.label ?? '';
  const segmentedOptions = PERIOD_OPTIONS.map(o => ({ value: o.key, label: o.label }));
  const vagasPct = Math.min(100, Math.round((total / (org.max_students ?? 1)) * 100));

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame space-y-4 p-3 md:p-4">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <RevealItem>
          <BrandHero>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">Gestão de Turma</p>
                <h1 className="font-display text-[28px] font-black text-white lg:text-[32px]">Alunos</h1>
                <p className="mt-1 text-[13px] text-white/60">
                  {loading ? '...' : `${total} de ${org.max_students} vagas utilizadas`}
                </p>
                {!loading && (
                  <div className="mt-2.5 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${vagasPct}%`, background: 'var(--brand-accent)' }}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Activity className="h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} />
                  <span className="text-[13px] font-bold tabular-nums text-white">{loading ? '—' : activeToday}</span>
                  <span className="text-[11px] text-white/55">ativos hoje</span>
                </div>
                <div className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Users className="h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} />
                  <span className="text-[13px] font-bold tabular-nums text-white">{loading ? '—' : total}</span>
                  <span className="text-[11px] text-white/55">total</span>
                </div>
              </div>
            </div>
          </BrandHero>
        </RevealItem>

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <RevealItem className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          <KpiCard
            title="Ativos hoje"
            value={loading ? '—' : activeToday}
            subtitle={`de ${total} alunos`}
            icon={Activity}
            loading={loading}
            accentColor="var(--brand-primary)"
            accentHex={org.brand_primary}
          />
          <KpiCard
            title="Ativos na semana"
            value={loading ? '—' : activeWeek}
            subtitle={`de ${total} alunos`}
            icon={Activity}
            loading={loading}
            accentColor="var(--brand-secondary)"
            accentHex={org.brand_secondary}
          />
          <KpiCard
            title="Total de alunos"
            value={loading ? '—' : total}
            subtitle={`de ${org.max_students} vagas`}
            icon={Users}
            loading={loading}
            accentColor="var(--brand-accent)"
            accentHex={org.brand_accent}
          />
        </RevealItem>

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <RevealItem>
          <ElevatedCard>
            <div className="space-y-3 p-4 sm:p-5">

              {/* Linha 1: Período + Ordenação */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Período */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide">Período:</span>
                  <Segmented options={segmentedOptions} value={metricWindow} onChange={setMetricWindow} hex={org.brand_primary} />
                </div>

                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />

                {/* Ordenação */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide">Ordenar:</span>
                  <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortByField)}>
                    <SelectTrigger className="h-9 w-40 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                    title={sortOrder === 'desc' ? 'Decrescente — clique para crescente' : 'Crescente — clique para decrescente'}
                    className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-colors shrink-0"
                  >
                    {sortOrder === 'desc'
                      ? <ArrowDown className="h-4 w-4" />
                      : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Linha 2: Busca + filtros */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/30" />
                  <Input
                    placeholder="Buscar por nome..."
                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                    onBlur={() => { setSearch(searchInput); setPage(1); }}
                  />
                </div>
                <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="none">Sem plano vinculado</SelectItem>
                    {customPlans.map(p => <SelectItem key={p.id} value={`custom:${p.id}`}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer atividade</SelectItem>
                    <SelectItem value="today">Ativos hoje</SelectItem>
                    <SelectItem value="week">Ativos esta semana</SelectItem>
                    <SelectItem value="inactive">Inativos há +7 dias</SelectItem>
                  </SelectContent>
                </Select>
                <BrandPill href={`/partners/${org.slug}/alunos/convidar`} hex={org.brand_primary} className="shrink-0">
                  <UserPlus className="h-4 w-4" /> Adicionar
                </BrandPill>
              </div>
            </div>
          </ElevatedCard>
        </RevealItem>

        {/* ── Lista de Alunos ───────────────────────────────────────────────── */}
        <RevealItem>
          <ElevatedCard accentColor="var(--brand-primary)">
            <div className="p-4 sm:p-5">
              <SectionTitle kicker="Turma" title="Alunos" hex={org.brand_primary} />

              {/* Cabeçalho de colunas (clicável para ordenar) */}
              {!loading && filteredStudents.length > 0 && (
                <div className="hidden md:flex items-center gap-4 border-b border-slate-100 px-1 pb-2 dark:border-white/5">
                  {/* Avatar spacer */}
                  <div className={COL.avatar} />
                  {/* Aluno */}
                  <div className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Aluno
                  </div>
                  <ColHeader label="Questões"  sortKey="questions" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSortChange} className={COL.metric} brandHex={org.brand_primary} />
                  <ColHeader label="Simulados" sortKey="simulados" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSortChange} className={COL.metric} brandHex={org.brand_primary} />
                  <ColHeader label="Redações"  sortKey="essays"    currentSort={sortBy} currentOrder={sortOrder} onSort={handleSortChange} className={COL.metric} brandHex={org.brand_primary} />
                  <ColHeader label="Acertos"   sortKey="accuracy"  currentSort={sortBy} currentOrder={sortOrder} onSort={handleSortChange} className={COL.metric} brandHex={org.brand_primary} />
                  <ColHeader
                    label="Último acesso"
                    sortKey="last_activity_date"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSortChange}
                    className={cn(COL.lastAccess, 'justify-start')}
                    brandHex={org.brand_primary}
                  />
                  {/* Action spacer */}
                  <div className={COL.actions} />
                </div>
              )}

              {loading ? (
                <div className="space-y-2 pt-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-slate-300 dark:text-white/15 mb-3" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/50">
                    {search ? `Nenhum aluno encontrado para "${search}".` : 'Nenhum aluno cadastrado ainda.'}
                  </p>
                  {!search && (
                    <BrandPill href={`/partners/${org.slug}/alunos/convidar`} hex={org.brand_primary} className="mt-4">
                      <UserPlus className="h-4 w-4" /> Importar alunos
                    </BrandPill>
                  )}
                </div>
              ) : (
                <div>
                  {filteredStudents.map((s) => {
                    const isOnline = s.last_activity_date === today;
                    const m = getMetrics(s, metricWindow);
                    const accuracyGood = m.accuracy != null && m.accuracy >= 60;

                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'group flex items-center gap-4 rounded-xl px-3 py-3',
                          'border-b border-slate-100 last:border-0 dark:border-white/5',
                          'hover:bg-slate-50 dark:hover:bg-white/5',
                          'transition-colors duration-150',
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn('relative shrink-0', COL.avatar)}>
                          <StudentAvatar student={s} brandHex={org.brand_primary} />
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                            </span>
                          )}
                        </div>

                        {/* Nome + email */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/partners/${org.slug}/alunos/${s.id}`}
                              className="font-bold text-sm text-slate-900 dark:text-white hover:underline truncate"
                            >
                              {s.full_name || '—'}
                            </Link>
                            {s.plan_name && (
                              <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0',
                                s.plan_id
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-white/50 dark:border-white/10',
                              )}>
                                {s.plan_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 dark:text-white/30 truncate mt-0.5">{s.email}</p>
                        </div>

                        {/* ── Metric columns — direct flex children, same gap-4 as header ── */}
                        <MetricCell icon={BookOpen}     value={m.questions} label="questões" className="hidden md:flex" />
                        <MetricCell icon={ClipboardList} value={m.simulados} label="simulados" className="hidden md:flex" />
                        <MetricCell icon={FileText}      value={m.essays}    label="redações"  className="hidden md:flex" />
                        <MetricCell
                          icon={Target}
                          value={m.accuracy != null ? `${m.accuracy}%` : '—'}
                          label="acertos"
                          accent={accuracyGood}
                          className="hidden md:flex"
                        />

                        {/* Último acesso */}
                        <div className={cn('hidden md:flex flex-col shrink-0', COL.lastAccess)}>
                          {s.last_activity_date ? (
                            <>
                              <span className="text-xs font-semibold text-slate-600 dark:text-white/70 tabular-nums">
                                {s.last_activity_date}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-white/30">
                                {relativeDate(s.last_activity_date)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-white/20">Nunca acessou</span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className={cn('flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity', COL.actions)}>
                          <Select
                            value={s.plan_id ? `custom:${s.plan_id}` : 'none'}
                            onValueChange={(v) => handlePlanChange(s, v)}
                            disabled={updatingPlan === s.id}
                          >
                            <SelectTrigger className="h-9 w-36 text-[11px] border-slate-200 dark:border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem plano vinculado</SelectItem>
                              {customPlans.map(p => <SelectItem key={p.id} value={`custom:${p.id}`}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="Ver perfil">
                            <Link href={`/partners/${org.slug}/alunos/${s.id}`}><ExternalLink className="h-4 w-4" /></Link>
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-white/30 dark:hover:bg-rose-950/30"
                            disabled={removing === s.id}
                            onClick={() => handleRemove(s.id, s.full_name)}
                            title="Remover da organização"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Paginação ─────────────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-1 border-t border-slate-100 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Período: <span className="font-semibold">{periodLabel}</span>
                    {' · '}
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 dark:border-white/10" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 dark:border-white/10" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
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
