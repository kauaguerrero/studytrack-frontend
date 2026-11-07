'use client';

/**
 * Banco de Questões — versão visual Edificar Student.
 * Toda a lógica de negócio e chamadas de API são idênticas ao portal padrão.
 * Apenas o layout/UI foi elevado: brand colors, mobile-first, Framer Motion, Dark Mode.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import {
  ArrowLeft, ArrowRight, Lock,
  CheckCircle2, Circle, Loader2, Calendar,
  BarChart, Flag, BookOpen, Landmark, Layers, ChevronDown, Trash2, Briefcase, GraduationCap,
} from 'lucide-react';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportDialog } from '@/components/questions/ReportDialog';
import { MultiSelectFilter } from '@/components/questions/MultiSelectFilter';
import { buildQuestionBankQuery } from '@/components/questions/questionBankQuery';
import { capitalizeQuestionLabel } from '@/components/questions/questionBankLabels';
import { usePopupQueue } from '@/components/partners/gamification/PopupQueueContext';
import { getStreakStage, crossedStageBoundary } from '@/components/partners/gamification/streakEvolution';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudyProgressBar } from '@/components/cronograma/StudyProgressBar';

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

// Linha "crua" usada só para montar as opções dos filtros (facetas), nunca
// para exibir a questão em si.
interface QuestionMetaRow {
  role: string | null;
  institution: string | null;
  area: string | null;
  region: string | null;
  subject: string | null;
  discipline: string | null;
  difficulty: string | null;
  exam_year: number | string | null;
  bank: string | null;
  metadata: Record<string, any> | null;
  external_id: string | null;
}

type FilterDimension = 'subject' | 'bank' | 'topic' | 'year' | 'difficulty';

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

const selectClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

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
  const searchParams = useSearchParams();
  const brandTextColor = getContrastTextColor(org.brand_primary);
  // ── State: Data ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ── State: Filters & Logic ──────────────────────────────────────────────────
  // ?plan_item=<id> vem do card do Cronograma: abre direto nas questões "A fazer"
  // (sem repetir as já respondidas) e mostra a barra de progresso do card.
  const planItem = searchParams.get('plan_item');
  const [answerTick, setAnswerTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'todo' | 'done' | 'all'>(() => (planItem ? 'todo' : 'all'));

  // Pré-seleciona a matéria quando o CTA "Continue de onde parou" chega com
  // ?subject=X (última matéria que o aluno estava respondendo). Lista vazia =
  // todas as matérias.
  const [filterSubjects, setFilterSubjects] = useState<string[]>(() => {
    const subject = searchParams.get('subject');
    return subject ? [subject] : [];
  });

  // Deep-link de report: quando ?question_id=UUID vem da página de reports do aluno,
  // exibe apenas essa questão específica (ignora filtros e paginação).
  const questionIdParam = searchParams.get('question_id');

  // Todos os filtros são de múltipla escolha; lista vazia = sem filtro.
  const [filterBanks, setFilterBanks] = useState<string[]>([]);
  // ?topic=X vem do Cronograma Inteligente (discipline do conteúdo do dia).
  const [filterTopics, setFilterTopics] = useState<string[]>(() => {
    const topic = searchParams.get('topic');
    return topic ? [topic] : [];
  });
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterDifficulties, setFilterDifficulties] = useState<string[]>([]);

  const [questionType, setQuestionType] = useState<'vestibular' | 'concurso' | 'todos'>(
    () => org.permissions?.concursos_enabled ? 'todos' : 'vestibular'
  );
  const [filterRole, setFilterRole] = useState('Todas');
  const [filterInstitution, setFilterInstitution] = useState('Todas');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterRegion, setFilterRegion] = useState('Todas');


  // Universo bruto de questões verificadas (buscado uma única vez) a partir
  // do qual TODAS as opções de filtro (matéria, banca, tópico, ano,
  // dificuldade) são derivadas de forma cruzada — cada dropdown reflete os
  // demais filtros já selecionados, em qualquer ordem.
  const [allQuestionMeta, setAllQuestionMeta] = useState<QuestionMetaRow[]>([]);

  // ── State: UI Controls ──────────────────────────────────────────────────────
  const [isMenuOpen, setIsMenuOpen] = useState(!questionIdParam && !planItem);

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

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false);
  // Identifica a busca mais recente: quando o aluno troca de filtro antes da
  // busca anterior responder, a resposta antiga (matéria errada) não pode
  // sobrescrever a lista — só a busca com o id mais recente é aplicada.
  const requestIdRef = useRef(0);
  const authTokenRef = useRef<string | null>(null);
  const questionTopRef = useRef<HTMLDivElement>(null);
  // Questões confirmadas nesta sessão. O backend é a fonte de verdade, mas
  // este registro evita reapresentar uma questão já respondida enquanto uma
  // atualização de filtros ainda está em trânsito.
  const answeredQuestionIdsRef = useRef(new Set<string>());

  // ── Session points (gamification B2B) ────────────────────────────────────────
  const SESSION_KEY = 'qsr_pending_points';
  const sessionPointsRef = useRef(0);

  // ── Accessibility ─────────────────────────────────────────────────────────
  const shouldReduce = useReducedMotion();

  // ── Derived ──────────────────────────────────────────────────────────────────

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

          // Nada de buscar os user_answers aqui: quem separa "feitas" de "não
          // feitas" é o filtro `tab` no backend. A lista de IDs respondidos era
          // baixada inteira (milhares de linhas por abertura da página) e nunca
          // era lida.
          const profileRes = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          setUserProfile(profileRes.data);
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

  // ── 2a. Universo bruto de questões — buscado uma única vez ──────────────────
  useEffect(() => {
    const controller = new AbortController();
    async function loadQuestionMeta() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/proxy/questions/facets?question_type=${questionType}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Falha ao carregar filtros');
        const data = await response.json();
        setAllQuestionMeta(data.data || []);
      } catch (err) {
        if (!controller.signal.aborted) void reportError('QuestionBankFilterOptionsError', String(err));
      }
    }

    loadQuestionMeta();
    return () => controller.abort();
  }, [questionType]);

  // Um tópico/disciplina de uma linha bruta, com o mesmo fallback usado em
  // todo o resto do arquivo (discipline > metadata.ai_topic).
  const topicOf = useCallback((row: QuestionMetaRow): string | null => {
    return row.discipline?.trim() || (row.metadata as any)?.ai_topic?.trim() || null;
  }, []);

  // Testa se uma linha bate com os filtros ATUALMENTE selecionados, ignorando
  // a dimensão passada em `exclude` — é assim que cada dropdown reflete os
  // OUTROS filtros já escolhidos, em qualquer ordem, sem se autoexcluir.
  const matchesOtherFilters = useCallback(
    (row: QuestionMetaRow, exclude: FilterDimension): boolean => {
      if (filterRole !== 'Todas' && row.role !== filterRole) return false;
      if (filterInstitution !== 'Todas' && row.institution !== filterInstitution) return false;
      if (filterArea !== 'Todas' && row.area !== filterArea) return false;
      if (filterRegion !== 'Todas' && row.region !== filterRegion) return false;

      if (exclude !== 'subject' && filterSubjects.length > 0) {
        const rowSubject = String(row.subject || '').trim().toLowerCase();
        if (!filterSubjects.some((s) => rowSubject.includes(s.trim().toLowerCase()))) return false;

      }
      if (exclude !== 'bank' && filterBanks.length > 0) {
        if (!filterBanks.includes(inferQuestionBank(row))) return false;
      }
      if (exclude !== 'topic' && filterTopics.length > 0) {
        const candidates = [row.discipline, typeof row.metadata?.ai_topic === 'string' ? row.metadata.ai_topic : ''];
        if (!filterTopics.some(topic => candidates.some(candidate => String(candidate || '').toLowerCase().includes(topic.toLowerCase())))) return false;
      }
      if (exclude !== 'year' && filterYears.length > 0) {
        if (!filterYears.includes(String(row.exam_year ?? '').trim())) return false;
      }
      if (exclude !== 'difficulty' && filterDifficulties.length > 0) {
        if (!filterDifficulties.includes(String(row.difficulty || '').trim())) return false;
      }
      return true;
    },

    [filterSubjects, filterBanks, filterTopics, filterYears, filterDifficulties, filterRole, filterInstitution, filterArea, filterRegion, topicOf]

  );

  // ── 2b. Opções dos filtros — cruzadas: cada uma reflete as demais já
  // selecionadas (matéria, banca, ano e dificuldade), em qualquer ordem que
  // o aluno as escolha.
  const filterOptions = useMemo<QuestionFilterOptions>(() => {
    return {
      subjects: uniqueSorted(
        allQuestionMeta.filter((r) => matchesOtherFilters(r, 'subject')).map((r) => r.subject)
      ),
      banks: uniqueSorted(
        allQuestionMeta.filter((r) => matchesOtherFilters(r, 'bank')).map(inferQuestionBank)
      ),
      years: uniqueSorted(
        allQuestionMeta.filter((r) => matchesOtherFilters(r, 'year')).map((r) => r.exam_year),
        true
      ),
      difficulties: uniqueSorted(
        allQuestionMeta.filter((r) => matchesOtherFilters(r, 'difficulty')).map((r) => r.difficulty)
      ),
    };
  }, [allQuestionMeta, matchesOtherFilters]);

  // ── 2c. Tópicos — mesma lógica cruzada, agora também respeitando ano e
  // dificuldade além de matéria/banca (antes só considerava matéria/banca).
  const availableTopics = useMemo<Topic[]>(() => {
    const counter: Record<string, number> = {};
    for (const row of allQuestionMeta) {
      if (!matchesOtherFilters(row, 'topic')) continue;
      const t = topicOf(row);
      if (t && t.length > 2) counter[t] = (counter[t] || 0) + 1;
    }
    return Object.entries(counter)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [allQuestionMeta, matchesOtherFilters, topicOf]);

  const topicNames = useMemo(() => availableTopics.map((t) => t.name), [availableTopics]);

  // ── Single-question mode: busca questão específica via deep-link de report ────
  useEffect(() => {
    if (!questionIdParam || !userId) return;
    setLoading(true);
    setHasMore(false);
    void (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`/api/proxy/questions/${questionIdParam}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const q = await res.json() as Record<string, unknown>;
        const transformed = {
          id: String(q.id ?? ''),
          external_id: String(q.external_id ?? ''),
          year: Number(q.exam_year ?? 0),
          bank: inferQuestionBank({ external_id: String(q.external_id ?? ''), bank: null, metadata: q.metadata }),
          subject: String(q.subject ?? ''),
          difficulty: String(q.difficulty ?? 'media'),
          context: String(q.context ?? ''),
          statement: String(q.alternatives_intro ?? ''),
          alternatives: Array.isArray(q.alternatives) ? q.alternatives : [],
          correct_option: String(q.correct_alternative ?? ''),
          explanation: (q.ai_reasoning as Record<string, string> | null)?.thought ?? '',
          images: q.images,
          metadata: q.metadata,
        };
        setQuestions([transformed as never]);
        setCurrentIdx(0);
      } catch (err) {
        void reportError('QuestionBankDeepLinkError', String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [questionIdParam, userId]);

  // ── Filter reset ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Não rodar o fetch normal quando estamos exibindo uma questão específica de report
    if (questionIdParam) return;
    if (userId) {
      setQuestions([]);
      setPage(1);
      setCurrentIdx(0);
      setHasMore(true);
      fetchQuestions(1, false);
    }

  }, [filterSubjects, filterBanks, filterTopics, filterYears, filterDifficulties, activeTab, userId, questionType, filterRole, filterInstitution, filterArea, filterRegion]);


  // ── 3. Core fetch ─────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(
    async (targetPage = 1, append = false, retryCount = 0, requestId?: number, silent = false) => {
      if (!userId) return;
      // Uma troca de filtro sempre inicia uma busca nova (id novo) mesmo que a
      // anterior ainda esteja em voo — a resposta antiga será descartada abaixo
      // se não for mais a mais recente. Continuações de retry/paginação
      // reutilizam o id recebido para não "perder a corrida" pra si mesmas.
      const myRequestId = requestId ?? ++requestIdRef.current;
      // Always fetch a fresh session so expired tokens are refreshed automatically.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      authTokenRef.current = token;
      if (retryCount > 10) {
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setHasMore(false);
          isLoadingRef.current = false;
        }
        return;
      }
      if (retryCount === 0) {
        isLoadingRef.current = true;
        if (!append) {
          if (!silent) { setLoading(true); setLoadingMore(false); }
        } else {
          setLoadingMore(true);
        }
      }

      try {
        const params = buildQuestionBankQuery({
          questionType, role: filterRole, institution: filterInstitution, area: filterArea,
          region: filterRegion, subjects: filterSubjects, banks: filterBanks,
          topics: filterTopics, years: filterYears, difficulties: filterDifficulties, tab: activeTab,
        }, targetPage);

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

        // Uma busca mais nova (outra troca de filtro) já começou enquanto esta
        // estava em voo — descarta esta resposta em vez de aplicar a matéria
        // errada por cima do filtro atual.
        if (myRequestId !== requestIdRef.current) return;

        const data = await res.json();
        if (!append) setTotalQuestionsFound(data.total || 0);
        if (data.user_status?.locked) setIsLockedByQuota(true);
        else setIsLockedByQuota(false);

        const rawQuestions = data.data || [];
        const filteredQuestions = activeTab === 'todo'
          ? rawQuestions.filter((question: { id?: string }) => !answeredQuestionIdsRef.current.has(String(question.id || '')))
          : rawQuestions;
        const shouldFetchNext = rawQuestions.length > 0 && filteredQuestions.length === 0;

        if (shouldFetchNext) {
          await fetchQuestions(targetPage + 1, append, retryCount + 1, myRequestId, silent);
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
        if (retryCount === 0 && myRequestId === requestIdRef.current) {
          if (!silent) {
            setLoading(false);
            setLoadingMore(false);
          }
          isLoadingRef.current = false;
        }
      }
    },

    [userId, activeTab, filterSubjects, filterBanks, filterTopics, filterYears, filterDifficulties, questionType, filterRole, filterInstitution, filterArea, filterRegion]

  );

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (questionIdParam) return; // sem paginação no modo questão única
    if (!loadingMore && hasMore && questions.length > 0 && currentIdx >= questions.length - 3) {
      if (!isLoadingRef.current) fetchQuestions(page + 1, true);
    }
  }, [currentIdx, questions.length, hasMore, loadingMore, page, fetchQuestions, questionIdParam]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleQuotaLimitReached = (_reasonCode: string) => {
    setIsLockedByQuota(true);
    toast.info('Limite de questões atingido', { description: 'Entre em contato com o administrador da sua organização para liberar o acesso.' });
  };

  const handleNext = () => {
    if (isLockedByQuota) { toast.info('Limite de questões atingido', { description: 'Entre em contato com o administrador da sua organização.' }); return; }
    if (loadingMore && currentIdx >= questions.length - 1) return;
    const nextIndex = currentIdx + 1;
    if (nextIndex < questions.length) {
      setCurrentIdx(nextIndex);
      questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrev = () => {
    const previousIndex = currentIdx - 1;
    if (previousIndex >= 0) {
      setCurrentIdx(previousIndex);
      questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAnswerResult = useCallback(
    (qId: string, result: { is_correct?: boolean; new_streak?: number; streak_updated?: boolean; gamification?: { points_awarded: number; shield_awarded?: boolean } }) => {
      answeredQuestionIdsRef.current.add(qId);
      if (planItem) setAnswerTick((t) => t + 1);
      if (activeTab === 'todo') {
        setTotalQuestionsFound((current) => Math.max(0, current - 1));
      }
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
          stage: getStreakStage(nextStreak).id,
          stageName: getStreakStage(nextStreak).name,
          isNewStage: crossedStageBoundary(nextStreak) != null,
          dedupeKey: `streak:${nextStreak}`,
        });
      }
    },
    [SESSION_KEY, activeTab, enqueuePopup, userId, planItem],
  );

  const handleOpenFilters = useCallback(() => {
    setIsMenuOpen(true);
    if (activeTab === 'todo') {
      // A tela de filtros deve refletir instantaneamente o que acabou de ser
      // respondido, mesmo antes da revalidação terminar.
      setQuestions((current) => current.filter((question) => !answeredQuestionIdsRef.current.has(String(question.id || ''))));
      setCurrentIdx(0);
    }
    // A resposta já foi confirmada pela API antes de chegar aqui. Recarregar
    // garante que "A fazer", a contagem e as opções cruzadas reflitam o banco,
    // mas sem trocar a UI por um estado de carregamento.
    if (!questionIdParam) void fetchQuestions(1, false, 0, undefined, true);
  }, [activeTab, fetchQuestions, questionIdParam]);

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
  const isNextDisabled = currentIdx >= questions.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQ || isMenuOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLButtonElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions.length, currentQ, isLockedByQuota, loadingMore, isMenuOpen]);

  // ── Animation helpers ─────────────────────────────────────────────────────────
  // Always passes valid motion props; when reduced, initial === animate (no movement).
  const fadeSlideInitial = shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 };
  const fadeSlideAnimate = { opacity: 1, y: 0 };
  const fadeSlideTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

  const isTabTodo = activeTab !== 'done';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ModuleGuard permKey="banco_questoes_enabled">
    {/* Mesmo fundo das outras páginas do aluno, cobrindo o padding do <main>: antes era um
        bloco de outra cor (roxo translúcido no escuro) recortado dentro do fundo da plataforma. */}
    <div className="-m-4 min-h-screen bg-slate-50 px-0 pb-4 pt-0 dark:bg-[#080808] md:-m-8 md:pb-8 overscroll-none">

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

      {isMenuOpen ? (
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-10">
          <div className="mb-5 flex items-start gap-3">
            <a href={`/partners/${org.slug}/student/dashboard`} aria-label="Voltar ao início" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><ArrowLeft size={19} /></a>
            <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Banco de Questões</h1><p className="mt-1 text-sm text-slate-500 sm:text-base">Configure os filtros e comece a resolver questões</p></div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex shrink-0 flex-wrap gap-1 text-sm" aria-label="Situação das questões">
            {([['all', 'Todas'], ['todo', 'A fazer'], ['done', 'Respondidas']] as const).map(([tab, label]) => (
              <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-3 py-2 font-semibold ${activeTab === tab ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</button>
            ))}
          </div>
          <div className="hidden flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-none dark:border-slate-700 dark:bg-slate-900 sm:flex">
            <button type="button" onClick={() => { setFilterRole('Todas'); setFilterInstitution('Todas'); setFilterArea('Todas'); setFilterRegion('Todas'); setFilterSubjects([]); setFilterBanks([]); setFilterTopics([]); setFilterYears([]); setFilterDifficulties([]); }} className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-200"><Trash2 size={18} /><span className="hidden sm:inline">Limpar filtros</span><span className="sm:hidden">Limpar</span></button>
            <div className="flex items-center gap-3"><span className="text-xs font-semibold text-slate-600 dark:text-slate-200 sm:text-sm">{loading ? 'Buscando questões…' : <>{totalQuestionsFound} questões<span className="hidden sm:inline"> encontradas</span></>}</span><button type="button" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold sm:px-5" style={{ background: 'var(--brand-primary)', color: brandTextColor }}><span className="hidden sm:inline">Resolver questões</span><span className="sm:hidden">Resolver</span><ArrowRight size={17} /></button></div>
          </div>

          </div>
          <div className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 sm:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-sm font-bold shadow-lg"
              style={{ background: 'var(--brand-primary)', color: brandTextColor }}
            >
              <span>{loading ? 'Buscando questões…' : `${totalQuestionsFound} questões encontradas`}</span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">Ver questões <ArrowRight size={17} /></span>
            </button>
          </div>
          {org.permissions?.concursos_enabled && <div className="mb-4 grid w-full grid-cols-3 gap-2">
            {(['todos', 'concurso', 'vestibular'] as const).map(type => <button key={type} type="button" onClick={() => { if (questionType === type) return; setQuestionType(type); if (type === 'vestibular') { setFilterRole('Todas'); setFilterInstitution('Todas'); setFilterArea('Todas'); setFilterRegion('Todas'); } setAllQuestionMeta([]); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" style={questionType === type ? { background: 'var(--brand-primary)', color: brandTextColor } : {}}>{type === 'concurso' ? <Briefcase size={18} /> : type === 'vestibular' ? <GraduationCap size={18} /> : <BookOpen size={18} />}{type === 'concurso' ? 'Concursos' : type === 'vestibular' ? 'Vestibular' : 'Todas'}</button>)}
          </div>}
          {questionType !== 'vestibular' && <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">Cargo<select aria-label="Cargo" className={`${selectClass} mt-1.5`} value={filterRole} onChange={e => { setFilterRole(e.target.value); }}><option value="Todas">Todos os cargos</option>{uniqueSorted(allQuestionMeta.map(row => row.role)).map(role => <option key={role} value={role}>{capitalizeQuestionLabel(role)}</option>)}</select></label>
            {([['Instituição', filterInstitution, setFilterInstitution, 'institution'], ['Área', filterArea, setFilterArea, 'area'], ['Região', filterRegion, setFilterRegion, 'region']] as const).map(([label, value, setter, field]) => { const options = uniqueSorted(allQuestionMeta.filter(row => filterRole === 'Todas' || row.role === filterRole).map(row => row[field])); return <label key={field} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{label}<select className={`${selectClass} mt-1.5`} value={value} onChange={e => { setter(e.target.value); }}><option value="Todas">Todas</option>{uniqueSorted([...options, value === 'Todas' ? null : value]).map(option => <option key={option} value={option}>{capitalizeQuestionLabel(option)}</option>)}</select></label>; })}
          </div>}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6">
            {([
              ['Matérias', BookOpen, filterSubjects, setFilterSubjects, filterOptions.subjects, 'Todas as matérias'],
              ['Bancas', Landmark, filterBanks, setFilterBanks, filterOptions.banks, 'Todas as bancas'],
              ['Tópicos', Layers, filterTopics, setFilterTopics, topicNames, 'Todos os tópicos'],
              ['Ano da questão', Calendar, filterYears, setFilterYears, filterOptions.years, 'Todos os anos'],
              ['Dificuldade', BarChart, filterDifficulties, setFilterDifficulties, filterOptions.difficulties, 'Todas as dificuldades'],
            ] as const).map(([label, Icon, value, setter, options, placeholder]) => <details key={label} className="group border-b border-slate-200 last:border-0 dark:border-slate-700"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 font-bold text-slate-900 marker:content-none dark:text-slate-100"><Icon size={19} className="text-slate-600 dark:text-slate-300" /><span className="flex-1">{label}</span>{value.length > 0 && <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--brand-primary)', color: brandTextColor }}>{value.length} <span className="hidden sm:inline">selecionadas</span></span>}<ChevronDown size={18} className="transition-transform group-open:rotate-180" /></summary><div className="pb-3"><MultiSelectFilter options={options} value={value} onChange={setter} placeholder={placeholder} formatOption={capitalizeQuestionLabel} accentTextColor={brandTextColor} /></div></details>)}
          </div>

        </section>
      ) : (
        <header className="mx-auto flex max-w-4xl items-center justify-between gap-3 border-b border-slate-200 px-4 py-5 dark:border-slate-800"><div className="flex items-center gap-3"><button onClick={handleOpenFilters} aria-label="Voltar aos filtros" className="rounded-xl p-2 text-slate-700 dark:text-slate-200"><ArrowLeft size={20} /></button><h1 className="text-xl font-bold text-slate-900 dark:text-white">Banco de Questões</h1></div><button onClick={handleOpenFilters} className="rounded-xl border border-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-[var(--brand-primary)] dark:border-[color-mix(in_srgb,var(--brand-primary)_45%,white)] dark:text-[color-mix(in_srgb,var(--brand-primary)_45%,white)]">Filtros</button></header>
      )}

      {planItem && !isMenuOpen && (
        <div className="sticky top-2 z-30 mx-auto max-w-4xl px-4 pt-4">
          <StudyProgressBar slug={org.slug} itemId={planItem} answerTick={answerTick} />
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className={`max-w-4xl mx-auto px-4 py-5 w-full ${isMenuOpen ? 'hidden' : ''}`}>

        {loading && page === 1 ? (

          /* Skeleton */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>
            <div className="flex justify-between items-center mb-5">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
            <QuestionCardSkeleton />
          </motion.div>

        ) : currentQ ? (

          /* Question view */
          <motion.div initial={fadeSlideInitial} animate={fadeSlideAnimate} transition={fadeSlideTransition}>

            {/* Counter bar — visible on ALL screens */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${isTabTodo
                    ? 'border-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-[var(--brand-primary)] dark:border-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)] dark:text-[color-mix(in_srgb,var(--brand-primary)_45%,white)]'
                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                    }`}
                >
                  {isTabTodo
                    ? <Circle size={9} fill="currentColor" />
                    : <CheckCircle2 size={11} />
                  }
                  {`Questão ${currentIdx + 1} de ${totalQuestionsFound || questions.length}`}
                </span>

                {questionIdParam && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800">
                    <Flag size={10} /> Do seu report
                  </span>
                )}

                {isLockedByQuota && (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800 inline-flex items-center gap-1">
                    <Lock size={10} /> Limite atingido
                  </span>
                )}
              </div>

              {/* Total ou voltar ao banco quando em modo questão única */}
              {questionIdParam ? (
                <a
                  href={`/partners/${org.slug}/student/banco-de-questoes`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm transition-colors"
                >
                  <ArrowLeft size={12} /> Ver todas
                </a>
              ) : (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                  {totalQuestionsFound > 0
                    ? `${totalQuestionsFound} questões`
                    : activeTab !== 'done'
                      ? 'Nesta trilha'
                      : 'Histórico'}
                </span>
              )}
            </div>

            {/* Progress bar: position in loaded questions */}
            {questions.length > 1 && (
              <div className="mb-5 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--brand-primary)' }}
                  animate={{ width: `${Math.round(((currentIdx + 1) / Math.max(totalQuestionsFound, questions.length)) * 100)}%` }}
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
                  {currentTestletQuestions.map((questionInGroup) => {
                    const testletInfo = testletPositionMap.get(questionInGroup.id);
                    return (
                      <div key={questionInGroup.id} hidden={questionInGroup.id !== currentQ.id}>
                      <QuestionCard
                        userId={userId || ''}
                        question={{
                          id: questionInGroup.id,
                          external_id: questionInGroup.external_id,
                          year: questionInGroup.exam_year,
                          bank: questionInGroup.bank,
                          subject: capitalizeQuestionLabel(questionInGroup.subject || ''),
                          difficulty: capitalizeQuestionLabel(questionInGroup.difficulty || 'Médio'),
                          context: questionInGroup.context || currentTestletQuestions.find(q => q.context)?.context || '',
                          statement: questionInGroup.statement,
                          alternatives: questionInGroup.alternatives,
                          correct_option: questionInGroup.correct_option,
                          explanation: questionInGroup.explanation,
                          images: questionInGroup.images,
                          metadata: questionInGroup.metadata,
                        }}
                        testletInfo={testletInfo}
                        suppressContext={false}
                        onQuotaReached={handleQuotaLimitReached}
                        onAnswer={(result) => handleAnswerResult(questionInGroup.id, result)}
                        onReportError={() => {
                          setReportQuestionId(questionInGroup.id);
                          setReportDialogOpen(true);
                        }}
                      />
                      </div>
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
        {!isMenuOpen && currentQ && userId && !loading && (
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
    </ModuleGuard>
  );
}
