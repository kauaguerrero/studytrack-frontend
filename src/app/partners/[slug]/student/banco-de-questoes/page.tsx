'use client';

/**
 * Banco de Questões — versão visual Edificar Student.
 * Toda a lógica de negócio e chamadas de API são idênticas ao portal padrão.
 * Apenas o layout/UI foi elevado: brand colors, mobile-first, Framer Motion, Dark Mode.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import {
  ChevronDown, ArrowLeft, ArrowRight, Brain, Lock,
  CheckCircle2, Circle, Loader2, Sparkles, Calendar,
  BarChart, Eye, EyeOff, SlidersHorizontal,
} from 'lucide-react';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportDialog } from '@/components/questions/ReportDialog';
import { usePopupQueue } from '@/components/partners/gamification/PopupQueueContext';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Topic {
  name: string;
  count: number;
}

interface QuestionFilterOptions {
  subjects: string[];
  banks: string[];
  years: string[];
  difficulties: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 5000;
const DEFAULT_FILTER_OPTIONS: QuestionFilterOptions = {
  subjects: [],
  banks: [],
  years: [],
  difficulties: [],
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const QuestionCardSkeleton = () => (
  <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="h-5 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
    </div>
    <div className="space-y-3 mb-8">
      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="h-4 w-11/12 bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50" />
      ))}
    </div>
  </div>
);

// ─── Shared select style ──────────────────────────────────────────────────────

const selectClass =
  'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl ' +
  'pl-3 pr-8 py-3 outline-none appearance-none transition-all cursor-pointer shadow-sm ' +
  'hover:border-slate-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50';

function normalizeBankValue(value: unknown): string {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'UFU' || normalized === 'UFU_VEST') return 'UFU';
  if (normalized === 'UEG' || normalized === 'UEG_VEST') return 'UEG';
  if (normalized === 'UFG' || normalized === 'UFG_VEST') return 'UFG';
  if (normalized === 'UNESP') return 'UNESP';
  if (normalized === 'ENEM' || normalized === 'INEP_ENEM' || normalized === 'ENEM_OFICIAL') return 'ENEM';
  if (normalized) return normalized;
  return 'ENEM';
}

function inferQuestionBank(row: any): string {
  if (row?.bank) return normalizeBankValue(row.bank);
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (metadata?.bank || metadata?.source) return normalizeBankValue(metadata.bank || metadata.source);
  const extId = String(row?.external_id || '').toUpperCase();
  if (extId.startsWith('UFU_VEST_')) return 'UFU';
  if (extId.startsWith('UEG_VEST_')) return 'UEG';
  if (extId.startsWith('UFG_VEST_')) return 'UFG';
  if (extId.startsWith('UNESP_')) return 'UNESP';
  return 'ENEM';
}

function uniqueSorted(values: Array<string | number | null | undefined>, desc = false): string[] {
  const items = Array.from(new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));
  return items.sort((a, b) => (
    desc ? Number(b) - Number(a) || b.localeCompare(a) : a.localeCompare(b, 'pt-BR')
  ));
}

// ─── Contrast helper ──────────────────────────────────────────────────────────

function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#ffffff';
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? '#1e293b' : '#ffffff';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BancoDeQuestoes() {
  const { enqueuePopup } = usePopupQueue();
  const { org } = useOrg();
  const brandTextColor = getContrastTextColor(org.brand_primary);
  // ── State: Data ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ── State: Filters & Logic ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  const [filterSubject, setFilterSubject] = useState('Todas');
  const [filterBank, setFilterBank] = useState('Todas');
  const [filterTopic, setFilterTopic] = useState('Todos');
  const [filterYear, setFilterYear] = useState('Todos');
  const [filterDifficulty, setFilterDifficulty] = useState('Todas');

  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [filterOptions, setFilterOptions] = useState<QuestionFilterOptions>(DEFAULT_FILTER_OPTIONS);

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
  const [isLockedByQuota, setIsLockedByQuota] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);
  const totalQuestions = TOTAL_QUESTIONS;

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);
  const questionTopRef = useRef<HTMLDivElement>(null);

  // ── Session points (gamification B2B) ────────────────────────────────────────
  const SESSION_KEY = 'qsr_pending_points';
  const sessionPointsRef = useRef(0);

  // ── Accessibility ─────────────────────────────────────────────────────────
  const shouldReduce = useReducedMotion();

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeSecondaryCount = [
    filterBank !== 'Todas',
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
        await reportError('QuestionBankInitError', String(error), { flow: 'question_bank_init' });
      }
    };
    init();
  }, []);

  // ── Session points: resetar ao montar (nova sessão) ─────────────────────────
  useEffect(() => {
    sessionStorage.removeItem('qsr_pending_points');
    sessionStorage.removeItem('qsr_shield_earned');
  }, []);

  // ── 2a. Filter options — sempre derivadas do banco ─────────────────────────
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('questions')
          .select('subject, discipline, difficulty, exam_year, bank, metadata, external_id')
          .eq('is_verified', true)
          .limit(10000);

        if (error) throw error;

        const rows = data || [];
        setFilterOptions({
          subjects: uniqueSorted(rows.map((row) => row.subject)),
          banks: uniqueSorted(rows.map(inferQuestionBank)),
          years: uniqueSorted(rows.map((row) => row.exam_year), true),
          difficulties: uniqueSorted(rows.map((row) => row.difficulty)),
        });
      } catch (err) {
        void reportError('QuestionBankFilterOptionsError', String(err));
      }
    }

    loadFilterOptions();
  }, []);

  // ── 2. Topics — direto no Supabase (sem CORS) ────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    async function loadTopics() {
      try {
        const supabase = createClient();
        const query = supabase
          .from('questions')
          .select('discipline, metadata, external_id, bank')
          .eq('is_verified', true)
          .limit(2000);

        const subjectQuery = !filterSubject || filterSubject === 'Todas' ? '' : filterSubject;
        const { data } = await (subjectQuery
          ? query.ilike('subject', `%${subjectQuery}%`)
          : query);

        const counter: Record<string, number> = {};
        for (const row of data || []) {
          if (filterBank !== 'Todas' && inferQuestionBank(row) !== filterBank) continue;
          const t: string | null =
            row.discipline?.trim() ||
            (row.metadata as any)?.ai_topic?.trim() ||
            null;
          if (t && t.length > 2) counter[t] = (counter[t] || 0) + 1;
        }

        const sorted = Object.entries(counter)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count]) => ({ name, count }));

        setAvailableTopics(sorted);
        setFilterTopic('Todos');
      } catch (err) {
        void reportError('QuestionBankTopicsError', String(err));
      }
    }
    loadTopics();
  }, [filterSubject, filterBank, userId]);

  // ── Filter reset ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      setQuestions([]);
      setPage(1);
      setCurrentIdx(0);
      setHasMore(true);
      fetchQuestions(1, false);
    }
  }, [filterSubject, filterBank, filterTopic, filterYear, filterDifficulty, activeTab, userId]);

  // ── 3. Core fetch ─────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(
    async (targetPage = 1, append = false, retryCount = 0) => {
      if (!userId) return;
      // Always fetch a fresh session so expired tokens are refreshed automatically.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      authTokenRef.current = token;
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
        const params = new URLSearchParams({ page: targetPage.toString(), limit: '20' });
        if (filterSubject && filterSubject !== 'Todas') params.append('subject', filterSubject);
        if (filterBank && filterBank !== 'Todas') params.append('bank', filterBank);
        if (filterTopic && filterTopic !== 'Todos') params.append('topic', filterTopic);
        if (filterYear && filterYear !== 'Todos') params.append('year', filterYear);
        if (filterDifficulty && filterDifficulty !== 'Todas') params.append('difficulty', filterDifficulty);
        params.append('tab', activeTab);

        const res = await fetch(`/api/proxy/questions/?${params.toString()}`, {
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
        void reportError('QuestionBankError', String(err));
      } finally {
        if (retryCount === 0) {
          setLoading(false);
          setLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
    },
    [userId, activeTab, answeredIds, filterSubject, filterBank, filterTopic, filterYear, filterDifficulty]
  );

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingMore && hasMore && questions.length > 0 && currentIdx >= questions.length - 3) {
      if (!isLoadingRef.current) fetchQuestions(page + 1, true);
    }
  }, [currentIdx, questions.length, hasMore, loadingMore, page, fetchQuestions]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleQuotaLimitReached = (_reasonCode: string) => {
    setIsLockedByQuota(true);
    toast.info('Limite de questões atingido', { description: 'Entre em contato com o administrador da sua organização para liberar o acesso.' });
  };

  const handleNext = () => {
    if (isLockedByQuota) { toast.info('Limite de questões atingido', { description: 'Entre em contato com o administrador da sua organização.' }); return; }
    if (loadingMore && currentIdx >= questions.length - 1) return;
    const current = questions[currentIdx];
    const currentGroupId = current?.testlet_group_id;
    const groupIndexes = currentGroupId
      ? questions.map((q, index) => q.testlet_group_id === currentGroupId ? index : -1).filter((index) => index >= 0)
      : [];
    const nextIndex = groupIndexes.length > 1 ? Math.max(...groupIndexes) + 1 : currentIdx + 1;
    if (nextIndex < questions.length) {
      setCurrentIdx(nextIndex);
      questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrev = () => {
    const current = questions[currentIdx];
    const currentGroupId = current?.testlet_group_id;
    const groupIndexes = currentGroupId
      ? questions.map((q, index) => q.testlet_group_id === currentGroupId ? index : -1).filter((index) => index >= 0)
      : [];
    const previousIndex = groupIndexes.length > 1 ? Math.min(...groupIndexes) - 1 : currentIdx - 1;
    if (previousIndex >= 0) {
      setCurrentIdx(previousIndex);
      questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLocalAnswer = (qId: string) => {
    setAnsweredIds((prev) => new Set(prev).add(qId));
  };

  const handleAnswerResult = useCallback(
    (qId: string, result: { is_correct?: boolean; new_streak?: number; streak_updated?: boolean; gamification?: { points_awarded: number; shield_awarded?: boolean } }) => {
      handleLocalAnswer(qId);
      // Usa os pontos da API quando disponíveis (usuários com org_id — backend já
      // persiste monthly_points). Para usuários sem org_id, fallback via RPC direto.
      const hasBackendGamification = result.gamification !== undefined;
      const pts = hasBackendGamification
        ? (result.gamification!.points_awarded ?? 0)
        : (result.is_correct ? 2 : 0);
      if (pts > 0) {
        sessionPointsRef.current += pts;
        const current = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
        sessionStorage.setItem(SESSION_KEY, String(current + pts));

        // RPC só para usuários sem org_id: o backend não atualizou monthly_points
        if (!hasBackendGamification && userId) {
          const supabase = createClient();
          supabase.rpc('increment_monthly_points', { user_id: userId, points: 2 })
            .then(({ error }) => {
              if (error) reportError('MonthlyPointsUpdateError', String(error), { user_id: userId });
            });
        }
      }
      if (result.gamification?.shield_awarded) {
        sessionStorage.setItem('qsr_shield_earned', '1');
        sessionStorage.setItem('shield_earned_pending', '1');
      }
      const nextStreak = result.new_streak ?? 0;
      if (result.streak_updated && nextStreak >= 1) {
        enqueuePopup({
          kind: 'streak',
          routeScope: 'dashboard',
          streak: nextStreak,
          dedupeKey: `streak:${nextStreak}`,
        });
      }
    },
    [SESSION_KEY, enqueuePopup, userId],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const currentTestletQuestions = useMemo(() => {
    if (!currentQ?.testlet_group_id) return currentQ ? [currentQ] : [];
    return questions.filter((q) => q.testlet_group_id === currentQ.testlet_group_id);
  }, [currentQ, questions]);
  const isCurrentTestletGroup = currentTestletQuestions.length > 1;
  const testletPositionMap = useMemo(() => {
    const map = new Map<string, { position: number; total: number }>();
    const groupCounts = new Map<string, number>();
    for (const q of questions) {
      if (q.testlet_group_id) {
        groupCounts.set(q.testlet_group_id, (groupCounts.get(q.testlet_group_id) || 0) + 1);
      }
    }
    const groupCounters = new Map<string, number>();
    for (const q of questions) {
      if (q.testlet_group_id) {
        const position = (groupCounters.get(q.testlet_group_id) || 0) + 1;
        groupCounters.set(q.testlet_group_id, position);
        map.set(q.id, {
          position,
          total: groupCounts.get(q.testlet_group_id) || position,
        });
      }
    }
    return map;
  }, [questions]);
  const currentTestletInfo = currentQ ? testletPositionMap.get(currentQ.id) : undefined;
  const currentGroupLastIndex = isCurrentTestletGroup
    ? Math.max(...currentTestletQuestions.map((groupQuestion) => questions.findIndex((q) => q.id === groupQuestion.id)))
    : currentIdx;
  const isNextDisabled = currentGroupLastIndex >= questions.length - 1;

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
    <div className="bg-[#F5F5F7] dark:bg-slate-950/50 overscroll-none">

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        questionId={reportQuestionId || ''}
        authToken={authTokenRef.current}
        questionSnapshot={questions.find((q) => q.id === reportQuestionId) ?? null}
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

      {/* ── Filter Header ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="filter-header"
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 rounded-xl shadow-sm mb-2"
          >
            <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">

              {/* Row 1: Title + Tabs + Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Brain size={18} style={{ color: 'var(--brand-primary)' }} />
                  <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                    Banco de Questões
                  </h1>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {/* Tabs */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      onClick={() => setActiveTab('todo')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isTabTodo
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isTabTodo
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                      <CheckCircle2
                        size={12}
                        className={!isTabTodo ? 'text-emerald-600 dark:text-emerald-400' : ''}
                      />
                      <span className="hidden xs:inline">Respondidas</span>
                    </button>
                  </div>

                  {/* Collapse toggle */}
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    title="Focar na questão"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0"
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
                    {filterOptions.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* "Filtros" button — mobile: visible, sm+: hidden (secondary always visible) */}
                <button
                  onClick={() => setShowSecondaryFilters((v) => !v)}
                  className={`sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors shrink-0 ${activeSecondaryCount > 0
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  style={activeSecondaryCount > 0 ? { background: 'color-mix(in srgb, var(--brand-primary) 5%, transparent)' } : {}}
                >
                  <SlidersHorizontal size={14} />
                  Filtros
                  {activeSecondaryCount > 0 && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black"
                      style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                    >
                      {activeSecondaryCount}
                    </span>
                  )}
                </button>

                {/* Desktop: Tópico, Ano, Dificuldade inline */}
                <div className="hidden sm:flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <select
                      className={selectClass}
                      onChange={(e) => setFilterBank(e.target.value)}
                      value={filterBank}
                    >
                      <option value="Todas">Todas as Bancas</option>
                      {filterOptions.banks.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Tópico */}
                  <div className="relative flex-1">
                    <select
                      className={selectClass}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      value={filterTopic}
                      disabled={availableTopics.length === 0}
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
                      {filterOptions.years.map((y) => (
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
                      {filterOptions.difficulties.map((d) => (
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
                      <div className="relative col-span-3">
                        <select
                          className={selectClass}
                          onChange={(e) => setFilterBank(e.target.value)}
                          value={filterBank}
                        >
                          <option value="Todas">Todas as Bancas</option>
                          {filterOptions.banks.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Tópico */}
                      <div className="relative col-span-3">
                        <select
                          className={selectClass}
                          onChange={(e) => setFilterTopic(e.target.value)}
                          value={filterTopic}
                          disabled={availableTopics.length === 0}
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
                          {filterOptions.years.map((y) => (
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
                          {filterOptions.difficulties.map((d) => (
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
            className="fixed top-[4.75rem] right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-md text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <Eye size={14} />
            Filtros
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-5 w-full">

        {loading && page === 1 ? (

          /* Skeleton */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex justify-between items-center mb-5">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
            <QuestionCardSkeleton />
          </motion.div>

        ) : !filterSubject ? (

          /* Welcome State */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4 text-center px-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8"
                style={{
                  background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                  ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--brand-primary) 5%, transparent)'
                } as React.CSSProperties}
              >
                <Sparkles size={34} style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">
                Banco de Questões StudyTrack
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm leading-relaxed">
                Mais de{' '}
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {totalQuestions.toLocaleString('pt-BR')} questões
                </span>{' '}
                disponíveis no banco da plataforma.{' '}
                <span className="font-semibold">Selecione a matéria e a banca</span> acima para começar.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700/50">
                <SlidersHorizontal size={13} />
                Use os filtros para refinar por tópico, ano ou dificuldade
              </div>
            </div>
          </motion.div>

        ) : currentQ ? (

          /* Question view */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>

            {/* Counter bar — visible on ALL screens */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${isTabTodo
                    ? 'border-[var(--brand-primary)]/20'
                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                    }`}
                  style={isTabTodo ? { color: 'var(--brand-primary)', background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' } : {}}
                >
                  {isTabTodo
                    ? <Circle size={9} fill="currentColor" />
                    : <CheckCircle2 size={11} />
                  }
                  {isCurrentTestletGroup ? `Testlet ${currentTestletQuestions.length} questões` : `Questão ${currentIdx + 1}`}
                </span>

                {isLockedByQuota && (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800 inline-flex items-center gap-1">
                    <Lock size={10} /> Limite atingido
                  </span>
                )}
              </div>

              {/* Total — visible on ALL screens */}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                {totalQuestionsFound > 0
                  ? `${totalQuestionsFound} questões`
                  : activeTab === 'todo'
                    ? 'Nesta trilha'
                    : 'Histórico'}
              </span>
            </div>

            {/* Progress bar: position in loaded questions */}
            {questions.length > 1 && (
              <div className="mb-5 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--brand-primary)' }}
                  animate={{ width: `${Math.round(((currentIdx + 1) / questions.length) * 100)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            )}

            {/* Question card */}
            <div ref={questionTopRef} className="relative group">
              <div
                className={`absolute -inset-1 rounded-2xl blur opacity-0 group-hover:opacity-15 transition duration-500 ${isTabTodo
                  ? ''
                  : 'bg-gradient-to-r from-emerald-400 dark:from-emerald-600 to-teal-300 dark:to-teal-600'
                  }`}
                style={isTabTodo ? { background: 'var(--brand-primary)' } : {}}
              />
              <div
                className={`relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden ${currentTestletInfo && currentTestletInfo.position > 1 ? 'border-l-4 border-l-amber-200 pl-4 -ml-4' : ''} ${isLockedByQuota ? 'blur-[2px] pointer-events-none select-none' : ''
                  }`}
              >
                <div className={isCurrentTestletGroup ? 'divide-y divide-slate-100 dark:divide-slate-800' : ''}>
                  {currentTestletQuestions.map((questionInGroup, groupIndex) => {
                    const testletInfo = testletPositionMap.get(questionInGroup.id);
                    return (
                      <QuestionCard
                        key={questionInGroup.id}
                        userId={userId || ''}
                        question={{
                          id: questionInGroup.id,
                          external_id: questionInGroup.external_id,
                          year: questionInGroup.exam_year,
                          bank: questionInGroup.bank,
                          subject: questionInGroup.subject,
                          difficulty: questionInGroup.difficulty || 'Médio',
                          context: questionInGroup.context,
                          statement: questionInGroup.statement,
                          alternatives: questionInGroup.alternatives,
                          correct_option: questionInGroup.correct_option,
                          explanation: questionInGroup.explanation,
                          images: questionInGroup.images,
                          metadata: questionInGroup.metadata,
                        }}
                        testletInfo={testletInfo}
                        suppressContext={isCurrentTestletGroup && groupIndex > 0}
                        onQuotaReached={handleQuotaLimitReached}
                        onAnswer={(result) => handleAnswerResult(questionInGroup.id, result)}
                        onReportError={() => {
                          setReportQuestionId(questionInGroup.id);
                          setReportDialogOpen(true);
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Locked overlay */}
              {isLockedByQuota && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-full text-amber-500">
                      <Lock size={28} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Limite atingido</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Contacte o administrador da organização</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </motion.div>

        ) : (

          /* Empty State */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm mt-4 text-center px-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8 ${isTabTodo
                    ? ''
                    : 'bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-50/50 dark:ring-emerald-900/20'
                  }`}
                style={isTabTodo ? {
                  background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
                  ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--brand-primary) 5%, transparent)'
                } as React.CSSProperties : {}}
              >
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
                {isTabTodo ? 'Nenhuma questão encontrada' : 'Histórico vazio'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
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
            className="px-4 pt-4 pb-4"
          >
            <div className="max-w-xl mx-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-900/8 dark:shadow-black/40 rounded-2xl p-2 flex items-center gap-2">

                {/* Prev */}
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="flex-1 flex justify-center items-center gap-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl disabled:opacity-35 disabled:hover:bg-slate-50 dark:disabled:hover:bg-slate-800/80 transition-all active:scale-[0.97] group"
                >
                  <ArrowLeft
                    size={17}
                    className="group-hover:-translate-x-0.5 transition-transform text-slate-400 dark:text-slate-500"
                  />
                  <span className="hidden sm:inline text-sm">Anterior</span>
                </button>

                <div className="h-7 w-px bg-slate-100 dark:bg-slate-800 shrink-0" />

                {/* Next */}
                <button
                  onClick={handleNext}
                  disabled={
                    (isNextDisabled && !hasMore && !isLockedByQuota) ||
                    (loadingMore && currentIdx === questions.length - 1)
                  }
                  className={`flex-[2] font-bold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 group active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${isLockedByQuota
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : isTabTodo
                      ? 'hover:brightness-105'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  style={isTabTodo && !isLockedByQuota ? { background: 'var(--brand-primary)', color: brandTextColor } : {}}
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
