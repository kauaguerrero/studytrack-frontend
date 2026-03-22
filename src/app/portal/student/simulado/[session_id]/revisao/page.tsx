'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Brain, Lock, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { UpsellModal } from '@/components/modals/UpsellModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionContent {
    id: string
    subject: string
    topic?: string
    context: string
    statement: string
    alternatives: { letter: string; text: string }[]
    correct_option: string
}

// backend: GET /api/simulado/<id>/review
interface ReviewExplanationEntry {
    explanation: string
    correct_answer: string
    user_answer: string | null
    is_correct: boolean
    subject: string
}

// backend: GET /api/simulado/<id>  (session detail)
interface SessionDetail {
    score: number
    total_questions: number
    percentage: number
    question_ids?: string[]
    answers: Record<string, string>
    questions: QuestionContent[]
}

// Merged shape used by the UI
interface ReviewQuestion extends QuestionContent {
    user_answer: string | null
    is_correct: boolean
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
    const [upsellOpen, setUpsellOpen] = useState(false)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'wrong' | 'right'>('all')

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
            // Fetch both in parallel — review is plan-gated, session provides question content
            const [reviewRes, sessionRes] = await Promise.all([
                fetch(`${apiUrl}/api/simulado/${sessionId}/review`, { headers }),
                fetch(`${apiUrl}/api/simulado/${sessionId}`, { headers }),
            ])

            // Plan gate: 403 on review endpoint
            if (reviewRes.status === 403) {
                const body = await reviewRes.json().catch(() => ({}))
                if (body.code === 'PLAN_REQUIRED') {
                    setUpsellOpen(true)
                    setError('plan_required')
                    return
                }
            }

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
                { explanations: Record<string, ReviewExplanationEntry>; session_id: string },
                SessionDetail,
            ] = await Promise.all([reviewRes.json(), sessionRes.json()])

            // Summary
            setSummary({
                score: sessionData.score,
                total: sessionData.total_questions,
                pct: sessionData.percentage,
            })

            // Merge: question content (from session) + explanation + user answer (from review)
            const merged: ReviewQuestion[] = sessionData.questions.map(q => {
                const exp = reviewData.explanations?.[q.id]
                return {
                    ...q,
                    user_answer: exp?.user_answer ?? (sessionData.answers?.[q.id]?.toUpperCase() || null),
                    is_correct: exp?.is_correct ?? false,
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
        if (filter === 'wrong') return !q.is_correct
        if (filter === 'right') return q.is_correct
        return true
    })

    return (
        <>
            <UpsellModal
                isOpen={upsellOpen}
                onClose={() => {
                    setUpsellOpen(false)
                    router.back()
                }}
                reason="DAILY_SIMULADO_REACHED"
            />

            <div className="min-h-screen bg-slate-50 dark:bg-background font-sans">
                <div className="max-w-3xl mx-auto p-4 md:p-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Brain size={22} className="text-indigo-500" />
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Revisão</h1>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 size={36} className="text-indigo-500 animate-spin" />
                            <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
                                Gerando explicações com IA...
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs text-center max-w-xs">
                                Isso pode levar alguns segundos na primeira vez.
                            </p>
                        </div>
                    )}

                    {/* Plan required */}
                    {!loading && error === 'plan_required' && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-800">
                            <Lock size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <h2 className="font-bold text-slate-900 dark:text-slate-50 mb-1">Recurso Pro</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                A revisão com IA está disponível nos planos Pro, Elite e VIP.
                            </p>
                            <button
                                onClick={() => setUpsellOpen(true)}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                            >
                                Fazer upgrade
                            </button>
                        </div>
                    )}

                    {/* Generic error */}
                    {!loading && error && error !== 'plan_required' && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-red-100 dark:border-red-900/40">
                            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
                            <button
                                onClick={fetchReview}
                                className="mt-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm"
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
                                <div className="flex gap-2">
                                    {(['all', 'wrong', 'right'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            {f === 'all' ? 'Todas' : f === 'wrong' ? 'Erradas' : 'Certas'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question cards */}
                            <div className="space-y-4">
                                {visibleQuestions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden ${q.is_correct ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50'}`}
                                    >
                                        {/* Question header */}
                                        <div className={`flex items-center gap-3 px-5 py-3 ${q.is_correct ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                            {q.is_correct
                                                ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />
                                                : <XCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                                            }
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Questão {idx + 1}</span>
                                            <span className="text-xs text-slate-400">{q.subject}</span>
                                            {q.topic && <span className="text-xs text-slate-400">· {q.topic}</span>}
                                        </div>

                                        <div className="p-5">
                                            {/* Context */}
                                            {q.context && (
                                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none mb-4 text-slate-600 dark:text-slate-300 border-l-4 border-slate-200 dark:border-slate-700 pl-3">
                                                    <ReactMarkdown>{q.context}</ReactMarkdown>
                                                </div>
                                            )}

                                            {/* Statement */}
                                            <p className="text-slate-800 dark:text-slate-200 font-medium mb-4 leading-relaxed">{q.statement}</p>

                                            {/* Alternatives */}
                                            <div className="space-y-2 mb-4">
                                                {q.alternatives?.map(alt => {
                                                    const isCorrect = alt.letter === q.correct_option?.toUpperCase()
                                                    const isUserWrong = alt.letter === q.user_answer?.toUpperCase() && !q.is_correct
                                                    return (
                                                        <div
                                                            key={alt.letter}
                                                            className={`flex gap-3 items-start p-3 rounded-xl border text-sm ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800' : isUserWrong ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' : 'border-transparent'}`}
                                                        >
                                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : isUserWrong ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                                {alt.letter}
                                                            </span>
                                                            <span className={`leading-snug ${isCorrect ? 'text-green-800 dark:text-green-200 font-medium' : isUserWrong ? 'text-red-800 dark:text-red-200' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                {alt.text}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Answer summary */}
                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                                {q.user_answer
                                                    ? <span>Sua resposta: <strong className={q.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{q.user_answer}</strong></span>
                                                    : <span className="text-slate-400">Não respondida</span>
                                                }
                                                <span>Gabarito: <strong className="text-green-600 dark:text-green-400">{q.correct_option?.toUpperCase()}</strong></span>
                                            </div>

                                            {/* AI Explanation */}
                                            {q.explanation && (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Brain size={14} className="text-indigo-500" />
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Explicação IA</span>
                                                    </div>
                                                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                                        <ReactMarkdown>{q.explanation}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
        </>
    )
}
