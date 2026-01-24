'use client';

<<<<<<< Updated upstream
import { useEffect, useState } from "react";
import Link from "next/link"; // Adicionado para navegação
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, Users, DollarSign, Brain, Target, 
  Database, ArrowUpRight, Zap, GraduationCap, 
  School, AlertOctagon, TrendingUp, BarChart3, PieChart,
  Calculator, ListChecks // Adicionado ícone ListChecks
} from "lucide-react";
=======
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircle2, 
  Trash2, // Ícone de Lixeira para deixar claro que é DELETE
  Inbox, 
  Filter,
  Bot,
  Calendar,
  BookOpen,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
>>>>>>> Stashed changes

// UI Components
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// --- TIPAGEM ---
interface Alternative {
  letter: string;
  text: string;
  image?: string;
}

interface AdminQuestion {
  id: string;
  external_id: string;
  year: number;
  subject: string;
  difficulty: string;
  statement: string;
  context?: string;
  alternatives: Alternative[];
  correct_alternative: string;
  images: string[];
  is_ai_generated?: boolean;
  metadata?: any;
}

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Filtros Locais
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const supabase = createClient();

  // --- DATA FETCHING ---
  const fetchPending = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_verified', false)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Erro Supabase:", error);
      toast.error("Erro de conexão com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // --- ACTIONS ---
  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    // 1. Optimistic Update (Remove da tela instantaneamente)
    const previousQuestions = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== id));
    setProcessingId(id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida");

      if (decision === 'reject') {
        // DELETE REAL: Remove do banco de dados
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        toast.success("Questão removida permanentemente do banco.");

      } else {
        // UPDATE: Aprova e publica
        const { error } = await supabase
            .from('questions')
            .update({ 
                is_verified: true, 
                status: 'approved',
                verified_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        toast.success("Questão aprovada e publicada!");
      }

    } catch (err: any) {
      // Rollback
      console.error("ERRO DETALHADO:", JSON.stringify(err, null, 2)); // <--- Melhoria aqui
      
      // Tenta extrair a mensagem se for um erro do Supabase
      const errorMessage = err?.message || err?.error_description || "Erro desconhecido";
      
      setQuestions(previousQuestions);
      toast.error(`Falha: ${errorMessage}`);
    } finally {
      setProcessingId(null);
    } 
  };

  // --- FILTERING LOGIC ---
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchSubject && matchDifficulty;
    });
  }, [questions, filterSubject, filterDifficulty]);

  const subjects = Array.from(new Set(questions.map(q => q.subject))).sort();

  // --- RENDER HELPERS ---
  const getDifficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'fácil': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
      case 'médio': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      case 'difícil': return 'bg-rose-100 text-rose-700 hover:bg-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER & TOOLBAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Botão Voltar */}
            <Link href="/portal/admin">
                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                    <ArrowLeft size={20} />
                </Button>
            </Link>

<<<<<<< Updated upstream
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
                <CardDescription>DAU/MAU Ratio: Quanto seu app é um hábito diário?</CardDescription>
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
                 
                 <Link href="/portal/admin/questions" prefetch={false}>
                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow-md active:scale-95">
                        <ListChecks className="w-4 h-4" />
                        Abrir Mesa de Curadoria
                    </button>
                 </Link>
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
=======
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                Curadoria de Conteúdo
                <Badge variant="secondary" className="text-base px-3 py-1">Admin</Badge>
                </h1>
                <p className="text-slate-500 mt-2 text-lg max-w-2xl">
                Revise, valide e publique questões submetidas pela IA ou equipe pedagógica.
                </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto pl-14 md:pl-0">
             {/* Stats Pill */}
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 mr-2">
                <div className={`w-2 h-2 rounded-full ${questions.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-bold text-slate-700 text-sm">
                  {questions.length} Pendentes
                </span>
>>>>>>> Stashed changes
             </div>

             {/* Filters */}
             <div className="flex gap-2 w-full md:w-auto">
               <Select value={filterSubject} onValueChange={setFilterSubject}>
                 <SelectTrigger className="w-[160px] bg-white">
                   <Filter className="w-4 h-4 mr-2 text-slate-400" />
                   <SelectValue placeholder="Matéria" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas Matérias</SelectItem>
                   {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>

               <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                 <SelectTrigger className="w-[140px] bg-white">
                   <SelectValue placeholder="Dificuldade" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas Dific.</SelectItem>
                   <SelectItem value="Fácil">Fácil</SelectItem>
                   <SelectItem value="Médio">Médio</SelectItem>
                   <SelectItem value="Difícil">Difícil</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             {[1,2,3,4].map(i => (
               <div key={i} className="space-y-4 p-6 bg-white rounded-2xl border border-slate-200">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
               </div>
             ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <Inbox size={48} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Fila Zerada!</h3>
            <p className="text-slate-500 mt-2 max-w-md text-center">
              Nenhuma questão pendente corresponde aos filtros atuais. Ótimo trabalho.
            </p>
            {(filterSubject !== 'all' || filterDifficulty !== 'all') && (
               <Button variant="link" onClick={() => { setFilterSubject('all'); setFilterDifficulty('all'); }}>
                 Limpar filtros
               </Button>
            )}
            <Button onClick={fetchPending} variant="outline" className="mt-8 border-slate-300 text-slate-600">
              Recarregar Dados
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredQuestions.map((q) => (
              <Card key={q.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                
                {/* --- CARD HEADER --- */}
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none uppercase tracking-wider text-[10px] px-2">
                        {q.subject}
                      </Badge>
                      <Badge variant="outline" className={`border-none uppercase tracking-wider text-[10px] px-2 ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </Badge>
                      {q.year && (
                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 gap-1">
                           <Calendar size={10} /> {q.year}
                        </Badge>
                      )}
                      {q.is_ai_generated && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1 hover:bg-purple-200">
                           <Bot size={12} /> IA Generated
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                      ID: {q.external_id?.substring(0,8) || 'N/A'}
                    </span>
                  </div>
                </CardHeader>

                {/* --- CARD CONTENT --- */}
                <CardContent className="p-6 space-y-6">
                  
                  {/* Contexto */}
                  {q.context && (
                    <div className="relative pl-4 border-l-4 border-slate-200 py-1">
                      <div className="absolute -left-[27px] -top-1 bg-white text-slate-300 p-1 rounded-full border border-slate-100">
                         <BookOpen size={14} />
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none text-slate-600 italic leading-relaxed">
                        <ReactMarkdown>{q.context}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Enunciado */}
                  <div className="prose prose-slate max-w-none text-slate-900 font-medium leading-relaxed">
                    <ReactMarkdown>{q.statement}</ReactMarkdown>
                  </div>

                  {/* Imagens */}
                  {q.images && q.images.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {q.images.map((img, i) => (
                        <div key={i} className="relative group/img">
                           <img 
                              src={img} 
                              alt={`Apoio ${i}`} 
                              className="h-28 w-auto rounded-lg border border-slate-200 object-cover hover:scale-105 transition-transform cursor-zoom-in" 
                           />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Alternativas */}
                  <div className="grid gap-2 pt-2">
                    {q.alternatives?.map((alt) => {
                      const isCorrect = alt.letter === q.correct_alternative;
                      return (
                        <div 
                          key={alt.letter}
                          className={`
                            relative flex items-start gap-3 p-3 rounded-xl border text-sm transition-all
                            ${isCorrect 
                               ? 'bg-emerald-50/70 border-emerald-200 shadow-sm' 
                               : 'bg-white border-slate-100 text-slate-500 opacity-90'
                             }
                          `}
                        >
                          <div className={`
                             shrink-0 w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs border
                             ${isCorrect 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                             }
                          `}>
                            {alt.letter}
                          </div>
                          <div className={`flex-1 leading-snug ${isCorrect ? 'text-emerald-900 font-medium' : ''}`}>
                             {alt.text || <span className="italic opacity-50">Conteúdo de Imagem</span>}
                          </div>
                          {isCorrect && <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />}
                        </div>
                      )
                    })}
                    {!q.alternatives && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
                            <AlertCircle size={16} /> 
                            Questão sem alternativas cadastradas (Verifique o JSON).
                        </div>
                    )}
                  </div>
                </CardContent>

                {/* --- CARD FOOTER --- */}
                <CardFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                   <Button 
                      variant="outline" 
                      className="flex-1 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 h-11"
                      onClick={() => handleDecision(q.id, 'reject')}
                      disabled={!!processingId}
                   >
                      {/* Usando Trash2 para semântica correta de Delete */}
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar
                   </Button>
                   
                   <Button 
                      className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white h-11 shadow-lg shadow-slate-200"
                      onClick={() => handleDecision(q.id, 'approve')}
                      disabled={!!processingId}
                   >
                      {processingId === q.id ? (
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Processando...
                        </div>
                      ) : (
                        <>
                           <CheckCircle2 className="w-4 h-4 mr-2" />
                           Aprovar Questão
                        </>
                      )}
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}