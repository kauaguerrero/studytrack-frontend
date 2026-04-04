'use client';

import { FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CalendarClock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';

interface CustomPlan {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  duration_days: number;
  credits_limit: number;
  credits_period: 'week' | 'month';
  is_active: boolean | string | number | null;
  students_total: number;
}

interface StudentItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  plan_tier: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_assignment_status?: 'active' | 'inactive' | null;
  plan_last_payment_at?: string | null;
  plan_duration_days?: number | null;
  essay_credits_limit?: number | null;
  essay_credits_period?: 'week' | 'month' | null;
  essay_credits_used?: number | null;
  essay_credits_remaining?: number | null;
}

interface DraftAssignment {
  planValue: string;
  paymentDate: string;
  dirty: boolean;
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function isPlanActive(value: CustomPlan['is_active']): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function hasActivePlanByDates(student: StudentItem): boolean {
  if (!student.plan_id) return false;
  if (student.plan_assignment_status !== 'active') return false;
  const durationDays = Number(student.plan_duration_days || 0);
  if (durationDays <= 0) return false;
  const lastPayment = parseIsoDate(student.plan_last_payment_at);
  if (!lastPayment) return false;
  const expiresAt = new Date(lastPayment.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return Date.now() <= expiresAt.getTime();
}

function getDaysUntilExpiry(student: StudentItem): number | null {
  if (!student.plan_id || student.plan_assignment_status !== 'active') return null;
  const durationDays = Number(student.plan_duration_days || 0);
  if (durationDays <= 0) return null;
  const lastPayment = parseIsoDate(student.plan_last_payment_at);
  if (!lastPayment) return null;
  const expiryMs = lastPayment.getTime() + durationDays * 24 * 60 * 60 * 1000;
  return Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function PartnerPlansPage() {
  const { org } = useOrg();
  const searchParams = useSearchParams();
  const focusExpiring = searchParams.get('expiring') === '1';
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [savingAllLinks, setSavingAllLinks] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceReais, setPriceReais] = useState('0');
  const [durationDays, setDurationDays] = useState('30');
  const [creditsLimit, setCreditsLimit] = useState('4');
  const [creditsPeriod, setCreditsPeriod] = useState<'week' | 'month'>('month');
  const [studentSearch, setStudentSearch] = useState('');
  const deferredStudentSearch = useDeferredValue(studentSearch);

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

  const getAccessToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const loadData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const [plansRes, studentsRes] = await Promise.all([
        fetch(`${api}/api/partners/${org.slug}/plans?include_inactive=true`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${api}/api/partners/${org.slug}/students?limit=100&page=1&sort=full_name&order=asc`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (plansRes.ok) {
        const payload = await plansRes.json();
        setPlans(Array.isArray(payload?.items) ? payload.items : []);
      }

      if (studentsRes.ok) {
        const firstPayload = await studentsRes.json();
        const firstStudents = Array.isArray(firstPayload?.students) ? firstPayload.students : [];
        const total = Number(firstPayload?.total || firstStudents.length);
        const pageSize = Number(firstPayload?.limit || 100);
        const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

        if (totalPages <= 1) {
          setStudents(firstStudents);
        } else {
          const pageFetches: Promise<Response>[] = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageFetches.push(
              fetch(`${api}/api/partners/${org.slug}/students?limit=100&page=${page}&sort=full_name&order=asc`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
            );
          }
          const responses = await Promise.all(pageFetches);
          const extras: StudentItem[] = [];
          for (const response of responses) {
            if (!response.ok) continue;
            const payload = await response.json().catch(() => null);
            if (Array.isArray(payload?.students)) extras.push(...payload.students);
          }
          setStudents([...firstStudents, ...extras]);
        }
      }
    } catch {
      toast.error('Não foi possível carregar os planos.');
    } finally {
      setLoading(false);
    }
  }, [api, getAccessToken, org.slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setDraftAssignments((prev) => {
      const next: Record<string, DraftAssignment> = {};
      for (const student of students) {
        const existing = prev[student.id];
        const selectedValue = student.plan_id || 'none';
        const paymentDate = toInputDate(student.plan_last_payment_at);
        next[student.id] = existing
          ? existing
          : { planValue: selectedValue, paymentDate, dirty: false };
      }
      return next;
    });
  }, [students]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(isPlanActive(b.is_active)) - Number(isPlanActive(a.is_active)) || a.name.localeCompare(b.name)),
    [plans],
  );

  const activePlans = useMemo(() => sortedPlans.filter((plan) => isPlanActive(plan.is_active)).length, [sortedPlans]);
  const activePlanStudents = useMemo(() => students.filter((s) => hasActivePlanByDates(s)).length, [students]);
  const expiringStudents = useMemo(() => (
    students
      .map((student) => {
        const daysLeft = getDaysUntilExpiry(student);
        if (daysLeft === null || daysLeft < 0 || daysLeft > 7) return null;
        return { student, daysLeft };
      })
      .filter((item): item is { student: StudentItem; daysLeft: number } => Boolean(item))
      .sort((a, b) => a.daysLeft - b.daysLeft)
  ), [students]);
  const expiringStudentIdSet = useMemo(
    () => new Set(expiringStudents.map((item) => item.student.id)),
    [expiringStudents],
  );

  const filteredStudents = useMemo(() => {
    const term = deferredStudentSearch.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => {
      const nameMatch = student.full_name?.toLowerCase().includes(term);
      const emailMatch = student.email?.toLowerCase().includes(term);
      const planMatch = (student.plan_name || '').toLowerCase().includes(term);
      return Boolean(nameMatch || emailMatch || planMatch);
    });
  }, [students, deferredStudentSearch]);

  const prioritizedFilteredStudents = useMemo(() => (
    [...filteredStudents].sort((a, b) => {
      const aExpiring = expiringStudentIdSet.has(a.id) ? 1 : 0;
      const bExpiring = expiringStudentIdSet.has(b.id) ? 1 : 0;
      if (aExpiring !== bExpiring) return bExpiring - aExpiring;
      return (a.full_name || '').localeCompare(b.full_name || '');
    })
  ), [filteredStudents, expiringStudentIdSet]);

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = await getAccessToken();
    if (!token || savingPlan) return;

    const priceCents = Math.round(Number(priceReais.replace(',', '.')) * 100);
    const duration = Number(durationDays);
    const credits = Number(creditsLimit);

    if (!name.trim()) {
      toast.error('Informe o nome do plano.');
      return;
    }
    if (
      Number.isNaN(priceCents)
      || priceCents < 0
      || Number.isNaN(duration)
      || duration <= 0
      || Number.isNaN(credits)
      || credits < 0
    ) {
      toast.error('Verifique preço, duração e créditos.');
      return;
    }

    setSavingPlan(true);
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          duration_days: duration,
          credits_limit: credits,
          credits_period: creditsPeriod,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao criar plano.');
      }

      toast.success('Plano criado.');
      setName('');
      setDescription('');
      setPriceReais('0');
      setDurationDays('30');
      setCreditsLimit('4');
      setCreditsPeriod('month');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar plano.');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm('Excluir este plano e desvincular os alunos dele?')) return;
    const token = await getAccessToken();
    if (!token) return;

    setDeletingPlanId(planId);
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao remover plano.');
      }
      toast.success('Plano removido.');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover plano.');
    } finally {
      setDeletingPlanId(null);
    }
  }

  const handleAssignPlan = useCallback(async (student: StudentItem, selectedValue: string, paymentDate: string) => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const body = {
        plan_id: selectedValue === 'none' ? null : selectedValue,
        plan_assignment_status: selectedValue === 'none' ? null : 'active',
        plan_last_payment_at: selectedValue === 'none' ? null : (paymentDate || null),
      };

      const res = await fetch(`${api}/api/partners/${org.slug}/students/${student.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao atualizar plano do aluno.');
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar plano do aluno.');
      return false;
    } finally {
      // noop
    }
  }, [api, getAccessToken, org.slug]);

  const dirtyCount = useMemo(
    () => Object.values(draftAssignments).filter((draft) => draft.dirty).length,
    [draftAssignments],
  );

  const saveAllAssignments = useCallback(async () => {
    if (dirtyCount === 0 || savingAllLinks) return;
    setSavingAllLinks(true);
    try {
      const dirtyStudents = students.filter((student) => draftAssignments[student.id]?.dirty);
      let okCount = 0;
      for (const student of dirtyStudents) {
        const draft = draftAssignments[student.id];
        if (!draft) continue;
        const ok = await handleAssignPlan(student, draft.planValue, draft.paymentDate);
        if (ok) okCount += 1;
      }
      if (okCount > 0) {
        toast.success(`${okCount} vínculo(s) atualizado(s).`);
        setDraftAssignments({});
        await loadData();
      }
      if (okCount < dirtyStudents.length) {
        toast.error(`Alguns vínculos falharam (${okCount}/${dirtyStudents.length}).`);
      }
    } finally {
      setSavingAllLinks(false);
    }
  }, [dirtyCount, savingAllLinks, students, draftAssignments, handleAssignPlan, loadData]);

  const markStudentAsPaid = useCallback(async (student: StudentItem) => {
    if (!student.plan_id || markingPaidId) return;
    const todayDate = new Date().toISOString().slice(0, 10);
    setMarkingPaidId(student.id);
    try {
      const ok = await handleAssignPlan(student, student.plan_id, todayDate);
      if (!ok) return;
      setDraftAssignments((prev) => ({
        ...prev,
        [student.id]: {
          planValue: student.plan_id || 'none',
          paymentDate: todayDate,
          dirty: false,
        },
      }));
      toast.success(`Pagamento atualizado para ${student.full_name}.`);
      await loadData();
    } finally {
      setMarkingPaidId(null);
    }
  }, [handleAssignPlan, loadData, markingPaidId]);

  const studentAssignmentRows = useMemo(() => (
    prioritizedFilteredStudents.map((student) => {
      const selectedValue = draftAssignments[student.id]?.planValue ?? student.plan_id ?? 'none';
      const currentPaymentDate = draftAssignments[student.id]?.paymentDate ?? toInputDate(student.plan_last_payment_at);
      const rowDirty = !!draftAssignments[student.id]?.dirty;
      const rowExpiring = expiringStudentIdSet.has(student.id);
      const avatarInitials = (student.full_name || student.email || 'A')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

      return (
        <article
          key={student.id}
          className={cn(
            'rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:p-4',
            rowExpiring && 'border-amber-300 bg-amber-50/70 dark:border-amber-500/60 dark:bg-amber-900/10',
          )}
        >
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              {student.avatar_url ? (
                <Image
                  src={student.avatar_url}
                  alt={student.full_name || 'Aluno'}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
                >
                  {avatarInitials}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              {student.plan_name || 'Sem plano vinculado'}
            </Badge>
            {rowDirty && (
              <Badge className="w-fit border-transparent text-white" style={{ backgroundColor: 'var(--brand-secondary)' }}>
                Alteração pendente
              </Badge>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Coins className="h-3 w-3" />
              Créditos: {student.essay_credits_remaining ?? '∞'} / {student.essay_credits_limit ?? '∞'} {student.essay_credits_period === 'week' ? 'semana' : 'mês'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CalendarClock className="h-3 w-3" />
              Últ. pagamento: {currentPaymentDate || 'não informado'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(200px,1fr)_170px_auto] md:items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plano do aluno</label>
              <Select
                value={selectedValue}
                onValueChange={(value) => {
                  setDraftAssignments((prev) => ({
                    ...prev,
                    [student.id]: {
                      planValue: value,
                      paymentDate: prev[student.id]?.paymentDate ?? currentPaymentDate,
                      dirty: true,
                    },
                  }));
                }}
                disabled={savingAllLinks}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano vinculado</SelectItem>
                  {sortedPlans.filter((p) => isPlanActive(p.is_active)).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Data do último pagamento</label>
              <Input
                type="date"
                value={currentPaymentDate}
                className="h-11"
                onChange={(e) => {
                  setDraftAssignments((prev) => ({
                    ...prev,
                    [student.id]: {
                      planValue: prev[student.id]?.planValue ?? selectedValue,
                      paymentDate: e.target.value,
                      dirty: true,
                    },
                  }));
                }}
                disabled={savingAllLinks || selectedValue === 'none'}
              />
            </div>

            <div className="h-11 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              As alterações desta linha serão enviadas no botão “Salvar todos os vínculos”.
            </div>
          </div>
        </article>
      );
    })
  ), [prioritizedFilteredStudents, sortedPlans, draftAssignments, savingAllLinks, expiringStudentIdSet]);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <section
          className="relative overflow-hidden rounded-2xl border p-5 shadow-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-primary) 34%, #e2e8f0)',
            background: 'linear-gradient(130deg, color-mix(in srgb, var(--brand-primary) 14%, white) 0%, color-mix(in srgb, var(--brand-secondary) 12%, white) 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              background: 'linear-gradient(130deg, color-mix(in srgb, var(--brand-primary) 22%, #0f172a) 0%, color-mix(in srgb, var(--brand-secondary) 18%, #0f172a) 100%)',
            }}
          />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--brand-secondary) 35%, transparent)' }} />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  color: 'var(--brand-primary)',
                  borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--brand-primary) 10%, white)',
                }}
              >
                <WalletCards className="h-3.5 w-3.5" />
                Gestão de Planos
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Planos e Créditos de Redação</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Organize seus planos, defina quantas redações cada aluno pode enviar e acompanhe tudo em um só lugar.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center md:min-w-[360px]">
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <p className="text-xl font-black text-slate-900">{sortedPlans.length}</p>
                <p className="text-[11px] font-semibold text-slate-500">Planos totais</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <p className="text-xl font-black" style={{ color: 'var(--brand-primary)' }}>{activePlans}</p>
                <p className="text-[11px] font-semibold text-slate-500">Planos ativos</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <p className="text-xl font-black" style={{ color: 'var(--brand-secondary)' }}>{activePlanStudents}</p>
                <p className="text-[11px] font-semibold text-slate-500">Alunos com plano ativo</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <form onSubmit={handleCreatePlan} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Criar novo plano</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Preencha os campos abaixo. Os alunos poderão ser vinculados na seção seguinte.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome do plano</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Plano Intensivo ENEM"
                required
                className="h-11"
              />
              <p className="text-[11px] text-slate-500">Nome que aparecerá no dashboard, alunos e redações.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição do plano</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Acompanhamento semanal com 2 correções prioritárias"
                className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">Texto opcional para detalhar o que o plano inclui.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor (R$)</label>
                <Input value={priceReais} onChange={(e) => setPriceReais(e.target.value)} type="number" min={0} step="0.01" className="h-11" />
                <p className="text-[11px] text-slate-500">Preço mensal/ciclo do plano.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duração (dias)</label>
                <Input value={durationDays} onChange={(e) => setDurationDays(e.target.value)} type="number" min={1} step={1} className="h-11" />
                <p className="text-[11px] text-slate-500">Tempo de validade do plano.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Créditos de redação</label>
                <Input value={creditsLimit} onChange={(e) => setCreditsLimit(e.target.value)} type="number" min={0} step={1} className="h-11" />
                <p className="text-[11px] text-slate-500">Quantidade máxima de envios por período.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Período dos créditos</label>
                <Select value={creditsPeriod} onValueChange={(v: 'week' | 'month') => setCreditsPeriod(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semanal</SelectItem>
                    <SelectItem value="month">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">Define quando o contador de créditos reinicia.</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingPlan}
              className="h-11 w-full text-white sm:w-auto"
              style={{ background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {savingPlan ? 'Criando plano...' : 'Criar plano'}
            </Button>
          </form>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Planos cadastrados</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Visualize preço, créditos e quantidade de alunos em cada plano.</p>
              </div>
              <Badge
                className="border-transparent px-3 py-1 text-white"
                style={{ background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
              >
                {sortedPlans.length} plano(s)
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : sortedPlans.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Nenhum plano customizado ainda. Crie o primeiro plano usando o formulário ao lado.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedPlans.map((plan) => (
                  <article key={plan.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description || 'Sem descrição'}</p>
                      </div>
                      <Badge variant={isPlanActive(plan.is_active) ? 'default' : 'secondary'}>
                        {isPlanActive(plan.is_active) ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
                        <p className="text-slate-500">Valor</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(plan.price_cents)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
                        <p className="text-slate-500">Duração</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.duration_days} dias</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
                        <p className="text-slate-500">Créditos</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.credits_limit}/{plan.credits_period === 'week' ? 'semana' : 'mês'}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
                        <p className="text-slate-500">Alunos</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.students_total}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 h-10 w-full justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={deletingPlanId === plan.id}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {deletingPlanId === plan.id ? 'Removendo...' : 'Remover plano'}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {expiringStudents.length > 0 && (
            <div
              className={cn(
                'rounded-2xl border p-3 md:p-4',
                'border-amber-300 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-900/15',
                focusExpiring && 'ring-2 ring-amber-300/80 dark:ring-amber-500/60',
              )}
            >
              <div className="mb-3 flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Alunos próximos do vencimento ({expiringStudents.length})
                  </p>
                  <p className="text-xs text-amber-800/85 dark:text-amber-200/80">
                    Marque como pago para renovar automaticamente a vigência do plano.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {expiringStudents.map(({ student, daysLeft }) => (
                  <div
                    key={`expiring-${student.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-amber-300/70 bg-white/80 p-3 dark:border-amber-500/40 dark:bg-slate-950/50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {student.plan_name || 'Plano'} • vence {daysLeft === 0 ? 'hoje' : `em ${daysLeft} dia(s)`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void markStudentAsPaid(student)}
                      disabled={markingPaidId === student.id}
                      className="h-9 border-0 text-white"
                      style={{ background: 'linear-gradient(90deg, #16a34a, #22c55e)' }}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {markingPaidId === student.id ? 'Atualizando...' : 'Pago'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Vincular alunos aos planos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha o plano de cada aluno e defina a data do último pagamento para controle administrativo.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar aluno por nome, email ou plano"
                className="h-10 md:w-72"
              />
              <Button
                type="button"
                className="h-10 text-white"
                style={{ background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
                disabled={savingAllLinks || dirtyCount === 0}
                onClick={() => void saveAllAssignments()}
              >
                {savingAllLinks ? 'Sincronizando...' : `Salvar todos os vínculos${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
              </Button>
            </div>
          </div>

          <div className="space-y-2">{studentAssignmentRows}</div>

          {filteredStudents.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nenhum aluno encontrado para o filtro aplicado.
            </div>
          )}
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-slate-100">1. Nome do plano</p>
            <p>Use um título claro: ex. &quot;Mensal 4 Redações&quot;.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-slate-100">2. Créditos e período</p>
            <p>Define o limite de envios por semana ou por mês.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-slate-100">3. Vínculo de alunos</p>
            <p>Selecione o plano e registre a data do último pagamento.</p>
          </div>
        </section>
      </div>
    </PartnerLayout>
  );
}
