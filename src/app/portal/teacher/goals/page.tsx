'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Trophy, Users, Target, CheckCircle, Search, 
  BarChart2, Filter, Download, ArrowUpRight, Crown, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// Importação do Modal de Criação (Essencial para o botão funcionar)
import { CreateGoalModal } from '@/components/modals/CreateGoalModal';

interface StudentMetric {
  student_id: string;
  full_name: string;
  email: string;
  classroom_name: string;
  total_goals: number;
  completed_goals: number;
  progress_percentage: number;
}

interface RankingEntry {
    rank: number;
    id: string;
    full_name: string;
    total_points: number;
    classroom_name: string;
}

export default function TeacherGoalsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<StudentMetric[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<StudentMetric[]>([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // State para controlar o Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchMetrics(user.id);
      }
    };
    init();
  }, []);

  const fetchMetrics = async (tid: string) => {
    try {
      // Adicionado timestamp para evitar cache agressivo
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/teacher/dashboard/${tid}?t=${new Date().getTime()}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Erro na API");
      
      if (Array.isArray(data)) {
        setMetrics(data);
        setFilteredMetrics(data);
      } else {
        console.error("Formato inesperado (Dashboard):", data);
        setMetrics([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  // Callback para quando uma meta é criada com sucesso
  const handleGoalCreated = () => {
    if (userId) {
        setLoading(true);
        fetchMetrics(userId); // Recarrega os dados do dashboard
    }
    setIsCreateModalOpen(false);
  };

  useEffect(() => {
    const lower = search.toLowerCase();
    const filtered = metrics.filter(m => 
      (m.full_name || '').toLowerCase().includes(lower) || 
      (m.classroom_name || '').toLowerCase().includes(lower)
    );
    setFilteredMetrics(filtered);
  }, [search, metrics]);

  // Calculations for Stats Cards
  const totalStudents = metrics.length;
  const avgProgress = totalStudents > 0 
    ? Math.round(metrics.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) / totalStudents) 
    : 0;
  const totalCompleted = metrics.reduce((acc, curr) => acc + (curr.completed_goals || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Monitoramento de Metas</h1>
          <p className="text-slate-500 mt-1">Acompanhe o desempenho e engajamento das suas turmas em tempo real.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50">
                <Download size={16} /> Exportar Relatório
            </Button>
            
            {/* BOTÃO CORRIGIDO: Agora abre o modal */}
            <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
                <Target size={16} /> Nova Meta em Lote
            </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="text-blue-500 h-6 w-6" />
                </div>
                <div>
                    <span className="text-2xl font-black text-slate-800">{totalStudents}</span>
                    <p className="text-xs text-slate-400">Alunos ativos</p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
           <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metas Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle className="text-emerald-500 h-6 w-6" />
                </div>
                <div>
                    <span className="text-2xl font-black text-slate-800">{totalCompleted}</span>
                    <p className="text-xs text-slate-400">Conquistas totais</p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
           <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Engajamento Médio</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <BarChart2 className="text-indigo-500 h-6 w-6" />
                </div>
                <div>
                    <span className="text-2xl font-black text-slate-800">{avgProgress}%</span>
                    <p className="text-xs text-slate-400">Conclusão de metas</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Table Area */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border border-slate-200 overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-800">Desempenho por Aluno</CardTitle>
                            <CardDescription className="text-xs">Visão detalhada de progresso individual.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Buscar aluno ou turma..." 
                                className="pl-9 bg-white text-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Aluno</th>
                                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Turma</th>
                                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider w-1/3">Progresso</th>
                                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Metas</th>
                                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    [1,2,3,4,5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-10 w-48 bg-slate-100 rounded-lg"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-2 w-full bg-slate-100 rounded"></div></td>
                                            <td className="px-6 py-4 text-center"><div className="h-4 w-8 bg-slate-100 rounded mx-auto"></div></td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    ))
                                ) : filteredMetrics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users size={32} className="opacity-20" />
                                                <p>Nenhum aluno encontrado.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMetrics.map((student) => (
                                        <tr key={student.student_id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-200 shadow-sm">
                                                        {(student.full_name || 'A').substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{student.full_name}</div>
                                                        <div className="text-[11px] text-slate-400 font-medium">{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                                    {student.classroom_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Progress 
                                                        value={student.progress_percentage} 
                                                        className="h-2 flex-1" 
                                                        indicatorClassName={
                                                            student.progress_percentage >= 80 ? "bg-emerald-500" :
                                                            student.progress_percentage >= 50 ? "bg-blue-500" : "bg-amber-500"
                                                        } 
                                                    />
                                                    <span className="text-xs font-bold w-9 text-right text-slate-600">{student.progress_percentage}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                                    <span className="text-sm font-bold text-slate-800">{student.completed_goals}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase">/ {student.total_goals}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                                                    <ArrowUpRight size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar Ranking (Global Escolar) */}
        <div className="lg:col-span-1">
             <Card className="h-full border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white shadow-sm overflow-hidden">
                <CardHeader className="border-b border-amber-100 bg-amber-50/50 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                                <Trophy size={18} fill="currentColor" />
                            </div>
                            <CardTitle className="text-base font-bold text-amber-950">
                                Ranking da Escola
                            </CardTitle>
                        </div>
                    </div>
                    <CardDescription className="text-amber-800/60 text-xs mt-1">
                        Destaques gerais de toda a instituição.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {userId && <TeacherLeaderboardList teacherId={userId} scope="school" />}
                </CardContent>
             </Card>
        </div>
      </div>

      {/* Modal de Criação de Meta (INTEGRAÇÃO DA LÓGICA) */}
      {userId && (
        <CreateGoalModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            teacherId={userId}
            onSuccess={handleGoalCreated}
        />
      )}
    </div>
  );
}

// Subcomponente local para listar o ranking
function TeacherLeaderboardList({ teacherId, scope }: { teacherId: string, scope: 'class' | 'school' }) {
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/teacher/ranking/${teacherId}?scope=${scope}`;
        
        fetch(url)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erro ao buscar ranking");
                
                if (Array.isArray(data)) {
                    setRanking(data);
                } else {
                    console.error("Formato inválido no Ranking:", data);
                    setRanking([]);
                }
            })
            .catch(err => {
                console.error("Ranking fetch error:", err);
                setError("Falha ao carregar");
            })
            .finally(() => setLoading(false));
    }, [teacherId, scope]);

    if (loading) {
        return <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 w-full bg-slate-100 animate-pulse rounded-xl" />)}</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center text-red-400 gap-2">
                <AlertCircle size={24} />
                <p className="text-xs font-bold">{error}</p>
            </div>
        );
    }
    
    if (ranking.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Trophy size={32} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 font-medium">Nenhum dado de ranking disponível.</p>
                <p className="text-[10px] text-slate-300 mt-1">Verifique se sua escola possui alunos pontuados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {ranking.map((item, idx) => {
                const isTop3 = idx < 3;
                let rankColor = "text-slate-500 bg-slate-100";
                if (idx === 0) rankColor = "text-yellow-600 bg-yellow-100 border-yellow-200";
                if (idx === 1) rankColor = "text-slate-600 bg-slate-200 border-slate-300";
                if (idx === 2) rankColor = "text-amber-700 bg-amber-100 border-amber-200";

                return (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white hover:shadow-md border ${isTop3 ? 'bg-white border-amber-100/50' : 'bg-transparent border-transparent hover:border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-lg font-black text-xs border ${rankColor}`}>
                                {isTop3 && <Crown size={12} className="mr-0.5" />}
                                {item.rank}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800 leading-tight">
                                    {(item.full_name || 'Aluno').split(' ')[0]} {(item.full_name || '').split(' ').pop()?.charAt(0)}.
                                </span>
                                {scope === 'school' && (
                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                                        {item.classroom_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-indigo-600">{item.total_points}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">pts</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}