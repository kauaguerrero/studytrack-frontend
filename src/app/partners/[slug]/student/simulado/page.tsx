'use client'

/**
 * Simulados — versão visual Edificar Student.
 * Lógica de negócio 100% idêntica ao portal padrão.
 * UI elevado: brand colors, animações Framer Motion, resultado celebrativo.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion'
import {
  Timer, ArrowRight, ArrowLeft, CheckCircle2, Play, RotateCcw,
  Trophy, BookOpen, History, Brain, ChevronDown, ChevronLeft, TrendingUp,
  Medal, BarChart3, Plus, Clock, Zap,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { UpsellModal } from '@/components/modals/UpsellModal'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Alternative { letter: string; text: string }

interface Question {
  id: string; external_id: string; subject: string; topic?: string
  context: string; statement: string; images: string[]; alternatives: Alternative[]
  correct_option: string
}

interface SubjectResult { correct: number; total: number; percentage: number }

interface FinishResult {
  score: number; total: number; percentage: number; tri_score: number | null
  time_taken_secs: number; results_by_subject: Record<string, SubjectResult>; session_id: string
}

interface SessionConfig { mode?: string; format?: string; subject?: string; difficulty?: string; qty?: number }

interface SimuladoSession {
  id: string; score: number; total_questions: number; percentage: number
  config: SessionConfig; time_taken_secs: number; started_at: string
  completed_at: string; tri_score: number | null; results_by_subject?: Record<string, SubjectResult>
}

interface RankEntry {
  position: number; user_id: string; percentage: number; full_name?: string; is_calibration?: boolean
}

interface RankingData {
  ranking: RankEntry[]; user_position?: number | null; user_best?: { percentage: number } | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ENEM_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens e Códigos',         emoji: '📖', qty: 45 },
  { value: 'humanas',     label: 'Ciências Humanas',             emoji: '🏛️', qty: 45 },
  { value: 'natureza',    label: 'Ciências da Natureza',         emoji: '🧪', qty: 45 },
  { value: 'matematica',  label: 'Matemática e suas Tecnologias',emoji: '📐', qty: 45 },
  { value: 'dia1',        label: 'Dia 1 (Linguagens + Humanas)', emoji: '📅', qty: 90 },
  { value: 'dia2',        label: 'Dia 2 (Natureza + Matemática)',emoji: '📅', qty: 90 },
  { value: 'completo',    label: 'ENEM Completo',                emoji: '🎯', qty: 180 },
]

const CUSTOM_SUBJECTS = [
  { value: 'Todas',             label: 'Todas as Matérias', qty: null },
  { value: 'Matemática',        label: 'Matemática',         qty: 673  },
  { value: 'Língua Portuguesa', label: 'Língua Portuguesa', qty: 664  },
  { value: 'Biologia',          label: 'Biologia',          qty: 237  },
  { value: 'Geografia',         label: 'Geografia',         qty: 226  },
  { value: 'Física',            label: 'Física',            qty: 216  },
  { value: 'História',          label: 'História',          qty: 201  },
  { value: 'Química',           label: 'Química',           qty: 196  },
  { value: 'Sociologia',        label: 'Sociologia',        qty: 119  },
  { value: 'Filosofia',         label: 'Filosofia',         qty: 83   },
  { value: 'Espanhol',          label: 'Espanhol',          qty: 64   },
  { value: 'Inglês',            label: 'Inglês',            qty: 42   },
]

const DIFFICULTIES = [
  { value: 'misto',   label: 'Misto'   },
  { value: 'facil',   label: 'Fácil'   },
  { value: 'medio',   label: 'Médio'   },
  { value: 'dificil', label: 'Difícil' },
]

// ── Static confetti pieces (no randomness → no hydration mismatch) ─────────────
const RING_CIRC = 2 * Math.PI * 80
const CONFETTI = Array.from({ length: 12 }, (_, i) => {
  const angleDeg = (360 / 12) * i
  const rad = (angleDeg * Math.PI) / 180
  const d = 90
  return { id: i, tx: Math.round(Math.cos(rad) * d), ty: Math.round(Math.sin(rad) * d), delay: i * 0.04 }
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60); const s = secs % 60
  return m > 0 ? `${m}min ${s}s` : `${s}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function scoreColor(pct: number) {
  if (pct >= 70) return 'text-green-600'
  if (pct >= 45) return 'text-yellow-600'
  return 'text-red-600'
}

function scoreBarColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 45) return '#eab308'
  return '#ef4444'
}

function scoreRingColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 45) return '#f97316'
  return '#ef4444'
}

function celebrationMessage(pct: number): { emoji: string; title: string; sub: string } {
  if (pct >= 80) return { emoji: '🏆', title: 'Resultado extraordinário!', sub: 'Você está no caminho certo para a aprovação.' }
  if (pct >= 70) return { emoji: '🎉', title: 'Excelente resultado!', sub: 'Continue assim e a aprovação é certa.' }
  if (pct >= 50) return { emoji: '👊', title: 'Bom progresso!', sub: 'Cada simulado te deixa mais preparado.' }
  return { emoji: '💪', title: 'Continue praticando!', sub: 'A persistência é o que separa os aprovados.' }
}

function getConfigLabel(session: SimuladoSession): string {
  const c = session.config || {}
  if (c.format && c.format !== 'custom') {
    const fmt = ENEM_FORMATS.find(f => f.value === c.format)
    return fmt ? fmt.label : c.format
  }
  const subj = c.subject || 'Todas'
  const qty = session.total_questions || c.qty || 0
  const diff = DIFFICULTIES.find(d => d.value === c.difficulty)?.label || 'Misto'
  return `${subj} · ${qty}q · ${diff}`
}

function aggregateSubjectPerf(sessions: SimuladoSession[]) {
  const acc: Record<string, { correct: number; total: number }> = {}
  for (const s of sessions) {
    if (!s.results_by_subject) continue
    for (const [subj, res] of Object.entries(s.results_by_subject)) {
      if (!acc[subj]) acc[subj] = { correct: 0, total: 0 }
      acc[subj].correct += res.correct
      acc[subj].total += res.total
    }
  }
  return Object.entries(acc)
    .map(([subject, { correct, total }]) => ({ subject, pct: total > 0 ? Math.round((correct / total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg border border-slate-700">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-green-400">{payload[0].value}%</p>
    </div>
  )
}

// ── Shared style helpers ───────────────────────────────────────────────────────
const CONTAINER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SimuladoPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const shouldReduce = useReducedMotion()

  const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup')
  const [showConfigModal, setShowConfigModal] = useState(false)

  // Config
  const [mode, setMode] = useState<'custom' | 'enem'>('custom')
  const [subject, setSubject] = useState('Todas')
  const [qty, setQty] = useState(10)
  const [difficulty, setDifficulty] = useState('misto')
  const [enemFormat, setEnemFormat] = useState('linguagens')

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const questionTopRef = useRef<HTMLDivElement>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(false)

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const [finishResult, setFinishResult] = useState<FinishResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Auth
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [upsellReason, setUpsellReason] = useState<'DAILY_SIMULADO_REACHED' | 'TRIAL_EXPIRED'>('DAILY_SIMULADO_REACHED')
  const [finishDialogOpen, setFinishDialogOpen] = useState(false)

  // Dashboard data
  const [sessions, setSessions] = useState<SimuladoSession[]>([])
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashVersion, setDashVersion] = useState(0)
  const [evolutionSubject, setEvolutionSubject] = useState('Todas')

  // UI: result animation
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  // UI: timer warning animation
  const timerShakeControls = useAnimation()
  const prevTimeLeftRef = useRef<number>(Infinity)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
  const apiHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` })

  // ── Auth ──
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setAccessToken(session.access_token)
      setCurrentUserId(session.user.id)
    }
    init()
  }, [])

  // ── Dashboard fetch ──
  useEffect(() => {
    if (!accessToken) return
    const fetchDashboard = async () => {
      setDashLoading(true)
      try {
        const [histRes, rankRes] = await Promise.all([
          fetch(`${apiUrl}/api/simulado/history?page=1&limit=20`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${apiUrl}/api/simulado/ranking`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ])
        const histData = histRes.ok ? await histRes.json() : { sessions: [] }
        const rankJson = rankRes.ok ? await rankRes.json() : { ranking: [], user_position: null }
        setSessions(histData.sessions || [])
        setRankingData(rankJson)
      } catch {
        setSessions([]); setRankingData(null)
      } finally {
        setDashLoading(false)
      }
    }
    fetchDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, apiUrl, dashVersion])

  // ── Timer ──
  useEffect(() => {
    if (step !== 'quiz') return
    if (timeLeft <= 0) { handleTimeExpired(); return }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft])

  // ── Timer shake when crossing 5-minute threshold ──
  useEffect(() => {
    const prev = prevTimeLeftRef.current
    prevTimeLeftRef.current = timeLeft
    if (step !== 'quiz') return
    if (prev > 300 && timeLeft <= 300 && !shouldReduce) {
      timerShakeControls.start({
        x: [0, -10, 10, -10, 10, -6, 6, -3, 3, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      })
    }
  }, [timeLeft, step, timerShakeControls, shouldReduce])

  // ── Scroll to top of question on navigate ──
  useEffect(() => {
    if (step !== 'quiz') return
    questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentIdx, step])

  // ── Result: count-up score animation ──
  useEffect(() => {
    if (step !== 'result') { setAnimatedScore(0); setShowConfetti(false); return }
    if (shouldReduce) { setAnimatedScore(displayScore); setShowConfetti(displayPct >= 60); return }

    let raf: number
    const startTime = performance.now()
    const duration = 1200
    const target = displayScore
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
      else {
        setAnimatedScore(target)
        if (displayPct >= 60) setTimeout(() => setShowConfetti(true), 200)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Derived KPIs ──
  const totalSimulados = sessions.length
  const avgPct = totalSimulados > 0 ? Math.round(sessions.reduce((s, x) => s + (x.percentage ?? 0), 0) / totalSimulados) : 0
  const bestPct = totalSimulados > 0 ? Math.max(...sessions.map(s => s.percentage ?? 0)) : 0
  const rankingPos = rankingData?.user_position ?? null
  const heroSubtitle = totalSimulados === 0
    ? 'Faça seu primeiro simulado e descubra seu nível'
    : bestPct >= 70 ? `Seu melhor resultado foi ${bestPct}% — continue assim!`
    : `Sua média é ${avgPct}% — vamos melhorar juntos!`

  // ── Chart data ──
  const subjectOptions = ['Todas', ...Array.from(new Set(sessions.flatMap(s => Object.keys(s.results_by_subject || {}))))]
  const filteredSessions = evolutionSubject === 'Todas' ? sessions : sessions.filter(s => s.results_by_subject?.[evolutionSubject] != null)
  const evolutionData = [...filteredSessions].reverse().map((s, i) => ({ name: `#${i + 1}`, pct: s.percentage ?? 0, date: formatDate(s.started_at) }))
  const subjectPerfData = aggregateSubjectPerf(sessions)

  // ── Handlers ──
  const startSimulado = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = { difficulty }
      if (mode === 'custom') { body.format = 'custom'; body.qty = qty; if (subject !== 'Todas') body.subject = subject }
      else body.format = enemFormat
      const res = await fetch(`${apiUrl}/api/simulado/start`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (res.status === 403) { setUpsellReason(data.code || 'DAILY_SIMULADO_REACHED'); setUpsellOpen(true); setShowConfigModal(false); return }
      if (res.status === 404) { toast.error('Nenhuma questão encontrada', { description: 'Tente reduzir a quantidade ou mudar a dificuldade para "Misto".', duration: 6000 }); return }
      if (!res.ok) { toast.error('Erro ao iniciar simulado', { description: data.error || 'Tente novamente em instantes.' }); return }
      setShowConfigModal(false)
      setSessionId(data.session_id)
      setQuestions(data.questions)
      setTimeLeft(data.questions.length * 3 * 60)
      startTimeRef.current = Date.now()
      setUserAnswers({}); setCurrentIdx(0); setFinishResult(null)
      prevTimeLeftRef.current = data.questions.length * 3 * 60
      setStep('quiz')
    } catch { toast.error('Erro de conexão', { description: 'Não foi possível conectar ao servidor.' }) }
    finally { setLoading(false) }
  }

  const submitFinish = async (answers: Record<string, string>) => {
    if (!sessionId || !accessToken || submitting) return
    setSubmitting(true)
    try {
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const res = await fetch(`${apiUrl}/api/simulado/${sessionId}/finish`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ answers, time_taken_secs: timeTaken }) })
      const data = await res.json()
      if (res.ok) setFinishResult({ ...data, session_id: sessionId })
    } catch { /* result screen shows local fallback */ }
    finally { setSubmitting(false); setStep('result') }
  }

  const handleTimeExpired = () => submitFinish(userAnswers)
  const confirmFinish = () => { setFinishDialogOpen(false); submitFinish(userAnswers) }
  const handleSelectOption = (letter: string) => {
    const q = questions[currentIdx]
    setUserAnswers(prev => ({ ...prev, [q.id]: letter }))
  }
  const resetSimulado = (openModal = false) => {
    // CORREÇÃO AQUI: userAnswers resetado com {} em vez de []
    setStep('setup'); setQuestions([]); setCurrentIdx(0); setUserAnswers({}); setTimeLeft(0)
    setSessionId(null); setFinishResult(null); setDashVersion(v => v + 1)
    if (openModal) setShowConfigModal(true)
  }

  // ── Fallback score ──
  const localScore = questions.filter(q => userAnswers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase()).length
  const displayScore = finishResult?.score ?? localScore
  const displayTotal = finishResult?.total ?? questions.length
  const displayPct = finishResult?.percentage ?? Math.round((localScore / Math.max(questions.length, 1)) * 100)
  const celebration = celebrationMessage(displayPct)
  const isTimeCritical = timeLeft > 0 && timeLeft <= 300

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <UpsellModal isOpen={upsellOpen} onClose={() => setUpsellOpen(false)} reason={upsellReason} />

      {/* ── Finish dialog ── */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar simulado?</DialogTitle>
            <DialogDescription>
              {questions.length - Object.keys(userAnswers).length > 0
                ? `Você tem ${questions.length - Object.keys(userAnswers).length} questão(ões) sem resposta. Ao finalizar, não será possível voltar.`
                : 'Todas as questões foram respondidas. Deseja entregar?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setFinishDialogOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50 text-slate-700 cursor-pointer">
              Continuar respondendo
            </button>
            <button onClick={confirmFinish} disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-70 cursor-pointer"
              style={{ background: 'var(--brand-primary)' }}>
              {submitting ? 'Enviando...' : 'Entregar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Config modal ── */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              Configurar Simulado
            </DialogTitle>
            <DialogDescription>Escolha o formato e as opções do seu simulado.</DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            {(['custom', 'enem'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${mode === m ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {m === 'custom' ? 'Personalizado' : 'Bloco ENEM'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {mode === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria</label>
                  <div className="relative">
                    <select className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 font-semibold text-slate-700 appearance-none pr-10 cursor-pointer outline-none"
                      style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      value={subject} onChange={e => setSubject(e.target.value)}>
                      {CUSTOM_SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                  {(() => {
                    const sel = CUSTOM_SUBJECTS.find(s => s.value === subject)
                    if (!sel || sel.qty === null || sel.qty >= qty) return null
                    return <p className="mt-1.5 text-xs text-amber-600 flex items-start gap-1"><span className="shrink-0">⚠️</span><span>Essa matéria tem apenas {sel.qty} questões. Reduza a quantidade ou mude para &quot;Misto&quot;.</span></p>
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantidade</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 30, 45, 90, 180].map(val => (
                      <button key={val} onClick={() => setQty(val)}
                        className={`p-2.5 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${qty === val ? 'text-white border-transparent' : 'bg-white text-slate-600 hover:border-slate-300 border-slate-200'}`}
                        style={qty === val ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' } : {}}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Área de Conhecimento</label>
                <div className="space-y-2">
                  {ENEM_FORMATS.map(f => (
                    <button key={f.value} onClick={() => setEnemFormat(f.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${enemFormat === f.value ? 'text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                      style={enemFormat === f.value ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' } : {}}>
                      <span>{f.emoji} {f.label}</span>
                      <span className={`text-xs font-normal ${enemFormat === f.value ? 'text-white/70' : 'text-slate-400'}`}>{f.qty}q</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dificuldade</label>
              <div className="grid grid-cols-4 gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${difficulty === d.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button onClick={() => setShowConfigModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={startSimulado} disabled={loading || !accessToken}
              className="flex-1 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              style={{ background: 'var(--brand-primary)' }}>
              {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>) : (<><Play size={16} /> Iniciar Simulado</>)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════ SETUP ════════════════════════════════════ */}
      {step === 'setup' && (
        <div className="min-h-dvh bg-[#F5F5F7]">
          <motion.div
            className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-5"
            variants={shouldReduce ? {} : CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            {/* Hero */}
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href={`/partners/${slug}/student/dashboard`} className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                    <ChevronLeft size={14} /> Dashboard
                  </Link>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Simulados</h1>
                <div className="text-slate-500 mt-1 text-sm">
                  {dashLoading ? <Skeleton className="h-4 w-64" /> : heroSubtitle}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href={`/partners/${slug}/student/simulado/historico`}
                  className="flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 font-bold px-4 py-3 rounded-xl hover:bg-slate-50 transition-all flex-1 sm:flex-none">
                  <History size={16} /> Histórico
                </Link>
                <button onClick={() => setShowConfigModal(true)}
                  className="flex items-center justify-center gap-2 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer flex-1 sm:flex-none"
                  style={{ background: 'var(--brand-primary)' }}>
                  <Plus size={18} /> Novo Simulado
                </button>
              </div>
            </motion.div>

            {/* KPI Cards */}
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {dashLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : (
                <>
                  {[
                    { icon: <BookOpen size={15} style={{ color: 'var(--brand-primary)' }} />, bg: 'bg-[var(--brand-primary)]/10', label: 'Realizados', value: totalSimulados, sub: 'simulados no total', valueClass: 'text-slate-900' },
                    { icon: <TrendingUp size={15} className="text-green-600" />, bg: 'bg-green-50', label: 'Média Geral', value: totalSimulados > 0 ? `${avgPct}%` : '—', sub: 'de acertos', valueClass: totalSimulados > 0 ? scoreColor(avgPct) : 'text-slate-300' },
                    { icon: <Trophy size={15} className="text-yellow-500" />, bg: 'bg-yellow-50', label: 'Melhor', value: totalSimulados > 0 ? `${bestPct}%` : '—', sub: 'melhor resultado', valueClass: totalSimulados > 0 ? scoreColor(bestPct) : 'text-slate-300' },
                    { icon: <Medal size={15} className="text-purple-600" />, bg: 'bg-purple-50', label: 'Ranking', value: rankingPos != null ? `#${rankingPos}` : '—', sub: 'ranking hoje', valueClass: 'text-slate-900' },
                  ].map((card) => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`${card.bg} p-1.5 rounded-lg`}>{card.icon}</div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{card.label}</span>
                      </div>
                      <div className={`text-3xl font-black ${card.valueClass}`}>{card.value}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>

            {/* First-time welcome */}
            {!dashLoading && totalSimulados === 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}>
                  <Trophy size={32} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Bem-vindo aos Simulados!</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                  Teste seus conhecimentos com questões reais do ENEM. Acompanhe sua evolução e mire na nota dos seus sonhos.
                </p>
                <button onClick={() => setShowConfigModal(true)}
                  className="inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow cursor-pointer"
                  style={{ background: 'var(--brand-primary)' }}>
                  <Play size={18} /> Começar meu primeiro simulado
                </button>
              </motion.div>
            )}

            {/* Charts skeleton */}
            {dashLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            )}

            {/* Charts */}
            {!dashLoading && totalSimulados > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={17} className="text-slate-400" />
                      <h2 className="font-bold text-slate-900 text-sm">Evolução de Desempenho</h2>
                    </div>
                    {subjectOptions.length > 1 && (
                      <div className="relative">
                        <select value={evolutionSubject} onChange={e => setEvolutionSubject(e.target.value)}
                          className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 appearance-none pr-6 cursor-pointer outline-none">
                          {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  {evolutionData.length < 2 ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
                      <BarChart3 size={28} className="text-slate-200" />
                      <p className="text-sm text-slate-400 max-w-[200px]">Faça pelo menos 2 simulados para ver sua evolução</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={evolutionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#22c55e' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Subject performance */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart3 size={17} className="text-slate-400" />
                    <h2 className="font-bold text-slate-900 text-sm">Desempenho por Matéria</h2>
                  </div>
                  {subjectPerfData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-sm text-slate-400 text-center">Nenhum dado disponível ainda</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, subjectPerfData.length * 42)}>
                      <BarChart layout="vertical" data={subjectPerfData} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="subject" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                          {subjectPerfData.map((entry, i) => <Cell key={`cell-${i}`} fill={scoreBarColor(entry.pct)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            )}

            {/* Recent simulados */}
            {dashLoading && <Skeleton className="h-72 w-full rounded-2xl" />}
            {!dashLoading && totalSimulados > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <History size={17} className="text-slate-400" />
                    <h2 className="font-bold text-slate-900 text-sm">Últimos Simulados</h2>
                  </div>
                  <Link href={`/partners/${slug}/student/simulado/historico`} className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">Ver todos →</Link>
                </div>
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(session => {
                    const pct = session.percentage ?? 0
                    return (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{getConfigLabel(session)}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Clock size={11} />{formatDate(session.started_at)}</span>
                            {session.time_taken_secs > 0 && <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Zap size={11} />{formatDuration(session.time_taken_secs)}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreBarColor(pct) }} />
                            </div>
                            <span className={`text-sm font-black shrink-0 ${scoreColor(pct)}`}>{pct}%</span>
                          </div>
                        </div>
                        <Link href={`/partners/${slug}/student/simulado/${session.id}/revisao`}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-4 py-3 sm:px-3 sm:py-2 rounded-lg transition-colors min-h-[44px] sm:min-h-0 justify-center"
                          style={{ color: 'var(--brand-primary)', background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}>
                          <Brain size={13} /> Revisar
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Ranking */}
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Trophy size={17} className="text-yellow-500" />
                  <h2 className="font-bold text-slate-900 text-sm">Ranking do Dia</h2>
                </div>
                <Link href={`/partners/${slug}/student/simulado/ranking`} className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">Ver completo →</Link>
              </div>
              <p className="text-xs text-slate-400 mb-5">Melhores resultados de hoje</p>
              {dashLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
              ) : !rankingData?.ranking?.length ? (
                <div className="text-center py-8">
                  <Trophy size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum simulado hoje ainda</p>
                  <p className="text-xs text-slate-300 mt-1">Seja o primeiro do dia!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {rankingData.ranking.slice(0, 3).map(entry => {
                      const isMe = entry.user_id === currentUserId
                      const medals = ['🥇', '🥈', '🥉']
                      return (
                        <div key={entry.user_id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isMe ? 'border' : 'bg-slate-50'}`}
                          style={isMe ? { background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' } : {}}>
                          <span className="text-lg w-7 text-center" role="img" aria-label={`${entry.position}º lugar`}>{medals[entry.position - 1] ?? `#${entry.position}`}</span>
                          <span className={`flex-1 text-sm font-semibold truncate ${isMe ? '' : 'text-slate-700'}`} style={isMe ? { color: 'var(--brand-primary)' } : {}}>{isMe ? 'Você' : (entry.full_name || `Usuário ${entry.user_id.slice(0, 6)}`)}</span>
                          <span className={`text-sm font-black ${scoreColor(entry.percentage)}`}>{entry.percentage}%</span>
                        </div>
                      )
                    })}
                  </div>
                  {rankingData.user_position && rankingData.user_position > 3 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}>
                      <span className="text-sm font-bold text-slate-500 w-7 text-center">#{rankingData.user_position}</span>
                      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>Você</span>
                      <span className={`text-sm font-black ${scoreColor(rankingData.user_best?.percentage ?? 0)}`}>{rankingData.user_best?.percentage ?? 0}%</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════ QUIZ ═════════════════════════════════════ */}
      {step === 'quiz' && (
        <div className="min-h-dvh bg-[#F5F5F7] flex flex-col">

          {/* Sticky header */}
          <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 shadow-sm flex justify-between items-center gap-2">
            {/* Progress counter */}
            <div className="text-xs sm:text-sm font-extrabold text-slate-500 shrink-0 tabular-nums">
              {currentIdx + 1}
              <span className="text-slate-300"> / {questions.length}</span>
            </div>

            {/* Timer — shakes when entering critical zone */}
            <motion.div animate={timerShakeControls}>
              <div className={`font-mono font-black tabular-nums px-3 py-1.5 rounded-xl border-2 transition-all text-base sm:text-lg ${
                isTimeCritical
                  ? 'bg-red-50 text-red-600 border-red-400 animate-pulse scale-110'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {isTimeCritical && <span className="mr-1 text-sm">⏰</span>}
                {formatTime(timeLeft)}
              </div>
            </motion.div>

            {/* Finish button */}
            <button onClick={() => setFinishDialogOpen(true)}
              className="text-xs font-bold uppercase px-3 py-2 rounded-lg cursor-pointer shrink-0 min-h-[36px] transition-colors text-red-500 hover:bg-red-50">
              Finalizar
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-200 shrink-0">
            <motion.div className="h-1"
              style={{ background: 'var(--brand-primary)' }}
              animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Question */}
          <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-40">
            <div ref={questionTopRef} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: 'var(--brand-primary)' }}>
                  {questions[currentIdx].subject}
                </span>
                {questions[currentIdx].topic && (
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                    {questions[currentIdx].topic}
                  </span>
                )}
              </div>

              {/* Context */}
              {questions[currentIdx].context && (
                <div className="prose prose-slate max-w-none mb-5 text-slate-600 border-l-4 pl-4 text-sm leading-relaxed" style={{ borderColor: 'var(--brand-primary)' }}>
                  <ReactMarkdown>{questions[currentIdx].context}</ReactMarkdown>
                </div>
              )}

              {/* Statement */}
              <div className="text-base md:text-lg text-slate-900 font-medium mb-7 leading-relaxed">
                {questions[currentIdx].statement}
              </div>

              {/* Alternatives */}
              <div className="space-y-3">
                {questions[currentIdx].alternatives?.map(alt => {
                  const isSelected = userAnswers[questions[currentIdx].id] === alt.letter
                  return (
                    <button key={alt.letter} onClick={() => handleSelectOption(alt.letter)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start cursor-pointer active:scale-[0.99] ${isSelected ? 'shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
                      style={isSelected ? {
                        background: 'color-mix(in srgb, var(--brand-primary) 8%, white)',
                        borderColor: 'var(--brand-primary)',
                      } : {}}>
                      <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors ${isSelected ? 'text-white' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                        style={isSelected ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' } : {}}>
                        {alt.letter}
                      </span>
                      <span className={`text-sm leading-snug pt-1 ${isSelected ? 'font-medium' : 'text-slate-700'}`}
                        style={isSelected ? { color: 'var(--brand-primary)' } : {}}>
                        {alt.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question navigator */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setCurrentIdx(i)}
                  className={`w-8 h-8 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                    i === currentIdx ? 'text-white scale-110 shadow-sm' : userAnswers[q.id] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                  style={i === currentIdx ? { background: 'var(--brand-primary)' } : {}}>
                  {i + 1}
                </button>
              ))}
            </div>
          </main>

          {/* Nav bar */}
          <div className="bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 fixed bottom-0 left-0 right-0 z-20"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="max-w-3xl mx-auto w-full flex justify-between items-center gap-4">
              <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0}
                className="px-4 py-3 text-slate-500 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[44px]">
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
              </button>

              {currentIdx < questions.length - 1 ? (
                <button onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
                  style={{ background: 'var(--brand-primary)' }}>
                  Próxima <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={() => setFinishDialogOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer min-h-[44px]">
                  Entregar <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ RESULT ═══════════════════════════════════ */}
      {step === 'result' && (
        <div className="min-h-dvh bg-[#F5F5F7] p-4 md:p-8">
          <motion.div
            className="max-w-3xl mx-auto space-y-5 pb-20"
            variants={shouldReduce ? {} : CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            {/* ── Hero result card ── */}
            <motion.div
              variants={shouldReduce ? {} : { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100 relative"
            >
              {/* Colored top stripe */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, var(--brand-primary), ${scoreRingColor(displayPct)})` }} />

              <div className="p-6 sm:p-10 text-center">
                {/* Celebration message */}
                <motion.div
                  variants={shouldReduce ? {} : { hidden: { opacity: 0, y: -10 }, show: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.35 } } }}
                  className="mb-6"
                >
                  <span className="text-3xl" role="img" aria-label="resultado">{celebration.emoji}</span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">{celebration.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{celebration.sub}</p>
                </motion.div>

                {/* Score ring */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  {/* Confetti burst — only for good scores */}
                  <AnimatePresence>
                    {showConfetti && displayPct >= 60 && CONFETTI.map(piece => (
                      <motion.div key={piece.id}
                        className="absolute w-2.5 h-2.5 rounded-full pointer-events-none"
                        style={{ background: piece.id % 3 === 0 ? 'var(--brand-primary)' : piece.id % 3 === 1 ? '#1f2937' : '#f59e0b' }}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ x: piece.tx, y: piece.ty, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.7, delay: piece.delay, ease: 'easeOut' }}
                      />
                    ))}
                  </AnimatePresence>

                  <svg width="180" height="180" viewBox="0 0 200 200" className="overflow-visible">
                    {/* Track */}
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    {/* Animated ring */}
                    <motion.circle
                      cx="100" cy="100" r="80"
                      fill="none"
                      stroke={scoreRingColor(displayPct)}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      transform="rotate(-90, 100, 100)"
                      initial={{ strokeDashoffset: RING_CIRC }}
                      animate={{ strokeDashoffset: RING_CIRC * (1 - displayPct / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                    />
                  </svg>

                  {/* Score number (count-up) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black tabular-nums" style={{ color: scoreRingColor(displayPct) }}>
                      {animatedScore}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold mt-0.5">de {displayTotal}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
                  <div className="text-center">
                    <div className={`text-2xl font-black ${scoreColor(displayPct)}`}>{displayPct}%</div>
                    <div className="text-xs text-slate-400 font-semibold mt-1">Acertos</div>
                  </div>
                  {finishResult?.tri_score != null && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-indigo-600">{finishResult.tri_score.toFixed(1)}</div>
                      <div className="text-xs text-slate-400 font-semibold mt-1">Nota TRI</div>
                    </div>
                  )}
                  {finishResult?.time_taken_secs != null && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-700">{formatDuration(finishResult.time_taken_secs)}</div>
                      <div className="text-xs text-slate-400 font-semibold mt-1">Tempo</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => resetSimulado(false)} className="border border-slate-200 px-5 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-slate-50 text-slate-900 transition-colors cursor-pointer min-h-[44px]">
                    <ChevronLeft size={18} /> Dashboard
                  </button>
                  <button onClick={() => resetSimulado(true)}
                    className="text-white px-5 py-3 rounded-xl font-bold flex gap-2 items-center transition-colors cursor-pointer min-h-[44px]"
                    style={{ background: 'var(--brand-primary)' }}>
                    <RotateCcw size={18} /> Novo Simulado
                  </button>
                  {finishResult?.session_id && (
                    <button onClick={() => router.push(`/partners/${slug}/student/simulado/${finishResult.session_id}/revisao`)}
                      className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-indigo-700 transition-colors cursor-pointer min-h-[44px]">
                      <Brain size={18} /> Revisão com IA
                    </button>
                  )}
                  <button onClick={() => router.push(`/partners/${slug}/student/simulado/historico`)}
                    className="border border-slate-200 px-5 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-slate-50 text-slate-900 transition-colors cursor-pointer min-h-[44px]">
                    <History size={18} /> Histórico
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Subject breakdown */}
            {finishResult?.results_by_subject && Object.keys(finishResult.results_by_subject).length > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen size={18} className="text-slate-400" />
                  <h3 className="font-bold text-slate-900">Desempenho por Matéria</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(finishResult.results_by_subject).map(([subj, res]) => (
                    <div key={subj}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700">{subj}</span>
                        <span className={`font-bold ${scoreColor(res.percentage)}`}>{res.correct}/{res.total} ({res.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div className="h-2 rounded-full"
                          style={{ backgroundColor: scoreBarColor(res.percentage) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${res.percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Ranking CTA */}
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-50 p-2.5 rounded-xl"><Trophy size={20} className="text-yellow-500" /></div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Ranking do Dia</div>
                  <div className="text-xs text-slate-400">Veja onde você está hoje</div>
                </div>
              </div>
              <button onClick={() => router.push(`/partners/${slug}/student/simulado/ranking`)}
                className="text-xs font-bold hover:underline cursor-pointer" style={{ color: 'var(--brand-primary)' }}>
                Ver ranking →
              </button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </>
  )
}