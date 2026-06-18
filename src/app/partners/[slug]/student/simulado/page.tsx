'use client'

/**
 * Simulados — versão visual Edificar Student.
 * Lógica de negócio 100% idêntica ao portal padrão.
 * UI elevado: brand colors, animações Framer Motion, resultado celebrativo, suporte a Dark Mode.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion'
import {
  Timer, ArrowRight, ArrowLeft, ArrowUp, CheckCircle2, Play, RotateCcw,
  Trophy, BookOpen, History, Brain, ChevronDown, ChevronLeft, TrendingUp,
  Medal, BarChart3, Plus, Clock, Zap, Flag, EyeOff, Target,
} from 'lucide-react'
import { QuestionRichText } from '@/components/questions/QuestionRichText'
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia'
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
  getQuestionContentBlocks,
} from '@/components/questions/rendering'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { ReportDialog } from '@/components/questions/ReportDialog'
import { SimuladoRewardPopup } from '@/components/partners/gamification/SimuladoRewardPopup'
import { usePopupQueue } from '@/components/partners/gamification/PopupQueueContext'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Alternative { letter: string; text: string; image?: string | null }

interface Question {
  id: string; external_id: string; subject: string; topic?: string
  bank?: string; difficulty?: string; exam_year?: number
  context: string; statement: string; images?: unknown; alternatives: Alternative[]
  correct_option: string
  testlet_group_id?: string | null
  metadata?: unknown
}

interface SubjectResult { correct: number; total: number; percentage: number }
interface BankResult { correct: number; total: number; percentage: number }

interface FinishResult {
  score: number; total: number; percentage: number; tri_score: number | null
  time_taken_secs: number; results_by_subject: Record<string, SubjectResult>; results_by_bank?: Record<string, BankResult>; session_id: string
  config?: SessionConfig;
  weighted_result?: {
    applied: boolean;
    raw_percentage: number;
    weighted_percentage: number | null;
    weighted_points?: number | null;
    weighted_max_points?: number | null;
    mode?: 'ueg_objective_points' | 'weighted_percentage' | 'none';
    weights: Record<string, number>;
    breakdown: Record<string, {
      weight: number;
      questions: number;
      weighted_total: number;
      weighted_correct: number;
      percentage: number;
    }>;
  };
  annulled_question_ids?: string[];
  annulled_questions_count?: number;
  new_streak?: number;
  streak_updated?: boolean;
  gamification?: {
    points_awarded?: number;
    new_monthly_points?: number;
    shield_awarded?: boolean;
  };
}

interface SessionConfig { mode?: string; format?: string; subject?: string; difficulty?: string; qty?: number; bank?: string; year?: number | null; results_by_bank?: Record<string, BankResult> }

interface SimuladoSession {
  id: string; score: number; total_questions: number; percentage: number
  config: SessionConfig; time_taken_secs: number; started_at: string
  completed_at: string; tri_score: number | null; results_by_subject?: Record<string, SubjectResult>; results_by_bank?: Record<string, BankResult>
}

interface RankEntry {
  position: number; user_id: string; percentage: number; full_name?: string; is_calibration?: boolean; is_anonymous?: boolean
}

interface RankingData {
  ranking: RankEntry[]; user_position?: number | null; user_best?: { percentage: number } | null
}

type BankLabel = 'Todas' | 'ENEM' | 'UFU' | 'UEG' | 'UFG' | 'UNESP'
type PresetBank = 'ENEM' | 'UFU' | 'UEG' | 'UFG' | 'UNESP'

// ── Constants ──────────────────────────────────────────────────────────────────

const ENEM_BLOCK_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens e Códigos',         emoji: '📖', qty: 45 },
  { value: 'humanas',     label: 'Ciências Humanas',             emoji: '🏛️', qty: 45 },
  { value: 'natureza',    label: 'Ciências da Natureza',         emoji: '🧪', qty: 45 },
  { value: 'matematica',  label: 'Matemática e suas Tecnologias',emoji: '📐', qty: 45 },
  { value: 'dia1',        label: 'Dia 1 (Linguagens + Humanas)', emoji: '📅', qty: 90 },
  { value: 'dia2',        label: 'Dia 2 (Natureza + Matemática)',emoji: '📅', qty: 90 },
  { value: 'completo',    label: 'ENEM Completo',                emoji: '🎯', qty: 180 },
]

const UFU_BLOCK_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens',                   emoji: '📖', qty: 22 },
  { value: 'humanas',     label: 'Ciências Humanas',             emoji: '🏛️', qty: 22 },
  { value: 'natureza',    label: 'Ciências da Natureza',         emoji: '🧪', qty: 22 },
  { value: 'matematica',  label: 'Matemática',                   emoji: '📐', qty: 22 },
  { value: 'completo',    label: 'UFU Completo',                 emoji: '🎯', qty: 88 },
]

const UEG_BLOCK_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens',                   emoji: '📖', qty: 13 },
  { value: 'humanas',     label: 'Ciências Humanas',             emoji: '🏛️', qty: 13 },
  { value: 'natureza',    label: 'Ciências da Natureza',         emoji: '🧪', qty: 13 },
  { value: 'matematica',  label: 'Matemática',                   emoji: '📐', qty: 13 },
  { value: 'completo',    label: 'UEG Completo',                 emoji: '🎯', qty: 52 },
]

const UNESP_BLOCK_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens e Códigos',                emoji: '📖', qty: 30 },
  { value: 'humanas',     label: 'Ciências Humanas',                    emoji: '🏛️', qty: 30 },
  { value: 'natureza',    label: 'Ciências da Natureza e Matemática',   emoji: '🧪', qty: 30 },
  { value: 'completo',    label: 'UNESP 1ª Fase Completo',              emoji: '🎯', qty: 90 },
]

const UFG_BLOCK_FORMATS = [
  { value: 'linguagens',  label: 'Linguagens',             emoji: '📖', qty: 24 },
  { value: 'humanas',     label: 'Ciências Humanas',        emoji: '🏛️', qty: 24 },
  { value: 'natureza',    label: 'Ciências da Natureza',    emoji: '🧪', qty: 24 },
  { value: 'matematica',  label: 'Matemática',              emoji: '📐', qty: 24 },
  { value: 'completo',    label: 'UFG Completo',            emoji: '🎯', qty: 96 },
]

const BANK_OPTIONS = [
  { value: 'Todas', label: 'Todas as bancas' },
  { value: 'ENEM',  label: 'ENEM' },
  { value: 'UFU',   label: 'UFU' },
  { value: 'UEG',   label: 'UEG' },
  { value: 'UFG',   label: 'UFG' },
  { value: 'UNESP', label: 'UNESP' },
] as const

const SIMULADO_YEARS = ['Todos', ...Array.from({ length: 18 }, (_, i) => String(new Date().getFullYear() - i))]

const CUSTOM_SUBJECTS = [
  { value: 'Todas',             label: 'Todas as Matérias', qty: null },
  { value: 'Matemática',        label: 'Matemática',        qty: 673  },
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
  { value: 'Francês',           label: 'Francês',           qty: null },
]

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  misto: 'Misto',
}

function formatDateTimeBR(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

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
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function normalizeMultilineText(text?: string | null) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim()
}

function deriveTestletSharedContext(groupQuestions: Question[]) {
  const normalizedContexts = groupQuestions
    .map((question) => normalizeMultilineText(question.context))
    .filter(Boolean)

  if (normalizedContexts.length === 0) {
    return { sharedContext: '', perQuestionContext: {} as Record<string, string> }
  }

  const linesPerQuestion = normalizedContexts.map((context) => context.split('\n'))
  const prefixLines: string[] = []
  const shortestLength = Math.min(...linesPerQuestion.map((lines) => lines.length))

  for (let index = 0; index < shortestLength; index += 1) {
    const candidate = linesPerQuestion[0][index]
    if (linesPerQuestion.every((lines) => lines[index] === candidate)) {
      prefixLines.push(candidate)
      continue
    }
    break
  }

  let sharedContext = prefixLines.join('\n').trim()

  if (!sharedContext && normalizedContexts.length === 1) {
    sharedContext = normalizedContexts[0]
  }

  if (!sharedContext) {
    const firstContext = normalizedContexts[0]
    const hasExplicitSharedPrompt = /responder\s+às?\s+quest(ões|ao)|texto\s+\d+|imagem\s+\d+/i.test(firstContext)
    if (hasExplicitSharedPrompt) {
      sharedContext = firstContext
    }
  }

  const perQuestionContext = Object.fromEntries(
    groupQuestions.map((question) => {
      const context = normalizeMultilineText(question.context)
      if (!context || !sharedContext) {
        return [question.id, context]
      }
      if (context === sharedContext) {
        return [question.id, '']
      }
      if (context.startsWith(`${sharedContext}\n\n`)) {
        return [question.id, context.slice(sharedContext.length).trim()]
      }
      if (context.startsWith(sharedContext)) {
        return [question.id, context.slice(sharedContext.length).trim()]
      }
      return [question.id, context]
    })
  )

  return { sharedContext, perQuestionContext }
}

function buildQuestionGroups(questions: Question[]) {
  const groups: Array<{ key: string; label: string | null; items: Array<{ q: Question; i: number }> }> = []

  questions.forEach((question, index) => {
    if (question.testlet_group_id) {
      const last = groups[groups.length - 1]
      if (last && last.key === question.testlet_group_id) {
        last.items.push({ q: question, i: index })
      } else {
        groups.push({
          key: question.testlet_group_id,
          label: `T${groups.filter((group) => group.label).length + 1}`,
          items: [{ q: question, i: index }],
        })
      }
      return
    }

    groups.push({
      key: question.id,
      label: null,
      items: [{ q: question, i: index }],
    })
  })

  return groups
}

// ── Smooth color scale — anchors: red @0 %, yellow @20–60 %, green @60 % ──────

const _C_RED    = '#ef4444'
const _C_YELLOW = '#f59e0b'
const _C_GREEN  = '#22c55e'

function _lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as const
  const [ar,ag,ab] = p(a); const [br,bg,bb] = p(b)
  return '#' + [ar+(br-ar)*t, ag+(bg-ag)*t, ab+(bb-ab)*t].map(v => Math.round(v).toString(16).padStart(2,'0')).join('')
}

function perfColorHex(pct: number): string {
  if (pct <= 15) return _C_RED
  if (pct <= 25) return _lerpHex(_C_RED,    _C_YELLOW, (pct - 15) / 10)
  if (pct <= 55) return _C_YELLOW
  if (pct <= 65) return _lerpHex(_C_YELLOW, _C_GREEN,  (pct - 55) / 10)
  return _C_GREEN
}

function scoreColor(pct: number) {
  if (pct >= 65) return 'text-green-600 dark:text-green-400'
  if (pct >= 55) return 'text-lime-600 dark:text-lime-400'
  if (pct >= 25) return 'text-amber-500 dark:text-amber-400'
  if (pct >= 15) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function scoreBarColor(pct: number)  { return perfColorHex(pct) }
function scoreRingColor(pct: number) { return perfColorHex(pct) }

const BANK_VISUALS = {
  ENEM:  { label: 'ENEM',  color: '#22c55e', bgClass: 'bg-green-500' },
  UFU:   { label: 'UFU',   color: '#f59e0b', bgClass: 'bg-amber-500' },
  UEG:   { label: 'UEG',   color: '#0f766e', bgClass: 'bg-teal-600' },
  UFG:   { label: 'UFG',   color: '#3b82f6', bgClass: 'bg-blue-500' },
  UNESP: { label: 'UNESP', color: '#7c3aed', bgClass: 'bg-violet-600' },
  Todas: { label: 'ENEM + UFU + UEG + UFG + UNESP', color: '#64748b', bgClass: 'bg-slate-500' },
} as const

function celebrationMessage(pct: number): { emoji: string; title: string; sub: string } {
  if (pct >= 80) return { emoji: '🏆', title: 'Resultado extraordinário!', sub: 'Você está no caminho certo para a aprovação.' }
  if (pct >= 70) return { emoji: '🎉', title: 'Excelente resultado!', sub: 'Continue assim e a aprovação é certa.' }
  if (pct >= 50) return { emoji: '👊', title: 'Bom progresso!', sub: 'Cada simulado te deixa mais preparado.' }
  return { emoji: '💪', title: 'Continue praticando!', sub: 'A persistência é o que separa os aprovados.' }
}

function normalizeBank(value?: string | null): BankLabel {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'UFU' || normalized === 'UFU_VEST') return 'UFU'
  if (normalized === 'UEG' || normalized === 'UEG_VEST') return 'UEG'
  if (normalized === 'UFG' || normalized === 'UFG_VEST') return 'UFG'
  if (normalized === 'ENEM' || normalized === 'INEP_ENEM' || normalized === 'ENEM_OFICIAL') return 'ENEM'
  if (normalized === 'UNESP') return 'UNESP'
  return 'Todas'
}

function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length < 6) return '#ffffff'
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const lin = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.179 ? '#1e293b' : '#ffffff'
}

function inferSessionBank(config?: SessionConfig): BankLabel {
  const explicit = normalizeBank(config?.bank)
  if (explicit !== 'Todas') return explicit

  const fmt = String(config?.format || '').toLowerCase()
  if (fmt && fmt !== 'custom') return 'ENEM'
  return 'Todas'
}

function getConfigLabel(session: SimuladoSession): string {
  const c = session.config || {}
  if (c.format && c.format !== 'custom') {
    const bankLabel = inferSessionBank(c)
    const formatList = bankLabel === 'UFU'
      ? UFU_BLOCK_FORMATS
      : bankLabel === 'UEG'
        ? UEG_BLOCK_FORMATS
        : bankLabel === 'UFG'
          ? UFG_BLOCK_FORMATS
          : bankLabel === 'UNESP'
            ? UNESP_BLOCK_FORMATS
            : ENEM_BLOCK_FORMATS
    const fmt = formatList.find(f => f.value === c.format)
    return fmt ? `${fmt.label}${bankLabel !== 'Todas' ? ` · ${bankLabel}` : ''}` : c.format
  }
  const bankLabel = inferSessionBank(c)
  const subj = c.subject || 'Todas'
  const qty = session.total_questions || c.qty || 0
  const diff = DIFFICULTIES.find(d => d.value === c.difficulty)?.label || 'Misto'
  const yearLabel = c.year ? ` · ${c.year}` : ''
  const bankSuffix = bankLabel !== 'Todas' ? ` · ${bankLabel}` : ''
  return `${subj} · ${qty}q · ${diff}${bankSuffix}${yearLabel}`
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
    .map(([subject, { correct, total }]) => ({ subject, pct: total > 0 ? Math.round((correct / total) * 100) : 0, total }))
    .sort((a, b) => b.pct - a.pct)
}

function getSessionScopedStats(session: SimuladoSession, bankFilter: BankLabel) {
  if (bankFilter === 'Todas') {
    return {
      score: session.score || 0,
      total: session.total_questions || 0,
      percentage: session.percentage ?? 0,
    }
  }

  const storedBreakdown = session.results_by_bank || session.config?.results_by_bank
  const bankResult = storedBreakdown?.[bankFilter]
  if (bankResult) {
    return {
      score: bankResult.correct,
      total: bankResult.total,
      percentage: bankResult.percentage,
    }
  }

  if (inferSessionBank(session.config) === bankFilter) {
    return {
      score: session.score || 0,
      total: session.total_questions || 0,
      percentage: session.percentage ?? 0,
    }
  }

  return null
}

function aggregateBankPerf(sessions: SimuladoSession[], bankFilter: BankLabel = 'Todas') {
  const acc: Record<string, { correct: number; total: number; sessions: number }> = {}
  for (const session of sessions) {
    const storedBreakdown = session.results_by_bank || session.config?.results_by_bank
    if (storedBreakdown && Object.keys(storedBreakdown).length > 0) {
      Object.entries(storedBreakdown).forEach(([bank, result]) => {
        if (bankFilter !== 'Todas' && bank !== bankFilter) return
        if (!acc[bank]) acc[bank] = { correct: 0, total: 0, sessions: 0 }
        acc[bank].correct += result.correct
        acc[bank].total += result.total
        acc[bank].sessions += 1
      })
      continue
    }

    const bank = inferSessionBank(session.config)
    if (bank === 'Todas') continue
    if (bankFilter !== 'Todas' && bank !== bankFilter) continue
    if (!acc[bank]) acc[bank] = { correct: 0, total: 0, sessions: 0 }
    acc[bank].correct += session.score || 0
    acc[bank].total += session.total_questions || 0
    acc[bank].sessions += 1
  }
  return Object.entries(acc).map(([bank, stats]) => ({
    bank,
    pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    sessions: stats.sessions,
    total: stats.total,
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const bank = payload[0]?.payload?.bank as keyof typeof BANK_VISUALS | undefined
  return (
    <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm shadow-lg border border-slate-700">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      {bank ? <p className="text-slate-300 text-xs mb-0.5">{BANK_VISUALS[bank]?.label ?? bank}</p> : null}
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
const START_STAGES = [
  'Preparando prova',
  'Sincronizando turma',
  'Carregando questões',
  'Finalizando ambiente',
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function SimuladoPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const shouldReduce = useReducedMotion()
  const { currentPopup, enqueuePopup, dismissCurrentPopup, holdQueueUntilRouteChange } = usePopupQueue()
  const { org } = useOrg()
  const brandTextColor = getContrastTextColor(org.brand_primary)

  const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [globalFilterOpen, setGlobalFilterOpen] = useState(true)

  // Config
  const [mode, setMode] = useState<'custom' | 'preset'>('custom')
  const [pageBankFilter, setPageBankFilter] = useState<BankLabel>('Todas')
  const [bank, setBank] = useState<BankLabel>('Todas')
  const [subject, setSubject] = useState('Todas')
  const [year, setYear] = useState('Todos')
  const [qty, setQty] = useState(10)
  const [difficulty, setDifficulty] = useState('misto')
  const [enemFormat, setEnemFormat] = useState('linguagens')
  const [presetBank, setPresetBank] = useState<PresetBank>('ENEM')
  const [availableCustomCount, setAvailableCustomCount] = useState<number | null>(null)
  const [loadingCustomCount, setLoadingCustomCount] = useState(false)

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const questionTopRef = useRef<HTMLDivElement>(null)
  const quizMainRef = useRef<HTMLElement>(null)
  const testletQuestionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastScrollAnchorRef = useRef<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasTimeLimit, setHasTimeLimit] = useState(false)
  const [questionElapsed, setQuestionElapsed] = useState(0)
  const questionStartRef = useRef<number>(Date.now())
  const scheduledEndsAtRef = useRef<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [startStage, setStartStage] = useState(0)

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const [finishResult, setFinishResult] = useState<FinishResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null)
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(new Set())

  // Auth
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [finishDialogOpen, setFinishDialogOpen] = useState(false)

  // Dashboard data
  const [sessions, setSessions] = useState<SimuladoSession[]>([])
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashVersion, setDashVersion] = useState(0)
  const [evolutionSubject, setEvolutionSubject] = useState('Todas')
  const [scheduledSimulados, setScheduledSimulados] = useState<{
    id: string;
    title: string;
    config: Record<string, unknown>;
    status: string;
    starts_at: string;
    ends_at: string | null;
    already_completed: boolean;
    modality?: 'online' | 'printed' | 'hybrid';
    location_name?: string | null;
    location_address?: string | null;
    has_printed_submission?: boolean;
    online_session?: { status: string; score: number | null; total_questions: number | null } | null;
    metrics: { total_sessions: number; unique_students: number; avg_score_pct: number | null };
  }[]>([])
  const [nowTs, setNowTs] = useState<number>(Date.now())
  const [hybridConfirmSimId, setHybridConfirmSimId] = useState<string | null>(null)

  // UI: result animation
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const lastAutosavedRef = useRef<string>('')
  const resumeAttemptedRef = useRef(false)

  // UI: timer warning animation
  const timerShakeControls = useAnimation()
  const prevTimeLeftRef = useRef<number>(Infinity)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
  const apiHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` })
  const getDraftStorageKey = (sid: string) => `simulado-draft:${slug}:${currentUserId ?? 'anon'}:${sid}`
  const getActiveSessionStorageKey = () => `simulado-active:${slug}:${currentUserId ?? 'anon'}`

  const clearSimuladoLocalDrafts = () => {
    if (!currentUserId) return
    try {
      const activeKey = getActiveSessionStorageKey()
      window.localStorage.removeItem(activeKey)
      const draftPrefix = `simulado-draft:${slug}:${currentUserId}:`
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith(draftPrefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key))
    } catch {
      // noop
    }
  }
  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const getScheduledRemainingLabel = (startsAt: string) => {
    const start = new Date(startsAt).getTime()
    const diffMs = Math.max(0, start - nowTs)
    const totalMinutes = Math.ceil(diffMs / 60000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `Restam ${days}d ${hours}h`
    if (hours > 0) return `Restam ${hours}h ${minutes}min`
    return `Restam ${minutes} min`
  }

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

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!currentUserId || step !== 'setup') return
    clearSimuladoLocalDrafts()
    resumeAttemptedRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, slug, step])

  useEffect(() => {
    if (!accessToken || !currentUserId || resumeAttemptedRef.current || step === 'quiz') return
    resumeAttemptedRef.current = true

    const resumeSession = async () => {
      let rawDraft: string | null = null
      try {
        rawDraft = window.localStorage.getItem(getActiveSessionStorageKey())
      } catch {
        rawDraft = null
      }
      if (!rawDraft) return

      let draft: {
        sessionId?: string
        currentIdx?: number
        timeLeft?: number
        savedAt?: number
        scheduledEndsAt?: string | null
      } | null = null
      try {
        draft = JSON.parse(rawDraft)
      } catch {
        draft = null
      }

      if (!draft?.sessionId) {
        try { window.localStorage.removeItem(getActiveSessionStorageKey()) } catch {}
        return
      }

      try {
        const res = await fetch(`${apiUrl}/api/simulado/${draft.sessionId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) {
          try {
            window.localStorage.removeItem(getActiveSessionStorageKey())
            window.localStorage.removeItem(getDraftStorageKey(draft.sessionId))
          } catch {}
          return
        }

        const sessionData = await res.json()
        if (sessionData?.status === 'completed') {
          try {
            window.localStorage.removeItem(getActiveSessionStorageKey())
            window.localStorage.removeItem(getDraftStorageKey(draft.sessionId))
          } catch {}
          return
        }

        const restoredQuestions = Array.isArray(sessionData?.questions) ? sessionData.questions : []
        const savedAnswers = sessionData?.answers && typeof sessionData.answers === 'object' ? sessionData.answers : {}
        const localDraftAnswers = (() => {
          try {
            const raw = window.localStorage.getItem(getDraftStorageKey(draft!.sessionId!))
            return raw ? JSON.parse(raw) as Record<string, string> : {}
          } catch {
            return {}
          }
        })()
        const restoredAnswers = { ...savedAnswers, ...localDraftAnswers }
        const restoredIdx = Math.min(
          Math.max(Number.isFinite(draft.currentIdx) ? Number(draft.currentIdx) : 0, 0),
          Math.max(restoredQuestions.length - 1, 0),
        )

        const restoredScheduledEndsAt = draft.scheduledEndsAt ? new Date(draft.scheduledEndsAt) : null
        scheduledEndsAtRef.current = restoredScheduledEndsAt && !Number.isNaN(restoredScheduledEndsAt.getTime())
          ? restoredScheduledEndsAt
          : null

        const elapsedSinceSave = draft.savedAt ? Math.max(0, Math.floor((Date.now() - draft.savedAt) / 1000)) : 0
        let restoredTimeLeft = Math.max(0, Number(draft.timeLeft ?? 0) - elapsedSinceSave)
        if (scheduledEndsAtRef.current) {
          restoredTimeLeft = Math.max(0, Math.floor((scheduledEndsAtRef.current.getTime() - Date.now()) / 1000))
        }
        if (restoredTimeLeft <= 0) {
          restoredTimeLeft = restoredQuestions.length * 3 * 60
        }

        const startedAtMs = sessionData?.started_at ? new Date(sessionData.started_at).getTime() : Date.now()
        startTimeRef.current = Number.isNaN(startedAtMs) ? Date.now() : startedAtMs
        lastAutosavedRef.current = JSON.stringify(restoredAnswers)
        setSessionId(draft.sessionId)
        setQuestions(restoredQuestions)
        setUserAnswers(restoredAnswers)
        setCurrentIdx(restoredIdx)
        setFinishResult(null)
        setReportedQuestionIds(new Set())
        setHasTimeLimit(Boolean(sessionData?.config?.time_limit_secs))
        setTimeLeft(restoredTimeLeft)
        prevTimeLeftRef.current = restoredTimeLeft
        setStep('quiz')

        toast.info('Sessão retomada', {
          description: 'Você voltou para a mesma questão do simulado em andamento.',
        })
      } catch {
        try { window.localStorage.removeItem(getActiveSessionStorageKey()) } catch {}
      }
    }

    void resumeSession()
  }, [accessToken, currentUserId, apiUrl, step])

  // ── Dashboard fetch ──
  useEffect(() => {
    if (!accessToken) return
    const fetchDashboard = async () => {
      setDashLoading(true)
      try {
        const supabase = createClient()
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const token = freshSession?.access_token || accessToken
        const [histRes, rankRes, scheduledRes] = await Promise.all([
          fetch(`${apiUrl}/api/simulado/history?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/simulado/ranking?bank=${pageBankFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/partners/${slug}/scheduled-simulados`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const histData = histRes.ok ? await histRes.json() : { sessions: [] }
        const rankJson = rankRes.ok ? await rankRes.json() : { ranking: [], user_position: null }
        setSessions(histData.sessions || [])
        setRankingData(rankJson)
        if (scheduledRes.ok) {
          const scheduledData = await scheduledRes.json()
          setScheduledSimulados(
            (scheduledData.scheduled_simulados ?? []).filter(
              (s: { status: string }) => s.status === 'active' || s.status === 'scheduled'
            )
          )
        }
      } catch {
        setSessions([]); setRankingData(null)
      } finally {
        setDashLoading(false)
      }
    }
    fetchDashboard()
  }, [accessToken, apiUrl, dashVersion, pageBankFilter])

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

  const currentQuestion = questions[currentIdx]
  const questionGroups = useMemo(() => buildQuestionGroups(questions), [questions])
  const currentGroup = useMemo(
    () => questionGroups.find((group) => group.items.some(({ i }) => i === currentIdx)) ?? null,
    [currentIdx, questionGroups],
  )
  const currentTestletInfo = (() => {
    if (!currentQuestion?.testlet_group_id) return undefined
    const groupItems = currentGroup?.items ?? []
    const position = groupItems.findIndex(({ q }) => q.id === currentQuestion.id) + 1
    return { position, total: groupItems.length }
  })()
  const currentGroupQuestions = useMemo(
    () => currentGroup?.items.map(({ q }) => q) ?? (currentQuestion ? [currentQuestion] : []),
    [currentGroup, currentQuestion],
  )
  const currentGroupStartIdx = currentGroup?.items[0]?.i ?? currentIdx
  const currentGroupEndIdx = currentGroup?.items[currentGroup.items.length - 1]?.i ?? currentIdx
  const isCurrentGroupTestlet = Boolean(currentGroup?.label && currentGroupQuestions.length > 1)
  const currentGroupContextQuestion = currentGroupQuestions[0]
  const currentGroupContextData = deriveTestletSharedContext(currentGroupQuestions)
  const currentGroupSharedContext = currentGroupContextData.sharedContext
  const currentGroupQuestionContexts = currentGroupContextData.perQuestionContext

  // ── Scroll to top of question on navigate ──
  useEffect(() => {
    if (step !== 'quiz') return
    const anchorKey = isCurrentGroupTestlet ? `group-${currentGroupStartIdx}` : `question-${currentIdx}`
    if (lastScrollAnchorRef.current === anchorKey) return
    lastScrollAnchorRef.current = anchorKey
    questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentGroupStartIdx, currentIdx, isCurrentGroupTestlet, step])

  useEffect(() => {
    if (step !== 'quiz' || !isCurrentGroupTestlet || !quizMainRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const topEntry = visible[0]
        if (!topEntry) return
        const nextId = topEntry.target.getAttribute('data-question-id')
        if (!nextId) return
        const nextIndex = questions.findIndex((q) => q.id === nextId)
        if (nextIndex >= 0 && nextIndex !== currentIdx) {
          setCurrentIdx(nextIndex)
        }
      },
      {
        root: quizMainRef.current,
        threshold: [0.35, 0.6, 0.85],
      }
    )

    currentGroupQuestions.forEach((question) => {
      const node = testletQuestionRefs.current[question.id]
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [currentIdx, currentGroupQuestions, isCurrentGroupTestlet, questions, step])

  // ── Per-question elapsed timer (resets on question change) ──
  useEffect(() => {
    if (step !== 'quiz') return
    questionStartRef.current = Date.now()
    setQuestionElapsed(0)
    const id = setInterval(() => {
      setQuestionElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
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
  const pageFilteredSessions = pageBankFilter === 'Todas'
    ? sessions
    : sessions.filter((session) => {
        const storedBreakdown = session.results_by_bank || session.config?.results_by_bank
        if (storedBreakdown && Object.keys(storedBreakdown).length > 0) {
          return storedBreakdown[pageBankFilter] != null
        }
        return inferSessionBank(session.config) === pageBankFilter
      })
  const totalSimuladosFiltered = pageFilteredSessions.length
  const scopedSessionStats = pageFilteredSessions
    .map((session) => ({ session, scoped: getSessionScopedStats(session, pageBankFilter) }))
    .filter((entry): entry is { session: SimuladoSession; scoped: { score: number; total: number; percentage: number } } => entry.scoped != null)
  const avgPct = scopedSessionStats.length > 0
    ? Math.round(scopedSessionStats.reduce((sum, entry) => sum + entry.scoped.percentage, 0) / scopedSessionStats.length)
    : 0
  const bestPct = scopedSessionStats.length > 0
    ? Math.max(...scopedSessionStats.map((entry) => entry.scoped.percentage))
    : 0
  const rankingPos = rankingData?.user_position ?? null
  const nextTarget = (() => {
    const inc = bestPct < 50 ? 10 : bestPct <= 80 ? 5 : 3
    return Math.min(100, bestPct + inc)
  })()
  const heroSubtitle = totalSimuladosFiltered === 0
    ? 'Faça seu primeiro simulado e descubra seu nível'
    : `Sua próxima meta: superar ${nextTarget}% em ${pageBankFilter === 'Todas' ? 'ENEM, UFU, UEG e UNESP' : pageBankFilter}`

  const simuladoCtxHint = mode === 'preset'
    ? (() => {
        const presetFormats = presetBank === 'UFU'
          ? UFU_BLOCK_FORMATS
          : presetBank === 'UEG'
            ? UEG_BLOCK_FORMATS
            : presetBank === 'UNESP'
              ? UNESP_BLOCK_FORMATS
              : ENEM_BLOCK_FORMATS
        const fmt = presetFormats.find(f => f.value === enemFormat)
        const q = fmt?.qty ?? 45
        return `${presetBank} · ~${Math.round(q * 1.5)} min · ${q} questões${presetBank === 'ENEM' ? ' · TRI' : ''}`
      })()
    : `${bank === 'Todas' ? 'ENEM + UFU + UEG + UNESP' : bank} · ~${qty * 3} min · ${qty} questões${bank === 'ENEM' ? ' · TRI' : ''}`

  // ── Chart data ──
  const subjectOptions = ['Todas', ...Array.from(new Set(pageFilteredSessions.flatMap(s => Object.keys(s.results_by_subject || {}))))]
  const filteredSessions = evolutionSubject === 'Todas' ? pageFilteredSessions : pageFilteredSessions.filter(s => s.results_by_subject?.[evolutionSubject] != null)
  const evolutionData = [...filteredSessions]
    .reverse()
    .map((session, i) => {
      const scoped = getSessionScopedStats(session, pageBankFilter)
      if (!scoped) return null
      return {
        name: `#${i + 1}`,
        pct: scoped.percentage,
        date: formatDate(session.started_at),
        bank: pageBankFilter === 'Todas' ? inferSessionBank(session.config) : pageBankFilter,
      }
    })
    .filter((item): item is { name: string; pct: number; date: string; bank: BankLabel } => item != null)
  const subjectPerfData = aggregateSubjectPerf(pageFilteredSessions)
    .map((entry) => ({
      ...entry,
      fill: pageBankFilter === 'Todas' ? BANK_VISUALS.Todas.color : BANK_VISUALS[pageBankFilter].color,
    }))
  const bankPerfData = aggregateBankPerf(pageFilteredSessions, pageBankFilter)
  const customCountInsufficient = mode === 'custom' && availableCustomCount !== null && availableCustomCount < qty
  const presetFormats = presetBank === 'UFU'
    ? UFU_BLOCK_FORMATS
    : presetBank === 'UEG'
      ? UEG_BLOCK_FORMATS
      : presetBank === 'UNESP'
        ? UNESP_BLOCK_FORMATS
        : ENEM_BLOCK_FORMATS
  const evolutionLegend = pageBankFilter === 'Todas'
    ? (['ENEM', 'UFU', 'UEG', 'UNESP', 'Todas'] as const)
    : ([pageBankFilter] as const)
  const subjectLegend = pageBankFilter === 'Todas'
    ? (['Todas'] as const)
    : ([pageBankFilter] as const)

  useEffect(() => {
    if (!subjectOptions.includes(evolutionSubject)) {
      setEvolutionSubject('Todas')
    }
  }, [subjectOptions, evolutionSubject])

  useEffect(() => {
    if (!presetFormats.some((format) => format.value === enemFormat)) {
      setEnemFormat(presetFormats[0]?.value ?? 'linguagens')
    }
  }, [presetFormats, enemFormat])

  // ── Handlers ──
  const startSimulado = async (scheduledId?: string) => {
    if (!accessToken) return
    setLoading(true)
    setStartStage(0)
    const stageTimers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setStartStage(1), 450),
      setTimeout(() => setStartStage(2), 1200),
      setTimeout(() => setStartStage(3), 2100),
    ]
    try {
      const body: Record<string, unknown> = { difficulty }
      if (year !== 'Todos') body.year = Number(year)
      if (mode === 'custom') {
        body.format = 'custom'
        body.qty = qty
        body.bank = bank
        if (subject !== 'Todas') body.subject = subject
      } else {
        body.format = enemFormat
        body.bank = presetBank
      }
      if (scheduledId) body.scheduled_simulado_id = scheduledId
      const res = await fetch(`${apiUrl}/api/simulado/start`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (res.status === 403) {
        if (data?.code === 'SCHEDULED_SIMULADO_NOT_STARTED') {
          toast.warning('Simulado ainda não começou', {
            description: 'Aguarde o horário de início definido pela turma.',
          })
          return
        }
        if (data?.code === 'SCHEDULED_SIMULADO_ENDED') {
          toast.warning('Simulado encerrado', {
            description: 'O período de realização desse simulado já foi encerrado.',
          })
          return
        }
        if (data?.code === 'SCHEDULED_SIMULADO_RETRY_DISABLED') {
          toast.warning('Refazer indisponível', {
            description: 'Este simulado permite apenas uma tentativa por aluno.',
          })
          return
        }
        toast.error('Acesso indisponível', { description: 'Seu acesso ao simulado está suspenso. Entre em contato com o administrador da sua organização.' }); setShowConfigModal(false); return
      }
      if (res.status === 404) { toast.error('Nenhuma questão encontrada', { description: 'Tente reduzir a quantidade ou mudar a dificuldade para "Misto".', duration: 6000 }); return }
      if (!res.ok) { toast.error('Erro ao iniciar simulado', { description: data.error || 'Tente novamente em instantes.' }); return }
      setShowConfigModal(false)
      setSessionId(data.session_id)
      setQuestions(data.questions)
      setHasTimeLimit(!!data.time_limit_secs)
      scheduledEndsAtRef.current = null

      let initialTime: number
      if (data.time_limit_secs) {
        initialTime = data.time_limit_secs
      } else if (scheduledId) {
        const sel = scheduledSimulados.find(s => s.id === scheduledId)
        if (sel?.ends_at) {
          scheduledEndsAtRef.current = new Date(sel.ends_at)
          initialTime = Math.max(0, Math.floor((new Date(sel.ends_at).getTime() - Date.now()) / 1000))
        } else {
          initialTime = data.questions.length * 3 * 60
        }
      } else {
        initialTime = data.questions.length * 3 * 60
      }

      setTimeLeft(initialTime)
      startTimeRef.current = Date.now()
      const restoredAnswers = (() => {
        const serverAnswers = data.saved_answers ?? {}
        if (!data.session_id) return serverAnswers
        try {
          const raw = window.localStorage.getItem(getDraftStorageKey(data.session_id))
          if (!raw) return serverAnswers
          const localAnswers = JSON.parse(raw) as Record<string, string>
          return { ...serverAnswers, ...localAnswers }
        } catch {
          return serverAnswers
        }
      })()
      lastAutosavedRef.current = JSON.stringify(restoredAnswers)
      setUserAnswers(restoredAnswers); setCurrentIdx(0); setFinishResult(null)
      setReportedQuestionIds(new Set())
      prevTimeLeftRef.current = initialTime
      if (data.resumed) {
        toast.info('Sessão retomada', {
          description: 'Reabrimos sua tentativa em andamento desse simulado agendado.',
        })
      }
      setStep('quiz')
    } catch { toast.error('Erro de conexão', { description: 'Não foi possível conectar ao servidor.' }) }
    finally {
      stageTimers.forEach((t) => clearTimeout(t))
      setLoading(false)
      setStartStage(0)
    }
  }

  const submitFinish = async (answers: Record<string, string>) => {
    if (!sessionId || !accessToken || submitting) return
    setSubmitting(true)
    let finishSucceeded = false
    let finishBlockedByMinAnswers = false
    try {
      const supabase = createClient()
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const token = freshSession?.access_token || accessToken
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
      let lastErrorMessage = 'Não foi possível salvar o simulado no servidor. Tente enviar novamente.'
      for (let attempt = 0; attempt < 3 && !finishSucceeded; attempt += 1) {
        const res = await fetch(`${apiUrl}/api/simulado/${sessionId}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ answers, time_taken_secs: timeTaken }) })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          finishSucceeded = true
          try { window.localStorage.removeItem(getDraftStorageKey(sessionId)) } catch {}
          try { window.localStorage.removeItem(getActiveSessionStorageKey()) } catch {}
          setFinishResult({ ...data, session_id: sessionId })
          console.log('finish response:', data)
          if (data.gamification?.shield_awarded) {
            sessionStorage.setItem('shield_earned_pending', '1')
          }
          if (data.streak_updated && (data.new_streak ?? 0) >= 1) {
            enqueuePopup({
              kind: 'streak',
              routeScope: 'dashboard',
              streak: data.new_streak,
              dedupeKey: `streak:${data.new_streak}`,
            })
          }
          if (data.gamification?.points_awarded > 0) {
            let rankPosition: number | null = null
            let pointsToTop3: number | null = null
            try {
              const summaryRes = await fetch(`${apiUrl}/api/partner/gamification/summary`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              })
              if (summaryRes.ok) {
                const summaryData = await summaryRes.json()
                rankPosition = summaryData.rank_position
                pointsToTop3 = summaryData.points_to_top3
              }
            } catch { /* non-critical */ }
            enqueuePopup({
              kind: 'simulado_reward',
              routeScope: 'simulado',
              pointsAwarded: data.gamification.points_awarded,
              newMonthlyPoints: data.gamification.new_monthly_points,
              rankPosition,
              pointsToTop3,
              slug,
              dedupeKey: `simulado-reward:${sessionId}`,
            })
          }
          break
        }
        if (data?.code === 'MIN_ANSWERS_NOT_REACHED') {
          toast.error('Mínimo de respostas não atingido', {
            description: `Responda pelo menos ${data.minimum_required ?? '50%'} de ${data.total_questions ?? questions.length} questões para finalizar.`,
          })
          finishBlockedByMinAnswers = true
          break
        }
        lastErrorMessage = data?.error || lastErrorMessage
        if (res.status < 500 && res.status !== 409) break
        if (attempt < 2) await wait(700 * (attempt + 1))
      }
      if (!finishSucceeded && !finishBlockedByMinAnswers) {
        toast.error('Falha ao finalizar simulado', { description: lastErrorMessage })
      }
    } catch {
      toast.error('Falha ao finalizar simulado', { description: 'Não foi possível salvar o simulado no servidor. Tente enviar novamente.' })
    }
    finally {
      setSubmitting(false)
      if (finishSucceeded) setStep('result')
    }
  }

  const handleTimeExpired = () => submitFinish(userAnswers)
  const confirmFinish = () => { setFinishDialogOpen(false); submitFinish(userAnswers) }
  const handleSelectOption = (questionId: string, letter: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: letter }))
  }
  const resetSimulado = (openModal = false) => {
    setStep('setup'); setQuestions([]); setCurrentIdx(0); setUserAnswers({}); setTimeLeft(0)
    setHasTimeLimit(false); setQuestionElapsed(0); scheduledEndsAtRef.current = null
    setSessionId(null); setFinishResult(null); setDashVersion(v => v + 1)
    lastAutosavedRef.current = ''
    try {
      if (currentUserId) window.localStorage.removeItem(getActiveSessionStorageKey())
    } catch {}
    setReportedQuestionIds(new Set()); setReportDialogOpen(false); setReportQuestionId(null)
    if (openModal) setShowConfigModal(true)
  }

  // ── Fallback score ──
  const localScore = questions.filter(q => userAnswers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase()).length
  const displayScore = finishResult?.score ?? localScore
  const displayTotal = finishResult?.total ?? questions.length
  const displayPct = finishResult?.percentage ?? Math.round((localScore / Math.max(questions.length, 1)) * 100)
  const weightedResult = finishResult?.weighted_result
  const hasWeighted = Boolean(weightedResult?.applied && weightedResult?.weighted_percentage != null)
  const noteFromPct = (pct: number) => Number((pct * 10).toFixed(1))
  const isUegPointsMode = weightedResult?.mode === 'ueg_objective_points'
  const weightedNote = hasWeighted
    ? (isUegPointsMode
      ? Number((weightedResult?.weighted_points ?? 0).toFixed(1))
      : noteFromPct(weightedResult!.weighted_percentage ?? displayPct))
    : null
  const rawNote = isUegPointsMode
    ? Number((((weightedResult?.raw_percentage ?? displayPct) / 100) * (weightedResult?.weighted_max_points ?? 130)).toFixed(1))
    : noteFromPct(weightedResult?.raw_percentage ?? displayPct)
  const resultBank = normalizeBank(finishResult?.config?.bank as string | undefined)
  const showTri = Boolean(finishResult?.tri_score != null && resultBank === 'ENEM')
  const triValue = finishResult?.tri_score ?? null
  const annulledCount = finishResult?.annulled_questions_count ?? reportedQuestionIds.size
  const celebration = celebrationMessage(displayPct)
  const isTimeCritical = timeLeft > 0 && timeLeft <= 300

  const goToQuestionIndex = (nextIndex: number) => {
    setCurrentIdx(Math.max(0, Math.min(nextIndex, questions.length - 1)))
  }

  const goToPreviousGroup = () => {
    if (currentGroupStartIdx <= 0) return
    const currentGroupIndex = questionGroups.findIndex((group) => group.items.some(({ i }) => i === currentIdx))
    const previousGroup = currentGroupIndex > 0 ? questionGroups[currentGroupIndex - 1] : null
    goToQuestionIndex(previousGroup?.items[0]?.i ?? currentGroupStartIdx - 1)
  }

  const goToNextGroup = () => {
    if (currentGroupEndIdx >= questions.length - 1) return
    goToQuestionIndex(currentGroupEndIdx + 1)
  }

  useEffect(() => {
    if (!accessToken || !showConfigModal || mode !== 'custom') return

    const controller = new AbortController()
    const fetchAvailability = async () => {
      setLoadingCustomCount(true)
      try {
        const params = new URLSearchParams({ page: '1', limit: '1', tab: 'all' })
        if (subject !== 'Todas') params.append('subject', subject)
        if (bank !== 'Todas') params.append('bank', bank)
        if (year !== 'Todos') params.append('year', year)
        if (difficulty !== 'misto') {
          const difficultyLabel = DIFFICULTIES.find((item) => item.value === difficulty)?.label
          if (difficultyLabel) params.append('difficulty', difficultyLabel)
        }

        const res = await fetch(`/api/proxy/questions/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          setAvailableCustomCount(null)
          return
        }
        const data = await res.json()
        setAvailableCustomCount(typeof data?.total === 'number' ? data.total : null)
      } catch {
        if (!controller.signal.aborted) setAvailableCustomCount(null)
      } finally {
        if (!controller.signal.aborted) setLoadingCustomCount(false)
      }
    }

    fetchAvailability()
    return () => controller.abort()
  }, [accessToken, showConfigModal, mode, subject, bank, year, difficulty])

  useEffect(() => {
    if (!showConfigModal) return
    if (mode === 'custom') {
      setBank(pageBankFilter)
      return
    }
    if (pageBankFilter === 'ENEM' || pageBankFilter === 'UFU' || pageBankFilter === 'UEG' || pageBankFilter === 'UNESP') {
      setPresetBank(pageBankFilter)
    }
  }, [showConfigModal, mode, pageBankFilter])

  useEffect(() => {
    if (step !== 'quiz' || !sessionId || !accessToken) return
    if (Object.keys(userAnswers).length === 0) return

    const serialized = JSON.stringify(userAnswers)
    if (serialized === lastAutosavedRef.current) return

    try {
      window.localStorage.setItem(getDraftStorageKey(sessionId), serialized)
    } catch {
      // Ignore local quota/storage issues.
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const token = freshSession?.access_token || accessToken
        const res = await fetch(`${apiUrl}/api/simulado/${sessionId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answers: userAnswers }),
        })
        if (res.ok) lastAutosavedRef.current = serialized
      } catch {
        // Best-effort autosave; o finish continua sendo a confirmação final.
      }
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [step, sessionId, accessToken, userAnswers, apiUrl, slug, currentUserId])

  useEffect(() => {
    if (step !== 'quiz' || !sessionId || !currentUserId) return
    try {
      window.localStorage.setItem(getActiveSessionStorageKey(), JSON.stringify({
        sessionId,
        currentIdx,
        timeLeft,
        savedAt: Date.now(),
        scheduledEndsAt: scheduledEndsAtRef.current?.toISOString() ?? null,
      }))
    } catch {
      // Ignore storage failures; backend autosave remains the primary fallback.
    }
  }, [step, sessionId, currentUserId, currentIdx, timeLeft, slug])

  useEffect(() => {
    if (step !== 'quiz' || !sessionId || !accessToken) return

    const flushProgress = async () => {
      if (Object.keys(userAnswers).length === 0) return
      try {
        const supabase = createClient()
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const token = freshSession?.access_token || accessToken
        void fetch(`${apiUrl}/api/simulado/${sessionId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answers: userAnswers }),
          keepalive: true,
        }).catch(() => undefined)
      } catch {
        // Ignore token refresh errors on page unload.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushProgress()
    }

    window.addEventListener('pagehide', flushProgress)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushProgress)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [step, sessionId, accessToken, userAnswers, apiUrl])

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        questionId={reportQuestionId || ''}
        authToken={accessToken}
        questionSnapshot={questions.find((q) => q.id === reportQuestionId) ?? null}
        onSuccess={() => {
          if (!reportQuestionId) return
          setReportedQuestionIds(prev => new Set(prev).add(reportQuestionId))
          setReportDialogOpen(false)
          setReportQuestionId(null)
          toast.success('Questão reportada. Ela será anulada no resultado final.')
        }}
      />

      {/* ── Finish dialog ── */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Finalizar simulado?</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {questions.length - Object.keys(userAnswers).length > 0
                ? `Você tem ${questions.length - Object.keys(userAnswers).length} ${questions.length - Object.keys(userAnswers).length === 1 ? 'questão' : 'questões'} sem resposta. Ao finalizar, não será possível voltar.`
                : 'Todas as questões foram respondidas. Deseja entregar?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button onClick={() => setFinishDialogOpen(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
              Continuar respondendo
            </button>
            <button onClick={confirmFinish} disabled={submitting}
              className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-70 cursor-pointer"
              style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
              {submitting ? 'Enviando...' : 'Entregar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Config modal ── */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <Timer className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              Configurar Simulado
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">Escolha o formato e as opções do seu simulado.</DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:grid-cols-2">
            {(['custom', 'preset'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition-all cursor-pointer ${mode === m ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {m === 'custom' ? 'Personalizado' : 'Blocos por Banca'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {mode === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Banca</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 focus:ring-2 font-semibold text-slate-700 dark:text-slate-200 appearance-none pr-10 cursor-pointer outline-none"
                      style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      value={bank}
                      onChange={e => setBank(e.target.value as BankLabel)}
                    >
                      {BANK_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Matéria</label>
                  <div className="relative">
                    <select className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 focus:ring-2 font-semibold text-slate-700 dark:text-slate-200 appearance-none pr-10 cursor-pointer outline-none"
                      style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      value={subject} onChange={e => setSubject(e.target.value)}>
                      {CUSTOM_SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quantidade</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[5, 10, 15, 30, 45, 90, 180].map(val => (
                      <button key={val} onClick={() => setQty(val)}
                        className={`p-2.5 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${qty === val ? 'text-white border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 border-slate-200 dark:border-slate-700'}`}
                        style={qty === val ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' } : {}}>
                        {val}
                      </button>
                    ))}
                  </div>
                  {loadingCustomCount ? (
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Verificando disponibilidade real para os filtros selecionados...</p>
                  ) : availableCustomCount != null ? (
                    <p className={`mt-1.5 text-xs ${customCountInsufficient ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {customCountInsufficient
                        ? `Há ${availableCustomCount} questões disponíveis para essa combinação. Reduza a quantidade ou alivie os filtros.`
                        : `${availableCustomCount} questões disponíveis para essa combinação.`}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Banca do Bloco</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ENEM', 'UFU', 'UEG', 'UNESP'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setPresetBank(option)}
                        className={`min-h-11 rounded-xl border-2 p-2.5 text-sm font-bold transition-all cursor-pointer ${
                          presetBank === option
                            ? 'border-transparent'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 border-slate-200 dark:border-slate-700'
                        }`}
                        style={presetBank === option ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: brandTextColor } : {}}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {presetBank === 'UFU' || presetBank === 'UEG' || presetBank === 'UNESP' ? 'Bloco da Prova' : 'Área de Conhecimento'}
                </label>
                <div className="space-y-2">
                  {presetFormats.map(f => (
                    <button key={f.value} onClick={() => setEnemFormat(f.value)}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all cursor-pointer ${enemFormat === f.value ? 'border-transparent' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}
                      style={enemFormat === f.value ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: brandTextColor } : {}}>
                      <span className="min-w-0 break-words">{f.emoji} {f.label}</span>
                      <span className="text-xs font-normal" style={enemFormat === f.value ? { color: brandTextColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' } : { color: '#94a3b8' }}>{f.qty}q</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ano</label>
              <div className="relative">
                <select
                  className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 focus:ring-2 font-semibold text-slate-700 dark:text-slate-200 appearance-none pr-10 cursor-pointer outline-none"
                  style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                  value={year}
                  onChange={e => setYear(e.target.value)}
                >
                  {SIMULADO_YEARS.map(value => <option key={value} value={value}>{value === 'Todos' ? 'Todos os anos' : value}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Dificuldade</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`min-h-11 rounded-xl border-2 p-2.5 text-xs font-bold transition-all cursor-pointer ${difficulty === d.value ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <button onClick={() => setShowConfigModal(false)}
              className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
              Cancelar
            </button>
            <button onClick={() => startSimulado()} disabled={loading || !accessToken || customCountInsufficient}
              aria-disabled={loading || !accessToken || customCountInsufficient}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:opacity-70 cursor-pointer"
              style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
              {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {START_STAGES[startStage] ?? 'Preparando...'}</>) : (<><Play size={16} /> Iniciar Simulado</>)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════ SETUP ════════════════════════════════════ */}
      {step === 'setup' && (
        <div className="min-h-dvh bg-[#F5F5F7] dark:bg-slate-950/50">
          {loading && (
            <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px] flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{START_STAGES[startStage] ?? 'Preparando prova'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Isso pode levar alguns segundos.</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((startStage + 1) / START_STAGES.length) * 100)}%`, background: 'var(--brand-primary)' }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {START_STAGES.map((stage, idx) => (
                    <div key={stage} className="flex items-center justify-between text-xs">
                      <span className={`${idx <= startStage ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>{stage}</span>
                      <span className={`${idx < startStage ? 'text-emerald-600 dark:text-emerald-400' : idx === startStage ? 'text-[var(--brand-primary)]' : 'text-slate-300 dark:text-slate-600'}`}>
                        {idx < startStage ? 'Concluído' : idx === startStage ? 'Em andamento' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <Link href={`/partners/${slug}/student/dashboard`} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
                    <ChevronLeft size={14} /> Dashboard
                  </Link>
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Simulados</h1>
                <div className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  {dashLoading ? <Skeleton className="h-4 w-64" /> : heroSubtitle}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link href={`/partners/${slug}/student/simulado/historico`}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex-none">
                  <History size={16} /> Histórico
                </Link>
                <div className="flex flex-col gap-0.5 flex-1 sm:flex-none">
                  <button onClick={() => setShowConfigModal(true)}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold shadow-sm transition-all cursor-pointer"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                    <Plus size={18} /> Novo Simulado
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Header — clicável para expandir/colapsar */}
              <button
                onClick={() => setGlobalFilterOpen(v => !v)}
                className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Filtro Global</p>
                  {pageBankFilter !== 'Todas' && (
                    <span
                      className="truncate rounded-lg border px-2.5 py-1 text-xs font-bold"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)', borderColor: 'color-mix(in srgb, var(--brand-primary) 25%, transparent)' }}
                    >
                      {pageBankFilter}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${globalFilterOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Opções colapsáveis */}
              <AnimatePresence initial={false}>
                {globalFilterOpen && (
                  <motion.div
                    key="global-filter-options"
                    initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        Aplicado a cards, gráficos, histórico recente, ranking e configuração inicial do simulado.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {BANK_OPTIONS.map((option) => {
                          const isActive = pageBankFilter === option.value
                          return (
                            <button
                              key={option.value}
                              onClick={() => setPageBankFilter(option.value)}
                              className={`relative min-h-11 rounded-xl border-2 px-3 py-3 text-center text-sm font-bold transition-all cursor-pointer select-none active:scale-[0.97] ${
                                isActive
                                  ? 'border-transparent shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                              style={isActive ? { background: 'var(--brand-primary)', color: brandTextColor, borderColor: 'var(--brand-primary)' } : {}}
                            >
                              {option.label}
                              {isActive && (
                                <span
                                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900"
                                  style={{ background: 'var(--brand-primary)' }}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Simulados da Turma */}
            {scheduledSimulados.length > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Simulados da Turma
                </p>
                {/* Modal de confirmação hybrid */}
                <AnimatePresence>
                  {hybridConfirmSimId && (
                    <motion.div
                      key="hybrid-modal"
                      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setHybridConfirmSimId(null)}
                    >
                      <motion.div
                        className="max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                        initial={{ scale: 0.94, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.94, opacity: 0, y: 12 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-base font-extrabold text-slate-900 dark:text-white mb-2">Atenção</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Se você já realizou ou realizará este simulado presencialmente, o resultado
                          da versão presencial prevalecerá sobre o online. Deseja continuar mesmo assim?
                        </p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => setHybridConfirmSimId(null)}
                            className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => { const id = hybridConfirmSimId; setHybridConfirmSimId(null); startSimulado(id!); }}
                            className="min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-primary)', color: brandTextColor }}
                          >
                            Iniciar mesmo assim
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {scheduledSimulados.map((sim) => {
                  const isPrinted = sim.modality === 'printed'
                  const isHybrid  = sim.modality === 'hybrid'
                  const isPast    = sim.ends_at ? new Date(sim.ends_at).getTime() <= nowTs : false
                  const hasPrintedSub = Boolean(sim.has_printed_submission)

                  // ── badges ─────────────────────────────────────────────────
                  let badge: React.ReactNode = null
                  let borderCls = 'border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-slate-900'

                  if (isPrinted || isHybrid) {
                    if (hasPrintedSub) {
                      badge = <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Corrigido pelo Professor</span>
                      borderCls = 'border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-slate-900'
                    } else if (isPast) {
                      badge = <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Aguardando Correção</span>
                      borderCls = 'border-amber-300/70 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5'
                    } else {
                      badge = <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isHybrid ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'}`}>{isHybrid ? 'Híbrido' : 'Simulado Presencial'}</span>
                      borderCls = isHybrid
                        ? 'border-indigo-300/60 dark:border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-500/5'
                        : 'border-violet-300/60 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-500/5'
                    }
                  } else {
                    badge = <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sim.status === 'scheduled' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>{sim.status === 'scheduled' ? 'Agendado' : 'Ativo'}</span>
                    borderCls = sim.status === 'scheduled'
                      ? 'border-amber-300/70 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5'
                      : 'border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-slate-900'
                  }

                  // ── CTA ────────────────────────────────────────────────────
                  let cta: React.ReactNode = null
                  if (hasPrintedSub) {
                    // printed_submission existe → sempre mostrar "Ver Correção"
                    // (para printed E hybrid)
                    cta = (
                      <a
                        href={`/partners/${slug}/student/exam-results/${sim.id}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 sm:w-auto sm:shrink-0"
                        style={{ backgroundColor: 'var(--brand-primary)', color: brandTextColor }}
                      >
                        Ver Correção
                      </a>
                    )
                  } else if (isPrinted) {
                    // printed puro sem submission → sem botão
                    cta = null
                  } else if (isHybrid) {
                    // hybrid sem submission
                    const onlineCompleted = sim.online_session?.status === 'completed'
                    if (onlineCompleted) {
                      // Estado 3: resultado online disponível
                      cta = (
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-slate-400 mb-0.5">Online</p>
                          <p className="text-sm font-extrabold tabular-nums" style={{ color: (sim.online_session!.score ?? 0) / (sim.online_session!.total_questions ?? 1) >= 0.5 ? '#22c55e' : '#ef4444' }}>
                            {sim.online_session!.score ?? 0}/{sim.online_session!.total_questions ?? 0}
                          </p>
                        </div>
                      )
                    } else if (!isPast) {
                      // Estado 1: pode iniciar online
                      cta = (
                        <button
                          type="button"
                          onClick={() => setHybridConfirmSimId(sim.id)}
                          disabled={loading || sim.status === 'scheduled'}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer sm:w-auto sm:shrink-0"
                          style={{ backgroundColor: 'var(--brand-primary)', color: brandTextColor }}
                        >
                          {sim.status === 'scheduled' ? 'Aguardando início' : 'Iniciar Online'}
                        </button>
                      )
                    } else {
                      // Estado 2: passado, sem submission, sem online → aguardando correção (badge já cuida)
                      cta = null
                    }
                  } else {
                    // online puro — comportamento original
                    cta = (
                      <button
                        type="button"
                        onClick={() => startSimulado(sim.id)}
                        disabled={loading || sim.status === 'scheduled' || (sim.already_completed && sim.config?.allow_retry === false)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer sm:w-auto sm:shrink-0"
                        style={{ backgroundColor: 'var(--brand-primary)', color: brandTextColor }}
                      >
                        {sim.status === 'scheduled'
                          ? 'Aguardando início'
                          : (sim.already_completed && sim.config?.allow_retry === false)
                            ? 'Tentativa concluída'
                          : sim.already_completed ? 'Refazer' : 'Iniciar'}
                      </button>
                    )
                  }

                  return (
                  <div key={sim.id} className={`overflow-hidden rounded-2xl border p-4 sm:p-5 ${borderCls}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {badge}
                          <h3 className="min-w-0 break-words text-base font-bold text-slate-900 dark:text-white">{sim.title}</h3>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="break-words">{String(sim.config.bank ?? 'ENEM')} · {String(sim.config.qty ?? 10)} questões · {DIFFICULTY_LABELS[String(sim.config.difficulty ?? 'misto').toLowerCase()] ?? String(sim.config.difficulty ?? 'Misto')}</span>
                          <span>Início: {formatDateTimeBR(sim.starts_at)}</span>
                          {Boolean(sim.config.time_limit_secs) && (
                            <span>⏱ {Math.round(Number(sim.config.time_limit_secs) / 60)} min</span>
                          )}
                          {sim.ends_at && <span>Término: {formatDateTimeBR(sim.ends_at)}</span>}
                          {(isPrinted || isHybrid) && sim.location_name && (
                            <span className="inline-flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-300">
                              📍 {sim.location_name}
                            </span>
                          )}
                          {!isPrinted && !isHybrid && sim.status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300">
                              <Timer size={12} />{getScheduledRemainingLabel(sim.starts_at)}
                            </span>
                          )}
                          {!isPrinted && !isHybrid && sim.already_completed && sim.config?.allow_retry === false && (
                            <span className="font-semibold text-rose-600 dark:text-rose-300">Tentativa única concluída</span>
                          )}
                        </div>
                        {/* Aviso discreto hybrid — estado 1 */}
                        {isHybrid && !hasPrintedSub && !isPast && sim.status !== 'scheduled' && (
                          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                            ℹ️ Este simulado também será aplicado presencialmente. Caso você o realize presencialmente, o resultado online será desconsiderado.
                          </p>
                        )}
                      </div>
                      {cta}
                    </div>
                  </div>
                  )
                })}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
              </motion.div>
            )}

            {/* KPI Cards */}
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {dashLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : (
                <>
                    {[
                    { icon: <BookOpen size={15} style={{ color: 'var(--brand-primary)' }} />, bg: 'bg-[var(--brand-primary)]/10', label: 'Realizados', value: totalSimuladosFiltered, sub: pageBankFilter === 'Todas' ? 'simulados no total' : `simulados ${pageBankFilter}`, valueClass: 'text-slate-900 dark:text-slate-100' },
                    { icon: <TrendingUp size={15} className="text-green-600 dark:text-green-400" />, bg: 'bg-green-50 dark:bg-green-900/30', label: 'Média Geral', value: totalSimuladosFiltered > 0 ? `${avgPct}%` : '—', sub: 'de acertos', valueClass: totalSimuladosFiltered > 0 ? scoreColor(avgPct) : 'text-slate-300 dark:text-slate-700' },
                    { icon: <Trophy size={15} className="text-yellow-500" />, bg: 'bg-yellow-50 dark:bg-yellow-900/30', label: 'Melhor', value: totalSimuladosFiltered > 0 ? `${bestPct}%` : '—', sub: 'melhor resultado', valueClass: totalSimuladosFiltered > 0 ? scoreColor(bestPct) : 'text-slate-300 dark:text-slate-700' },
                    { icon: <Medal size={15} className="text-purple-600 dark:text-purple-400" />, bg: 'bg-purple-50 dark:bg-purple-900/30', label: 'Ranking', value: rankingPos != null ? `#${rankingPos}` : '—', sub: 'posição geral', valueClass: 'text-slate-900 dark:text-slate-100' },
                  ].map((card) => (
                    <div key={card.label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`${card.bg} p-1.5 rounded-lg`}>{card.icon}</div>
                        <span className="truncate text-xs font-bold uppercase tracking-wide text-slate-400">{card.label}</span>
                      </div>
                      <div className={`truncate text-3xl font-black ${card.valueClass}`}>{card.value}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">{card.sub}</div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>

            {/* First-time welcome */}
            {!dashLoading && totalSimuladosFiltered === 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 sm:p-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}>
                  <Trophy size={32} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Bem-vindo aos Simulados!</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                  Monte simulados com questões reais de vários vestibulares. Acompanhe sua evolução por matéria e por banca.
                </p>
                <button onClick={() => setShowConfigModal(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-bold shadow transition-all cursor-pointer"
                  style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
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
            {!dashLoading && totalSimuladosFiltered > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={17} className="text-slate-400" />
                      <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Evolução de Desempenho</h2>
                    </div>
                    {subjectOptions.length > 1 && (
                      <div className="relative">
                        <select value={evolutionSubject} onChange={e => setEvolutionSubject(e.target.value)}
                          className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none pr-6 cursor-pointer outline-none">
                          {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {evolutionLegend.map((bankKey) => (
                      <div key={bankKey} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: BANK_VISUALS[bankKey].color }}
                        />
                        <span className="font-semibold">
                          {bankKey === 'Todas' ? 'Tendência geral' : BANK_VISUALS[bankKey].label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {evolutionData.length < 2 ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
                      <BarChart3 size={28} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-sm text-slate-400 max-w-[200px]">Faça pelo menos 2 simulados para ver sua evolução</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={evolutionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="pct"
                          stroke={pageBankFilter === 'Todas' ? BANK_VISUALS.Todas.color : BANK_VISUALS[pageBankFilter].color}
                          strokeWidth={2.5}
                          dot={(props) => {
                            const bank = props.payload?.bank as keyof typeof BANK_VISUALS
                            const color = pageBankFilter === 'Todas'
                              ? BANK_VISUALS[bank || 'Todas'].color
                              : BANK_VISUALS[pageBankFilter].color
                            return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />
                          }}
                          activeDot={(props) => {
                            const bank = props.payload?.bank as keyof typeof BANK_VISUALS
                            const color = pageBankFilter === 'Todas'
                              ? BANK_VISUALS[bank || 'Todas'].color
                              : BANK_VISUALS[pageBankFilter].color
                            return <circle cx={props.cx} cy={props.cy} r={6} fill={color} stroke="white" strokeWidth={2} />
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Subject performance */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart3 size={17} className="text-slate-400" />
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Desempenho por Matéria</h2>
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {subjectLegend.map((bankKey) => (
                      <div key={bankKey} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: BANK_VISUALS[bankKey].color }}
                        />
                        <span className="font-semibold">{BANK_VISUALS[bankKey].label}</span>
                      </div>
                    ))}
                    {pageBankFilter === 'Todas' ? (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        desempenho agregado das sessões ENEM, UFU, UEG e UNESP
                      </span>
                    ) : null}
                  </div>
                  {subjectPerfData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-sm text-slate-400 text-center">Nenhum dado disponível ainda</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, subjectPerfData.length * 42)}>
                      <BarChart layout="vertical" data={subjectPerfData} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="subject" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                          {subjectPerfData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.total === 0 ? '#cbd5e1' : entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            )}

            {!dashLoading && bankPerfData.length > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Target size={17} className="text-slate-400" />
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Desempenho por Banca</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bankPerfData.map((entry) => (
                    <div key={entry.bank} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{entry.bank}</p>
                          <p className={`mt-1 text-2xl font-black ${scoreColor(entry.pct)}`}>{entry.pct}%</p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <p>{entry.sessions} simulados</p>
                          <p>{entry.total} questões</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${entry.pct}%`, backgroundColor: scoreBarColor(entry.pct) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent simulados */}
            {dashLoading && <Skeleton className="h-72 w-full rounded-2xl" />}
            {!dashLoading && totalSimuladosFiltered > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <History size={17} className="text-slate-400" />
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Últimos Simulados</h2>
                  </div>
                  <Link href={`/partners/${slug}/student/simulado/historico`} className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Ver todos →</Link>
                </div>
                <div className="space-y-3">
                  {pageFilteredSessions.slice(0, 5).map(session => {
                    const pct = getSessionScopedStats(session, pageBankFilter)?.percentage ?? session.percentage ?? 0
                    return (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{getConfigLabel(session)}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Clock size={11} />{formatDate(session.started_at)}</span>
                            {session.time_taken_secs > 0 && <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0"><Zap size={11} />{formatDuration(session.time_taken_secs)}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreBarColor(pct) }} />
                            </div>
                            <span className={`text-sm font-black shrink-0 ${scoreColor(pct)}`}>{pct}%</span>
                          </div>
                        </div>
                        <Link href={`/partners/${slug}/student/simulado/${session.id}/revisao`}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-4 py-3 sm:px-3 sm:py-2 rounded-lg transition-colors min-h-[44px] sm:min-h-0 justify-center hover:opacity-80"
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
            <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={17} className="text-yellow-500" />
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {pageBankFilter === 'Todas' ? 'Ranking Geral' : `Ranking ${pageBankFilter}`}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {pageBankFilter === 'Todas'
                  ? 'Melhores resultados de todos os tempos'
                  : `Melhores resultados de ${pageBankFilter} de todos os tempos`}
              </p>
              {dashLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
              ) : !rankingData?.ranking?.length ? (
                <div className="text-center py-8">
                  <Trophy size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Nenhum simulado realizado ainda</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Seja o primeiro a entrar no ranking!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {rankingData.ranking.slice(0, 3).map(entry => {
                      const isMe = entry.user_id === currentUserId
                      const medals = ['🥇', '🥈', '🥉']
                      return (
                        <div key={entry.user_id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isMe ? 'border' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                          style={isMe ? { background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' } : {}}>
                          <span className="text-lg w-7 text-center" role="img" aria-label={`${entry.position}º lugar`}>{medals[entry.position - 1] ?? `#${entry.position}`}</span>
                          <span className={`flex flex-1 items-center gap-2 text-sm font-semibold truncate ${isMe ? '' : 'text-slate-700 dark:text-slate-300'}`} style={isMe ? { color: 'var(--brand-primary)' } : {}}>
                            {!isMe && entry.is_anonymous ? <EyeOff className="h-4 w-4 shrink-0 text-slate-400" /> : null}
                            <span className="truncate">{isMe ? 'Você' : (entry.is_anonymous ? 'Aluno secreto' : (entry.full_name || `Usuário ${entry.user_id.slice(0, 6)}`))}</span>
                          </span>
                          <span className={`text-sm font-black ${scoreColor(entry.percentage)}`}>{entry.percentage}%</span>
                        </div>
                      )
                    })}
                  </div>
                  {rankingData.user_position && rankingData.user_position > 3 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-7 text-center">#{rankingData.user_position}</span>
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
        <div className="fixed inset-0 z-50 bg-[#F5F5F7] dark:bg-slate-950 flex flex-col">

          {/* Header + progress bar — shrink-0 flex child, never scrolls */}
          <div className="shrink-0">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-2 shadow-sm flex justify-between items-center gap-3">

              {/* Left: question counter + per-question timer */}
              <div className="shrink-0 flex flex-col items-start gap-0.5">
                <div className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400 tabular-nums leading-none">
                  {currentIdx + 1}
                  <span className="text-slate-300 dark:text-slate-600"> / {questions.length}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums leading-none">
                  <Timer className="w-3 h-3" />
                  {formatTime(questionElapsed)} nesta questão
                </div>
              </div>

              {/* Right: global timer + Finalizar */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Global timer — shakes when entering critical zone */}
                <motion.div animate={timerShakeControls}>
                  <div className={`flex flex-col items-center font-mono font-black tabular-nums px-3 py-1.5 rounded-xl border-2 transition-all ${
                    isTimeCritical
                      ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-400 dark:border-red-800 animate-pulse scale-110'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5 opacity-60">
                      {isTimeCritical ? '⏰' : (hasTimeLimit ? 'Restam' : scheduledEndsAtRef.current ? 'Encerra em' : 'Tempo')}
                    </span>
                    <span className="text-base sm:text-lg leading-none">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </motion.div>

                <button onClick={() => setFinishDialogOpen(true)}
                  className="text-xs font-bold uppercase px-3 py-2 rounded-lg cursor-pointer min-h-[44px] transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40">
                  Finalizar
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-200 dark:bg-slate-800">
              <motion.div className="h-1"
                style={{ background: 'var(--brand-primary)' }}
                animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Question — único elemento que scrolla */}
          <main ref={quizMainRef} className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="max-w-3xl mx-auto w-full px-4 py-6">
            <div ref={questionTopRef} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              {/* Tags */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                    {questions[currentIdx].subject}
                  </span>
                  {questions[currentIdx].bank && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {questions[currentIdx].bank}
                    </span>
                  )}
                  {questions[currentIdx].exam_year && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {questions[currentIdx].exam_year}
                    </span>
                  )}
                  {questions[currentIdx].difficulty && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {questions[currentIdx].difficulty}
                    </span>
                  )}
                  {currentTestletInfo && (
                    <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                      Testlet {currentTestletInfo.position}/{currentTestletInfo.total}
                    </span>
                  )}
                  {questions[currentIdx].topic && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {questions[currentIdx].topic}
                    </span>
                  )}
                  {reportedQuestionIds.has(questions[currentIdx].id) && (
                    <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                      Anulada ao finalizar
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReportQuestionId(questions[currentIdx].id)
                    setReportDialogOpen(true)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
                  title="Reportar erro nesta questão"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Reportar erro
                </button>
              </div>

              {/* Context */}
              {isCurrentGroupTestlet && (
                <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <BookOpen size={16} className="shrink-0" />
                  Leia o texto a seguir para responder as próximas {currentGroupQuestions.length} questões
                </div>
              )}
              {currentGroupContextQuestion && getQuestionContentBlocks(currentGroupContextQuestion.metadata).length > 0 ? (
                <QuestionContentBlocks metadata={currentGroupContextQuestion.metadata} className="mb-5" />
              ) : (
                <>
                  {currentGroupSharedContext && (
                    <QuestionRichText
                      text={currentGroupSharedContext}
                      className="prose prose-slate dark:prose-invert max-w-none mb-5 text-slate-600 dark:text-slate-300 border-l-4 pl-4 text-sm leading-relaxed"
                      style={{ borderColor: 'var(--brand-primary)' }}
                    />
                  )}

                  {/* Imagens de apoio */}
                  {(() => {
                    const supportImages = extractDetachedQuestionImageUrls(
                      currentGroupContextQuestion?.images,
                      currentGroupContextQuestion?.context,
                      currentGroupContextQuestion?.statement,
                    )
                    if (supportImages.length === 0) return null
                    return (
                      <QuestionSupportImages
                        images={supportImages}
                        metadata={currentGroupContextQuestion?.metadata}
                        className="mb-5"
                      />
                    )
                  })()}
                </>
              )}

              <div className="space-y-6">
                {currentGroupQuestions.map((question, groupIndex) => (
                  <div
                    key={question.id}
                    ref={(node) => { testletQuestionRefs.current[question.id] = node }}
                    data-question-id={question.id}
                    className={`rounded-2xl border p-5 scroll-mt-24 ${isCurrentGroupTestlet ? 'border-slate-200 bg-slate-50/70' : 'border-transparent bg-transparent p-0'}`}
                  >
                    {isCurrentGroupTestlet && groupIndex > 0 && (
                      <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-1.5">
                        <ArrowUp size={12} />
                        Referente ao texto-base acima
                      </div>
                    )}
                    {isCurrentGroupTestlet && (
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                            Testlet {groupIndex + 1}/{currentGroupQuestions.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReportQuestionId(question.id)
                            setReportDialogOpen(true)
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
                          title="Reportar erro nesta questão"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Reportar erro
                        </button>
                      </div>
                    )}

                    {currentGroupQuestionContexts[question.id] && (
                      <QuestionRichText
                        text={currentGroupQuestionContexts[question.id]}
                        className="prose prose-slate dark:prose-invert max-w-none mb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                      />
                    )}

                    <QuestionRichText
                      text={question.statement}
                      className="prose prose-slate dark:prose-invert max-w-none text-base md:text-lg text-slate-900 dark:text-slate-50 font-medium mb-7 leading-relaxed"
                    />

                    <div className="space-y-3">
                      {question.alternatives?.map(alt => {
                        const isSelected = userAnswers[question.id] === alt.letter
                        const isAnnulled = reportedQuestionIds.has(question.id)
                        const alternativeImages = extractAlternativeImageUrls(alt)
                        return (
                          <button key={`${question.id}-${alt.letter}`} onClick={() => handleSelectOption(question.id, alt.letter)} disabled={isAnnulled}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start active:scale-[0.99] ${isAnnulled ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40' : isSelected ? 'shadow-sm cursor-pointer' : 'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer'}`}
                            style={isSelected ? {
                              background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
                              borderColor: 'var(--brand-primary)',
                            } : {}}>
                            <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors ${isSelected ? 'border-transparent' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}
                              style={isSelected ? { background: 'var(--brand-primary)', color: brandTextColor } : {}}>
                              {alt.letter}
                            </span>
                            <div className="flex-1 pt-1">
                              {alternativeImages.length > 0 && (
                                <AlternativeImages images={alternativeImages} metadata={question.metadata} letter={alt.letter} />
                              )}
                              {alt.text ? (
                                <QuestionRichText
                                  text={alt.text}
                                  className={`text-sm leading-snug ${isSelected ? 'font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                                  style={isSelected ? { color: 'var(--brand-primary)' } : undefined}
                                />
                              ) : alternativeImages.length === 0 ? (
                                <span className="text-sm italic text-slate-400 dark:text-slate-500">
                                  Conteúdo da alternativa indisponível.
                                </span>
                              ) : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {reportedQuestionIds.has(question.id) && (
                      <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                        Esta questão foi reportada e será desconsiderada no resultado final do simulado.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

              {/* Question navigator */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
              {questionGroups.map((group) => (
                  <div key={group.key} className={`rounded-2xl ${group.label ? 'border border-amber-200 bg-amber-50/60 px-2 py-1' : ''}`}>
                    {group.label && (
                      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {group.label}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      {group.items.map(({ q, i }) => (
                        <button key={q.id} onClick={() => setCurrentIdx(i)}
                          className={`w-8 h-8 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                            i === currentIdx ? 'scale-110 shadow-sm' : userAnswers[q.id] ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                          style={i === currentIdx ? { background: 'var(--brand-primary)', color: brandTextColor } : {}}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
            </div>
          </main>

          {/* Nav bar — shrink-0 flex child, nunca scrolla */}
          <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
              <button onClick={() => (isCurrentGroupTestlet ? goToPreviousGroup() : goToQuestionIndex(currentIdx - 1))} disabled={currentGroupStartIdx === 0}
                className="flex-1 px-4 py-3 text-slate-500 dark:text-slate-400 disabled:opacity-30 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-h-[44px]">
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
              </button>

              {currentGroupEndIdx < questions.length - 1 ? (
                <button onClick={() => (isCurrentGroupTestlet ? goToNextGroup() : goToQuestionIndex(currentIdx + 1))}
                  className="flex-[1.35] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
                  style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                  {isCurrentGroupTestlet ? 'Próximo testlet' : 'Próxima'} <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={() => setFinishDialogOpen(true)}
                  className="flex-[1.35] bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer min-h-[44px]">
                  Entregar <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ RESULT ═══════════════════════════════════ */}
      {step === 'result' && (
        <div className="min-h-dvh bg-[#F5F5F7] dark:bg-slate-950/50 p-4 md:p-8">
          <motion.div
            className="max-w-3xl mx-auto space-y-5 pb-20"
            variants={shouldReduce ? {} : CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            {/* ── Hero result card ── */}
            <motion.div
              variants={shouldReduce ? {} : { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 relative"
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
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{celebration.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{celebration.sub}</p>
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
                    <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="10" />
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
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">de {displayTotal}</span>
                  </div>
                </div>

                {annulledCount > 0 && (
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    <Flag className="h-4 w-4" />
                    {annulledCount === 1 ? `${annulledCount} questão anulada por report e desconsiderada no resultado.` : `${annulledCount} questões anuladas por report e desconsideradas no resultado.`}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 w-full">
                  <div className="text-center">
                    <div className={`text-2xl font-black ${scoreColor(displayPct)}`}>{displayPct}%</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Acertos</div>
                  </div>
                  {hasWeighted && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-[var(--brand-primary)]">
                        {weightedNote}{isUegPointsMode ? `/${weightedResult?.weighted_max_points ?? 130}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                        {isUegPointsMode ? 'Pontuação Objetiva UEG (Pesos)' : 'Nota Estimada (Pesos)'}
                      </div>
                    </div>
                  )}
                  {hasWeighted && (
                    <div className="text-center">
                      <div className={`text-2xl font-black ${scoreColor(weightedResult!.raw_percentage)}`}>
                        {rawNote}{isUegPointsMode ? `/${weightedResult?.weighted_max_points ?? 130}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                        {isUegPointsMode ? 'Pontuação Bruta Objetiva' : 'Nota Bruta'}
                      </div>
                    </div>
                  )}
                  {showTri && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{triValue?.toFixed(1)}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Nota TRI</div>
                    </div>
                  )}
                  {finishResult?.time_taken_secs != null && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-700 dark:text-slate-300">{formatDuration(finishResult.time_taken_secs)}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Tempo</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 w-full">
                  <button onClick={() => resetSimulado(false)} className="w-full sm:w-auto border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-bold flex gap-2 items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer min-h-[44px]">
                    <ChevronLeft size={18} /> Dashboard
                  </button>
                  <button onClick={() => resetSimulado(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold flex gap-2 items-center justify-center transition-colors cursor-pointer min-h-[44px] hover:opacity-90"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                    <RotateCcw size={18} /> Novo Simulado
                  </button>
                  {finishResult?.session_id && (
                    <button onClick={() => router.push(`/partners/${slug}/student/simulado/${finishResult.session_id}/revisao`)}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex gap-2 items-center justify-center hover:bg-indigo-700 transition-colors cursor-pointer min-h-[44px]">
                      <Brain size={18} /> Revisão com IA
                    </button>
                  )}
                  <button onClick={() => router.push(`/partners/${slug}/student/simulado/historico`)}
                    className="w-full sm:w-auto border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl font-bold flex gap-2 items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer min-h-[44px]">
                    <History size={18} /> Histórico
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Subject breakdown */}
            {finishResult?.results_by_subject && Object.keys(finishResult.results_by_subject).length > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen size={18} className="text-slate-400 dark:text-slate-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Desempenho por Matéria</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(finishResult.results_by_subject)
                    .sort(([, a], [, b]) => b.percentage - a.percentage)
                    .map(([subj, res]) => (
                    <div key={subj}>
                      <div className="flex items-baseline justify-between gap-2 text-sm mb-1.5 min-w-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-0 truncate">{subj}</span>
                        <span className={`font-bold shrink-0 ${scoreColor(res.percentage)}`}>{res.correct}/{res.total} ({res.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

            {finishResult?.results_by_bank && Object.keys(finishResult.results_by_bank).length > 0 && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-5">
                  <Target size={18} className="text-slate-400 dark:text-slate-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Desempenho por Banca</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(finishResult.results_by_bank).map(([bankLabel, res]) => (
                    <div key={bankLabel}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{bankLabel}</span>
                        <span className={`font-bold ${scoreColor(res.percentage)}`}>{res.correct}/{res.total} ({res.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-2 rounded-full"
                          style={{ backgroundColor: scoreBarColor(res.percentage) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${res.percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {hasWeighted && weightedResult && (
              <motion.div variants={shouldReduce ? {} : ITEM_VARIANTS} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-5">
                  <Target size={18} className="text-slate-400 dark:text-slate-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Pesos Aplicados</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(weightedResult.breakdown || {}).map(([bucket, info]) => (
                    <div key={bucket} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {bucket} · peso {info.weight}
                        </span>
                        <span className={`font-bold ${scoreColor(info.percentage)}`}>
                          {info.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Questões: {info.questions} · Pontos ponderados: {info.weighted_correct.toFixed(1)}/{info.weighted_total.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      )}

      {currentPopup?.kind === 'simulado_reward' && (
        <SimuladoRewardPopup
          pointsAwarded={currentPopup.pointsAwarded}
          newMonthlyPoints={currentPopup.newMonthlyPoints}
          rankPosition={currentPopup.rankPosition}
          pointsToTop3={currentPopup.pointsToTop3}
          onDismiss={dismissCurrentPopup}
          onViewRanking={() => {
            holdQueueUntilRouteChange()
            dismissCurrentPopup()
            router.push(`/partners/${slug}/student/ranking`)
          }}
        />
      )}
    </>
  )
}
