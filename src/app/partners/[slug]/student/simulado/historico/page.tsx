'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Clock, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SimuladoSession {
    id: string
    config: {
        format: string
        subject?: string
        difficulty: string
        qty?: number
    }
    score: number
    total_questions: number
    percentage: number
    tri_score: number | null
    time_taken_secs: number
    completed_at: string
}

interface HistoryResponse {
    sessions: SimuladoSession[]
    total: number
    page: number
    pages: number
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDuration(secs: number) {
    if (!secs) return '—'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}min ${s}s`
    if (m > 0) return `${m}min ${s}s`
    return `${s}s`
}

function scoreColor(pct: number) {
    if (pct >= 70) return 'text-green-600'
    if (pct >= 45) return 'text-yellow-600'
    return 'text-red-600'
}

function scoreBarBg(pct: number) {
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
}

function formatConfig(cfg: SimuladoSession['config']) {
    const fmt = cfg.format
    if (fmt === 'custom') {
        return cfg.subject ? cfg.subject : 'Personalizado'
    }
    const labels: Record<string, string> = {
        linguagens: 'Linguagens',
        humanas: 'Ciências Humanas',
        natureza: 'Ciências da Natureza',
        matematica: 'Matemática',
        dia1: 'Dia 1',
        dia2: 'Dia 2',
        completo: 'ENEM Completo',
    }
    return labels[fmt] ?? fmt
}

export default function SimuladoHistoricoPage() {
    const router = useRouter()
    const { slug } = useParams<{ slug: string }>()
    const [sessions, setSessions] = useState<SimuladoSession[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [accessToken, setAccessToken] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session) setAccessToken(session.access_token)
        }
        init()
    }, [])

    const fetchHistory = useCallback(async (p: number) => {
        if (!accessToken) return
        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
            const res = await fetch(`${apiUrl}/api/simulado/history?page=${p}&limit=10`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (!res.ok) return
            const data: HistoryResponse = await res.json()
            setSessions(data.sessions || [])
            setTotal(data.total)
            setTotalPages(data.pages)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [accessToken])

    useEffect(() => {
        fetchHistory(page)
    }, [fetchHistory, page])

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans">
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.push(`/partners/${slug}/student/simulado`)}
                        className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Histórico de Simulados</h1>
                        {!loading && (
                            <p className="text-sm text-slate-500">{total} simulado(s) realizado(s)</p>
                        )}
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                        <Target size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-semibold">Nenhum simulado realizado ainda.</p>
                        <button
                            onClick={() => router.push(`/partners/${slug}/student/simulado`)}
                            className="mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Fazer primeiro simulado
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map(s => (
                            <div
                                key={s.id}
                                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900">{formatConfig(s.config)}</span>
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                                                {s.config.difficulty}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={13} />
                                                {formatDuration(s.time_taken_secs)}
                                            </span>
                                            <span>{formatDate(s.completed_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`text-2xl font-black ${scoreColor(s.percentage)}`}>
                                            {s.score}/{s.total_questions}
                                        </span>
                                        <span className={`text-sm font-bold ${scoreColor(s.percentage)}`}>
                                            {s.percentage}%
                                        </span>
                                        {s.tri_score != null && (
                                            <span className="text-xs font-semibold" style={{ color: '#FF8C00' }}>
                                                TRI: {s.tri_score.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full ${scoreBarBg(s.percentage)}`}
                                        style={{ width: `${s.percentage}%` }}
                                    />
                                </div>
                                <button
                                    onClick={() => router.push(`/partners/${slug}/student/simulado/${s.id}/revisao`)}
                                    className="mt-3 flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-75"
                                    style={{ color: '#FF8C00' }}
                                >
                                    <Brain size={13} /> Revisão
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors text-slate-600"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-slate-500 font-semibold">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors text-slate-600"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
