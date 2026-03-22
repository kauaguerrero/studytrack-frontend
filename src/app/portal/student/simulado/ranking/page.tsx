'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Medal, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RankingEntry {
    position: number
    user_id: string
    full_name: string           // backend retorna "full_name"
    score: number
    total_questions: number
    percentage: number
}

interface RankingResponse {
    ranking: RankingEntry[]
    user_position: number | null
    user_best: { percentage: number } | null   // backend retorna "user_best" (objeto)
}

function positionBadge(pos: number) {
    if (pos === 1) return <Trophy size={16} className="text-yellow-400" />
    if (pos === 2) return <Medal size={16} className="text-slate-400" />
    if (pos === 3) return <Medal size={16} className="text-amber-600" />
    return <span className="text-xs font-bold text-slate-400 w-4 text-center">{pos}</span>
}

function scoreColor(pct: number) {
    if (pct >= 70) return 'text-green-600 dark:text-green-400'
    if (pct >= 45) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

export default function RankingPage() {
    const router = useRouter()
    const [data, setData] = useState<RankingResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                setAccessToken(session.access_token)
                setCurrentUserId(session.user.id)
            }
        }
        init()
    }, [])

    useEffect(() => {
        if (!accessToken) return
        const fetchRanking = async () => {
            setLoading(true)
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
                const res = await fetch(`${apiUrl}/api/simulado/ranking`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                if (res.ok) setData(await res.json())
            } catch {
                // silent
            } finally {
                setLoading(false)
            }
        }
        fetchRanking()
    }, [accessToken])

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background font-sans">
            <div className="max-w-2xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Trophy size={22} className="text-yellow-400" /> Ranking Global
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Top 3 melhores simulados</p>
                    </div>
                </div>

                {/* User position banner */}
                {data?.user_position && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 mb-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Sua posição</span>
                        <div className="flex items-center gap-3">
                            {data.user_best?.percentage != null && (
                                <span className={`text-sm font-bold ${scoreColor(data.user_best.percentage)}`}>
                                    {data.user_best.percentage}%
                                </span>
                            )}
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                #{data.user_position}
                            </span>
                        </div>
                    </div>
                )}

                {/* Ranking list */}
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl h-16 animate-pulse border border-slate-100 dark:border-slate-800" />
                        ))}
                    </div>
                ) : !data || data.ranking.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-800">
                        <Trophy size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-semibold">Nenhum dado de ranking ainda.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.ranking.map(entry => {
                            const isMe = entry.user_id === currentUserId
                            return (
                                <div
                                    key={entry.user_id}
                                    className={`bg-white dark:bg-slate-900 rounded-xl p-4 border flex items-center gap-4 ${isMe ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800'}`}
                                >
                                    <div className="w-6 flex items-center justify-center shrink-0">
                                        {positionBadge(entry.position)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-900 dark:text-slate-50 text-sm truncate">
                                            {isMe ? <span className="text-indigo-600 dark:text-indigo-400">{entry.full_name} (você)</span> : entry.full_name}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {entry.score}/{entry.total_questions} questões
                                        </div>
                                    </div>
                                    <div className={`text-xl font-black ${scoreColor(entry.percentage)}`}>
                                        {entry.percentage}%
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
