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
import { ArrowLeft, BookOpen, FileText, Target, Calendar } from 'lucide-react';
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
}

const PLAN_LABELS: Record<string, string> = { b2b_student: 'Básico', b2b_pro: 'Pro' };
const PACE_LABELS: Record<string, string> = { slow: 'Leve', moderate: 'Moderado', intense: 'Intensivo' };

export default function StudentProfilePage() {
  const { org } = useOrg();
  const params = useParams<{ slug: string; id: string }>();
  const studentId = params.id;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      try {
        const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setData(await res.json());
        else toast.error('Aluno não encontrado.');
      } catch {
        toast.error('Erro ao buscar perfil.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [org.slug, studentId]);

  async function handlePlanChange(newPlan: string) {
    if (!data) return;
    setUpdatingPlan(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: newPlan }),
      });
      if (res.ok) {
        setData((d) => d ? { ...d, profile: { ...d.profile, plan_tier: newPlan } } : d);
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
  const initials = (profile?.full_name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

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
        <Card>
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
                    <p className="text-sm text-slate-500">{profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {profile?.focus_area ?? 'Geral'}
                      </Badge>
                      {profile?.study_pace && (
                        <Badge variant="outline" className="text-xs">
                          {PACE_LABELS[profile.study_pace] ?? profile.study_pace}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-slate-500">
                    <p>Plano atual</p>
                  </div>
                  <Select
                    value={profile?.plan_tier ?? 'b2b_student'}
                    onValueChange={handlePlanChange}
                    disabled={updatingPlan}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2b_student">Básico</SelectItem>
                      <SelectItem value="b2b_pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Questões hoje', value: metrics?.questions_today, icon: BookOpen },
            { label: 'Semana', value: metrics?.questions_week, icon: BookOpen },
            { label: 'Mês', value: metrics?.questions_month, icon: BookOpen },
            { label: 'Simulados', value: metrics?.simulados_month, icon: FileText },
            { label: 'Acertos%', value: metrics?.accuracy_pct != null ? `${metrics.accuracy_pct}%` : '—', icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-slate-500 leading-tight">{label}</CardTitle>
                <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
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
                          {(s.config as any)?.format ?? 'Simulado'}
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
