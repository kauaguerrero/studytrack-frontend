'use client';

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { reportError } from '@/lib/reportError'
import Link from 'next/link'
import { 
    ChevronDown, ArrowLeft, ArrowRight, Brain, Filter, Lock, 
    CheckCircle2, Circle, Loader2, Sparkles, Calendar, 
    BarChart, Eye, EyeOff 
} from 'lucide-react'
import { QuestionCard } from '@/components/questions/QuestionCard'
import { ReportDialog } from '@/components/questions/ReportDialog'
import { UpsellModal } from '@/components/modals/UpsellModal'

// --- TYPES ---
interface Topic {
    name: string;
    count: number;
}

const SUBJECTS = [
    "Matemática", "Física", "Química", "Biologia", "História",
    "Geografia", "Filosofia", "Sociologia", "Língua Portuguesa",
    "Inglês", "Espanhol"
];

// Gerar anos de 2009 até o ano atual
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2008 }, (_, i) => (CURRENT_YEAR - i).toString());

const DIFFICULTIES = ["Fácil", "Médio", "Difícil"];

// --- COMPONENTS: SKELETON UI (UX Improvement) ---
const QuestionCardSkeleton = () => (
    <div className="w-full bg-card dark:bg-card rounded-[1.5rem] shadow-xl shadow-blue-900/5 dark:shadow-slate-950/50 border border-border p-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start mb-6">
            <div className="h-6 w-32 bg-muted rounded-lg"></div>
            <div className="h-6 w-24 bg-muted rounded-lg"></div>
        </div>
        {/* Text Skeleton */}
        <div className="space-y-3 mb-8">
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-11/12 bg-muted rounded"></div>
            <div className="h-4 w-4/5 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
        </div>
        {/* Alternatives Skeleton */}
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 w-full bg-muted rounded-xl border border-border"></div>
            ))}
        </div>
    </div>
);

export default function BancoDeQuestoes() {
    // State: Data
    const [questions, setQuestions] = useState<any[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    
    // State: Filters & Logic
    const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
    const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
    
    // Filtros principais
    const [filterSubject, setFilterSubject] = useState('')
    const [filterTopic, setFilterTopic] = useState('Todos')
    const [filterYear, setFilterYear] = useState('Todos')
    const [filterDifficulty, setFilterDifficulty] = useState('Todas')
    
    const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
    
    // State: UI Controls
    const [isMenuOpen, setIsMenuOpen] = useState(true); // Controle de visibilidade do menu (Issue 6)

    // State: Loading & User
    const [loading, setLoading] = useState(false) // Começa false pois só carrega se tiver filtro ou user
    const [loadingMore, setLoadingMore] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)
    const [totalQuestionsFound, setTotalQuestionsFound] = useState<number>(0)
    
    // State: Pagination & Upsell
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isUpsellOpen, setIsUpsellOpen] = useState(false);
    const [upsellReason, setUpsellReason] = useState<'DAILY_QUOTA_REACHED' | 'TRIAL_EXPIRED' | 'GENERIC_UPSELL'>('DAILY_QUOTA_REACHED');
    const [isLockedByQuota, setIsLockedByQuota] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);

    // Refs
    const isLoadingRef = useRef(false);
    /** Token JWT obtido uma única vez no init; usado em todos os fetch da API de questões. */
    const authTokenRef = useRef<string | null>(null);

    //total questions 
    const [totalQuestions, setTotalQuestions] = useState<number>(2700);

    // 1. Init: Auth, sessão (token) e dados do usuário — uma única chamada getSession
    useEffect(() => {
        const init = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) authTokenRef.current = session.access_token;

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);

                    const [profileRes, answersRes] = await Promise.all([
                        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                        supabase.from('user_answers').select('question_id').eq('user_id', user.id)
                    ]);

                    setUserProfile(profileRes.data);
                    if (answersRes.data) {
                        setAnsweredIds(new Set(answersRes.data.map(a => a.question_id)));
                    }
                }
            } catch (error) {
                console.error("Critical Init Error:", error);
                await reportError("QuestionBankInitError", String(error), { flow: "question_bank_init" });
            }
        };
        init();
    }, []);

    // Busca o total global de questões aprovadas (só com token; evita chamadas inúteis)
    useEffect(() => {
        const token = authTokenRef.current;
        if (!token) return;

        const fetchTotal = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
                const res = await fetch(`${apiUrl}/api/questions/total`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.total) setTotalQuestions(data.total);
                }
            } catch (err) {
                console.error("Erro ao buscar total de questões:", err);
                void reportError("QuestionBankTotalFetchError", String(err));
            }
        };
        fetchTotal();
    }, [userId]);

    // 2. Topics Fetching (usa o mesmo token do ref)
    useEffect(() => {
        const token = authTokenRef.current;
        if (!token) return;

        async function loadTopics() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
                const subjectQuery = (!filterSubject || filterSubject === 'Todas') ? '' : filterSubject;
                const res = await fetch(`${apiUrl}/api/questions/topics?subject=${encodeURIComponent(subjectQuery)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setAvailableTopics(data);
                setFilterTopic('Todos');
            } catch (err) { console.error(err); void reportError("QuestionBankError", String(err)); }
        }
        loadTopics();
    }, [filterSubject, userId]);

    // Reset ao mudar filtros principais
    useEffect(() => {
        if (userId) {
            setQuestions([]);
            setPage(1);
            setCurrentIdx(0);
            setHasMore(true);
            // Se houver matéria selecionada, busca. Se não, não busca (para manter o Welcome State)
            if (filterSubject) {
                fetchQuestions(1, false);
            }
        }
    }, [filterSubject, filterTopic, filterYear, filterDifficulty, activeTab, userId]); 

    // 3. Core Fetch Logic (Questions) — user_id vem do token no backend (IDOR-safe)
    const fetchQuestions = useCallback(async (targetPage = 1, append = false, retryCount = 0) => {
        const token = authTokenRef.current;
        if (!token || !userId) return;
        if (!filterSubject) return; // Não busca se não tiver matéria (Regra do Welcome State)

        // Bloqueio de concorrência
        if (isLoadingRef.current && retryCount === 0) return;

        // Circuit Breaker
        if (retryCount > 10) {
             setLoading(false);
             setLoadingMore(false);
             setHasMore(false);
             isLoadingRef.current = false;
             return;
        }

        // Setup lock
        if (retryCount === 0) {
            isLoadingRef.current = true;
            if (!append) setLoading(true);
            else setLoadingMore(true);
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
            const params = new URLSearchParams({
                page: targetPage.toString(),
                limit: '20'
            });
            if (filterSubject && filterSubject !== 'Todas') params.append('subject', filterSubject);
            if (filterTopic && filterTopic !== 'Todos') params.append('topic', filterTopic);
            if (filterYear && filterYear !== 'Todos') params.append('year', filterYear);
            if (filterDifficulty && filterDifficulty !== 'Todas') params.append('difficulty', filterDifficulty);
            params.append('tab', activeTab);

            const res = await fetch(`${apiUrl}/api/questions/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) {
                const body = await res.text();
                let errMsg = `Failed to fetch questions (${res.status})`;
                try {
                    const j = JSON.parse(body);
                    if (j?.error) errMsg += `: ${j.error}`;
                    else if (j?.message) errMsg += `: ${j.message}`;
                } catch (_) { if (body) errMsg += `: ${body.slice(0, 100)}`; }
                console.error("[BancoQuestões]", errMsg, { status: res.status, body: body?.slice(0, 200) });
                void reportError("QuestionBankApiError", String(errMsg), { status: res.status });
                throw new Error(errMsg);
            }

            const data = await res.json();

            // Salva o total absoluto retornado pelo filtro do banco de dados
            if (!append) {
                setTotalQuestionsFound(data.total || 0);
            }

            // Check Quota status from API
            if (data.user_status?.locked) setIsLockedByQuota(true);
            else setIsLockedByQuota(false);

            const rawQuestions = data.data || [];
            
            // O Backend agora processa as abas. O Frontend apenas confia nos dados.
            const filteredQuestions = rawQuestions;

            // Logic: Se a página veio cheia mas o filtro client-side esvaziou tudo, busca a próxima
            const shouldFetchNextPageImmediately = rawQuestions.length > 0 && filteredQuestions.length === 0;

            if (shouldFetchNextPageImmediately) {
                await fetchQuestions(targetPage + 1, append, retryCount + 1);
            } else {
                if (append) {
                    setQuestions(prev => [...prev, ...filteredQuestions]);
                } else {
                    setQuestions(filteredQuestions);
                    setCurrentIdx(0);
                }
                
                setPage(targetPage);
                
                // End of list detection
                if (rawQuestions.length < 20) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }

        } catch (err) {
            console.error(err);
            void reportError("QuestionBankError", String(err));
        } finally {
            if (retryCount === 0) {
                setLoading(false); 
                setLoadingMore(false); 
                isLoadingRef.current = false;
            }
        }
    }, [userId, activeTab, answeredIds, filterSubject, filterTopic, filterYear, filterDifficulty]);

    // Infinite Scroll Logic
    useEffect(() => {
        if (!loadingMore && hasMore && questions.length > 0 && currentIdx >= questions.length - 3) {
             if (!isLoadingRef.current) {
                 fetchQuestions(page + 1, true);
             }
        }
    }, [currentIdx, questions.length, hasMore, loadingMore, page, fetchQuestions]);

    // Handlers
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
        if (loadingMore && currentIdx >= questions.length - 1) return;
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
    };

    // Derived State (declarado antes do useEffect que usa currentQ)
    const currentQ = questions[currentIdx];
    const isNextDisabled = currentIdx === questions.length - 1;

    // Atalho: setas esquerda/direita para navegar entre questões
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!currentQ) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIdx, questions.length, currentQ, isLockedByQuota, loadingMore]);

    const handleLocalAnswer = (qId: string) => {
        setAnsweredIds(prev => new Set(prev).add(qId));
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] dark:bg-background font-sans text-slate-900 dark:text-foreground relative selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-700 dark:selection:text-blue-300 flex flex-col">
            
            <UpsellModal 
                isOpen={isUpsellOpen} 
                onClose={() => setIsUpsellOpen(false)} 
                reason={upsellReason}
                userName={userProfile?.full_name}
            />

            <ReportDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                questionId={reportQuestionId || ''}
                authToken={authTokenRef.current}
                onSuccess={() => {
                    const id = reportQuestionId;
                    if (!id) return;
                    const filtered = questions.filter((q) => q.id !== id);
                    setQuestions(filtered);
                    setCurrentIdx((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
                    setReportDialogOpen(false);
                    setReportQuestionId(null);
                }}
            />

            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full blur-3xl opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob"></div>
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-sky-200 dark:bg-sky-900/20 rounded-full blur-3xl opacity-40 mix-blend-multiply dark:mix-blend-normal animate-blob animation-delay-2000"></div>
            </div>

            {/* Toggle Menu Button (Issue 6) */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="fixed top-4 right-4 z-50 p-2 bg-card/80 dark:bg-card/80 backdrop-blur border border-border rounded-full shadow-sm hover:bg-card text-muted-foreground hover:text-primary transition-all"
                title={isMenuOpen ? "Focar na questão" : "Mostrar filtros"}
            >
                {isMenuOpen ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            {/* Header (Controlled by isMenuOpen) */}
            {isMenuOpen && (
                <div className="relative z-40 px-4 pt-4 pb-2 bg-transparent shrink-0 animate-in slide-in-from-top-4 duration-300">
                    <div className="max-w-6xl mx-auto bg-card/80 dark:bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 rounded-2xl px-5 py-4 flex flex-col gap-5">
                        
                        {/* Top Row: Navigation & Title */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
                                    <Brain size={20} className="text-blue-500 dark:text-blue-400 fill-blue-100 dark:fill-blue-900/50" />
                                    Banco de Questões
                                </h1>
                            </div>

                            {/* Tabs (Issue 2) */}
                            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                                <button
                                    onClick={() => setActiveTab('todo')}
                                    className={`flex-1 md:w-32 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        activeTab === 'todo' 
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <Circle size={14} className={activeTab === 'todo' ? "fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400" : ""} />
                                    A Fazer
                                </button>
                                <button
                                    onClick={() => setActiveTab('done')}
                                    className={`flex-1 md:w-32 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        activeTab === 'done' 
                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <CheckCircle2 size={14} className={activeTab === 'done' ? "fill-emerald-600 text-emerald-100" : ""} />
                                    Respondidas
                                </button>
                            </div>
                        </div>

                        {/* Bottom Row: Filters (Issue 5 Fix: Grid Layout) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* 1. Matéria */}
                            <div className="relative group">
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm font-semibold rounded-xl pl-3 pr-8 py-3 outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-sm"
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    value={filterSubject}
                                >
                                    <option value="" disabled className="text-slate-400">Selecione a Matéria</option>
                                    <option value="Todas" className="font-bold text-blue-600">📚 Todas as Matérias</option>
                                    {SUBJECTS.map(subj => (
                                        <option key={subj} value={subj}>{subj}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>

                            {/* 2. Tópico */}
                            <div className="relative group">
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm font-semibold rounded-xl pl-3 pr-8 py-3 outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-500 appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900 shadow-sm"
                                    onChange={(e) => setFilterTopic(e.target.value)}
                                    value={filterTopic}
                                    disabled={!filterSubject} 
                                >
                                    <option value="Todos" className="font-bold text-sky-600">Todos os Tópicos</option>
                                    {availableTopics.map((t) => (
                                        <option key={t.name} value={t.name}>{t.name} </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>

                            {/* 3. Ano */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                                </div>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm font-semibold rounded-xl pl-9 pr-8 py-3 outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 appearance-none transition-all cursor-pointer shadow-sm"
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    value={filterYear}
                                >
                                    <option value="Todos" className="font-bold text-indigo-600">Todos os Anos</option>
                                    {YEARS.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>

                            {/* 4. Dificuldade */}
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <BarChart size={14} className="text-slate-400 dark:text-slate-500" />
                                </div>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm font-semibold rounded-xl pl-9 pr-8 py-3 outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/50 focus:border-purple-500 appearance-none transition-all cursor-pointer shadow-sm"
                                    onChange={(e) => setFilterDifficulty(e.target.value)}
                                    value={filterDifficulty}
                                >
                                    <option value="Todas" className="font-bold text-purple-600">Todas Dificuldades</option>
                                    {DIFFICULTIES.map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 relative z-10 flex-grow w-full">
                
                {/* LÓGICA DE RENDERIZAÇÃO CORRIGIDA:
                    1. Se estiver carregando a primeira página: Skeleton.
                    2. Se não tiver filtro de matéria selecionado: WELCOME STATE (Issue 1).
                    3. Se tiver dados: Cards.
                    4. Se não tiver dados (e não for 1 ou 2): Empty State.
                */}

                {loading && page === 1 ? (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex justify-between items-end mb-6 px-1 opacity-50">
                            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                            <div className="hidden md:block w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                         </div>
                        <QuestionCardSkeleton />
                    </div>
                ) : !filterSubject ? (
                    // --- WELCOME STATE (Issue 1 Fix) ---
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 mt-8 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50 dark:ring-blue-900/30">
                            <Sparkles size={40} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-50 mb-4">
                            Bem vindo ao banco de questões da StudyTrack
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-lg text-lg leading-relaxed">
                        O banco de questões com mais de <span className="font-bold text-blue-600 dark:text-blue-400">{totalQuestions.toLocaleString('pt-BR')} questões</span>. 
                            <br />
                            Selecione a <span className="font-bold text-slate-800 dark:text-slate-200">matéria acima</span> e um tópico específico se preferir para começar.
                        </p>
                        <div className="mt-8 flex gap-2 text-sm text-slate-400 dark:text-slate-500">
                            <Filter size={16} /> 
                            <span>Use os filtros para refinar sua busca</span>
                        </div>
                    </div>
                ) : currentQ ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-8">
                        
                        <div className="flex justify-between items-end mb-6 px-1">
                            <div>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex inline-flex items-center gap-2 ${
                                    activeTab === 'todo' 
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800' 
                                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800'
                                }`}>
                                    {activeTab === 'todo' ? <Circle size={10} fill="currentColor" /> : <CheckCircle2 size={12} />}
                                    Questão {currentIdx + 1}
                                </span>
                                
                                {isLockedByQuota && (
                                    <span className="ml-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800 flex inline-flex items-center gap-1">
                                        <Lock size={10} /> Free Limit
                                    </span>
                                )}
                                <h2 className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium pl-1">
                                    {activeTab === 'todo' ? 'Questões disponíveis nesta trilha' : 'Histórico de questões'}
                                </h2>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-end justify-end">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                                    Total do Filtro
                                </span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    {totalQuestionsFound} questões
                                </span>
                            </div>
                        </div>

                        {/* Card Container */}
                        <div className="relative group perspective-1000 mb-8">
                            <div className={`absolute -inset-1 rounded-[2rem] blur opacity-10 group-hover:opacity-25 transition duration-500 ${
                                activeTab === 'todo' ? 'bg-gradient-to-r from-blue-400 to-sky-300' : 'bg-gradient-to-r from-emerald-400 to-teal-300'
                            }`}></div>
                            
                            <div className={`relative bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-xl shadow-blue-900/5 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 overflow-hidden ${isLockedByQuota ? 'blur-[2px] pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                                <QuestionCard 
                                    key={currentQ.id} 
                                    userId={userId || ""}
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
                                    onReportError={() => {
                                        setReportQuestionId(currentQ.id);
                                        setReportDialogOpen(true);
                                    }}
                                />
                            </div>

                            {isLockedByQuota && (
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <button 
                                        onClick={() => setIsUpsellOpen(true)}
                                        className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/50 dark:border-slate-700 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full text-amber-600 dark:text-amber-400">
                                            <Lock size={32} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-50">Conteúdo Exclusivo</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Toque para desbloquear</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    // Empty State (Só aparece se filtro selecionado mas 0 questões)
                    <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 shadow-sm mt-8 animate-in fade-in zoom-in duration-500">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-8 animate-pulse-slow ${
                            activeTab === 'todo' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 ring-blue-50/50 dark:ring-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400 ring-emerald-50/50 dark:ring-emerald-900/30'
                        }`}>
                            {activeTab === 'todo' ? <Sparkles size={40} /> : <CheckCircle2 size={40} />}
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-50 mb-2">
                            {activeTab === 'todo' 
                                ? "Nenhuma questão encontrada" 
                                : "Histórico vazio"}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs mx-auto leading-relaxed">
                            {activeTab === 'todo' 
                                ? "Tente ajustar os filtros de ano ou dificuldade para encontrar mais questões."
                                : "As questões que você responder aparecerão aqui para revisão."}
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation Bar */}
            {currentQ && userId && !loading && (
                <div className="w-full px-4 pb-12 pt-6 mt-auto animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="max-w-xl mx-auto">
                        <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border border-white/50 dark:border-slate-800 shadow-xl shadow-blue-900/5 dark:shadow-slate-950/50 rounded-2xl p-2.5 flex items-center justify-between gap-3">
                            <button 
                                onClick={handlePrev}
                                disabled={currentIdx === 0}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 dark:disabled:hover:bg-slate-800 transition-all flex justify-center items-center gap-2 group active:scale-[0.98]"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-200" /> 
                                <span className="hidden sm:inline">Anterior</span>
                            </button>
                            
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            
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