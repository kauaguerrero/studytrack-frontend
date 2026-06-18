'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Brain, Loader2, Flag } from 'lucide-react'
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia'
import { QuestionRichText } from '@/components/questions/QuestionRichText'
import {
    extractAlternativeImageUrls,
    extractDetachedQuestionImageUrls,
    getQuestionContentBlocks,
    splitQuestionContextAndSource,
} from '@/components/questions/rendering'
import { createClient } from '@/lib/supabase/client'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
    if (pct >= 70) return 'text-green-600 dark:text-green-400'
    if (pct >= 45) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
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
    const [filter, setFilter] = useState<'all' | 'wrong' | 'right'>('all')
    const [annulledCount, setAnnulledCount] = useState(0)

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

    const visibleQuestions = questions.filter(q => {
        if (filter === 'wrong') return !q.is_correct && !q.is_annulled
        if (filter === 'right') return q.is_correct
        return true
    })

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950/50 font-sans">
            <div className="max-w-3xl mx-auto p-4 md:p-8">
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
                            Gerando explicações com IA...
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
                        {/* Summary + filter */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4 flex items-center justify-between gap-4">
                            <div>
                                {summary && (
                                    <div>
                                        <span className={`text-3xl font-black ${scoreColor(summary.pct)}`}>
                                            {summary.score}/{summary.total}
                                        </span>
                                        <span className={`ml-2 text-base font-bold ${scoreColor(summary.pct)}`}>
                                            ({summary.pct}%)
                                        </span>
                                    </div>
                                )}
                                {annulledCount > 0 && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                        <Flag size={12} />
                                        {annulledCount} {annulledCount === 1 ? 'anulada' : 'anuladas'} por report
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {(['all', 'wrong', 'right'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filter === f 
                                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {f === 'all' ? 'Todas' : f === 'wrong' ? 'Erradas' : 'Certas'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question cards */}
                        <div className="space-y-4">
                            {visibleQuestions.map((q, idx) => (
                                (() => {
                                    const contextSegments = splitQuestionContextAndSource(q.context)
                                    const contextText = contextSegments.body
                                    const sourceText = contextSegments.source
                                    const statementText = q.statement
                                    const supportImages = extractDetachedQuestionImageUrls(q.images, q.context, q.statement)

                                    return (
                                <div
                                    key={q.id}
                                    className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden ${
                                        q.is_annulled
                                            ? 'border-amber-200 dark:border-amber-900/50'
                                            : q.is_correct
                                                ? 'border-green-200 dark:border-green-900/50'
                                                : 'border-red-200 dark:border-red-900/50'
                                    }`}
                                >
                                    {/* Question header */}
                                    <div className={`flex items-center gap-3 px-5 py-3 ${
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
                                        {q.difficulty && <span className="text-xs text-slate-400 dark:text-slate-500">· {q.difficulty}</span>}
                                        {q.topic && <span className="text-xs text-slate-400 dark:text-slate-500">· {q.topic}</span>}
                                        {q.is_annulled && <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Anulada</span>}
                                    </div>

                                    <div className="p-5">
                                        {/* Context */}
                                        {getQuestionContentBlocks(q.metadata).length > 0 ? (
                                            <QuestionContentBlocks metadata={q.metadata} className="mb-4" />
                                        ) : (
                                            <>
                                                {contextText && (
                                                    <QuestionRichText
                                                        text={contextText}
                                                        className="prose prose-sm prose-slate dark:prose-invert max-w-none mb-4 text-slate-600 dark:text-slate-300 border-l-4 border-slate-200 dark:border-slate-700 pl-3"
                                                    />
                                                )}

                                                {/* Support images */}
                                                {supportImages.length > 0 && (
                                                    <QuestionSupportImages images={supportImages} metadata={q.metadata} className="mb-4" />
                                                )}

                                                {sourceText && (
                                                    <QuestionRichText
                                                        text={sourceText}
                                                        className="prose prose-slate dark:prose-invert max-w-none -mt-2 mb-4 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400"
                                                    />
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
                                                                    <QuestionRichText text={alt.text} />
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

                                        {/* AI Explanation */}
                                        {q.explanation && (
                                            <div 
                                                className="rounded-xl p-4" 
                                                style={{ 
                                                    background: 'color-mix(in srgb, var(--brand-primary) 5%, transparent)', 
                                                    border: '1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent)' 
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Brain size={14} style={{ color: 'var(--brand-primary)' }} />
                                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
                                                        Explicação IA
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
                                })()
                            ))}
                        </div>

                        {visibleQuestions.length === 0 && (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                Nenhuma questão neste filtro.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
