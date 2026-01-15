'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Clock, Target, AlertCircle, CheckCircle, Zap, TrendingUp, Calendar } from 'lucide-react';
import { SubmitProofModal } from '@/components/modals/SubmitProofModal';
import { GoalRanking } from '@/components/widgets/GoalRanking';
import { UnifiedGoal, GoalStatus } from '@/types/goals';

export default function StudentGoalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [feed, setFeed] = useState<UnifiedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<UnifiedGoal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            setUserId(user.id);
            try {
                // LOG DE DEBUG: Verifique o console do navegador
                console.log("🔍 Buscando metas para User ID:", user.id);
                
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/feed/${user.id}`, {
                    cache: 'no-store'
                });
                
                if (res.ok) {
                    const data = await res.json();
                    console.log("✅ Dados recebidos da API:", data); // Verifique se isso é um array vazio ou tem dados
                    setFeed(data);
                } else {
                    console.error("❌ Erro API:", await res.text());
                }
            } catch (error) {
                console.error("❌ Erro de conexão:", error);
            }
        }
        setLoading(false);
    };
    fetchFeed();
  }, []);

  // Lógica de Filtro mais robusta (Aceita 'active' como 'pending')
  const filteredFeed = useMemo(() => {
    return feed.filter(item => {
        const isCompleted = item.status === 'completed';
        if (activeTab === 'pending') {
            return !isCompleted; // Mostra tudo que NÃO está completo (pending, active, in_progress)
        } else {
            return isCompleted;
        }
    });
  }, [feed, activeTab]);

  // Encontra a meta mais urgente (para o Hero Section)
  const urgentGoal = useMemo(() => {
    if (activeTab === 'completed') return null;
    // Pega a primeira pendente (já que a API retorna ordenado por data)
    return filteredFeed.length > 0 ? filteredFeed[0] : null;
  }, [filteredFeed, activeTab]);

  // Helper de progresso visual
  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
        case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-100'; // Default mais amigável que vermelho
    }
  };

  const getStatusLabel = (status: GoalStatus) => {
    switch (status) {
        case 'completed': return 'Concluída';
        case 'in_progress': return 'Em Andamento';
        default: return 'A Fazer';
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 gap-3 animate-pulse">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Trophy size={32} className="opacity-30" />
            </div>
            <p className="text-sm font-medium">Carregando seu plano de conquistas...</p>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    Minhas Metas <Trophy className="text-yellow-500 fill-yellow-500" size={28} />
                </h1>
                <p className="text-slate-500 mt-2 text-base">
                    Transforme seus estudos em conquistas. Acompanhe seu progresso aqui.
                </p>
            </div>
            
            {/* Toggle Abas Moderno */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex gap-1">
                {['pending', 'completed'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                            activeTab === tab 
                            ? 'bg-white shadow-sm text-blue-600 scale-[1.02]' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        {tab === 'pending' ? 'Em Aberto' : 'Concluídas'}
                        {tab === 'pending' && filteredFeed.length > 0 && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] min-w-[20px]">
                                {filteredFeed.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* HERO SECTION: Foco Principal (Apenas na aba pendentes e se houver metas) */}
        {activeTab === 'pending' && urgentGoal && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-200/50 transition-all hover:shadow-2xl hover:scale-[1.01] duration-300 group cursor-default">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                
                <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                            <Zap size={14} className="text-yellow-300" /> Foco Principal
                        </div>
                        <h2 className="text-3xl font-bold leading-tight">{urgentGoal.title}</h2>
                        <p className="text-blue-100 text-lg leading-relaxed">{urgentGoal.description || "Complete esta meta para manter sua ofensiva de estudos!"}</p>
                        
                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-sm font-medium bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                <Clock size={16} className="text-blue-200" />
                                Prazo: {new Date(urgentGoal.date).toLocaleDateString('pt-BR')}
                            </div>
                            {urgentGoal.target > 1 && (
                                <div className="text-sm font-medium">
                                    Progresso: {urgentGoal.current}/{urgentGoal.target}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-800/50" />
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-yellow-400" 
                                    strokeDasharray={251.2} 
                                    strokeDashoffset={251.2 - (251.2 * calculateProgress(urgentGoal.current, urgentGoal.target)) / 100} 
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{calculateProgress(urgentGoal.current, urgentGoal.target)}%</span>
                        </div>
                        
                        {urgentGoal.source === 'teacher' && (
                            <button 
                                onClick={() => setSelectedGoal(urgentGoal)}
                                className="bg-white text-blue-700 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2 text-sm"
                            >
                                <CheckCircle size={18} /> Registrar Progresso
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista Principal */}
            <div className="lg:col-span-2 space-y-5">
                {filteredFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Target className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Tudo limpo por aqui!</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">
                            {activeTab === 'pending' 
                                ? "Você completou todas as suas missões. Aproveite para descansar ou revisar conteúdos." 
                                : "Nenhuma meta concluída ainda. Comece hoje!"}
                        </p>
                    </div>
                ) : (
                    filteredFeed.map((item) => {
                        // Não mostrar o Hero Card novamente na lista normal
                        if (activeTab === 'pending' && item.id === urgentGoal?.id) return null;

                        const progress = calculateProgress(item.current, item.target);

                        return (
                            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden">
                                {/* Barra lateral colorida baseada no source */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.source === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

                                <div className="pl-4 flex flex-col md:flex-row gap-5 items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${item.source === 'ai' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {item.source === 'ai' ? 'Sugestão IA' : 'Turma'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${getStatusColor(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            {item.title}
                                        </h3>
                                        {item.description && (
                                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}

                                        {/* Barra de Progresso */}
                                        <div className="max-w-md pt-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                                                <span>Progresso</span>
                                                <span>{item.current} / {item.target}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="flex flex-col items-end gap-3 shrink-0 min-w-[140px]">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Calendar size={13} />
                                            {new Date(item.date).toLocaleDateString('pt-BR')}
                                        </div>

                                        {item.source === 'teacher' && activeTab === 'pending' && (
                                            <button 
                                                onClick={() => setSelectedGoal(item)}
                                                className="w-full bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                {item.status === 'in_progress' || item.status === 'active' || item.status === 'pending' ? 'Registrar' : 'Ver Detalhes'}
                                            </button>
                                        )}

                                        {item.proof_url && (
                                            <a 
                                                href={item.proof_url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium"
                                            >
                                                Ver anexo <TrendingUp size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Ranking Widget Inline */}
                                {item.source === 'teacher' && item.group_id && (
                                    <div className="mt-4 ml-4 pt-3 border-t border-slate-50">
                                        <GoalRanking groupId={item.group_id} condensed />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Coluna Lateral - Dicas & Status */}
            <div className="hidden lg:block space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-6">
                    <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-blue-500" />
                        Central de Inteligência
                    </h4>
                    
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Estatística</div>
                            <div className="flex items-center gap-2 text-slate-700 text-sm">
                                <TrendingUp size={16} className="text-emerald-500" />
                                Você completou <strong>{feed.filter(i => i.status === 'completed').length}</strong> missões.
                            </div>
                        </div>

                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 animate-pulse"></div>
                                <span>Metas do professor contam mais pontos no ranking da turma.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0"></div>
                                <span>Metas da IA são personalizadas para suas dificuldades nos simulados.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                                <span>Envie sempre uma foto ou link comprovando metas manuais.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal de Envio */}
        {selectedGoal && userId && (
            <SubmitProofModal 
                isOpen={!!selectedGoal}
                onClose={() => setSelectedGoal(null)}
                goalId={selectedGoal.id}
                goalTitle={selectedGoal.title}
                userId={userId}
            />
        )}
    </div>
  );
}