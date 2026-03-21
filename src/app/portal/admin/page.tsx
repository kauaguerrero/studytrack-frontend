"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // Adicionado para navegação
import { createClient } from "@/lib/supabase/client";
import MarketingBroadcastModal from "@/components/admin/MarketingBroadcastModal";
import PeakHoursCard from "@/components/admin/PeakHoursCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity, Users, DollarSign, Brain, Target,
  Database, ArrowUpRight, Zap, GraduationCap,
  School, AlertOctagon, TrendingUp,   BarChart3,
  Calculator, ListChecks,
  Flag, ClipboardList, Megaphone
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [dist, setDist] = useState<any>(null); // Dados de distribuição
  const [loading, setLoading] = useState(true);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const supabase = createClient();

  const SUPABASE_FREE_LIMIT = 500 * 1024 * 1024; 

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

      try {
        // Busca Paralela das duas rotas (backend Flask; exige NEXT_PUBLIC_API_URL em prod)
        const [resStats, resDist] = await Promise.all([
          fetch(`${apiUrl}/api/admin/stats`, { headers }),
          fetch(`${apiUrl}/api/admin/stats/distribution`, { headers }),
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resDist.ok) setDist(await resDist.json());
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="h-12 w-12 bg-indigo-200 rounded-full"></div>
            <p className="text-indigo-600 font-medium">Carregando Inteligência do SaaS...</p>
        </div>
    </div>
  );

  if (!stats) return <div className="p-10 text-red-500 text-center">Erro ao carregar dados. Verifique a API.</div>;

  const { health, product, financial, infrastructure, education, b2b } = stats || {};
  
  // Cálculos de Infra
  const dbUsagePercent = infrastructure?.db_size_bytes 
    ? (infrastructure.db_size_bytes / SUPABASE_FREE_LIMIT) * 100 
    : 0;
  const dbSizeMB = infrastructure?.db_size_bytes 
    ? (infrastructure.db_size_bytes / 1024 / 1024).toFixed(1) 
    : "0";

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans text-slate-900">
      <MarketingBroadcastModal isOpen={marketingOpen} onClose={() => setMarketingOpen(false)} />
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Master Control</h1>
            <p className="text-slate-500 mt-1">Visão holística de Negócio, Produto e Pedagogia.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/portal/admin/tasks" className="mr-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <ClipboardList className="w-4 h-4 text-indigo-500" /> Tasks
                </span>
            </Link>
            <Link href="/portal/admin/reengagement" className="mr-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Zap className="w-4 h-4 text-amber-500" /> Reengajamento
                </span>
            </Link>
            <button
                type="button"
                onClick={() => setMarketingOpen(true)}
                className="mr-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
                <Megaphone className="w-4 h-4 text-rose-500" /> Marketing
            </button>
            <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-700">Sistema Operacional</span>
        </div>
      </div>

      {/* ================================================================================== */}
      {/* SEÇÃO 1: BIG NUMBERS (KPIs) */}
      {/* ================================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase">Total de Usuários</p>
                        <h3 className="text-4xl font-bold text-slate-900 mt-2">{health?.total_users || 0}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-blue-600">{health?.onboarding_rate}%</span> completaram cadastro
                </div>
            </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase">Receita (MRR)</p>
                        <h3 className="text-4xl font-bold text-slate-900 mt-2">R$ {financial?.mrr_brl || "0.00"}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg"><DollarSign className="w-6 h-6 text-emerald-600" /></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {product?.active_pros || 0} Assinantes Pro
                    </Badge>
                </div>
            </CardContent>
        </Card>

        <Card className={`border-l-4 hover:shadow-lg transition-all ${financial?.net_profit_brl >= 0 ? 'border-l-indigo-500' : 'border-l-red-500'}`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase">Lucro Líquido</p>
                        <h3 className={`text-4xl font-bold mt-2 ${financial?.net_profit_brl >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                            R$ {financial?.net_profit_brl || "0.00"}
                        </h3>
                    </div>
                    <div className={`p-3 rounded-lg ${financial?.net_profit_brl >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
                        <TrendingUp className={`w-6 h-6 ${financial?.net_profit_brl >= 0 ? 'text-indigo-600' : 'text-red-600'}`} />
                    </div>
                </div>
                <div className="mt-4 text-sm text-slate-500">
                    Descontando custos de IA (R$ {financial?.ai_cost_brl})
                </div>
            </CardContent>
        </Card>
      </div>

      {/* ================================================================================== */}
      {/* SEÇÃO 2: SAÚDE & ENGAJAMENTO */}
      {/* ================================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:border-slate-300 transition-colors">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="w-5 h-5 text-amber-500" /> Fidelidade de Uso (Stickiness)
                </CardTitle>
                <CardDescription>DAU/MAU por último dia com atividade (last_activity_date).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-slate-900">{health?.dau || 0}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">DAU (24h)</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-slate-900">{health?.mau || 0}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">MAU (30d)</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="text-center">
                        <p className={`text-3xl font-bold ${health?.stickiness > 20 ? 'text-green-600' : 'text-amber-600'}`}>
                            {health?.stickiness || 0}%
                        </p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">Retenção</p>
                    </div>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Risco de Churn (Inativos +30d)</span>
                    </div>
                    <span className="font-bold text-orange-900">{health?.churn_risk_users || 0}</span>
                </div>
            </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-purple-500" /> Performance do Produto
                </CardTitle>
                <CardDescription>Qualidade da IA e estabilidade técnica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Aderência aos Planos (Semanal)</span>
                        <span className={`text-sm font-bold ${product?.plan_adherence > 60 ? 'text-green-600' : 'text-red-500'}`}>
                            {product?.plan_adherence || 0}%
                        </span>
                    </div>
                    <Progress value={product?.plan_adherence || 0} className="h-2" />
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 font-bold uppercase">Fila de Redação</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-3 h-3 rounded-full ${product?.stuck_essays > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-sm font-medium text-slate-700">
                                {product?.stuck_essays > 0 ? `${product.stuck_essays} Travados` : "Operacional"}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Custo IA</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Brain className="w-4 h-4 text-slate-400" />
                            <span className="text-lg font-bold text-slate-700">R$ {financial?.ai_cost_brl || 0}</span>
                          </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* ================================================================================== */}
      {/* SEÇÃO 2.5: HORÁRIOS DE PICO */}
      {/* ================================================================================== */}
      <PeakHoursCard />

      {/* CONSUMO DE TOKENS E CUSTO IA */}
        <Card className="hover:border-slate-300 transition-colors lg:col-span-1 border-t-4 border-t-purple-600">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-purple-600" /> Consumo de IA (30d)
                </CardTitle>
                <CardDescription>Gastos e volume de processamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end border-b pb-2">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400">Tokens Totais</p>
                            <p className="text-2xl font-mono font-bold text-slate-800">
                                {financial?.ai_total_tokens ? financial.ai_total_tokens.toLocaleString() : 0}
                            </p>
                        </div>
                        <Calculator className="w-5 h-5 text-slate-300 mb-1" />
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400">Custo Estimado</p>
                            <p className="text-2xl font-bold text-purple-700">
                                R$ {financial?.ai_cost_brl || "0.00"}
                            </p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-slate-400">Baseado em uso real</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

      {/* SEÇÃO 3: EDUCAÇÃO & B2B (NOVA) */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ponto Fraco */}
        <Card className="bg-red-50 border-red-100 md:col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-red-900">
                    <AlertOctagon className="w-5 h-5 text-red-600" /> Ponto Fraco
                </CardTitle>
                <CardDescription className="text-red-700/70">Matéria com maior índice de erro.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mt-2">
                    <h3 className="text-2xl font-bold text-red-900 truncate" title={education?.hardest_subject}>
                        {education?.hardest_subject || "N/A"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl font-bold text-red-600">{education?.lowest_accuracy}%</span>
                        <span className="text-sm font-medium text-red-800">de acerto</span>
                    </div>
                    <p className="text-xs text-red-600/60 mt-4">Baseado nas últimas {education?.total_answers_analyzed} respostas.</p>
                </div>
            </CardContent>
        </Card>

        {/* B2B */}
        <Card className="bg-white hover:border-indigo-300 transition-colors md:col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <School className="w-5 h-5 text-indigo-500" /> Escolas B2B
                </CardTitle>
                <CardDescription>Parceiros institucionais ativos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mt-2">
                    <div>
                        <span className="text-4xl font-bold text-slate-900">{b2b?.active_schools || 0}</span>
                        <p className="text-sm text-slate-500 font-medium">Escolas</p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center">
                         <GraduationCap className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                        Gerenciar <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
            </CardContent>
        </Card>

        {/* Infra DB */}
        <Card className="bg-slate-900 text-slate-50 md:col-span-1 border-t-4 border-t-cyan-400">
             <CardContent className="p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-400" /> Database
                    </h3>
                    <span className="text-xs text-cyan-200 bg-cyan-900/50 px-2 py-1 rounded">Free Tier</span>
                 </div>
                 <div className="flex justify-between items-end mb-2">
                     <span className="text-2xl font-bold text-cyan-400">{dbSizeMB} MB</span>
                     <span className="text-sm text-slate-400">/ 500 MB</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                    <div className={`h-full transition-all ${dbUsagePercent > 90 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                         style={{ width: `${Math.min(dbUsagePercent, 100)}%` }}></div>
                 </div>
                 <p className="text-xs text-slate-500 text-right">{dbUsagePercent.toFixed(1)}% utilizado</p>
             </CardContent>
        </Card>
      </div>

      {/* ================================================================================== */}
      {/* SEÇÃO 4: ANÁLISE DO BANCO DE QUESTÕES (DISTRIBUIÇÃO) */}
      {/* ================================================================================== */}
      {dist && (
        <div className="pt-6 border-t border-slate-200">
             {/* HEADER ATUALIZADO COM O BOTÃO DE AÇÃO */}
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-slate-600" /> Raio-X do Conteúdo ({dist.total} questões)
                 </h2>
                 
                 <div className="flex flex-wrap items-center gap-2">
                    <Link href="/portal/admin/reports" prefetch={false}>
                        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow-md active:scale-95">
                            <Flag className="w-4 h-4" />
                            Reports de Questões
                        </button>
                    </Link>
                    <Link href="/portal/admin/questions" prefetch={false}>
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow-md active:scale-95">
                            <ListChecks className="w-4 h-4" />
                            Abrir Mesa de Curadoria
                        </button>
                    </Link>
                 </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Por Matéria */}
                 <Card>
                     <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Distribuição por Matéria</CardTitle>
                     </CardHeader>
                     <CardContent className="h-64 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-2">
                            {dist.by_subject.map((s: any) => (
                                <div key={s.name} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                    <span className="font-medium text-slate-700">{s.name}</span>
                                    <Badge variant="secondary">{s.count}</Badge>
                                </div>
                            ))}
                        </div>
                     </CardContent>
                 </Card>

                 {/* Por Dificuldade e Ano (Grid Interno) */}
                 <div className="space-y-6">
                     <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase">Dificuldade</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 flex-wrap">
                                {dist.by_difficulty.map((d: any) => (
                                    <div key={d.name} className="flex-1 bg-slate-50 p-3 rounded text-center border border-slate-100">
                                        <div className="text-2xl font-bold text-slate-800">{d.count}</div>
                                        <div className="text-xs text-slate-500 font-bold uppercase mt-1">{d.name}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase">Top 5 Anos Recentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {dist.by_year.slice(0, 5).map((y: any) => (
                                    <div key={y.name} className="flex items-center gap-3">
                                        <span className="text-sm font-bold w-12 text-slate-600">{y.name}</span>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" 
                                                 style={{ width: `${(y.count / dist.total) * 100}%` }}></div>
                                        </div>
                                        <span className="text-xs text-slate-400 w-8 text-right">{y.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                     </Card>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
}