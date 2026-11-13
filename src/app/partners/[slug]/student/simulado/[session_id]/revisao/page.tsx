'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Brain, Loader2, Flag, Search, SlidersHorizontal } from 'lucide-react'
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia'
import { QuestionRichText } from '@/components/questions/QuestionRichText'
import {
    extractAlternativeImageUrls,
    extractDetachedQuestionImageUrls,
    getQuestionContentBlocks,
    splitQuestionContextSegments,
} from '@/components/questions/rendering'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionContent {
    id: string
    subject: string
    topic?: string
    bank?: string
    difficulty?: string
    exam_year?: number
    context: string
    statement: string
    images?: unknown
    metadata?: unknown
    alternatives: { letter: string; text: string; image?: string | null }[]
    correct_option: string
    testlet_group_id?: string | null
}

interface ReviewExplanationEntry {
    explanation: string
    correct_answer: string
    user_answer: string | null
    is_correct: boolean
    is_annulled?: boolean
    subject: string
}

interface SessionDetail {
    score: number
    total_questions: number
    percentage: number
    annulled_question_ids?: string[]
    question_ids?: string[]
    answers: Record<string, string>
    questions: QuestionContent[]
}

interface ReviewQuestion extends QuestionContent {
    user_answer: string | null
    is_correct: boolean
    is_annulled: boolean
    explanation: string | null
}

type ResultFilter = 'all' | 'right' | 'wrong' | 'annulled'

interface VisibleEntry {
    q: ReviewQuestion
    originalIndex: number
    visibleIndex: number
}

interface QuestionGroup {
    key: string
    label: string | null
    items: VisibleEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
    if (pct >= 70) return 'text-green-600 dark:text-green-400'
    if (pct >= 45) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

// Regra hardcoded de emergência (pedido do founder, 13/11/2026): 60% de acerto aprova.
const APPROVAL_THRESHOLD_PCT = 60

function normalizeForSearch(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Agrupamento de questões de testlet (texto-base compartilhado) pra exibir o
// box rotulado "T1/T2..." na barra de bolinhas — mesma ideia de
// `buildQuestionGroups` da tela de prova em andamento (`.../simulado/page.tsx`),
// mas reimplementada localmente: os dados (ReviewQuestion) e a semântica de
// cor (certa/errada/anulada, não "respondida") são diferentes o suficiente
// pra não valer a pena compartilhar um componente genérico entre as duas
// telas — ver nota no plano desta mudança.
function buildReviewQuestionGroups(entries: VisibleEntry[]): QuestionGroup[] {
    const groups: QuestionGroup[] = []
    entries.forEach((entry) => {
        const groupId = entry.q.testlet_group_id
        if (groupId) {
            const last = groups[groups.length - 1]
            if (last && last.key === groupId) {
                last.items.push(entry)
                return
            }
            groups.push({ key: groupId, label: `T${groups.filter((g) => g.label).length + 1}`, items: [entry] })
            return
        }
        groups.push({ key: entry.q.id, label: null, items: [entry] })
    })
    return groups
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevisaoPage() {
    const router = useRouter()
    const params = useParams()
    const sessionId = params.session_id as string

    const [questions, setQuestions] = useState<ReviewQuestion[]>([])
    const [summary, setSummary] = useState<{ score: number; total: number; pct: number } | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [annulledCount, setAnnulledCount] = useState(0)

    const [search, setSearch] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
    const [yearFilter, setYearFilter] = useState('all')
    const [subjectFilter, setSubjectFilter] = useState('all')
    const [difficultyFilter, setDifficultyFilter] = useState('all')
    const [bankFilter, setBankFilter] = useState('all')
    const [viewIdx, setViewIdx] = useState(0)
    const activeBubbleRef = useRef<HTMLButtonElement | null>(null)
    const questionTopRef = useRef<HTMLDivElement | null>(null)
    const navScrollRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session) setAccessToken(session.access_token)
        }
        init()
    }, [])

    const fetchReview = useCallback(async () => {
        if (!accessToken || !sessionId) return
        setLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
        const headers = { Authorization: `Bearer ${accessToken}` }

        try {
            const [reviewRes, sessionRes] = await Promise.all([
                fetch(`${apiUrl}/api/simulado/${sessionId}/review`, { headers }),
                fetch(`${apiUrl}/api/simulado/${sessionId}`, { headers }),
            ])

            if (!reviewRes.ok) {
                const body = await reviewRes.json().catch(() => ({}))
                setError(body.error || 'Erro ao carregar revisão.')
                return
            }

            if (!sessionRes.ok) {
                setError('Erro ao carregar dados da sessão.')
                return
            }

            const [reviewData, sessionData]: [
                {
                    explanations: Record<string, ReviewExplanationEntry>;
                    session_id: string;
                    annulled_question_ids?: string[];
                },
                SessionDetail,
            ] = await Promise.all([reviewRes.json(), sessionRes.json()])

            setSummary({
                score: sessionData.score,
                total: sessionData.total_questions,
                pct: sessionData.percentage,
            })
            setAnnulledCount(reviewData.annulled_question_ids?.length || sessionData.annulled_question_ids?.length || 0)

            const merged: ReviewQuestion[] = sessionData.questions.map(q => {
                const exp = reviewData.explanations?.[q.id]
                return {
                    ...q,
                    user_answer: exp?.user_answer ?? (sessionData.answers?.[q.id]?.toUpperCase() || null),
                    is_correct: exp?.is_correct ?? false,
                    is_annulled: Boolean(exp?.is_annulled),
                    explanation: exp?.explanation ?? null,
                }
            })

            setQuestions(merged)
        } catch {
            setError('Erro ao conectar com o servidor.')
        } finally {
            setLoading(false)
        }
    }, [accessToken, sessionId])

    useEffect(() => {
        fetchReview()
    }, [fetchReview])

    // ── Opções de filtro, só com os valores que de fato aparecem neste simulado ──
    const yearOptions = useMemo(
        () => Array.from(new Set(questions.map(q => q.exam_year).filter((y): y is number => y != null))).sort((a, b) => b - a),
        [questions],
    )
    const subjectOptions = useMemo(
        () => Array.from(new Set(questions.map(q => q.subject).filter(Boolean))).sort(),
        [questions],
    )
    const difficultyOptions = useMemo(
        () => Array.from(new Set(questions.map(q => q.difficulty).filter((d): d is string => Boolean(d)))),
        [questions],
    )
    const bankOptions = useMemo(
        () => Array.from(new Set(questions.map(q => q.bank).filter((b): b is string => Boolean(b)))).sort(),
        [questions],
    )

    const activeFilterCount = [resultFilter !== 'all', yearFilter !== 'all', subjectFilter !== 'all', difficultyFilter !== 'all', bankFilter !== 'all']
        .filter(Boolean).length

    const visibleEntries = useMemo<VisibleEntry[]>(() => {
        const needle = normalizeForSearch(search.trim())
        let visibleIndex = 0
        const out: VisibleEntry[] = []
        questions.forEach((q, originalIndex) => {
            if (resultFilter === 'right' && !q.is_correct) return
            if (resultFilter === 'wrong' && (q.is_correct || q.is_annulled)) return
            if (resultFilter === 'annulled' && !q.is_annulled) return
            if (yearFilter !== 'all' && String(q.exam_year ?? '') !== yearFilter) return
            if (subjectFilter !== 'all' && q.subject !== subjectFilter) return
            if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return
            if (bankFilter !== 'all' && q.bank !== bankFilter) return
            if (needle) {
                const haystack = normalizeForSearch(`${q.statement || ''} ${q.context || ''} ${q.subject || ''} ${q.topic || ''}`)
                if (!haystack.includes(needle)) return
            }
            out.push({ q, originalIndex, visibleIndex: visibleIndex++ })
        })
        return out
    }, [questions, search, resultFilter, yearFilter, subjectFilter, difficultyFilter, bankFilter])

    const questionGroups = useMemo(() => buildReviewQuestionGroups(visibleEntries), [visibleEntries])

    const safeViewIdx = visibleEntries.length > 0 ? Math.min(viewIdx, visibleEntries.length - 1) : 0
    const current = visibleEntries[safeViewIdx] ?? null

    // Mantém a bolinha da questão atual visível dentro da faixa rolável do
    // navegador — sem isso, navegar via Anterior/Próxima podia levar a
    // bolinha ativa pra fora da área visível num simulado longo.
    //
    // Rola `navScrollRef` manualmente (via scrollLeft), em vez de usar
    // `activeBubbleRef.current.scrollIntoView(...)`: mesmo pedindo só
    // `block: 'nearest'`, o `scrollIntoView` nativo pode AINDA ASSIM rolar a
    // JANELA verticalmente pra trazer a bolinha pra vista (ela fica perto do
    // fim da página) — competindo com o efeito abaixo, que rola a janela até
    // o topo da questão. As duas rolagens brigavam pela posição final da
    // janela (bug reportado: "parece que ele tá com algum probleminha de
    // coordenada"). Mexendo só no `scrollLeft` do container, essa rolagem
    // nunca encosta na posição vertical da janela.
    useEffect(() => {
        const container = navScrollRef.current
        const activeEl = activeBubbleRef.current
        if (!container || !activeEl) return
        const containerRect = container.getBoundingClientRect()
        const elRect = activeEl.getBoundingClientRect()
        if (elRect.left < containerRect.left || elRect.right > containerRect.right) {
            const delta = (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2)
            container.scrollBy({ left: delta, behavior: 'smooth' })
        }
    }, [safeViewIdx])

    const resetView = () => setViewIdx(0)
    const clearFilters = () => {
        setResultFilter('all'); setYearFilter('all'); setSubjectFilter('all'); setDifficultyFilter('all'); setBankFilter('all')
        resetView()
    }

    const goPrev = () => setViewIdx(Math.max(0, safeViewIdx - 1))
    const goNext = () => setViewIdx(Math.min(visibleEntries.length - 1, safeViewIdx + 1))

    // Leva o aluno pro topo do card da questão ao trocar — mesmo
    // comportamento da tela de prova em andamento (`questionTopRef` lá).
    useEffect(() => {
        questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [safeViewIdx])

    // Setas do teclado navegam Anterior/Próxima, igual à prova em andamento —
    // desligado enquanto o diálogo de filtros está aberto ou o foco está num
    // campo de texto/select (senão a seta atrapalharia digitar na busca ou
    // trocar opção de um <select> do filtro).
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (filtersOpen) return
            const tag = (document.activeElement?.tagName || '').toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return
            if (e.key === 'ArrowRight') { e.preventDefault(); setViewIdx(Math.min(visibleEntries.length - 1, safeViewIdx + 1)) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); setViewIdx(Math.max(0, safeViewIdx - 1)) }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [filtersOpen, safeViewIdx, visibleEntries.length])

    const showNav = !loading && !error && current

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950/50 font-sans">
            <div className={`max-w-3xl mx-auto p-4 md:p-8 ${showNav ? 'pb-28' : ''}`}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Brain size={22} style={{ color: 'var(--brand-primary)' }} />
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Revisão</h1>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
                        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
                            Gerando a análise pedagógica...
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs text-center max-w-xs">
                            Isso pode levar alguns segundos na primeira vez.
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-red-100 dark:border-red-900/50">
                        <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
                        <button
                            onClick={fetchReview}
                            className="mt-4 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors hover:opacity-90"
                            style={{ background: 'var(--brand-primary)' }}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {/* Review content */}
                {!loading && !error && questions.length > 0 && (
                    <>
                        {/* Summary */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
                            {summary && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <div>
                                        <span className={`text-3xl font-black ${scoreColor(summary.pct)}`}>
                                            {summary.score}/{summary.total}
                                        </span>
                                        <span className={`ml-2 text-base font-bold ${scoreColor(summary.pct)}`}>
                                            ({summary.pct}%)
                                        </span>
                                    </div>
                                    {summary.pct >= APPROVAL_THRESHOLD_PCT ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-300">
                                            <CheckCircle2 size={14} />
                                            Aprovado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                                            <XCircle size={14} />
                                            Reprovado
                                        </span>
                                    )}
                                </div>
                            )}
                            {annulledCount > 0 && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                    <Flag size={12} />
                                    {annulledCount} {annulledCount === 1 ? 'anulada' : 'anuladas'} por report
                                </div>
                            )}

                            {/* Busca + filtros */}
                            <div className="mt-4 flex gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); resetView() }}
                                        placeholder="Buscar por conteúdo da questão..."
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(true)}
                                    className="relative shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <SlidersHorizontal size={15} />
                                    <span className="hidden sm:inline">Filtros</span>
                                    {activeFilterCount > 0 && (
                                        <span
                                            className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                                            style={{ background: 'var(--brand-primary)' }}
                                        >
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Question viewer */}
                        {current ? (
                            <>
                                <p className="mb-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    Mostrando {safeViewIdx + 1} de {visibleEntries.length}
                                    {(search.trim() || activeFilterCount > 0) && ' (com filtro aplicado)'}
                                </p>

                                {(() => {
                                    const q = current.q
                                    const idx = current.originalIndex
                                    const contextSegments = splitQuestionContextSegments(q.context)
                                    const statementText = q.statement
                                    const supportImages = extractDetachedQuestionImageUrls(q.images, q.context, q.statement)

                                    return (
                                        <div
                                            key={q.id}
                                            ref={questionTopRef}
                                            data-question-id={q.id}
                                            className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden ${
                                                q.is_annulled
                                                    ? 'border-amber-200 dark:border-amber-900/50'
                                                    : q.is_correct
                                                        ? 'border-green-200 dark:border-green-900/50'
                                                        : 'border-red-200 dark:border-red-900/50'
                                            }`}
                                        >
                                            {/* Question header */}
                                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 ${
                                                q.is_annulled
                                                    ? 'bg-amber-50 dark:bg-amber-900/20'
                                                    : q.is_correct
                                                        ? 'bg-green-50 dark:bg-green-900/20'
                                                        : 'bg-red-50 dark:bg-red-900/20'
                                            }`}>
                                                {q.is_annulled
                                                    ? <Flag size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                                    : q.is_correct
                                                        ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />
                                                        : <XCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                                                }
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Questão {idx + 1}</span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500">{q.subject}</span>
                                                {q.bank && <span className="text-xs text-slate-400 dark:text-slate-500">· {q.bank}</span>}
                                                {q.exam_year && <span className="text-xs text-slate-400 dark:text-slate-500">· {q.exam_year}</span>}
                                                {q.difficulty && <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:inline">· {q.difficulty}</span>}
                                                {q.topic && <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:inline">· {q.topic}</span>}
                                                {q.is_annulled && <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Anulada</span>}
                                            </div>

                                            <div className="p-5">
                                                {/* Context */}
                                                {getQuestionContentBlocks(q.metadata).length > 0 ? (
                                                    <QuestionContentBlocks metadata={q.metadata} className="mb-4" />
                                                ) : (
                                                    <>
                                                        {contextSegments.map((segment, segmentIndex) =>
                                                            segment.type === 'source' ? (
                                                                <QuestionRichText
                                                                    key={`source-${segmentIndex}`}
                                                                    text={segment.text}
                                                                    className="prose prose-slate dark:prose-invert max-w-none -mt-2 mb-4 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400"
                                                                />
                                                            ) : (
                                                                <QuestionRichText
                                                                    key={`body-${segmentIndex}`}
                                                                    text={segment.text}
                                                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none mb-4 text-slate-600 dark:text-slate-300 border-l-4 border-slate-200 dark:border-slate-700 pl-3"
                                                                />
                                                            ),
                                                        )}

                                                        {/* Support images */}
                                                        {supportImages.length > 0 && (
                                                            <QuestionSupportImages images={supportImages} metadata={q.metadata} className="mb-4" />
                                                        )}
                                                    </>
                                                )}

                                                {/* Statement */}
                                                {statementText && (
                                                    <QuestionRichText
                                                        text={statementText}
                                                        className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 font-medium mb-4 leading-relaxed"
                                                    />
                                                )}

                                                {/* Alternatives */}
                                                <div className="space-y-2 mb-4">
                                                    {q.alternatives?.map(alt => {
                                                        const isCorrect = alt.letter === q.correct_option?.toUpperCase()
                                                        const isUserWrong = alt.letter === q.user_answer?.toUpperCase() && !q.is_correct && !q.is_annulled
                                                        return (
                                                            <div
                                                                key={alt.letter}
                                                                className={`flex gap-3 items-start p-3 rounded-xl border text-sm ${
                                                                    isCorrect
                                                                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700/50'
                                                                        : isUserWrong
                                                                            ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700/50'
                                                                            : 'border-transparent dark:border-transparent'
                                                                }`}
                                                            >
                                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                                                    isCorrect
                                                                        ? 'bg-green-500 text-white'
                                                                        : isUserWrong
                                                                            ? 'bg-red-500 text-white'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                                }`}>
                                                                    {alt.letter}
                                                                </span>
                                                                <div className="flex-1">
                                                                    {extractAlternativeImageUrls(alt).length > 0 && (
                                                                        <AlternativeImages images={extractAlternativeImageUrls(alt)} metadata={q.metadata} letter={alt.letter} />
                                                                    )}
                                                                    {alt.text ? (
                                                                        <div className={`leading-snug ${
                                                                            isCorrect
                                                                                ? 'text-green-800 dark:text-green-300 font-medium'
                                                                                : isUserWrong
                                                                                    ? 'text-red-800 dark:text-red-300'
                                                                                    : 'text-slate-600 dark:text-slate-300'
                                                                        }`}>
                                                                            <QuestionRichText text={alt.text} className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0" />
                                                                        </div>
                                                                    ) : extractAlternativeImageUrls(alt).length === 0 ? (
                                                                        <span className="text-sm italic text-slate-400 dark:text-slate-500">
                                                                            Conteúdo da alternativa indisponível.
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Answer summary */}
                                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                                    {q.is_annulled ? (
                                                        <span className="font-semibold text-amber-700 dark:text-amber-300">Questão anulada por report</span>
                                                    ) : q.user_answer ? (
                                                        <span>Sua resposta: <strong className={q.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{q.user_answer}</strong></span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500">Não respondida</span>
                                                    )}
                                                    <span>Gabarito: <strong className="text-green-600 dark:text-green-400">{q.correct_option?.toUpperCase()}</strong></span>
                                                </div>

                                                {/* Explicação pedagógica */}
                                                {q.explanation && (
                                                    <div
                                                        className="rounded-xl p-4"
                                                        style={{
                                                            background: 'color-mix(in srgb, var(--brand-primary) 5%, transparent)',
                                                            border: '1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Brain size={14} style={{ color: 'var(--brand-primary)' }} />
                                                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
                                                                Explicação Pedagógica
                                                            </span>
                                                        </div>
                                                        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200">
                                                            <QuestionRichText text={q.explanation} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Question navigator — no mobile, faixa única com scroll horizontal
                                    (um simulado grande, ex. ENEM com 180 questões, viraria uma parede
                                    de bolinhas enorme se quebrasse linha numa tela estreita). No
                                    desktop (sm:+), quebra em várias linhas como na tela de prova em
                                    andamento — tem espaço de sobra, não precisa rolar. */}
                                <div ref={navScrollRef} className="mt-6 -mx-4 overflow-x-auto px-4 pb-2 pt-5 custom-scrollbar sm:mx-0 sm:overflow-visible sm:px-0">
                                    <div className="mx-auto flex w-max items-center gap-2 sm:w-auto sm:flex-wrap sm:justify-center sm:gap-y-5">
                                        {questionGroups.map((group) => (
                                            <div
                                                key={group.key}
                                                className={`relative flex flex-wrap items-center gap-2 rounded-2xl ${group.label ? 'border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 px-2 py-1' : ''}`}
                                            >
                                                {group.label && (
                                                    <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                                        {group.label}
                                                    </span>
                                                )}
                                                {group.items.map((entry) => {
                                                    const isCurrent = entry.visibleIndex === safeViewIdx
                                                    return (
                                                        <button
                                                            key={entry.q.id}
                                                            ref={isCurrent ? activeBubbleRef : undefined}
                                                            onClick={() => setViewIdx(entry.visibleIndex)}
                                                            title={`Ir para a questão ${entry.originalIndex + 1}`}
                                                            className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                                                                isCurrent
                                                                    ? 'scale-110 shadow-sm'
                                                                    : entry.q.is_annulled
                                                                        ? 'bg-amber-400 text-white'
                                                                        : entry.q.is_correct
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-red-400 text-white'
                                                            }`}
                                                            style={isCurrent ? { background: 'var(--brand-primary)', color: '#fff' } : {}}
                                                        >
                                                            {entry.originalIndex + 1}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                Nenhuma questão neste filtro.
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Prev/Next — fixo, sempre visível independente do scroll (igual à
                barra de navegação da prova em andamento); antes ficava no final
                do card, exigindo rolar a questão inteira pra alcançar. */}
            {showNav && (
                <div
                    className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4"
                    style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                >
                    <div className="max-w-3xl mx-auto flex items-center gap-3">
                        <button
                            type="button"
                            onClick={goPrev}
                            disabled={safeViewIdx === 0}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                        >
                            <ArrowLeft size={16} /> Anterior
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={safeViewIdx >= visibleEntries.length - 1}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-30 transition-colors"
                            style={{ background: 'var(--brand-primary)', color: '#fff' }}
                        >
                            Próxima <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Filters dialog */}
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto dark:border-slate-800 dark:bg-slate-900 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="dark:text-slate-100">Filtros</DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Filtre as questões desta revisão por resultado, ano, disciplina, dificuldade ou banca.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resultado</p>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { value: 'all', label: 'Todas' },
                                    { value: 'right', label: 'Certas' },
                                    { value: 'wrong', label: 'Erradas' },
                                    { value: 'annulled', label: 'Anuladas' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => { setResultFilter(opt.value); resetView() }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                            resultFilter === opt.value
                                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {yearOptions.length > 1 && (
                            <div>
                                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ano</p>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => { setYearFilter(e.target.value); resetView() }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                                >
                                    <option value="all">Todos os anos</option>
                                    {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                                </select>
                            </div>
                        )}

                        {subjectOptions.length > 1 && (
                            <div>
                                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Disciplina</p>
                                <select
                                    value={subjectFilter}
                                    onChange={(e) => { setSubjectFilter(e.target.value); resetView() }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                                >
                                    <option value="all">Todas as disciplinas</option>
                                    {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}

                        {difficultyOptions.length > 1 && (
                            <div>
                                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dificuldade</p>
                                <select
                                    value={difficultyFilter}
                                    onChange={(e) => { setDifficultyFilter(e.target.value); resetView() }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                                >
                                    <option value="all">Todas as dificuldades</option>
                                    {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}

                        {bankOptions.length > 1 && (
                            <div>
                                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Banca</p>
                                <select
                                    value={bankFilter}
                                    onChange={(e) => { setBankFilter(e.target.value); resetView() }}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                                >
                                    <option value="all">Todas as bancas</option>
                                    {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Limpar filtros
                        </button>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                            style={{ background: 'var(--brand-primary)' }}
                        >
                            Aplicar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
