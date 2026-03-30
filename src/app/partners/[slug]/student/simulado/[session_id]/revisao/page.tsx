'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Brain, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'

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

interface ReviewExplanationEntry {
    explanation: string
    correct_answer: string
    user_answer: string | null
    is_correct: boolean
    subject: string
}

interface SessionDetail {
    score: number
    total_questions: number
    percentage: number
    question_ids?: string[]
    answers: Record<string, string>
    questions: QuestionContent[]
}

interface ReviewQuestion extends QuestionContent {
    user_answer: string | null
    is_correct: boolean
    explanation: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
    if (pct >= 70) return 'text-green-600'
    if (pct >= 45) return 'text-yellow-600'
    return 'text-red-600'
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
                { explanations: Record<string, ReviewExplanationEntry>; session_id: string },
                SessionDetail,
            ] = await Promise.all([reviewRes.json(), sessionRes.json()])

            setSummary({
                score: sessionData.score,
                total: sessionData.total_questions,
                pct: sessionData.percentage,
            })

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
        <div className="min-h-screen bg-[#F5F5F7] font-sans">
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Brain size={22} style={{ color: '#FF8C00' }} />
                        <h1 className="text-2xl font-bold text-slate-900">Revisão</h1>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#FF8C00' }} />
                        <p className="text-slate-500 font-semibold text-sm">
                            Gerando explicações com IA...
                        </p>
                        <p className="text-slate-400 text-xs text-center max-w-xs">
                            Isso pode levar alguns segundos na primeira vez.
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-white rounded-2xl p-8 text-center border border-red-100">
                        <p className="text-red-600 font-semibold">{error}</p>
                        <button
                            onClick={fetchReview}
                            className="mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {/* Review content */}
                {!loading && !error && questions.length > 0 && (
                    <>
                        {/* Summary + filter */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-4 flex items-center justify-between gap-4">
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
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${q.is_correct ? 'border-green-200' : 'border-red-200'}`}
                                >
                                    {/* Question header */}
                                    <div className={`flex items-center gap-3 px-5 py-3 ${q.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {q.is_correct
                                            ? <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                                            : <XCircle size={18} className="text-red-600 shrink-0" />
                                        }
                                        <span className="text-sm font-bold text-slate-700">Questão {idx + 1}</span>
                                        <span className="text-xs text-slate-400">{q.subject}</span>
                                        {q.topic && <span className="text-xs text-slate-400">· {q.topic}</span>}
                                    </div>

                                    <div className="p-5">
                                        {/* Context */}
                                        {q.context && (
                                            <div className="prose prose-sm prose-slate max-w-none mb-4 text-slate-600 border-l-4 border-slate-200 pl-3">
                                                <ReactMarkdown>{q.context}</ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Statement */}
                                        <p className="text-slate-800 font-medium mb-4 leading-relaxed">{q.statement}</p>

                                        {/* Alternatives */}
                                        <div className="space-y-2 mb-4">
                                            {q.alternatives?.map(alt => {
                                                const isCorrect = alt.letter === q.correct_option?.toUpperCase()
                                                const isUserWrong = alt.letter === q.user_answer?.toUpperCase() && !q.is_correct
                                                return (
                                                    <div
                                                        key={alt.letter}
                                                        className={`flex gap-3 items-start p-3 rounded-xl border text-sm ${isCorrect ? 'bg-green-50 border-green-300' : isUserWrong ? 'bg-red-50 border-red-300' : 'border-transparent'}`}
                                                    >
                                                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : isUserWrong ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {alt.letter}
                                                        </span>
                                                        <span className={`leading-snug ${isCorrect ? 'text-green-800 font-medium' : isUserWrong ? 'text-red-800' : 'text-slate-600'}`}>
                                                            {alt.text}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Answer summary */}
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                            {q.user_answer
                                                ? <span>Sua resposta: <strong className={q.is_correct ? 'text-green-600' : 'text-red-600'}>{q.user_answer}</strong></span>
                                                : <span className="text-slate-400">Não respondida</span>
                                            }
                                            <span>Gabarito: <strong className="text-green-600">{q.correct_option?.toUpperCase()}</strong></span>
                                        </div>

                                        {/* AI Explanation */}
                                        {q.explanation && (
                                            <div className="rounded-xl p-4" style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.2)' }}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Brain size={14} style={{ color: '#FF8C00' }} />
                                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FF8C00' }}>
                                                        Explicação IA
                                                    </span>
                                                </div>
                                                <div className="prose prose-sm prose-slate max-w-none text-slate-700">
                                                    <ReactMarkdown>{q.explanation}</ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {visibleQuestions.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                Nenhuma questão neste filtro.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
