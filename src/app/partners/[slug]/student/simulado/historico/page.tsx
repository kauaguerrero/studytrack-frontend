'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Clock, ClipboardList, Plus, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { cn } from '@/lib/utils'
import { onBrandText } from '@/lib/brand-color'
import { toBrtDateKeyFromIso } from '@/lib/brt-date'
import { formatDayBR, totalResult, type ExternalSimulado } from '@/lib/external-simulados'
import { ExternalSimuladoDialog } from '@/components/simulados/ExternalSimuladoDialog'
import { ExternalSimuladosTable } from '@/components/simulados/ExternalSimuladosTable'
import { SimuladoEvolutionChart, type PlatformSimuladoPoint } from '@/components/simulados/SimuladoEvolutionChart'
import { MOCK_SIMULADO_HISTORY } from '../../../../../../../studytrack-tutorial-mock'

interface SimuladoSession {
    id: string
    config: {
        format: string
        subject?: string
        difficulty: string
        qty?: number
        bank?: string
        year?: number | null
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
        timeZone: 'America/Sao_Paulo',
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
    if (pct >= 70) return 'text-green-600 dark:text-green-400'
    if (pct >= 45) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

function scoreBarBg(pct: number) {
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
}

function formatConfig(cfg: SimuladoSession['config']) {
    const fmt = cfg.format
    if (fmt === 'custom') {
        const bank = cfg.bank && cfg.bank !== 'Todas' ? ` · ${cfg.bank}` : ''
        const year = cfg.year ? ` · ${cfg.year}` : ''
        return cfg.subject ? `${cfg.subject}${bank}${year}` : `Personalizado${bank}${year}`
    }
    const bank = cfg.bank && cfg.bank !== 'Todas' ? cfg.bank : 'ENEM'
    const labels: Record<string, string> = {
        linguagens: 'Linguagens',
        humanas: 'Ciências Humanas',
        natureza: 'Ciências da Natureza',
        matematica: 'Matemática',
        dia1: 'Dia 1',
        dia2: 'Dia 2',
        completo: bank === 'UFU' ? 'UFU Completo' : bank === 'UEG' ? 'UEG Completo' : 'ENEM Completo',
    }
    return `${labels[fmt] ?? fmt} · ${bank}`
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

export default function SimuladoHistoricoPage() {
    const router = useRouter()
    const { slug } = useParams<{ slug: string }>()
    const searchParams = useSearchParams()
    const { org } = useOrg()
    const [tab, setTab] = useState<'todos' | 'plataforma' | 'externos'>(() => {
        const aba = searchParams.get('aba')
        return aba === 'externos' || aba === 'plataforma' ? aba : 'todos'
    })
    const [sessions, setSessions] = useState<SimuladoSession[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    // Data (BRT) do simulado mais antigo de cada página já carregada — delimita
    // quais externos entram em cada página na aba "Todos".
    const [pageOldest, setPageOldest] = useState<Record<number, string>>({})
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
        if (org.is_mock) {
            setSessions(MOCK_SIMULADO_HISTORY as unknown as SimuladoSession[])
            setTotal(MOCK_SIMULADO_HISTORY.length)
            setTotalPages(1)
            setLoading(false)
            return
        }
        if (!accessToken) return
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/simulado/history?page=${p}&limit=10`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (!res.ok) return
            const data: HistoryResponse = await res.json()
            const list = data.sessions || []
            setSessions(list)
            if (list.length > 0) {
                setPageOldest((prev) => ({ ...prev, [p]: toBrtDateKeyFromIso(list[list.length - 1].completed_at) }))
            }
            setTotal(data.total)
            setTotalPages(data.pages)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [accessToken, org.is_mock])

    useEffect(() => {
        fetchHistory(page)
    }, [fetchHistory, page])

    // ── Simulados externos (só a nota, registrados pelo aluno) ──────────────
    const [externals, setExternals] = useState<ExternalSimulado[]>([])
    const [externalsLoading, setExternalsLoading] = useState(true)
    const [dialog, setDialog] = useState<{ open: boolean; editing: ExternalSimulado | null; key: number }>({
        open: false, editing: null, key: 0,
    })

    useEffect(() => {
        if (org.is_mock) {
            setExternalsLoading(false)
            return
        }
        if (!accessToken) return
        let cancelled = false
        fetch(`${API_URL}/api/simulado/external`, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then((res) => (res.ok ? res.json() : { simulados: [] }))
            .then((data) => { if (!cancelled) setExternals(data.simulados || []) })
            .catch(() => { /* silent */ })
            .finally(() => { if (!cancelled) setExternalsLoading(false) })
        return () => { cancelled = true }
    }, [accessToken, org.is_mock])

    const openDialog = (editing: ExternalSimulado | null) =>
        setDialog((d) => ({ open: true, editing, key: d.key + 1 }))

    const sortExternals = (list: ExternalSimulado[]) =>
        [...list].sort((a, b) => b.day1_date.localeCompare(a.day1_date) || b.created_at.localeCompare(a.created_at))

    // ── Gráfico: últimos 20 simulados da plataforma (independe da página da lista)
    const [chartSessions, setChartSessions] = useState<SimuladoSession[]>([])
    useEffect(() => {
        if (org.is_mock) {
            setChartSessions(MOCK_SIMULADO_HISTORY as unknown as SimuladoSession[])
            return
        }
        if (!accessToken) return
        fetch(`${API_URL}/api/simulado/history?page=1&limit=20`, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then((res) => (res.ok ? res.json() : { sessions: [] }))
            .then((data: HistoryResponse) => setChartSessions(data.sessions || []))
            .catch(() => { /* silent */ })
    }, [accessToken, org.is_mock])

    const platformPoints = useMemo<PlatformSimuladoPoint[]>(
        () => chartSessions.map((s) => ({
            id: s.id,
            date: toBrtDateKeyFromIso(s.completed_at),
            label: formatConfig(s.config),
            percentage: s.percentage,
        })),
        [chartSessions]
    )

    // Aba "Todos": a página atual da plataforma com os externos do mesmo
    // intervalo de datas intercalados (do mais recente para o mais antigo).
    const mixedEntries = useMemo(() => {
        const upper = page > 1 ? pageOldest[page - 1] : undefined
        const lower = page < totalPages ? pageOldest[page] : undefined
        const extDate = (ext: ExternalSimulado) => ext.day2_date ?? ext.day1_date
        return [
            ...sessions.map((s) => ({ kind: 'platform' as const, key: s.id, dateKey: toBrtDateKeyFromIso(s.completed_at), sortKey: s.completed_at, session: s })),
            ...externals
                .filter((ext) => (upper == null || extDate(ext) < upper) && (lower == null || extDate(ext) >= lower))
                .map((ext) => ({ kind: 'external' as const, key: `ext-${ext.id}`, dateKey: extDate(ext), sortKey: `${extDate(ext)}T23:59:59`, ext })),
        ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    }, [sessions, externals, page, totalPages, pageOldest])

    const renderPlatformCard = (s: SimuladoSession) => (
        <div
            key={s.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatConfig(s.config)}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">
                            {s.config.difficulty}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 dark:text-slate-500">
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
                        <span className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
                            TRI: {s.tri_score.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-1.5 rounded-full ${scoreBarBg(s.percentage)}`}
                    style={{ width: `${s.percentage}%` }}
                />
            </div>
            <button
                onClick={() => router.push(`/partners/${slug}/student/simulado/${s.id}/revisao`)}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-75"
                style={{ color: 'var(--brand-primary)' }}
            >
                <Brain size={13} /> Revisão
            </button>
        </div>
    )

    const renderExternalCard = (ext: ExternalSimulado) => {
        const result = totalResult(ext)
        const pct = result ? Math.round(result.pct) : null
        return (
            <button
                key={`ext-${ext.id}`}
                type="button"
                onClick={() => openDialog(ext)}
                className="block w-full text-left bg-white dark:bg-slate-900 rounded-2xl p-5 border border-dashed border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{ext.title}</span>
                            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Externo
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-400 dark:text-slate-500">
                            <span>
                                {formatDayBR(ext.day1_date, true)}
                                {ext.day2_date ? ` e ${formatDayBR(ext.day2_date, true)}` : ''}
                            </span>
                            {ext.essay_score != null && <span>Redação: {ext.essay_score}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-2xl font-black ${pct != null ? scoreColor(pct) : 'text-slate-400'}`}>
                            {result ? `${result.correct}/${result.total}` : '—'}
                        </span>
                        {pct != null && <span className={`text-sm font-bold ${scoreColor(pct)}`}>{pct}%</span>}
                    </div>
                </div>
                <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    {pct != null && <div className={`h-1.5 rounded-full ${scoreBarBg(pct)}`} style={{ width: `${pct}%` }} />}
                </div>
                <span className="mt-3 flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
                    <ClipboardList size={13} /> Editar
                </span>
            </button>
        )
    }

    const listSkeleton = (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-24 animate-pulse border border-slate-100 dark:border-slate-800" />
            ))}
        </div>
    )

    const platformEmpty = (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-800">
            <Target size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">Nenhum simulado realizado ainda.</p>
            <button
                onClick={() => router.push(`/partners/${slug}/student/simulado`)}
                className="mt-4 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: 'var(--brand-primary)' }}
            >
                Fazer primeiro simulado
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950/50 font-sans">
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.push(`/partners/${slug}/student/simulado`)}
                        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Histórico de Simulados</h1>
                        {!loading && !externalsLoading && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {total} na plataforma · {externals.length} externo(s)
                            </p>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <SimuladoEvolutionChart external={externals} platform={platformPoints} brandPrimary={org.brand_primary} />
                </div>

                {/* Abas */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                        {([['todos', 'Todos'], ['plataforma', 'Na plataforma'], ['externos', 'Externos']] as const).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={cn(
                                    'rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
                                    tab === value
                                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {tab !== 'plataforma' && !org.is_mock && (
                        <button
                            onClick={() => openDialog(null)}
                            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                            style={{ background: 'var(--brand-primary)', color: onBrandText(org.brand_primary) }}
                        >
                            <Plus size={16} /> Novo simulado externo
                        </button>
                    )}
                </div>

                {tab === 'externos' ? (
                    externalsLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-16 animate-pulse border border-slate-100 dark:border-slate-800" />
                            ))}
                        </div>
                    ) : externals.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-800">
                            <ClipboardList size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-700 dark:text-slate-200 font-bold">Nenhum simulado externo ainda</p>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                                Fez um simulado fora da plataforma? Registre a nota para acompanhar sua evolução junto com os simulados daqui.
                            </p>
                            {!org.is_mock && (
                                <button
                                    onClick={() => openDialog(null)}
                                    className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                                    style={{ background: 'var(--brand-primary)', color: onBrandText(org.brand_primary) }}
                                >
                                    Adicionar simulado externo
                                </button>
                            )}
                        </div>
                    ) : (
                        <ExternalSimuladosTable simulados={externals} onEdit={(sim) => openDialog(sim)} />
                    )
                ) : tab === 'todos' ? (
                    loading || externalsLoading ? listSkeleton
                        : mixedEntries.length === 0 ? platformEmpty
                        : (
                            <div className="space-y-3">
                                {mixedEntries.map((entry) =>
                                    entry.kind === 'external' ? renderExternalCard(entry.ext) : renderPlatformCard(entry.session)
                                )}
                            </div>
                        )
                ) : loading ? listSkeleton
                    : sessions.length === 0 ? platformEmpty
                    : <div className="space-y-3">{sessions.map(renderPlatformCard)}</div>
                }

                {/* Pagination */}
                {tab !== 'externos' && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            <ExternalSimuladoDialog
                key={dialog.key}
                open={dialog.open}
                onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
                simulado={dialog.editing}
                accessToken={accessToken}
                brandText={onBrandText(org.brand_primary)}
                onSaved={(saved) =>
                    setExternals((list) => sortExternals([...list.filter((s) => s.id !== saved.id), saved]))
                }
                onDeleted={(id) => setExternals((list) => list.filter((s) => s.id !== id))}
            />
        </div>
    )
}
