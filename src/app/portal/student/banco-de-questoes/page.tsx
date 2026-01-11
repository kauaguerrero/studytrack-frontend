'use client';

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronDown, ArrowLeft, ArrowRight, BookOpen, Sparkles, Filter, Lock, CheckCircle2, Circle, Loader2, Brain } from 'lucide-react'
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
    
    const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
    const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
    const [isFetchingAnswered, setIsFetchingAnswered] = useState(true);

    const [filterSubject, setFilterSubject] = useState('')
    const [filterTopic, setFilterTopic] = useState('')
    const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
    
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)
    
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [isUpsellOpen, setIsUpsellOpen] = useState(false);
    const [upsellReason, setUpsellReason] = useState<'DAILY_QUOTA_REACHED' | 'TRIAL_EXPIRED' | 'GENERIC_UPSELL'>('DAILY_QUOTA_REACHED');
    const [isLockedByQuota, setIsLockedByQuota] = useState(false);

    // REF para controle síncrono de requisições (Evita Flood/Loop)
    const isLoadingRef = useRef(false);

    // 1. Init
    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                setUserId(user.id)
                const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
                setUserProfile(profile)

                const { data: answers } = await supabase
                    .from('user_answers')
                    .select('question_id')
                    .eq('user_id', user.id);
                
                if (answers) {
                    setAnsweredIds(new Set(answers.map(a => a.question_id)));
                }
                setIsFetchingAnswered(false);
            }
        }
        init()
    }, [])

    // 2. Topics
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

    // 3. Fetch Questions (BLINDADO CONTRA FLOOD)
    const fetchQuestions = useCallback(async (targetPage = 1, append = false, retryCount = 0) => {
        if (!userId || isFetchingAnswered) return;
        
        // Trava de segurança: Se já estiver carregando (isLoadingRef) E não for uma recursão (retryCount === 0), aborta.
        if (isLoadingRef.current && retryCount === 0) return;

        // Break de segurança para recursão infinita
        if (retryCount > 10) {
             setLoading(false); 
             setLoadingMore(false); 
             setHasMore(false);
             isLoadingRef.current = false;
             return;
        }

        // Ativa trava
        if (retryCount === 0) {
            isLoadingRef.current = true;
            if (!append) setLoading(true);
            else setLoadingMore(true);
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
            const params = new URLSearchParams({ 
                page: targetPage.toString(), 
                limit: '20',
                user_id: userId
            });
            
            if (filterSubject) params.append('subject', filterSubject);
            if (filterTopic && filterTopic !== 'Todos') params.append('topic', filterTopic);

            const res = await fetch(`${apiUrl}/api/questions/?${params.toString()}`);
            const data = await res.json();

            if (data.user_status?.locked) setIsLockedByQuota(true);
            else setIsLockedByQuota(false);

            const rawQuestions = data.data || [];
            
            // Filtragem Client-Side
            const filteredQuestions = rawQuestions.filter((q: any) => {
                const isAnswered = answeredIds.has(q.id);
                return activeTab === 'todo' ? !isAnswered : isAnswered;
            });

            const shouldFetchNextPageImmediately = rawQuestions.length > 0 && filteredQuestions.length === 0;

            if (shouldFetchNextPageImmediately) {
                // Recursão: Passa pela trava pois retryCount > 0
                await fetchQuestions(targetPage + 1, append, retryCount + 1);
            } else {
                if (append) {
                    setQuestions(prev => [...prev, ...filteredQuestions]);
                } else {
                    setQuestions(filteredQuestions);
                    setCurrentIdx(0);
                }
                
                setPage(targetPage);
                
                if (rawQuestions.length < 20) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }

        } catch (err) { 
            console.error(err);
        } finally { 
            // Libera a trava APENAS quando a chamada original terminar (evita liberar no meio da recursão)
            if (retryCount === 0) {
                setLoading(false); 
                setLoadingMore(false); 
                isLoadingRef.current = false;
            }
        }
    }, [userId, isFetchingAnswered, activeTab, answeredIds, filterSubject, filterTopic]);

    // Refresh inicial
    useEffect(() => {
        if (userId && !isFetchingAnswered) {
            setPage(1); 
            setHasMore(true);
            setQuestions([]);
            fetchQuestions(1, false);
        }
    }, [fetchQuestions]);

    // Infinite Scroll Automático
    useEffect(() => {
        if (!loadingMore && hasMore && questions.length > 0 && currentIdx >= questions.length - 3) {
             // Verificação extra para não chamar se a ref estiver travada (redundância de segurança)
             if (!isLoadingRef.current) {
                 fetchQuestions(page + 1, true);
             }
        }
    }, [currentIdx, questions.length, hasMore, loadingMore, page, fetchQuestions]);


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
        
        // Bloqueia navegação se estiver carregando E estiver no limite do array (UX)
        if (loadingMore && currentIdx >= questions.length - 1) return;

        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
    };

    const handleLocalAnswer = (qId: string) => {
        setAnsweredIds(prev => new Set(prev).add(qId));
    };

    const currentQ = questions[currentIdx];
    const progressPercentage = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
    
    const isNextDisabled = currentIdx === questions.length - 1;

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900 relative selection:bg-blue-100 selection:text-blue-700 flex flex-col">
            
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

            {/* Header - SEM STICKY (Fixado no documento, rola junto) */}
            <div className="relative z-40 px-4 pt-4 pb-2 bg-transparent shrink-0">
                <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg shadow-slate-200/50 rounded-2xl px-5 py-4 flex flex-col xl:flex-row justify-between items-center gap-5">
                    
                    {/* Top Row */}
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <Link href="dashboard" className="group flex items-center gap-2 pl-2 pr-4 py-2 bg-white border border-slate-200 hover:border-blue-300 rounded-xl text-slate-500 hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-sm">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-bold">Voltar</span>
                        </Link>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Brain size={20} className="text-blue-500 fill-blue-100" />
                                Banco de Questões
                            </h1>
                        </div>
                    </div>

                    {/* Middle Row: Tabs */}
                    <div className="flex p-1 bg-slate-100/80 rounded-xl border border-slate-200 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('todo')}
                            className={`flex-1 md:w-32 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'todo' 
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Circle size={14} className={activeTab === 'todo' ? "fill-blue-600 text-blue-600" : ""} />
                            A Fazer
                        </button>
                        <button
                            onClick={() => setActiveTab('done')}
                            className={`flex-1 md:w-32 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'done' 
                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <CheckCircle2 size={14} className={activeTab === 'done' ? "fill-emerald-600 text-emerald-100" : ""} />
                            Respondidas
                        </button>
                    </div>

                    {/* Bottom Row: Filters */}
                    <div className="flex gap-3 w-full xl:w-auto flex-col sm:flex-row">
                        <div className="relative group w-full sm:w-[180px]">
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white text-slate-700 text-sm font-semibold rounded-xl pl-3 pr-8 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-sm"
                                onChange={(e) => setFilterSubject(e.target.value)}
                                value={filterSubject}
                            >
                                <option value="" className="text-slate-400">Matéria</option>
                                {SUBJECTS.map(subj => (
                                    <option key={subj} value={subj}>{subj}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative group w-full sm:w-[220px]">
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 hover:border-sky-300 hover:bg-white text-slate-700 text-sm font-semibold rounded-xl pl-3 pr-8 py-3 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-500 appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 shadow-sm"
                                onChange={(e) => setFilterTopic(e.target.value)}
                                value={filterTopic}
                                disabled={!filterSubject || availableTopics.length === 0}
                            >
                                <option value="">Tópico</option>
                                <option value="Todos">Todos</option>
                                {availableTopics.map((t) => (
                                    <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content (grow para ocupar o espaço disponível e empurrar o footer) */}
            <div className="max-w-4xl mx-auto px-4 py-6 relative z-10 flex-grow w-full">
                {loading && page === 1 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-pulse">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-medium tracking-wide">
                            Filtrando questões {activeTab === 'todo' ? 'novas' : 'respondidas'}...
                        </p>
                    </div>
                ) : currentQ && userId ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-8">
                        
                        <div className="flex justify-between items-end mb-6 px-1">
                            <div>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex inline-flex items-center gap-2 ${
                                    activeTab === 'todo' 
                                    ? 'text-blue-600 bg-blue-50 border-blue-100' 
                                    : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                }`}>
                                    {activeTab === 'todo' ? <Circle size={10} fill="currentColor" /> : <CheckCircle2 size={12} />}
                                    Questão {currentIdx + 1}
                                </span>
                                
                                {isLockedByQuota && (
                                    <span className="ml-2 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex inline-flex items-center gap-1">
                                        <Lock size={10} /> Free Limit
                                    </span>
                                )}
                                <h2 className="text-slate-400 text-xs mt-2 font-medium pl-1">
                                    {activeTab === 'todo' ? 'Questões disponíveis nesta trilha' : 'Histórico de questões'}
                                </h2>
                            </div>
                            
                            <div className="hidden md:block w-48">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-widest">
                                    <span>Navegação</span>
                                    <span>{questions.length} items</span>
                                </div>
                                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${progressPercentage}%` }} 
                                        className={`h-full transition-all duration-300 ${activeTab === 'todo' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Container */}
                        <div className="relative group perspective-1000 mb-8">
                            <div className={`absolute -inset-1 rounded-[2rem] blur opacity-10 group-hover:opacity-25 transition duration-500 ${
                                activeTab === 'todo' ? 'bg-gradient-to-r from-blue-400 to-sky-300' : 'bg-gradient-to-r from-emerald-400 to-teal-300'
                            }`}></div>
                            
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
                                    onAnswer={() => handleLocalAnswer(currentQ.id)}
                                />
                            </div>

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

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm mt-8 animate-in fade-in zoom-in duration-500">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-8 animate-pulse-slow ${
                            activeTab === 'todo' ? 'bg-blue-50 text-blue-500 ring-blue-50/50' : 'bg-emerald-50 text-emerald-500 ring-emerald-50/50'
                        }`}>
                            {activeTab === 'todo' ? <Sparkles size={40} /> : <CheckCircle2 size={40} />}
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">
                            {activeTab === 'todo' 
                                ? filterSubject ? "Tudo feito por aqui!" : "Vamos começar?"
                                : "Nenhuma questão respondida"}
                        </h3>
                        <p className="text-slate-500 text-center max-w-xs mx-auto leading-relaxed">
                            {activeTab === 'todo' 
                                ? filterSubject 
                                    ? "Você zerou as questões desta matéria (ou filtro). Tente outra!"
                                    : "Selecione uma matéria acima para começar seus estudos."
                                : "As questões que você responder aparecerão aqui para revisão."}
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation Bar (Fixa no fim da página, fluxo normal) */}
            {currentQ && userId && !loading && (
                <div className="w-full px-4 pb-12 pt-6 mt-auto">
                    <div className="max-w-xl mx-auto">
                        <div className="bg-white/90 backdrop-blur-md border border-white/50 shadow-xl shadow-blue-900/5 rounded-2xl p-2.5 flex items-center justify-between gap-3">
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
                                disabled={
                                    (isNextDisabled && !hasMore && !isLockedByQuota) || 
                                    (loadingMore && currentIdx === questions.length - 1)
                                }
                                className={`flex-[2] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                    ${isLockedByQuota 
                                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' 
                                        : activeTab === 'todo'
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:to-blue-600 shadow-blue-500/30'
                                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:to-emerald-600 shadow-emerald-500/30'
                                    }
                                `}
                            >
                                {isLockedByQuota ? (
                                    <> <Lock size={18} /> Destrancar </>
                                ) : (
                                    <>
                                        {loadingMore ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" /> Carregando...
                                            </>
                                        ) : (
                                            <>Próxima <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}