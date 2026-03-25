"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { reportError } from "@/lib/reportError";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, Trophy, Brain, TrendingUp, 
  Gamepad2, CalendarDays, CheckCircle2, AlertCircle,
  BarChart3, Activity, Clock, Flame, ArrowUpRight
} from "lucide-react";

// Lazy load Recharts (heavy lib ~100kb) - carrega só quando o usuário acessa analytics
const ActivityChart = dynamic(
  () => import("./ActivityChart").then((mod) => ({ default: mod.ActivityChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">
        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando gráfico...</p>
        </div>
      </div>
    ),
  }
);

// Interfaces de Tipagem
interface AnalyticsData {
  overview: {
    total_questions: number;
    accuracy_percentage: number;
    current_streak: number;
    total_xp: number;
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
  }>;
  gaming_stats: {
    total_games: number;
    high_score: number;
    total_playtime_minutes: number;
  };
  goals_summary: {
    total_active: number;
    total_completed: number;
  };
}

export default function StudentAnalyticsPage() {
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
          const jsonData = await res.json();
          setData(jsonData);
        } else {
          void reportError("AnalyticsApiError", `HTTP ${res.status}`, { endpoint: "analytics/dashboard" });
        }
      } catch (error) {
        void reportError("AnalyticsFetchError", String(error), { endpoint: "analytics/dashboard" });
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  // --- LOADING STATE (SKELETON UI) ---
  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="p-6 md:p-8 space-y-8 animate-pulse">
        <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-64">
            <div className="lg:col-span-2 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            <div className="bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  );

  // --- ERROR STATE ---
  if (!data) return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
        <div className="bg-red-50 dark:bg-red-900/40 p-4 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">Ops! Algo deu errado.</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">Não conseguimos carregar seus dados de performance. Tente recarregar a página ou volte mais tarde.</p>
      </div>
    </div>
  );

  const { overview, performance_by_subject, activity_history, gaming_stats, goals_summary } = data;

  // Lógica de Negócio para KPIs
  const bestSubject = performance_by_subject.length > 0 
    ? performance_by_subject.reduce((prev, current) => (prev.accuracy > current.accuracy) ? prev : current) 
    : null;
    
  const worstSubject = performance_by_subject.length > 0 
    ? performance_by_subject.reduce((prev, current) => (prev.accuracy < current.accuracy) ? prev : current) 
    : null;

  // Formatação Robusta de Data (Evita Timezone offset do JS)
  const chartData = activity_history.map(item => {
    // "2025-01-24" -> [2025, 01, 24]
    const parts = item.usage_date.split('-'); 
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    return {
        date: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        questions: item.questions_count,
        fullDate: dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    };
  });

  // Helper para cores de precisão
  const getAccuracyColor = (val: number) => {
    if (val >= 80) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800";
    if (val >= 60) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800";
    if (val >= 40) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 border-amber-100 dark:border-amber-800";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 border-red-100 dark:border-red-800";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background font-sans text-slate-900 dark:text-slate-50">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 px-3 py-1 text-xs uppercase tracking-wider font-semibold shadow-sm">
                    Dashboard do Aluno
                </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Performance Global
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                Seus dados transformados em estratégia de aprovação.
            </p>
        </div>

        {/* Streak Badge - Gamification Trigger */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-[1px] shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
            <div className="relative flex items-center gap-3 bg-white dark:bg-slate-900 px-5 py-3 rounded-[15px]">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/40 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Flame className="w-6 h-6 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
                </div>
                <div>
                    <p className="text-xs font-bold text-orange-400 dark:text-orange-300 uppercase tracking-wide">Ofensiva Atual</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-50 leading-none">{overview.current_streak} Dias</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- MAIN KPIS (Bento Grid Style) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI: Questões */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:ring-indigo-200 dark:hover:ring-indigo-800 hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Target className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">Total</Badge>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{overview.total_questions.toLocaleString()}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Questões Resolvidas</p>
                </div>
            </CardContent>
        </Card>

        {/* KPI: Precisão */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:ring-emerald-200 dark:hover:ring-emerald-800 hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl transition-colors ${overview.accuracy_percentage >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white'}`}>
                        <Activity className="w-6 h-6" />
                    </div>
                    {overview.accuracy_percentage > 70 && (
                        <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-0">Excelente</Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{overview.accuracy_percentage}%</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Precisão Média</p>
                </div>
            </CardContent>
        </Card>

        {/* KPI: XP (Gamification Core) */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:shadow-xl hover:shadow-purple-900/20 transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-white/10 text-yellow-400">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <Badge className="bg-yellow-400/20 text-yellow-300 border-0 hover:bg-yellow-400/30">Lvl Pro</Badge>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-white tracking-tight">{overview.total_xp.toLocaleString()} <span className="text-lg text-slate-400 font-normal">XP</span></h3>
                    <p className="text-sm font-medium text-slate-300">Experiência Acumulada</p>
                </div>
            </CardContent>
        </Card>

        {/* KPI: Metas */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:ring-cyan-200 dark:hover:ring-cyan-800 hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/40 px-2 py-1 rounded-md">
                        {goals_summary.total_completed} Concluídas
                    </div>
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{goals_summary.total_active}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Metas em Andamento</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- MAIN CHART SECTION --- */}
        <div className="lg:col-span-2 space-y-6">
            <ActivityChart chartData={chartData} />
            
            {/* --- GAMIFICATION / SPEEDRUN --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="bg-violet-600 text-white border-0 shadow-lg shadow-violet-500/30 dark:shadow-violet-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="flex items-center gap-2 text-base font-medium text-violet-100">
                            <Gamepad2 className="w-5 h-5" /> Modo SpeedRun
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">{gaming_stats.high_score}</span>
                            <span className="text-sm font-medium text-violet-200">pts (Recorde)</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-violet-200 bg-white/10 w-fit px-3 py-1.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            {gaming_stats.total_playtime_minutes} min jogados total
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                     <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-50">
                           <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Foco Atual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {goals_summary.total_active > 0 ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Meta Semanal</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Em andamento</span>
                                </div>
                                <Progress value={65} className="h-2 bg-slate-100 dark:bg-slate-800" /> 
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Mantenha o ritmo para alcançar seu objetivo.</p>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
                                Nenhuma meta ativa. Que tal definir uma hoje?
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* --- SIDEBAR: ANALYSIS & SUBJECTS --- */}
        <div className="space-y-6">
            
            {/* Quick Analysis Cards */}
            <div className="grid grid-cols-1 gap-4">
                {/* Strength */}
                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border border-emerald-100 dark:border-emerald-800 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Ponto Forte</span>
                        </div>
                        {bestSubject ? (
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-50 text-lg truncate" title={bestSubject.subject}>{bestSubject.subject}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-black text-emerald-600">{bestSubject.accuracy}%</span>
                                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">de precisão</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Dados insuficientes.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Weakness */}
                <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 border border-red-100 dark:border-red-800 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">Atenção</span>
                        </div>
                        {worstSubject ? (
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-50 text-lg truncate" title={worstSubject.subject}>{worstSubject.subject}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-black text-red-600">{worstSubject.accuracy}%</span>
                                    <span className="text-xs text-red-700 dark:text-red-400 font-medium bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded">de precisão</span>
                                </div>
                                <div className="mt-3 text-xs flex items-center gap-1 text-red-600 dark:text-red-400 font-medium cursor-pointer hover:underline">
                                    <ArrowUpRight className="w-3 h-3" /> Revisar erros
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Dados insuficientes.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Subject List */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-50">
                        <Brain className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Detalhamento por Matéria
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-5">
                        {performance_by_subject.length > 0 ? performance_by_subject.slice(0, 5).map((subj, idx) => {
                             const style = getAccuracyColor(subj.accuracy);
                             return (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-default">
                                            {subj.subject}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${style}`}>
                                            {subj.accuracy}%
                                        </span>
                                    </div>
                                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${subj.accuracy >= 70 ? 'bg-indigo-500' : 'bg-slate-400'}`} 
                                            style={{ width: `${subj.accuracy}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">
                                        {subj.correct} acertos em {subj.total}
                                    </p>
                                </div>
                             )
                        }) : (
                            <div className="text-center py-8">
                                <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Brain className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma matéria estudada.</p>
                                <button className="mt-2 text-xs font-bold text-indigo-600 hover:underline">Começar Simulado</button>
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