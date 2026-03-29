'use client';

/**
 * Banco de Questões — versão visual Edificar Student.
 * Toda a lógica de negócio e chamadas de API são idênticas ao portal padrão.
 * Apenas o layout/UI foi elevado: brand colors, mobile-first, Framer Motion.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  ChevronDown, ArrowLeft, ArrowRight, Brain, Lock,
  CheckCircle2, Circle, Loader2, Sparkles, Calendar,
  BarChart, Eye, EyeOff, SlidersHorizontal,
} from 'lucide-react';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportDialog } from '@/components/questions/ReportDialog';
import { UpsellModal } from '@/components/modals/UpsellModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Topic {
  name: string;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Matemática', 'Física', 'Química', 'Biologia', 'História',
  'Geografia', 'Filosofia', 'Sociologia', 'Língua Portuguesa',
  'Inglês', 'Espanhol',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2008 }, (_, i) =>
  (CURRENT_YEAR - i).toString()
);

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const QuestionCardSkeleton = () => (
  <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="h-5 w-28 bg-slate-100 rounded-lg" />
      <div className="h-5 w-20 bg-slate-100 rounded-lg" />
    </div>
    <div className="space-y-3 mb-8">
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="h-4 w-11/12 bg-slate-100 rounded" />
      <div className="h-4 w-4/5 bg-slate-100 rounded" />
      <div className="h-4 w-full bg-slate-100 rounded" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 w-full bg-slate-100 rounded-xl border border-slate-100" />
      ))}
    </div>
  </div>
);

// ─── Shared select style ──────────────────────────────────────────────────────

const selectClass =
  'w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl ' +
  'pl-3 pr-8 py-3 outline-none appearance-none transition-all cursor-pointer shadow-sm ' +
  'hover:border-slate-300 focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-50';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BancoDeQuestoes() {
  // ── State: Data ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ── State: Filters & Logic ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('Todos');
  const [filterYear, setFilterYear] = useState('Todos');
  const [filterDifficulty, setFilterDifficulty] = useState('Todas');

  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);

  // ── State: UI Controls ──────────────────────────────────────────────────────
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [showSecondaryFilters, setShowSecondaryFilters] = useState(false);

  // ── State: Loading & User ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [totalQuestionsFound, setTotalQuestionsFound] = useState<number>(0);

  // ── State: Pagination & Upsell ──────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [upsellReason, setUpsellReason] = useState<
    'DAILY_QUOTA_REACHED' | 'TRIAL_EXPIRED' | 'GENERIC_UPSELL'
  >('DAILY_QUOTA_REACHED');
  const [isLockedByQuota, setIsLockedByQuota] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number>(2700);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);

  // ── Accessibility ─────────────────────────────────────────────────────────
  const shouldReduce = useReducedMotion();

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeSecondaryCount = [
    filterTopic !== 'Todos',
    filterYear !== 'Todos',
    filterDifficulty !== 'Todas',
  ].filter(Boolean).length;

  // ── 1. Init ──────────────────────────────────────────────────────────────────
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
            supabase.from('profiles').select('full_name').eq('id', user.id).single(),
            supabase.from('user_answers').select('question_id').eq('user_id', user.id),
          ]);

          setUserProfile(profileRes.data);
          if (answersRes.data) {
            setAnsweredIds(new Set(answersRes.data.map((a) => a.question_id)));
          }
        }
      } catch (error) {
        console.error('Critical Init Error:', error);
        await reportError('QuestionBankInitError', String(error), { flow: 'question_bank_init' });
      }
    };
    init();
  }, []);

  // ── Total de questões ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = authTokenRef.current;
    if (!token) return;

    const fetchTotal = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${apiUrl}/api/questions/total`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.total) setTotalQuestions(data.total);
        }
      } catch (err) {
        console.error('Erro ao buscar total:', err);
        void reportError('QuestionBankTotalFetchError', String(err));
      }
    };
    fetchTotal();
  }, [userId]);

  // ── 2. Topics ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = authTokenRef.current;
    if (!token) return;

    async function loadTopics() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const subjectQuery = !filterSubject || filterSubject === 'Todas' ? '' : filterSubject;
        const res = await fetch(
          `${apiUrl}/api/questions/topics?subject=${encodeURIComponent(subjectQuery)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setAvailableTopics(data);
        setFilterTopic('Todos');
      } catch (err) {
        console.error(err);
        void reportError('QuestionBankError', String(err));
      }
    }
    loadTopics();
  }, [filterSubject, userId]);

  // ── Filter reset ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      setQuestions([]);
      setPage(1);
      setCurrentIdx(0);
      setHasMore(true);
      if (filterSubject) fetchQuestions(1, false);
    }
  }, [filterSubject, filterTopic, filterYear, filterDifficulty, activeTab, userId]);

  // ── 3. Core fetch ─────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(
    async (targetPage = 1, append = false, retryCount = 0) => {
      const token = authTokenRef.current;
      if (!token || !userId) return;
      if (!filterSubject) return;
      if (isLoadingRef.current && retryCount === 0) return;
      if (retryCount > 10) {
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        isLoadingRef.current = false;
        return;
      }
      if (retryCount === 0) {
        isLoadingRef.current = true;
        if (!append) setLoading(true);
        else setLoadingMore(true);
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const params = new URLSearchParams({ page: targetPage.toString(), limit: '20' });
        if (filterSubject && filterSubject !== 'Todas') params.append('subject', filterSubject);
        if (filterTopic && filterTopic !== 'Todos') params.append('topic', filterTopic);
        if (filterYear && filterYear !== 'Todos') params.append('year', filterYear);
        if (filterDifficulty && filterDifficulty !== 'Todas') params.append('difficulty', filterDifficulty);
        params.append('tab', activeTab);

        const res = await fetch(`${apiUrl}/api/questions/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) throw new Error('Unauthorized');
        if (!res.ok) {
          const body = await res.text();
          let errMsg = `Failed to fetch questions (${res.status})`;
          try {
            const j = JSON.parse(body);
            if (j?.error) errMsg += `: ${j.error}`;
            else if (j?.message) errMsg += `: ${j.message}`;
          } catch (_) {
            if (body) errMsg += `: ${body.slice(0, 100)}`;
          }
          void reportError('QuestionBankApiError', String(errMsg), { status: res.status });
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (!append) setTotalQuestionsFound(data.total || 0);
        if (data.user_status?.locked) setIsLockedByQuota(true);
        else setIsLockedByQuota(false);

        const rawQuestions = data.data || [];
        const filteredQuestions = rawQuestions;
        const shouldFetchNext = rawQuestions.length > 0 && filteredQuestions.length === 0;

        if (shouldFetchNext) {
          await fetchQuestions(targetPage + 1, append, retryCount + 1);
        } else {
          if (append) setQuestions((prev) => [...prev, ...filteredQuestions]);
          else {
            setQuestions(filteredQuestions);
            setCurrentIdx(0);
          }
          setPage(targetPage);
          setHasMore(rawQuestions.length >= 20);
        }
      } catch (err) {
        console.error(err);
        void reportError('QuestionBankError', String(err));
      } finally {
        if (retryCount === 0) {
          setLoading(false);
          setLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
    },
    [userId, activeTab, answeredIds, filterSubject, filterTopic, filterYear, filterDifficulty]
  );

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingMore && hasMore && questions.length > 0 && currentIdx >= questions.length - 3) {
      if (!isLoadingRef.current) fetchQuestions(page + 1, true);
    }
  }, [currentIdx, questions.length, hasMore, loadingMore, page, fetchQuestions]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleQuotaLimitReached = (reasonCode: string) => {
    setIsLockedByQuota(true);
    setUpsellReason((reasonCode as any) || 'DAILY_QUOTA_REACHED');
    setIsUpsellOpen(true);
  };

  const handleNext = () => {
    if (isLockedByQuota) { setUpsellReason('DAILY_QUOTA_REACHED'); setIsUpsellOpen(true); return; }
    if (loadingMore && currentIdx >= questions.length - 1) return;
    if (currentIdx < questions.length - 1) setCurrentIdx((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((prev) => prev - 1);
  };

  const handleLocalAnswer = (qId: string) => {
    setAnsweredIds((prev) => new Set(prev).add(qId));
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const isNextDisabled = currentIdx === questions.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQ) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions.length, currentQ, isLockedByQuota, loadingMore]);

  // ── Animation helpers ─────────────────────────────────────────────────────────
  // Always passes valid motion props; when reduced, initial === animate (no movement).
  const fadeSlideInitial = shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 };
  const fadeSlideAnimate = { opacity: 1, y: 0 };
  const fadeSlideTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

  const isTabTodo = activeTab === 'todo';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col relative overscroll-none">

      {/* Modals — logic unchanged */}
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

      {/* ── Sticky Filter Header ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="filter-header"
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm"
          >
            <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">

              {/* Row 1: Title + Tabs + Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Brain size={18} style={{ color: 'var(--brand-primary)' }} />
                  <h1 className="text-base font-extrabold text-slate-800 leading-none">
                    Banco de Questões
                  </h1>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {/* Tabs */}
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                    <button
                      onClick={() => setActiveTab('todo')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isTabTodo
                          ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Circle
                        size={10}
                        style={isTabTodo ? { fill: 'var(--brand-primary)', color: 'var(--brand-primary)' } : {}}
                      />
                      <span className="hidden xs:inline">A Fazer</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('done')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isTabTodo
                          ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <CheckCircle2
                        size={12}
                        className={!isTabTodo ? 'text-emerald-600' : ''}
                      />
                      <span className="hidden xs:inline">Respondidas</span>
                    </button>
                  </div>

                  {/* Collapse toggle */}
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    title="Focar na questão"
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
              </div>

              {/* Row 2: Primary filter (Matéria) + secondary toggle */}
              <div className="flex gap-2 items-center">
                {/* Matéria — full width on mobile, 40% on sm+ */}
                <div className="relative flex-1 sm:flex-none sm:w-56">
                  <select
                    className={selectClass}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    value={filterSubject}
                  >
                    <option value="" disabled>Selecione a Matéria</option>
                    <option value="Todas">Todas as Matérias</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* "Filtros" button — mobile: visible, sm+: hidden (secondary always visible) */}
                <button
                  onClick={() => setShowSecondaryFilters((v) => !v)}
                  className={`sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors shrink-0 ${
                    activeSecondaryCount > 0
                      ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                      : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  Filtros
                  {activeSecondaryCount > 0 && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ background: 'var(--brand-primary)' }}
                    >
                      {activeSecondaryCount}
                    </span>
                  )}
                </button>

                {/* Desktop: Tópico, Ano, Dificuldade inline */}
                <div className="hidden sm:flex flex-1 gap-2">
                  {/* Tópico */}
                  <div className="relative flex-1">
                    <select
                      className={selectClass}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      value={filterTopic}
                      disabled={!filterSubject}
                    >
                      <option value="Todos">Todos os Tópicos</option>
                      {availableTopics.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Ano */}
                  <div className="relative flex-1">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className={`${selectClass} pl-8`}
                      onChange={(e) => setFilterYear(e.target.value)}
                      value={filterYear}
                    >
                      <option value="Todos">Todos os Anos</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Dificuldade */}
                  <div className="relative flex-1">
                    <BarChart size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className={`${selectClass} pl-8`}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      value={filterDifficulty}
                    >
                      <option value="Todas">Todas Dificuldades</option>
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: Secondary filters — mobile only, collapsible */}
              <AnimatePresence>
                {showSecondaryFilters && (
                  <motion.div
                    key="secondary-filters"
                    initial={shouldReduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden sm:hidden"
                  >
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {/* Tópico */}
                      <div className="relative col-span-3">
                        <select
                          className={selectClass}
                          onChange={(e) => setFilterTopic(e.target.value)}
                          value={filterTopic}
                          disabled={!filterSubject}
                        >
                          <option value="Todos">Todos os Tópicos</option>
                          {availableTopics.map((t) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Ano */}
                      <div className="relative col-span-3 sm:col-span-1">
                        <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          className={`${selectClass} pl-8`}
                          onChange={(e) => setFilterYear(e.target.value)}
                          value={filterYear}
                        >
                          <option value="Todos">Todos os Anos</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Dificuldade */}
                      <div className="relative col-span-3 sm:col-span-1">
                        <BarChart size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          className={`${selectClass} pl-8`}
                          onChange={(e) => setFilterDifficulty(e.target.value)}
                          value={filterDifficulty}
                        >
                          <option value="Todas">Todas Dificuldades</option>
                          {DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show-filters pill (when header is collapsed) */}
      <AnimatePresence>
        {!isMenuOpen && (
          <motion.button
            key="show-filters-pill"
            initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsMenuOpen(true)}
            title="Mostrar filtros"
            className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-md text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            <Eye size={14} />
            Filtros
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-5 flex-1 w-full">

        {loading && page === 1 ? (

          /* Skeleton */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex justify-between items-center mb-5">
              <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-5 w-24 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <QuestionCardSkeleton />
          </motion.div>

        ) : !filterSubject ? (

          /* Welcome State */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 text-center px-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}
              >
                <Sparkles size={34} style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-3">
                Banco de Questões StudyTrack
              </h2>
              <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                Mais de{' '}
                <span className="font-bold text-slate-800">
                  {totalQuestions.toLocaleString('pt-BR')} questões
                </span>{' '}
                do ENEM disponíveis.{' '}
                <span className="font-semibold">Selecione a matéria</span> acima para começar.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                <SlidersHorizontal size={13} />
                Use os filtros para refinar por tópico, ano ou dificuldade
              </div>
            </div>
          </motion.div>

        ) : currentQ ? (

          /* Question view */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition} className="pb-32">

            {/* Counter bar — visible on ALL screens */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                    isTabTodo
                      ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/8 border-[var(--brand-primary)]/20'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                  }`}
                >
                  {isTabTodo
                    ? <Circle size={9} fill="currentColor" />
                    : <CheckCircle2 size={11} />
                  }
                  Questão {currentIdx + 1}
                </span>

                {isLockedByQuota && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 inline-flex items-center gap-1">
                    <Lock size={10} /> Limite atingido
                  </span>
                )}
              </div>

              {/* Total — visible on ALL screens (fix: was hidden on mobile) */}
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                {totalQuestionsFound > 0
                  ? `${totalQuestionsFound} questões`
                  : activeTab === 'todo'
                    ? 'Nesta trilha'
                    : 'Histórico'}
              </span>
            </div>

            {/* Progress bar: position in loaded questions */}
            {questions.length > 1 && (
              <div className="mb-5 h-1 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--brand-primary)' }}
                  animate={{ width: `${Math.round(((currentIdx + 1) / questions.length) * 100)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            )}

            {/* Question card */}
            <div className="relative group">
              <div
                className={`absolute -inset-1 rounded-2xl blur opacity-0 group-hover:opacity-15 transition duration-500 ${
                  isTabTodo
                    ? 'bg-[var(--brand-primary)]'
                    : 'bg-gradient-to-r from-emerald-400 to-teal-300'
                }`}
              />
              <div
                className={`relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${
                  isLockedByQuota ? 'blur-[2px] pointer-events-none select-none' : ''
                }`}
              >
                <QuestionCard
                  key={currentQ.id}
                  userId={userId || ''}
                  question={{
                    id: currentQ.id,
                    external_id: currentQ.external_id,
                    year: currentQ.exam_year,
                    subject: currentQ.subject,
                    difficulty: currentQ.difficulty || 'Médio',
                    context: currentQ.context,
                    statement: currentQ.statement,
                    alternatives: currentQ.alternatives,
                    correct_option: currentQ.correct_option,
                    explanation: currentQ.explanation,
                    images: currentQ.images,
                  }}
                  onQuotaReached={handleQuotaLimitReached}
                  onAnswer={() => handleLocalAnswer(currentQ.id)}
                  onReportError={() => {
                    setReportQuestionId(currentQ.id);
                    setReportDialogOpen(true);
                  }}
                />
              </div>

              {/* Locked overlay */}
              {isLockedByQuota && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <button
                    onClick={() => setIsUpsellOpen(true)}
                    className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <div className="bg-amber-50 p-3 rounded-full text-amber-500">
                      <Lock size={28} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-extrabold text-slate-800 text-sm">Conteúdo Exclusivo</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Toque para desbloquear</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

          </motion.div>

        ) : (

          /* Empty State */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm mt-4 text-center px-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8 ${
                  isTabTodo
                    ? 'bg-[var(--brand-primary)]/8 ring-[var(--brand-primary)]/5'
                    : 'bg-emerald-50 ring-emerald-50/50'
                }`}
              >
                {isTabTodo
                  ? <Sparkles size={34} style={{ color: 'var(--brand-primary)' }} />
                  : <CheckCircle2 size={34} className="text-emerald-500" />
                }
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                {isTabTodo ? 'Nenhuma questão encontrada' : 'Histórico vazio'}
              </h3>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                {isTabTodo
                  ? 'Tente ajustar os filtros de ano ou dificuldade para encontrar mais questões.'
                  : 'As questões que você responder aparecerão aqui para revisão.'}
              </p>
            </div>
          </motion.div>

        )}
      </main>

      {/* ── Navigation Bar ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {currentQ && userId && !loading && (
          <motion.div
            key="nav-bar"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-3 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/90 to-transparent"
          >
            <div className="max-w-xl mx-auto">
              <div className="bg-white border border-slate-100 shadow-xl shadow-slate-900/8 rounded-2xl p-2 flex items-center gap-2">

                {/* Prev */}
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="flex-1 flex justify-center items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl disabled:opacity-35 disabled:hover:bg-slate-50 transition-all active:scale-[0.97] group"
                >
                  <ArrowLeft
                    size={17}
                    className="group-hover:-translate-x-0.5 transition-transform text-slate-400"
                  />
                  <span className="hidden sm:inline text-sm">Anterior</span>
                </button>

                <div className="h-7 w-px bg-slate-100 shrink-0" />

                {/* Next */}
                <button
                  onClick={handleNext}
                  disabled={
                    (isNextDisabled && !hasMore && !isLockedByQuota) ||
                    (loadingMore && currentIdx === questions.length - 1)
                  }
                  className={`flex-[2] text-white font-bold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 group active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                    isLockedByQuota
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : isTabTodo
                        ? 'bg-[var(--brand-primary)] hover:brightness-105'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isLockedByQuota ? (
                    <><Lock size={16} /> <span className="text-sm">Destrancar</span></>
                  ) : loadingMore ? (
                    <><Loader2 size={16} className="animate-spin" /> <span className="text-sm">Carregando...</span></>
                  ) : (
                    <>
                      <span className="text-sm">Próxima</span>
                      <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
