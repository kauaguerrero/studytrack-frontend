'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Activity, BookOpen, FileText, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface OrgStats {
  total_students: number;
  active_today: number;
  active_week: number;
  questions_week: number;
  simulados_month: number;
  plan_distribution: Record<string, number>;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  plan_tier: string;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  simulados_month: number;
  accuracy_pct: number | null;
}

const PLAN_LABELS: Record<string, string> = {
  b2b_student: 'Básico',
  b2b_pro: 'Pro',
};

const PLAN_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'];

function KpiCard({
  title, value, subtitle, icon: Icon, href, loading,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className={href ? 'hover:border-[var(--brand-primary)] transition-colors cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        )}
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        {href && (
          <p className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: 'var(--brand-primary)' }}>
            Ver detalhes <ArrowUpRight className="h-3 w-3" />
          </p>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function FounderDashboard() {
  const { org } = useOrg();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

      try {
        const [resStats, resStudents] = await Promise.all([
          fetch(`${api}/api/partners/${org.slug}/stats`, { headers }),
          fetch(`${api}/api/partners/${org.slug}/students?limit=10&sort=last_activity_date`, { headers }),
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resStudents.ok) {
          const data = await resStudents.json();
          setStudents(data.students ?? []);
        }
      } catch (err) {
        console.error('[PartnerDashboard] erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [org.slug]);

  // Dados para o gráfico de distribuição de planos
  const planChartData = stats
    ? Object.entries(stats.plan_distribution).map(([key, count]) => ({
        name: PLAN_LABELS[key] ?? key,
        value: count,
      }))
    : [];

  // Top 5 alunos mais ativos (questões na semana)
  const topStudents = [...students]
    .sort((a, b) => b.questions_week - a.questions_week)
    .slice(0, 5);

  const activeRate = stats
    ? Math.round((stats.active_week / Math.max(stats.total_students, 1)) * 100)
    : 0;

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Visão geral de {org.name}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {org.plan_tier === 'b2b_pro' ? 'Plano Pro' : 'Plano Básico'}
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            title="Alunos Cadastrados"
            value={stats?.total_students ?? '—'}
            subtitle={`de ${org.max_students} vagas`}
            icon={Users}
            href={`/partners/${org.slug}/alunos`}
            loading={loading}
          />
          <KpiCard
            title="Ativos na Semana"
            value={stats?.active_week ?? '—'}
            subtitle={`${activeRate}% do total`}
            icon={Activity}
            loading={loading}
          />
          <KpiCard
            title="Questões esta Semana"
            value={stats?.questions_week ?? '—'}
            subtitle="respondidas pela turma"
            icon={BookOpen}
            loading={loading}
          />
          <KpiCard
            title="Simulados este Mês"
            value={stats?.simulados_month ?? '—'}
            subtitle="realizados pela turma"
            icon={FileText}
            loading={loading}
          />
        </div>

        {/* Gráficos + Top alunos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Distribuição de planos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição de Planos</CardTitle>
              <CardDescription>Alunos por tipo de acesso</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : planChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={planChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {planChartData.map((_, i) => (
                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} alunos`]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-slate-400 py-10">Nenhum aluno ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Top alunos — questões na semana */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Mais Ativos esta Semana</CardTitle>
                <CardDescription>Questões respondidas por aluno</CardDescription>
              </div>
              <Link
                href={`/partners/${org.slug}/alunos`}
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : topStudents.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">Nenhum aluno ativo ainda</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topStudents} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="full_name"
                      width={110}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.split(' ')[0]}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} questões`, 'Semana']}
                      labelFormatter={(l) => l}
                    />
                    <Bar dataKey="questions_week" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela resumida — últimos alunos ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Atividade Recente
              </CardTitle>
              <CardDescription>Últimos alunos ativos</CardDescription>
            </div>
            <Link
              href={`/partners/${org.slug}/alunos`}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: 'var(--brand-primary)' }}
            >
              Ver tabela completa <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                Nenhum aluno cadastrado ainda.{' '}
                <Link href={`/partners/${org.slug}/alunos/convidar`} className="underline" style={{ color: 'var(--brand-primary)' }}>
                  Importar alunos
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="pb-2 font-medium">Aluno</th>
                      <th className="pb-2 font-medium text-center">Plano</th>
                      <th className="pb-2 font-medium text-center">Q/semana</th>
                      <th className="pb-2 font-medium text-center">Simulados</th>
                      <th className="pb-2 font-medium text-center">Acertos%</th>
                      <th className="pb-2 font-medium text-center">Últ. atividade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5">
                          <Link
                            href={`/partners/${org.slug}/alunos/${s.id}`}
                            className="font-medium text-slate-900 dark:text-white hover:underline"
                          >
                            {s.full_name || '—'}
                          </Link>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant="outline" className="text-xs">
                            {PLAN_LABELS[s.plan_tier] ?? s.plan_tier}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-center font-medium">{s.questions_week}</td>
                        <td className="py-2.5 text-center">{s.simulados_month}</td>
                        <td className="py-2.5 text-center">
                          {s.accuracy_pct != null ? (
                            <span className={s.accuracy_pct >= 60 ? 'text-emerald-600' : 'text-rose-500'}>
                              {s.accuracy_pct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 text-center text-xs text-slate-500">
                          {s.last_activity_date ?? 'Nunca'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
