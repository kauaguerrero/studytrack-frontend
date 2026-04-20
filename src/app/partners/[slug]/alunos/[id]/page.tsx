'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, BookOpen, FileText, Target } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

interface StudentDetail {
  profile: {
    id: string;
    full_name: string;
    email: string;
    plan_tier: string;
    plan_id?: string | null;
    plan_name?: string | null;
    plan_assignment_status?: 'active' | 'inactive' | null;
    plan_last_payment_at?: string | null;
    last_activity_date: string | null;
    joined_organization_at: string | null;
    avatar_url: string | null;
    focus_area: string | null;
    study_pace: string | null;
    hours_per_day: number | null;
    days_per_week: number | null;
  };
  metrics: {
    questions_today: number;
    questions_week: number;
    questions_month: number;
    simulados_month: number;
    accuracy_pct: number | null;
  };
  subject_breakdown: { subject: string; total: number; correct: number; accuracy_pct: number }[];
  weekly_evolution: { week_start: string; total: number; accuracy_pct: number }[];
  recent_answers: { id: string; question_id: string; selected_option: string; is_correct: boolean; subject: string; created_at: string }[];
  recent_simulados: { id: string; config: Record<string, unknown>; score: number; total_questions: number; tri_score: number | null; time_taken_secs: number; completed_at: string }[];
  essay_stats?: {
    delivered_count: number;
    corrected_count: number;
    avg_score: number | null;
  };
  essay_evolution?: {
    id: string;
    status: 'pending' | 'corrected' | 'seen';
    submitted_at: string;
    corrected_at: string | null;
    total_score: number | null;
  }[];
}

interface StudentEssayListItem {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  theme: string | null;
}

interface OrgPlanOption {
  id: string;
  name: string;
  is_active: boolean | string | number | null;
}

const PACE_LABELS: Record<string, string> = { slow: 'Leve', moderate: 'Moderado', intense: 'Intensivo' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPlanActive(value: OrgPlanOption['is_active']): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizePlanLabel(raw?: string | null): string {
  const value = String(raw || '').trim().toLowerCase();
  if (!value || value === 'legado' || value === 'legacy' || value === 'b2b_student' || value === 'b2b_pro' || value === 'free' || value === 'none' || value === 'null') {
    return 'Sem plano vinculado';
  }
  return String(raw).trim();
}

export default function StudentProfilePage() {
  const { org } = useOrg();
  const params = useParams<{ slug: string; id: string }>();
  const studentId = params.id;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [fallbackEssayStats, setFallbackEssayStats] = useState<{ delivered: number; corrected: number }>({
    delivered: 0,
    corrected: 0,
  });
  const [studentEssays, setStudentEssays] = useState<StudentEssayListItem[]>([]);
  const [plans, setPlans] = useState<OrgPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      // Rejeita IDs com formato inválido antes de qualquer chamada de rede
      if (!UUID_RE.test(studentId)) {
        toast.error('Aluno não encontrado.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      try {
        const [resProfile, resEssays, resPlans] = await Promise.all([
          fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${api}/api/partners/${org.slug}/essays?status=all&page=1&limit=500`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${api}/api/partners/${org.slug}/plans?include_inactive=false`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        if (resProfile.ok) {
          setData(await resProfile.json());
        } else {
          toast.error('Aluno não encontrado.');
        }

        if (resEssays.ok) {
          const payload = await resEssays.json();
          const items = (payload?.items || []) as Array<{
            id?: string;
            status?: 'pending' | 'corrected' | 'seen';
            student?: { id?: string } | Array<{ id?: string }>;
            student_id?: string;
            submitted_at?: string;
            corrected_at?: string | null;
            total_score?: number | null;
            theme?: string | null;
            essay_theme?: string | null;
            tema?: string | null;
            topic?: string | null;
            title?: string | null;
          }>;
          const fromStudent = items.filter((e) => {
            const studentFromJoin = Array.isArray(e.student) ? e.student[0]?.id : e.student?.id;
            const candidateId = studentFromJoin || e.student_id;
            return candidateId === studentId;
          });

          const normalizedEssays: StudentEssayListItem[] = fromStudent
            .map((e) => {
              const themeCandidates = [e.theme, e.essay_theme, e.tema, e.topic, e.title];
              const themeFound = themeCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || null;
              return {
                id: String(e.id || ''),
                status: e.status || 'pending',
                submitted_at: String(e.submitted_at || ''),
                corrected_at: e.corrected_at ?? null,
                total_score: typeof e.total_score === 'number' ? e.total_score : null,
                theme: themeFound ? themeFound.trim() : null,
              };
            })
            .filter((essay) => Boolean(essay.id && essay.submitted_at))
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

          setStudentEssays(normalizedEssays);

          setFallbackEssayStats({
            delivered: fromStudent.length,
            corrected: fromStudent.filter((e) => e.total_score !== null && e.total_score !== undefined).length,
          });
        }

        if (resPlans.ok) {
          const plansPayload = await resPlans.json().catch(() => null);
          const planItems = Array.isArray(plansPayload?.items) ? plansPayload.items : [];
          setPlans(planItems.filter((plan: OrgPlanOption) => isPlanActive(plan.is_active)));
        }
      } catch {
        toast.error('Erro ao buscar perfil.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [org.slug, studentId]);

  async function handlePlanChange(newPlanId: string) {
    if (!data) return;
    if (!UUID_RE.test(studentId)) return;
    setUpdatingPlan(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const selectedPlan = plans.find((plan) => plan.id === newPlanId);
      const isNone = newPlanId === 'none';
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: isNone ? null : newPlanId,
          plan_assignment_status: isNone ? null : 'active',
          plan_last_payment_at: isNone ? null : new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) {
        setData((d) => d ? {
          ...d,
          profile: {
            ...d.profile,
            plan_id: isNone ? null : newPlanId,
            plan_name: isNone ? null : (selectedPlan?.name || d.profile.plan_name || null),
            plan_assignment_status: isNone ? null : 'active',
            plan_last_payment_at: isNone ? null : new Date().toISOString(),
          },
        } : d);
        toast.success('Plano atualizado.');
      } else {
        toast.error('Erro ao atualizar plano.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingPlan(false);
    }
  }

  const profile = data?.profile;
  const metrics = data?.metrics;
  const essayStats = data?.essay_stats;
  const initials = (profile?.full_name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const focusAndPaceLabel = [
    profile?.focus_area || 'geral',
    profile?.study_pace ? (PACE_LABELS[profile.study_pace] ?? profile.study_pace) : null,
  ].filter(Boolean).join(' ');
  const essayEvolution = data?.essay_evolution || [];
  const correctedEssayEvolution = essayEvolution.filter((e) => e.total_score !== null && e.total_score !== undefined);
  const essayEvolutionChart = correctedEssayEvolution.map((e) => ({
    date: e.submitted_at?.slice(5, 10) || '—',
    score: e.total_score as number,
  }));
  const deliveredCount = Math.max(essayStats?.delivered_count ?? 0, fallbackEssayStats.delivered, essayEvolution.length);
  const correctedCount = Math.max(essayStats?.corrected_count ?? 0, fallbackEssayStats.corrected);
  const selectedPlanValue = profile?.plan_id ?? 'none';
  const currentPlanLabel = profile?.plan_name
    ? normalizePlanLabel(profile.plan_name)
    : (selectedPlanValue !== 'none'
      ? (plans.find((plan) => plan.id === selectedPlanValue)?.name || 'Sem plano vinculado')
      : 'Sem plano vinculado');

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={`/partners/${org.slug}/alunos`}>
            <ArrowLeft className="h-4 w-4" /> Voltar para Alunos
          </Link>
        </Button>

        {/* Header do perfil */}
        <section
          className="relative overflow-hidden rounded-3xl border p-5 shadow-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-primary) 24%, #e5e7eb)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, white) 0%, color-mix(in srgb, var(--brand-secondary) 10%, white) 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 22%, #0f172a) 0%, color-mix(in srgb, var(--brand-secondary) 16%, #0f172a) 100%)' }}
          />
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-60"
            style={{ background: 'color-mix(in srgb, var(--brand-secondary) 54%, transparent)' }}
          />
          <div className="relative z-10 mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              color: 'var(--brand-primary)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 28%, transparent)',
              background: 'color-mix(in srgb, var(--brand-primary) 12%, rgba(255,255,255,0.72))',
            }}
          >
            <Target className="h-3.5 w-3.5" />
            Visão individual do aluno
          </div>
          <Card className="border-white/70 bg-white/88 shadow-none backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ backgroundColor: 'var(--brand-primary)' }}>
                    {profile?.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      : initials}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      {profile?.full_name || 'Aluno'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs border-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] text-slate-700 dark:text-slate-200 dark:border-[color-mix(in_srgb,var(--brand-secondary)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)]">
                        {focusAndPaceLabel}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-slate-500 dark:text-slate-300">
                    <p>Plano atual</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-100">{currentPlanLabel}</p>
                  </div>
                  <Select
                    value={selectedPlanValue}
                    onValueChange={handlePlanChange}
                    disabled={updatingPlan}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano vinculado</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        </section>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Questões hoje', value: metrics?.questions_today, icon: BookOpen },
            { label: 'Semana', value: metrics?.questions_week, icon: BookOpen },
            { label: 'Mês', value: metrics?.questions_month, icon: BookOpen },
            { label: 'Simulados', value: metrics?.simulados_month, icon: FileText },
            { label: 'Acertos%', value: metrics?.accuracy_pct != null ? `${metrics.accuracy_pct}%` : '—', icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <Card
              key={label}
              className="overflow-hidden border-[color:color-mix(in_srgb,var(--brand-primary)_14%,transparent)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),color-mix(in_srgb,var(--brand-primary)_5%,white))]"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-slate-500 leading-tight">{label}</CardTitle>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, white)' }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{value ?? '—'}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Redações */}
        <Card className="border-[color:color-mix(in_srgb,var(--brand-primary)_16%,transparent)]">
          <CardHeader>
            <CardTitle className="text-sm">Redações</CardTitle>
            {!loading && (
              <div className="rounded-xl border p-2.5" style={{ borderColor: 'color-mix(in srgb, var(--brand-primary) 28%, transparent)' }}>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span
                    className="inline-flex items-center rounded-md px-2.5 py-1 text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {deliveredCount} entregues
                  </span>
                  <span className="text-slate-400">•</span>
                  <span
                    className="inline-flex items-center rounded-md px-2.5 py-1 text-white"
                    style={{ backgroundColor: 'var(--brand-secondary)' }}
                  >
                    {correctedCount} corrigidas
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : deliveredCount === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Aluno ainda não entregou redações.</p>
            ) : correctedEssayEvolution.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center">
                <p className="text-sm text-slate-500">Há redações enviadas, mas ainda sem notas corrigidas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg border dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Entregues</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{deliveredCount}</p>
                  </div>
                  <div className="rounded-lg border dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Corrigidas</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{correctedCount}</p>
                  </div>
                  <div className="rounded-lg border dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Média</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {essayStats?.avg_score != null ? `${essayStats.avg_score} / 1000` : '—'}
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={essayEvolutionChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1000]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v} / 1000`, 'Nota']} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--brand-primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[color:color-mix(in_srgb,var(--brand-secondary)_18%,transparent)]">
          <CardHeader>
            <CardTitle className="text-sm">Histórico de redações</CardTitle>
            <CardDescription>Todas as redações enviadas por este aluno</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : studentEssays.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Nenhuma redação encontrada para este aluno.</p>
            ) : (
              <div className="space-y-2">
                {studentEssays.map((essay) => (
                  <Link
                    key={essay.id}
                    href={`/partners/${org.slug}/redacoes/${essay.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-[var(--brand-primary)] hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {essay.theme || 'Tema não informado'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enviada em {essay.submitted_at.slice(0, 10)}
                        {essay.corrected_at ? ` • Corrigida em ${essay.corrected_at.slice(0, 10)}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {essay.total_score !== null && (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {essay.total_score}/1000
                        </span>
                      )}
                      <span
                        className={
                          essay.status === 'pending'
                            ? 'rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : essay.status === 'corrected'
                              ? 'rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }
                      >
                        {essay.status === 'pending' ? 'Pendente' : essay.status === 'corrected' ? 'Corrigida' : 'Arquivada'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução semanal + Acertos por matéria */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evolução de Acertos (4 semanas)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (data?.weekly_evolution?.length ?? 0) === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">Sem dados ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data!.weekly_evolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week_start" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, 'Acertos']} />
                    <Line type="monotone" dataKey="accuracy_pct" stroke="var(--brand-primary)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Acertos por Matéria (mês)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (data?.subject_breakdown?.length ?? 0) === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">Sem dados ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data!.subject_breakdown} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="subject" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Acertos']} />
                    <Bar dataKey="accuracy_pct" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Últimas respostas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimas Respostas</CardTitle>
            <CardDescription>20 mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (data?.recent_answers?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Nenhuma resposta registrada</p>
            ) : (
              <div className="space-y-1.5">
                {data!.recent_answers.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                      {a.subject || '—'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {a.selected_option}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${a.is_correct ? 'border-emerald-300 text-emerald-600' : 'border-rose-300 text-rose-500'}`}
                    >
                      {a.is_correct ? 'Acerto' : 'Erro'}
                    </Badge>
                    <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                      {a.created_at.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos simulados */}
        {(data?.recent_simulados?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimos Simulados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data!.recent_simulados.map((s) => {
                  const pct = Math.round((s.score / s.total_questions) * 100);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl border dark:border-slate-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">
                          {typeof (s.config as { format?: unknown })?.format === 'string'
                            ? (s.config as { format?: string }).format
                            : 'Simulado'}
                        </p>
                        <p className="text-xs text-slate-400">{s.completed_at?.slice(0, 10) ?? '—'}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {s.score}/{s.total_questions}
                        </p>
                        <p className="text-[10px] text-slate-400">questões</p>
                      </div>
                      <div
                        className="text-lg font-black shrink-0 w-14 text-right"
                        style={{ color: pct >= 60 ? 'var(--brand-primary)' : '#f43f5e' }}
                      >
                        {pct}%
                      </div>
                      {s.tri_score != null && (
                        <div className="text-center shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{s.tri_score}</p>
                          <p className="text-[10px] text-slate-400">TRI</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PartnerLayout>
  );
}
