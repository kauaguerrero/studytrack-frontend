'use client';

import { useEffect, useState, useCallback } from 'react';
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
  BookOpen, FileText, CalendarDays, Users, TrendingUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { brtDateDaysAgo, toBrtDateKey } from '@/lib/brt-date';

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
  simulados_month: number;
  accuracy_pct: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type SortField = 'last_activity_date' | 'full_name' | 'joined_organization_at';

interface PlanOption {
  id: string;
  name: string;
  is_active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StudentAvatar({ student, size = 'md' }: { student: Student; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initial = (student.full_name || student.email || '?')[0].toUpperCase();

  if (student.avatar_url) {
    return (
      <Image
        src={student.avatar_url}
        alt={student.full_name}
        width={size === 'sm' ? 32 : 40}
        height={size === 'sm' ? 32 : 40}
        className={cn(sz, 'rounded-full object-cover shrink-0')}
      />
    );
  }

  return (
    <div
      className={cn(
        sz,
        'rounded-full flex items-center justify-center font-black text-white shrink-0',
      )}
      style={{
        background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))`,
      }}
    >
      {initial}
    </div>
  );
}

function MetricChip({ icon: Icon, value, label, highlight }: {
  icon: React.ElementType;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
      highlight && value > 0
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    )}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="tabular-nums">{value}</span>
      <span className="text-[10px] font-medium opacity-70">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlunosPage() {
  const { org } = useOrg();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [sort, setSort] = useState<SortField>('last_activity_date');
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [customPlans, setCustomPlans] = useState<PlanOption[]>([]);

  const today = toBrtDateKey(new Date());

  const fetchStudents = useCallback(async (p: number, s: string, plan: string, sortField: SortField) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      sort: sortField,
      order: 'desc',
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
          if (plan === 'none') {
            list = list.filter((s) => !s.plan_id);
          } else if (plan.startsWith('custom:')) {
            const customId = plan.replace('custom:', '');
            list = list.filter((s) => s.plan_id === customId);
          }
        }
        setStudents(list);
        setTotal(data.total ?? list.length);
      }
    } catch {
      // Não loga detalhes em produção para evitar information disclosure
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
    } catch {
      // silêncio
    }
  }, [org.slug]);

  useEffect(() => {
    fetchStudents(page, search, planFilter, sort);
  }, [page, search, planFilter, sort, fetchStudents]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
        ? {
            plan_id: newPlanValue.replace('custom:', ''),
            plan_assignment_status: 'active',
            plan_last_payment_at: student.plan_last_payment_at || toBrtDateKey(new Date()),
          }
        : { plan_id: null };
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStudents((prev) => prev.map((s) => {
          if (s.id !== studentId) return s;
          if (newPlanValue.startsWith('custom:')) {
            const customId = newPlanValue.replace('custom:', '');
            const selected = customPlans.find((plan) => plan.id === customId);
            return { ...s, plan_id: customId, plan_name: selected?.name || 'Plano customizado', plan_assignment_status: 'active' };
          }
          if (newPlanValue === 'none') {
            return { ...s, plan_id: null, plan_name: null };
          }
          return { ...s, plan_id: null, plan_name: null };
        }));
        toast.success('Plano atualizado.');
      } else {
        toast.error('Erro ao atualizar plano.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingPlan(null);
    }
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
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setTotal((t) => t - 1);
        toast.success(`${name} removido da organização.`);
      } else {
        toast.error('Erro ao remover aluno.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setRemoving(null);
    }
  }

  // Derived
  const activeToday = students.filter(s => s.last_activity_date === today).length;
  const activeWeek  = students.filter(s => s.last_activity_date && s.last_activity_date >= brtDateDaysAgo(7)).length;
  const totalPages  = Math.ceil(total / PAGE_SIZE);

  const weekAgo = brtDateDaysAgo(7);
  const filteredStudents = students.filter((s) => {
    if (activityFilter === 'today') return s.last_activity_date === today;
    if (activityFilter === 'week') return s.last_activity_date != null && s.last_activity_date >= weekAgo;
    if (activityFilter === 'inactive') return s.last_activity_date == null || s.last_activity_date < weekAgo;
    return true;
  });

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas -mx-4 -mt-4 space-y-5 px-4 pt-4 pb-6 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="edificar-page-frame space-y-5 p-3 md:p-4">

        {/* ── Hero Header ───────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 18%, #0f172a) 0%, #0f172a 70%)',
          }}
        >
          <div
            className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'var(--brand-primary)' }}
          />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                Gestão de Turma
              </p>
              <h1 className="text-2xl font-extrabold text-white">Alunos</h1>
              <p className="text-sm text-white/50 mt-0.5">
                {loading ? '...' : `${total} de ${org.max_students} vagas utilizadas`}
              </p>

              {/* Barra de capacidade */}
              {!loading && (
                <div className="mt-2 w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.round((total / (org.max_students ?? 1)) * 100))}%`,
                      background: 'var(--brand-primary)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Mini KPIs */}
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-white tabular-nums">{loading ? '—' : activeToday}</p>
                <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">Ativos hoje</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-black text-white tabular-nums">{loading ? '—' : activeWeek}</p>
                <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">Ativos na semana</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-black text-white tabular-nums">{loading ? '—' : total}</p>
                <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">Total de alunos</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <div className="edificar-major-surface rounded-2xl border p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              onBlur={() => { setSearch(searchInput); setPage(1); }}
            />
          </div>
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="none">Sem plano vinculado</SelectItem>
              {customPlans.map((plan) => (
                <SelectItem key={plan.id} value={`custom:${plan.id}`}>{plan.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Atividade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer atividade</SelectItem>
              <SelectItem value="today">Ativos hoje</SelectItem>
              <SelectItem value="week">Ativos esta semana</SelectItem>
              <SelectItem value="inactive">Inativos há +7 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => { setSort(v as SortField); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_activity_date">Últ. atividade</SelectItem>
              <SelectItem value="full_name">Nome A–Z</SelectItem>
              <SelectItem value="joined_organization_at">Data de entrada</SelectItem>
            </SelectContent>
          </Select>
          <Button
            asChild
            className="text-white gap-2 shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Link href={`/partners/${org.slug}/alunos/convidar`}>
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Link>
          </Button>
          </div>
        </div>

        {/* ── Lista de Alunos ───────────────────────────────────────────────── */}
        <div className="edificar-major-surface space-y-2 rounded-2xl border p-3 sm:p-4">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
              />
            ))
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {search ? `Nenhum aluno encontrado para "${search}".` : 'Nenhum aluno cadastrado ainda.'}
              </p>
              {!search && (
                <Button asChild className="mt-4 text-white gap-2" style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <Link href={`/partners/${org.slug}/alunos/convidar`}>
                    <UserPlus className="h-4 w-4" /> Importar alunos
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isOnline = s.last_activity_date === today;
              const accuracyGood = s.accuracy_pct != null && s.accuracy_pct >= 60;

              return (
                <div
                  key={s.id}
                  className={cn(
                    'group flex items-center gap-4 rounded-2xl px-4 py-3.5',
                    'edificar-soft-surface',
                    'border border-slate-100 dark:border-slate-800',
                    'shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700',
                    'transition-all duration-200',
                  )}
                >
                  {/* Avatar + online dot */}
                  <div className="relative shrink-0">
                    <StudentAvatar student={s} />
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      </span>
                    )}
                  </div>

                  {/* Nome + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/partners/${org.slug}/alunos/${s.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:underline truncate"
                        style={{ color: undefined }}
                      >
                        {s.full_name || '—'}
                      </Link>
                      {/* Plan badge */}
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
                          s.plan_id || s.plan_tier === 'b2b_pro'
                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                        )}
                      >
                        {s.plan_name || 'Sem plano vinculado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{s.email}</p>
                    {s.essay_credits_limit != null && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Créditos: {s.essay_credits_remaining ?? '∞'} / {s.essay_credits_limit} {s.essay_credits_period === 'week' ? 'semana' : 'mês'}
                      </p>
                    )}
                  </div>

                  {/* Métricas — ocultas em mobile */}
                  <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                    <MetricChip icon={BookOpen} value={s.questions_today} label="questões hoje" highlight />
                    <MetricChip icon={TrendingUp} value={s.questions_week} label="questões esta semana" highlight={s.questions_week > 0} />
                    <MetricChip icon={FileText} value={s.simulados_month} label="simulados no mês" />
                  </div>

                  {/* Acertos */}
                  <div className="hidden lg:block w-14 text-center shrink-0">
                    {s.accuracy_pct != null ? (
                      <span
                        className={cn(
                          'text-sm font-black tabular-nums',
                          accuracyGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
                        )}
                      >
                        {s.accuracy_pct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">acertos</p>
                  </div>

                  {/* Última atividade */}
                  <div className="hidden xl:flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {s.last_activity_date ?? 'Nunca'}
                  </div>

                  {/* Ações — sempre visíveis em touch, surgem no hover em desktop */}
                  <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                    {/* Mudar plano */}
                    {(() => {
                      const selectedPlanValue = s.plan_id ? `custom:${s.plan_id}` : 'none';
                      return (
                    <Select
                      value={selectedPlanValue}
                      onValueChange={(v) => handlePlanChange(s, v)}
                      disabled={updatingPlan === s.id}
                    >
                      <SelectTrigger className="h-9 w-36 text-[11px] border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem plano vinculado</SelectItem>
                        {customPlans.map((plan) => (
                          <SelectItem key={plan.id} value={`custom:${plan.id}`}>{plan.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      );
                    })()}

                    <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="Ver perfil">
                      <Link href={`/partners/${org.slug}/alunos/${s.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      disabled={removing === s.id}
                      onClick={() => handleRemove(s.id, s.full_name)}
                      title="Remover da organização"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Paginação ─────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        </div>
      </div>
    </PartnerLayout>
  );
}
