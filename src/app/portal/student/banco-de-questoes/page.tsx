'use client';

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronDown, ArrowLeft, ArrowRight, BookOpen, Sparkles, Filter, Lock } from 'lucide-react'
import { QuestionCard } from '@/components/questions/QuestionCard'
import { UpsellModal } from '@/components/modals/UpsellModal'

interface Topic {
    name: string;
    count: number;
}

const SUBJECTS = [
    "Matemática", "Física", "Química", "Biologia", "História",
    "Geografia", "Filosofia", "Sociologia", "Língua Portuguesa",
    "Inglês", "Espanhol"
];

export default function BancoDeQuestoes() {
    const [questions, setQuestions] = useState<any[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    
    const [filterSubject, setFilterSubject] = useState('')
    const [filterTopic, setFilterTopic] = useState('')
    const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
    
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)
    
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Estado do Upsell
    const [isUpsellOpen, setIsUpsellOpen] = useState(false);
    const [upsellReason, setUpsellReason] = useState<'DAILY_QUOTA_REACHED' | 'TRIAL_EXPIRED' | 'GENERIC_UPSELL'>('DAILY_QUOTA_REACHED');
    const [isLockedByQuota, setIsLockedByQuota] = useState(false); // Efeito Vitrine

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
                // Pega nome para o modal
                const { data } = await supabase.table("profiles").select("full_name").eq("id", user.id).single()
                setUserProfile(data)
            }
        }
        getUser()
    }, [])

    useEffect(() => {
        async function loadTopics() {
            if (!filterSubject || filterSubject === 'Todas') {
                setAvailableTopics([]); setFilterTopic(''); return;
            }
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
                const res = await fetch(`${apiUrl}/api/questions/topics?subject=${encodeURIComponent(filterSubject)}`);
                const data = await res.json();
                setAvailableTopics(data);
                setFilterTopic('');
            } catch (err) { console.error(err); }
        }
        loadTopics();
    }, [filterSubject]);

    const fetchQuestions = async (targetPage = 1, append = false) => {
        if (!userId) return; // Aguarda user
        if (!append) setLoading(true);
        else setLoadingMore(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
            const params = new URLSearchParams({ 
                page: targetPage.toString(), 
                limit: '20',
                user_id: userId // Importante para validação
            });
            
            if (filterSubject) params.append('subject', filterSubject);
            if (filterTopic && filterTopic !== 'Todos') params.append('topic', filterTopic);

            const res = await fetch(`${apiUrl}/api/questions/?${params.toString()}`);
            const data = await res.json();

            // Verifica status da conta (Vitrine)
            if (data.user_status && data.user_status.locked) {
                setIsLockedByQuota(true);
                // Não abrimos o modal aqui automaticamente, deixamos o usuário navegar e ver os cadeados
                // Só se ele tentar interagir
            } else {
                setIsLockedByQuota(false);
            }

            if (data.data && Array.isArray(data.data)) {
                if (append) {
                    setQuestions(prev => [...prev, ...data.data]);
                } else {
                    setQuestions(data.data);
                    setCurrentIdx(0);
                }
                setPage(targetPage);
                setHasMore(data.data.length === 20);
            }
        } catch (err) { console.error(err) } 
        finally { setLoading(false); setLoadingMore(false); }
    }

    useEffect(() => {
        if (userId) {
            setPage(1); setHasMore(true);
            fetchQuestions(1, false);
        }
    }, [filterSubject, filterTopic, userId])

    // Handler para quando a cota é atingida DURANTE o uso (callback do Card)
    const handleQuotaLimitReached = (reasonCode: string) => {
        setIsLockedByQuota(true);
        setUpsellReason(reasonCode as any || 'DAILY_QUOTA_REACHED');
        setIsUpsellOpen(true);
    };

    const handleNext = () => {
        if (isLockedByQuota) {
            setUpsellReason('DAILY_QUOTA_REACHED');
            setIsUpsellOpen(true);
            return;
        }

        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else if (hasMore && !loadingMore) {
            fetchQuestions(page + 1, true).then(() => {
                setCurrentIdx(prev => prev + 1);
            });
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
    };

    const currentQ = questions[currentIdx];
    const progressPercentage = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900 pb-32 relative selection:bg-blue-100 selection:text-blue-700">
            
            <UpsellModal 
                isOpen={isUpsellOpen} 
                onClose={() => setIsUpsellOpen(false)} 
                reason={upsellReason}
                userName={userProfile?.full_name}
            />

            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40 mix-blend-multiply animate-blob"></div>
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-sky-200 rounded-full blur-3xl opacity-40 mix-blend-multiply animate-blob animation-delay-2000"></div>
            </div>

            {/* Header Glassmorphism */}
            <div className="sticky top-0 z-40 px-4 pt-4 pb-2">
                <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg shadow-slate-200/50 rounded-2xl px-5 py-4 flex flex-col md:flex-row justify-between items-center gap-5 transition-all duration-300">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/dashboard" className="group flex items-center gap-2 pl-2 pr-4 py-2 bg-white border border-slate-200 hover:border-blue-300 rounded-xl text-slate-500 hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-sm">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-bold">Voltar</span>
                        </Link>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={20} className="text-blue-500 fill-blue-100" />
                                Banco de Questões
                            </h1>
                            <p className="text-xs text-slate-500 font-medium hidden sm:block">Estude com foco total</p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto flex-col sm:flex-row">
                        <div className="relative group w-full sm:w-[200px]">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none z-10">
                                <BookOpen size={18} />
                            </div>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white text-slate-700 text-sm font-semibold rounded-xl pl-10 pr-10 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-sm"
                                onChange={(e) => setFilterSubject(e.target.value)}
                                value={filterSubject}
                            >
                                <option value="" className="text-slate-400">Selecionar Matéria</option>
                                {SUBJECTS.map(subj => (
                                    <option key={subj} value={subj}>{subj}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                        </div>

                        <div className="relative group w-full sm:w-[240px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none z-10">
                                <Filter size={18} />
                            </div>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 hover:border-sky-300 hover:bg-white text-slate-700 text-sm font-semibold rounded-xl pl-10 pr-10 py-3 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-500 appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 shadow-sm"
                                onChange={(e) => setFilterTopic(e.target.value)}
                                value={filterTopic}
                                disabled={!filterSubject || availableTopics.length === 0}
                            >
                                <option value="">Tópico Específico</option>
                                <option value="Todos">Todos os Tópicos</option>
                                {availableTopics.map((t) => (
                                    <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sky-500 transition-colors pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
                {loading && page === 1 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-pulse">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-medium tracking-wide">Buscando questões...</p>
                    </div>
                ) : currentQ && userId ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                        
                        <div className="flex justify-between items-end mb-6 px-1">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                    Questão {currentIdx + 1}
                                </span>
                                {/* INDICADOR DE BLOQUEIO VISUAL */}
                                {isLockedByQuota && (
                                    <span className="ml-2 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex inline-flex items-center gap-1">
                                        <Lock size={10} /> Free Limit
                                    </span>
                                )}
                                <h2 className="text-slate-400 text-xs mt-2 font-medium pl-1">
                                    Total de {questions.length}{hasMore ? '+' : ''} questões
                                </h2>
                            </div>
                            
                            <div className="hidden md:block w-48">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-widest">
                                    <span>Progresso</span>
                                    <span>{Math.round(progressPercentage)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-100">
                                    <div 
                                        style={{ width: `${progressPercentage}%` }} 
                                        className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Container */}
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-sky-300 rounded-[2rem] blur opacity-10 group-hover:opacity-25 transition duration-500"></div>
                            
                            <div className={`relative bg-white rounded-[1.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden ${isLockedByQuota ? 'blur-[2px] pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                                <QuestionCard 
                                    key={currentQ.id} 
                                    userId={userId} 
                                    question={{
                                        id: currentQ.id,
                                        external_id: currentQ.external_id,
                                        year: currentQ.exam_year,
                                        subject: currentQ.subject,
                                        difficulty: currentQ.difficulty || "Médio",
                                        context: currentQ.context,
                                        statement: currentQ.statement,
                                        alternatives: currentQ.alternatives,
                                        correct_option: currentQ.correct_option,
                                        explanation: currentQ.explanation,
                                        images: currentQ.images
                                    }}
                                    onQuotaReached={handleQuotaLimitReached}
                                />
                            </div>

                            {/* OVERLAY DE CADEADO SE BLOQUEADO */}
                            {isLockedByQuota && (
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <button 
                                        onClick={() => setIsUpsellOpen(true)}
                                        className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                                            <Lock size={32} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-bold text-slate-800">Conteúdo Exclusivo</h3>
                                            <p className="text-xs text-slate-500">Toque para desbloquear</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Floating Action Bar */}
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
                            <div className="bg-white/90 backdrop-blur-md border border-white/50 shadow-2xl shadow-blue-900/10 rounded-2xl p-2.5 flex items-center justify-between gap-3 ring-1 ring-slate-900/5">
                                <button 
                                    onClick={handlePrev}
                                    disabled={currentIdx === 0}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 transition-all flex justify-center items-center gap-2 group active:scale-[0.98]"
                                >
                                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform text-slate-400 group-hover:text-slate-600" /> 
                                    <span className="hidden sm:inline">Anterior</span>
                                </button>
                                
                                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                                
                                <button 
                                    onClick={handleNext}
                                    className={`flex-[2] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 group active:scale-[0.98]
                                        ${isLockedByQuota ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:to-blue-600 shadow-blue-500/30'}
                                    `}
                                >
                                    {isLockedByQuota ? (
                                        <>
                                            <Lock size={18} /> Destrancar
                                        </>
                                    ) : (
                                        <>
                                            {loadingMore ? 'Carregando...' : <>Próxima <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm mt-8">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-500 ring-8 ring-blue-50/50 animate-pulse-slow">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Vamos começar?</h3>
                        <p className="text-slate-500 text-center max-w-xs mx-auto leading-relaxed">
                            Selecione uma <strong className="text-blue-600">matéria</strong> acima para liberar as questões.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}