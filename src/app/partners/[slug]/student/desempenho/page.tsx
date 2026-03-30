'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target, Trophy, Brain, TrendingUp,
  AlertCircle, BarChart3, Activity, Flame, ArrowUpRight, ArrowLeft, FileText,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    total_questions: number;
    accuracy_percentage: number;
    current_streak: number;
    total_xp: number;
    total_simulados: number;
  };
  performance_by_subject: Array<{
    subject: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  activity_history: Array<{
    usage_date: string;
    questions_count: number;
    simulations_count: number;
    correct_count: number;
  }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesempenhoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAnalytics() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      try {
        const res = await fetch(`${apiUrl}/api/student/analytics/dashboard`, { headers });
        if (res.ok) {
          setData(await res.json());
        } else {
          void reportError('AnalyticsApiError', `HTTP ${res.status}`, { endpoint: 'analytics/dashboard' });
        }
      } catch (error) {
        void reportError('AnalyticsFetchError', String(error), { endpoint: 'analytics/dashboard' });
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-6 md:p-8 space-y-8 animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );

  // ── Error state ──────────────────────────────────────────────────────────────

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <div className="bg-red-50 dark:bg-red-900/40 p-4 rounded-full mb-4">
        <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">Ops! Algo deu errado.</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        Não conseguimos carregar seus dados. Tente recarregar a página.
      </p>
    </div>
  );

  const { overview, performance_by_subject, activity_history } = data;

  // ── Derived values ───────────────────────────────────────────────────────────

  const bestSubject = performance_by_subject.length > 0
    ? performance_by_subject.reduce((prev, curr) => prev.accuracy > curr.accuracy ? prev : curr)
    : null;

  const worstSubject = performance_by_subject.length > 0
    ? performance_by_subject.reduce((prev, curr) => prev.accuracy < curr.accuracy ? prev : curr)
    : null;

  // Top 3 matérias por volume de questões respondidas
  const topByVolume = [...performance_by_subject]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Formatação de data sem offset de timezone
  const chartData = activity_history.map((item) => {
    const parts = item.usage_date.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return {
      date: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      questoes: item.questions_count,
      simulados: item.simulations_count,
      acertos: item.correct_count,
    };
  });

  const getAccuracyColor = (val: number) => {
    if (val >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800';
    if (val >= 60) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800';
    if (val >= 40) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 border-amber-100 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 border-red-100 dark:border-red-800';
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans text-slate-900 dark:text-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <Link
              href={`/partners/${slug}/student/dashboard`}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Meu Desempenho</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Seus dados transformados em estratégia de aprovação.
            </p>
          </div>

          {/* Streak badge */}
          <div
            className="relative overflow-hidden rounded-2xl p-[1px] shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
          >
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-5 py-3 rounded-[15px]">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/40 rounded-lg">
                <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-400 dark:text-orange-300 uppercase tracking-wide">Ofensiva Atual</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-50 leading-none">{overview.current_streak} Dias</p>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-4 flex flex-col gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{overview.total_questions.toLocaleString()}</span> questões
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{overview.total_simulados}</span> simulados
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Questões */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <Target className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{overview.total_questions.toLocaleString()}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Questões Resolvidas</p>
              </div>
            </CardContent>
          </Card>

          {/* Precisão */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl transition-colors ${
                  overview.accuracy_percentage >= 70
                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                }`}>
                  <Activity className="w-6 h-6" />
                </div>
                {overview.accuracy_percentage > 70 && (
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border-0">
                    Excelente
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{overview.accuracy_percentage}%</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Precisão Média</p>
              </div>
            </CardContent>
          </Card>

          {/* XP — mantém fundo neutro escuro */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-white/10 text-yellow-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <Badge className="bg-yellow-400/20 text-yellow-300 border-0 hover:bg-yellow-400/30">XP</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {overview.total_xp.toLocaleString()}{' '}
                  <span className="text-lg text-slate-400 font-normal">XP</span>
                </h3>
                <p className="text-sm font-medium text-slate-300">Experiência Acumulada</p>
              </div>
            </CardContent>
          </Card>

          {/* Simulados Realizados */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{overview.total_simulados}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Simulados Realizados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col: chart + top matérias por volume */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ritmo de Estudos — linha de questões, simulados e acertos */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-50">
                  <Activity className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  Ritmo de Estudos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="questoes"
                        name="Questões"
                        stroke="var(--brand-primary)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="simulados"
                        name="Simulados"
                        stroke="var(--brand-secondary)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="acertos"
                        name="Acertos"
                        stroke="var(--brand-accent)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                    Nenhuma atividade nos últimos 30 dias.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questões por Matéria — top 3 por volume */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-50">
                  <BarChart3 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  Questões por Matéria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {topByVolume.length > 0 ? (
                  <div className="space-y-4">
                    {topByVolume.map((subj, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center text-sm mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{subj.subject}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-2">{subj.total} questões</span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(subj.total / topByVolume[0].total) * 100}%`,
                              backgroundColor: 'var(--brand-primary)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                    Nenhuma questão respondida ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right col: ponto forte, atenção, detalhamento */}
          <div className="space-y-5">

            {/* Ponto Forte + Atenção — suppressed when both resolve to same subject */}
            {bestSubject && worstSubject && bestSubject.subject === worstSubject.subject ? (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Brain className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Em progresso
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Responda mais questões para ver seus pontos fortes e fracos.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Ponto Forte */}
                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border border-emerald-100 dark:border-emerald-800 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                        Ponto Forte
                      </span>
                    </div>
                    {bestSubject ? (
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-50 text-lg truncate" title={bestSubject.subject}>
                          {bestSubject.subject}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Sua melhor matéria até agora
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-2xl font-black text-emerald-600">{bestSubject.accuracy}%</span>
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                            de precisão
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Dados insuficientes.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Atenção */}
                <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 border border-red-100 dark:border-red-800 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">
                        Atenção
                      </span>
                    </div>
                    {worstSubject ? (
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-50 text-lg truncate" title={worstSubject.subject}>
                          {worstSubject.subject}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-black text-red-600">{worstSubject.accuracy}%</span>
                          <span className="text-xs text-red-700 dark:text-red-400 font-medium bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded">
                            de precisão
                          </span>
                        </div>
                        <div className="mt-3 text-xs flex items-center gap-1 text-red-600 dark:text-red-400 font-medium cursor-pointer hover:underline">
                          <ArrowUpRight className="w-3 h-3" /> Praticar mais
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Dados insuficientes.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Detalhamento por Matéria */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-50">
                  <Brain className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  Detalhamento por Matéria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-5">
                  {performance_by_subject.length > 0 ? (
                    performance_by_subject.slice(0, 5).map((subj, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {subj.subject}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getAccuracyColor(subj.accuracy)}`}>
                            {subj.accuracy}%
                          </span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${subj.accuracy}%`,
                              backgroundColor: subj.accuracy >= 70 ? 'var(--brand-primary)' : '#94a3b8',
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">
                          {subj.correct} acertos em {subj.total}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Brain className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma matéria estudada ainda.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
